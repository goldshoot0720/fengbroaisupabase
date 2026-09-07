// utils/googleDrive.js
// 鋒兄設定「選單備份／還原」的 Google 雲端硬碟整合（純瀏覽器端）。
//
// 用 Google Identity Services 的 OAuth token client + Google Picker，兩支
// script 都是需要時才用 <script> 動態載入，不多裝 npm 套件。
// scope 只要 `drive.file`：本 app 只看得到自己建立的檔案，或使用者透過同一組
// OAuth client 的 Picker 明確挑選的檔案 —— 因此不會碰到 Google 的敏感權限審查。
//
// 對應 fengbroaiappwrite 的 lib/googleDrive.ts；差別只有備份資料夾名稱
// （OAuth／fengbroaisupabase）與憑證來源（googledrivesettings 表 + localStorage 快取）。

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const GAPI_SCRIPT_SRC = 'https://apis.google.com/js/api.js'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

/**
 * 備份放在 OAuth／fengbroaisupabase 之下，兩層：OAuth 資料夾可以一個 app 一個
 * 子資料夾，而不是每個 app 都往雲端硬碟根目錄丟檔案。
 */
const BACKUP_FOLDER_PATH = ['OAuth', 'fengbroaisupabase']

/** 顯示用字串，例如「OAuth／fengbroaisupabase」。 */
export const BACKUP_FOLDER_LABEL = BACKUP_FOLDER_PATH.join('／')

const CLIENT_ID_STORAGE_KEY = 'NUXT_PUBLIC_GOOGLE_CLIENT_ID'
const API_KEY_STORAGE_KEY = 'NUXT_PUBLIC_GOOGLE_API_KEY'

const isBrowser = () => typeof window !== 'undefined'

const readLocal = (key, fallback = '') => {
  if (!isBrowser()) return fallback
  try {
    return localStorage.getItem(key) || fallback || ''
  } catch {
    return fallback
  }
}

const writeLocal = (key, value) => {
  if (!isBrowser()) return
  try {
    const trimmed = String(value || '').trim()
    if (trimmed) localStorage.setItem(key, trimmed)
    else localStorage.removeItem(key)
  } catch {
    // ignore quota / private mode
  }
}

export const getGoogleClientId = (fallback = '') => readLocal(CLIENT_ID_STORAGE_KEY, fallback)
export const getGoogleApiKey = (fallback = '') => readLocal(API_KEY_STORAGE_KEY, fallback)
export const setGoogleClientId = (value) => {
  if (getGoogleClientId() !== String(value || '').trim()) cachedToken = null
  writeLocal(CLIENT_ID_STORAGE_KEY, value)
}
export const setGoogleApiKey = (value) => writeLocal(API_KEY_STORAGE_KEY, value)

/** 兩個憑證都有才算設定完成（上傳只要 client ID，Picker 還需要 API key）。 */
export const isGoogleDriveConfigured = () => Boolean(getGoogleClientId() && getGoogleApiKey())

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`無法載入 ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * 載入一支外部 script，並確認它真的把全域物件掛上去了。
 *
 * loader.pending 只在「載入中」時共用，settle 之後就清掉：script 載完卻沒有
 * 全域物件（被瀏覽器擴充功能或 CSP 擋掉、只回了空檔）時，下一次呼叫可以重試，
 * 而不是永遠沿用同一個壞掉的結果，讓呼叫端炸在 undefined 上。
 */
function ensureGoogleGlobal(loader, src, isReady, missingMessage, afterLoad) {
  if (!isBrowser()) return Promise.reject(new Error('僅支援瀏覽器環境'))
  if (isReady()) return Promise.resolve()
  if (!loader.pending) {
    loader.pending = loadScript(src)
      .then(() => afterLoad?.())
      .then(() => {
        if (!isReady()) throw new Error(missingMessage)
      })
      .finally(() => { loader.pending = null })
  }
  return loader.pending
}

const gisLoader = { pending: null }
function loadGoogleIdentityServices() {
  return ensureGoogleGlobal(
    gisLoader,
    GIS_SCRIPT_SRC,
    () => Boolean(window.google?.accounts?.oauth2),
    'Google 登入服務載入後仍無法使用，請確認沒有被瀏覽器擴充功能或網路環境擋下。',
  )
}

const pickerLoader = { pending: null }
function loadGooglePicker() {
  return ensureGoogleGlobal(
    pickerLoader,
    GAPI_SCRIPT_SRC,
    () => Boolean(window.google?.picker),
    'Google Picker 載入後仍無法使用，請確認沒有被瀏覽器擴充功能或網路環境擋下。',
    // gapi 本身缺席時要主動 reject：原本的 window.gapi?.load 會直接跳過
    // callback／onerror，讓這個 Promise 永遠不 settle，畫面卡在「讀取中…」。
    () => new Promise((resolve, reject) => {
      if (typeof window.gapi?.load !== 'function') {
        reject(new Error('無法載入 Google Picker'))
        return
      }
      window.gapi.load('picker', {
        callback: () => resolve(),
        onerror: () => reject(new Error('無法載入 Google Picker')),
      })
    }),
  )
}

let cachedToken = null

export const isGoogleDriveConnected = () => Boolean(cachedToken && cachedToken.expiresAt > Date.now())

export const disconnectGoogleDrive = () => { cachedToken = null }

/** 取得（或沿用快取的）drive.file 範圍 OAuth access token。 */
export async function requestGoogleDriveAccessToken(options = {}) {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error('尚未設定 Google Client ID，請先在鋒兄設定 → 選單備份／還原填入。')
  }
  if (!options.forcePrompt && cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken
  }

  await loadGoogleIdentityServices()

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error(response.error || '取得 Google 授權失敗'))
            return
          }
          cachedToken = { accessToken: response.access_token, expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000 }
          resolve(response.access_token)
        },
        error_callback: (error) => reject(new Error(error?.type || 'Google 授權視窗已關閉或無法開啟')),
      })
      tokenClient.requestAccessToken({ prompt: options.forcePrompt ? 'consent' : '' })
    } catch (error) {
      reject(error instanceof Error ? error : new Error('取得 Google 授權失敗'))
    }
  })
}

/** 在 parentId（根目錄用 "root"）底下找出或建立一個資料夾。 */
async function ensureFolder(accessToken, name, parentId) {
  // Drive 的查詢字串用單引號包住，名稱裡的單引號會提前結束字面值；
  // 這些名稱沒有單引號，還是先跳脫比較安全。
  const escapedName = name.replace(/'/g, "\\'")
  const query = encodeURIComponent(
    `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parentId}' in parents`
  )
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!listRes.ok) throw new Error(`查詢 Google 雲端硬碟資料夾失敗（HTTP ${listRes.status}），請重試`)
  const listData = await listRes.json()
  const existingId = listData?.files?.[0]?.id
  if (existingId) return existingId

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  if (!createRes.ok) throw new Error(`建立 Google 雲端硬碟「${name}」資料夾失敗`)
  const created = await createRes.json()
  return created.id
}

/**
 * 從雲端硬碟根目錄沿著 BACKUP_FOLDER_PATH 走，缺的就建。
 *
 * drive.file scope 只看得到本 app 自己建立的資料夾，所以使用者自己手動建的
 * 同名資料夾在這裡是隱形的，程式會另外建一個 —— 這是 scope 正常運作的結果，
 * 不該為了繞開它去要求更大的權限。
 */
async function ensureBackupFolderId(accessToken) {
  let parentId = 'root'
  for (const name of BACKUP_FOLDER_PATH) {
    parentId = await ensureFolder(accessToken, name, parentId)
  }
  return parentId
}

/** 把備份 blob 上傳到雲端硬碟的 OAuth／fengbroaisupabase 資料夾。 */
export async function uploadBackupToGoogleDrive(blob, filename) {
  const accessToken = await requestGoogleDriveAccessToken()
  const folderId = await ensureBackupFolderId(accessToken)

  const metadata = { name: filename, parents: [folderId] }
  const boundary = `fengbro-${Date.now()}`
  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  const mediaHeader = `--${boundary}\r\nContent-Type: ${blob.type || 'application/zip'}\r\n\r\n`
  const closing = `\r\n--${boundary}--`
  const body = new Blob([metadataPart, mediaHeader, blob, closing])

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody?.error?.message || `上傳到 Google 雲端硬碟失敗（HTTP ${response.status}）`)
  }
  return await response.json()
}

/** 開啟 Google Picker 讓使用者挑一個備份檔；取消時 resolve null。 */
export async function pickBackupFromGoogleDrive() {
  const apiKey = getGoogleApiKey()
  if (!apiKey) {
    throw new Error('尚未設定 Google API Key，請先在鋒兄設定 → 選單備份／還原填入。')
  }
  const accessToken = await requestGoogleDriveAccessToken()
  await loadGooglePicker()

  return new Promise((resolve, reject) => {
    try {
      const { picker } = window.google
      const view = new picker.DocsView(picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
      const instance = new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback((data) => {
          if (data.action === picker.Action.PICKED) {
            const doc = data.docs?.[0]
            resolve(doc ? { id: doc.id, name: doc.name } : null)
          } else if (data.action === picker.Action.CANCEL) {
            resolve(null)
          }
        })
        .build()
      instance.setVisible(true)
    } catch (error) {
      reject(error instanceof Error ? error : new Error('開啟 Google Picker 失敗'))
    }
  })
}

/** 下載雲端硬碟檔案內容為 Blob（挑檔之後用）。 */
export async function downloadBackupFromGoogleDrive(fileId) {
  const accessToken = await requestGoogleDriveAccessToken()
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error(`從 Google 雲端硬碟下載失敗（HTTP ${response.status}）`)
  return await response.blob()
}
