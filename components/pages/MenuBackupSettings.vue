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
import { computed, ref } from 'vue'
import { useStorage } from '../../composables/useStorage'
import { csvMenus, zipMenus } from '../../utils/menuBackup/catalog.js'
import { exportMenuBundle, getBackupFilename, importMenuBundle, summarize } from '../../utils/menuBackup/bundle.js'
import { isRemoteMediaUrl, resolveMediaFetchUrl } from '../../utils/zipMediaBundle.js'

const { uploadFile, getPublicUrl } = useStorage()
const open = ref(true)
const busy = ref(null)
const action = ref(null)
const progress = ref(null)
const results = ref(null)
const csvInputRef = ref(null)
const allInputRef = ref(null)

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
