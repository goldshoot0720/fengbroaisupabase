// Resend 通知設定的 CSV 匯出／匯入（純函式）。
// 欄位沿用既有設定命名：RESEND_API_KEY / RESEND_TO_EMAIL，一組一列。
// 不含寄件人 from email（那是帳號層級、非逐組）。

export const RESEND_SETTINGS_CSV_HEADERS = ['RESEND_API_KEY', 'RESEND_TO_EMAIL']
export const RESEND_SETTINGS_MAX_SLOTS = 21

const HEADER_ALIASES = {
  resendapikey: 'RESEND_API_KEY',
  resend_api_key: 'RESEND_API_KEY',
  apikey: 'RESEND_API_KEY',
  api_key: 'RESEND_API_KEY',
  key: 'RESEND_API_KEY',
  'api key': 'RESEND_API_KEY',
  組api: 'RESEND_API_KEY',
  api金鑰: 'RESEND_API_KEY',
  resendtoemail: 'RESEND_TO_EMAIL',
  resend_to_email: 'RESEND_TO_EMAIL',
  toemail: 'RESEND_TO_EMAIL',
  to_email: 'RESEND_TO_EMAIL',
  email: 'RESEND_TO_EMAIL',
  收件: 'RESEND_TO_EMAIL',
  收件人: 'RESEND_TO_EMAIL',
  收件email: 'RESEND_TO_EMAIL',
  收件電子郵件: 'RESEND_TO_EMAIL',
  通知email: 'RESEND_TO_EMAIL',
  通知收件: 'RESEND_TO_EMAIL',
  通知收件email: 'RESEND_TO_EMAIL',
  通知收件電子郵件: 'RESEND_TO_EMAIL',
  電子郵件: 'RESEND_TO_EMAIL',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const escapeResendCsvValue = (value) => {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/** 只匯出已填滿 apiKey 與 toEmail 的組。 */
export const buildResendSettingsCsv = (slots) => {
  const rows = (slots || [])
    .filter((slot) => slot?.apiKey && slot?.toEmail)
    .map((slot) =>
      [escapeResendCsvValue(slot.apiKey), escapeResendCsvValue(slot.toEmail)].join(','),
    )
  return [RESEND_SETTINGS_CSV_HEADERS.join(','), ...rows].join('\n')
}

function parseFullCsv(text) {
  const rows = []
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  let currentRow = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]

    if (inQuotes) {
      if (char === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"'
          i++
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

function normalizeHeaderKey(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '')
}

function mapHeader(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  for (const header of RESEND_SETTINGS_CSV_HEADERS) {
    if (header.toLowerCase() === lower) return header
  }
  return HEADER_ALIASES[normalizeHeaderKey(trimmed)] ?? HEADER_ALIASES[trimmed] ?? null
}

export const parseResendSettingsCsv = (text) => {
  const errors = []
  const slots = []
  const rows = parseFullCsv(text)

  if (rows.length < 2) {
    errors.push('CSV 檔案至少需要表頭（RESEND_API_KEY,RESEND_TO_EMAIL）和一組資料')
    return { slots, errors }
  }

  const columnIndex = {}
  for (let i = 0; i < rows[0].length; i++) {
    const mapped = mapHeader(rows[0][i] || '')
    if (mapped && columnIndex[mapped] == null) columnIndex[mapped] = i
  }

  if (columnIndex.RESEND_API_KEY == null) {
    errors.push('表頭缺少必要欄位 "RESEND_API_KEY"（或 API Key）')
    return { slots, errors }
  }
  if (columnIndex.RESEND_TO_EMAIL == null) {
    errors.push('表頭缺少必要欄位 "RESEND_TO_EMAIL"（或收件 Email）')
    return { slots, errors }
  }

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const lineNumber = i + 1
    const cell = (header) => {
      const idx = columnIndex[header]
      if (idx == null) return ''
      return values[idx] ?? ''
    }

    const apiKey = cell('RESEND_API_KEY').trim()
    const toEmail = cell('RESEND_TO_EMAIL').trim()

    if (!apiKey) {
      errors.push(`第 ${lineNumber} 行: RESEND_API_KEY 不能為空`)
      continue
    }
    if (!toEmail) {
      errors.push(`第 ${lineNumber} 行: RESEND_TO_EMAIL 不能為空`)
      continue
    }
    if (!EMAIL_PATTERN.test(toEmail)) {
      errors.push(`第 ${lineNumber} 行: 收件 Email「${toEmail}」格式不正確`)
      continue
    }
    if (slots.length >= RESEND_SETTINGS_MAX_SLOTS) {
      errors.push(`最多 ${RESEND_SETTINGS_MAX_SLOTS} 組，已略過第 ${lineNumber} 行以後的資料`)
      break
    }

    slots.push({ apiKey, toEmail })
  }

  return { slots, errors }
}

/**
 * 合併匯入的組到既有 slots（依收件 Email 配對）。
 * - 相同 Email：以 CSV 的 API Key 覆蓋該組。
 * - 新 Email：依序補到後方，直到上限為止，其餘略過。
 */
export const mergeResendSlots = (incoming, current) => {
  const slots = (current || []).map((slot) => ({ ...slot }))
  const byEmail = new Map()
  slots.forEach((slot, index) => byEmail.set(slot.toEmail.trim().toLowerCase(), index))

  let added = 0
  let updated = 0
  let skipped = 0

  for (const item of incoming || []) {
    const apiKey = String(item.apiKey || '').trim()
    const toEmail = String(item.toEmail || '').trim()
    if (!apiKey || !toEmail) {
      skipped += 1
      continue
    }
    const emailKey = toEmail.toLowerCase()
    const existingIndex = byEmail.get(emailKey)
    if (existingIndex != null) {
      slots[existingIndex] = { apiKey, toEmail }
      updated += 1
    } else if (slots.length < RESEND_SETTINGS_MAX_SLOTS) {
      slots.push({ apiKey, toEmail })
      byEmail.set(emailKey, slots.length - 1)
      added += 1
    } else {
      skipped += 1
    }
  }

  return { slots, added, updated, skipped }
}
