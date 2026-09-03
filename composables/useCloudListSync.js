import { ref, watch } from 'vue'
import { getSupabaseBrowserClient, getSupabaseBrowserConfig } from './useSupabaseBrowserClient'

// 鋒兄工具個人清單的「雲端為主、本機為離線快取」同步。
// 與 Appwrite 版 useRemoteListSync 對應，但 supabase 端直接用瀏覽器
// client 讀寫一張通用表 toollistsync（sync_key 一列、payload JSONB）。
//
// 規則：
// - 首次成功載入：雲端有資料就以雲端覆蓋本機；雲端空白才把本機資料遷移上去。
// - 之後本機每次變更 debounce 400ms 寫回雲端（內容不變不重複寫）。
// - 表尚未建立或離線 → 保留本機資料繼續編輯，不阻斷操作。

const CLOUD_TABLE = 'toollistsync'

const isCloudUnavailableError = (err) => {
  const message = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`
  return (
    err?.code === 'PGRST205' ||
    err?.code === '42P01' ||
    err?.code === 'PGRST116' ||
    /Could not find the table .*toollistsync/i.test(message) ||
    /relation .*toollistsync.* does not exist/i.test(message)
  )
}

let currentCredentials = null

const initClient = () => {
  if (!process.client) return null
  const { credKey } = getSupabaseBrowserConfig()
  if (currentCredentials !== credKey) currentCredentials = credKey
  return getSupabaseBrowserClient()
}

const stringifyPayload = (value) => {
  try {
    return JSON.stringify(value ?? [])
  } catch {
    return '[]'
  }
}

/**
 * @param {object} options
 * @param {string} options.syncKey toollistsync 的 sync_key（例如 'finance-watchlist'）
 * @param {import('vue').Ref} options.target 要同步的 ref（陣列）
 * @param {() => unknown[]} options.readLocal 本機快取讀取（回 [] 表示無歷史）
 * @param {(value: unknown[]) => void} options.writeLocal 本機快取寫入
 * @param {(value: unknown) => unknown} [options.normalize] 雲端列載入時的正規化
 * @param {boolean} [options.enabled] 是否啟用（false 時不載入也不同步）
 */
export const useCloudListSync = (options) => {
  const {
    syncKey,
    target,
    readLocal,
    writeLocal,
    normalize = (value) => value,
    enabled = true,
  } = options

  const cloudReady = ref(false)
  const syncState = ref('idle') // idle | syncing | error
  const loadVersion = ref(0)
  // 首次雲端載入完成（成功或「空→遷移」）後才允許上傳。
  const loadedRemoteOnce = ref(false)
  // 防止 watch 上傳覆蓋剛由雲端載入寫入的值。
  const applyingRemote = ref(false)
  let debounceTimer = null
  let inFlight = false
  let pendingAfterInFlight = false

  const readCloudRow = async (client) => {
    const { data, error } = await client
      .from(CLOUD_TABLE)
      .select('payload')
      .eq('sync_key', syncKey)
      .limit(1)
    if (error) throw error
    return data?.[0]?.payload ?? null
  }

  const pushCloudRow = async (client, payload) => {
    const { data, error } = await client
      .from(CLOUD_TABLE)
      .select('sync_key')
      .eq('sync_key', syncKey)
      .limit(1)
    if (error) throw error
    if (data?.[0]) {
      const { error: updateError } = await client
        .from(CLOUD_TABLE)
        .update({ payload, updated_at: new Date().toISOString() })
        .eq('sync_key', syncKey)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await client
        .from(CLOUD_TABLE)
        .insert([{ sync_key: syncKey, payload }])
      if (insertError) throw insertError
    }
  }

  const uploadCurrent = async () => {
    if (!cloudReady.value || !loadedRemoteOnce.value || !enabled) return
    if (inFlight) {
      pendingAfterInFlight = true
      return
    }
    inFlight = true
    syncState.value = 'syncing'
    try {
      const client = initClient()
      if (!client) throw new Error('尚未連線 Supabase')
      await pushCloudRow(client, stringifyPayload(target.value))
      syncState.value = 'idle'
    } catch (err) {
      syncState.value = 'error'
      // 單次同步失敗不中斷；下次變更會重試。
    } finally {
      inFlight = false
      if (pendingAfterInFlight) {
        pendingAfterInFlight = false
        debounceTimer = setTimeout(uploadCurrent, 400)
      }
    }
  }

  /** 掛載時呼叫一次：雲端有資料覆蓋本機，雲端空白則遷移本機上雲。 */
  const hydrateFromCloud = async () => {
    if (!enabled || typeof window === 'undefined') return
    const client = initClient()
    if (!client) return
    try {
      const remote = await readCloudRow(client)
      cloudReady.value = true
      const remoteList = Array.isArray(remote) ? remote : null

      if (remoteList === null || remoteList.length === 0) {
        // 首次雲端啟用：保留本機資料，由同步引擎上傳。
        const local = readLocal()
        if (local.length > 0) {
          loadedRemoteOnce.value = true
          applyingRemote.value = true
          target.value = local.map(normalize).filter(Boolean)
          applyingRemote.value = false
          syncState.value = 'idle'
          loadVersion.value += 1
          await uploadCurrent()
          return
        }
        // 兩邊皆空：建立空列，之後由 watch 上傳。
        loadedRemoteOnce.value = true
        loadVersion.value += 1
        await uploadCurrent()
        return
      }

      applyingRemote.value = true
      target.value = remoteList.map(normalize).filter(Boolean)
      applyingRemote.value = false
      writeLocal(target.value)
      loadedRemoteOnce.value = true
      syncState.value = 'idle'
      loadVersion.value += 1
    } catch (err) {
      // 表尚未建立或離線：保留本機資料繼續編輯，不阻斷操作。
      if (!isCloudUnavailableError(err)) {
        console.error(`雲端清單 ${syncKey} 載入失敗:`, err)
      }
      cloudReady.value = false
      syncState.value = 'error'
      loadedRemoteOnce.value = false
    }
  }

  // 本機變更即同步（debounce 合併連續編輯）。
  watch(
    target,
    (next) => {
      if (!enabled || applyingRemote.value) return
      writeLocal(next)
      if (debounceTimer) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(uploadCurrent, 400)
    },
    { deep: true },
  )

  return {
    cloudReady,
    syncState,
    loadVersion,
    hydrateFromCloud,
  }
}
