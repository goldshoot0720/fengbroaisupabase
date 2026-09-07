import assert from 'node:assert/strict'
import { afterEach, it, mock } from 'node:test'
import { windowRange } from '../utils/resendExpiryCron.js'
import { buildResendEmailContent } from '../utils/notificationHelpers.js'
import { requestGoogleDriveAccessToken, setGoogleClientId, disconnectGoogleDrive } from '../utils/googleDrive.js'

afterEach(() => { mock.restoreAll(); disconnectGoogleDrive() })

it('uses the Taipei calendar date for the early morning cron, including year rollover', () => {
  assert.deepEqual(windowRange(2, new Date('2026-12-31T21:27:00Z')), { today: '2027-01-01', limit: '2027-01-03' })
})

it('describes catch-up email dates as a window', () => {
  assert.match(buildResendEmailContent('subscription', [{ id: 1, name: 'Example', nextdate: '2026-09-07' }]).subject, /2 天內到期/)
})

it('rejects a closed Google popup and does not reuse a token after changing client', async () => {
  const storage = new Map()
  globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  let closePopup = true
  let calls = 0
  globalThis.window = { google: { accounts: { oauth2: { initTokenClient: options => ({
    requestAccessToken() {
      calls++
      if (closePopup) options.error_callback({ type: 'popup_closed' })
      else options.callback({ access_token: `token-${calls}`, expires_in: 3600 })
    },
  }) } } } }
  setGoogleClientId('first.apps.googleusercontent.com')
  await assert.rejects(requestGoogleDriveAccessToken(), /popup_closed/)
  closePopup = false
  assert.equal(await requestGoogleDriveAccessToken(), 'token-2')
  assert.equal(await requestGoogleDriveAccessToken(), 'token-2')
  setGoogleClientId('second.apps.googleusercontent.com')
  assert.equal(await requestGoogleDriveAccessToken(), 'token-3')
})
