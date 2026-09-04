export function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export function withBom(csv) {
  const text = String(csv || '')
  return text.startsWith('\uFEFF') ? text : `\uFEFF${text}`
}

export function buildCsv(headers, rows) {
  const lines = [headers.map(escapeCsvValue).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(','))
  }
  return lines.join('\n')
}

export function parseFullCsv(text) {
  const rows = []
  const cleanText = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  let currentRow = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    if (inQuotes) {
      if (char === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      currentRow.push(currentField)
      currentField = ''
    } else if (char === '\n') {
      currentRow.push(currentField)
      if (currentRow.length > 0 && currentRow.some((field) => field.trim())) {
        rows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else {
      currentField += char
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    if (currentRow.some((field) => field.trim())) {
      rows.push(currentRow)
    }
  }

  return rows
}

export function parseCsvObjects(text) {
  const rows = parseFullCsv(text)
  if (rows.length < 2) return { headers: rows[0] || [], rows: [] }
  const headers = rows[0].map((header) => header.trim())
  return {
    headers,
    rows: rows.slice(1).map((values) => {
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] ?? ''
      })
      return row
    }),
  }
}
