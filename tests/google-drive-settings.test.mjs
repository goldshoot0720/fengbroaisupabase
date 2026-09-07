import assert from 'node:assert/strict'
import { beforeEach, describe, it, mock } from 'node:test'

// Same shape as resend-settings-cloud.test.mjs: supply Nitro's auto-imports and
// run the real route against the real Supabase SDK with a mocked fetch, so the
// shared notification password and the masking rules are exercised end to end.
let runtimeConfig
globalThis.defineEventHandler = (handler) => handler
globalThis.readBody = async (event) => event.body || {}
globalThis.getQuery = (event) => event.query || {}
globalThis.useRuntimeConfig = () => runtimeConfig
globalThis.createError = (options) => Object.assign(new Error(options.statusMessage), options)

const { default: handleGoogleDrive } = await import('../server/api/settings/google-drive.ts')
const { default: handleResendSettings } = await import('../server/api/notifications/resend-settings.ts')
const { hashNotificationPassword, maskCredential } = await import('../server/utils/settingsStore.js')

const envCredentials = {
  supabaseUrl: 'https://env-project.supabase.co',
  supabaseAnonKey: 'test-env-anon-key',
}

const CLIENT_ID = '918273645012-abcdefghijklmnop.apps.googleusercontent.com'
const API_KEY = 'AIzaSyD-EXAMPLE-browser-api-key-0001'

let driveRow
let resendRow
let requests

beforeEach(() => {
  mock.restoreAll()
  runtimeConfig = { ...envCredentials, public: { ...envCredentials } }
  driveRow = { rowkey: 'main', client_id: CLIENT_ID, api_key: API_KEY, updated_at: '2026-09-07T00:00:00.000Z' }
  resendRow = { rowkey: 'main', password_hash: hashNotificationPassword('1234'), from_email: '', slots_json: '[]' }
  requests = []

  mock.method(globalThis, 'fetch', async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    const table = url.pathname.replace('/rest/v1/', '')
    requests.push({ url: url.origin, key: request.headers.get('apikey'), method: request.method, table })

    const rowFor = () => (table === 'googledrivesettings' ? driveRow : resendRow)
    const setRow = (next) => {
      if (table === 'googledrivesettings') driveRow = next
      else resendRow = next
    }

    if (request.method === 'PATCH') {
      setRow({ ...rowFor(), ...await request.json() })
      return new Response(null, { status: 204 })
    }
    if (request.method === 'POST') {
      // ensureSettingsRow's insert-and-return path (.select().single()).
      const [inserted] = await request.json()
      setRow({ ...inserted })
      return Response.json(rowFor())
    }

    assert.equal(request.method, 'GET')
    return Response.json(rowFor() ? [rowFor()] : [])
  })
})

const auth = { supabaseUrl: envCredentials.supabaseUrl, supabaseKey: envCredentials.supabaseAnonKey }

describe('Google Drive connection settings', () => {
  it('returns masked credentials without a password', async () => {
    const result = await handleGoogleDrive({ method: 'GET', query: auth })

    assert.equal(result.configured, true)
    assert.equal(result.hasClientId, true)
    assert.equal(result.hasApiKey, true)
    assert.equal(result.updatedAt, '2026-09-07T00:00:00.000Z')
    assert.notEqual(result.clientId, CLIENT_ID)
    assert.notEqual(result.apiKey, API_KEY)
    assert.ok(result.clientId.includes('•'))
    assert.ok(result.apiKey.includes('•'))
  })

  it('reports "not configured" when only one credential is saved', async () => {
    driveRow = { rowkey: 'main', client_id: CLIENT_ID, api_key: '' }

    const result = await handleGoogleDrive({ method: 'GET', query: auth })

    assert.equal(result.configured, false)
    assert.equal(result.hasClientId, true)
    assert.equal(result.hasApiKey, false)
    assert.equal(result.apiKey, '')
  })

  it('creates the main row when the table is still empty', async () => {
    driveRow = null

    const result = await handleGoogleDrive({ method: 'GET', query: auth })

    assert.equal(result.configured, false)
    assert.equal(driveRow.rowkey, 'main')
    assert.deepEqual(
      requests.filter((request) => request.table === 'googledrivesettings').map((request) => request.method),
      ['GET', 'POST'],
    )
  })

  it('unlocks the plaintext credentials with the notification password', async () => {
    const result = await handleGoogleDrive({ method: 'POST', body: { ...auth, password: '1234' } })

    assert.equal(result.clientId, CLIENT_ID)
    assert.equal(result.apiKey, API_KEY)
    assert.equal(result.configured, true)
  })

  it('rejects a wrong password with 401 and keeps the credentials hidden', async () => {
    await assert.rejects(
      handleGoogleDrive({ method: 'POST', body: { ...auth, password: 'wrong' } }),
      { statusCode: 401 },
    )
    await assert.rejects(
      handleGoogleDrive({ method: 'PUT', body: { ...auth, password: 'wrong', clientId: 'x', apiKey: 'y' } }),
      { statusCode: 401 },
    )
    assert.equal(driveRow.client_id, CLIENT_ID)
  })

  it('asks for the notification password to be created first when none exists', async () => {
    resendRow.password_hash = ''

    await assert.rejects(
      handleGoogleDrive({ method: 'POST', body: { ...auth, password: '1234' } }),
      { statusCode: 400 },
    )
  })

  it('shares one password with the Resend settings route', async () => {
    // 通知密碼只有一組：改在 Resend 那邊，Google 雲端硬碟這邊立刻跟著改。
    await handleResendSettings({
      method: 'PUT',
      body: { ...auth, password: '1234', newPassword: '5678', fromEmail: 'sender@example.com', slots: [] },
    })

    await assert.rejects(
      handleGoogleDrive({ method: 'POST', body: { ...auth, password: '1234' } }),
      { statusCode: 401 },
    )
    const unlocked = await handleGoogleDrive({ method: 'POST', body: { ...auth, password: '5678' } })
    assert.equal(unlocked.clientId, CLIENT_ID)
  })

  it('saves new credentials and returns them unmasked', async () => {
    const next = { clientId: '111111111111-newclient.apps.googleusercontent.com', apiKey: 'AIzaSyNEW-browser-key-0002' }

    const result = await handleGoogleDrive({ method: 'PUT', body: { ...auth, password: '1234', ...next } })

    assert.equal(result.success, true)
    assert.equal(result.clientId, next.clientId)
    assert.equal(result.apiKey, next.apiKey)
    assert.equal(driveRow.client_id, next.clientId)
    assert.equal(driveRow.api_key, next.apiKey)
    assert.notEqual(driveRow.updated_at, '2026-09-07T00:00:00.000Z')
  })

  it('trims whitespace pasted around the credentials', async () => {
    await handleGoogleDrive({
      method: 'PUT',
      body: { ...auth, password: '1234', clientId: `  ${CLIENT_ID}  `, apiKey: `\n${API_KEY}\t` },
    })

    assert.equal(driveRow.client_id, CLIENT_ID)
    assert.equal(driveRow.api_key, API_KEY)
  })

  it('refuses to write back a masked value from the settings screen', async () => {
    const saved = { ...driveRow }

    for (const body of [
      { clientId: maskCredential(CLIENT_ID), apiKey: API_KEY },
      { clientId: CLIENT_ID, apiKey: maskCredential(API_KEY) },
    ]) {
      await assert.rejects(
        handleGoogleDrive({ method: 'PUT', body: { ...auth, password: '1234', ...body } }),
        { statusCode: 400 },
      )
      assert.deepEqual(driveRow, saved)
    }
  })

  it('rejects half-filled account credentials before connecting to any project', async () => {
    for (const method of ['GET', 'POST', 'PUT']) {
      for (const credentials of [{ supabaseUrl: auth.supabaseUrl }, { supabaseKey: auth.supabaseKey }]) {
        await assert.rejects(
          handleGoogleDrive({ method, query: credentials, body: { ...credentials, password: '1234' } }),
          { statusCode: 400 },
        )
      }
    }
    assert.equal(requests.length, 0)
  })

  it('falls back to the runtime config project when no account is selected', async () => {
    await handleGoogleDrive({ method: 'GET', query: { supabaseUrl: '', supabaseKey: '' } })

    assert.equal(requests[0].url, envCredentials.supabaseUrl)
    assert.equal(requests[0].key, envCredentials.supabaseAnonKey)
  })

  it('rejects unsupported methods', async () => {
    await assert.rejects(handleGoogleDrive({ method: 'DELETE', body: auth }), { statusCode: 405 })
  })
})

describe('maskCredential', () => {
  it('keeps the recognizable head and tail of a long credential', () => {
    assert.equal(maskCredential('AIzaSyD-EXAMPLE-key-0001'), 'AIzaSy••••••••y-0001')
  })

  it('hides a short value entirely and leaves an empty one empty', () => {
    assert.equal(maskCredential('short'), '••••••••')
    assert.equal(maskCredential(''), '')
    assert.equal(maskCredential(null), '')
  })
})
