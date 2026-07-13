/**
 * Parse script text into lines.
 * Lines prefixed with "男：" → male; "女：" → female; otherwise gender is null.
 */
export function parseScriptLines(raw = '') {
  return String(raw)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const malePrefix = /^(男[：:])\s*/
      const femalePrefix = /^(女[：:])\s*/
      if (malePrefix.test(line)) {
        return { text: line.replace(malePrefix, ''), gender: 'male' }
      }
      if (femalePrefix.test(line)) {
        return { text: line.replace(femalePrefix, ''), gender: 'female' }
      }
      return { text: line, gender: null }
    })
}

/** Sanitize a string for use as a filename. */
export function safeFilename(raw, fallback = '影片') {
  return String(raw || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 60) || fallback
}
