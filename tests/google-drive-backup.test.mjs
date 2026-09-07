import assert from 'node:assert/strict'
import { beforeEach, describe, it, mock } from 'node:test'

// utils/googleDrive.js is browser-only: it talks to Google Identity Services,
// the Picker, and the Drive REST API. Here window/document/localStorage are
// stubbed and fetch is mocked, so the folder walk, the multipart upload body
// and the token cache are asserted without a real Google account.

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

const CLIENT_ID = '918273645012-abcdefghijklmnop.apps.googleusercontent.com'
const API_KEY = 'AIzaSyD-EXAMPLE-browser-api-key-0001'

let store
let scripts
let tokenResponse
let tokenRequests
let folders
let nextFolderId
let requests
let pickerResponse
let uploadStatus
// false = script 載入成功但沒掛上全域物件（擴充功能／CSP 擋掉的樣子）。
let installGlobals

globalThis.localStorage = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => { store[key] = String(value) },
  removeItem: (key) => { delete store[key] },
}

globalThis.document = {
  querySelector: (selector) => scripts.find((src) => selector.includes(src)) || null,
  createElement: () => ({}),
  head: {
    appendChild: (script) => {
      scripts.push(script.src)
      // The real script defines its global before onload fires.
      if (script.src.includes('gsi/client') && installGlobals) installTokenClient()
      queueMicrotask(() => script.onload?.())
    },
  },
}

globalThis.window = { google: {}, gapi: null }

function installTokenClient() {
  window.google.accounts = {
    oauth2: {
      initTokenClient: (config) => {
        tokenRequests.push({ clientId: config.client_id, scope: config.scope })
        return {
          requestAccessToken: ({ prompt }) => {
            tokenRequests[tokenRequests.length - 1].prompt = prompt
            queueMicrotask(() => config.callback(tokenResponse))
          },
        }
      },
    },
  }
}

function installPicker() {
  window.google.picker = {
    ViewId: { DOCS: 'docs' },
    Action: { PICKED: 'picked', CANCEL: 'cancel' },
    DocsView: class {
      setIncludeFolders() { return this }
      setSelectFolderEnabled() { return this }
    },
    PickerBuilder: class {
      addView() { return this }
      setOAuthToken(token) { this.token = token; return this }
      setDeveloperKey(key) { this.key = key; return this }
      setCallback(callback) { this.callback = callback; return this }
      build() {
        return {
          setVisible: () => queueMicrotask(() => this.callback(pickerResponse)),
        }
      }
    },
  }
}

const {
  BACKUP_FOLDER_LABEL,
  disconnectGoogleDrive,
  downloadBackupFromGoogleDrive,
  getGoogleApiKey,
  getGoogleClientId,
  isGoogleDriveConfigured,
  isGoogleDriveConnected,
  pickBackupFromGoogleDrive,
  requestGoogleDriveAccessToken,
  setGoogleApiKey,
  setGoogleClientId,
  uploadBackupToGoogleDrive,
} = await import('../utils/googleDrive.js')

beforeEach(() => {
  mock.restoreAll()
  store = {}
  scripts = []
  tokenRequests = []
  tokenResponse = { access_token: 'test-access-token' }
  folders = new Map()
  nextFolderId = 0
  requests = []
  pickerResponse = { action: 'cancel' }
  uploadStatus = 200
  installGlobals = true
  window.google = {}
  installTokenClient()
  installPicker()
  disconnectGoogleDrive()
  setGoogleClientId(CLIENT_ID)
  setGoogleApiKey(API_KEY)

  mock.method(globalThis, 'fetch', async (input, init = {}) => {
    const url = new URL(input)
    const method = init.method || 'GET'
    const auth = init.headers?.Authorization
    requests.push({ url: `${url.origin}${url.pathname}`, method, auth, query: url.searchParams.get('q') })

    if (url.href.startsWith(DRIVE_UPLOAD)) {
      const body = await init.body.text()
      requests[requests.length - 1].body = body
      requests[requests.length - 1].contentType = init.headers['Content-Type']
      if (uploadStatus !== 200) {
        return Response.json({ error: { message: '配額不足' } }, { status: uploadStatus })
      }
      return Response.json({ id: 'uploaded-file', name: JSON.parse(body.match(/\{"name".*?\}/)[0]).name })
    }

    if (url.pathname.startsWith('/drive/v3/files/')) {
      const fileId = url.pathname.split('/').pop()
      if (fileId === 'missing') return new Response('not found', { status: 404 })
      return new Response('zip-bytes', { status: 200 })
    }

    if (method === 'GET') {
      // ensureFolder's lookup: name = '<name>' ... '<parent>' in parents
      const name = url.searchParams.get('q').match(/name = '([^']+)'/)[1]
      const parent = url.searchParams.get('q').match(/'([^']+)' in parents/)[1]
      const existing = folders.get(`${parent}/${name}`)
      return Response.json({ files: existing ? [{ id: existing, name }] : [] })
    }

    const created = JSON.parse(init.body)
    const id = `folder-${++nextFolderId}`
    folders.set(`${created.parents[0]}/${created.name}`, id)
    return Response.json({ id })
  })
})

const folderRequests = () => requests.filter((request) => request.url === DRIVE_FILES)

describe('Google credentials in localStorage', () => {
  it('round-trips the client ID and API key, trimming whitespace', () => {
    setGoogleClientId(`  ${CLIENT_ID}  `)
    setGoogleApiKey(`\n${API_KEY}\n`)

    assert.equal(getGoogleClientId(), CLIENT_ID)
    assert.equal(getGoogleApiKey(), API_KEY)
  })

  it('needs both credentials before it counts as configured', () => {
    assert.equal(isGoogleDriveConfigured(), true)

    setGoogleApiKey('')
    assert.equal(isGoogleDriveConfigured(), false)
    assert.equal(getGoogleApiKey(), '')

    setGoogleClientId('')
    assert.equal(isGoogleDriveConfigured(), false)
  })

  it('exposes the two-level backup folder as a display label', () => {
    assert.equal(BACKUP_FOLDER_LABEL, 'OAuth／fengbroaisupabase')
  })
})

describe('requestGoogleDriveAccessToken', () => {
  it('points at the settings screen when no client ID is saved', async () => {
    setGoogleClientId('')

    await assert.rejects(requestGoogleDriveAccessToken(), /尚未設定 Google Client ID/)
    assert.equal(tokenRequests.length, 0)
  })

  it('loads Google Identity Services once and asks only for drive.file', async () => {
    delete window.google.accounts
    const token = await requestGoogleDriveAccessToken()

    assert.equal(token, 'test-access-token')
    assert.deepEqual(scripts, ['https://accounts.google.com/gsi/client'])
    assert.equal(tokenRequests[0].clientId, CLIENT_ID)
    // drive.file keeps the app out of Google's restricted-scope review: it only
    // sees files this app created or the user picked.
    assert.equal(tokenRequests[0].scope, 'https://www.googleapis.com/auth/drive.file')
    assert.equal(isGoogleDriveConnected(), true)
  })

  it('reuses the cached token instead of prompting again', async () => {
    await requestGoogleDriveAccessToken()
    const second = await requestGoogleDriveAccessToken()

    assert.equal(second, 'test-access-token')
    assert.equal(tokenRequests.length, 1)
  })

  it('forces a fresh consent prompt when asked', async () => {
    await requestGoogleDriveAccessToken()
    tokenResponse = { access_token: 'second-token' }

    const token = await requestGoogleDriveAccessToken({ forcePrompt: true })

    assert.equal(token, 'second-token')
    assert.equal(tokenRequests.length, 2)
    assert.equal(tokenRequests[1].prompt, 'consent')
  })

  it('surfaces a denied authorization instead of hanging', async () => {
    tokenResponse = { error: 'access_denied' }

    await assert.rejects(requestGoogleDriveAccessToken(), /access_denied/)
    assert.equal(isGoogleDriveConnected(), false)
  })

  it('forgets the token on disconnect', async () => {
    await requestGoogleDriveAccessToken()
    disconnectGoogleDrive()

    assert.equal(isGoogleDriveConnected(), false)
  })

  it('names the blocked script instead of crashing, and retries afterwards', async () => {
    // 擴充功能／CSP 擋掉時，script 可能載入「成功」卻沒掛上 window.google.accounts。
    delete window.google.accounts
    installGlobals = false

    await assert.rejects(requestGoogleDriveAccessToken(), /Google 登入服務載入後仍無法使用/)

    // 失敗的載入不會被永久快取成功：script 恢復後下一次呼叫仍能取到 token。
    installGlobals = true
    scripts = []
    assert.equal(await requestGoogleDriveAccessToken(), 'test-access-token')
  })
})

describe('uploadBackupToGoogleDrive', () => {
  const backup = () => new Blob(['zip-bytes'], { type: 'application/zip' })

  it('does not create folders or upload when the folder lookup fails', async () => {
    const methods = []
    mock.method(globalThis, 'fetch', async (_url, init = {}) => {
      methods.push(init.method || 'GET')
      return new Response('unavailable', { status: 503 })
    })
    await assert.rejects(uploadBackupToGoogleDrive(backup(), 'backup.zip'), /HTTP 503/)
    assert.deepEqual(methods, ['GET'])
  })

  it('creates OAuth/fengbroaisupabase and uploads the backup into it', async () => {
    const result = await uploadBackupToGoogleDrive(backup(), 'fengbro-backup.zip')

    assert.equal(result.id, 'uploaded-file')
    assert.equal(folders.get('root/OAuth'), 'folder-1')
    assert.equal(folders.get('folder-1/fengbroaisupabase'), 'folder-2')

    const upload = requests.at(-1)
    assert.equal(upload.url, DRIVE_UPLOAD)
    assert.equal(upload.auth, 'Bearer test-access-token')
    assert.match(upload.contentType, /^multipart\/related; boundary=fengbro-\d+$/)
    assert.match(upload.body, /"name":"fengbro-backup\.zip"/)
    assert.match(upload.body, /"parents":\["folder-2"\]/)
    assert.match(upload.body, /zip-bytes/)
  })

  it('reuses folders it already created instead of making duplicates', async () => {
    await uploadBackupToGoogleDrive(backup(), 'first.zip')
    const afterFirst = folderRequests().filter((request) => request.method === 'POST').length
    requests = []

    await uploadBackupToGoogleDrive(backup(), 'second.zip')

    assert.equal(afterFirst, 2)
    assert.equal(folderRequests().filter((request) => request.method === 'POST').length, 0)
    assert.equal(folders.size, 2)
  })

  it('reports the message Google returned when the upload fails', async () => {
    uploadStatus = 403

    await assert.rejects(uploadBackupToGoogleDrive(backup(), 'fengbro-backup.zip'), /配額不足/)
  })
})

describe('pickBackupFromGoogleDrive', () => {
  it('points at the settings screen when no API key is saved', async () => {
    setGoogleApiKey('')

    await assert.rejects(pickBackupFromGoogleDrive(), /尚未設定 Google API Key/)
  })

  it('resolves the picked file', async () => {
    pickerResponse = { action: 'picked', docs: [{ id: 'drive-file-1', name: 'fengbro-backup.zip' }] }

    assert.deepEqual(await pickBackupFromGoogleDrive(), { id: 'drive-file-1', name: 'fengbro-backup.zip' })
  })

  it('resolves null when the user cancels', async () => {
    pickerResponse = { action: 'cancel' }

    assert.equal(await pickBackupFromGoogleDrive(), null)
  })

  it('rejects instead of hanging when the picker API never arrives', async () => {
    // gapi 缺席時要 reject：靜靜地不 settle 會讓「從雲端硬碟匯入」永遠停在讀取中。
    delete window.google.picker
    window.gapi = null

    await assert.rejects(pickBackupFromGoogleDrive(), /無法載入 Google Picker/)
  })
})

describe('downloadBackupFromGoogleDrive', () => {
  it('downloads the file content as a blob', async () => {
    const blob = await downloadBackupFromGoogleDrive('drive-file-1')

    assert.equal(await blob.text(), 'zip-bytes')
    assert.equal(requests.at(-1).url, `${DRIVE_FILES}/drive-file-1`)
    assert.equal(requests.at(-1).auth, 'Bearer test-access-token')
  })

  it('reports the HTTP status when the file is gone', async () => {
    await assert.rejects(downloadBackupFromGoogleDrive('missing'), /HTTP 404/)
  })
})
