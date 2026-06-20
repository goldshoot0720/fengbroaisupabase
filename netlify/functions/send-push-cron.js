// netlify/functions/send-push-cron.js
// Scheduled Web Push sender for Supabase subscriptions.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VAPID_EMAIL',
  'NUXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY'
]

const missingEnv = () => REQUIRED_ENV.filter((key) => !process.env[key])

const getDayText = (daysLeft) => {
  if (daysLeft === 0) return '今天'
  if (daysLeft === 1) return '明天'
  return `${daysLeft} 天後`
}

export default async () => {
  const missing = missingEnv()
  if (missing.length > 0) {
    console.error('[push-cron] Missing env:', missing.join(', '))
    return new Response(`Missing env: ${missing.join(', ')}`, { status: 500 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const limit = new Date(now)
  limit.setDate(limit.getDate() + 3)
  const today = now.toISOString().split('T')[0]
  const limitDate = limit.toISOString().split('T')[0]

  const { data: subs, error: subError } = await supabase
    .from('subscription')
    .select('id, name, nextdate')
    .eq('iscontinue', true)
    .gte('nextdate', today)
    .lte('nextdate', limitDate)

  if (subError) {
    console.error('[push-cron] Query subscription failed:', subError.message)
    return new Response('Query subscription failed', { status: 500 })
  }

  if (!subs || subs.length === 0) {
    return new Response('No upcoming subscriptions', { status: 200 })
  }

  const { data: pushSubs, error: pushError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (pushError) {
    console.error('[push-cron] Query push_subscriptions failed:', pushError.message)
    return new Response('Query push subscriptions failed', { status: 500 })
  }

  if (!pushSubs || pushSubs.length === 0) {
    return new Response('No push subscribers', { status: 200 })
  }

  let sent = 0
  let removed = 0
  let failed = 0

  for (const sub of subs) {
    const date = new Date(sub.nextdate)
    date.setHours(0, 0, 0, 0)
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const dayText = getDayText(daysLeft)

    const payload = JSON.stringify({
      title: '鋒兄訂閱提醒',
      body: `${sub.name} 將在 ${dayText} 到期（${sub.nextdate}）`,
      tag: `sub-push-${sub.id}`,
      url: '/',
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
        failed++
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', pushSub.endpoint)
          removed++
        } else {
          console.error('[push-cron] Send failed:', err.message)
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ sent, failed, removed, checked: subs.length, subscribers: pushSubs.length }),
    { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
  )
}

// 00:30 UTC = Asia/Taipei 08:30
export const config = {
  schedule: '30 0 * * *'
}
