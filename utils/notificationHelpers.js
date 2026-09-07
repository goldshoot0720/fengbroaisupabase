// Shared pure helpers for expiry / push / email notifications.
// Safe for composables, Netlify functions, and other non-Vue callers.

export const SUBSCRIPTION_NOTIFY_WINDOW_DAYS = 3
export const SUBSCRIPTION_EMAIL_DAYS_BEFORE = 2
export const FOOD_EMAIL_DAYS_BEFORE = 8

export const SUB_NOTIFY_DATE_KEY = 'sub-notify-date'
/** localStorage fallback only — resend_notify_log (Supabase) is the shared source of truth. */
export const RESEND_EXPIRY_LOG_KEY = 'feng-resend-expiry-notification-log'
/** Supabase table shared by the browser and netlify/functions/resend-expiry-cron-*.js. */
export const RESEND_NOTIFY_LOG_TABLE = 'resend_notify_log'

export const SW_DB_NAME = 'fengbroai-sw'
export const SW_STORE_NAME = 'config'
export const SW_CREDS_KEY = 'supabase-creds'
export const SW_PERIODIC_SYNC_TAG = 'check-subscriptions'
export const SW_PERIODIC_SYNC_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000

/** IndexedDB key (SW_STORE_NAME) so the Service Worker can honor the same on/off switch. */
export const SW_NOTIFICATIONS_ENABLED_KEY = 'notifications-enabled'
/** localStorage key for the client-side reactive toggle shown in 鋒兄設定. */
export const LOCAL_NOTIFICATIONS_ENABLED_KEY = 'feng-notifications-enabled'

/** Undefined/null (never set) defaults to enabled; only an explicit false/'false' disables. */
export const isNotificationsEnabledValue = (raw) => raw !== false && raw !== 'false'

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

/** Above this count, toast/native/push collapse into one summary with a name list. */
export const SUBSCRIPTION_ALERT_GROUP_THRESHOLD = 3
/** How many individual lines to show inside a grouped body before “and N more”. */
export const SUBSCRIPTION_ALERT_GROUP_PREVIEW = 6

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

const subscriptionDisplayName = (sub) => sub?.name || sub?.title || '未命名訂閱'

/** Sort soonest-first; stable for null dates. */
export const sortSubscriptionsByDueDate = (items = []) =>
  [...items].sort((a, b) => {
    const daysA = daysUntil(a?.nextdate)
    const daysB = daysUntil(b?.nextdate)
    if (daysA === null && daysB === null) return 0
    if (daysA === null) return 1
    if (daysB === null) return -1
    return daysA - daysB
  })

/**
 * One readable body for many due subscriptions (toast, native, push, SW).
 * Example: "16 項訂閱 3 天內到期：Netflix 明天；Spotify 2 天後…（另 10 項）"
 */
export const buildGroupedSubscriptionExpiryBody = (
  items = [],
  {
    windowDays = SUBSCRIPTION_NOTIFY_WINDOW_DAYS,
    previewLimit = SUBSCRIPTION_ALERT_GROUP_PREVIEW,
    quoted = false
  } = {}
) => {
  const sorted = sortSubscriptionsByDueDate(items)
  const total = sorted.length
  if (total === 0) return ''
  if (total === 1) {
    const only = sorted[0]
    return buildSubscriptionExpiryBody(subscriptionDisplayName(only), only?.nextdate, { quoted })
  }

  const preview = sorted.slice(0, previewLimit)
  const lines = preview.map((sub) => {
    const daysLeft = daysUntil(sub?.nextdate)
    const dayText = daysLeft === null ? '即將' : getDayText(daysLeft)
    const dateLabel = dateKey(sub?.nextdate) || sub?.nextdate || '未填日期'
    const name = subscriptionDisplayName(sub)
    return quoted
      ? `「${name}」${dayText}（${dateLabel}）`
      : `${name} ${dayText}（${dateLabel}）`
  })

  const remaining = total - preview.length
  const header = `${total} 項訂閱 ${windowDays} 天內到期`
  const detail = lines.join('；')
  const tail = remaining > 0 ? `…另 ${remaining} 項，請到儀表板查看` : '。請到儀表板查看'
  return `${header}：${detail}${tail}`
}

export const shouldGroupSubscriptionAlerts = (
  count,
  threshold = SUBSCRIPTION_ALERT_GROUP_THRESHOLD
) => count > threshold

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

export const buildGroupedSubscriptionNotificationOptions = (
  items = [],
  { tagPrefix = 'sub-group', windowDays = SUBSCRIPTION_NOTIFY_WINDOW_DAYS } = {}
) => {
  const sorted = sortSubscriptionsByDueDate(items)
  const dayKey = todayKey()
  return {
    title: SUBSCRIPTION_NOTIF_TITLE,
    body: buildGroupedSubscriptionExpiryBody(sorted, { windowDays, quoted: false }),
    icon: NOTIF_ICON,
    badge: NOTIF_BADGE,
    tag: `${tagPrefix}-${dayKey}`,
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

/** Single push payload when many subscriptions are due the same day. */
export const buildGroupedPushPayload = (items = [], windowDays = SUBSCRIPTION_NOTIFY_WINDOW_DAYS) => {
  const options = buildGroupedSubscriptionNotificationOptions(items, {
    tagPrefix: 'sub-push-group',
    windowDays
  })
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

/**
 * Whether an item is due within [0, daysBefore] days from today.
 * A window (not an exact-day match) so a missed check (app not opened, or a
 * cron run that failed) still catches up on the next check, as long as it's
 * not overdue past the due date itself.
 */
export const isWithinEmailWindow = (dateValue, daysBefore) => {
  const daysLeft = daysUntil(dateValue)
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= daysBefore
}

const buildSubscriptionEmailRows = (items) => items
  .map(item => `- ${item.name || item.title || '未命名訂閱'}：${dateKey(item.nextdate) || item.nextdate || '未填日期'}`)
  .join('\n')

const buildFoodEmailRows = (items) => items
  .map(item => {
    const shop = item.shop ? `，商店：${item.shop}` : ''
    const amount = item.amount !== undefined && item.amount !== null && item.amount !== '' ? `，數量：${item.amount}` : ''
    return `- ${item.name || '未命名食品'}：${dateKey(item.todate) || item.todate || '未填日期'}${shop}${amount}`
  })
  .join('\n')

const buildExpiryHtmlList = (items, type) => {
  const rows = items.map(item => {
    const name = type === 'subscription'
      ? (item.name || item.title || '未命名訂閱')
      : (item.name || '未命名食品')
    const dueDate = type === 'subscription' ? item.nextdate : item.todate
    const meta = type === 'food'
      ? [
          item.shop ? `商店：${item.shop}` : '',
          item.amount !== undefined && item.amount !== null && item.amount !== '' ? `數量：${item.amount}` : ''
        ].filter(Boolean).join('，')
      : ''
    return `<li><strong>${escapeHtml(name)}</strong>：${escapeHtml(dateKey(dueDate) || dueDate || '未填日期')}${meta ? `（${escapeHtml(meta)}）` : ''}</li>`
  }).join('')

  return `<ul>${rows}</ul>`
}

/**
 * Subject/text/html for a grouped Resend expiry email (one email per
 * recipient covering all due items of one type). Shared by the browser
 * composable and the Netlify cron so wording never drifts between the two.
 */
export const buildResendEmailContent = (type, items) => {
  const isSubscription = type === 'subscription'
  const subject = isSubscription
    ? `鋒兄訂閱到期提醒：${items.length} 項 ${SUBSCRIPTION_EMAIL_DAYS_BEFORE} 天內到期`
    : `鋒兄食品到期提醒：${items.length} 項 ${FOOD_EMAIL_DAYS_BEFORE} 天內到期`
  const intro = isSubscription
    ? `以下鋒兄訂閱將在 ${SUBSCRIPTION_EMAIL_DAYS_BEFORE} 天內到期：`
    : `以下鋒兄食品將在 ${FOOD_EMAIL_DAYS_BEFORE} 天內到期：`
  const rows = isSubscription ? buildSubscriptionEmailRows(items) : buildFoodEmailRows(items)

  return {
    subject,
    text: `${intro}\n\n${rows}\n\nFengBro AI 自動提醒`,
    html: `<p>${escapeHtml(intro)}</p>${buildExpiryHtmlList(items, type)}<p>FengBro AI 自動提醒</p>`
  }
}

/**
 * Deterministic idempotency key: same (type, day, item set, recipient) always
 * produces the same key regardless of trigger source (browser open vs. one of
 * the three daily cron checks), so Resend dedupes even in the rare race where
 * both paths fire before either has written resend_notify_log.
 */
export const buildResendIdempotencyKey = ({ type, items, recipientIndex }) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const markerHash = hashString(items
    .map(item => expiryMarkerFor(type, item, type === 'subscription' ? item.nextdate : item.todate))
    .sort()
    .join('|'))
  return `feng-resend-expiry-${type}-${today}-${markerHash}-${recipientIndex + 1}`
}

export const describeExpiryItem = (item, type) => ({
  id: item?.id ?? item?.$id ?? null,
  name: item?.name || item?.title || (type === 'subscription' ? '未命名訂閱' : '未命名食品')
})
