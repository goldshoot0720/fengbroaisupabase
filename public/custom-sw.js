// FengBro AI Supabase custom service worker helpers.
// Imported by @vite-pwa/nuxt Workbox through nuxt.config.ts.

self.addEventListener('push', (event) => {
  let data = {
    title: '鋒兄提醒',
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
    self.registration.showNotification(data.title || '鋒兄提醒', {
      body: data.body || '',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
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

const DB_NAME = 'fengbroai-sw'
const STORE = 'config'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = (event) => resolve(event.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function getFromDB(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = (event) => resolve(event.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function setInDB(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-subscriptions') {
    event.waitUntil(checkSubscriptionExpiry())
  }
})

async function checkSubscriptionExpiry() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const lastNotify = await getFromDB('sub-notify-date')
    if (lastNotify === today) return

    const creds = await getFromDB('supabase-creds')
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
    limit.setDate(limit.getDate() + 3)

    const upcoming = subs.filter((sub) => {
      const date = new Date(sub.nextdate)
      date.setHours(0, 0, 0, 0)
      return date >= now && date <= limit
    })

    if (upcoming.length === 0) return
    await setInDB('sub-notify-date', today)

    for (const sub of upcoming) {
      const date = new Date(sub.nextdate)
      date.setHours(0, 0, 0, 0)
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const dayText = daysLeft === 0 ? '今天' : `${daysLeft} 天後`
      await self.registration.showNotification('鋒兄訂閱提醒', {
        body: `${sub.name} 將在 ${dayText} 到期（${sub.nextdate}）`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
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
