// netlify/functions/send-push-cron.js
// Scheduled Web Push sender for Supabase subscriptions.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import {
  SUBSCRIPTION_NOTIFY_WINDOW_DAYS,
  buildPushPayload
} from '../../utils/notificationHelpers.js'

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VAPID_EMAIL',
  'NUXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY'
]

const missingEnv = () => REQUIRED_ENV.filter((key) => !process.env[key])

const toDateOnlyIso = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  limit.setDate(limit.getDate() + SUBSCRIPTION_NOTIFY_WINDOW_DAYS)
  const today = toDateOnlyIso(now)
  const limitDate = toDateOnlyIso(limit)

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
    const payload = JSON.stringify(buildPushPayload(sub))

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
