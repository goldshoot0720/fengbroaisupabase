// netlify/functions/send-push-cron.js
// Netlify 排程函數：每天早上 8:30（台灣時間，UTC+8 = 00:30 UTC）
// 查詢 3 天內到期訂閱，透過 Web Push 推送通知到所有已訂閱裝置

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default async () => {
  // 設定 VAPID
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  // 使用 Service Role Key（可繞過 RLS，讀取所有推播訂閱）
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 計算今天與 3 天後的日期
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const limit = new Date(now)
  limit.setDate(limit.getDate() + 3)
  const today = now.toISOString().split('T')[0]
  const limitDate = limit.toISOString().split('T')[0]

  // 查詢 3 天內到期且仍續訂中的項目
  const { data: subs, error: subError } = await supabase
    .from('subscription')
    .select('id, name, nextdate')
    .eq('iscontinue', true)
    .gte('nextdate', today)
    .lte('nextdate', limitDate)

  if (subError) {
    console.error('[push-cron] 查詢訂閱失敗:', subError.message)
    return new Response('Query error', { status: 500 })
  }

  if (!subs || subs.length === 0) {
    console.log('[push-cron] 無即將到期的訂閱')
    return new Response('No upcoming subscriptions', { status: 200 })
  }

  // 取得所有 push endpoints
  const { data: pushSubs, error: pushError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (pushError) {
    console.error('[push-cron] 查詢 push_subscriptions 失敗:', pushError.message)
    return new Response('Push query error', { status: 500 })
  }

  if (!pushSubs || pushSubs.length === 0) {
    console.log('[push-cron] 目前沒有任何 push 訂閱裝置')
    return new Response('No push subscribers', { status: 200 })
  }

  let sent = 0
  let removed = 0

  for (const sub of subs) {
    const daysLeft = Math.ceil(
      (new Date(sub.nextdate).setHours(0, 0, 0, 0) - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    const dayText = daysLeft === 0 ? '今天' : `${daysLeft} 天後`

    const payload = JSON.stringify({
      title: '🔔 鋒兄訂閱提醒',
      body: `「${sub.name}」${dayText}到期（${sub.nextdate}）`,
      tag: `sub-push-${sub.id}`,
      requireInteraction: true
    })

    for (const pushSub of pushSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: pushSub.endpoint,
            keys: { p256dh: pushSub.p256dh, auth: pushSub.auth }
          },
          payload
        )
        sent++
      } catch (err) {
        // 410 = 訂閱已過期，清除無效的 endpoint
        if (err.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', pushSub.endpoint)
          removed++
          console.log('[push-cron] 清除過期 endpoint:', pushSub.endpoint.slice(0, 50))
        } else {
          console.error('[push-cron] 推送失敗:', err.message)
        }
      }
    }
  }

  console.log(`[push-cron] 完成：推送 ${sent} 則，清除 ${removed} 個過期 endpoint`)
  return new Response(`Sent: ${sent}, Removed: ${removed}`, { status: 200 })
}

// 每天 00:30 UTC = 台灣時間 08:30
export const config = {
  schedule: '30 0 * * *'
}
