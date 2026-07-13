export const PORTRAIT_SIZE = { width: 1080, height: 1920 }
export const LANDSCAPE_SIZE = { width: 1920, height: 1080 }
const AUTO_MAX_LONG = 1920

export function detectOrientation(image) {
  if (!image?.naturalWidth || !image.naturalHeight) return 'portrait'
  return image.naturalWidth >= image.naturalHeight ? 'landscape' : 'portrait'
}

export function resolveOrientation(mode, image) {
  if (mode === 'auto') return detectOrientation(image)
  return mode
}

function even(n) {
  const v = Math.max(2, Math.round(n))
  return v % 2 === 0 ? v : v + 1
}

function aspectLabel(w, h) {
  const g = (a, b) => (b === 0 ? a : g(b, a % b))
  const d = g(w, h) || 1
  let rw = Math.round(w / d)
  let rh = Math.round(h / d)
  if (rw > 50 || rh > 50) {
    if (w >= h) {
      rw = Math.round((w / h) * 9)
      rh = 9
    } else {
      rh = Math.round((h / w) * 9)
      rw = 9
    }
  }
  return `${rw}:${rh}`
}

/**
 * Size canvas for export / preview.
 * - auto: match source image aspect (scale longest side to 1920)
 * - portrait / landscape: fixed 9:16 or 16:9
 */
export function resolveCanvasSize(mode, image) {
  const orientation = resolveOrientation(mode, image)

  if (mode === 'auto' && image?.naturalWidth && image.naturalHeight) {
    const iw = image.naturalWidth
    const ih = image.naturalHeight
    const long = Math.max(iw, ih)
    const scale = AUTO_MAX_LONG / long
    const width = even(iw * scale)
    const height = even(ih * scale)
    return {
      width,
      height,
      orientation,
      label: aspectLabel(width, height)
    }
  }

  if (orientation === 'landscape') {
    return {
      width: LANDSCAPE_SIZE.width,
      height: LANDSCAPE_SIZE.height,
      orientation,
      label: '16:9'
    }
  }

  return {
    width: PORTRAIT_SIZE.width,
    height: PORTRAIT_SIZE.height,
    orientation,
    label: '9:16'
  }
}

export function orientationLabel(mode, resolved) {
  if (mode === 'auto') {
    return resolved === 'landscape' ? '自動 · 橫式' : '自動 · 直式'
  }
  return mode === 'landscape' ? '橫式' : '直式'
}
