import { fetchTTSBatch, fetchTranslate } from './apiClient'
import { drawFrame } from './canvasRenderer'
import { FRAME_INTERVAL_MS, VIDEO_FPS, mediaRecorderBitrateOptions } from './videoQuality'
import { resolveLineGender } from './personGender'

function chooseMime(fmt) {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('此瀏覽器不支援 MediaRecorder，請使用 Chrome 或 Edge')
  }
  if (fmt === 'mp4') {
    const mp4Types = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4']
    const found = mp4Types.find(t => MediaRecorder.isTypeSupported(t))
    if (found) return { mimeType: found, ext: 'mp4' }
  }
  const webmTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ]
  const found = webmTypes.find(t => MediaRecorder.isTypeSupported(t))
  return { mimeType: found || 'video/webm', ext: 'webm' }
}

function stopTracks(stream, kinds) {
  if (!stream) return
  for (const track of stream.getTracks()) {
    if (kinds && !kinds.includes(track.kind)) continue
    try { track.stop() } catch { /* ignore */ }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function requestCanvasFrame(stream) {
  const track = stream?.getVideoTracks?.()[0]
  if (track?.requestFrame) {
    try { track.requestFrame() } catch { /* ignore */ }
  }
}

/**
 * Fixed-FPS capture is more reliable for multi-line subtitle swaps than
 * captureStream(0)+requestFrame alone (which can stick on the first painted frame
 * in some Chrome/Edge builds when the source canvas is also Vue-managed).
 * Still call requestFrame after each paint when available as an extra push.
 */
function createCanvasStream(canvas) {
  return canvas.captureStream(VIDEO_FPS)
}

/**
 * Dedicated recording surface, isolated from the Vue preview canvas.
 * Vue re-binding :width/:height or preview redraws must never clear the
 * track MediaRecorder is sampling — that freezes subtitles on line 1.
 */
function createRecordingCanvas(previewCanvas) {
  const w = Math.max(2, previewCanvas?.width || 1080)
  const h = Math.max(2, previewCanvas?.height || 1920)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

function mirrorToPreview(recordingCanvas, previewCanvas) {
  if (!previewCanvas || previewCanvas === recordingCanvas) return
  try {
    if (previewCanvas.width !== recordingCanvas.width) {
      previewCanvas.width = recordingCanvas.width
    }
    if (previewCanvas.height !== recordingCanvas.height) {
      previewCanvas.height = recordingCanvas.height
    }
    const ctx = previewCanvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(recordingCanvas, 0, 0)
  } catch {
    /* preview mirror is best-effort only */
  }
}

/**
 * Record image + multi-language TTS narration into a video blob.
 * Adapted from huang1988pioneer/ImageVoiceVideo.
 *
 * @param {object} opts
 * @param {Array<{text:string,gender:string|null}>} opts.scriptLines
 * @param {Array<{language:string,label:string,gender:string}>} opts.tracks
 * @param {HTMLImageElement|null} opts.image
 * @param {HTMLCanvasElement} opts.canvas
 * @param {'mp4'|'webm'} opts.format
 * @param {number} opts.rate
 * @param {number} opts.volume
 * @param {string} opts.scriptLanguage
 * @param {'male'|'female'|null} [opts.detectedGender] image auto gender (single person)
 * @param {(msg:string)=>void} [opts.onStatus]
 * @param {()=>boolean} [opts.isAborted]
 * @returns {Promise<{blob:Blob,ext:string,duration:number}>}
 */
export async function recordImageVoiceVideo(opts) {
  const {
    scriptLines,
    tracks,
    image,
    canvas: previewCanvas,
    format = 'webm',
    rate = 0,
    volume = 100,
    scriptLanguage = 'zh-TW',
    detectedGender = null,
    onStatus = () => {},
    isAborted = () => false
  } = opts

  if (!scriptLines?.length) throw new Error('請輸入語音稿')
  if (!tracks?.length) throw new Error('請至少選擇一種語音語言')
  if (!previewCanvas) throw new Error('預覽畫布尚未就緒')

  const { mimeType, ext: initialExt } = chooseMime(format)
  let currentExt = initialExt

  // Record onto a detached canvas so Vue preview reactivity cannot freeze frames.
  const canvas = createRecordingCanvas(previewCanvas)

  let audioContext = null
  let destination = null
  let canvasStream = null
  let mixedStream = null
  let recorder = null
  const resources = { worker: null, workerUrl: null, timer: null, interval: null, raf: null }

  try {
    audioContext = new AudioContext()
    await audioContext.resume()

    // 1. Translate spoken text per track
    onStatus('正在翻譯字幕…')
    const spokenByTrack = []
    const allSubtitleTracks = []

    for (const track of tracks) {
      if (isAborted()) throw new Error('已取消')
      let spoken
      if (track.language === scriptLanguage) {
        spoken = scriptLines.map(l => l.text)
      } else {
        spoken = await fetchTranslate(
          scriptLines.map(l => l.text),
          track.language,
          scriptLanguage
        )
      }
      spokenByTrack.push(spoken)
      allSubtitleTracks.push(
        spoken.map(text => ({
          text,
          startAt: 0,
          endAt: 0,
          language: track.language
        }))
      )
    }

    // 2. TTS per track
    onStatus('正在生成語音…')
    if (audioContext.state === 'suspended') await audioContext.resume()
    destination = audioContext.createMediaStreamDestination()

    const gainValue = Math.min(0.85, 1 / Math.sqrt(Math.max(tracks.length, 1)))
    const segmentDurations = new Array(scriptLines.length).fill(0)
    const allSources = []
    const trackBuffers = []

    for (let t = 0; t < tracks.length; t++) {
      if (isAborted()) throw new Error('已取消')
      const track = tracks[t]
      const spoken = spokenByTrack[t]
      onStatus(`正在生成語音 ${track.label || track.language}…`)

      const items = spoken.map((text, i) => ({
        text,
        language: track.language,
        gender: resolveLineGender(scriptLines[i], track, detectedGender)
      }))

      const abs = await fetchTTSBatch(items, rate, volume, (done, total) => {
        onStatus(`正在生成語音 ${track.label || track.language} ${done}/${total}…`)
      })

      const buffers = []
      for (const ab of abs) {
        const audioBuf = await audioContext.decodeAudioData(ab.slice(0))
        buffers.push(audioBuf)
      }
      trackBuffers.push(buffers)
    }

    for (let i = 0; i < scriptLines.length; i++) {
      const maxDur = Math.max(...trackBuffers.map(bufs => bufs[i].duration), 0.4)
      segmentDurations[i] = maxDur + 0.2
    }

    const segmentStarts = segmentDurations.reduce((starts, _dur, idx) => {
      starts.push(idx === 0 ? 0 : starts[idx - 1] + segmentDurations[idx - 1])
      return starts
    }, [])

    trackBuffers.forEach((buffers, trackIndex) => {
      buffers.forEach((buffer, lineIndex) => {
        const source = audioContext.createBufferSource()
        source.buffer = buffer
        const gain = audioContext.createGain()
        gain.gain.value = gainValue

        if (tracks.length > 1 && typeof audioContext.createStereoPanner === 'function') {
          const panner = audioContext.createStereoPanner()
          panner.pan.value = -0.85 + (1.7 * trackIndex) / Math.max(tracks.length - 1, 1)
          source.connect(gain).connect(panner).connect(destination)
        } else {
          source.connect(gain).connect(destination)
        }

        allSources.push({ source, startAt: segmentStarts[lineIndex] })
      })
    })

    const totalDuration = Math.max(1, segmentDurations.reduce((a, b) => a + b, 0))

    // Build a continuous half-open timeline [start, end) per line so line N+1
    // always starts exactly when line N ends (audio uses the same segmentStarts).
    let cumTime = 0
    for (let i = 0; i < scriptLines.length; i++) {
      const startAt = cumTime
      const endAt = cumTime + segmentDurations[i]
      for (const trackSubs of allSubtitleTracks) {
        if (!trackSubs[i]) continue
        trackSubs[i].startAt = startAt
        trackSubs[i].endAt = endAt
      }
      cumTime = endAt
    }
    const flatSubtitles = allSubtitleTracks.flat()

    // 3. Canvas stream + MediaRecorder (detached recording canvas)
    if (audioContext.state !== 'running') await audioContext.resume()

    drawFrame(canvas, image, flatSubtitles, 0)
    mirrorToPreview(canvas, previewCanvas)
    canvasStream = createCanvasStream(canvas)
    for (let i = 0; i < 3; i++) {
      drawFrame(canvas, image, flatSubtitles, 0)
      requestCanvasFrame(canvasStream)
      await sleep(20)
    }

    const liveVideo = canvasStream.getVideoTracks().filter(t => t.readyState === 'live')
    if (!liveVideo.length) throw new Error('無法擷取畫面，請重新整理後再試')

    const liveAudio = destination.stream.getAudioTracks().filter(t => t.readyState === 'live')
    if (!liveAudio.length) throw new Error('無法擷取音訊，請重新整理後再試')

    mixedStream = new MediaStream([...liveVideo, ...liveAudio])
    const chunks = []

    try {
      recorder = new MediaRecorder(mixedStream, {
        mimeType,
        ...mediaRecorderBitrateOptions()
      })
    } catch {
      recorder = new MediaRecorder(mixedStream)
      currentExt = 'webm'
    }

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }

    onStatus('正在錄製影片…')
    let audioStartTime = 0
    const ctx = audioContext
    const rec = recorder
    const streamForFrames = canvasStream
    // Snapshot timing arrays so paint loop never depends on mutating outer refs oddly
    const subtitleTimeline = flatSubtitles.map(s => ({
      text: s.text,
      startAt: s.startAt,
      endAt: s.endAt,
      language: s.language
    }))

    await new Promise((resolve, reject) => {
      let settled = false
      const stopPainters = () => {
        if (resources.timer) {
          clearTimeout(resources.timer)
          resources.timer = null
        }
        if (resources.interval) {
          clearInterval(resources.interval)
          resources.interval = null
        }
        if (resources.raf != null) {
          try { cancelAnimationFrame(resources.raf) } catch { /* ignore */ }
          resources.raf = null
        }
        try { resources.worker?.postMessage('stop') } catch { /* ignore */ }
        try { resources.worker?.terminate() } catch { /* ignore */ }
        resources.worker = null
      }
      const finish = (err) => {
        if (settled) return
        settled = true
        stopPainters()
        if (err) reject(err)
        else resolve()
      }

      const hardMs = Math.ceil(totalDuration * 1000) + 20_000
      resources.timer = setTimeout(() => {
        try {
          if (rec.state === 'recording' || rec.state === 'paused') {
            try { rec.requestData() } catch { /* ignore */ }
            rec.stop()
          }
        } catch { /* ignore */ }
        setTimeout(() => finish(new Error('錄製逾時，請再試一次（可減少句數）')), 1500)
      }, hardMs)

      rec.onerror = () => finish(new Error('MediaRecorder 發生錯誤'))
      rec.onstop = () => finish()

      rec.onstart = () => {
        void ctx.resume().then(() => {
          audioStartTime = ctx.currentTime
          for (const { source, startAt } of allSources) {
            try { source.start(audioStartTime + startAt) } catch (e) {
              console.warn('source.start failed', e)
            }
          }

          const frameMs = FRAME_INTERVAL_MS
          const recordWallStart = performance.now()
          let lastPct = -1
          let lastPaintAt = 0
          let painting = true

          const paintFrame = (force = false) => {
            if (!painting && !force) return
            const now = performance.now()
            if (!force && now - lastPaintAt < frameMs * 0.4) return
            lastPaintAt = now
            const wallElapsed = (now - recordWallStart) / 1000
            const audioElapsed = Math.max(0, ctx.currentTime - audioStartTime)
            // Prefer wall clock so subtitle timeline keeps moving even if AudioContext stalls.
            // Never clamp to totalDuration early in a way that freezes last line before audio ends.
            const elapsed = Math.min(totalDuration - 0.001, Math.max(wallElapsed, audioElapsed, 0))
            const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100))
            if (pct !== lastPct) {
              lastPct = pct
              onStatus(`正在錄製影片 ${pct}%（請勿切換分頁）…`)
            }
            drawFrame(canvas, image, subtitleTimeline, elapsed)
            requestCanvasFrame(streamForFrames)
            // Live preview only — does not feed MediaRecorder
            mirrorToPreview(canvas, previewCanvas)
          }

          // rAF: smoothest paints while tab is focused
          const rafLoop = () => {
            if (!painting) return
            paintFrame(false)
            resources.raf = requestAnimationFrame(rafLoop)
          }
          resources.raf = requestAnimationFrame(rafLoop)

          // Main-thread interval: keeps going when rAF is throttled
          resources.interval = setInterval(() => paintFrame(false), frameMs)

          // Worker ticks: helps when the tab is backgrounded (browsers throttle timers/rAF)
          try {
            const workerCode = `
              let timer;
              self.onmessage = e => {
                if (e.data === 'start') timer = setInterval(() => self.postMessage('tick'), ${frameMs});
                if (e.data === 'stop')  { clearInterval(timer); self.close(); }
              };
            `
            resources.workerUrl = URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' }))
            resources.worker = new Worker(resources.workerUrl)
            resources.worker.onmessage = () => paintFrame(false)
            resources.worker.onerror = () => {
              /* main-thread interval already covers this */
            }
            resources.worker.postMessage('start')
          } catch (e) {
            console.warn('frame worker unavailable, using main-thread interval only', e)
          }

          paintFrame(true)

          setTimeout(() => {
            painting = false
            try { resources.worker?.postMessage('stop') } catch { /* ignore */ }
            if (resources.interval) {
              clearInterval(resources.interval)
              resources.interval = null
            }
            if (resources.raf != null) {
              try { cancelAnimationFrame(resources.raf) } catch { /* ignore */ }
              resources.raf = null
            }
            // Paint final frame on the last subtitle segment
            const finalT = Math.max(0, totalDuration - 0.05)
            drawFrame(canvas, image, subtitleTimeline, finalT)
            requestCanvasFrame(streamForFrames)
            mirrorToPreview(canvas, previewCanvas)
            setTimeout(() => {
              try {
                if (rec.state === 'recording' || rec.state === 'paused') {
                  try { rec.requestData() } catch { /* ignore */ }
                  rec.stop()
                } else if (!settled) {
                  finish()
                }
              } catch (e) {
                finish(e instanceof Error ? e : new Error(String(e)))
              }
            }, 250)
          }, totalDuration * 1000 + 700)
        }).catch(err => {
          finish(err instanceof Error ? err : new Error(String(err)))
        })
      }

      try {
        // timeslice keeps data flowing and reduces "empty blob" / stuck encoder cases
        rec.start(250)
      } catch (e) {
        try {
          rec.start()
        } catch (e2) {
          finish(e2 instanceof Error ? e2 : new Error(String(e2)))
        }
      }

      setTimeout(() => {
        if (!settled && rec.state === 'inactive') {
          finish(new Error('無法開始錄製，請再試一次'))
        }
      }, 4000)
    })

    await sleep(80)
    stopTracks(destination.stream, ['audio'])
    if (mixedStream) {
      for (const t of mixedStream.getAudioTracks()) {
        try { t.stop() } catch { /* ignore */ }
      }
    }
    stopTracks(canvasStream, ['video'])
    canvasStream = null

    if (!chunks.length) throw new Error('錄製結果為空，請再試一次')
    const blob = new Blob(chunks, { type: rec.mimeType || mimeType })
    if (blob.size < 1024) throw new Error('錄製檔案過小，請重新整理後再試')

    // Prefer native mime extension
    if (blob.type.includes('mp4')) currentExt = 'mp4'
    else if (blob.type.includes('webm')) currentExt = 'webm'

    return { blob, ext: currentExt, duration: totalDuration }
  } finally {
    if (resources.timer) clearTimeout(resources.timer)
    if (resources.interval) clearInterval(resources.interval)
    if (resources.raf != null) {
      try { cancelAnimationFrame(resources.raf) } catch { /* ignore */ }
    }
    try { resources.worker?.terminate() } catch { /* ignore */ }
    if (resources.workerUrl) URL.revokeObjectURL(resources.workerUrl)
    if (canvasStream) stopTracks(canvasStream)
    if (audioContext) {
      try { await audioContext.close() } catch { /* ignore */ }
    }
  }
}
