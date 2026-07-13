import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import {
  isSupportedLanguage,
  getVoiceName
} from '~~/utils/imageVoiceVideo/languages.js'

const SYNTH_TIMEOUT_MS = 22_000
const CONNECT_TIMEOUT_MS = 12_000
const MAX_BATCH = 40

function formatRate(rate: number): string {
  const pct = rate * 10
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function formatVolume(volume: number): string {
  const offset = Math.max(-100, Math.min(50, volume - 100))
  return `${offset >= 0 ? '+' : ''}${offset}%`
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}逾時（${Math.round(ms / 1000)} 秒），遠端語音服務可能被封鎖或忙碌`))
    }, ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

function collectStream(
  tts: MsEdgeTTS,
  text: string,
  rateStr: string,
  volStr: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    try {
      const { audioStream } = tts.toStream(text, { rate: rateStr, volume: volStr })
      audioStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      audioStream.on('end', () => resolve(Buffer.concat(chunks)))
      audioStream.on('error', reject)
    } catch (e) {
      reject(e)
    }
  })
}

async function synthesizeBatchSameVoice(
  texts: string[],
  voiceName: string,
  rateStr: string,
  volStr: string
): Promise<Buffer[]> {
  const tts = new MsEdgeTTS()
  try {
    await withTimeout(
      tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3),
      CONNECT_TIMEOUT_MS,
      'Edge TTS 連線'
    )
    const out: Buffer[] = []
    for (let i = 0; i < texts.length; i++) {
      const buf = await withTimeout(
        collectStream(tts, texts[i], rateStr, volStr),
        SYNTH_TIMEOUT_MS,
        `Edge TTS 合成 #${i + 1}`
      )
      out.push(buf)
    }
    return out
  } finally {
    try {
      tts.close()
    } catch {
      /* ignore */
    }
  }
}

type Gender = 'female' | 'male'

interface TtsItem {
  text: string
  language: string
  gender: Gender
}

function parseItem(raw: unknown, fallbackLang: string, fallbackGender: Gender): TtsItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const text = String(o.text ?? '').trim()
  if (!text) return null
  const language = String(o.language ?? fallbackLang)
  const gender: Gender =
    o.gender === 'male' ? 'male' : o.gender === 'female' ? 'female' : fallbackGender
  return { text, language, gender }
}

export default defineEventHandler(async (event) => {
  try {
    const payload = await readBody(event)
    const rate = Math.max(-5, Math.min(5, Number(payload?.rate ?? 0)))
    const volume = Math.max(0, Math.min(150, Number(payload?.volume ?? 100)))
    const rateStr = formatRate(rate)
    const volStr = formatVolume(volume)

    // Batch mode
    if (Array.isArray(payload?.items)) {
      if (payload.items.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'items required' })
      }
      if (payload.items.length > MAX_BATCH) {
        throw createError({ statusCode: 400, statusMessage: `too many items (max ${MAX_BATCH})` })
      }

      const items: TtsItem[] = []
      for (const raw of payload.items) {
        const item = parseItem(raw, 'zh-TW', 'male')
        if (!item) {
          throw createError({ statusCode: 400, statusMessage: 'each item needs non-empty text' })
        }
        if (item.text.length > 5000) {
          throw createError({ statusCode: 400, statusMessage: 'text too long' })
        }
        if (!isSupportedLanguage(item.language)) {
          throw createError({ statusCode: 400, statusMessage: `unsupported language: ${item.language}` })
        }
        items.push(item)
      }

      const groups = new Map<string, { indices: number[], texts: string[] }>()
      items.forEach((it, idx) => {
        const voiceName = getVoiceName(it.language, it.gender)
        let g = groups.get(voiceName)
        if (!g) {
          g = { indices: [], texts: [] }
          groups.set(voiceName, g)
        }
        g.indices.push(idx)
        g.texts.push(it.text)
      })

      const results: Buffer[] = new Array(items.length)
      for (const [voiceName, g] of groups) {
        console.log(`[TTS batch] voice=${voiceName} count=${g.texts.length}`)
        let buffers: Buffer[]
        try {
          buffers = await synthesizeBatchSameVoice(g.texts, voiceName, rateStr, volStr)
        } catch (first) {
          console.warn('[TTS batch] group failed, retry once:', first)
          buffers = await synthesizeBatchSameVoice(g.texts, voiceName, rateStr, volStr)
        }
        for (let i = 0; i < g.indices.length; i++) {
          const buf = buffers[i]
          if (!buf || buf.length < 128) {
            throw createError({
              statusCode: 500,
              statusMessage: 'TTS produced empty audio（請先將文字翻譯為目標語言）'
            })
          }
          results[g.indices[i]] = buf
        }
      }

      return { audios: results.map(b => b.toString('base64')) }
    }

    // Single mode
    const text = String(payload?.text ?? '').trim()
    const language = String(payload?.language ?? 'zh-TW')
    const gender: Gender = payload?.gender === 'female' ? 'female' : 'male'

    if (!text) throw createError({ statusCode: 400, statusMessage: 'text required' })
    if (text.length > 5000) throw createError({ statusCode: 400, statusMessage: 'text too long' })
    if (!isSupportedLanguage(language)) {
      throw createError({ statusCode: 400, statusMessage: `unsupported language: ${language}` })
    }

    const voiceName = getVoiceName(language, gender)
    console.log(`[TTS] ${language} ${gender} ${voiceName} rate=${rateStr} vol=${volStr}`)

    let audioBuffer: Buffer
    try {
      const buffers = await synthesizeBatchSameVoice([text], voiceName, rateStr, volStr)
      audioBuffer = buffers[0]
    } catch (first) {
      console.warn('[TTS] first attempt failed, retrying once:', first)
      const buffers = await synthesizeBatchSameVoice([text], voiceName, rateStr, volStr)
      audioBuffer = buffers[0]
    }

    if (!audioBuffer || audioBuffer.length < 128) {
      throw createError({ statusCode: 500, statusMessage: 'TTS produced empty audio' })
    }

    setHeader(event, 'Content-Type', 'audio/mpeg')
    setHeader(event, 'Content-Length', String(audioBuffer.length))
    return audioBuffer
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[TTS] Error:', msg)
    throw createError({ statusCode: 500, statusMessage: msg })
  }
})
