import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { after, beforeEach, it, mock } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/composables/') && /^\.\/[^.]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context)
    if (url.endsWith('/composables/usePushNotification.js')) {
      return { ...result, source: String(result.source).replaceAll('import.meta.client', 'true') }
    }
    return result
  },
})

const { usePushNotification } = await import('../composables/usePushNotification.js')
const push = usePushNotification()
const subscription = {
  endpoint: 'https://push.example.com/device-1',
  keys: { p256dh: 'test-public-key', auth: 'test-auth-secret' },
}
let responseError
let requests

beforeEach(() => {
  mock.restoreAll()
  push.isSubscribed.value = false
  push.lastError.value = ''
  responseError = null
  requests = []
  globalThis.Notification = { requestPermission: async () => 'granted' }
  globalThis.window = { PushManager: function () {}, Notification }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => ({ toJSON: () => subscription }) } }) },
  })
  globalThis.useRuntimeConfig = () => ({ public: {
    supabaseUrl: 'https://test-project.supabase.co', supabaseAnonKey: 'test-anon-key', vapidPublicKey: 'AQID',
  } })
  mock.method(console, 'error', () => {})
  mock.method(console, 'warn', () => {})
  mock.method(console, 'log', () => {})
  mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    requests.push({ pathname: new URL(request.url).pathname, body: await request.json() })
    if (responseError) return Response.json(responseError, { status: 404 })
    return new Response(null, { status: 204 })
  })
})

after(() => {
  mock.restoreAll()
  hooks.deregister()
})

it('explains how to create the missing push table instead of reporting a raw schema-cache error', async () => {
  responseError = { code: 'PGRST205', message: "Could not find the table 'public.push_subscriptions' in the schema cache" }
  assert.equal(await push.subscribe(), false)
  assert.equal(push.isSubscribed.value, false)
  assert.match(push.lastError.value, /push_subscriptions/)
  assert.match(push.lastError.value, /設定.*資料表/)
  assert.match(push.lastError.value, /SQL/)
  assert.equal(push.isLoading.value, false)
})

it('keeps a failed database registration visible when the browser has a subscription', async () => {
  responseError = { code: 'PGRST205', message: 'Missing push_subscriptions' }
  await push.subscribe()
  const error = push.lastError.value
  assert.equal(await push.checkSubscription(), false)
  assert.equal(push.lastError.value, error)
})

it('registers the device without requiring read access to other devices or their keys', async () => {
  assert.equal(await push.subscribe(), true)
  assert.equal(push.isSubscribed.value, true)
  assert.equal(push.lastError.value, '')
  assert.deepEqual(requests, [{
    pathname: '/rest/v1/rpc/register_push_subscription',
    body: { p_endpoint: subscription.endpoint, p_p256dh: subscription.keys.p256dh, p_auth: subscription.keys.auth },
  }])
})

it('explains that the setup SQL also installs the registration function', async () => {
  responseError = { code: 'PGRST202', message: 'Missing register_push_subscription' }
  assert.equal(await push.subscribe(), false)
  assert.match(push.lastError.value, /SQL/)
})

it('preserves permission errors and recovers after a successful retry', async () => {
  responseError = { code: '42501', message: 'permission denied' }
  assert.equal(await push.subscribe(), false)
  assert.equal(push.lastError.value, 'permission denied')
  responseError = null
  assert.equal(await push.subscribe(), true)
  assert.equal(await push.checkSubscription(), true)
  assert.equal(push.lastError.value, '')
})

it('includes the complete Web Push setup in the Settings table workflow', async () => {
  const [settingsSource, sql] = await Promise.all([
    readFile(path.join(root, 'components/pages/SettingsPage.vue'), 'utf8'),
    readFile(path.join(root, 'supabase-push-table.sql'), 'utf8'),
  ])
  assert.match(settingsSource, /name: 'push_subscriptions'/)
  assert.match(settingsSource, /sql: pushSubscriptionSql/)
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.push_subscriptions/)
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.register_push_subscription/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.register_push_subscription[^;]+TO anon, authenticated/)
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/)
})
