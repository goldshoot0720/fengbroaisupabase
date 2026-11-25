import assert from 'node:assert/strict'
import { it } from 'node:test'

it('can switch to the environment, reload, and return to a saved account', async (t) => {
  const account = { id: 'work', friendlyName: '工作', supabaseUrl: 'https://example.invalid', supabaseAnonKey: 'test-key' }
  const entries = new Map([['feng-accounts', JSON.stringify({ accounts: [account] })]])
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value)
  } })

  const first = await import('../composables/useSettings.js?initial')
  // Older profiles may omit the active account field.
  assert.equal(first.getSupabaseCredentials().url, account.supabaseUrl)
  assert.equal(first.useSettings().switchAccount(null).success, true)

  const reload = await import('../composables/useSettings.js?reload')
  assert.equal(reload.getSupabaseCredentials(), null)
  const settings = reload.useSettings()
  settings.loadSettings()
  assert.equal(settings.activeAccountId.value, null)
  assert.deepEqual(settings.accounts.value, [account])
  assert.equal(settings.switchAccount('work').success, true)
  assert.equal(reload.getSupabaseCredentials().url, account.supabaseUrl)
  assert.deepEqual(JSON.parse(entries.get('feng-accounts')), { accounts: [account], activeId: 'work' })

  settings.switchAccount(null)
  settings.friendlyName.value = '第二個來源'
  settings.resendApiKey.value = 'fixture-key'
  settings.resendToEmail.value = 'test@example.invalid'
  assert.equal(settings.saveSettings().success, true)
  assert.equal(settings.activeAccount.value.resendApiKey, 'fixture-key')
  assert.equal(settings.activeAccount.value.resendToEmail, 'test@example.invalid')
})
