<template>
  <PageContainer>
    <div class="reinstall-page">
      <p class="page-lead">
        整理 Windows 與 Mac 重灌時需要的軟體、網站和授權資訊；付費序號預設隱藏，可另設查看密碼。訂閱制軟體可記下週期與費用。可用 CSV 匯出備份或批次匯入。
      </p>

      <div class="actions-bar">
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋服務、網站或備註"
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <select v-model="systemFilter" class="filter-select" aria-label="篩選使用系統">
          <option value="all">全部系統</option>
          <option v-for="option in REINSTALL_SYSTEM_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="softwareFilter" class="filter-select" aria-label="篩選軟體類型">
          <option value="all">全部軟體類型</option>
          <option v-for="option in REINSTALL_SOFTWARE_TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model="subscriptionFilter" class="filter-select" aria-label="篩選訂閱制">
          <option value="all">全部訂閱狀態</option>
          <option value="yes">訂閱制</option>
          <option value="no">非訂閱制</option>
        </select>
        <div class="csv-actions">
          <button type="button" class="btn-export" :disabled="busy" title="匯出目前全部重灌軟體為 CSV（含序號與查看密碼）" @click="exportToCsv">匯出 CSV</button>
          <label class="btn-import" title="從 CSV 匯入重灌軟體（相同服務名稱與系統會更新）">
            匯入 CSV
            <input ref="csvFileInput" type="file" accept=".csv,text/csv" style="display:none" @change="handleCsvFileSelect" />
          </label>
          <button type="button" class="btn-primary" :disabled="busy || reinstallLoading" @click="openCreateForm">新增軟體</button>
        </div>
      </div>

      <div class="summary-bar" aria-label="重灌摘要">
        <BulkSelectionControls
          :selection-mode="isSelectionMode"
          :is-all-selected="isAllSelected"
          :selected-count="selectedCount"
          :visible-count="filteredItems.length"
          :disabled="busy"
          @select-all="selectAllForDelete"
          @clear="exitSelectionMode"
          @delete-selected="requestBulkDelete"
        />
        <span>全部軟體 {{ reinstalls.length }}</span>
        <span>Windows {{ windowsCount }}</span>
        <span>Mac {{ macCount }}</span>
        <span>付費序號 {{ serialCount }}</span>
      </div>

      <form v-if="formOpen" id="reinstall-form" class="record-form" @submit.prevent="handleSubmit">
        <h2>{{ editingId ? '編輯重灌軟體' : '新增重灌軟體' }}</h2>
        <p class="form-hint">儲存安裝時真正需要找到的資訊。付費序號與查看密碼都不會預設攤開。</p>
        <fieldset :disabled="busy" class="form-grid">
          <label class="field">
            <span>服務名稱 <em>*</em></span>
            <input id="reinstall-name" v-model="form.name" type="text" maxlength="100" placeholder="例如 7-Zip、Adobe Acrobat" required />
          </label>
          <label class="field">
            <span>使用系統</span>
            <select v-model="form.system">
              <option v-for="option in REINSTALL_SYSTEM_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="field">
            <span>軟體類型</span>
            <select v-model="form.softwareType">
              <option v-for="option in REINSTALL_SOFTWARE_TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="field">
            <span>訂閱制軟體</span>
            <select :value="form.subscriptionSoftware ? 'yes' : 'no'" @change="form.subscriptionSoftware = $event.target.value === 'yes'">
              <option value="no">否</option>
              <option value="yes">是</option>
            </select>
          </label>
          <label v-if="form.subscriptionSoftware" class="field">
            <span>訂閱週期</span>
            <span class="period-row">
              <input
                id="reinstall-subscription-period"
                v-model.number="form.subscriptionPeriodCount"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
              />
              <select v-model="form.subscriptionPeriodUnit" aria-label="訂閱週期單位">
                <option v-for="option in REINSTALL_PERIOD_UNIT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </span>
          </label>
          <label v-if="form.subscriptionSoftware" class="field">
            <span>訂閱費用</span>
            <span class="period-row">
              <input
                id="reinstall-subscription-price"
                v-model.number="form.subscriptionPrice"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
              />
              <select v-model="form.subscriptionCurrency" aria-label="訂閱費用幣別">
                <option v-for="option in REINSTALL_CURRENCY_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </span>
          </label>
          <label class="field">
            <span>授權方式</span>
            <select v-model="form.licenseType" @change="onLicenseTypeChange">
              <option v-for="option in REINSTALL_LICENSE_TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label v-if="form.licenseType === 'paid_serial'" class="field">
            <span>付費序號</span>
            <span class="secret-row">
              <input
                id="reinstall-serial"
                v-model="form.serial"
                :type="showFormSerial ? 'text' : 'password'"
                maxlength="500"
                placeholder="輸入序號"
                autocomplete="off"
              />
              <button type="button" class="btn-ghost" @click="showFormSerial = !showFormSerial">
                {{ showFormSerial ? '隱藏' : '顯示' }}
              </button>
            </span>
          </label>
          <label v-if="form.licenseType === 'paid_serial'" class="field">
            <span>查看密碼</span>
            <span class="secret-row">
              <input
                id="reinstall-view-password"
                v-model="form.viewPassword"
                :type="showFormViewPassword ? 'text' : 'password'"
                maxlength="100"
                placeholder="選填，清單顯示序號時需輸入"
                autocomplete="off"
              />
              <button type="button" class="btn-ghost" @click="showFormViewPassword = !showFormViewPassword">
                {{ showFormViewPassword ? '隱藏' : '顯示' }}
              </button>
            </span>
          </label>
          <label class="field">
            <span>軟體網站</span>
            <input id="reinstall-site" v-model="form.site" type="url" maxlength="2000" placeholder="https://example.com" />
          </label>
          <label class="field field-wide">
            <span>備註</span>
            <textarea v-model="form.note" maxlength="3337" rows="3" placeholder="安裝順序、登入方式、下載版本或其他提醒"></textarea>
          </label>
        </fieldset>
        <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>
        <div class="form-actions">
          <button type="button" class="btn-ghost" :disabled="saving" @click="closeForm">取消</button>
          <button type="submit" class="btn-primary" :disabled="busy">{{ saving ? '儲存中…' : editingId ? '儲存變更' : '新增軟體' }}</button>
        </div>
      </form>

      <div v-if="importPreview" class="import-preview" role="dialog" aria-labelledby="reinstall-import-title">
        <h2 id="reinstall-import-title">匯入 CSV 預覽</h2>
        <p v-if="importPreview.errors.length">發現 {{ importPreview.errors.length }} 筆格式錯誤，不會寫入任何資料。</p>
        <p v-else>將匯入 {{ importPreview.data.length }} 筆；相同服務名稱與系統會更新，其餘新增。</p>
        <ul v-if="importPreview.errors.length" class="import-errors">
          <li v-for="(item, index) in importPreview.errors.slice(0, 8)" :key="index">{{ item }}</li>
        </ul>
        <p v-if="importResult">成功 {{ importResult.successCount }}，失敗 {{ importResult.failCount }}</p>
        <p v-else-if="importing">匯入中 {{ importProgress.current }} / {{ importProgress.total }}</p>
        <div class="form-actions">
          <button type="button" class="btn-ghost" :disabled="importing" @click="closeImportPreview">取消</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="importing || importPreview.data.length === 0 || importPreview.errors.length > 0"
            @click="executeImport"
          >確認匯入</button>
        </div>
      </div>

      <div v-if="reinstallError" class="load-error" role="alert">
        <p><strong>無法載入重灌資料</strong></p>
        <p>{{ reinstallError }}</p>
        <button v-if="reinstallError.includes('reinstall')" type="button" class="btn-ghost" @click="setCurrentPage('settings')">前往鋒兄設定</button>
      </div>
      <p v-else-if="!formOpen && actionError" class="action-error" role="alert">{{ actionError }}</p>

      <div v-if="reinstallLoading && reinstalls.length === 0" class="loading">載入重灌清單…</div>
      <EmptyState
        v-else-if="!reinstallError && filteredItems.length === 0"
        icon="💻"
        :title="reinstalls.length === 0 ? '尚無重灌軟體' : '沒有符合條件的軟體'"
        :description="reinstalls.length === 0 ? '先加入第一套軟體，建立下一次重灌可以照著走的清單。' : '調整搜尋文字、系統或軟體類型後再試一次。'"
      >
        <template v-if="reinstalls.length === 0" #action>
          <button type="button" class="btn-primary" @click="openCreateForm">新增第一套</button>
        </template>
      </EmptyState>

      <div v-else class="software-table-wrap">
        <table class="software-table">
          <thead>
            <tr>
              <th v-if="isSelectionMode" class="col-check"></th>
              <th>服務名稱</th>
              <th>系統</th>
              <th>軟體類型</th>
              <th>序號</th>
              <th>網站／備註</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td v-if="isSelectionMode" class="col-check">
                <input type="checkbox" :checked="selectedIds.has(item.id)" @change="toggleSelect(item.id)" :aria-label="`選取 ${item.name}`">
              </td>
              <td data-label="服務名稱"><strong>{{ item.name }}</strong></td>
              <td data-label="系統">
                <Badge variant="info" size="sm">{{ optionLabel(REINSTALL_SYSTEM_OPTIONS, item.system) }}</Badge>
              </td>
              <td data-label="軟體類型">
                <div class="type-stack">
                  <div class="serial-meta">
                    <Badge :variant="softwareBadge(item.softwareType)" size="sm">{{ optionLabel(REINSTALL_SOFTWARE_TYPE_OPTIONS, item.softwareType) }}</Badge>
                    <Badge v-if="item.subscriptionSoftware" variant="warning" size="sm">訂閱制</Badge>
                  </div>
                  <p v-if="item.subscriptionSoftware" class="subscription-meta">
                    {{ reinstallSubscriptionPeriodLabel(item.subscriptionPeriod) }} · {{ formatReinstallFee(item.subscriptionPrice, item.subscriptionCurrency || 'TWD') }}
                  </p>
                </div>
              </td>
              <td data-label="序號">
                <template v-if="item.licenseType === 'paid_serial'">
                  <div class="serial-meta">
                    <Badge variant="warning" size="sm">付費序號</Badge>
                    <Badge v-if="item.viewPassword?.trim()" variant="info" size="sm">需查看密碼</Badge>
                  </div>
                  <div class="serial-row">
                    <code>{{ item.serial ? (revealedIds.has(item.id) ? item.serial : '•••• •••• ••••') : '尚未填序號' }}</code>
                    <button
                      v-if="item.serial"
                      type="button"
                      class="btn-ghost"
                      :aria-label="revealedIds.has(item.id) ? `隱藏 ${item.name} 序號` : `顯示 ${item.name} 序號`"
                      :aria-pressed="revealedIds.has(item.id)"
                      @click="requestRevealSerial(item)"
                    >{{ revealedIds.has(item.id) ? '隱藏' : '顯示' }}</button>
                  </div>
                </template>
                <Badge v-else variant="default" size="sm">無序號</Badge>
              </td>
              <td data-label="網站／備註">
                <a v-if="safeSoftwareUrl(item.site)" :href="safeSoftwareUrl(item.site)" target="_blank" rel="noopener noreferrer">開啟網站</a>
                <span v-else class="muted">未填網站</span>
                <p class="note">{{ item.note?.trim() || '—' }}</p>
              </td>
              <td data-label="操作" class="row-actions">
                <button type="button" class="btn-icon" :disabled="busy" @click="openEditForm(item)">編輯</button>
                <button type="button" class="btn-icon danger" :disabled="busy" @click="requestDelete(item)">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="security-note">付費序號只在主動顯示後才會出現；若有設定查看密碼，需先輸入正確密碼。切換頁面後會再次隱藏。這只是畫面遮罩，不是加密保管庫。CSV 匯出會包含序號與查看密碼，請妥善保管檔案。</p>

      <BaseModal v-model="revealOpen" title="輸入查看密碼" size="sm">
        <p>顯示「{{ pendingReveal?.name }}」的付費序號前，請輸入這筆紀錄的查看密碼。</p>
        <form class="reveal-form" @submit.prevent="confirmRevealSerial">
          <label class="field">
            <span>查看密碼</span>
            <input
              ref="revealInput"
              v-model="revealPassword"
              type="password"
              autocomplete="off"
              placeholder="輸入查看密碼"
              @input="revealError = ''"
            />
          </label>
          <p v-if="revealError" class="action-error" role="alert">{{ revealError }}</p>
          <div class="form-actions">
            <button type="button" class="btn-ghost" @click="closeRevealDialog">取消</button>
            <button type="submit" class="btn-primary">顯示序號</button>
          </div>
        </form>
      </BaseModal>

      <ConfirmDialog
        v-model="deleteOpen"
        title="確認刪除"
        :message="deleteMessage"
        confirm-text="確認刪除"
        cancel-text="取消"
        confirm-variant="danger"
        @confirm="confirmDelete"
        @cancel="pendingDelete = null"
      />
    </div>
  </PageContainer>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useReinstalls } from '../../composables/useReinstalls'
import { useNavigation } from '../../composables/useNavigation'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import { useSelectionSet } from '../../composables/useSelectionSet'
import BulkSelectionControls from '../ui/BulkSelectionControls.vue'
import {
  REINSTALL_CURRENCY_OPTIONS,
  REINSTALL_LICENSE_TYPE_OPTIONS,
  REINSTALL_PERIOD_UNIT_OPTIONS,
  REINSTALL_SOFTWARE_TYPE_OPTIONS,
  REINSTALL_SYSTEM_OPTIONS,
  emptyReinstallSoftwareForm,
  filterReinstallSoftware,
  formatReinstallFee,
  matchesReinstallViewPassword,
  optionLabel,
  reinstallSubscriptionPeriodLabel,
  safeSoftwareUrl,
  toReinstallSoftwareForm,
} from '../../utils/managementRecords'
import { buildReinstallCsv, parseReinstallCsv } from '../../utils/reinstallCsv'

const {
  reinstalls,
  reinstallLoading,
  reinstallError,
  loadReinstalls,
  addReinstall,
  updateReinstall,
  deleteReinstall,
  importReinstalls,
} = useReinstalls()
const { setCurrentPage } = useNavigation()

const searchQuery = ref('')
const systemFilter = ref('all')
const softwareFilter = ref('all')
const subscriptionFilter = ref('all')
const { recentSearches, applyRecentSearch, removeRecentSearch, clearRecentSearches, commitSearchHistory } =
  useRecentSearchHistory('feng-reinstall-searches', searchQuery)

const formOpen = ref(false)
const editingId = ref(null)
const form = ref(emptyReinstallSoftwareForm())
const showFormSerial = ref(false)
const showFormViewPassword = ref(false)
const saving = ref(false)
const actionError = ref('')
const revealedIds = ref(new Set())
const pendingDelete = ref(null)
const pendingReveal = ref(null)
const revealPassword = ref('')
const revealError = ref('')
const revealInput = ref(null)
const csvFileInput = ref(null)
const importPreview = ref(null)
const importResult = ref(null)
const importing = ref(false)
const importProgress = ref({ current: 0, total: 0 })
let importCloseTimer = null

const busy = computed(() => saving.value || importing.value)
const filteredItems = computed(() =>
  filterReinstallSoftware(
    reinstalls.value,
    searchQuery.value,
    systemFilter.value,
    softwareFilter.value,
    subscriptionFilter.value,
  ),
)
const {
  isSelectionMode,
  selectedIds,
  selectedCount,
  isAllSelected,
  selectedItems,
  toggleSelect,
  selectAllForDelete,
  exitSelectionMode,
} = useSelectionSet(filteredItems)
const windowsCount = computed(() => reinstalls.value.filter((item) => item.system === 'win').length)
const macCount = computed(() => reinstalls.value.filter((item) => item.system === 'mac').length)
const serialCount = computed(() => reinstalls.value.filter((item) => item.licenseType === 'paid_serial').length)
const deleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value) => { if (!value) pendingDelete.value = null },
})
const revealOpen = computed({
  get: () => pendingReveal.value !== null,
  set: (value) => { if (!value) closeRevealDialog() },
})
const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''
  return `確定刪除「${pendingDelete.value.name}／${optionLabel(REINSTALL_SYSTEM_OPTIONS, pendingDelete.value.system)}」？此操作無法復原。`
})

watch(pendingReveal, async (value) => {
  if (!value) return
  await nextTick()
  revealInput.value?.focus()
})

onMounted(() => {
  loadReinstalls()
})

const softwareBadge = (type) => {
  if (type === 'free') return 'success'
  if (type === 'trial') return 'warning'
  return 'info'
}

const onLicenseTypeChange = () => {
  if (form.value.licenseType === 'none') {
    form.value.serial = ''
    form.value.viewPassword = ''
  }
  showFormSerial.value = false
  showFormViewPassword.value = false
}

const openCreateForm = () => {
  editingId.value = null
  form.value = emptyReinstallSoftwareForm()
  showFormSerial.value = false
  showFormViewPassword.value = false
  actionError.value = ''
  formOpen.value = true
}

const openEditForm = (item) => {
  editingId.value = item.id
  form.value = toReinstallSoftwareForm(item)
  showFormSerial.value = false
  showFormViewPassword.value = false
  actionError.value = ''
  formOpen.value = true
}

const closeForm = () => {
  formOpen.value = false
  editingId.value = null
  form.value = emptyReinstallSoftwareForm()
  showFormSerial.value = false
  showFormViewPassword.value = false
  actionError.value = ''
}

const handleSubmit = async () => {
  if (busy.value) return
  saving.value = true
  actionError.value = ''
  try {
    const payload = form.value.licenseType === 'none'
      ? { ...form.value, serial: '', viewPassword: '' }
      : form.value
    const result = editingId.value
      ? await updateReinstall(editingId.value, payload)
      : await addReinstall(payload)
    if (!result.success) {
      actionError.value = result.error || '儲存失敗，請稍後再試。'
      return
    }
    revealedIds.value = new Set()
    closeForm()
  } finally {
    saving.value = false
  }
}

const requestDelete = (item) => {
  actionError.value = ''
  pendingDelete.value = item
}

const requestBulkDelete = async () => {
  if (!selectedCount.value) return
  if (!window.confirm(`確定刪除選取的 ${selectedCount.value} 套重灌軟體？此操作無法復原。`)) return
  actionError.value = ''
  for (const item of selectedItems.value) {
    const result = await deleteReinstall(item.id)
    if (!result.success) actionError.value = result.error || '部分刪除失敗，請稍後再試。'
  }
  exitSelectionMode()
}

const confirmDelete = async () => {
  const item = pendingDelete.value
  if (!item) return
  const result = await deleteReinstall(item.id)
  if (!result.success) {
    actionError.value = result.error || '刪除失敗，請確認連線後再試一次。'
    return
  }
  if (editingId.value === item.id) closeForm()
  const next = new Set(revealedIds.value)
  next.delete(item.id)
  revealedIds.value = next
  pendingDelete.value = null
}

const hideSerial = (id) => {
  const next = new Set(revealedIds.value)
  next.delete(id)
  revealedIds.value = next
}

const revealSerial = (id) => {
  revealedIds.value = new Set(revealedIds.value).add(id)
}

const requestRevealSerial = (item) => {
  if (revealedIds.value.has(item.id)) {
    hideSerial(item.id)
    return
  }
  if ((item.viewPassword || '').trim()) {
    pendingReveal.value = item
    revealPassword.value = ''
    revealError.value = ''
    return
  }
  revealSerial(item.id)
}

const closeRevealDialog = () => {
  pendingReveal.value = null
  revealPassword.value = ''
  revealError.value = ''
}

const confirmRevealSerial = () => {
  if (!pendingReveal.value) return
  if (!matchesReinstallViewPassword(pendingReveal.value.viewPassword, revealPassword.value)) {
    revealError.value = '查看密碼不正確'
    return
  }
  revealSerial(pendingReveal.value.id)
  closeRevealDialog()
}

const exportToCsv = () => {
  if (busy.value) return
  try {
    const csv = buildReinstallCsv(reinstalls.value)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'supabase-reinstall.csv'
    link.click()
    URL.revokeObjectURL(link.href)
    actionError.value = ''
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : '匯出 CSV 失敗'
  }
}

const handleCsvFileSelect = (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.csv')) {
    actionError.value = '請選擇 CSV 檔案'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    if (importCloseTimer) {
      window.clearTimeout(importCloseTimer)
      importCloseTimer = null
    }
    importResult.value = null
    actionError.value = ''
    importPreview.value = parseReinstallCsv(typeof reader.result === 'string' ? reader.result : '')
  }
  reader.onerror = () => { actionError.value = '讀取 CSV 檔案失敗' }
  reader.readAsText(file, 'UTF-8')
}

const closeImportPreview = () => {
  if (importing.value) return
  if (importCloseTimer) {
    window.clearTimeout(importCloseTimer)
    importCloseTimer = null
  }
  importPreview.value = null
  importResult.value = null
  importProgress.value = { current: 0, total: 0 }
}

const executeImport = async () => {
  if (!importPreview.value || importPreview.value.data.length === 0 || importPreview.value.errors.length > 0 || importing.value) return
  importing.value = true
  importResult.value = null
  importProgress.value = { current: 0, total: importPreview.value.data.length }
  const result = await importReinstalls(importPreview.value.data)
  importProgress.value = { current: importPreview.value.data.length, total: importPreview.value.data.length }
  importResult.value = { successCount: result.successCount, failCount: result.failCount }
  importing.value = false
  if (result.failCount === 0) {
    importCloseTimer = window.setTimeout(() => {
      closeImportPreview()
    }, 1200)
  }
}
</script>

<style scoped>
.reinstall-page {
  display: grid;
  gap: var(--spacing-md);
}

.page-lead,
.security-note,
.muted,
.note,
.form-hint {
  color: var(--text-secondary);
}

.page-lead,
.security-note {
  margin: 0;
  line-height: 1.7;
}

.actions-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.search-area {
  flex: 1 1 280px;
  min-width: 220px;
}

.search-input,
.filter-select,
.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-primary);
  font: inherit;
}

.search-input:focus,
.filter-select:focus,
.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: 2px solid color-mix(in oklab, var(--primary) 45%, transparent);
  border-color: var(--primary);
}

.filter-select {
  width: auto;
  min-width: 9rem;
}

.csv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-export,
.btn-import,
.btn-primary,
.btn-ghost,
.btn-icon {
  border: 0;
  border-radius: var(--radius-sm);
  padding: 0.7rem 1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.btn-export,
.btn-import {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.btn-import {
  display: inline-flex;
  align-items: center;
}

.btn-primary {
  background: var(--primary);
  color: var(--text-inverse);
}

.btn-ghost {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.btn-icon {
  padding: 0.4rem 0.7rem;
  background: var(--bg-muted);
  color: var(--text-primary);
}

.btn-icon.danger {
  color: var(--danger);
}

.btn-primary:disabled,
.btn-export:disabled,
.btn-import:disabled,
.btn-ghost:disabled,
.btn-icon:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: var(--bg-inset);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.record-form,
.import-preview,
.load-error,
.software-table-wrap {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem 1.1rem;
}

.record-form h2,
.import-preview h2 {
  margin: 0;
  font-size: 1.15rem;
}

.import-errors {
  margin: 0.5rem 0 0;
  padding-left: 1.2rem;
  color: var(--danger);
}

.period-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5.5rem;
  gap: 0.4rem;
}

.type-stack,
.subscription-meta {
  margin: 0;
}

.subscription-meta {
  margin-top: 0.35rem;
  font-variant-numeric: tabular-nums;
}

.form-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  border: 0;
  padding: 0;
  min-width: 0;
}

.field {
  display: grid;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.field em {
  color: var(--danger);
  font-style: normal;
}

.field-wide {
  grid-column: 1 / -1;
}

.secret-row {
  display: flex;
  gap: 0.4rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-error,
.load-error {
  color: var(--danger);
}

.software-table {
  width: 100%;
  border-collapse: collapse;
}

.software-table th,
.software-table td {
  text-align: left;
  padding: 0.85rem 0.5rem;
  border-top: 1px solid var(--border-subtle);
  vertical-align: top;
}

.software-table th {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.serial-meta,
.serial-row,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.serial-row code {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
  background: var(--bg-muted);
  padding: 0.25rem 0.45rem;
  border-radius: var(--radius-xs);
}

.note {
  margin: 0.35rem 0 0;
  white-space: pre-wrap;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.reveal-form {
  display: grid;
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .software-table thead {
    display: none;
  }

  .software-table tr {
    display: grid;
    gap: 0.5rem;
    padding: 0.9rem 0;
  }

  .software-table td {
    display: grid;
    gap: 0.2rem;
    border: 0;
    padding: 0;
  }

  .software-table td[data-label]::before {
    content: attr(data-label);
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-muted);
  }
}
</style>
