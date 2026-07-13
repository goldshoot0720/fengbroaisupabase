// FengBro AI Supabase custom service worker helpers.
// Imported by @vite-pwa/nuxt Workbox through nuxt.config.ts.
// Keep self-contained (no module imports) so Workbox can inject this file as-is.
// Message / key constants must stay aligned with utils/notificationHelpers.js.

const SW_DB_NAME = 'fengbroai-sw'
const SW_STORE = 'config'
const SW_CREDS_KEY = 'supabase-creds'
const SUB_NOTIFY_DATE_KEY = 'sub-notify-date'
const PERIODIC_SYNC_TAG = 'check-subscriptions'
const SUBSCRIPTION_NOTIFY_WINDOW_DAYS = 3
const NOTIF_ICON = '/pwa-192x192.png'
const NOTIF_BADGE = '/pwa-192x192.png'
const SUBSCRIPTION_NOTIF_TITLE = '鋒兄訂閱提醒'
const DEFAULT_PUSH_TITLE = '鋒兄提醒'

self.addEventListener('push', (event) => {
  let data = {
    title: DEFAULT_PUSH_TITLE,
    body: '你有新的提醒。',
    url: '/',
    tag: 'fengbro-push'
  }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    if (event.data) data.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(data.title || DEFAULT_PUSH_TITLE, {
      body: data.body || '',
      icon: data.icon || NOTIF_ICON,
      badge: data.badge || NOTIF_BADGE,
      tag: data.tag || 'fengbro-push',
      vibrate: data.vibrate || [200, 100, 200],
      requireInteraction: data.requireInteraction !== false,
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus()
          if ('navigate' in client) return client.navigate(targetUrl)
          return undefined
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
      return undefined
    })
  )
})

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SW_DB_NAME, 1)
    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(SW_STORE)) db.createObjectStore(SW_STORE)
    }
    req.onsuccess = (event) => resolve(event.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function getFromDB(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SW_STORE, 'readonly')
    const req = tx.objectStore(SW_STORE).get(key)
    req.onsuccess = (event) => resolve(event.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function setInDB(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SW_STORE, 'readwrite')
    const req = tx.objectStore(SW_STORE).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function getDayText(daysLeft) {
  if (daysLeft === 0) return '今天'
  if (daysLeft === 1) return '明天'
  return `${daysLeft} 天後`
}

function buildSubscriptionExpiryBody(name, nextdate, daysLeft) {
  const dayText = getDayText(daysLeft)
  return `${name || '未命名訂閱'} 將在 ${dayText} 到期（${nextdate}）`
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(checkSubscriptionExpiry())
  }
})

async function checkSubscriptionExpiry() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const lastNotify = await getFromDB(SUB_NOTIFY_DATE_KEY)
    if (lastNotify === today) return

    const creds = await getFromDB(SW_CREDS_KEY)
    if (!creds?.url || !creds?.key) return

    const res = await fetch(
      `${creds.url}/rest/v1/subscription?select=id,name,nextdate,iscontinue&iscontinue=eq.true&nextdate=not.is.null`,
      {
        headers: {
          apikey: creds.key,
          Authorization: `Bearer ${creds.key}`
        }
      }
    )
    if (!res.ok) return

    const subs = await res.json()
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const limit = new Date(now)
    limit.setDate(limit.getDate() + SUBSCRIPTION_NOTIFY_WINDOW_DAYS)

    const upcoming = subs.filter((sub) => {
      const date = new Date(sub.nextdate)
      date.setHours(0, 0, 0, 0)
      return date >= now && date <= limit
    })

    if (upcoming.length === 0) return
    await setInDB(SUB_NOTIFY_DATE_KEY, today)

    for (const sub of upcoming) {
      const date = new Date(sub.nextdate)
      date.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      await self.registration.showNotification(SUBSCRIPTION_NOTIF_TITLE, {
        body: buildSubscriptionExpiryBody(sub.name, sub.nextdate, daysLeft),
        icon: NOTIF_ICON,
        badge: NOTIF_BADGE,
        tag: `sub-bg-${sub.id}`,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: '/' }
      })
    }
  } catch (err) {
    console.error('[SW] checkSubscriptionExpiry failed:', err)
  }
}
