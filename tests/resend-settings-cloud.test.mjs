import assert from 'node:assert/strict'
import { beforeEach, describe, it, mock } from 'node:test'

// Supply Nitro's auto-imports while exercising the actual route and Supabase SDK.
let runtimeConfig
globalThis.defineEventHandler = (handler) => handler
globalThis.readBody = async (event) => event.body || {}
globalThis.getQuery = (event) => event.query || {}
globalThis.useRuntimeConfig = () => runtimeConfig
globalThis.createError = (options) => Object.assign(new Error(options.statusMessage), options)

const { default: handleResendSettings } = await import('../server/api/notifications/resend-settings.ts')

const envCredentials = {
  supabaseUrl: 'https://env-project.supabase.co',
  supabaseAnonKey: 'test-env-anon-key',
}
let row
let requests

beforeEach(() => {
  mock.restoreAll()
  runtimeConfig = { ...envCredentials, public: { ...envCredentials } }
  row = { rowkey: 'main', password_hash: '', from_email: '', slots_json: '[]' }
  requests = []
  mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    assert.equal(url.pathname, '/rest/v1/resendsettings')
    requests.push({ url: url.origin, key: request.headers.get('apikey'), method: request.method })

    if (request.method === 'PATCH') {
      row = { ...row, ...await request.json() }
      return new Response(null, { status: 204 })
    }
    assert.equal(request.method, 'GET')
    return Response.json([row])
  })
})

describe('Resend cloud settings', () => {
  it('checks cloud settings with the .env source and empty account fields', async () => {
    const result = await handleResendSettings({
      method: 'GET',
      query: { supabaseUrl: '', supabaseKey: '' },
    })

    assert.deepEqual(result, { hasPassword: false, fromEmail: '', slots: [] })
    assert.deepEqual(requests, [{
      url: envCredentials.supabaseUrl,
      key: envCredentials.supabaseAnonKey,
      method: 'GET',
    }])
  })

  it('uses the selected account instead of the environment project', async () => {
    await handleResendSettings({
      method: 'GET',
      query: { supabaseUrl: ' https://account-project.supabase.co ', supabaseKey: ' test-account-key ' },
    })

    assert.deepEqual(requests, [{
      url: 'https://account-project.supabase.co',
      key: 'test-account-key',
      method: 'GET',
    }])
  })

  it('supports public runtime credentials when private defaults are absent', async () => {
    runtimeConfig = { public: { ...envCredentials } }
    await handleResendSettings({ method: 'GET' })
    assert.equal(requests[0].url, envCredentials.supabaseUrl)
    assert.equal(requests[0].key, envCredentials.supabaseAnonKey)
  })

  it('matches the browser project when public runtime settings override private defaults', async () => {
    runtimeConfig.public = {
      supabaseUrl: 'https://browser-project.supabase.co',
      supabaseAnonKey: 'test-browser-key',
    }
    await handleResendSettings({ method: 'GET' })
    assert.equal(requests[0].url, runtimeConfig.public.supabaseUrl)
    assert.equal(requests[0].key, runtimeConfig.public.supabaseAnonKey)
  })

  it('supports private runtime credentials when public defaults are absent', async () => {
    runtimeConfig = { ...envCredentials, public: {} }
    await handleResendSettings({ method: 'GET' })
    assert.equal(requests[0].url, envCredentials.supabaseUrl)
    assert.equal(requests[0].key, envCredentials.supabaseAnonKey)
  })

  it('uploads, unlocks, and updates settings using the .env source', async () => {
    const slots = [{ apiKey: 're_test-cloud-backup-key', toEmail: 'recipient@example.com' }]
    const uploaded = await handleResendSettings({
      method: 'PUT',
      body: { supabaseUrl: '', supabaseKey: '', newPassword: '1234', fromEmail: 'sender@example.com', slots },
    })
    assert.equal(uploaded.success, true)
    assert.equal(uploaded.hasPassword, true)
    assert.notEqual(uploaded.slots[0].apiKey, slots[0].apiKey)
    assert.notEqual(row.password_hash, '1234')
    assert.match(row.password_hash, /^scrypt:16384:[a-f0-9]{32}:[a-f0-9]{64}$/)

    const downloaded = await handleResendSettings({ method: 'POST', body: { password: '1234' } })
    assert.deepEqual(downloaded.slots, slots)

    await handleResendSettings({
      method: 'PUT',
      body: { password: '1234', newPassword: '5678', fromEmail: 'updated@example.com', slots },
    })
    await assert.rejects(
      handleResendSettings({ method: 'POST', body: { password: '1234' } }),
      { statusCode: 401 },
    )
    const updated = await handleResendSettings({ method: 'POST', body: { password: '5678' } })
    assert.equal(updated.fromEmail, 'updated@example.com')
    assert.deepEqual(updated.slots, slots)
    assert.ok(requests.every(({ url, key }) => url === envCredentials.supabaseUrl && key === envCredentials.supabaseAnonKey))
  })

  it('rejects missing configuration or incomplete account credentials before connecting', async () => {
    for (const method of ['GET', 'POST', 'PUT']) {
      for (const credentials of [
        { supabaseUrl: 'https://account-project.supabase.co' },
        { supabaseKey: 'test-account-key' },
      ]) {
        await assert.rejects(
          handleResendSettings({ method, query: credentials, body: credentials }),
          { statusCode: 400 },
        )
      }
    }
    runtimeConfig = { public: {} }
    await assert.rejects(handleResendSettings({ method: 'GET' }), { statusCode: 400 })
    assert.equal(requests.length, 0)
  })

  it('rejects incorrect passwords without exposing or changing saved slots', async () => {
    const credentials = { supabaseUrl: envCredentials.supabaseUrl, supabaseKey: envCredentials.supabaseAnonKey }
    const slots = [{ apiKey: 're_test-cloud-backup-key', toEmail: 'recipient@example.com' }]
    await handleResendSettings({ method: 'PUT', body: { ...credentials, newPassword: '1234', slots } })
    const saved = { ...row }

    for (const method of ['POST', 'PUT']) {
      await assert.rejects(
        handleResendSettings({ method, body: { ...credentials, password: 'wrong', slots: [] } }),
        { statusCode: 401 },
      )
      assert.deepEqual(row, saved)
    }
    const summary = await handleResendSettings({ method: 'GET', query: credentials })
    assert.notEqual(summary.slots[0].apiKey, slots[0].apiKey)
    assert.equal(summary.password_hash, undefined)
  })
})
