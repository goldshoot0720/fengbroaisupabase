export const normalizeImportValue = (value) => {
  if (value === undefined || value === null) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

export const buildImportKey = (record, fields) => {
  return fields.map(field => normalizeImportValue(record?.[field])).join('|')
}

export const filterDuplicateImports = (payload, existingRows, fields) => {
  const existingKeys = new Set((existingRows || []).map(row => buildImportKey(row, fields)))
  const seenKeys = new Set()
  const unique = []
  let skipped = 0

  for (const row of payload || []) {
    const key = buildImportKey(row, fields)
    if (existingKeys.has(key) || seenKeys.has(key)) {
      skipped += 1
      continue
    }
    seenKeys.add(key)
    unique.push(row)
  }

  return { unique, skipped }
}

export const buildImportMessage = (baseMessage, skipped) => {
  if (!skipped) return baseMessage
  return `${baseMessage}，已跳過 ${skipped} 筆重複資料`
}
