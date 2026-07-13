function abortableTimeout(ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  }
}

async function readError(res) {
  try {
    const err = await res.json()
    return err?.statusMessage || err?.error || err?.message || res.statusText
  } catch {
    return res.statusText
  }
}

/** Batch TTS: one server request per chunk */
export async function fetchTTSBatch(items, rate, volume, onProgress) {
  if (!items.length) return []

  // Smaller chunks for Netlify serverless time budget
  const CHUNK = 6
  const all = []

  for (let offset = 0; offset < items.length; offset += CHUNK) {
    const slice = items.slice(offset, offset + CHUNK)
    const timeoutMs = Math.min(50_000, 12_000 + slice.length * 7_000)
    const { signal, clear } = abortableTimeout(timeoutMs)
    try {
      const res = await fetch('/api/feng-tools/image-voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: slice, rate, volume }),
        signal
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      if (!Array.isArray(data.audios) || data.audios.length !== slice.length) {
        throw new Error('語音批次回應格式錯誤')
      }
      for (const b64 of data.audios) {
        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        all.push(bytes.buffer)
      }
      onProgress?.(all.length, items.length)
    } catch (e) {
      if (e?.name === 'AbortError') {
        throw new Error('語音生成逾時（Edge TTS 可能無法連線），請稍後再試或減少句數')
      }
      throw e
    } finally {
      clear()
    }
  }

  return all
}

export async function fetchTranslate(lines, language, sourceLanguage = 'auto') {
  const { signal, clear } = abortableTimeout(45_000)
  try {
    const res = await fetch('/api/feng-tools/image-voice/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, language, source_language: sourceLanguage }),
      signal
    })
    if (!res.ok) throw new Error(await readError(res))
    const data = await res.json()
    return data.lines
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('翻譯逾時，請稍後再試')
    throw e
  } finally {
    clear()
  }
}
