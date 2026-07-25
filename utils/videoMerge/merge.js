/**
 * Browser-side video merge via FFmpeg.wasm.
 * Ported from https://github.com/huang1988pioneer/VideoMerge
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpeg = null
let loadPromise = null
let progressListenerBound = false
/** @type {null | ((ev: { progress?: number, time?: number }) => void)} */
let activeProgressSink = null
/** @type {null | ((msg: string) => void)} */
let activeLogSink = null

const CORE_CANDIDATES = [
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm',
  'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm',
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd'
]

export const LOOP_LIMITS = {
  maxCount: 999,
  maxDurationSec: 2 * 60 * 60
}

async function readBytes(file) {
  if (!file) throw new Error('找不到影片檔案')
  if (!(file instanceof Blob)) throw new Error('無效的檔案物件')
  if (file.size === 0) {
    throw new Error(`檔案是空的：${file.name || 'unknown'}`)
  }
  try {
    const buffer = await file.arrayBuffer()
    return new Uint8Array(buffer)
  } catch (err) {
    try {
      const buffer = await new Response(file).arrayBuffer()
      return new Uint8Array(buffer)
    } catch {
      const name = file instanceof File ? file.name : 'blob'
      throw new Error(
        `無法讀取檔案「${name}」。請確認檔案仍存在且可讀。原始錯誤：${err?.message || err}`
      )
    }
  }
}

function bindInstanceEvents(instance) {
  if (progressListenerBound) return
  instance.on('log', ({ message }) => {
    activeLogSink?.(message)
  })
  instance.on('progress', (ev) => {
    activeProgressSink?.(ev)
  })
  progressListenerBound = true
}

async function loadFromBase(base, onLog) {
  progressListenerBound = false
  const instance = new FFmpeg()
  activeLogSink = onLog || null
  bindInstanceEvents(instance)

  const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript')
  const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
  await instance.load({ coreURL, wasmURL })
  return instance
}

export async function ensureFFmpeg(onLog) {
  activeLogSink = onLog || null
  if (ffmpeg?.loaded) return ffmpeg
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const errors = []
    for (const base of CORE_CANDIDATES) {
      try {
        onLog?.(`載入 FFmpeg 核心：${base}`)
        const instance = await loadFromBase(base, onLog)
        ffmpeg = instance
        onLog?.('FFmpeg 載入完成')
        return instance
      } catch (err) {
        errors.push(`${base}: ${err?.message || err}`)
        onLog?.(`載入失敗，嘗試下一個來源… (${err?.message || err})`)
      }
    }
    throw new Error(
      `無法載入 FFmpeg（需要網路下載核心約 30MB）。\n${errors.join('\n')}`
    )
  })()

  try {
    return await loadPromise
  } catch (err) {
    loadPromise = null
    throw err
  }
}

function extFromName(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '')
  const ext = (m?.[1] || 'mp4').toLowerCase()
  if (!/^[a-z0-9]+$/.test(ext)) return 'mp4'
  return ext
}

function localProgressFromEvent(ev, expectedSec) {
  const timeUs = ev?.time
  if (
    Number.isFinite(expectedSec) &&
    expectedSec > 0 &&
    typeof timeUs === 'number' &&
    Number.isFinite(timeUs) &&
    timeUs > 0
  ) {
    return Math.min(0.99, Math.max(0, timeUs / 1e6 / expectedSec))
  }
  const p = ev?.progress
  if (typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1) {
    return Math.min(0.99, Math.max(0, p))
  }
  return null
}

function createStageTracker(hooks, stages) {
  const total = Math.max(
    1e-6,
    stages.reduce((s, st) => s + Math.max(0.01, st.weight), 0)
  )
  let index = 0
  let lastRatio = 0

  const emit = (local, label) => {
    const safeLocal = Math.min(1, Math.max(0, local))
    let done = 0
    for (let i = 0; i < index; i++) done += Math.max(0.01, stages[i].weight)
    const curW = Math.max(0.01, stages[index]?.weight ?? 1)
    const inStage = Math.min(0.98, safeLocal)
    let ratio = (done + curW * inStage) / total
    ratio = Math.max(lastRatio, Math.min(0.99, ratio))
    lastRatio = ratio
    hooks.onProgress?.(ratio)
    if (label) hooks.onStatus?.(label)
  }

  return {
    start(id) {
      const i = stages.findIndex((s) => s.id === id)
      if (i >= 0) index = i
      emit(0, stages[index]?.label)
    },
    update(local, label) {
      if (typeof local === 'number' && Number.isFinite(local)) {
        emit(local, label ?? stages[index]?.label)
      } else if (label) {
        hooks.onStatus?.(label)
      }
    },
    complete() {
      emit(1, stages[index]?.label)
      if (index < stages.length - 1) index += 1
    },
    finish() {
      lastRatio = 1
      hooks.onProgress?.(1)
      hooks.onStatus?.('完成')
    }
  }
}

async function execOrThrow(ff, args, onLog, prog = {}) {
  const { expectedSec, onLocal } = prog
  onLog?.(`$ ffmpeg ${args.join(' ')}`)

  activeProgressSink = (ev) => {
    const local = localProgressFromEvent(ev, expectedSec)
    if (local != null) onLocal?.(local)
  }

  try {
    const code = await ff.exec(args)
    if (code !== 0) {
      throw new Error(`FFmpeg 結束代碼 ${code}（指令：ffmpeg ${args.join(' ')}）`)
    }
    onLocal?.(1)
  } finally {
    activeProgressSink = null
  }
}

async function normalizeClip(ff, input, output, opts = {}) {
  const { noAudio = false, onLog, expectedSec, onLocal } = opts
  const prog = { expectedSec, onLocal }
  const vf =
    'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30,format=yuv420p'

  const videoArgs = [
    '-i',
    input,
    '-vf',
    vf,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '23'
  ]

  if (noAudio) {
    await execOrThrow(ff, [...videoArgs, '-an', '-y', output], onLog, prog)
    return
  }

  try {
    await execOrThrow(
      ff,
      [
        ...videoArgs,
        '-c:a',
        'aac',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-b:a',
        '128k',
        '-shortest',
        '-y',
        output
      ],
      onLog,
      prog
    )
  } catch (err) {
    onLog?.(`含音訊轉檔失敗，改為純影像：${err?.message || err}`)
    await execOrThrow(ff, [...videoArgs, '-an', '-y', output], onLog, prog)
  }
}

async function concatCopy(ff, names, output, onLog, written, prog = {}) {
  if (names.length === 1) {
    await execOrThrow(
      ff,
      ['-i', names[0], '-c', 'copy', '-movflags', '+faststart', '-y', output],
      onLog,
      prog
    )
    return
  }
  const listName = `list_${Date.now().toString(36)}.txt`
  const listBody = `${names.map((n) => `file ${n}`).join('\n')}\n`
  await ff.writeFile(listName, listBody)
  written.push(listName)
  await execOrThrow(
    ff,
    [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listName,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      '-y',
      output
    ],
    onLog,
    prog
  )
}

function reencodeTailArgs(noAudio) {
  const args = [
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p'
  ]
  if (noAudio) {
    args.push('-an')
  } else {
    args.push('-c:a', 'aac', '-b:a', '128k')
  }
  args.push('-movflags', '+faststart', '-y', 'output.mp4')
  return args
}

function formatSec(sec) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(r)}`
  return `${m}:${pad(r)}`
}

async function applyLoopExtend(ff, baseName, loop, onLog, onStatus, written, onLocal) {
  const mode = loop?.mode || 'once'
  const noAudio = Boolean(loop?.noAudio)
  const baseDur = Number(loop.baseDurationSec)

  if (mode === 'once') {
    if (baseName === 'output.mp4') return
    await execOrThrow(
      ff,
      ['-i', baseName, '-c', 'copy', '-movflags', '+faststart', '-y', 'output.mp4'],
      onLog,
      { expectedSec: baseDur > 0 ? baseDur : undefined, onLocal }
    )
    return
  }

  if (mode === 'count') {
    const count = Math.floor(Number(loop.count) || 1)
    if (count < 1) throw new Error('重複次數至少為 1')
    if (count > LOOP_LIMITS.maxCount) {
      throw new Error(`重複次數上限為 ${LOOP_LIMITS.maxCount}`)
    }
    if (count === 1) {
      await applyLoopExtend(
        ff,
        baseName,
        { mode: 'once', noAudio, baseDurationSec: baseDur },
        onLog,
        onStatus,
        written,
        onLocal
      )
      return
    }

    const outSec = baseDur > 0 ? baseDur * count : undefined
    onStatus?.(`循環延長：重複 ${count} 次…`)
    try {
      await execOrThrow(
        ff,
        [
          '-stream_loop',
          String(count - 1),
          '-i',
          baseName,
          '-c',
          'copy',
          '-movflags',
          '+faststart',
          '-y',
          'output.mp4'
        ],
        onLog,
        { expectedSec: outSec, onLocal }
      )
    } catch (err) {
      onLog?.(`stream_loop 失敗，改用 concat 清單：${err?.message || err}`)
      const names = Array.from({ length: count }, () => baseName)
      await concatCopy(ff, names, 'output.mp4', onLog, written, {
        expectedSec: outSec,
        onLocal
      })
    }
    return
  }

  if (mode === 'duration') {
    const target = Number(loop.targetSeconds)
    if (!Number.isFinite(target) || target <= 0) {
      throw new Error('請輸入有效的目標時長（秒）')
    }
    if (target > LOOP_LIMITS.maxDurationSec) {
      throw new Error(
        `目標時長上限為 ${LOOP_LIMITS.maxDurationSec / 3600} 小時（${LOOP_LIMITS.maxDurationSec} 秒）`
      )
    }

    if (Number.isFinite(baseDur) && baseDur > 0 && target <= baseDur + 0.05) {
      onStatus?.(`裁切至 ${target.toFixed(1)} 秒…`)
      await execOrThrow(
        ff,
        ['-i', baseName, '-t', target.toFixed(3), ...reencodeTailArgs(noAudio)],
        onLog,
        { expectedSec: target, onLocal }
      )
      return
    }

    onStatus?.(`循環延長並裁切至 ${formatSec(target)}…`)
    try {
      await execOrThrow(
        ff,
        [
          '-stream_loop',
          '-1',
          '-i',
          baseName,
          '-t',
          target.toFixed(3),
          ...reencodeTailArgs(noAudio)
        ],
        onLog,
        { expectedSec: target, onLocal }
      )
    } catch (err) {
      onLog?.(`stream_loop 時長模式失敗，改用重複 concat：${err?.message || err}`)
      const unit = Number.isFinite(baseDur) && baseDur > 0 ? baseDur : target
      const times = Math.max(1, Math.ceil(target / unit))
      if (times > LOOP_LIMITS.maxCount) {
        throw new Error(
          `依時長推算需重複 ${times} 次，超過上限 ${LOOP_LIMITS.maxCount}。請縮短目標時長。`
        )
      }
      const names = Array.from({ length: times }, () => baseName)
      const looped = 'looped_tmp.mp4'
      await concatCopy(ff, names, looped, onLog, written, {
        expectedSec: unit * times,
        onLocal: (r) => onLocal?.(r * 0.5)
      })
      written.push(looped)
      await execOrThrow(
        ff,
        ['-i', looped, '-t', target.toFixed(3), ...reencodeTailArgs(noAudio)],
        onLog,
        { expectedSec: target, onLocal: (r) => onLocal?.(0.5 + r * 0.5) }
      )
    }
    return
  }

  throw new Error(`未知的延長模式：${mode}`)
}

async function muxSubtitles(ff, videoName, srtName, output, onLog, onLocal) {
  await execOrThrow(
    ff,
    [
      '-i',
      videoName,
      '-i',
      srtName,
      '-map',
      '0',
      '-map',
      '1',
      '-c',
      'copy',
      '-c:s',
      'mov_text',
      '-metadata:s:s:0',
      'language=zho',
      '-movflags',
      '+faststart',
      '-y',
      output
    ],
    onLog,
    { onLocal }
  )
}

async function muxCustomAudio(ff, videoName, audioName, output, onLog, prog = {}) {
  try {
    await execOrThrow(
      ff,
      [
        '-i',
        videoName,
        '-stream_loop',
        '-1',
        '-i',
        audioName,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-b:a',
        '192k',
        '-shortest',
        '-movflags',
        '+faststart',
        '-y',
        output
      ],
      onLog,
      prog
    )
    return
  } catch (err) {
    onLog?.(`循環音訊失敗，改試單次貼上：${err?.message || err}`)
  }

  await execOrThrow(
    ff,
    [
      '-i',
      videoName,
      '-i',
      audioName,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-ar',
      '44100',
      '-ac',
      '2',
      '-b:a',
      '192k',
      '-shortest',
      '-movflags',
      '+faststart',
      '-y',
      output
    ],
    onLog,
    prog
  )
}

/**
 * Merge multiple video Files into one MP4 Blob.
 * @param {File[]} files
 * @param {object} [hooks]
 */
export async function mergeVideos(files, hooks = {}) {
  if (!files?.length) throw new Error('請至少選擇一段影片')

  const {
    onLog,
    onProgress,
    onStatus,
    noAudio = false,
    audioFile = null,
    subtitleSrt = null,
    clipDurations = [],
    loop = { mode: 'once' }
  } = hooks

  const ff = await ensureFFmpeg(onLog)

  const useCustomAudio = Boolean(audioFile) && !noAudio
  const stripOriginalAudio = noAudio || useCustomAudio
  const needsLoop = loop?.mode && loop.mode !== 'once'

  const durs = files.map((_, i) => {
    const d = Number(clipDurations[i])
    return Number.isFinite(d) && d > 0 ? d : 10
  })
  const baseDur =
    Number(loop.baseDurationSec) > 0
      ? Number(loop.baseDurationSec)
      : durs.reduce((a, b) => a + b, 0)

  let outDur = baseDur
  if (loop?.mode === 'count') {
    outDur = baseDur * Math.max(1, Math.floor(Number(loop.count) || 1))
  } else if (loop?.mode === 'duration') {
    outDur = Math.max(0.1, Number(loop.targetSeconds) || baseDur)
  }

  const stages = [{ id: 'write', weight: 3, label: '讀取並寫入暫存檔…' }]
  for (let i = 0; i < files.length; i++) {
    stages.push({
      id: `norm${i}`,
      weight: Math.max(8, durs[i]),
      label: `標準化第 ${i + 1} / ${files.length} 段…`
    })
  }
  stages.push({
    id: 'concat',
    weight: 4,
    label: files.length === 1 ? '準備基底片段…' : '串接片段…'
  })
  if (needsLoop) {
    stages.push({
      id: 'loop',
      weight: Math.max(20, outDur * 1.5),
      label:
        loop.mode === 'count'
          ? `循環延長：重複 ${loop.count} 次…`
          : `循環延長並裁切至 ${formatSec(outDur)}…`
    })
  } else {
    stages.push({ id: 'export', weight: 3, label: '輸出中…' })
  }
  if (useCustomAudio) {
    stages.push({
      id: 'audio',
      weight: Math.max(5, outDur * 0.25),
      label: '套用自訂音軌…'
    })
  }
  if (subtitleSrt?.trim()) {
    stages.push({ id: 'subs', weight: 3, label: '嵌入字幕…' })
  }
  stages.push({ id: 'read', weight: 2, label: '讀取結果…' })

  const tracker = createStageTracker({ onProgress, onStatus }, stages)

  if (noAudio) onLog?.('選項：不要聲音（輸出無音軌）')
  if (useCustomAudio) {
    onLog?.(`選項：自訂音軌 ${audioFile.name}（取代原影片聲音）`)
  }

  const written = []
  try {
    tracker.start('write')
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const label = file?.name || `clip-${i}`
      tracker.update(
        (i + 0.3) / (files.length + (useCustomAudio ? 1 : 0)),
        `讀取第 ${i + 1} / ${files.length} 段：${label}`
      )
      const bytes = await readBytes(file)
      const name = `in${i}.${extFromName(file.name)}`
      await ff.writeFile(name, bytes)
      written.push(name)
      tracker.update((i + 1) / (files.length + (useCustomAudio ? 1 : 0)))
    }

    let audioMemName = null
    if (useCustomAudio) {
      tracker.update(0.85, `讀取音訊：${audioFile.name}`)
      const audioBytes = await readBytes(audioFile)
      audioMemName = `bgm.${extFromName(audioFile.name) || 'mp3'}`
      await ff.writeFile(audioMemName, audioBytes)
      written.push(audioMemName)
    }
    tracker.complete()

    const baseName = 'base.mp4'
    const normalized = []
    for (let i = 0; i < files.length; i++) {
      tracker.start(`norm${i}`)
      const out = `norm${i}.mp4`
      await normalizeClip(ff, written[i], out, {
        noAudio: stripOriginalAudio,
        onLog,
        expectedSec: durs[i],
        onLocal: (r) => tracker.update(r)
      })
      normalized.push(out)
      written.push(out)
      tracker.complete()
    }

    tracker.start('concat')
    await concatCopy(ff, normalized, baseName, onLog, written, {
      expectedSec: baseDur,
      onLocal: (r) => tracker.update(r)
    })
    written.push(baseName)
    tracker.complete()

    const videoOut = useCustomAudio ? 'video_only.mp4' : 'output.mp4'
    if (needsLoop) {
      tracker.start('loop')
      await applyLoopExtend(
        ff,
        baseName,
        { ...loop, noAudio: stripOriginalAudio, baseDurationSec: baseDur },
        onLog,
        (s) => tracker.update(null, s),
        written,
        (r) => tracker.update(r)
      )
      if (useCustomAudio) {
        await execOrThrow(
          ff,
          ['-i', 'output.mp4', '-c', 'copy', '-y', videoOut],
          onLog,
          { expectedSec: outDur, onLocal: (r) => tracker.update(0.95 + r * 0.05) }
        )
        written.push(videoOut)
      }
      tracker.complete()
    } else {
      tracker.start('export')
      await execOrThrow(
        ff,
        ['-i', baseName, '-c', 'copy', '-movflags', '+faststart', '-y', videoOut],
        onLog,
        { expectedSec: baseDur, onLocal: (r) => tracker.update(r) }
      )
      written.push(videoOut)
      tracker.complete()
    }
    if (!useCustomAudio) written.push('output.mp4')

    let currentVideo = useCustomAudio ? videoOut : 'output.mp4'
    if (useCustomAudio && audioMemName) {
      tracker.start('audio')
      await muxCustomAudio(ff, videoOut, audioMemName, 'output.mp4', onLog, {
        expectedSec: outDur,
        onLocal: (r) => tracker.update(r)
      })
      written.push('output.mp4')
      currentVideo = 'output.mp4'
      tracker.complete()
    }

    let subtitlesEmbedded = false
    if (subtitleSrt && subtitleSrt.trim()) {
      tracker.start('subs')
      const srtName = 'subs.srt'
      await ff.writeFile(srtName, subtitleSrt.replace(/^\uFEFF/, ''))
      written.push(srtName)
      try {
        const withSubs = 'output_subs.mp4'
        await muxSubtitles(ff, currentVideo, srtName, withSubs, onLog, (r) =>
          tracker.update(r)
        )
        written.push(withSubs)
        const subData = await ff.readFile(withSubs)
        await ff.writeFile('output.mp4', subData)
        currentVideo = 'output.mp4'
        subtitlesEmbedded = true
        onLog?.('字幕已嵌入 MP4（mov_text）')
      } catch (err) {
        onLog?.(`嵌入字幕失敗（仍會提供 SRT 下載）：${err?.message || err}`)
        subtitlesEmbedded = false
      }
      tracker.complete()
    }

    tracker.start('read')
    const data = await ff.readFile(
      currentVideo === 'output.mp4' ? 'output.mp4' : currentVideo
    )
    if (!written.includes('output.mp4')) written.push('output.mp4')
    tracker.finish()

    const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
    if (!u8.byteLength) {
      throw new Error('合併結果是空檔，請換一段影片再試')
    }
    return {
      blob: new Blob([u8], { type: 'video/mp4' }),
      subtitlesEmbedded
    }
  } finally {
    activeProgressSink = null
    for (const name of written) {
      try {
        await ff.deleteFile(name)
      } catch {
        /* ignore */
      }
    }
  }
}
