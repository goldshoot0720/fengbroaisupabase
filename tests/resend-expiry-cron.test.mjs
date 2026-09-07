import assert from 'node:assert/strict'
import { beforeEach, describe, it, mock } from 'node:test'

// Exercises the real Supabase SDK and the real Resend call path with a mocked
// fetch, so the PostgREST query strings (window bounds, the iscontinue filter)
// and the resend_notify_log dedupe writes are asserted as they go out.
import { createResendExpiryCronHandler, runResendExpiryCronCheck } from '../utils/resendExpiryCron.js'
import { SUBSCRIPTION_EMAIL_DAYS_BEFORE, FOOD_EMAIL_DAYS_BEFORE, dateKey } from '../utils/notificationHelpers.js'

const SUPABASE_URL = 'https://cron-project.supabase.co'
const SERVICE_KEY = 'test-service-role-key'
const credentials = { supabaseUrl: SUPABASE_URL, supabaseServiceKey: SERVICE_KEY }

const inDays = (days) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

const recipientSlots = (count) => JSON.stringify(
  Array.from({ length: count }, (_, index) => ({
    apiKey: `re_test_key_${index + 1}`,
    toEmail: `owner${index + 1}@example.com`,
  }))
)

let settingsRow
let subscriptions
let foods
let loggedMarkers
let resendFailure
/** Every outgoing request, in order: { host, table/endpoint, method, params, body }. */
let calls

const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

beforeEach(() => {
  mock.restoreAll()
  settingsRow = { from_email: 'FengBro AI <notify@example.com>', slots_json: recipientSlots(1) }
  subscriptions = [{ id: 11, name: 'Netflix', nextdate: inDays(SUBSCRIPTION_EMAIL_DAYS_BEFORE) }]
  foods = [{ id: 22, name: '鮮奶', todate: inDays(FOOD_EMAIL_DAYS_BEFORE), shop: '全聯', amount: 2 }]
  loggedMarkers = []
  resendFailure = null
  calls = []

  mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const body = request.method === 'GET' ? null : await request.clone().json().catch(() => null)

    if (url.origin === 'https://api.resend.com') {
      calls.push({
        endpoint: 'resend',
        method: request.method,
        apiKey: request.headers.get('authorization'),
        idempotencyKey: request.headers.get('idempotency-key'),
        body,
      })
      if (resendFailure) return jsonResponse({ message: resendFailure }, 422)
      return jsonResponse({ id: 'email-1' })
    }

    assert.equal(url.origin, SUPABASE_URL)
    const table = url.pathname.replace('/rest/v1/', '')
    calls.push({
      table,
      method: request.method,
      params: Object.fromEntries(url.searchParams.entries()),
      body,
    })

    if (request.method === 'POST') {
      loggedMarkers.push(...body.map((row) => row.marker))
      return new Response(null, { status: 201 })
    }

    if (table === 'resendsettings') return jsonResponse([settingsRow])
    if (table === 'subscription') return jsonResponse(subscriptions)
    if (table === 'food') return jsonResponse(foods)
    if (table === 'resend_notify_log') {
      return jsonResponse(loggedMarkers.map((marker) => ({ marker })))
    }
    throw new Error(`Unexpected table ${table}`)
  })
})

const callsTo = (table) => calls.filter((call) => call.table === table)
const resendCalls = () => calls.filter((call) => call.endpoint === 'resend')

describe('runResendExpiryCronCheck', () => {
  it('sends one grouped email per type and logs the markers it sent', async () => {
    const result = await runResendExpiryCronCheck(credentials)

    assert.deepEqual(result.sent, [
      { type: 'subscription', count: 1 },
      { type: 'food', count: 1 },
    ])
    assert.deepEqual(result.failures, [])
    assert.equal(result.checkedSubscriptions, 1)
    assert.equal(result.checkedFoods, 1)

    assert.equal(resendCalls().length, 2)
    const [subEmail, foodEmail] = resendCalls()
    assert.equal(subEmail.apiKey, 'Bearer re_test_key_1')
    assert.deepEqual(subEmail.body.to, ['owner1@example.com'])
    assert.equal(subEmail.body.from, 'FengBro AI <notify@example.com>')
    assert.match(subEmail.body.subject, /鋒兄訂閱到期提醒/)
    assert.match(subEmail.body.text, /Netflix/)
    assert.match(foodEmail.body.subject, /鋒兄食品到期提醒/)
    assert.match(foodEmail.body.text, /鮮奶/)

    // Deterministic key so the browser path and the three cron slots produce
    // the same one for the same item set on the same day.
    assert.match(subEmail.idempotencyKey, /^feng-resend-expiry-subscription-\d{4}-\d{2}-\d{2}-.+-1$/)

    assert.deepEqual(loggedMarkers.sort(), [
      `food:22:${foods[0].todate}`,
      `subscription:11:${subscriptions[0].nextdate}`,
    ])
  })

  it('queries each window with the same iscontinue rule the browser uses', async () => {
    await runResendExpiryCronCheck(credentials)

    const [subQuery] = callsTo('subscription')
    // NULL counts as 續訂中, so .eq('iscontinue', true) would silently drop
    // legacy rows and let the two paths pick different items.
    assert.equal(subQuery.params.or, '(iscontinue.is.null,iscontinue.eq.true)')
    assert.equal(subQuery.method, 'GET')
    assert.equal(callsTo('subscription').length, 1)

    const [foodQuery] = callsTo('food')
    assert.equal(foodQuery.method, 'GET')
    assert.equal(callsTo('food').length, 1)
  })

  it('skips items already in resend_notify_log and sends nothing when all are logged', async () => {
    loggedMarkers = [
      `subscription:11:${subscriptions[0].nextdate}`,
      `food:22:${foods[0].todate}`,
    ]

    const result = await runResendExpiryCronCheck(credentials)

    assert.deepEqual(result.sent, [])
    assert.deepEqual(result.failures, [])
    assert.equal(result.checkedSubscriptions, 1)
    assert.equal(resendCalls().length, 0)
    assert.equal(callsTo('resend_notify_log').filter((call) => call.method === 'POST').length, 0)
  })

  it('leaves a failed send unlogged so the next slot retries it', async () => {
    resendFailure = 'Resend is down'

    const result = await runResendExpiryCronCheck(credentials)

    assert.deepEqual(result.sent, [])
    assert.deepEqual(result.failures.map((failure) => failure.type), ['subscription', 'food'])
    assert.equal(result.failures[0].error, 'Resend is down')
    assert.deepEqual(loggedMarkers, [])
  })

  it('sends to every configured recipient with a per-recipient idempotency key', async () => {
    settingsRow.slots_json = recipientSlots(3)
    foods = []

    await runResendExpiryCronCheck(credentials)

    const emails = resendCalls()
    assert.equal(emails.length, 3)
    assert.deepEqual(emails.map((email) => email.body.to[0]), [
      'owner1@example.com',
      'owner2@example.com',
      'owner3@example.com',
    ])
    assert.equal(new Set(emails.map((email) => email.idempotencyKey)).size, 3)
  })

  it('stops before touching the data tables when no recipient is configured', async () => {
    settingsRow.slots_json = '[]'

    const result = await runResendExpiryCronCheck(credentials)

    assert.deepEqual(result, { skipped: 'missing-resend-recipient' })
    assert.equal(callsTo('subscription').length, 0)
    assert.equal(resendCalls().length, 0)
  })

  it('treats an unparsable slots_json as "no recipients" instead of throwing', async () => {
    settingsRow.slots_json = '{not json'

    const result = await runResendExpiryCronCheck(credentials)

    assert.deepEqual(result, { skipped: 'missing-resend-recipient' })
  })
})

describe('createResendExpiryCronHandler', () => {
  const withEnv = async (env, run) => {
    const saved = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY }
    Object.assign(process.env, env)
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
    }
    try {
      return await run()
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  }

  it('returns 500 without sending anything when env vars are missing', async () => {
    const response = await withEnv(
      { SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined },
      () => createResendExpiryCronHandler('morning')()
    )

    assert.equal(response.status, 500)
    assert.match(await response.text(), /Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/)
    assert.equal(calls.length, 0)
  })

  it('reports the slot alongside the check result', async () => {
    const response = await withEnv(
      { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
      () => createResendExpiryCronHandler('noon')()
    )

    assert.equal(response.status, 200)
    const payload = await response.json()
    assert.equal(payload.slot, 'noon')
    assert.deepEqual(payload.sent, [
      { type: 'subscription', count: 1 },
      { type: 'food', count: 1 },
    ])
  })

  it('turns a Supabase failure into a 500 instead of an unhandled rejection', async () => {
    mock.restoreAll()
    mock.method(globalThis, 'fetch', async () => jsonResponse({ message: 'permission denied' }, 403))

    const response = await withEnv(
      { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
      () => createResendExpiryCronHandler('evening')()
    )

    assert.equal(response.status, 500)
    assert.match(await response.text(), /Resend expiry check failed/)
  })
})
