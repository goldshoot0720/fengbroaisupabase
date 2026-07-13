import {
  isSupportedLanguage,
  toSourceCode,
  toTranslateCode
} from '../../../../utils/imageVoiceVideo/languages'

async function translateOne(
  text: string,
  source: string,
  target: string
): Promise<string> {
  if (!text.trim()) return text
  if (source !== 'auto' && source === target) return text

  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${encodeURIComponent(source)}` +
    `&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    // @ts-expect-error node fetch cache option
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000)
  })

  if (!res.ok) {
    if (target === 'yue') {
      return translateOne(text, source, 'zh-TW')
    }
    throw new Error(`Google Translate returned ${res.status}`)
  }

  const data = await res.json()
  const translated = (data[0] as [string, unknown][])
    .map(seg => seg[0])
    .join('')
    .trim()

  return translated || text
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const lines = body?.lines as string[]
    const language = String(body?.language ?? 'en-US')
    const sourceLanguage = String(body?.source_language ?? 'auto')

    if (!Array.isArray(lines) || lines.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'lines required' })
    }
    if (lines.length > 120) {
      throw createError({ statusCode: 400, statusMessage: 'too many lines' })
    }
    if (!isSupportedLanguage(language)) {
      throw createError({ statusCode: 400, statusMessage: `unsupported language: ${language}` })
    }

    const target = toTranslateCode(language)
    if (!target) {
      return { lines }
    }

    const source = toSourceCode(sourceLanguage)

    if (source !== 'auto' && source === target) {
      return { lines: lines.map(String) }
    }

    const translated: string[] = []
    for (const line of lines) {
      translated.push(await translateOne(String(line), source, target))
    }

    return { lines: translated }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Translate] Error:', msg)
    throw createError({ statusCode: 500, statusMessage: msg })
  }
})
