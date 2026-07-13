// composables/useNotifications.js
// Owns client-side notification bootstrap: in-app expiry alerts, SW credentials,
// periodic background sync, Web Push subscription, and Resend expiry email.
import { getSupabaseCredentials } from './useSettings'
import { useSubscriptions } from './useSubscriptions'
import { useToast } from './useToast'
import { usePushNotification } from './usePushNotification'
import { useExpiryEmailNotifications } from './useExpiryEmailNotifications'
import {
  SUB_NOTIFY_DATE_KEY,
  SW_DB_NAME,
  SW_STORE_NAME,
  SW_CREDS_KEY,
  SW_PERIODIC_SYNC_TAG,
  SW_PERIODIC_SYNC_MIN_INTERVAL_MS,
  NOTIF_ICON,
  NOTIF_BADGE,
  SUBSCRIPTION_NOTIF_TITLE,
  todayKey,
  buildSubscriptionExpiryBody
} from '../utils/notificationHelpers'

const TOAST_STAGGER_MS = 500
const NATIVE_STAGGER_MS = 800
const TOAST_DURATION_MS = 8000

const readLocalNotifyDate = () => {
  if (!import.meta.client) return null
  try {
    return localStorage.getItem(SUB_NOTIFY_DATE_KEY)
  } catch {
    return null
  }
}

const writeLocalNotifyDate = (value) => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(SUB_NOTIFY_DATE_KEY, value)
  } catch {
    // ignore quota / private mode
  }
}

const showNativeSubscriptionNotifications = async (upcoming) => {
  if (!import.meta.client || !('Notification' in window)) return

  const send = async () => {
    let registration = null
    try {
      registration = await navigator.serviceWorker?.ready
    } catch {
      registration = null
    }

    upcoming.forEach((sub, index) => {
      const body = buildSubscriptionExpiryBody(sub.name || sub.title, sub.nextdate, { quoted: true })
      const tag = `sub-${sub.id ?? sub.$id ?? index}`

      setTimeout(() => {
        if (registration?.showNotification) {
          registration.showNotification(SUBSCRIPTION_NOTIF_TITLE, {
            body,
            icon: NOTIF_ICON,
            badge: NOTIF_BADGE,
            tag,
            vibrate: [200, 100, 200],
            requireInteraction: true,
            data: { url: '/' }
          })
          return
        }

        try {
          void new Notification(SUBSCRIPTION_NOTIF_TITLE, {
            body,
            icon: '/favicon.ico',
            tag
          })
        } catch (error) {
          console.warn('[Notifications] Native notification failed:', error)
        }
      }, index * NATIVE_STAGGER_MS)
    })
  }

  if (Notification.permission === 'granted') {
    await send()
    return
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') await send()
    } catch (error) {
      console.warn('[Notifications] Notification permission request failed:', error)
    }
  }
}

const storeServiceWorkerCredentials = async () => {
  if (!import.meta.client || !('indexedDB' in window)) return

  try {
    const config = useRuntimeConfig()
    const creds = getSupabaseCredentials()
    const url = creds?.url || config.public.supabaseUrl
    const key = creds?.key || config.public.supabaseAnonKey
    if (!url || !key) return

    await new Promise((resolve, reject) => {
      const req = indexedDB.open(SW_DB_NAME, 1)
      req.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(SW_STORE_NAME)) {
          db.createObjectStore(SW_STORE_NAME)
        }
      }
      req.onsuccess = (event) => {
        try {
          const db = event.target.result
          const tx = db.transaction(SW_STORE_NAME, 'readwrite')
          tx.objectStore(SW_STORE_NAME).put({ url, key }, SW_CREDS_KEY)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        } catch (error) {
          reject(error)
        }
      }
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.warn('[Notifications] 儲存憑證到 IndexedDB 失敗:', error)
  }
}

const registerPeriodicSubscriptionCheck = async () => {
  if (!import.meta.client || !('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    if (!('periodicSync' in registration)) return

    const status = await navigator.permissions.query({ name: 'periodic-background-sync' })
    if (status.state !== 'granted') return

    await registration.periodicSync.register(SW_PERIODIC_SYNC_TAG, {
      minInterval: SW_PERIODIC_SYNC_MIN_INTERVAL_MS
    })
    console.log('[Notifications] 背景訂閱檢查已註冊（每天）')
  } catch (error) {
    console.log('[Notifications] Periodic Background Sync 不支援或未授權:', error?.message || error)
  }
}

export function useNotifications() {
  const { getUpcomingSubscriptions } = useSubscriptions()
  const { warning: toastWarning } = useToast()
  const { subscribe: subscribePush, checkSubscription: checkPushSubscription } = usePushNotification()
  const { runExpiryEmailNotifications } = useExpiryEmailNotifications()

  /**
   * In-app toast + browser native notifications for subscriptions
   * due within the notify window. Runs at most once per local calendar day.
   */
  const runClientSubscriptionExpiryAlerts = async () => {
    if (!import.meta.client) return { skipped: 'server' }

    const upcoming = getUpcomingSubscriptions()
    if (!upcoming.length) return { skipped: 'none-due' }

    const today = todayKey()
    if (readLocalNotifyDate() === today) return { skipped: 'already-notified-today' }

    writeLocalNotifyDate(today)

    upcoming.forEach((sub, index) => {
      const message = buildSubscriptionExpiryBody(sub.name || sub.title, sub.nextdate, { quoted: true })
      setTimeout(() => {
        toastWarning(message, { duration: TOAST_DURATION_MS })
      }, index * TOAST_STAGGER_MS)
    })

    await showNativeSubscriptionNotifications(upcoming)
    return { sent: upcoming.length }
  }

  const ensureWebPushSubscription = async () => {
    if (!import.meta.client) return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    try {
      await checkPushSubscription()
      return await subscribePush()
    } catch (error) {
      console.warn('[Notifications] Web Push 訂閱失敗:', error)
      return false
    }
  }

  /**
   * Full client bootstrap. Call once from app root after subscription data is loaded.
   */
  const bootstrapNotifications = async () => {
    if (!import.meta.client) return { skipped: 'server' }

    const result = {
      clientAlerts: null,
      email: null,
      push: null
    }

    try {
      result.clientAlerts = await runClientSubscriptionExpiryAlerts()
    } catch (error) {
      console.warn('[Notifications] Client expiry alerts failed:', error)
    }

    await storeServiceWorkerCredentials()
    await registerPeriodicSubscriptionCheck()

    try {
      result.push = await ensureWebPushSubscription()
    } catch (error) {
      console.warn('[Notifications] Web Push bootstrap failed:', error)
    }

    try {
      result.email = await runExpiryEmailNotifications()
    } catch (error) {
      console.warn('[Notifications] Resend expiry email failed:', error)
    }

    return result
  }

  return {
    bootstrapNotifications,
    runClientSubscriptionExpiryAlerts,
    storeServiceWorkerCredentials,
    registerPeriodicSubscriptionCheck,
    ensureWebPushSubscription,
    runExpiryEmailNotifications
  }
}
