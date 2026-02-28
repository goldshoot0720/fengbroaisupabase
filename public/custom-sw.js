// =============================================
// 鋒兄AI - Service Worker 擴充
// 1. 通知點擊 → 開啟應用
// 2. Periodic Background Sync → 開機後背景檢查訂閱到期
// =============================================

// =============================================
// Web Push 事件（伺服器主動推播，App 關閉也能收到）
// =============================================
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: '鋒兄AI', body: event.data.text() }
  }

  const title = data.title || '🔔 鋒兄AI'
  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'push-notification',
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction !== false
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// --- 通知點擊事件 ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// =============================================
// IndexedDB 工具函數（localStorage 在 SW 中不可用）
// =============================================
const DB_NAME = 'fengbroai-sw'
const STORE   = 'config'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

async function getFromDB(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

async function setInDB(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror   = (e) => reject(e.target.error)
  })
}

// =============================================
// Periodic Background Sync
// 每天自動在背景檢查訂閱到期（Android Chrome PWA）
// =============================================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-subscriptions') {
    event.waitUntil(checkSubscriptionExpiry())
  }
})

async function checkSubscriptionExpiry() {
  try {
    // 1. 今天已通知過 → 跳過
    const today         = new Date().toISOString().split('T')[0]
    const lastNotify    = await getFromDB('sub-notify-date')
    if (lastNotify === today) return

    // 2. 讀取 Supabase 憑證
    const creds = await getFromDB('supabase-creds')
    if (!creds || !creds.url || !creds.key) return

    // 3. 呼叫 Supabase REST API
    const res = await fetch(
      `${creds.url}/rest/v1/subscription?select=id,name,nextdate,iscontinue`,
      {
        headers: {
          'apikey':        creds.key,
          'Authorization': `Bearer ${creds.key}`
        }
      }
    )
    if (!res.ok) return
    const subs = await res.json()

    // 4. 篩選 3 天內到期（且續訂中）
    const now  = new Date()
    now.setHours(0, 0, 0, 0)
    const limit = new Date(now)
    limit.setDate(limit.getDate() + 3)

    const upcoming = subs.filter(sub => {
      if (sub.iscontinue === false) return false
      if (!sub.nextdate) return false
      const d = new Date(sub.nextdate)
      d.setHours(0, 0, 0, 0)
      return d >= now && d <= limit
    })

    if (upcoming.length === 0) return

    // 5. 記錄今天已通知
    await setInDB('sub-notify-date', today)

    // 6. 顯示通知
    for (const sub of upcoming) {
      const daysLeft = Math.ceil(
        (new Date(sub.nextdate).setHours(0,0,0,0) - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const dayText = daysLeft === 0 ? '今天' : `${daysLeft} 天後`
      await self.registration.showNotification('🔔 鋒兄訂閱提醒', {
        body:             `「${sub.name}」${dayText}到期（${sub.nextdate}）`,
        icon:             '/pwa-192x192.png',
        badge:            '/pwa-192x192.png',
        tag:              `sub-bg-${sub.id}`,
        vibrate:          [200, 100, 200],
        requireInteraction: true
      })
    }
  } catch (err) {
    console.error('[SW] checkSubscriptionExpiry 錯誤:', err)
  }
}
