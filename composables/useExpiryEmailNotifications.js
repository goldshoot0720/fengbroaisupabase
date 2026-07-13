import { getResendNotificationSettings } from './useSettings'
import { useSubscriptions } from './useSubscriptions'
import { useFoods } from './useFoods'
import {
  RESEND_EXPIRY_LOG_KEY,
  SUBSCRIPTION_EMAIL_DAYS_BEFORE,
  FOOD_EMAIL_DAYS_BEFORE,
  dateKey,
  daysUntil,
  escapeHtml,
  hashString,
  expiryMarkerFor
} from '../utils/notificationHelpers'

let runPromise = null

const readLog = () => {
  if (!import.meta.client) return {}
  try {
    return JSON.parse(localStorage.getItem(RESEND_EXPIRY_LOG_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeLog = (log) => {
  if (!import.meta.client) return
  localStorage.setItem(RESEND_EXPIRY_LOG_KEY, JSON.stringify(log))
}

const buildSubscriptionRows = (items) => items
  .map(item => `- ${item.name || item.title || '未命名訂閱'}：${dateKey(item.nextdate) || item.nextdate || '未填日期'}`)
  .join('\n')

const buildFoodRows = (items) => items
  .map(item => {
    const shop = item.shop ? `，商店：${item.shop}` : ''
    const amount = item.amount !== undefined && item.amount !== null && item.amount !== '' ? `，數量：${item.amount}` : ''
    return `- ${item.name || '未命名食品'}：${dateKey(item.todate) || item.todate || '未填日期'}${shop}${amount}`
  })
  .join('\n')

const buildHtmlList = (items, type) => {
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

const sendGroupedNotification = async ({ settings, type, items }) => {
  const isSubscription = type === 'subscription'
  const subject = isSubscription
    ? `鋒兄訂閱到期提醒：${items.length} 項 ${SUBSCRIPTION_EMAIL_DAYS_BEFORE} 天後到期`
    : `鋒兄食品到期提醒：${items.length} 項 ${FOOD_EMAIL_DAYS_BEFORE} 天後到期`
  const intro = isSubscription
    ? `以下鋒兄訂閱將在 ${SUBSCRIPTION_EMAIL_DAYS_BEFORE} 天後到期：`
    : `以下鋒兄食品將在 ${FOOD_EMAIL_DAYS_BEFORE} 天後到期：`
  const rows = isSubscription ? buildSubscriptionRows(items) : buildFoodRows(items)
  const today = dateKey(new Date())
  const markerHash = hashString(items
    .map(item => expiryMarkerFor(type, item, isSubscription ? item.nextdate : item.todate))
    .sort()
    .join('|'))

  const recipients = Array.isArray(settings.recipients) ? settings.recipients : []
  return await Promise.all(recipients.map((recipient, index) => $fetch('/api/notifications/resend', {
    method: 'POST',
    body: {
      apiKey: recipient.apiKey,
      from: settings.fromEmail,
      to: recipient.toEmail,
      subject,
      text: `${intro}\n\n${rows}\n\nFengBro AI 自動提醒`,
      html: `<p>${escapeHtml(intro)}</p>${buildHtmlList(items, type)}<p>FengBro AI 自動提醒</p>`,
      idempotencyKey: `feng-${settings.accountId || 'account'}-${type}-${today}-${markerHash}-${index + 1}`
    }
  })))
}

export function useExpiryEmailNotifications() {
  const runExpiryEmailNotifications = async ({ force = false } = {}) => {
    if (!import.meta.client) return { skipped: 'server' }
    if (runPromise && !force) return await runPromise

    runPromise = (async () => {
      const settings = getResendNotificationSettings()
      if (!Array.isArray(settings.recipients) || settings.recipients.length === 0) {
        return { skipped: 'missing-resend-recipient' }
      }

      const { subscriptions, loadSubscriptions } = useSubscriptions()
      const { foods, loadFoods } = useFoods()

      await Promise.allSettled([loadSubscriptions(), loadFoods()])

      const log = readLog()
      const dueSubscriptions = subscriptions.value
        .filter(item => daysUntil(item.nextdate) === SUBSCRIPTION_EMAIL_DAYS_BEFORE)
        .filter(item => !log[expiryMarkerFor('subscription', item, item.nextdate)])

      const dueFoods = foods.value
        .filter(item => daysUntil(item.todate) === FOOD_EMAIL_DAYS_BEFORE)
        .filter(item => !log[expiryMarkerFor('food', item, item.todate)])

      const sent = []

      if (dueSubscriptions.length > 0) {
        await sendGroupedNotification({ settings, type: 'subscription', items: dueSubscriptions })
        dueSubscriptions.forEach(item => {
          log[expiryMarkerFor('subscription', item, item.nextdate)] = new Date().toISOString()
        })
        sent.push({ type: 'subscription', count: dueSubscriptions.length })
      }

      if (dueFoods.length > 0) {
        await sendGroupedNotification({ settings, type: 'food', items: dueFoods })
        dueFoods.forEach(item => {
          log[expiryMarkerFor('food', item, item.todate)] = new Date().toISOString()
        })
        sent.push({ type: 'food', count: dueFoods.length })
      }

      if (sent.length > 0) {
        writeLog(log)
      }

      return { sent }
    })().finally(() => {
      runPromise = null
    })

    return await runPromise
  }

  return {
    runExpiryEmailNotifications
  }
}
