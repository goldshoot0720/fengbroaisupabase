export const TRIAL_STATUS_OPTIONS = [
  { value: 'untried', label: '尚未試用' },
  { value: 'tried', label: '已試用' },
]

export const PURCHASE_STATUS_OPTIONS = [
  { value: 'not_purchased', label: '未首購' },
  { value: 'purchased', label: '已首購' },
  { value: 'unavailable', label: '無提供首購' },
]

export const REINSTALL_SYSTEM_OPTIONS = [
  { value: 'win', label: 'Windows' },
  { value: 'mac', label: 'Mac' },
]

export const REINSTALL_SOFTWARE_TYPE_OPTIONS = [
  { value: 'trial', label: '試用軟體' },
  { value: 'free', label: '免費軟體' },
  { value: 'paid', label: '付費軟體' },
]

export const REINSTALL_LICENSE_TYPE_OPTIONS = [
  { value: 'none', label: '無序號' },
  { value: 'paid_serial', label: '付費序號' },
]

export const REINSTALL_PERIOD_UNIT_OPTIONS = [
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

export const REINSTALL_CURRENCY_OPTIONS = [
  { value: 'TWD', label: '台幣' },
  { value: 'USD', label: '美元' },
  { value: 'JPY', label: '日圓' },
  { value: 'CNY', label: '人民幣' },
]

const trialStatuses = new Set(TRIAL_STATUS_OPTIONS.map((option) => option.value))
const purchaseStatuses = new Set(PURCHASE_STATUS_OPTIONS.map((option) => option.value))
const reinstallSystems = new Set(REINSTALL_SYSTEM_OPTIONS.map((option) => option.value))
const reinstallSoftwareTypes = new Set(REINSTALL_SOFTWARE_TYPE_OPTIONS.map((option) => option.value))
const reinstallLicenseTypes = new Set(REINSTALL_LICENSE_TYPE_OPTIONS.map((option) => option.value))
const reinstallPeriodUnits = new Set(REINSTALL_PERIOD_UNIT_OPTIONS.map((option) => option.value))
const reinstallCurrencies = new Set(REINSTALL_CURRENCY_OPTIONS.map((option) => option.value))

const REINSTALL_EXCHANGE_RATES = { TWD: 1, USD: 35, JPY: 0.35, CNY: 4.5 }
const REINSTALL_CURRENCY_SYMBOLS = { TWD: 'NT$', USD: '$', JPY: '¥', CNY: '¥' }

function asText(value, label = '欄位', maxLength) {
  if (value == null) return ''
  if (typeof value !== 'string') throw new Error(`${label}必須是文字`)
  const normalized = value.trim()
  if (maxLength && normalized.length > maxLength) {
    throw new Error(`${label}最多 ${maxLength} 個字元`)
  }
  return normalized
}

function asBoolean(value, fallback = false, label = '欄位') {
  if (value == null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 'yes' || value === 1 || value === '1') return true
  if (value === 'false' || value === 'no' || value === 0 || value === '0') return false
  throw new Error(`${label}不正確`)
}

function asNonNegativeInteger(value, label) {
  if (value == null || value === '') return 0
  const parsed = Number(value)
  if ((typeof value !== 'string' && typeof value !== 'number') || !Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label}必須是 0 以上的整數`)
  }
  return parsed
}

function asChoice(value, choices, fallback, label) {
  const normalized = asText(value)
  if (normalized && !choices.has(normalized) && label) throw new Error(`${label}不正確`)
  return choices.has(normalized) ? normalized : fallback
}

function asOptionalDate(value) {
  const normalized = asText(value)
  if (!normalized) return ''
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(normalized)) throw new Error('日期格式不正確')
  const parsed = new Date(normalized)
  const calendarDate = new Date(`${normalized.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== normalized.slice(0, 10)) {
    throw new Error('日期格式不正確')
  }
  return parsed.toISOString()
}

function asOptionalUrl(value) {
  const normalized = asText(value, '軟體網站', 2000)
  if (!normalized) return ''
  let parsed
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error('軟體網站必須是完整網址（例如 https://example.com）')
  }
  if (!new Set(['http:', 'https:']).has(parsed.protocol)) {
    throw new Error('軟體網站只接受 http 或 https 網址')
  }
  return parsed.toString()
}

export function safeSoftwareUrl(value) {
  try {
    return asOptionalUrl(value) || undefined
  } catch {
    return undefined
  }
}

function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('欄位內容必須是物件')
}

export function emptyTrialPurchaseForm(name = '') {
  return {
    name,
    eventDate: '',
    firstPurchasePrice: 0,
    regularPrice: 0,
    account: '',
    note: '',
    trialStatus: 'untried',
    purchaseStatus: 'not_purchased',
  }
}

export function toTrialPurchaseForm(source) {
  return {
    name: source.name || '',
    eventDate: source.eventDate ? source.eventDate.slice(0, 10) : '',
    firstPurchasePrice: Number(source.firstPurchasePrice || 0),
    regularPrice: Number(source.regularPrice || 0),
    account: source.account || '',
    note: source.note || '',
    trialStatus: asChoice(source.trialStatus, trialStatuses, 'untried'),
    purchaseStatus: asChoice(source.purchaseStatus, purchaseStatuses, 'not_purchased'),
  }
}

export function buildTrialPurchaseWritePayload(body, mode) {
  validateBody(body)
  const name = asText(body.name, '服務名稱', 100)
  if (!name) throw new Error('請填寫服務名稱')

  const eventDate = asOptionalDate(body.eventDate)
  const payload = {
    name,
    firstPurchasePrice: asNonNegativeInteger(body.firstPurchasePrice, '首購價格'),
    regularPrice: asNonNegativeInteger(body.regularPrice, '非首購價格'),
    account: asText(body.account, '帳號', 200),
    note: asText(body.note, '備註', 3337),
    trialStatus: asChoice(body.trialStatus, trialStatuses, 'untried', '試用狀態'),
    purchaseStatus: asChoice(body.purchaseStatus, purchaseStatuses, 'not_purchased', '首購狀態'),
  }

  if (eventDate) payload.eventDate = eventDate
  else if (mode === 'update') payload.eventDate = null
  return payload
}

export function trialPurchaseToDbRow(payload) {
  return {
    name: payload.name,
    eventdate: payload.eventDate ? String(payload.eventDate).slice(0, 10) : null,
    firstpurchaseprice: payload.firstPurchasePrice ?? 0,
    regularprice: payload.regularPrice ?? 0,
    account: payload.account || '',
    note: payload.note || '',
    trialstatus: payload.trialStatus,
    purchasestatus: payload.purchaseStatus,
  }
}

export function trialPurchaseFromDbRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name || '',
    eventDate: row.eventdate ? String(row.eventdate).slice(0, 10) : '',
    firstPurchasePrice: Number(row.firstpurchaseprice || 0),
    regularPrice: Number(row.regularprice || 0),
    account: row.account || '',
    note: row.note || '',
    trialStatus: asChoice(row.trialstatus, trialStatuses, 'untried'),
    purchaseStatus: asChoice(row.purchasestatus, purchaseStatuses, 'not_purchased'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function emptyReinstallSoftwareForm() {
  return {
    name: '',
    system: 'win',
    softwareType: 'free',
    licenseType: 'none',
    serial: '',
    viewPassword: '',
    subscriptionSoftware: false,
    subscriptionPeriodCount: 1,
    subscriptionPeriodUnit: 'month',
    subscriptionPrice: 0,
    subscriptionCurrency: 'TWD',
    site: '',
    note: '',
  }
}

export function parseReinstallSubscriptionPeriod(value) {
  const match = String(value || '').trim().match(/^([1-9]\d{0,3})(年|月)$/)
  if (!match) return { count: 1, unit: 'month' }
  return { count: Number(match[1]), unit: match[2] === '年' ? 'year' : 'month' }
}

export function formatReinstallSubscriptionPeriod(count, unit) {
  return `${count}${unit === 'year' ? '年' : '月'}`
}

export function reinstallSubscriptionPeriodLabel(value) {
  const parsed = parseReinstallSubscriptionPeriod(value)
  return parsed.unit === 'year' ? `${parsed.count} 年` : `${parsed.count} 個月`
}

export function toReinstallSoftwareForm(source) {
  const period = parseReinstallSubscriptionPeriod(source.subscriptionPeriod)
  return {
    name: source.name || '',
    system: asChoice(source.system, reinstallSystems, 'win'),
    softwareType: asChoice(source.softwareType, reinstallSoftwareTypes, 'free'),
    licenseType: asChoice(source.licenseType, reinstallLicenseTypes, 'none'),
    serial: source.serial || '',
    viewPassword: source.viewPassword || '',
    subscriptionSoftware: Boolean(source.subscriptionSoftware),
    subscriptionPeriodCount: period.count,
    subscriptionPeriodUnit: period.unit,
    subscriptionPrice: Number(source.subscriptionPrice || 0),
    subscriptionCurrency: asChoice(source.subscriptionCurrency, reinstallCurrencies, 'TWD'),
    site: source.site || '',
    note: source.note || '',
  }
}

export function matchesReinstallViewPassword(stored, entered) {
  return (stored || '').trim() === String(entered || '').trim()
}

function asSubscriptionPeriod(body, enabled) {
  if (!enabled) return ''
  const raw = asText(body.subscriptionPeriod)
  if (raw) {
    if (!/^[1-9]\d{0,3}(年|月)$/.test(raw)) throw new Error('訂閱週期必須是 ?年 或 ?月，例如 1年、3月')
    return raw
  }
  const count = body.subscriptionPeriodCount == null || body.subscriptionPeriodCount === ''
    ? 1
    : asNonNegativeInteger(body.subscriptionPeriodCount, '訂閱週期')
  if (count < 1) throw new Error('訂閱週期必須是 1 以上的整數')
  const unit = asChoice(body.subscriptionPeriodUnit, reinstallPeriodUnits, 'month', '訂閱週期')
  return formatReinstallSubscriptionPeriod(count, unit)
}

export function buildReinstallSoftwareWritePayload(body, mode) {
  validateBody(body)
  const name = asText(body.name, '服務名稱', 100)
  if (!name) throw new Error('請填寫服務名稱')

  const licenseType = asChoice(body.licenseType, reinstallLicenseTypes, 'none', '授權方式')
  const subscriptionSoftware = asBoolean(body.subscriptionSoftware, false, '訂閱制軟體')
  const site = asOptionalUrl(body.site)
  const payload = {
    name,
    system: asChoice(body.system, reinstallSystems, 'win', '使用系統'),
    softwareType: asChoice(body.softwareType, reinstallSoftwareTypes, 'free', '軟體類型'),
    licenseType,
    serial: licenseType === 'paid_serial' ? asText(body.serial, '付費序號', 500) : '',
    viewPassword: licenseType === 'paid_serial' ? asText(body.viewPassword, '查看密碼', 100) : '',
    subscriptionSoftware,
    subscriptionPeriod: asSubscriptionPeriod(body, subscriptionSoftware),
    subscriptionPrice: subscriptionSoftware ? asNonNegativeInteger(body.subscriptionPrice, '訂閱費用') : 0,
    subscriptionCurrency: subscriptionSoftware
      ? asChoice(body.subscriptionCurrency, reinstallCurrencies, 'TWD', '訂閱費用幣別')
      : 'TWD',
    note: asText(body.note, '備註', 3337),
  }

  if (site) payload.site = site
  else if (mode === 'update') payload.site = null
  return payload
}

export function reinstallToDbRow(payload) {
  return {
    name: payload.name,
    system: payload.system,
    softwaretype: payload.softwareType,
    licensetype: payload.licenseType,
    serial: payload.serial || '',
    viewpassword: payload.viewPassword || '',
    subscriptionsoftware: Boolean(payload.subscriptionSoftware),
    subscriptionperiod: payload.subscriptionPeriod || null,
    subscriptionprice: payload.subscriptionPrice ?? 0,
    subscriptioncurrency: payload.subscriptionCurrency || 'TWD',
    site: payload.site || null,
    note: payload.note || '',
  }
}

export function reinstallFromDbRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name || '',
    system: asChoice(row.system, reinstallSystems, 'win'),
    softwareType: asChoice(row.softwaretype, reinstallSoftwareTypes, 'free'),
    licenseType: asChoice(row.licensetype, reinstallLicenseTypes, 'none'),
    serial: row.serial || '',
    viewPassword: row.viewpassword || '',
    subscriptionSoftware: Boolean(row.subscriptionsoftware),
    subscriptionPeriod: row.subscriptionperiod || '',
    subscriptionPrice: Number(row.subscriptionprice || 0),
    subscriptionCurrency: asChoice(row.subscriptioncurrency, reinstallCurrencies, 'TWD'),
    site: row.site || '',
    note: row.note || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function trialPurchaseServiceKey(name) {
  return String(name || '').trim().toLocaleLowerCase('zh-Hant')
}

export function groupTrialPurchases(items, query = '', attentionFilter = 'all') {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('zh-Hant')
  const filtered = (items || []).filter((item) => {
    const matchesQuery = !normalizedQuery || [item.name, item.account, item.note]
      .some((value) => String(value || '').toLocaleLowerCase('zh-Hant').includes(normalizedQuery))
    const matchesAttention = attentionFilter === 'all'
      || (attentionFilter === 'untried' && item.trialStatus !== 'tried')
      || (attentionFilter === 'not_purchased' && item.purchaseStatus === 'not_purchased')
    return matchesQuery && matchesAttention
  })

  const grouped = new Map()
  filtered.forEach((item) => {
    const key = trialPurchaseServiceKey(item.name)
    const group = grouped.get(key) || { key, name: String(item.name || '').trim(), items: [] }
    group.items.push(item)
    grouped.set(key, group)
  })

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) =>
        String(a.account || '').localeCompare(String(b.account || ''), 'zh-Hant'),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
}

export function trialPurchaseStats(items) {
  const list = items || []
  return {
    serviceCount: new Set(list.map((item) => trialPurchaseServiceKey(item.name)).filter(Boolean)).size,
    accountCount: list.length,
    untriedCount: list.filter((item) => item.trialStatus !== 'tried').length,
    notPurchasedCount: list.filter((item) => item.purchaseStatus === 'not_purchased').length,
    pendingCount: list.filter((item) => item.trialStatus !== 'tried' || item.purchaseStatus === 'not_purchased').length,
  }
}

export function filterReinstallSoftware(items, query = '', systemFilter = 'all', softwareFilter = 'all', subscriptionFilter = 'all') {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('zh-Hant')
  return (items || [])
    .filter((item) => {
      const matchesQuery = !normalizedQuery || [item.name, item.site, item.note]
        .some((value) => String(value || '').toLocaleLowerCase('zh-Hant').includes(normalizedQuery))
      const matchesSystem = systemFilter === 'all' || item.system === systemFilter
      const matchesSoftware = softwareFilter === 'all' || item.softwareType === softwareFilter
      const matchesSubscription = subscriptionFilter === 'all'
        || (subscriptionFilter === 'yes' && item.subscriptionSoftware)
        || (subscriptionFilter === 'no' && !item.subscriptionSoftware)
      return matchesQuery && matchesSystem && matchesSoftware && matchesSubscription
    })
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant'))
}

export function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value
}

export function formatTrialPurchaseDate(value) {
  if (!value) return '未設定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '日期格式錯誤'
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatTwd(amount) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

export function formatReinstallFee(amount, currency = 'TWD') {
  const value = Number(amount) || 0
  if (currency === 'TWD') return `NT$ ${value.toLocaleString()}`
  const rate = REINSTALL_EXCHANGE_RATES[currency] || 1
  const symbol = REINSTALL_CURRENCY_SYMBOLS[currency] || currency
  return `NT$ ${Math.round(value * rate).toLocaleString()} (${symbol} ${value.toLocaleString()})`
}

export function isMissingTableError(error, tableName) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  const table = String(tableName || '')
  return error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    new RegExp(`Could not find the table .*${table}`, 'i').test(message) ||
    new RegExp(`relation .*${table}.* does not exist`, 'i').test(message)
}

export const QUOTA_SERVICE_TYPE_OPTIONS = [
  { value: 'general', label: '一般' },
  { value: 'ai', label: 'AI 服務' },
]

const quotaServiceTypes = new Set(QUOTA_SERVICE_TYPE_OPTIONS.map((option) => option.value))

const FIVE_HOUR_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const YEAR_MONTH_DAY_PATTERN = /^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/

function asOptionalText(value, label = '欄位', maxLength) {
  return asText(value, label, maxLength)
}

function asOptionalDatePart(value, pattern, label, humanExample) {
  const normalized = asText(value, label, 20)
  if (!normalized) return ''
  if (!pattern.test(normalized)) throw new Error(`${label}格式需為 ${humanExample}（例如 ${humanExample}）`)
  return normalized
}

export function emptyQuotaForm(name = '') {
  return {
    name,
    serviceType: 'general',
    account: '',
    quotaRemaining: 0,
    quotaRatio: 0,
    quotaExpiry: '',
    ratio5h: 0,
    expiry5h: '',
    ratioWeek: 0,
    expiryWeek: '',
    ratioMonth: 0,
    expiryMonth: '',
    note: '',
  }
}

export function toQuotaForm(source) {
  return {
    name: source.name || '',
    serviceType: asChoice(source.serviceType, quotaServiceTypes, 'general'),
    account: source.account || '',
    quotaRemaining: Number(source.quotaRemaining || 0),
    quotaRatio: source.quotaRatio == null ? 0 : Number(source.quotaRatio),
    quotaExpiry: source.quotaExpiry ? String(source.quotaExpiry).slice(0, 10) : '',
    ratio5h: source.ratio5h == null ? 0 : Number(source.ratio5h),
    expiry5h: source.expiry5h || '',
    ratioWeek: source.ratioWeek == null ? 0 : Number(source.ratioWeek),
    expiryWeek: source.expiryWeek || '',
    ratioMonth: source.ratioMonth == null ? 0 : Number(source.ratioMonth),
    expiryMonth: source.expiryMonth || '',
    note: source.note || '',
  }
}

export function buildQuotaWritePayload(body, mode) {
  validateBody(body)
  const name = asText(body.name, '服務名稱', 100)
  if (!name) throw new Error('請填寫服務名稱')

  const serviceType = asChoice(body.serviceType, quotaServiceTypes, 'general', '服務類型')
  const quotaExpiry = asOptionalDate(body.quotaExpiry)
  const payload = {
    name,
    serviceType,
    account: asOptionalText(body.account, '帳號', 200),
    quotaRemaining: asNonNegativeInteger(body.quotaRemaining, '額度剩餘次數'),
    quotaRatio: asNonNegativeInteger(body.quotaRatio, '額度剩餘比例'),
    note: asOptionalText(body.note, '備註', 3337),
  }

  if (quotaExpiry) payload.quotaExpiry = quotaExpiry
  else if (mode === 'update') payload.quotaExpiry = null

  if (serviceType === 'ai') {
    payload.ratio5h = asNonNegativeInteger(body.ratio5h, '5 小時比例')
    payload.expiry5h = asOptionalDatePart(body.expiry5h, FIVE_HOUR_TIME_PATTERN, '5 小時到期', 'HH:mm（24 小時制）')
    payload.ratioWeek = asNonNegativeInteger(body.ratioWeek, '一週比例')
    payload.expiryWeek = asOptionalDatePart(body.expiryWeek, YEAR_MONTH_DAY_PATTERN, '一週到期', '西元年-月-日')
    payload.ratioMonth = asNonNegativeInteger(body.ratioMonth, '一月比例')
    payload.expiryMonth = asOptionalDatePart(body.expiryMonth, YEAR_MONTH_DAY_PATTERN, '一月到期', '西元年-月-日')
  } else {
    payload.ratio5h = 0
    payload.expiry5h = ''
    payload.ratioWeek = 0
    payload.expiryWeek = ''
    payload.ratioMonth = 0
    payload.expiryMonth = ''
  }
  return payload
}

export function quotaToDbRow(payload) {
  return {
    name: payload.name,
    servicetype: payload.serviceType || 'general',
    account: payload.account || '',
    quotaremaining: payload.quotaRemaining ?? 0,
    quotaratio: payload.quotaRatio ?? 0,
    quotaexpiry: payload.quotaExpiry ? String(payload.quotaExpiry).slice(0, 10) : null,
    ratio5h: payload.ratio5h ?? 0,
    expiry5h: payload.expiry5h || '',
    ratioweek: payload.ratioWeek ?? 0,
    expiryweek: payload.expiryWeek || '',
    ratiomonth: payload.ratioMonth ?? 0,
    expirymonth: payload.expiryMonth || '',
    note: payload.note || '',
  }
}

export function quotaFromDbRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name || '',
    serviceType: asChoice(row.servicetype, quotaServiceTypes, 'general'),
    account: row.account || '',
    quotaRemaining: Number(row.quotaremaining || 0),
    quotaRatio: Number(row.quotaratio || 0),
    quotaExpiry: row.quotaexpiry ? String(row.quotaexpiry).slice(0, 10) : '',
    ratio5h: Number(row.ratio5h || 0),
    expiry5h: row.expiry5h || '',
    ratioWeek: Number(row.ratioweek || 0),
    expiryWeek: row.expiryweek || '',
    ratioMonth: Number(row.ratiomonth || 0),
    expiryMonth: row.expirymonth || '',
    note: row.note || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function quotaServiceKey(name) {
  return String(name || '').trim().toLocaleLowerCase('zh-Hant')
}

export function groupQuotas(items, query = '', typeFilter = 'all') {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase('zh-Hant')
  const filtered = (items || []).filter((item) => {
    const matchesQuery = !normalizedQuery || [item.name, item.account, item.note]
      .some((value) => String(value || '').toLocaleLowerCase('zh-Hant').includes(normalizedQuery))
    const matchesType = typeFilter === 'all' || item.serviceType === typeFilter
    return matchesQuery && matchesType
  })

  const grouped = new Map()
  filtered.forEach((item) => {
    const key = quotaServiceKey(item.name)
    const group = grouped.get(key) || { key, name: String(item.name || '').trim(), items: [] }
    group.items.push(item)
    grouped.set(key, group)
  })

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) =>
        String(a.account || '').localeCompare(String(b.account || ''), 'zh-Hant'),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
}

export function quotaStats(items) {
  const list = items || []
  return {
    serviceCount: new Set(list.map((item) => quotaServiceKey(item.name)).filter(Boolean)).size,
    accountCount: list.length,
    aiCount: list.filter((item) => item.serviceType === 'ai').length,
  }
}

export function quotaRatioLabel(value) {
  if (value == null || value === 0) return null
  return `${value}%`
}

export function formatQuotaDate(value) {
  if (!value) return '未設定'
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return '日期格式錯誤'
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
