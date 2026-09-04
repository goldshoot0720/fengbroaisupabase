import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { after, before, it, mock } from 'node:test'

// Resolve app imports as Vite does, keeping the real composable and Supabase SDK.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/composables/') && /^\.\/[^.]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})

const { getSupabaseBrowserClient } = await import('../composables/useSupabaseBrowserClient.js')
const lockFailures = []
const requests = []
let client

before(() => {
  const storage = new Map()
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
  globalThis.window = {
    location: { href: 'https://app.example.com/', hash: '' },
    addEventListener() {},
    removeEventListener() {},
  }
  globalThis.document = { visibilityState: 'visible' }
  globalThis.BroadcastChannel = undefined
  globalThis.useRuntimeConfig = () => ({
    public: { supabaseUrl: 'https://test-project.supabase.co', supabaseAnonKey: 'test-anon-key' },
  })
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      // Another browser tab holds the refresh lock. Normal acquisitions can wait.
      async request(name, options, callback) {
        try {
          return await callback(options.ifAvailable ? null : { name })
        } catch (error) {
          lockFailures.push(error.message)
          throw error
        }
      },
    },
  })
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
  mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    requests.push({ pathname: new URL(request.url).pathname, authorization: request.headers.get('authorization') })
    return Response.json([{ id: 'subscription-1', name: 'Example' }])
  })
})

after(async () => {
  await client?.auth.stopAutoRefresh()
  mock.restoreAll()
  mock.timers.reset()
  hooks.deregister()
})

it('loads .env data without an Auth refresh lock collision when another tab is open', async () => {
  client = getSupabaseBrowserClient()
  assert.equal(getSupabaseBrowserClient(), client)
  await client.auth.initialize()
  await new Promise((resolve) => setImmediate(resolve))
  mock.timers.tick(30_000)
  await new Promise((resolve) => setImmediate(resolve))

  const { data, error } = await client.from('subscription').select('id,name')
  assert.equal(error, null)
  assert.equal(data[0].id, 'subscription-1')
  assert.deepEqual(requests, [{ pathname: '/rest/v1/subscription', authorization: 'Bearer test-anon-key' }])
  assert.deepEqual(lockFailures, [], 'Data loading must not trigger a competing Auth refresh lock')
})
