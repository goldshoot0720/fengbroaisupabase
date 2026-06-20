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
      isSubscribed.value = !!existing
      lastError.value = ''
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
      const { error } = await client.from('push_subscriptions').upsert(
        {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw error

      isSubscribed.value = true
      lastError.value = ''
      console.log('[Push] Web Push 訂閱已寫入 Supabase')
      return true
    } catch (err) {
      lastError.value = err?.message || 'Web Push 訂閱失敗'
      console.error('[Push] Web Push 訂閱失敗:', err)
      isSubscribed.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { isSubscribed, isLoading, lastError, subscribe, checkSubscription }
}
