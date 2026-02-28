// composables/usePushNotification.js
// Web Push 訂閱管理 - 真正的背景推播，不需要開 App
import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseCredentials } from './useSettings'

const isSubscribed = ref(false)
const isLoading = ref(false)

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

export const usePushNotification = () => {
  const getSupabaseClient = () => {
    const creds = getSupabaseCredentials()
    const config = useRuntimeConfig()
    const url = creds?.url || config.public.supabaseUrl
    const key = creds?.key || config.public.supabaseAnonKey
    return createClient(url, key)
  }

  // 檢查目前是否已訂閱
  const checkSubscription = async () => {
    if (!import.meta.client) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      isSubscribed.value = !!existing
    } catch {
      isSubscribed.value = false
    }
  }

  // 訂閱 Web Push 並儲存 endpoint 到 Supabase
  const subscribe = async () => {
    if (!import.meta.client) return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] 此瀏覽器不支援 Web Push')
      return false
    }

    const config = useRuntimeConfig()
    const vapidPublicKey = config.public.vapidPublicKey
    if (!vapidPublicKey) {
      console.warn('[Push] 未設定 VAPID 公鑰，跳過 Web Push 訂閱')
      return false
    }

    isLoading.value = true
    try {
      // 請求通知權限
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('[Push] 通知權限被拒絕')
        return false
      }

      const registration = await navigator.serviceWorker.ready

      // 先取消舊的訂閱（避免 VAPID key 更換後出錯）
      const oldSub = await registration.pushManager.getSubscription()
      if (oldSub) await oldSub.unsubscribe()

      // 訂閱 Push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // 儲存 endpoint + keys 到 Supabase
      const subJson = subscription.toJSON()
      const client = getSupabaseClient()

      const { error } = await client.from('push_subscriptions').upsert(
        {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw error

      isSubscribed.value = true
      console.log('[Push] Web Push 訂閱成功，已儲存到 Supabase')
      return true
    } catch (err) {
      console.error('[Push] 訂閱失敗:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return { isSubscribed, isLoading, subscribe, checkSubscription }
}
