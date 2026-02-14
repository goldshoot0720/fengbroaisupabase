<template>
  <div class="subscription-management">
    <!-- 操作列 -->
    <div class="actions-bar">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜尋訂閱..."
      />
      <div class="filter-buttons">
        <button
          :class="['filter-btn', { active: renewFilter === 'all' }]"
          @click="renewFilter = 'all'"
        >全部</button>
        <button
          :class="['filter-btn filter-on', { active: renewFilter === 'renew' }]"
          @click="renewFilter = 'renew'"
        >續訂</button>
        <button
          :class="['filter-btn filter-off', { active: renewFilter === 'notRenew' }]"
          @click="renewFilter = 'notRenew'"
        >非續訂</button>
      </div>
      <div class="csv-actions">
        <button
          v-if="subscriptions.length > 0"
          @click="exportSubscriptionsCsv"
          class="btn-export"
        >
          匯出 CSV
        </button>
        <label class="btn-import">
          匯入 CSV
          <input
            ref="csvFileInput"
            type="file"
            accept=".csv"
            style="display:none"
            @change="handleImportCsv"
          />
        </label>
      </div>
    </div>

    <!-- 月費總計 + 批量操作 -->
    <div class="summary-bar">
      <div class="summary-left">
        <!-- 批量選擇模式按鈕 -->
        <button
          v-if="!batchMode && filteredSubscriptions.length > 0"
          @click="enterBatchMode"
          class="btn-batch-mode"
        >
          批量選擇
        </button>
        
        <!-- 新增按鈕 -->
        <button @click="startAddRow" class="btn-add-icon" title="新增訂閱">+</button>
        
        <!-- 批量選擇模式下的全選/取消 -->
        <template v-if="batchMode">
          <label class="select-all-label">
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
            <span>全選</span>
          </label>
          <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
        </template>
        
        <span>共 {{ subscriptions.length }} 個項目</span>
        <span v-if="selectedIds.length > 0" class="selected-count">
          已選 {{ selectedIds.length }} 項
        </span>
      </div>
      <div class="summary-right">
        <button
          v-if="selectedIds.length > 0"
          @click="openConfirmModal"
          class="btn-batch-delete"
        >
          刪除選中 ({{ selectedIds.length }})
        </button>
        <span class="total-cost">每月總計：NT$ {{ totalMonthlyCostTWD }}</span>
      </div>
    </div>

    <!-- 訂閱列表 -->
    <div v-if="subscriptionLoading" class="loading">載入中...</div>
    <div v-else-if="filteredSubscriptions.length === 0 && !showAddRow" class="empty-state">
      暫無訂閱記錄
    </div>
    <div v-else class="sub-table-container">
      <table class="sub-table">
        <thead>
          <tr>
            <th v-if="batchMode" class="col-checkbox">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th class="col-name">服務名稱</th>
            <th class="col-account">帳號</th>
            <th class="col-date">下次付款</th>
            <th class="col-price">月費</th>
            <th class="col-renew">續訂</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 新增行 -->
          <tr v-if="showAddRow" class="add-row">
            <td v-if="batchMode" class="col-checkbox"></td>
            <td class="col-name">
              <input v-model="addForm.name" type="text" class="inline-input" placeholder="服務名稱 *" />
              <input v-model="addForm.site" type="url" class="inline-input inline-small" placeholder="網站網址" />
              <input v-model="addForm.note" type="text" class="inline-input inline-small" placeholder="備註" />
            </td>
            <td class="col-account">
              <input v-model="addForm.account" type="text" class="inline-input" placeholder="帳號/Email" list="account-options" />
            </td>
            <td class="col-date">
              <input v-model="addForm.nextdate" type="date" class="inline-input inline-date" />
            </td>
            <td class="col-price">
              <div class="inline-price-group">
                <select v-model="addForm.currency" class="inline-select">
                  <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }}</option>
                </select>
                <input v-model="addForm.price" type="number" class="inline-input inline-price" placeholder="0" />
              </div>
            </td>
            <td class="col-renew">
              <button
                @click="addForm.iscontinue = !addForm.iscontinue"
                class="renew-toggle"
                :class="{ active: addForm.iscontinue !== false }"
              >
                {{ addForm.iscontinue !== false ? 'ON' : 'OFF' }}
              </button>
            </td>
            <td class="col-actions">
              <button @click="saveAddRow" class="btn-icon btn-save-icon" title="新增">✓</button>
              <button @click="cancelAddRow" class="btn-icon btn-cancel-icon" title="取消">✕</button>
            </td>
          </tr>
          
          <tr 
            v-for="sub in filteredSubscriptions" 
            :key="sub.id"
            :class="{ selected: selectedIds.includes(sub.id), editing: editingRowId === sub.id }"
          >
            <!-- 批量選擇 Checkbox -->
            <td v-if="batchMode" class="col-checkbox">
              <input
                type="checkbox"
                :value="sub.id"
                v-model="selectedIds"
              />
            </td>
            
            <!-- 編輯模式：行内編輯 -->
            <template v-if="editingRowId === sub.id">
              <td class="col-name">
                <input v-model="editForm.name" type="text" class="inline-input" placeholder="服務名稱" />
                <input v-model="editForm.site" type="url" class="inline-input inline-small" placeholder="網站網址" />
                <input v-model="editForm.note" type="text" class="inline-input inline-small" placeholder="備註" />
              </td>
              <td class="col-account">
                <input v-model="editForm.account" type="text" class="inline-input" placeholder="帳號/Email" list="account-options" />
              </td>
              <td class="col-date">
                <input v-model="editForm.nextdate" type="date" class="inline-input inline-date" />
              </td>
              <td class="col-price">
                <div class="inline-price-group">
                  <select v-model="editForm.currency" class="inline-select">
                    <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.code }}</option>
                  </select>
                  <input v-model="editForm.price" type="number" class="inline-input inline-price" placeholder="0" />
                </div>
              </td>
              <td class="col-renew">
                <button
                  @click="editForm.iscontinue = !editForm.iscontinue"
                  class="renew-toggle"
                  :class="{ active: editForm.iscontinue !== false }"
                >
                  {{ editForm.iscontinue !== false ? 'ON' : 'OFF' }}
                </button>
              </td>
              <td class="col-actions">
                <button @click="saveInlineEdit(sub.id)" class="btn-icon btn-save-icon" title="儲存">✓</button>
                <button @click="cancelInlineEdit" class="btn-icon btn-cancel-icon" title="取消">✕</button>
              </td>
            </template>
            
            <!-- 正常顯示模式 -->
            <template v-else>
              <td class="col-name">
                <div class="name-cell">
                  <span class="service-name-row">
                    <img
                      v-if="sub.site"
                      :src="getFaviconUrl(sub.site)"
                      class="service-favicon"
                      @error="$event.target.style.display='none'"
                    />
                    <a v-if="sub.site" :href="sub.site" target="_blank" class="service-name service-link">{{ sub.name }}</a>
                    <span v-else class="service-name">{{ sub.name }}</span>
                  </span>
                  <span v-if="sub.note" class="service-note">{{ sub.note }}</span>
                </div>
              </td>
              <td class="col-account">
                <span class="account-text" :title="sub.account">{{ sub.account || '-' }}</span>
              </td>
              <td class="col-date">
                <span :class="getDateClass(sub.nextdate)">
                  {{ formatDate(sub.nextdate) }}
                </span>
              </td>
              <td class="col-price">
                <span class="price-value">
                  {{ getCurrencySymbol(sub.currency) }} {{ sub.price || 0 }}
                </span>
                <span v-if="sub.currency && sub.currency !== 'TWD'" class="twd-converted">
                  (NT$ {{ toTWD(sub.price, sub.currency) }})
                </span>
              </td>
              <td class="col-renew">
                <button
                  @click="toggleIsContinue(sub)"
                  class="renew-toggle"
                  :class="{ active: sub.iscontinue !== false }"
                  :title="sub.iscontinue !== false ? '續訂中' : '已停止續訂'"
                >
                  {{ sub.iscontinue !== false ? 'ON' : 'OFF' }}
                </button>
              </td>
              <td class="col-actions">
                <button @click="startInlineEdit(sub)" class="btn-icon btn-edit-icon" title="編輯">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button @click="deleteSubscription(sub.id)" class="btn-icon btn-delete-icon" title="刪除">✕</button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 安全確認 Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="closeConfirmModal">
      <div class="modal confirm-modal">
        <div class="modal-header danger">
          <h2>⚠️ 安全確認</h2>
          <button @click="closeConfirmModal" class="btn-close">&times;</button>
        </div>
        <div class="confirm-body">
          <p class="confirm-warning">
            您即將刪除 <strong>{{ selectedIds.length }}</strong> 個訂閱項目
          </p>
          <p class="confirm-hint">
            此操作不可復原。請在下方輸入 <code>{{ CONFIRM_TEXT }}</code> 以確認刪除：
          </p>
          <input
            v-model="confirmInput"
            type="text"
            class="confirm-input"
            :placeholder="CONFIRM_TEXT"
            @keyup.enter="confirmBatchDelete"
          />
          <p v-if="confirmInput && !isConfirmValid" class="confirm-error">
            輸入不正確，請輸入 {{ CONFIRM_TEXT }}
          </p>
        </div>
        <div class="modal-actions">
          <button @click="closeConfirmModal" class="btn-cancel">取消</button>
          <button
            @click="confirmBatchDelete"
            class="btn-submit btn-danger"
            :disabled="!isConfirmValid"
          >
            確認刪除 ({{ selectedIds.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- 帳號選項 datalist -->
    <datalist id="account-options">
      <option v-for="name in accountNames" :key="name" :value="name" />
    </datalist>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSubscriptions } from '../../composables/useSubscriptions'
import { useFormatters } from '../../composables/useFormatters'
import { useCommonAccounts } from '../../composables/useCommonAccounts'

const searchQuery = ref('')
const renewFilter = ref('all')

const {
  subscriptions,
  subscriptionLoading,
  totalMonthlyCost,
  sortedSubscriptions,
  loadSubscriptions,
  addSubscriptionInline,
  importSubscriptions,
  isAppwriteFormat,
  updateSubscriptionInline,
  deleteSubscription,
  toggleIsContinue,
  batchDeleteSubscriptions
} = useSubscriptions()

const { formatDate, getDateClass } = useFormatters()

// 批量選擇
const selectedIds = ref([])
const batchMode = ref(false)

// 進入批量選擇模式
const enterBatchMode = () => {
  batchMode.value = true
  selectedIds.value = []
}

// 退出批量選擇模式
const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value = []
}

// 行内編輯
const editingRowId = ref(null)
const editForm = ref({
  name: '',
  nextdate: '',
  price: null,
  currency: 'TWD',
  iscontinue: true
})

// 行内新增
const showAddRow = ref(false)
const addForm = ref({
  name: '',
  site: '',
  account: '',
  nextdate: '',
  price: null,
  currency: 'TWD',
  note: '',
  iscontinue: true
})

const startAddRow = () => {
  showAddRow.value = true
  addForm.value = {
    name: '',
    site: '',
    account: '',
    nextdate: '',
    price: null,
    currency: 'TWD',
    note: '',
    iscontinue: true
  }
}

const cancelAddRow = () => {
  showAddRow.value = false
}

const saveAddRow = async () => {
  if (!addForm.value.name) {
    alert('請輸入服務名稱')
    return
  }
  const result = await addSubscriptionInline(addForm.value)
  if (result.success) {
    showAddRow.value = false
  } else {
    alert('新增失敗: ' + result.error)
  }
}

const startInlineEdit = (sub) => {
  editingRowId.value = sub.id
  editForm.value = {
    name: sub.name || '',
    site: sub.site || '',
    account: sub.account || '',
    nextdate: sub.nextdate || '',
    price: sub.price || null,
    currency: sub.currency || 'TWD',
    note: sub.note || '',
    iscontinue: sub.iscontinue !== false
  }
}

const cancelInlineEdit = () => {
  editingRowId.value = null
}

const saveInlineEdit = async (id) => {
  const result = await updateSubscriptionInline(id, editForm.value)
  if (result.success) {
    editingRowId.value = null
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 安全確認 Modal
const showConfirmModal = ref(false)
const confirmInput = ref('')
const CONFIRM_TEXT = 'DELETE subscription'

const isAllSelected = computed(() => {
  return filteredSubscriptions.value.length > 0 && 
         selectedIds.value.length === filteredSubscriptions.value.length
})

const isConfirmValid = computed(() => {
  return confirmInput.value === CONFIRM_TEXT
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredSubscriptions.value.map(sub => sub.id)
  }
}

const openConfirmModal = () => {
  if (selectedIds.value.length === 0) return
  confirmInput.value = ''
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  confirmInput.value = ''
}

const confirmBatchDelete = async () => {
  if (!isConfirmValid.value) return
  
  const result = await batchDeleteSubscriptions(selectedIds.value)
  if (result.success) {
    selectedIds.value = []
    batchMode.value = false
    closeConfirmModal()
    alert(`成功刪除 ${result.count} 個訂閱！`)
  } else {
    alert('批量刪除失敗: ' + result.error)
  }
}

const CURRENCIES = [
  { code: 'TWD', label: '新台幣', rate: 1 },
  { code: 'USD', label: '美元', rate: 35 },
  { code: 'EUR', label: '歐元', rate: 40 },
  { code: 'JPY', label: '日圓', rate: 0.35 },
  { code: 'CNY', label: '人民幣', rate: 4.5 },
  { code: 'HKD', label: '港幣', rate: 4 }
]

const getFaviconUrl = (site) => {
  try {
    const domain = new URL(site).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

const getCurrencySymbol = (code) => {
  const map = { TWD: 'NT$', USD: 'US$', EUR: '€', JPY: '¥', CNY: '¥', HKD: 'HK$' }
  return map[code] || 'NT$'
}

const toTWD = (price, currency) => {
  if (!price) return 0
  const cur = CURRENCIES.find(c => c.code === currency)
  if (!cur) return Number(price)
  return Math.round(Number(price) * cur.rate)
}

const totalMonthlyCostTWD = computed(() => {
  return subscriptions.value.reduce((total, sub) => {
    return total + toTWD(sub.price, sub.currency)
  }, 0)
})

const filteredSubscriptions = computed(() => {
  let list = sortedSubscriptions.value

  // 續訂篩選
  if (renewFilter.value === 'renew') {
    list = list.filter(s => s.iscontinue !== false)
  } else if (renewFilter.value === 'notRenew') {
    list = list.filter(s => s.iscontinue === false)
  }

  // 關鍵字搜尋
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.account || '').toLowerCase().includes(q) ||
      (s.site || '').toLowerCase().includes(q) ||
      (s.note || '').toLowerCase().includes(q)
    )
  }
  return list
})

const { accounts: commonAccounts, loadAccounts: loadCommonAccounts } = useCommonAccounts()

// 帳號名稱選項（從鈢兄常用讀取）
const accountNames = computed(() => {
  return commonAccounts.value
    .map(a => a.name)
    .filter(Boolean)
    .sort()
})

onMounted(() => {
  loadSubscriptions()
  loadCommonAccounts()
})

// 格式化日期為 ISO 8601 (Appwrite 格式)
const formatDateToISO = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toISOString()
}

const exportSubscriptionsCsv = () => {
  // Appwrite 格式：使用 'continue' 欄位名 和 ISO 8601 日期
  const header = ['name', 'site', 'price', 'nextdate', 'note', 'account', 'currency', 'continue']
  const rows = sortedSubscriptions.value.map(sub => [
    sub.name || '',
    sub.site || '',
    sub.price ?? '',
    formatDateToISO(sub.nextdate),
    sub.note || '',
    sub.account || '',
    sub.currency || 'TWD',
    sub.iscontinue !== false ? 'true' : 'false'
  ])
  const bom = '\uFEFF'
  const csvContent = bom + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'supabase-subscription.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const csvFileInput = ref(null)

const parseCsv = (text) => {
  const parseRow = (line) => {
    const cells = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) { cells.push(current.trim()); current = '' }
      else current += char
    }
    cells.push(current.trim())
    return cells
  }
  const splitIntoRows = (text) => {
    const rows = []
    let current = ''
    let inQuotes = false
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '"') { inQuotes = !inQuotes; current += char }
      else if (char === '\n' && !inQuotes) { if (current.trim()) rows.push(current); current = '' }
      else current += char
    }
    if (current.trim()) rows.push(current)
    return rows
  }
  const lines = splitIntoRows(text)
  if (lines.length < 2) return []
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const cells = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
}

const handleImportCsv = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) { alert('CSV 檔案無有效資料'); return }
  const isAppwrite = isAppwriteFormat(rows)
  let confirmMsg = `確定匯入 ${rows.length} 筆訂閱資料？`
  if (isAppwrite) {
    confirmMsg = `偵測到 ISO 8601 日期格式\n系統將自動轉換日期格式\n\n確定匯入 ${rows.length} 筆訂閱資料？`
  }
  if (!confirm(confirmMsg)) return
  const result = await importSubscriptions(rows)
  if (result.success) {
    alert(`成功匯入 ${result.count} 筆訂閱！`)
  } else {
    alert('匯入失敗: ' + result.error)
  }
  e.target.value = ''
}

defineExpose({ subscriptions, totalMonthlyCost })
</script>


<style scoped>
.subscription-management {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.filter-buttons {
  display: flex;
  gap: 0.25rem;
  background: #f0f0f0;
  border-radius: 8px;
  padding: 0.25rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  background: transparent;
  color: #666;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.6);
}

.filter-btn.active {
  background: white;
  color: #333;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.filter-btn.filter-on.active {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.filter-btn.filter-off.active {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  color: white;
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-export,
.btn-import {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-export:hover,
.btn-import:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-import {
  display: inline-block;
}

.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.08) 0%, rgba(46, 204, 113, 0.08) 100%);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
  color: #555;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.summary-left,
.summary-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}

.select-all-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.selected-count {
  background: #3498db;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.btn-batch-mode {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-batch-mode:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-add-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
  color: white;
  font-size: 1.5rem;
  font-weight: 300;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  line-height: 1;
  padding-bottom: 4px;
}

.btn-add-icon:hover {
  transform: translateY(-2px) scale(1.1);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.btn-cancel-batch {
  padding: 0.35rem 0.75rem;
  background: #e0e0e0;
  color: #666;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel-batch:hover {
  background: #d0d0d0;
}

.btn-batch-delete {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-batch-delete:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

.total-cost {
  font-weight: 700;
  color: #e74c3c;
  font-size: 1.05rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
}

/* Table Style */
.sub-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
  border: 1px solid #f0f0f0;
}

.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.sub-table thead {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.sub-table th {
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.sub-table td {
  padding: 0.875rem 0.75rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: middle;
}

.sub-table tbody tr {
  transition: background-color 0.2s;
}

.sub-table tbody tr:hover {
  background-color: #f8f9fa;
}

.sub-table tbody tr.selected {
  background-color: rgba(52, 152, 219, 0.1);
}

.sub-table tbody tr.selected:hover {
  background-color: rgba(52, 152, 219, 0.15);
}

.sub-table tbody tr.editing {
  background-color: rgba(255, 243, 205, 0.5);
}

.sub-table tbody tr.editing:hover {
  background-color: rgba(255, 243, 205, 0.7);
}

.sub-table tbody tr.add-row {
  background-color: rgba(212, 237, 218, 0.5);
  border-left: 3px solid #28a745;
}

.sub-table tbody tr.add-row:hover {
  background-color: rgba(212, 237, 218, 0.7);
}

/* Inline editing inputs */
.inline-input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #3498db;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s;
}

.inline-input:focus {
  outline: none;
  border-color: #2980b9;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.inline-input + .inline-input {
  margin-top: 0.35rem;
}

.inline-small {
  font-size: 0.8rem;
  padding: 0.35rem 0.5rem;
  border-width: 1px;
}

.inline-date {
  min-width: 130px;
}

.inline-price-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inline-select {
  padding: 0.5rem;
  border: 2px solid #3498db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.inline-select:focus {
  outline: none;
  border-color: #2980b9;
}

.inline-price {
  width: 80px;
  text-align: right;
}

/* Save/Cancel buttons */
.btn-save-icon {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: white;
  font-weight: bold;
}

.btn-save-icon:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
}

.btn-cancel-icon {
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  color: white;
  font-weight: bold;
}

.btn-cancel-icon:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(149, 165, 166, 0.4);
}

/* Column widths */
.col-checkbox {
  width: 40px;
  text-align: center;
}

.col-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.col-name {
  min-width: 180px;
  max-width: 250px;
}

.col-account {
  width: 120px;
  max-width: 150px;
}

.col-date {
  width: 110px;
  white-space: nowrap;
}

.col-price {
  width: 140px;
}

.col-renew {
  width: 80px;
  text-align: center;
}

.col-actions {
  width: 140px;
  text-align: center;
}

/* Cell content */
.name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.service-name {
  font-weight: 600;
  color: #2c3e50;
}

.service-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.service-favicon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 3px;
}

.service-link {
  color: #3498db;
  text-decoration: none;
}

.service-link:hover {
  text-decoration: underline;
}

.service-note {
  font-size: 0.8rem;
  color: #6c757d;
}

.account-text {
  font-size: 0.9rem;
  color: #495057;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.price-value {
  font-weight: 600;
  color: #e74c3c;
}

.twd-converted {
  display: block;
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.15rem;
}

/* Icon action buttons */
.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin: 0 0.25rem;
}

.btn-edit-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-edit-icon:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-delete-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  font-size: 1rem;
  font-weight: bold;
}

.btn-delete-icon:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .sub-table-container {
    font-size: 0.85rem;
  }
  
  .sub-table th,
  .sub-table td {
    padding: 0.625rem 0.5rem;
  }
  
  .col-name {
    min-width: 150px;
  }
  
  .col-account {
    display: none;
  }
  
  .service-site,
  .service-note {
    display: none;
  }
}

.renew-toggle {
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  transition: all 0.3s;
  min-width: 60px;
}

.renew-toggle.active {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.renew-toggle:not(.active) {
  background: #e0e0e0;
  color: #999;
}

.renew-toggle:hover {
  transform: scale(1.05);
}

.date-normal { color: #27ae60; }
.date-soon { color: #f39c12; font-weight: bold; }
.date-overdue { color: #e74c3c; font-weight: bold; }

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #333;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.form-group input {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.form-group-renew {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.currency-select {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
  background: white;
}

.currency-select:focus {
  outline: none;
  border-color: #3498db;
}

.twd-hint {
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.875rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-cancel {
  background: #e0e0e0;
  color: #666;
}

.btn-cancel:hover {
  background: #d0d0d0;
}

.btn-submit {
  background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%);
  color: white;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 安全確認 Modal */
.confirm-modal {
  max-width: 450px;
}

.modal-header.danger h2 {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.confirm-body {
  padding: 1rem 0;
}

.confirm-warning {
  font-size: 1.1rem;
  color: #e74c3c;
  margin-bottom: 1rem;
  text-align: center;
}

.confirm-warning strong {
  font-size: 1.5rem;
  color: #c0392b;
}

.confirm-hint {
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.confirm-hint code {
  background: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e74c3c;
  font-weight: 600;
}

.confirm-input {
  width: 100%;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  text-align: center;
  letter-spacing: 1px;
  transition: all 0.3s;
}

.confirm-input:focus {
  outline: none;
  border-color: #e74c3c;
}

.confirm-input.match {
  border-color: #27ae60;
  background: rgba(39, 174, 96, 0.05);
}

.confirm-error {
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 0.75rem;
  text-align: center;
}

.btn-danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%) !important;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}
</style>
