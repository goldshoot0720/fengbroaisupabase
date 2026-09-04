import { buildCsv, parseFullCsv } from './csvText.js'

export const FOOD_CSV_HEADERS = ['name', 'amount', 'todate', 'photo', 'price', 'shop', 'photohash']
export const ROUTINE_CSV_HEADERS = ['name', 'note', 'lastdate1', 'lastdate2', 'lastdate3', 'link', 'photo']
export const MUSIC_META_CSV_HEADERS = ['name', 'category', 'language', 'lyrics', 'note', 'ref']
export const VIDEO_META_CSV_HEADERS = ['name', 'category', 'note', 'ref']
export const BANK_CSV_HEADERS = ['name', 'deposit', 'site', 'address', 'withdrawals', 'transfer', 'activity', 'card', 'account']
export const SUBSCRIPTION_CSV_HEADERS = ['name', 'site', 'price', 'nextdate', 'note', 'account', 'currency', 'continue']
export const COMMON_ACCOUNT_SITE_COUNT = 37

const BANK_HEADER_ALIASES = {
  name: 'name',
  銀行名稱: 'name',
  deposit: 'deposit',
  存款: 'deposit',
  site: 'site',
  '分行/網點': 'site',
  分行: 'site',
  address: 'address',
  地址: 'address',
  withdrawals: 'withdrawals',
  提款: 'withdrawals',
  transfer: 'transfer',
  轉帳: 'transfer',
  activity: 'activity',
  '活動/備註': 'activity',
  活動: 'activity',
  備註: 'activity',
  card: 'card',
  卡號: 'card',
  account: 'account',
  帳號: 'account',
}

export function commonAccountCsvHeaders() {
  const headers = ['name']
  for (let i = 1; i <= COMMON_ACCOUNT_SITE_COUNT; i++) {
    const idx = String(i).padStart(2, '0')
    headers.push(`site${idx}`, `note${idx}`)
  }
  return headers
}

function parseByHeaderNames(text, headers) {
  const errors = []
  const data = []
  const rows = parseFullCsv(text)
  if (rows.length < 2) {
    errors.push('CSV 檔案至少需要表頭和一行資料')
    return { data, errors }
  }
  const headerValues = rows[0].map((header) => header.trim())
  const missing = headers.filter((header) => !headerValues.includes(header))
  if (missing.length > 0) {
    errors.push(`表頭缺少欄位: ${missing.join(', ')}`)
    return { data, errors }
  }
  const headerIndexMap = Object.fromEntries(headerValues.map((header, index) => [header, index]))
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const first = values[headerIndexMap[headers[0]]]?.trim() || ''
    if (!first) {
      errors.push(`第 ${i + 1} 行: ${headers[0]} 欄位不能為空`)
      continue
    }
    const row = {}
    headers.forEach((header) => {
      row[header] = values[headerIndexMap[header]]?.trim() || ''
    })
    data.push(row)
  }
  return { data, errors }
}

export function buildFoodCsv(items) {
  return buildCsv(
    FOOD_CSV_HEADERS,
    (items || []).map((food) => [
      food.name || '',
      food.amount ?? 0,
      food.todate || '',
      food.photo || '',
      food.price ?? 0,
      food.shop || '',
      food.photohash || '',
    ]),
  )
}

export function parseFoodCsv(text) {
  const parsed = parseByHeaderNames(text, FOOD_CSV_HEADERS)
  return {
    errors: parsed.errors,
    data: parsed.data.map((row) => ({
      name: row.name,
      amount: parseFloat(row.amount) || 0,
      todate: row.todate,
      photo: row.photo,
      price: parseFloat(row.price) || 0,
      shop: row.shop,
      photohash: row.photohash,
    })),
  }
}

export function buildRoutineCsv(items) {
  return buildCsv(
    ROUTINE_CSV_HEADERS,
    (items || []).map((routine) => [
      routine.name || '',
      routine.note || '',
      routine.lastdate1 || '',
      routine.lastdate2 || '',
      routine.lastdate3 || '',
      routine.link || '',
      routine.photo || '',
    ]),
  )
}

export function parseRoutineCsv(text) {
  const parsed = parseByHeaderNames(text, ROUTINE_CSV_HEADERS)
  return {
    errors: parsed.errors,
    data: parsed.data.map((row) => ({
      name: row.name,
      note: row.note,
      lastdate1: row.lastdate1 || '',
      lastdate2: row.lastdate2 || '',
      lastdate3: row.lastdate3 || '',
      link: row.link,
      photo: row.photo,
    })),
  }
}

export function buildCommonAccountCsv(items) {
  const headers = commonAccountCsvHeaders()
  const rows = (items || []).map((account) => {
    const row = [account.name || '']
    for (let i = 1; i <= COMMON_ACCOUNT_SITE_COUNT; i++) {
      const idx = String(i).padStart(2, '0')
      row.push(account[`site${idx}`] || '')
      row.push(account[`note${idx}`] || '')
    }
    return row
  })
  return buildCsv(headers, rows)
}

export function parseCommonAccountCsv(text) {
  const headers = commonAccountCsvHeaders()
  const parsed = parseByHeaderNames(text, headers)
  return {
    errors: parsed.errors,
    data: parsed.data.map((row) => {
      const form = { name: row.name }
      for (let i = 1; i <= COMMON_ACCOUNT_SITE_COUNT; i++) {
        const idx = String(i).padStart(2, '0')
        form[`site${idx}`] = row[`site${idx}`] || ''
        form[`note${idx}`] = row[`note${idx}`] || ''
      }
      return form
    }),
  }
}

export function buildMusicMetaCsv(items) {
  return buildCsv(
    MUSIC_META_CSV_HEADERS,
    (items || []).map((item) => [
      item.name || '',
      item.category || '',
      item.language || '',
      item.lyrics || '',
      item.note || '',
      item.ref || '',
    ]),
  )
}

export function parseMusicMetaCsv(text) {
  const parsed = parseByHeaderNames(text, MUSIC_META_CSV_HEADERS)
  return {
    errors: parsed.errors,
    data: parsed.data.map((row) => ({
      name: row.name,
      category: row.category,
      language: row.language,
      lyrics: row.lyrics,
      note: row.note,
      ref: row.ref,
    })),
  }
}

export function buildVideoMetaCsv(items) {
  return buildCsv(
    VIDEO_META_CSV_HEADERS,
    (items || []).map((item) => [item.name || '', item.category || '', item.note || '', item.ref || '']),
  )
}

export function parseVideoMetaCsv(text) {
  const parsed = parseByHeaderNames(text, VIDEO_META_CSV_HEADERS)
  return {
    errors: parsed.errors,
    data: parsed.data.map((row) => ({
      name: row.name,
      category: row.category,
      note: row.note,
      ref: row.ref,
    })),
  }
}

export function buildBankCsv(items) {
  return buildCsv(
    BANK_CSV_HEADERS,
    (items || []).map((bank) => [
      bank.name || '',
      bank.deposit ?? 0,
      bank.site || '',
      bank.address || '',
      bank.withdrawals ?? 0,
      bank.transfer ?? 0,
      bank.activity || '',
      bank.card || '',
      bank.account || '',
    ]),
  )
}

export function parseBankCsv(text) {
  const errors = []
  const data = []
  const rows = parseFullCsv(text)
  if (rows.length < 2) {
    return { data, errors: ['CSV 檔案至少需要表頭和一行資料'] }
  }
  const headerValues = rows[0].map((header) => header.trim())
  const indexMap = {}
  headerValues.forEach((header, index) => {
    const mapped = BANK_HEADER_ALIASES[header] || BANK_CSV_HEADERS.find((item) => item === header)
    if (mapped && indexMap[mapped] == null) indexMap[mapped] = index
  })
  if (indexMap.name == null) {
    return { data, errors: ['表頭缺少名稱欄位'] }
  }
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const cell = (key) => (indexMap[key] == null ? '' : (values[indexMap[key]] || '').trim())
    const name = cell('name')
    if (!name) {
      errors.push(`第 ${i + 1} 行: 名稱不能為空`)
      continue
    }
    data.push({
      name,
      deposit: parseFloat(cell('deposit')) || 0,
      site: cell('site'),
      address: cell('address'),
      withdrawals: parseFloat(cell('withdrawals')) || 0,
      transfer: parseFloat(cell('transfer')) || 0,
      activity: cell('activity'),
      card: cell('card'),
      account: cell('account'),
    })
  }
  return { data, errors }
}

export function buildSubscriptionCsv(items) {
  return buildCsv(
    SUBSCRIPTION_CSV_HEADERS,
    (items || []).map((item) => [
      item.name || '',
      item.site || '',
      item.price ?? '',
      item.nextdate || '',
      item.note || '',
      item.account || '',
      item.currency || 'TWD',
      item.iscontinue !== false && item.continue !== false && item.continue !== 'false' ? 'true' : 'false',
    ]),
  )
}

export function parseSubscriptionBackupCsv(text) {
  const parsed = parseByHeaderNames(text, SUBSCRIPTION_CSV_HEADERS)
  return {
    errors: parsed.errors,
    data: parsed.data.map((row) => ({
      name: row.name,
      site: row.site,
      price: parseFloat(row.price) || 0,
      nextdate: (row.nextdate || '').slice(0, 10),
      note: row.note,
      account: row.account,
      currency: row.currency || 'TWD',
      iscontinue: row.continue !== 'false',
    })),
  }
}
