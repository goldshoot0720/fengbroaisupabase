<template>
  <section class="settings-section menu-backup-section">
    <button
      type="button"
      class="section-header section-header-toggle"
      :aria-expanded="open"
      @click="open = !open"
    >
      <div>
        <h2 class="section-title">選單備份／還原</h2>
        <p class="section-subtitle">一鍵匯出或匯入各選單 CSV；也可連同媒體 ZIP 一次打包</p>
      </div>
      <span class="section-chevron">{{ open ? '▾' : '▸' }}</span>
    </button>
    <div v-show="open" class="section-body">
      <p class="section-description">
        CSV 備份只含文字資料（不含圖片／影片等檔案）。全部選單會再附上圖片、影片、音樂、播客、文件、筆記的 ZIP。匯入時相同鍵會更新、其餘新增，不會刪除備份裡沒有的紀錄。
      </p>

      <div v-if="progress" class="backup-progress">
        <div class="backup-progress-row">
          <span>{{ progress.message }}</span>
          <span>{{ progress.current }}/{{ progress.total }}（{{ percent }}%）</span>
        </div>
        <div class="backup-progress-track">
          <div class="backup-progress-bar" :style="{ width: `${percent}%` }" />
        </div>
      </div>

      <div class="backup-grid">
        <div class="backup-card">
          <h3>所有 CSV 選單（不含 ZIP）</h3>
          <p>{{ csvCount }} 個選單：訂閱、食品、常用、銀行、例行、音樂／影片中繼資料、比價、新聞等。</p>
          <input
            ref="csvInputRef"
            type="file"
            accept=".zip,.csv,application/zip,text/csv"
            class="hidden-file"
            @change="onPickCsv"
          >
          <div class="backup-actions">
            <button type="button" class="btn-secondary" :disabled="Boolean(busy)" @click="runExport('csv')">
              {{ busy === 'csv' && action === 'export' ? '匯出中…' : '一鍵匯出 CSV' }}
            </button>
            <button type="button" class="btn-secondary" :disabled="Boolean(busy)" @click="csvInputRef?.click()">
              {{ busy === 'csv' && action === 'import' ? '匯入中…' : '一鍵匯入 CSV' }}
            </button>
          </div>
        </div>

        <div class="backup-card">
          <h3>所有選單（.csv + .zip）</h3>
          <p>上述 CSV，加上 {{ zipCount }} 個媒體 ZIP：圖片、影片、音樂、播客、文件、筆記。</p>
          <input
            ref="allInputRef"
            type="file"
            accept=".zip,application/zip"
            class="hidden-file"
            @change="onPickAll"
          >
          <div class="backup-actions">
            <button type="button" class="btn-secondary" :disabled="Boolean(busy)" @click="runExport('all')">
              {{ busy === 'all' && action === 'export' ? '匯出中…' : '一鍵匯出全部' }}
            </button>
            <button type="button" class="btn-secondary" :disabled="Boolean(busy)" @click="allInputRef?.click()">
              {{ busy === 'all' && action === 'import' ? '匯入中…' : '一鍵匯入全部' }}
            </button>
          </div>
        </div>
      </div>

      <div class="backup-card drive-card">
        <div class="drive-head">
          <h3>Google 雲端硬碟</h3>
          <span class="drive-status">{{ statusLabel }}</span>
        </div>
        <p>
          備份會上傳到你雲端硬碟的「{{ backupFolderLabel }}」資料夾。授權範圍只有
          <code>drive.file</code>：本站只看得到自己建立的檔案，以及你透過選取器明確挑選的檔案。
        </p>

        <div class="backup-actions">
          <button type="button" class="btn-secondary" :disabled="Boolean(busy) || driveBusy" @click="exportToDrive('csv')">
            {{ driveAction === 'export-csv' ? '上傳中…' : '匯出 CSV 到雲端硬碟' }}
          </button>
          <button type="button" class="btn-secondary" :disabled="Boolean(busy) || driveBusy" @click="exportToDrive('all')">
            {{ driveAction === 'export-all' ? '上傳中…' : '匯出全部到雲端硬碟' }}
          </button>
          <button type="button" class="btn-secondary" :disabled="Boolean(busy) || driveBusy" @click="importFromDrive()">
            {{ driveAction === 'import' ? '讀取中…' : '從雲端硬碟匯入' }}
          </button>
        </div>

        <button type="button" class="drive-toggle" @click="driveSettingsOpen = !driveSettingsOpen">
          {{ driveSettingsOpen ? '▾' : '▸' }} 連接設定（OAuth Client ID／API Key）
        </button>

        <div v-show="driveSettingsOpen" class="drive-settings">
          <p class="drive-hint">
            在 Google Cloud Console 建立「網頁應用程式」OAuth 用戶端與瀏覽器 API 金鑰，
            並把本站網域加入已授權的 JavaScript 來源／HTTP 參照網址限制。憑證存在
            <code>googledrivesettings</code> 表，解鎖與儲存都用鋒兄設定的「通知密碼」。
          </p>
          <label class="drive-field">
            <span>OAuth Client ID</span>
            <input v-model="driveClientId" type="text" placeholder="xxxxxxxx.apps.googleusercontent.com" autocomplete="off">
          </label>
          <label class="drive-field">
            <span>Browser API Key</span>
            <input v-model="driveApiKey" type="text" placeholder="AIza..." autocomplete="off">
          </label>
          <label class="drive-field">
            <span>通知密碼</span>
            <input v-model="drivePassword" type="password" placeholder="與 Resend 通知設定同一組" autocomplete="off">
          </label>
          <div class="backup-actions">
            <button type="button" class="btn-secondary" :disabled="driveBusy" @click="checkDriveCloud">檢查雲端設定</button>
            <button type="button" class="btn-secondary" :disabled="driveBusy" @click="unlockDriveCloud">解鎖顯示明文</button>
            <button type="button" class="btn-secondary" :disabled="driveBusy" @click="saveDriveCloud">儲存到雲端</button>
          </div>
          <p v-if="driveState.message" class="drive-message">{{ driveState.message }}</p>
        </div>
      </div>

      <div v-if="results?.length" class="backup-results">
        <p class="backup-results-title">上次結果</p>
        <ul>
          <li v-for="result in results" :key="`${result.id}-${result.label}`">
            <span>{{ result.label }}</span>
            <span :class="`is-${result.status}`">
              {{ result.status === 'ok' ? `${result.rows} 筆` : (result.message || result.status) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStorage } from '../../composables/useStorage'
import { csvMenus, zipMenus } from '../../utils/menuBackup/catalog.js'
import { exportMenuBundle, getBackupFilename, importMenuBundle, summarize } from '../../utils/menuBackup/bundle.js'
import { isRemoteMediaUrl, resolveMediaFetchUrl } from '../../utils/zipMediaBundle.js'
import { useGoogleDrive } from '../../composables/useGoogleDrive'
import {
  downloadBackupFromGoogleDrive,
  pickBackupFromGoogleDrive,
  uploadBackupToGoogleDrive,
} from '../../utils/googleDrive.js'

const { uploadFile, getPublicUrl } = useStorage()
const open = ref(true)
const busy = ref(null)
const action = ref(null)
const progress = ref(null)
const results = ref(null)
const csvInputRef = ref(null)
const allInputRef = ref(null)

const {
  driveState,
  backupFolderLabel,
  statusLabel,
  localClientId,
  localApiKey,
  loadCloudStatus,
  unlockFromCloud,
  saveToCloud,
  setMessage: setDriveMessage,
} = useGoogleDrive()

const driveSettingsOpen = ref(false)
const driveAction = ref(null)
const driveClientId = ref('')
const driveApiKey = ref('')
const drivePassword = ref('')
const driveBusy = computed(() => driveState.busy || Boolean(driveAction.value))

onMounted(() => {
  // 本機快取先進表單；雲端狀態只在展開連接設定時才去查，避免每次開設定頁都打 API。
  driveClientId.value = localClientId()
  driveApiKey.value = localApiKey()
})

const csvCount = csvMenus().length
const zipCount = zipMenus().length
const percent = computed(() => {
  if (!progress.value || !progress.value.total) return 0
  return Math.round((progress.value.current / progress.value.total) * 100)
})

const helpers = {
  uploadFile,
  resolveUrl: (value) => {
    if (!value) return ''
    if (isRemoteMediaUrl(value)) return value
    return resolveMediaFetchUrl(value, getPublicUrl)
  },
}

const onProgress = (update) => {
  progress.value = {
    stage: update.stage,
    current: update.current,
    total: update.total,
    message: update.message,
  }
}

const runExport = async (kind) => {
  if (busy.value) return
  busy.value = kind
  action.value = 'export'
  results.value = null
  progress.value = { stage: 'export', current: 0, total: 1, message: '準備匯出…' }
  try {
    const filename = getBackupFilename(kind)
    const run = await exportMenuBundle(kind, filename, helpers, onProgress)
    results.value = run.results
    window.alert(`匯出完成，已開始下載 ${filename}\n\n${summarize(run.results)}`)
  } catch (error) {
    window.alert(`匯出失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
  } finally {
    busy.value = null
    action.value = null
    progress.value = null
  }
}

const runImport = async (kind, file) => {
  if (busy.value) return
  const confirmText = kind === 'csv'
    ? `即將匯入 CSV 選單備份「${file.name}」。\n相同紀錄會更新、其餘新增；不會刪除備份裡沒有的資料。\n\n確定繼續？`
    : `即將匯入全部選單備份「${file.name}」（CSV + ZIP）。\n相同紀錄會更新、其餘新增；媒體檔會重新上傳，可能需要較長時間。\n\n確定繼續？`
  if (!window.confirm(confirmText)) return

  busy.value = kind
  action.value = 'import'
  results.value = null
  progress.value = { stage: 'import', current: 0, total: 1, message: '讀取備份…' }
  try {
    const run = await importMenuBundle(file, kind, helpers, onProgress)
    results.value = run.results
    window.alert(`匯入完成\n\n${summarize(run.results)}`)
  } catch (error) {
    window.alert(`匯入失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
  } finally {
    busy.value = null
    action.value = null
    progress.value = null
  }
}

const checkDriveCloud = async () => {
  const cloud = await loadCloudStatus()
  if (cloud) {
    driveClientId.value = driveClientId.value || cloud.clientId || ''
    driveApiKey.value = driveApiKey.value || cloud.apiKey || ''
    setDriveMessage(cloud.configured
      ? '雲端已有憑證，按「解鎖顯示明文」載入到這台裝置。'
      : '雲端尚未存過憑證，填好後按「儲存到雲端」。')
  }
}

const unlockDriveCloud = async () => {
  const full = await unlockFromCloud(drivePassword.value)
  if (full) {
    driveClientId.value = full.clientId || ''
    driveApiKey.value = full.apiKey || ''
  }
}

const saveDriveCloud = async () => {
  const clientId = String(driveClientId.value || '').trim()
  const apiKey = String(driveApiKey.value || '').trim()
  if (!clientId || !apiKey) {
    setDriveMessage('請同時填入 OAuth Client ID 與 Browser API Key。')
    return
  }
  await saveToCloud({ clientId, apiKey, password: drivePassword.value })
}

const exportToDrive = async (kind) => {
  if (busy.value || driveAction.value) return
  driveAction.value = `export-${kind}`
  results.value = null
  progress.value = { stage: 'export', current: 0, total: 1, message: '準備匯出…' }
  try {
    const filename = getBackupFilename(kind)
    // download: false —— 這條路徑的目的地是雲端硬碟，不需要再下載一份到本機。
    const run = await exportMenuBundle(kind, filename, helpers, onProgress, { download: false })
    results.value = run.results
    progress.value = { stage: 'export', current: 1, total: 1, message: `上傳 ${filename} 到雲端硬碟…` }
    const uploaded = await uploadBackupToGoogleDrive(run.blob, filename)
    window.alert(`已上傳到 Google 雲端硬碟\n${backupFolderLabel}／${uploaded.name || filename}\n\n${summarize(run.results)}`)
  } catch (error) {
    window.alert(`上傳失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
  } finally {
    driveAction.value = null
    progress.value = null
  }
}

const importFromDrive = async () => {
  if (busy.value || driveAction.value) return
  driveAction.value = 'import'
  try {
    const picked = await pickBackupFromGoogleDrive()
    if (!picked) return

    // 匯出檔名是 supabase-all-csv-*.zip / supabase-all-menus-*.zip，
    // 用它判斷要走哪一種匯入；認不出來就當成完整備份（CSV + ZIP）。
    const kind = /all-csv/i.test(picked.name) ? 'csv' : 'all'
    const blob = await downloadBackupFromGoogleDrive(picked.id)
    const file = new File([blob], picked.name, { type: blob.type || 'application/zip' })
    driveAction.value = null
    await runImport(kind, file)
  } catch (error) {
    window.alert(`從雲端硬碟匯入失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
  } finally {
    driveAction.value = null
  }
}

const onPickCsv = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) void runImport('csv', file)
}

const onPickAll = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (file) void runImport('all', file)
}
</script>

<style scoped>
.section-header-toggle {
  width: 100%;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.section-subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.section-chevron {
  color: var(--text-muted);
  font-size: 1.2rem;
}

.backup-progress {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
}

.backup-progress-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
}

.backup-progress-track {
  margin-top: 0.6rem;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  overflow: hidden;
}

.backup-progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.2s ease;
}

.backup-grid {
  display: grid;
  gap: 1rem;
}

@media (min-width: 720px) {
  .backup-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.backup-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: var(--bg-primary);
}

.backup-card h3 {
  margin: 0 0 0.4rem;
}

.backup-card p {
  margin: 0 0 0.8rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hidden-file {
  display: none;
}

.drive-card {
  margin-top: 1rem;
}

.drive-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.drive-head h3 {
  margin: 0 0 0.4rem;
}

.drive-status {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.drive-toggle {
  margin-top: 0.8rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
}

.drive-settings {
  margin-top: 0.8rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border-color);
  display: grid;
  gap: 0.6rem;
}

.drive-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.6;
}

.drive-field {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.drive-field input {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.drive-message {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.backup-results {
  margin-top: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  font-size: 0.85rem;
}

.backup-results-title {
  margin: 0 0 0.5rem;
  font-weight: 700;
}

.backup-results ul {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 12rem;
  overflow: auto;
}

.backup-results li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.2rem 0;
}

.is-ok { color: var(--success-text); }
.is-skipped { color: var(--text-muted); }
.is-error { color: var(--danger-text); }
</style>
