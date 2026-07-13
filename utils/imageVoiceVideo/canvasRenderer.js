const FONT_FAMILY = '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif'
const BASE_SHORT = 1080

function wrapText(ctx, text, maxWidth) {
  const lines = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Draw one video frame onto canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement|null} image
 * @param {Array<{text:string,startAt:number,endAt:number,language:string}>} subtitleLines
 * @param {number} elapsed seconds
 * @param {boolean} [showAll=false]
 */
export function drawFrame(canvas, image, subtitleLines, elapsed, showAll = false) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  if (W <= 0 || H <= 0) return

  const shortSide = Math.min(W, H)
  const scale = shortSide / BASE_SHORT
  const fontSize = Math.round(38 * scale)
  const lineHeight = fontSize * 1.5
  const sidePad = Math.round(24 * scale)
  const bottomMargin = Math.round((H > W ? 60 : 48) * scale)

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0a0f18'
  ctx.fillRect(0, 0, W, H)

  if (image && image.naturalWidth > 0) {
    const coverScale = Math.max(W / image.naturalWidth, H / image.naturalHeight)
    const coverW = image.naturalWidth * coverScale
    const coverH = image.naturalHeight * coverScale
    const coverX = (W - coverW) / 2
    const coverY = (H - coverH) / 2

    ctx.save()
    ctx.filter = 'blur(24px) brightness(0.5)'
    ctx.drawImage(image, coverX, coverY, coverW, coverH)
    ctx.restore()

    const imgScale = Math.min(W / image.naturalWidth, H / image.naturalHeight)
    const sw = image.naturalWidth * imgScale
    const sh = image.naturalHeight * imgScale
    ctx.drawImage(image, (W - sw) / 2, (H - sh) / 2, sw, sh)
  }

  // Prefer the latest started cue per language so multi-line scripts swap cleanly
  // even when segment boundaries have tiny timing gaps/overlaps.
  let active = []
  if (showAll) {
    active = subtitleLines
  } else {
    const EPS = 0.04
    const bestByLang = new Map()
    for (const s of subtitleLines) {
      if (elapsed + EPS < s.startAt || elapsed >= s.endAt + EPS) continue
      const prev = bestByLang.get(s.language)
      if (!prev || s.startAt >= prev.startAt) bestByLang.set(s.language, s)
    }
    active = [...bestByLang.values()]
  }

  if (active.length === 0) return

  const groups = new Map()
  for (const s of active) {
    if (!groups.has(s.language)) groups.set(s.language, [])
    groups.get(s.language).push(s)
  }

  let trackY = H - bottomMargin

  for (const [, subs] of [...groups.entries()].reverse()) {
    const text = subs.map(s => s.text).join(' / ')
    ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`
    const maxTextWidth = W - sidePad * 2
    const lines = wrapText(ctx, text, Math.max(40, maxTextWidth))
    const blockH = lines.length * lineHeight
    const textTop = trackY - blockH

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
    ctx.lineWidth = Math.max(2, Math.round(4 * scale))
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = Math.round(8 * scale)
    ctx.shadowOffsetY = Math.round(1 * scale)

    lines.forEach((l, i) => {
      const x = W / 2
      const y = textTop + i * lineHeight
      ctx.strokeText(l, x, y)
      ctx.fillText(l, x, y)
    })

    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
    ctx.lineWidth = 1
    trackY = textTop - Math.round(12 * scale)
  }
}
