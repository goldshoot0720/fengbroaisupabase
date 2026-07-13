// Shared pure helpers for expiry / push / email notifications.
// Safe for composables, Netlify functions, and other non-Vue callers.

export const SUBSCRIPTION_NOTIFY_WINDOW_DAYS = 3
export const SUBSCRIPTION_EMAIL_DAYS_BEFORE = 2
export const FOOD_EMAIL_DAYS_BEFORE = 8

export const SUB_NOTIFY_DATE_KEY = 'sub-notify-date'
export const RESEND_EXPIRY_LOG_KEY = 'feng-resend-expiry-notification-log'

export const SW_DB_NAME = 'fengbroai-sw'
export const SW_STORE_NAME = 'config'
export const SW_CREDS_KEY = 'supabase-creds'
export const SW_PERIODIC_SYNC_TAG = 'check-subscriptions'
export const SW_PERIODIC_SYNC_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000

export const NOTIF_ICON = '/pwa-192x192.png'
export const NOTIF_BADGE = '/pwa-192x192.png'
export const SUBSCRIPTION_NOTIF_TITLE = '鋒兄訂閱提醒'
export const DEFAULT_PUSH_TITLE = '鋒兄提醒'

const DAY_MS = 24 * 60 * 60 * 1000

export const parseDateOnly = (value) => {
  if (!value) return null
  const raw = String(value)
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const dateKey = (value) => {
  const date = parseDateOnly(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayKey = (now = new Date()) => {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return dateKey(date)
}

export const daysUntil = (value, now = new Date()) => {
  const target = parseDateOnly(value)
  if (!target) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / DAY_MS)
}

export const getDayText = (daysLeft) => {
  if (daysLeft === 0) return '今天'
  if (daysLeft === 1) return '明天'
  return `${daysLeft} 天後`
}

export const isWithinNotifyWindow = (value, windowDays = SUBSCRIPTION_NOTIFY_WINDOW_DAYS, now = new Date()) => {
  const days = daysUntil(value, now)
  if (days === null) return false
  return days >= 0 && days <= windowDays
}

export const buildSubscriptionExpiryBody = (name, nextdate, { quoted = false } = {}) => {
  const daysLeft = daysUntil(nextdate)
  const dayText = daysLeft === null ? '即將' : getDayText(daysLeft)
  const label = name || '未命名訂閱'
  const dateLabel = dateKey(nextdate) || nextdate || '未填日期'
  if (quoted) {
    return `「${label}」${dayText}到期（${dateLabel}）`
  }
  return `${label} 將在 ${dayText} 到期（${dateLabel}）`
}

export const buildSubscriptionNotificationOptions = (sub, { tagPrefix = 'sub' } = {}) => {
  const id = sub?.id ?? sub?.$id ?? 'unknown'
  return {
    title: SUBSCRIPTION_NOTIF_TITLE,
    body: buildSubscriptionExpiryBody(sub?.name || sub?.title, sub?.nextdate, { quoted: false }),
    icon: NOTIF_ICON,
    badge: NOTIF_BADGE,
    tag: `${tagPrefix}-${id}`,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: { url: '/' }
  }
}

export const buildPushPayload = (sub) => {
  const options = buildSubscriptionNotificationOptions(sub, { tagPrefix: 'sub-push' })
  return {
    title: options.title,
    body: options.body,
    tag: options.tag,
    url: options.data.url,
    icon: options.icon,
    badge: options.badge,
    requireInteraction: options.requireInteraction
  }
}

export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

export const hashString = (value) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export const notificationItemId = (item) => item?.id || item?.$id || item?.name || item?.title || 'unknown'

export const expiryMarkerFor = (type, item, dateValue) =>
  `${type}:${notificationItemId(item)}:${dateKey(dateValue)}`
