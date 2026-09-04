// composables/usePushNotification.js
// Browser Web Push subscription helper for the Supabase version.
import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'

const isSubscribed = ref(false)
const isLoading = ref(false)
const lastError = ref('')

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const getBrowserSupportError = () => {
  if (!import.meta.client) return '目前不是瀏覽器環境'
  if (!('serviceWorker' in navigator)) return '此瀏覽器不支援 Service Worker'
  if (!('PushManager' in window)) return '此瀏覽器不支援 Web Push'
  if (!('Notification' in window)) return '此瀏覽器不支援通知'
  return ''
}

export const usePushNotification = () => {
  const checkSubscription = async () => {
    const supportError = getBrowserSupportError()
    if (supportError) {
      lastError.value = supportError
      isSubscribed.value = false
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      // 瀏覽器保有訂閱，不代表上一筆雲端註冊已成功。
      if (!existing) lastError.value = ''
      isSubscribed.value = !!existing && !lastError.value
      return isSubscribed.value
    } catch (err) {
      lastError.value = err?.message || '檢查推播訂閱失敗'
      isSubscribed.value = false
      return false
    }
  }

  const subscribe = async () => {
    const supportError = getBrowserSupportError()
    if (supportError) {
      lastError.value = supportError
      console.warn('[Push]', supportError)
      return false
    }

    const config = useRuntimeConfig()
    const vapidPublicKey = config.public.vapidPublicKey
    if (!vapidPublicKey) {
      lastError.value = '未設定 NUXT_PUBLIC_VAPID_PUBLIC_KEY'
      console.warn('[Push] 未設定 NUXT_PUBLIC_VAPID_PUBLIC_KEY，略過 Web Push 訂閱')
      return false
    }

    isLoading.value = true
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        lastError.value = '使用者未授權通知'
        isSubscribed.value = false
        return false
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })
      }

      const subJson = subscription.toJSON()
      const client = getSupabaseBrowserClient()
      if (!client) throw new Error('未設定 Supabase 連線資訊')
      // 只登記此裝置；瀏覽器不需要讀取其他裝置的 endpoint / 推播金鑰。
      const { error } = await client.rpc('register_push_subscription', {
        p_endpoint: subJson.endpoint,
        p_p256dh: subJson.keys?.p256dh,
        p_auth: subJson.keys?.auth,
      })

      if (error) throw error

      isSubscribed.value = true
      lastError.value = ''
      console.log('[Push] Web Push 訂閱已寫入 Supabase')
      return true
    } catch (err) {
      const missingSetup = err?.code === 'PGRST205' || err?.code === 'PGRST202' ||
        (err?.code === '42P01' && err?.message?.includes('push_subscriptions'))
      lastError.value = missingSetup
        ? '推播資料表 push_subscriptions 或註冊功能尚未建立。請到「設定 → 資料表狀態 → Web Push 推播」複製 SQL，在 Supabase SQL Editor 執行後重新訂閱。'
        : err?.message || 'Web Push 訂閱失敗'
      if (missingSetup) console.warn('[Push]', lastError.value)
      else console.error('[Push] Web Push 訂閱失敗:', err)
      isSubscribed.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { isSubscribed, isLoading, lastError, subscribe, checkSubscription }
}
