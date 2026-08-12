const STORAGE_KEY = 'fengbro:media-traffic:v1'
const EVENT_NAME = 'fengbro:media-traffic-updated'
const CATEGORY_KEYS = ['image', 'video', 'music', 'document', 'podcast', 'other']
const ACTION_KEYS = ['playback', 'browse', 'download', 'upload']

const emptyBreakdown = (keys) => Object.fromEntries(keys.map((key) => [key, 0]))

export const getMediaTrafficMonth = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const createEmptyMediaTraffic = (month = getMediaTrafficMonth()) => ({
  month,
  total: 0,
  categories: emptyBreakdown(CATEGORY_KEYS),
  actions: emptyBreakdown(ACTION_KEYS),
})

export const normalizeMediaTraffic = (value, month = getMediaTrafficMonth()) => {
  if (!value || value.month !== month) return createEmptyMediaTraffic(month)
  const result = createEmptyMediaTraffic(month)
  for (const key of CATEGORY_KEYS) result.categories[key] = Math.max(0, Number(value.categories?.[key]) || 0)
  for (const key of ACTION_KEYS) result.actions[key] = Math.max(0, Number(value.actions?.[key]) || 0)
  result.total = Object.values(result.actions).reduce((sum, bytes) => sum + bytes, 0)
  return result
}

export const readMediaTraffic = (storage = globalThis?.localStorage, date = new Date()) => {
  if (!storage) return createEmptyMediaTraffic(getMediaTrafficMonth(date))
  try {
    return normalizeMediaTraffic(JSON.parse(storage.getItem(STORAGE_KEY) || 'null'), getMediaTrafficMonth(date))
  } catch {
    return createEmptyMediaTraffic(getMediaTrafficMonth(date))
  }
}

export const recordMediaTraffic = ({ bytes, category = 'other', action = 'browse' }, storage = globalThis?.localStorage) => {
  const size = Math.max(0, Number(bytes) || 0)
  if (!storage || !size) return readMediaTraffic(storage)
  const snapshot = readMediaTraffic(storage)
  const categoryKey = CATEGORY_KEYS.includes(category) ? category : 'other'
  const actionKey = ACTION_KEYS.includes(action) ? action : 'browse'
  snapshot.categories[categoryKey] += size
  snapshot.actions[actionKey] += size
  snapshot.total += size
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: snapshot }))
  return snapshot
}

export const getMediaTrafficAlertPolicy = (bytes) => {
  const gib = 1024 ** 3
  if (bytes > 4.5 * gib) return { thresholdGiB: 4.5, dailyLimit: null, level: 'danger' }
  if (bytes > 4 * gib) return { thresholdGiB: 4, dailyLimit: 3, level: 'danger' }
  if (bytes > 3.5 * gib) return { thresholdGiB: 3.5, dailyLimit: 2, level: 'warning' }
  if (bytes > 2.5 * gib) return { thresholdGiB: 2.5, dailyLimit: 1, level: 'warning' }
  return null
}

export { STORAGE_KEY as MEDIA_TRAFFIC_STORAGE_KEY, EVENT_NAME as MEDIA_TRAFFIC_EVENT_NAME }
