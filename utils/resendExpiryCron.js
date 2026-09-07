// utils/resendExpiryCron.js
// Shared implementation for netlify/functions/resend-expiry-cron-*.js.
// Plain Node/ESM — no Vue, no Nuxt auto-imports. Talks to Resend directly via
// fetch and to Supabase with the service-role key (bypasses RLS), so it can
// read the resendsettings row and read/write the shared resend_notify_log
// dedupe table that the browser composable (useExpiryEmailNotifications.js)
// also uses.

import { createClient } from '@supabase/supabase-js'
import {
  SUBSCRIPTION_EMAIL_DAYS_BEFORE,
  FOOD_EMAIL_DAYS_BEFORE,
  RESEND_NOTIFY_LOG_TABLE,
  expiryMarkerFor,
  buildResendEmailContent,
  buildResendIdempotencyKey
} from './notificationHelpers.js'

const RESEND_SETTINGS_TABLE = 'resendsettings'
const RESEND_SETTINGS_ROW_KEY = 'main'
const DEFAULT_FROM_EMAIL = 'FengBro AI <onboarding@resend.dev>'

export const windowRange = (daysBefore, now = new Date()) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const limit = new Date(`${today}T00:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + daysBefore)
  return { today, limit: limit.toISOString().slice(0, 10) }
}

const parseRecipients = (row) => {
  let slots = []
  try {
    slots = JSON.parse(row?.slots_json || '[]')
  } catch {
    slots = []
  }
  return {
    fromEmail: row?.from_email || DEFAULT_FROM_EMAIL,
    recipients: Array.isArray(slots)
      ? slots.filter((slot) => slot && slot.apiKey && slot.toEmail)
      : []
  }
}

const sendResendEmail = async ({ apiKey, from, to, subject, text, html, idempotencyKey }) => {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({ from, to: [to], subject, text, html })
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.message || `Resend send failed (HTTP ${response.status})`)
  }
}

/**
 * One check-and-send pass: find subscriptions/foods due within their notify
 * window, skip anything already logged in resend_notify_log, send grouped
 * emails for the rest, and log whatever actually sent successfully.
 *
 * Safe to call repeatedly (05:27 / 11:27 / 17:27 Asia/Taipei) — if an earlier
 * check already sent an item, later checks see it in resend_notify_log and
 * skip it; if a send failed, it stays unlogged so the next scheduled check
 * retries it.
 */
export async function runResendExpiryCronCheck({ supabaseUrl, supabaseServiceKey }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const settingsResult = await supabase
    .from(RESEND_SETTINGS_TABLE)
    .select('from_email, slots_json')
    .eq('rowkey', RESEND_SETTINGS_ROW_KEY)
    .limit(1)

  if (settingsResult.error) {
    throw new Error(`Query ${RESEND_SETTINGS_TABLE} failed: ${settingsResult.error.message}`)
  }

  const { fromEmail, recipients } = parseRecipients(settingsResult.data?.[0])
  if (recipients.length === 0) {
    return { skipped: 'missing-resend-recipient' }
  }

  const subWindow = windowRange(SUBSCRIPTION_EMAIL_DAYS_BEFORE)
  const foodWindow = windowRange(FOOD_EMAIL_DAYS_BEFORE)

  const [subResult, foodResult] = await Promise.all([
    supabase
      .from('subscription')
      .select('id, name, nextdate')
      // UI/CSV 以 `iscontinue !== false` 判定「續訂中」，NULL 也算續訂中，
      // 所以這裡不能用 .eq('iscontinue', true)（會漏掉舊資料的 NULL 列）。
      .or('iscontinue.is.null,iscontinue.eq.true')
      .gte('nextdate', subWindow.today)
      .lte('nextdate', subWindow.limit),
    supabase
      .from('food')
      .select('id, name, todate, shop, amount')
      .gte('todate', foodWindow.today)
      .lte('todate', foodWindow.limit)
  ])

  if (subResult.error) throw new Error(`Query subscription failed: ${subResult.error.message}`)
  if (foodResult.error) throw new Error(`Query food failed: ${foodResult.error.message}`)

  const candidateSubscriptions = subResult.data || []
  const candidateFoods = foodResult.data || []

  const candidateMarkers = [
    ...candidateSubscriptions.map((item) => expiryMarkerFor('subscription', item, item.nextdate)),
    ...candidateFoods.map((item) => expiryMarkerFor('food', item, item.todate))
  ]

  let loggedMarkers = new Set()
  if (candidateMarkers.length > 0) {
    const { data, error } = await supabase
      .from(RESEND_NOTIFY_LOG_TABLE)
      .select('marker')
      .in('marker', candidateMarkers)
    if (error) throw new Error(`Query ${RESEND_NOTIFY_LOG_TABLE} failed: ${error.message}`)
    loggedMarkers = new Set((data || []).map((row) => row.marker))
  }

  const dueSubscriptions = candidateSubscriptions
    .filter((item) => !loggedMarkers.has(expiryMarkerFor('subscription', item, item.nextdate)))
  const dueFoods = candidateFoods
    .filter((item) => !loggedMarkers.has(expiryMarkerFor('food', item, item.todate)))

  const sent = []
  const failures = []
  const newlySentMarkers = []

  for (const [type, items] of [['subscription', dueSubscriptions], ['food', dueFoods]]) {
    if (items.length === 0) continue

    const { subject, text, html } = buildResendEmailContent(type, items)

    try {
      await Promise.all(recipients.map((recipient, index) => sendResendEmail({
        apiKey: recipient.apiKey,
        from: fromEmail,
        to: recipient.toEmail,
        subject,
        text,
        html,
        idempotencyKey: buildResendIdempotencyKey({ type, items, recipientIndex: index })
      })))

      items.forEach((item) => {
        newlySentMarkers.push(expiryMarkerFor(type, item, type === 'subscription' ? item.nextdate : item.todate))
      })
      sent.push({ type, count: items.length })
    } catch (error) {
      // 不寫入 log：留給下一次排程檢查重試（05:27 → 11:27 → 17:27），
      // 前一次沒寄出才會再嘗試，寄出過的不會重複寄。
      failures.push({ type, count: items.length, error: error.message })
    }
  }

  if (newlySentMarkers.length > 0) {
    const { error } = await supabase
      .from(RESEND_NOTIFY_LOG_TABLE)
      .upsert(newlySentMarkers.map((marker) => ({ marker })), { onConflict: 'marker', ignoreDuplicates: true })
    // 23505 = unique_violation：瀏覽器端已經先寄過並寫入，忽略即可。
    if (error && error.code !== '23505') {
      console.error(`[resend-expiry-cron] Write ${RESEND_NOTIFY_LOG_TABLE} failed:`, error.message)
    }
  }

  return {
    checkedSubscriptions: candidateSubscriptions.length,
    checkedFoods: candidateFoods.length,
    sent,
    failures
  }
}

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']

/**
 * Netlify scheduled-function handler for one daily check slot.
 * netlify/functions/resend-expiry-cron-*.js each export one of these; the
 * schedules live in netlify.toml. Shape mirrors send-push-cron.js.
 */
export function createResendExpiryCronHandler(slot) {
  const tag = `[resend-expiry-cron:${slot}]`

  return async () => {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key])
    if (missing.length > 0) {
      console.error(`${tag} Missing env:`, missing.join(', '))
      return new Response(`Missing env: ${missing.join(', ')}`, { status: 500 })
    }

    try {
      const result = await runResendExpiryCronCheck({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      })

      if (result.failures?.length) {
        console.error(`${tag} Some sends failed (will retry next slot):`, JSON.stringify(result.failures))
      }

      return new Response(JSON.stringify({ slot, ...result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error(`${tag} Check failed:`, error.message)
      return new Response(`Resend expiry check failed: ${error.message}`, { status: 500 })
    }
  }
}
