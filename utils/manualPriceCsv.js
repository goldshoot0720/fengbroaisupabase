import { parseFullCsv } from './menuBackup/csvText.js'

export const MANUAL_PRICE_CSV_HEADERS = [
  'name',
  'currency',
  'price',
  'date',
  'note',
  'productId',
  'recordId',
]

const HEADER_ALIASES = {
  name: 'name',
  商品: 'name',
  商品名稱: 'name',
  product: 'name',
  currency: 'currency',
  幣別: 'currency',
  price: 'price',
  價錢: 'price',
  價格: 'price',
  date: 'date',
  日期: 'date',
  note: 'note',
  備註: 'note',
  productid: 'productId',
  product_id: 'productId',
  recordid: 'recordId',
  record_id: 'recordId',
}

function escapeValue(value) {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeHeaderKey(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '')
}

function mapHeader(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  for (const header of MANUAL_PRICE_CSV_HEADERS) {
    if (header.toLowerCase() === lower) return header
  }
  return HEADER_ALIASES[normalizeHeaderKey(trimmed)] ?? HEADER_ALIASES[trimmed] ?? null
}

function pricesOf(product) {
  if (Array.isArray(product?.prices)) return product.prices
  if (Array.isArray(product?.records)) return product.records
  return []
}

export function buildManualPriceCsv(products) {
  const rows = [MANUAL_PRICE_CSV_HEADERS.join(',')]
  for (const product of products || []) {
    const prices = pricesOf(product)
    if (!prices.length) {
      rows.push([
        escapeValue(product.name),
        escapeValue(product.currency || 'TWD'),
        '',
        '',
        escapeValue(product.note || ''),
        escapeValue(product.id || ''),
        '',
      ].join(','))
      continue
    }
    for (const record of prices) {
      rows.push([
        escapeValue(product.name),
        escapeValue(product.currency || record.currency || 'TWD'),
        escapeValue(record.price ?? ''),
        escapeValue(record.date || ''),
        escapeValue(record.note || product.note || ''),
        escapeValue(product.id || ''),
        escapeValue(record.id || ''),
      ].join(','))
    }
  }
  return rows.join('\n')
}

export function parseManualPriceCsv(text) {
  const errors = []
  const products = []
  const byId = new Map()
  const byName = new Map()
  const rows = parseFullCsv(text)
  if (rows.length < 2) {
    return { data: [], errors: ['CSV 檔案至少需要表頭和一行資料'] }
  }

  const columnIndex = {}
  for (let i = 0; i < rows[0].length; i++) {
    const mapped = mapHeader(rows[0][i] || '')
    if (mapped && columnIndex[mapped] == null) columnIndex[mapped] = i
  }
  if (columnIndex.name == null) {
    return { data: [], errors: ['表頭缺少 name'] }
  }

  const cell = (values, header) => {
    const idx = columnIndex[header]
    if (idx == null) return ''
    return (values[idx] || '').trim()
  }

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i]
    const name = cell(values, 'name')
    if (!name) {
      errors.push(`第 ${i + 1} 行: 商品名稱不能為空`)
      continue
    }
    const productId = cell(values, 'productId') || ''
    const existing = (productId && byId.get(productId)) || byName.get(name)
    const product = existing || {
      id: productId || createId('product'),
      name,
      note: '',
      createdAt: new Date().toISOString(),
      prices: [],
    }
    if (!existing) {
      products.push(product)
      byId.set(product.id, product)
      byName.set(name, product)
    }
    const priceRaw = cell(values, 'price')
    const date = cell(values, 'date')
    const note = cell(values, 'note')
    if (note && !product.note) product.note = note
    if (priceRaw !== '' && date) {
      const price = Number(priceRaw)
      if (!Number.isFinite(price)) {
        errors.push(`第 ${i + 1} 行: 價格不是數字`)
        continue
      }
      product.prices.push({
        id: cell(values, 'recordId') || createId('price'),
        price,
        date,
        note,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return { data: products, errors }
}

export function mergeManualPriceProducts(existing, incoming) {
  const map = new Map()
  const order = []
  const keyOf = (product) => String(product.id || product.name || '').trim()
  for (const product of existing || []) {
    const key = keyOf(product)
    if (!key) continue
    if (!map.has(key)) order.push(key)
    map.set(key, product)
  }
  for (const product of incoming || []) {
    const key = keyOf(product) || product.name
    if (!map.has(key)) order.push(key)
    const prev = map.get(key)
    map.set(key, {
      id: product.id || prev?.id || createId('product'),
      name: product.name || prev?.name || '',
      note: product.note || prev?.note || '',
      createdAt: prev?.createdAt || product.createdAt || new Date().toISOString(),
      prices: (product.prices || []).length ? product.prices : (prev?.prices || []),
    })
  }
  return order.map((key) => map.get(key)).filter(Boolean).slice(0, 50)
}
