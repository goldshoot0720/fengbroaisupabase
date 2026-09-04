<template>
  <PageContainer>
    <div class="trial-page">
      <p class="page-lead">
        依服務集中追蹤每個帳號的試用、首購與試用／首購／到期日（扣款日）。相同服務會自動歸組；可用 CSV 備份或批次匯入。
      </p>

      <div class="actions-bar">
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋服務、帳號或備註"
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <select v-model="attentionFilter" class="filter-select" aria-label="待處理狀態">
          <option value="all">全部狀態</option>
          <option value="untried">尚未試用</option>
          <option value="not_purchased">未首購</option>
        </select>
        <div class="csv-actions">
          <button type="button" class="btn-export" :disabled="busy" @click="exportToCsv">匯出 CSV</button>
          <label class="btn-import">
            匯入 CSV
            <input ref="csvFileInput" type="file" accept=".csv,text/csv" style="display:none" @change="handleCsvFileSelect" />
          </label>
          <button type="button" class="btn-primary" :disabled="busy || trialPurchaseLoading" @click="openCreateForm()">新增紀錄</button>
        </div>
      </div>

      <div class="summary-bar" aria-label="試用／首購摘要">
        <BulkSelectionControls
          :selection-mode="isSelectionMode"
          :is-all-selected="isAllSelected"
          :selected-count="selectedCount"
          :visible-count="visibleItems.length"
          :disabled="busy"
          @select-all="selectAllForDelete"
          @clear="exitSelectionMode"
          @delete-selected="requestBulkDelete"
        />
        <span>服務 {{ stats.serviceCount }}</span>
        <span>帳號紀錄 {{ stats.accountCount }}</span>
        <span>待處理帳號 {{ stats.pendingCount }}（{{ stats.untriedCount }} 尚未試用 · {{ stats.notPurchasedCount }} 未首購）</span>
      </div>

      <form v-if="formOpen" id="trial-purchase-form" class="record-form" @submit.prevent="handleSubmit">
        <h2>{{ editingId ? '編輯帳號紀錄' : '新增帳號紀錄' }}</h2>
        <p class="form-hint">同一服務可建立多筆帳號，清單會自動歸在一起。</p>
        <fieldset :disabled="busy" class="form-grid">
          <label class="field">
            <span>服務名稱 <em>*</em></span>
            <input
              id="trial-service-name"
              v-model="form.name"
              type="text"
              maxlength="100"
              list="trial-purchase-services"
              placeholder="例如 ChatGPT"
              required
            />
            <datalist id="trial-purchase-services">
              <option v-for="name in serviceNames" :key="name" :value="name" />
            </datalist>
          </label>
          <label class="field">
            <span>帳號</span>
            <input v-model="form.account" type="text" maxlength="200" placeholder="Email、使用者名稱或辨識名稱" />
          </label>
          <label class="field">
            <span>試用／首購／到期日（扣款日）</span>
            <input v-model="form.eventDate" type="date" />
          </label>
          <label class="field">
            <span>首購價格（NT$）</span>
            <input v-model.number="form.firstPurchasePrice" type="number" min="0" step="1" inputmode="numeric" />
          </label>
          <label class="field">
            <span>非首購價格（NT$）</span>
            <input v-model.number="form.regularPrice" type="number" min="0" step="1" inputmode="numeric" />
          </label>
          <label class="field">
            <span>試用狀態</span>
            <select v-model="form.trialStatus">
              <option v-for="option in TRIAL_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="field">
            <span>首購狀態</span>
            <select v-model="form.purchaseStatus">
              <option v-for="option in PURCHASE_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="field field-wide">
            <span>備註</span>
            <textarea v-model="form.note" maxlength="3337" rows="3" placeholder="方案限制、付款方式或其他提醒"></textarea>
          </label>
        </fieldset>
        <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>
        <div class="form-actions">
          <button type="button" class="btn-ghost" :disabled="saving" @click="closeForm">取消</button>
          <button type="submit" class="btn-primary" :disabled="busy">{{ saving ? '儲存中…' : editingId ? '儲存變更' : '新增紀錄' }}</button>
        </div>
      </form>

      <div v-if="importPreview" class="import-preview" role="dialog" aria-labelledby="trial-import-title">
        <h2 id="trial-import-title">匯入 CSV 預覽</h2>
        <p v-if="importPreview.errors.length">發現 {{ importPreview.errors.length }} 筆格式錯誤，不會寫入任何資料。</p>
        <p v-else>將匯入 {{ importPreview.data.length }} 筆；相同服務與帳號會更新，其餘新增。</p>
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

      <div v-if="trialPurchaseError" class="load-error" role="alert">
        <p><strong>無法載入試用／首購資料</strong></p>
        <p>{{ trialPurchaseError }}</p>
        <button v-if="trialPurchaseError.includes('trialpurchase')" type="button" class="btn-ghost" @click="setCurrentPage('settings')">前往鋒兄設定</button>
      </div>
      <p v-else-if="!formOpen && actionError" class="action-error" role="alert">{{ actionError }}</p>

      <div v-if="trialPurchaseLoading && trialPurchases.length === 0" class="loading">載入試用／首購資料…</div>
      <EmptyState
        v-else-if="!trialPurchaseError && groups.length === 0"
        icon="🧾"
        :title="trialPurchases.length === 0 ? '尚無試用／首購紀錄' : '沒有符合條件的帳號'"
        :description="trialPurchases.length === 0 ? '先新增第一個服務與帳號，之後可在服務底下持續加入帳號。' : '調整搜尋文字或狀態篩選後再試一次。'"
      >
        <template v-if="trialPurchases.length === 0" #action>
          <button type="button" class="btn-primary" @click="openCreateForm()">新增第一筆</button>
        </template>
      </EmptyState>

      <div v-else class="service-list">
        <section v-for="group in groups" :key="group.key" class="service-card">
          <div class="service-head">
            <button
              type="button"
              class="service-toggle"
              :aria-expanded="isGroupOpen(group.key)"
              @click="toggleService(group.key)"
            >
              <span class="service-name">{{ group.name }}</span>
              <span class="service-meta">
                {{ group.items.length }} 個帳號
                <template v-if="groupUntried(group)"> · {{ groupUntried(group) }} 尚未試用</template>
                <template v-if="groupUnpurchased(group)"> · {{ groupUnpurchased(group) }} 未首購</template>
              </span>
            </button>
            <button type="button" class="btn-ghost" :disabled="busy" @click="openCreateForm(group.name)">新增帳號</button>
          </div>
          <div v-if="isGroupOpen(group.key)" class="account-table-wrap">
            <table class="account-table">
              <thead>
                <tr>
                  <th v-if="isSelectionMode" class="col-check"></th>
                  <th>帳號</th>
                  <th>試用／首購／到期日（扣款日）</th>
                  <th>價格</th>
                  <th>狀態</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in group.items" :key="item.id">
                  <td v-if="isSelectionMode" class="col-check">
                    <input type="checkbox" :checked="selectedIds.has(item.id)" @change="toggleSelect(item.id)" :aria-label="`選取 ${item.account || item.name}`">
                  </td>
                  <td data-label="帳號">{{ item.account?.trim() || '未填帳號' }}</td>
                  <td data-label="試用／首購／到期日（扣款日）">{{ formatTrialPurchaseDate(item.eventDate) }}</td>
                  <td data-label="價格">
                    <div>首購 {{ formatTwd(item.firstPurchasePrice) }}</div>
                    <div>一般 {{ formatTwd(item.regularPrice) }}</div>
                  </td>
                  <td data-label="狀態">
                    <Badge :variant="item.trialStatus === 'tried' ? 'success' : 'warning'" size="sm">{{ trialStatusLabel(item.trialStatus) }}</Badge>
                    <Badge :variant="purchaseBadge(item.purchaseStatus)" size="sm">{{ purchaseStatusLabel(item.purchaseStatus) }}</Badge>
                  </td>
                  <td data-label="備註">{{ item.note?.trim() || '—' }}</td>
                  <td data-label="操作" class="row-actions">
                    <button type="button" class="btn-icon" :disabled="busy" @click="openEditForm(item)">編輯</button>
                    <button type="button" class="btn-icon danger" :disabled="busy" @click="requestDelete(item)">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

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
import { computed, onMounted, ref, watch } from 'vue'
import { useTrialPurchases } from '../../composables/useTrialPurchases'
import { useNavigation } from '../../composables/useNavigation'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import { useSelectionSet } from '../../composables/useSelectionSet'
import BulkSelectionControls from '../ui/BulkSelectionControls.vue'
import {
  PURCHASE_STATUS_OPTIONS,
  TRIAL_STATUS_OPTIONS,
  emptyTrialPurchaseForm,
  formatTrialPurchaseDate,
  formatTwd,
  groupTrialPurchases,
  optionLabel,
  trialPurchaseServiceKey,
  trialPurchaseStats,
  toTrialPurchaseForm,
} from '../../utils/managementRecords'
import { buildTrialPurchaseCsv, parseTrialPurchaseCsv } from '../../utils/trialPurchaseCsv'

const {
  trialPurchases,
  trialPurchaseLoading,
  trialPurchaseError,
  serviceNames,
  loadTrialPurchases,
  addTrialPurchase,
  updateTrialPurchase,
  deleteTrialPurchase,
  importTrialPurchases,
} = useTrialPurchases()
const { setCurrentPage } = useNavigation()

const searchQuery = ref('')
const attentionFilter = ref('all')
const { recentSearches, applyRecentSearch, removeRecentSearch, clearRecentSearches, commitSearchHistory } =
  useRecentSearchHistory('feng-trial-purchase-searches', searchQuery)

const expandedServices = ref(new Set())
const collapsedSearchServices = ref(new Set())
const formOpen = ref(false)
const editingId = ref(null)
const form = ref(emptyTrialPurchaseForm())
const saving = ref(false)
const actionError = ref('')
const pendingDelete = ref(null)
const deleteOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (value) => { if (!value) pendingDelete.value = null },
})
const csvFileInput = ref(null)
const importPreview = ref(null)
const importing = ref(false)
const importProgress = ref({ current: 0, total: 0 })
const importResult = ref(null)
let importCloseTimer = null

const busy = computed(() => saving.value || importing.value)
const stats = computed(() => trialPurchaseStats(trialPurchases.value))
const groups = computed(() => groupTrialPurchases(trialPurchases.value, searchQuery.value, attentionFilter.value))
const visibleItems = computed(() => groups.value.flatMap((group) => group.items))
const {
  isSelectionMode,
  selectedIds,
  selectedCount,
  isAllSelected,
  selectedItems,
  toggleSelect,
  selectAllForDelete,
  exitSelectionMode,
} = useSelectionSet(visibleItems)
const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''
  const account = pendingDelete.value.account?.trim() || '未填帳號'
  return `確定刪除「${pendingDelete.value.name}／${account}」？此操作無法復原。`
})

watch(searchQuery, () => {
  collapsedSearchServices.value = new Set()
})

onMounted(() => {
  loadTrialPurchases()
})

const trialStatusLabel = (status) => optionLabel(TRIAL_STATUS_OPTIONS, status)
const purchaseStatusLabel = (status) => optionLabel(PURCHASE_STATUS_OPTIONS, status)
const purchaseBadge = (status) => {
  if (status === 'purchased') return 'success'
  if (status === 'unavailable') return 'default'
  return 'warning'
}
const groupUntried = (group) => group.items.filter((item) => item.trialStatus !== 'tried').length
const groupUnpurchased = (group) => group.items.filter((item) => item.purchaseStatus === 'not_purchased').length
const isGroupOpen = (key) => searchQuery.value.trim()
  ? !collapsedSearchServices.value.has(key)
  : expandedServices.value.has(key)

const toggleService = (key) => {
  if (searchQuery.value.trim()) {
    const next = new Set(collapsedSearchServices.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    collapsedSearchServices.value = next
    return
  }
  const next = new Set(expandedServices.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedServices.value = next
}

const openCreateForm = (name = '') => {
  editingId.value = null
  form.value = emptyTrialPurchaseForm(name)
  actionError.value = ''
  formOpen.value = true
}

const openEditForm = (item) => {
  editingId.value = item.id
  form.value = toTrialPurchaseForm(item)
  actionError.value = ''
  formOpen.value = true
}

const closeForm = () => {
  formOpen.value = false
  editingId.value = null
  form.value = emptyTrialPurchaseForm()
  actionError.value = ''
}

const handleSubmit = async () => {
  if (busy.value) return
  saving.value = true
  actionError.value = ''
  try {
    const result = editingId.value
      ? await updateTrialPurchase(editingId.value, form.value)
      : await addTrialPurchase(form.value)
    if (!result.success) {
      actionError.value = result.error || '儲存失敗，請稍後再試。'
      return
    }
    const next = new Set(expandedServices.value)
    next.add(trialPurchaseServiceKey(result.item?.name || form.value.name))
    expandedServices.value = next
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
  if (!window.confirm(`確定刪除選取的 ${selectedCount.value} 筆試用／首購紀錄？此操作無法復原。`)) return
  actionError.value = ''
  for (const item of selectedItems.value) {
    const result = await deleteTrialPurchase(item.id)
    if (!result.success) actionError.value = result.error || '部分刪除失敗，請稍後再試。'
  }
  exitSelectionMode()
}

const confirmDelete = async () => {
  const item = pendingDelete.value
  if (!item) return
  const result = await deleteTrialPurchase(item.id)
  if (!result.success) {
    actionError.value = result.error || '刪除失敗，請確認連線後再試一次。'
    return
  }
  if (editingId.value === item.id) closeForm()
  pendingDelete.value = null
}

const exportToCsv = () => {
  if (busy.value) return
  try {
    const csv = buildTrialPurchaseCsv(trialPurchases.value)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'supabase-trialpurchase.csv'
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
    importPreview.value = parseTrialPurchaseCsv(typeof reader.result === 'string' ? reader.result : '')
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
  const result = await importTrialPurchases(importPreview.value.data)
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
.trial-page {
  display: grid;
  gap: var(--spacing-md);
}

.page-lead {
  margin: 0;
  color: var(--text-secondary);
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
  display: inline-block;
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
.service-card,
.load-error {
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

.form-hint {
  margin: 0.35rem 0 0;
  color: var(--text-muted);
  font-size: 0.92rem;
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

.import-errors {
  margin: 0.5rem 0 0;
  padding-left: 1.2rem;
  color: var(--danger);
}

.service-list {
  display: grid;
  gap: 0.75rem;
}

.service-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.service-toggle {
  flex: 1;
  min-width: 0;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0.25rem;
  cursor: pointer;
  color: inherit;
}

.service-name {
  display: block;
  font-weight: 700;
  color: var(--text-primary);
}

.service-meta {
  display: block;
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.account-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;
}

.account-table th,
.account-table td {
  text-align: left;
  padding: 0.7rem 0.5rem;
  border-top: 1px solid var(--border-subtle);
  vertical-align: top;
}

.account-table th {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 800px) {
  .account-table thead {
    display: none;
  }

  .account-table tr {
    display: grid;
    gap: 0.45rem;
    padding: 0.85rem 0;
  }

  .account-table td {
    display: grid;
    gap: 0.2rem;
    border: 0;
    padding: 0;
  }

  .account-table td[data-label]::before {
    content: attr(data-label);
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--text-muted);
  }
}
</style>
