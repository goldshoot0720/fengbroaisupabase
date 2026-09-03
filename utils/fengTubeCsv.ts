// 鋒兄Tube 頻道清單的 CSV 匯出／匯入（純函式）。
// 匯出欄位 alias,sourceUrl；匯入時已下架的預設頻道（黑名單）會明確報錯，
// 不會靜默回傳空清單讓 UI 顯示「沒有可匯入的頻道」。

import { getFengTubeHandleFromUrl, REMOVED_FENG_TUBE_HANDLES } from './fengTubeChannels.ts'

export const FENGBRO_TUBE_CSV_HEADERS = ['alias', 'sourceUrl']

const HEADER_ALIASES = {
  alias: 'alias',
  頻道: 'alias',
  頻道別名: 'alias',
  別名: 'alias',
  name: 'alias',
  title: 'alias',
  sourceurl: 'sourceUrl',
  source_url: 'sourceUrl',
  url: 'sourceUrl',
  網址: 'sourceUrl',
  頻道網址: 'sourceUrl',
  channel: 'sourceUrl',
  handle: 'sourceUrl',
}

export const FENGBRO_TUBE_MAX_CHANNELS = 80

export function escapeTubeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/** 從頻道物件（含 label/url 或 alias/sourceUrl）組 CSV 列。 */
export function toFengbroTubeCsvRow(channel) {
  return [
    escapeTubeCsvValue(channel.label || channel.alias || ''),
    escapeTubeCsvValue(channel.url || channel.sourceUrl || ''),
  ].join(',')
}

export function buildFengbroTubeCsv(channels) {
  return [FENGBRO_TUBE_CSV_HEADERS.join(','), ...(channels || []).map(toFengbroTubeCsvRow)].join('\n')
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
  for (const header of FENGBRO_TUBE_CSV_HEADERS) {
    if (header.toLowerCase() === lower) return header
  }
  return HEADER_ALIASES[normalizeHeaderKey(trimmed)] ?? HEADER_ALIASES[trimmed] ?? null
}

/** 黑名單偵測：sourceUrl 可能是網址或 @handle 兩種寫法。 */
function isRemovedTubeChannel(sourceUrl, alias = '') {
  const urlHandle = getFengTubeHandleFromUrl(sourceUrl)
  if (urlHandle && REMOVED_FENG_TUBE_HANDLES.has(urlHandle)) return urlHandle
  const rawHandle = String(sourceUrl || '').trim().replace(/^@/, '').toLowerCase()
  if (rawHandle && REMOVED_FENG_TUBE_HANDLES.has(rawHandle)) return rawHandle
  const aliasHandle = String(alias || '').trim().replace(/^@/, '').toLowerCase()
  if (aliasHandle && REMOVED_FENG_TUBE_HANDLES.has(aliasHandle)) return aliasHandle
  return ''
}

export function parseFengbroTubeCsv(text) {
  const errors = []
  const data = []
  const rows = parseFullCsv(text)

  if (rows.length < 2) {
    errors.push('CSV 檔案至少需要表頭（alias,sourceUrl）和一行頻道')
    return { data, errors }
  }

  const columnIndex = {}
  for (let i = 0; i < rows[0].length; i++) {
    const mapped = mapHeader(rows[0][i] || '')
    if (mapped && columnIndex[mapped] == null) columnIndex[mapped] = i
  }

  if (columnIndex.sourceUrl == null) {
    errors.push('表頭缺少必要欄位 "sourceUrl"（頻道網址）')
    return { data, errors }
  }

  const removedHandles = []

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const lineNumber = i + 1
    const cell = (header) => {
      const idx = columnIndex[header]
      if (idx == null) return ''
      return values[idx] ?? ''
    }

    const alias = cell('alias').trim()
    const sourceUrl = cell('sourceUrl').trim()
    if (alias.length > 100) {
      errors.push(`第 ${lineNumber} 行: 頻道別名最多 100 個字元`)
      continue
    }
    if (!sourceUrl) {
      errors.push(`第 ${lineNumber} 行: sourceUrl 不能為空`)
      continue
    }

    // 已下架預設頻道：明確回報，不靜默略過。
    const removedHandle = isRemovedTubeChannel(sourceUrl, alias)
    if (removedHandle) {
      removedHandles.push(removedHandle)
      continue
    }

    // 只接受 YouTube 網址或 @handle 兩種寫法（格式由 UI 再正規化）。
    const looksLikeUrl = /^https?:\/\//i.test(sourceUrl)
    const looksLikeHandle = /^@?[\w-]+$/i.test(sourceUrl)
    if (!looksLikeUrl && !looksLikeHandle) {
      errors.push(`第 ${lineNumber} 行: 頻道網址需為 YouTube 網址或 @handle`)
      continue
    }
    if (looksLikeUrl && !/@/.test(sourceUrl) && !/youtube\.com/i.test(sourceUrl)) {
      errors.push(`第 ${lineNumber} 行: 只支援 YouTube 頻道網址`)
      continue
    }

    if (data.length >= FENGBRO_TUBE_MAX_CHANNELS) {
      errors.push(`最多 ${FENGBRO_TUBE_MAX_CHANNELS} 個頻道，已略過第 ${lineNumber} 行以後的資料`)
      break
    }

    data.push({ alias, sourceUrl })
  }

  if (removedHandles.length > 0) {
    errors.push(
      `略過已下架的預設頻道 ${removedHandles.length} 個：@${[...new Set(removedHandles)].join('、@')}`,
    )
  }

  return { data, errors }
}
