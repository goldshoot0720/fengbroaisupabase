// composables/useGoogleDrive.js
// googledrivesettings 表（跨裝置共用的 Google 憑證）與 utils/googleDrive.js
// （實際的 OAuth／Picker／上傳下載）之間的黏合層。
//
// localStorage 是本機快取，雲端是來源：載入成功就覆蓋快取，離線／表還沒建時
// 仍可只用本機憑證操作，不會擋住備份功能。

import { computed, reactive } from 'vue'
import { useSettings } from './useSettings'
import {
  BACKUP_FOLDER_LABEL,
  getGoogleApiKey,
  getGoogleClientId,
  isGoogleDriveConfigured,
  setGoogleApiKey,
  setGoogleClientId,
} from '../utils/googleDrive.js'

const API_PATH = '/api/settings/google-drive'

const state = reactive({
  loaded: false,
  busy: false,
  cloud: null, // { configured, clientId(遮蔽或明文), apiKey, hasClientId, hasApiKey, updatedAt }
  message: '',
})

const errorText = (error) =>
  error?.data?.statusMessage || error?.statusMessage || error?.message || '未知錯誤'

export function useGoogleDrive() {
  const { supabaseUrl, supabaseAnonKey } = useSettings()

  const auth = () => ({
    supabaseUrl: String(supabaseUrl?.value || '').trim(),
    supabaseKey: String(supabaseAnonKey?.value || '').trim(),
  })

  const setMessage = (text) => {
    state.message = text
    if (text && typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (state.message === text) state.message = ''
      }, 6000)
    }
  }

  const statusLabel = computed(() => {
    if (isGoogleDriveConfigured()) return '本機已設定'
    if (state.cloud?.configured) return '雲端已設定（尚未載入本機）'
    return '尚未設定'
  })

  /** 讀取雲端設定摘要（遮蔽值），不需要通知密碼。 */
  const loadCloudStatus = async () => {
    state.busy = true
    try {
      state.cloud = await $fetch(API_PATH, { method: 'GET', query: auth() })
      state.loaded = true
      return state.cloud
    } catch (error) {
      setMessage(`讀取雲端設定失敗：${errorText(error)}`)
      return null
    } finally {
      state.busy = false
    }
  }

  /** 用通知密碼解鎖明文憑證，寫入本機快取後即可直接使用。 */
  const unlockFromCloud = async (password) => {
    if (!password) {
      setMessage('請輸入通知密碼以解鎖顯示。')
      return null
    }
    state.busy = true
    try {
      const full = await $fetch(API_PATH, { method: 'POST', body: { ...auth(), password } })
      setGoogleClientId(full.clientId || '')
      setGoogleApiKey(full.apiKey || '')
      state.cloud = full
      state.loaded = true
      setMessage('已從雲端載入憑證並存入本機。')
      return full
    } catch (error) {
      setMessage(`解鎖失敗：${errorText(error)}`)
      return null
    } finally {
      state.busy = false
    }
  }

  /** 存進雲端（需通知密碼），同時更新本機快取。 */
  const saveToCloud = async ({ clientId, apiKey, password }) => {
    if (!password) {
      setMessage('請輸入通知密碼才能儲存。')
      return false
    }
    state.busy = true
    try {
      const result = await $fetch(API_PATH, {
        method: 'PUT',
        body: { ...auth(), password, clientId, apiKey },
      })
      setGoogleClientId(clientId)
      setGoogleApiKey(apiKey)
      state.cloud = result
      state.loaded = true
      setMessage('已儲存到雲端，其他裝置解鎖後即可共用。')
      return true
    } catch (error) {
      setMessage(`儲存失敗：${errorText(error)}`)
      return false
    } finally {
      state.busy = false
    }
  }

  return {
    driveState: state,
    backupFolderLabel: BACKUP_FOLDER_LABEL,
    statusLabel,
    localClientId: () => getGoogleClientId(),
    localApiKey: () => getGoogleApiKey(),
    setLocalCredentials: ({ clientId, apiKey }) => {
      setGoogleClientId(clientId)
      setGoogleApiKey(apiKey)
    },
    loadCloudStatus,
    unlockFromCloud,
    saveToCloud,
    setMessage,
  }
}
