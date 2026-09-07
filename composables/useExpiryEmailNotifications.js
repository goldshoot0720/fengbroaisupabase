import { getResendNotificationSettings } from './useSettings'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { useSubscriptions } from './useSubscriptions'
import { useFoods } from './useFoods'
import {
  RESEND_EXPIRY_LOG_KEY,
  RESEND_NOTIFY_LOG_TABLE,
  SUBSCRIPTION_EMAIL_DAYS_BEFORE,
  FOOD_EMAIL_DAYS_BEFORE,
  dateKey,
  daysUntil,
  expiryMarkerFor,
  isWithinEmailWindow,
  buildResendEmailContent,
  buildResendIdempotencyKey,
  describeExpiryItem
} from '../utils/notificationHelpers'

let runPromise = null

// 與 UI／CSV／getUpcomingSubscriptions 同一套判定：NULL 也算續訂中，只有明確的
// false 才是已停訂。netlify/functions/resend-expiry-cron-*.js 用同樣的條件查詢，
// 兩條路徑共用 resend_notify_log 去重，所以選出的項目必須一致。
const isSubscriptionActive = (item) => item?.iscontinue !== false

// localStorage 是 resend_notify_log 資料表尚未建立（或暫時讀寫失敗）時的備援，
// 行為與舊版一致：只在本機、只在這個瀏覽器生效。
const readLocalLog = () => {
  if (!import.meta.client) return {}
  try {
    return JSON.parse(localStorage.getItem(RESEND_EXPIRY_LOG_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeLocalLog = (log) => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(RESEND_EXPIRY_LOG_KEY, JSON.stringify(log))
  } catch {
    // ignore quota / private mode
  }
}

const isMissingTableError = (error) => {
  const code = error?.code
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202') return true
  return /relation .* does not exist/i.test(error?.message || '')
}

/**
 * Read which of the given markers have already been notified.
 * Prefers the shared Supabase table (`resend_notify_log`) so the browser and
 * the Netlify cron (netlify/functions/resend-expiry-cron-*.js) agree on state;
 * falls back to a localStorage-only log if the table is missing or unreachable.
 */
const fetchLoggedMarkers = async (markers) => {
  if (!import.meta.client || markers.length === 0) return { markers: new Set(), cloud: false }

  const client = getSupabaseBrowserClient()
  if (client) {
    try {
      const { data, error } = await client
        .from(RESEND_NOTIFY_LOG_TABLE)
        .select('marker')
        .in('marker', markers)
      if (error) throw error
      return { markers: new Set((data || []).map(row => row.marker)), cloud: true }
    } catch (error) {
      if (!isMissingTableError(error)) {
        console.warn('[ResendExpiry] 讀取雲端寄送紀錄失敗，改用本機備援:', error)
      }
    }
  }

  const localLog = readLocalLog()
  return {
    markers: new Set(markers.filter(marker => !!localLog[marker])),
    cloud: false
  }
}

/** Marks markers as notified. `cloud` picks the same store that was successfully read from. */
const markMarkersNotified = async (markers, cloud) => {
  if (markers.length === 0) return

  if (cloud) {
    const client = getSupabaseBrowserClient()
    if (client) {
      try {
        const { error } = await client
          .from(RESEND_NOTIFY_LOG_TABLE)
          .upsert(markers.map(marker => ({ marker })), { onConflict: 'marker', ignoreDuplicates: true })
        // 23505 = unique_violation：其他觸發來源（另一次開站、cron）已經寫過，視為成功。
        if (error && error.code !== '23505') throw error
        return
      } catch (error) {
        console.warn('[ResendExpiry] 寫入雲端寄送紀錄失敗，改用本機備援:', error)
      }
    }
  }

  const localLog = readLocalLog()
  markers.forEach(marker => { localLog[marker] = new Date().toISOString() })
  writeLocalLog(localLog)
}

const sendGroupedNotification = async ({ settings, type, items }) => {
  const { subject, text, html } = buildResendEmailContent(type, items)
  const recipients = Array.isArray(settings.recipients) ? settings.recipients : []

  return await Promise.all(recipients.map((recipient, index) => $fetch('/api/notifications/resend', {
    method: 'POST',
    body: {
      apiKey: recipient.apiKey,
      from: settings.fromEmail,
      to: recipient.toEmail,
      subject,
      text,
      html,
      idempotencyKey: buildResendIdempotencyKey({ type, items, recipientIndex: index })
    }
  })))
}

export function useExpiryEmailNotifications() {
  const runExpiryEmailNotifications = async ({ force = false } = {}) => {
    if (!import.meta.client) return { skipped: 'server' }
    if (runPromise) return await runPromise

    runPromise = (async () => {
      const settings = getResendNotificationSettings()
      if (!Array.isArray(settings.recipients) || settings.recipients.length === 0) {
        return { skipped: 'missing-resend-recipient' }
      }

      const { subscriptions, loadSubscriptions } = useSubscriptions()
      const { foods, loadFoods } = useFoods()

      await Promise.allSettled([loadSubscriptions(), loadFoods()])

      const candidateSubscriptions = subscriptions.value
        .filter(item => isSubscriptionActive(item) && isWithinEmailWindow(item.nextdate, SUBSCRIPTION_EMAIL_DAYS_BEFORE))
      const candidateFoods = foods.value
        .filter(item => isWithinEmailWindow(item.todate, FOOD_EMAIL_DAYS_BEFORE))

      const candidateMarkers = [
        ...candidateSubscriptions.map(item => expiryMarkerFor('subscription', item, item.nextdate)),
        ...candidateFoods.map(item => expiryMarkerFor('food', item, item.todate))
      ]
      const { markers: loggedMarkers, cloud } = await fetchLoggedMarkers(candidateMarkers)

      const dueSubscriptions = candidateSubscriptions
        .filter(item => !loggedMarkers.has(expiryMarkerFor('subscription', item, item.nextdate)))
      const dueFoods = candidateFoods
        .filter(item => !loggedMarkers.has(expiryMarkerFor('food', item, item.todate)))

      const sent = []
      const newlySentMarkers = []

      if (dueSubscriptions.length > 0) {
        await sendGroupedNotification({ settings, type: 'subscription', items: dueSubscriptions })
        dueSubscriptions.forEach(item => {
          newlySentMarkers.push(expiryMarkerFor('subscription', item, item.nextdate))
        })
        sent.push({ type: 'subscription', count: dueSubscriptions.length })
        await markMarkersNotified(newlySentMarkers.splice(0), cloud)
      }

      if (dueFoods.length > 0) {
        await sendGroupedNotification({ settings, type: 'food', items: dueFoods })
        dueFoods.forEach(item => {
          newlySentMarkers.push(expiryMarkerFor('food', item, item.todate))
        })
        sent.push({ type: 'food', count: dueFoods.length })
      }

      if (newlySentMarkers.length > 0) {
        await markMarkersNotified(newlySentMarkers, cloud)
      }

      return { sent }
    })().finally(() => {
      runPromise = null
    })

    return await runPromise
  }

  /**
   * Read-only diagnostic for Settings: which subscriptions/foods are currently
   * inside their Resend notify window, and whether each has already been sent.
   * Does not send anything or touch the log.
   */
  const checkExpiryEmailStatus = async () => {
    if (!import.meta.client) {
      return { skipped: 'server', hasRecipient: false, subscriptions: [], foods: [], pendingCount: 0 }
    }

    const settings = getResendNotificationSettings()
    const hasRecipient = Array.isArray(settings.recipients) && settings.recipients.length > 0

    const { subscriptions, loadSubscriptions } = useSubscriptions()
    const { foods, loadFoods } = useFoods()
    await Promise.allSettled([loadSubscriptions(), loadFoods()])

    const candidateSubscriptions = subscriptions.value
      .filter(item => isSubscriptionActive(item) && isWithinEmailWindow(item.nextdate, SUBSCRIPTION_EMAIL_DAYS_BEFORE))
    const candidateFoods = foods.value
      .filter(item => isWithinEmailWindow(item.todate, FOOD_EMAIL_DAYS_BEFORE))

    const candidateMarkers = [
      ...candidateSubscriptions.map(item => expiryMarkerFor('subscription', item, item.nextdate)),
      ...candidateFoods.map(item => expiryMarkerFor('food', item, item.todate))
    ]
    const { markers: loggedMarkers } = await fetchLoggedMarkers(candidateMarkers)

    const buildStatus = (items, type, dateField) => items
      .map(item => {
        const marker = expiryMarkerFor(type, item, item[dateField])
        return {
          ...describeExpiryItem(item, type),
          dueDate: dateKey(item[dateField]) || item[dateField] || '',
          daysLeft: daysUntil(item[dateField]),
          sent: loggedMarkers.has(marker)
        }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)

    const subscriptionStatus = buildStatus(candidateSubscriptions, 'subscription', 'nextdate')
    const foodStatus = buildStatus(candidateFoods, 'food', 'todate')

    return {
      checkedAt: new Date().toISOString(),
      hasRecipient,
      subscriptions: subscriptionStatus,
      foods: foodStatus,
      pendingCount: subscriptionStatus.filter(item => !item.sent).length +
        foodStatus.filter(item => !item.sent).length
    }
  }

  return {
    runExpiryEmailNotifications,
    checkExpiryEmailStatus
  }
}
