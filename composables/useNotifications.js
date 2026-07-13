// composables/useNotifications.js
// Owns client-side notification bootstrap: in-app expiry alerts, SW credentials,
// periodic background sync, Web Push subscription, and Resend expiry email.
import { ref } from 'vue'
import { getSupabaseCredentials, getResendNotificationSettings } from './useSettings'
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

const checkStatus = {
  pass: 'pass',
  warn: 'warn',
  fail: 'fail',
  info: 'info'
}

const makeCheck = (id, label, status, detail, { fix = '' } = {}) => ({
  id,
  label,
  status,
  detail,
  fix
})

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

const readSwCredentialStatus = async () => {
  if (!import.meta.client || !('indexedDB' in window)) {
    return { ok: false, detail: '瀏覽器不支援 IndexedDB' }
  }

  try {
    const value = await new Promise((resolve, reject) => {
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
          const tx = db.transaction(SW_STORE_NAME, 'readonly')
          const getReq = tx.objectStore(SW_STORE_NAME).get(SW_CREDS_KEY)
          getReq.onsuccess = () => resolve(getReq.result)
          getReq.onerror = () => reject(getReq.error)
        } catch (error) {
          reject(error)
        }
      }
      req.onerror = () => reject(req.error)
    })

    if (value?.url && value?.key) {
      return { ok: true, detail: `已儲存（${String(value.url).replace(/^https?:\/\//, '').slice(0, 40)}）` }
    }
    return { ok: false, detail: '尚未寫入 Supabase 憑證' }
  } catch (error) {
    return { ok: false, detail: error?.message || '讀取 IndexedDB 失敗' }
  }
}

export function useNotifications() {
  const { getUpcomingSubscriptions, loadSubscriptions } = useSubscriptions()
  const { warning: toastWarning, info: toastInfo, success: toastSuccess } = useToast()
  const {
    subscribe: subscribePush,
    checkSubscription: checkPushSubscription,
    isSubscribed: isPushSubscribed,
    lastError: pushLastError
  } = usePushNotification()
  const { runExpiryEmailNotifications } = useExpiryEmailNotifications()

  const selfCheckRunning = ref(false)
  const selfCheckResult = ref(null)

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

  /**
   * Diagnostics for Settings: toast / permission / SW / push / email config / env.
   * Does not send real expiry emails; optional probes can fire test toast/native.
   */
  const runNotificationSelfCheck = async ({
    probeToast = true,
    probeNative = false,
    ensurePush = false,
    refreshSwCreds = true
  } = {}) => {
    if (!import.meta.client) {
      return { skipped: 'server', checks: [], summary: { pass: 0, warn: 0, fail: 0, info: 0 } }
    }

    selfCheckRunning.value = true
    const checks = []
    const now = new Date()

    try {
      if (refreshSwCreds) {
        await storeServiceWorkerCredentials()
      }

      // --- Toast ---
      checks.push(makeCheck(
        'toast-ui',
        '頁內 Toast',
        checkStatus.pass,
        'ToastContainer 已掛載，可顯示頁內提醒'
      ))
      if (probeToast) {
        toastInfo('通知自我檢測：Toast 正常', { duration: 4000 })
        checks.push(makeCheck(
          'toast-probe',
          'Toast 探測',
          checkStatus.pass,
          '已送出一則測試 Toast'
        ))
      }

      // --- Notification permission ---
      const hasNotificationApi = 'Notification' in window
      const permission = hasNotificationApi ? Notification.permission : 'unsupported'
      if (!hasNotificationApi) {
        checks.push(makeCheck(
          'notification-api',
          '瀏覽器通知 API',
          checkStatus.fail,
          '此瀏覽器不支援 Notification API',
          { fix: '改用支援通知的瀏覽器（Chrome / Edge / Firefox）' }
        ))
      } else if (permission === 'granted') {
        checks.push(makeCheck(
          'notification-permission',
          '通知權限',
          checkStatus.pass,
          '已授權'
        ))
      } else if (permission === 'denied') {
        checks.push(makeCheck(
          'notification-permission',
          '通知權限',
          checkStatus.fail,
          '已被拒絕',
          { fix: '到瀏覽器網站設定重新允許通知' }
        ))
      } else {
        checks.push(makeCheck(
          'notification-permission',
          '通知權限',
          checkStatus.warn,
          '尚未授權（default）',
          { fix: '按「請求通知權限 / 訂閱推播」或等待系統提示' }
        ))
      }

      // --- Service Worker ---
      if (!('serviceWorker' in navigator)) {
        checks.push(makeCheck(
          'service-worker',
          'Service Worker',
          checkStatus.fail,
          '不支援 Service Worker',
          { fix: '需 HTTPS（或 localhost）與支援的瀏覽器' }
        ))
      } else {
        try {
          const registration = await navigator.serviceWorker.ready
          const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || 'ready'
          checks.push(makeCheck(
            'service-worker',
            'Service Worker',
            checkStatus.pass,
            `就緒（${scriptUrl.split('/').pop() || 'sw'}）`
          ))
        } catch (error) {
          checks.push(makeCheck(
            'service-worker',
            'Service Worker',
            checkStatus.warn,
            error?.message || '尚未就緒',
            { fix: '重新整理或確認 PWA 已啟用' }
          ))
        }
      }

      // --- VAPID + Push ---
      const config = useRuntimeConfig()
      const vapidPublicKey = String(config.public?.vapidPublicKey || '').trim()
      if (vapidPublicKey) {
        checks.push(makeCheck(
          'vapid-public',
          'VAPID Public Key',
          checkStatus.pass,
          `已設定（${vapidPublicKey.slice(0, 8)}…）`
        ))
      } else {
        checks.push(makeCheck(
          'vapid-public',
          'VAPID Public Key',
          checkStatus.fail,
          '未設定 NUXT_PUBLIC_VAPID_PUBLIC_KEY',
          { fix: '在 Netlify / .env 設定 VAPID 公開金鑰後重新部署' }
        ))
      }

      const hasPushManager = 'PushManager' in window
      if (!hasPushManager) {
        checks.push(makeCheck(
          'push-manager',
          'Web Push API',
          checkStatus.fail,
          '此瀏覽器不支援 PushManager'
        ))
      } else {
        await checkPushSubscription()
        if (ensurePush) {
          await ensureWebPushSubscription()
        }
        if (isPushSubscribed.value) {
          checks.push(makeCheck(
            'push-subscription',
            'Web Push 訂閱',
            checkStatus.pass,
            '瀏覽器端已有推播訂閱'
          ))
        } else {
          checks.push(makeCheck(
            'push-subscription',
            'Web Push 訂閱',
            checkStatus.warn,
            pushLastError.value || '尚未訂閱',
            { fix: '按「請求通知權限 / 訂閱推播」，並確認 push_subscriptions 資料表存在' }
          ))
        }
      }

      // --- SW IndexedDB creds ---
      const swCreds = await readSwCredentialStatus()
      checks.push(makeCheck(
        'sw-creds',
        'SW IndexedDB 憑證',
        swCreds.ok ? checkStatus.pass : checkStatus.warn,
        swCreds.detail,
        swCreds.ok ? {} : { fix: '重新整理頁面讓 bootstrap 寫入，或按「重新寫入 SW 憑證」' }
      ))

      // --- Periodic sync ---
      try {
        if (!('serviceWorker' in navigator)) {
          checks.push(makeCheck('periodic-sync', 'Periodic Background Sync', checkStatus.info, '無 Service Worker'))
        } else {
          const registration = await navigator.serviceWorker.ready
          if (!('periodicSync' in registration)) {
            checks.push(makeCheck(
              'periodic-sync',
              'Periodic Background Sync',
              checkStatus.info,
              '此瀏覽器不支援（僅部分 Android Chrome 已安裝 PWA）'
            ))
          } else {
            let tags = []
            try {
              tags = await registration.periodicSync.getTags()
            } catch {
              tags = []
            }
            const registered = tags.includes(SW_PERIODIC_SYNC_TAG)
            checks.push(makeCheck(
              'periodic-sync',
              'Periodic Background Sync',
              registered ? checkStatus.pass : checkStatus.info,
              registered
                ? `已註冊 ${SW_PERIODIC_SYNC_TAG}`
                : '支援但尚未註冊或未授權（非主力通道，排程推播仍可用）'
            ))
          }
        }
      } catch (error) {
        checks.push(makeCheck(
          'periodic-sync',
          'Periodic Background Sync',
          checkStatus.info,
          error?.message || '無法查詢'
        ))
      }

      // --- Client expiry window ---
      try {
        await loadSubscriptions()
      } catch {
        // keep going with current in-memory list
      }
      const upcoming = getUpcomingSubscriptions()
      const lastNotify = readLocalNotifyDate()
      const today = todayKey(now)
      checks.push(makeCheck(
        'upcoming-subscriptions',
        '3 天內到期訂閱',
        upcoming.length > 0 ? checkStatus.info : checkStatus.pass,
        upcoming.length > 0
          ? `${upcoming.length} 筆：${upcoming.slice(0, 3).map(s => s.name || s.title || '未命名').join('、')}${upcoming.length > 3 ? '…' : ''}`
          : '目前沒有落在通知視窗的訂閱（屬正常）'
      ))
      checks.push(makeCheck(
        'client-dedupe',
        '當日 Toast/原生去重',
        lastNotify === today ? checkStatus.info : checkStatus.pass,
        lastNotify
          ? `上次標記：${lastNotify}${lastNotify === today ? '（今天已通知過，重開不會再跳）' : ''}`
          : '今天尚未發送過客戶端到期通知'
      ))

      // --- Resend recipients (client settings) ---
      const resendSettings = getResendNotificationSettings()
      const recipientCount = Array.isArray(resendSettings.recipients) ? resendSettings.recipients.length : 0
      if (recipientCount > 0) {
        checks.push(makeCheck(
          'resend-recipients',
          'Resend 收件設定',
          checkStatus.pass,
          `${recipientCount} 組完整（訂閱提前 2 天、食品提前 8 天）`
        ))
      } else {
        checks.push(makeCheck(
          'resend-recipients',
          'Resend 收件設定',
          checkStatus.warn,
          '尚未完整設定任何一組 API Key + 收件信箱',
          { fix: '到下方「Resend Email 通知」填寫並儲存帳號' }
        ))
      }

      // --- Server env (cron / push) ---
      try {
        const envStatus = await $fetch('/api/settings/env-status')
        const variables = Array.isArray(envStatus?.variables) ? envStatus.variables : []
        const interesting = [
          'SUPABASE_SERVICE_ROLE_KEY',
          'VAPID_EMAIL',
          'NUXT_PUBLIC_VAPID_PUBLIC_KEY',
          'VAPID_PRIVATE_KEY'
        ]
        for (const key of interesting) {
          const entry = variables.find(item => item.key === key)
          if (!entry) continue
          checks.push(makeCheck(
            `env-${key}`,
            `伺服器 ${entry.label || key}`,
            entry.configured ? checkStatus.pass : checkStatus.fail,
            entry.configured
              ? (entry.maskedValue ? `已設定（${entry.maskedValue}）` : '已設定')
              : '未設定',
            entry.configured ? {} : { fix: '到 Netlify Environment Variables 補上後重新部署' }
          ))
        }
      } catch (error) {
        checks.push(makeCheck(
          'env-status',
          '伺服器環境變數',
          checkStatus.warn,
          error?.message || '無法讀取 /api/settings/env-status'
        ))
      }

      // --- Optional native probe ---
      if (probeNative && hasNotificationApi && permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker?.ready
          const body = `自我檢測 ${now.toLocaleString('zh-TW')}`
          if (registration?.showNotification) {
            await registration.showNotification(SUBSCRIPTION_NOTIF_TITLE, {
              body,
              icon: NOTIF_ICON,
              badge: NOTIF_BADGE,
              tag: 'fengbro-self-check',
              requireInteraction: false,
              data: { url: '/' }
            })
          } else {
            void new Notification(SUBSCRIPTION_NOTIF_TITLE, {
              body,
              icon: '/favicon.ico',
              tag: 'fengbro-self-check'
            })
          }
          checks.push(makeCheck(
            'native-probe',
            '原生通知探測',
            checkStatus.pass,
            '已送出一則測試系統通知'
          ))
        } catch (error) {
          checks.push(makeCheck(
            'native-probe',
            '原生通知探測',
            checkStatus.fail,
            error?.message || '送出失敗'
          ))
        }
      } else if (probeNative) {
        checks.push(makeCheck(
          'native-probe',
          '原生通知探測',
          checkStatus.warn,
          '略過（需先授權通知）'
        ))
      }

      const summary = checks.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, { pass: 0, warn: 0, fail: 0, info: 0 })

      const overall = summary.fail > 0
        ? 'fail'
        : summary.warn > 0
          ? 'warn'
          : 'pass'

      const result = {
        checkedAt: now.toISOString(),
        overall,
        summary,
        checks
      }
      selfCheckResult.value = result

      if (overall === 'pass') {
        toastSuccess('通知自我檢測完成：主要項目正常', { duration: 5000 })
      } else if (overall === 'warn') {
        toastWarning(`通知自我檢測完成：${summary.warn} 項需注意`, { duration: 6000 })
      } else {
        toastWarning(`通知自我檢測完成：${summary.fail} 項失敗`, { duration: 7000 })
      }

      return result
    } finally {
      selfCheckRunning.value = false
    }
  }

  const requestPushAndRecheck = async () => {
    await ensureWebPushSubscription()
    return await runNotificationSelfCheck({
      probeToast: false,
      probeNative: false,
      ensurePush: false,
      refreshSwCreds: true
    })
  }

  return {
    bootstrapNotifications,
    runClientSubscriptionExpiryAlerts,
    storeServiceWorkerCredentials,
    registerPeriodicSubscriptionCheck,
    ensureWebPushSubscription,
    runExpiryEmailNotifications,
    runNotificationSelfCheck,
    requestPushAndRecheck,
    selfCheckRunning,
    selfCheckResult
  }
}
