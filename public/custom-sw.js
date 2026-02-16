// 通知點擊事件 - 點擊通知後開啟應用程式
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有視窗，聚焦到該視窗
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // 沒有視窗，開啟新視窗
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})
