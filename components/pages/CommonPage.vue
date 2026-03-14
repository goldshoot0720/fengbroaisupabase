<template>
  <PageContainer>
    <div class="common-page">
      <!-- 操作區 -->
      <div class="actions-bar">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            class="search-input" 
            placeholder="篩選 例如 GitHub Gmail 或 example@example.com"
          >
          <div v-if="searchQuery.trim()" class="search-result-info">
            符合 {{ filteredAccounts.length }} 筆資料
          </div>
        </div>
        <div class="action-buttons">
          <div class="csv-actions">
            <button v-if="accounts.length > 0" @click="exportCsv" class="btn-export">
              <span class="icon">📤</span> 匯出 CSV
            </button>
            <button @click="$refs.csvFileInput.click()" class="btn-import">
              <span class="icon">📥</span> 匯入 CSV
            </button>
            <input
              ref="csvFileInput"
              type="file"
              accept=".csv"
              style="display:none"
              @change="handleImportCsv"
            >
          </div>
        </div>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredAccounts.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增項目">+</button>
          <template v-if="batchMode">
            <label class="select-all-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全選</span>
            </label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ accounts.length }} 個項目</span>
          <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>
        </div>
        <div class="summary-right">
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除選中 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <!-- 網站名稱篩選標籤 -->
      <div v-if="siteTagCounts.length > 0" class="site-filter-bar">
        <button 
          class="site-tag" 
          :class="{ active: !selectedSiteFilter }" 
          @click="selectedSiteFilter = null"
        >全部 ({{ accounts.length }})</button>
        <button 
          v-for="tag in siteTagCounts" 
          :key="tag.name" 
          class="site-tag" 
          :class="{ active: selectedSiteFilter === tag.name }"
          @click="selectedSiteFilter = selectedSiteFilter === tag.name ? null : tag.name"
        >{{ tag.name }} ({{ tag.count }})</button>
      </div>

      <!-- 載入中 -->
      <div v-if="loading && accounts.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>載入資料中...</p>
      </div>

      <!-- 空狀態 -->
      <div v-else-if="accounts.length === 0 && !isAddingInline" class="empty-state">
        <div class="empty-icon">📇</div>
        <h3>尚無常用項目</h3>
        <p>點擊上方按鈕新增您的第一個常用項目集合。</p>
      </div>

      <!-- 列表 Grid -->
      <div v-if="isAddingInline || filteredAccounts.length > 0" class="common-grid">

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="common-card card-editing">
          <div class="card-header">
            <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="example@example.com" style="flex:1" />
            <div class="card-actions">
              <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
              <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
            </div>
          </div>
          <div class="card-content inline-edit-content">
            <div class="inline-items-list">
              <div v-for="i in addVisibleCount" :key="i" class="inline-item-row">
                <span class="inline-item-num">{{ i }}</span>
                <input v-model="addForm[`site${padIndex(i)}`]" type="text" class="inline-input inline-site" placeholder="網站名稱" />
                <input v-model="addForm[`note${padIndex(i)}`]" type="text" class="inline-input inline-note" placeholder="備註" />
              </div>
            </div>
            <div class="slot-controls" style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap">
              <button
                v-if="addVisibleCount < 37"
                class="btn-show-all-slots"
                @click="addVisibleCount = Math.min(addVisibleCount + 1, 37)"
              >➕ 新增一組欄位 ({{ addVisibleCount }}/37)</button>
              <button
                v-if="addVisibleCount > 5"
                class="btn-show-all-slots"
                @click="addVisibleCount = Math.max(addVisibleCount - 1, 5)"
              >➖ 移除最後一組</button>
              <button
                v-if="addVisibleCount < 37"
                class="btn-show-all-slots"
                @click="addVisibleCount = 37"
              >展開全部 37 組</button>
              <button
                v-if="addVisibleCount > 5"
                class="btn-show-all-slots"
                @click="addVisibleCount = 5"
              >收合至 5 組</button>
            </div>
          </div>
        </div>
        <div v-for="account in filteredAccounts" :key="account.id" class="common-card" :class="{ 'card-editing': editingId === account.id }">
          <!-- 行內編輯模式 -->
          <template v-if="editingId === account.id">
            <div class="card-header">
              <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="example@example.com">
              <div class="card-actions">
                <button class="btn-icon save" @click="saveInlineEdit" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
              </div>
            </div>
            <div class="card-content inline-edit-content">
              <div class="inline-items-list">
                <div v-for="i in 37" :key="i" class="inline-item-row" v-show="isSlotVisible(i)">
                  <span class="inline-item-num">{{ i }}</span>
                  <input 
                    v-model="editForm[`site${padIndex(i)}`]" 
                    type="text" 
                    class="inline-input inline-site" 
                    :placeholder="`網站名稱`"
                  >
                  <input 
                    v-model="editForm[`note${padIndex(i)}`]" 
                    type="text" 
                    class="inline-input inline-note" 
                    :placeholder="`備註`"
                  >
                </div>
              </div>
              <button class="btn-show-all-slots" @click="showAllSlots = !showAllSlots">
                {{ showAllSlots ? '收合空白欄位' : `顯示全部 37 個欄位` }}
              </button>
            </div>
          </template>

          <!-- 顯示模式 -->
          <template v-else>
            <div class="card-header">
              <div>
                <h3 class="card-title">{{ getFriendlyName(account.name) }}</h3>
                <span v-if="account.name && account.name.includes('@')" class="card-email">{{ account.name }}</span>
              </div>
              <div class="card-actions">
                <button v-if="batchMode" class="card-checkbox" @click="toggleSelect(account.id)">
                  <input type="checkbox" :checked="selectedIds.has(account.id)" @click.stop="toggleSelect(account.id)">
                </button>
                <button class="btn-icon" @click="startInlineEdit(account)" title="行內編輯">✏️</button>
                <button class="btn-icon delete" @click="confirmDelete(account)" title="刪除">🗑️</button>
              </div>
            </div>
          
            <div class="card-content">
              <div class="preview-list">
                <!-- 顯示前 5 個非空的項目作為預覽 -->
                <div v-for="(item, index) in getPreviewItems(account)" :key="index" class="preview-item">
                  <span class="site-name">{{ item.site }}</span>
                  <span class="note-text" v-if="item.note">{{ item.note }}</span>
                </div>
                <div v-if="getNonEmptyCount(account) > 5" class="more-items">
                  ...還有 {{ getNonEmptyCount(account) - 5 }} 個項目
                </div>
                <div v-if="getNonEmptyCount(account) === 0" class="no-items">
                  (無內容)
                </div>
              </div>
              
              <button class="btn-view-all" @click="viewAccount(account)">
                查看全部詳細
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- 查看詳細 Modal -->
      <div v-if="viewingAccount" class="modal-overlay" @click.self="viewingAccount = null">
        <div class="modal-content large-modal">
          <div class="modal-header">
            <div>
              <h3>{{ getFriendlyName(viewingAccount.name) }}</h3>
              <span v-if="viewingAccount.name && viewingAccount.name.includes('@')" class="modal-email">{{ viewingAccount.name }}</span>
            </div>
            <button class="btn-close" @click="viewingAccount = null">✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-list">
              <div v-for="item in getAllItems(viewingAccount)" :key="item.index" class="detail-item">
                <span class="detail-num">{{ item.index }}</span>
                <span class="detail-site">{{ item.site }}</span>
                <span class="detail-note" v-if="item.note">{{ item.note }}</span>
              </div>
              <div v-if="getAllItems(viewingAccount).length === 0" class="no-items" style="padding:2rem;text-align:center">
                (無內容)
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="viewingAccount = null">關閉</button>
            <button class="btn-submit" @click="startInlineEdit(viewingAccount); viewingAccount = null">✏️ 編輯</button>
          </div>
        </div>
      </div>


      <!-- 編輯/新增 Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content large-modal">
          <div class="modal-header">
            <h3>{{ isEditing ? '編輯常用項目' : '新增常用項目' }}</h3>
            <button class="btn-close" @click="closeModal">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group main-name">
              <label>項目名稱</label>
              <input v-model="formData.name" type="text" class="form-input" placeholder="example@example.com">
            </div>

            <div class="items-container">
              <div v-for="i in 37" :key="i" class="item-block">
                <div class="item-header">
                  <span class="item-number">編號 {{ i }}</span>
                </div>
                <div class="item-fields">
                  <div class="field-group">
                    <label class="field-label">網站名稱 01~37</label>
                    <input 
                      v-model="formData[`site${padIndex(i)}`]" 
                      type="text" 
                      class="form-input" 
                      :placeholder="`site${padIndex(i)}`"
                    >
                  </div>
                  <div class="field-group">
                    <label class="field-label">備註 01~37</label>
                    <textarea 
                      v-model="formData[`note${padIndex(i)}`]" 
                      class="form-textarea" 
                      :placeholder="`note${padIndex(i)}`"
                      rows="5"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <div v-if="errorMessage" class="error-message">
              <span class="error-icon">⚠️</span>
              <span>{{ errorMessage }}</span>
            </div>
            <div class="footer-actions">
              <button class="btn-cancel" @click="closeModal">取消</button>
              <button class="btn-submit" @click="handleSubmit" :disabled="loading">
                {{ loading ? '處理中...' : '確認儲存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import { useCommonAccounts } from '../../composables/useCommonAccounts'

const {
  accounts,
  loading,
  loadAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  importAccounts,
  COMMON_FIELDS
} = useCommonAccounts()

// 狀態
const showModal = ref(false)
const isEditing = ref(false)
const searchQuery = ref('')
const selectedSiteFilter = ref(null)
const errorMessage = ref('')

// 批量選擇
const batchMode = ref(false)
const selectedIds = ref(new Set())

// 行內編輯
const editingId = ref(null)
const editForm = reactive({})
const showAllSlots = ref(false)
const viewingAccount = ref(null)

const enterBatchMode = () => { batchMode.value = true }
const exitBatchMode = () => { batchMode.value = false; selectedIds.value = new Set() }

const isAllSelected = computed(() => {
  return filteredAccounts.value.length > 0 && filteredAccounts.value.every(a => selectedIds.value.has(a.id))
})

const toggleSelect = (id) => {
  const s = new Set(selectedIds.value)
  if (s.has(id)) { s.delete(id) } else { s.add(id) }
  selectedIds.value = s
}

const toggleSelectAll = () => {
  if (isAllSelected.value) { selectedIds.value = new Set() }
  else { selectedIds.value = new Set(filteredAccounts.value.map(a => a.id)) }
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return
  if (count === accounts.value.length) {
    const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE commonaccount 確認：`)
    if (input !== 'DELETE commonaccount') { alert('輸入不正確，已取消'); return }
  } else {
    if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) return
  }
  let ok = 0
  for (const id of [...selectedIds.value]) {
    const r = await deleteAccount(id)
    if (r.success) ok++
  }
  selectedIds.value = new Set()
  batchMode.value = false
  alert(`已刪除 ${ok} 筆`)
}

// 行內編輯功能
const startInlineEdit = (account) => {
  const data = { ...account }
  // 確保所有欄位存在
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    if (data[`site${key}`] === undefined) data[`site${key}`] = ''
    if (data[`note${key}`] === undefined) data[`note${key}`] = ''
  }
  if (data.photohash === undefined) data.photohash = ''
  Object.assign(editForm, data)
  editingId.value = account.id
  showAllSlots.value = false
}

const cancelInlineEdit = () => {
  editingId.value = null
  showAllSlots.value = false
}

// 查看詳細（唯讀）
const viewAccount = (account) => {
  viewingAccount.value = account
}

// 取得所有非空項目
const getAllItems = (account) => {
  const items = []
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    const site = account[`site${key}`]
    const note = account[`note${key}`]
    if (site || note) {
      items.push({ index: i, site: site || '', note: note || '' })
    }
  }
  return items
}

const saveInlineEdit = async () => {
  if (!editForm.name) {
    alert('請輸入項目名稱')
    return
  }
  // 驗證 email 格式
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(editForm.name)) {
    alert('項目名稱格式錯誤，請使用 email 格式')
    return
  }
  const payload = { ...editForm }
  // 清理空值
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    if (!payload[`site${key}`]) payload[`site${key}`] = null
    if (!payload[`note${key}`]) payload[`note${key}`] = null
  }
  if (!payload.photohash) payload.photohash = null

  const result = await updateAccount(editForm.id, payload)
  if (result.success) {
    editingId.value = null
    showAllSlots.value = false
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 判斷欄位是否顯示（非空或展開全部）
const isSlotVisible = (i) => {
  if (showAllSlots.value) return true
  const key = padIndex(i)
  return !!(editForm[`site${key}`] || editForm[`note${key}`])
    || i <= Math.max(getNonEmptyEditCount() + 3, 5) // 至少顯示到最後一個非空+3，或至少5
}

const getNonEmptyEditCount = () => {
  let lastNonEmpty = 0
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    if (editForm[`site${key}`] || editForm[`note${key}`]) {
      lastNonEmpty = i
    }
  }
  return lastNonEmpty
}

// 表單資料
const formData = reactive({})

// 初始化表單數據結構
const initFormData = () => {
  const data = { id: null, name: '' }
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    data[`site${key}`] = ''
    data[`note${key}`] = ''
  }
  data.photohash = ''
  return data
}

// 輔助函數：補零
const padIndex = (num) => {
  return num.toString().padStart(2, '0')
}

// 獲取預覽項目
const getPreviewItems = (account) => {
  const items = []
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    const site = account[`site${key}`]
    const note = account[`note${key}`]

    if (site || note) {
      items.push({ site, note })
    }

    if (items.length >= 5) break
  }
  return items
}

// 計算非空項目數量
const getNonEmptyCount = (account) => {
  let count = 0
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    if (account[`site${key}`] || account[`note${key}`]) {
      count++
    }
  }
  return count
}

// 取得使用者友善的顯示名稱（@ 前面的部分）
const getFriendlyName = (name) => {
  if (!name) return '未命名項目'
  if (name.includes('@')) {
    return name.split('@')[0]
  }
  return name
}

// 網站名稱統計（所有 site01~site37 的值 + 出現次數）
const siteTagCounts = computed(() => {
  const counts = {}
  for (const account of accounts.value) {
    for (let i = 1; i <= 37; i++) {
      const key = padIndex(i)
      const site = account[`site${key}`]
      if (site && site.trim()) {
        const name = site.trim()
        counts[name] = (counts[name] || 0) + 1
      }
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
})

// 篩選功能
const filteredAccounts = computed(() => {
  let result = accounts.value

  // 網站名稱標籤篩選
  if (selectedSiteFilter.value) {
    const filter = selectedSiteFilter.value
    result = result.filter(account => {
      for (let i = 1; i <= 37; i++) {
        const key = padIndex(i)
        const site = account[`site${key}`]
        if (site && site.trim() === filter) return true
      }
      return false
    })
  }

  // 文字搜尋
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(account => {
      if (account.name && account.name.toLowerCase().includes(query)) return true
      for (let i = 1; i <= 37; i++) {
        const key = padIndex(i)
        const site = account[`site${key}`]
        if (site && site.toLowerCase().includes(query)) return true
      }
      return false
    })
  }

  return result
})

// 初始化
onMounted(() => {
  loadAccounts()
})

// 行內新增
const isAddingInline = ref(false)
const addForm = reactive({})
const addVisibleCount = ref(5)
const initAddForm = () => {
  const d = { name: '' }
  for (let i = 1; i <= 37; i++) { const k = padIndex(i); d[`site${k}`] = ''; d[`note${k}`] = '' }
  d.photohash = ''
  return d
}
const openInlineAdd = () => { Object.assign(addForm, initAddForm()); addVisibleCount.value = 5; isAddingInline.value = true }
const cancelInlineAdd = () => { isAddingInline.value = false }
const saveInlineAdd = async () => {
  if (!addForm.name) { alert('請輸入項目名稱'); return }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(addForm.name)) { alert('項目名稱請使用 email 格式'); return }
  const payload = { ...addForm }
  for (let i = 1; i <= 37; i++) { const k = padIndex(i); if (!payload[`site${k}`]) payload[`site${k}`] = null; if (!payload[`note${k}`]) payload[`note${k}`] = null }
  if (!payload.photohash) payload.photohash = null
  const result = await addAccount(payload)
  if (result.success) { isAddingInline.value = false }
  else {
    if (result.error.includes('duplicate key')) alert('項目名稱已存在')
    else alert('新增失敗: ' + result.error)
  }
}

// 開啟新增 Modal
const openAddModal = () => {
  isEditing.value = false
  Object.assign(formData, initFormData())
  showModal.value = true
}

// 開啟編輯 Modal
const editAccount = (account) => {
  isEditing.value = true
  // 複製數據到 formData
  const data = { ...account }
  // 確保所有欄位都存在，避免 undefined
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    if (data[`site${key}`] === undefined) data[`site${key}`] = ''
    if (data[`note${key}`] === undefined) data[`note${key}`] = ''
  }
  if (data.photohash === undefined) data.photohash = ''
  Object.assign(formData, data)
  showModal.value = true
}

// 關閉 Modal
const closeModal = () => {
  showModal.value = false
  errorMessage.value = ''
  Object.assign(formData, initFormData())
}

// 提交表單
const handleSubmit = async () => {
  errorMessage.value = ''
  
  if (!formData.name) {
    errorMessage.value = '請輸入項目名稱'
    return
  }
  
  // 驗證 email 格式
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(formData.name)) {
    errorMessage.value = '項目名稱格式錯誤，請使用 email 格式（例如：example@example.com）'
    return
  }
  
  // 檢查網站名稱是否有重複
  const siteNames = []
  const duplicateSites = []

  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    const site = formData[`site${key}`]
    
    if (site && site.trim()) {
      const normalizedSite = site.trim().toLowerCase()
      
      if (siteNames.includes(normalizedSite)) {
        if (!duplicateSites.includes(site.trim())) {
          duplicateSites.push(site.trim())
        }
      } else {
        siteNames.push(normalizedSite)
      }
    }
  }
  
  if (duplicateSites.length > 0) {
    errorMessage.value = `網站名稱有重複：${duplicateSites.join('、')}`
    return
  }

  const payload = { ...formData }
  
  // 清理 undefined
  for (let i = 1; i <= 37; i++) {
    const key = padIndex(i)
    if (!payload[`site${key}`]) payload[`site${key}`] = null
    if (!payload[`note${key}`]) payload[`note${key}`] = null
  }
  if (!payload.photohash) payload.photohash = null

  let result
  if (isEditing.value) {
    result = await updateAccount(formData.id, payload)
  } else {
    result = await addAccount(payload)
  }

  if (result.success) {
    closeModal()
  } else {
    // 處理錯誤訊息
    if (result.error.includes('duplicate key') && result.error.includes('commonaccount_name_key')) {
      errorMessage.value = '項目名稱已存在，請使用不同的名稱'
    } else {
      errorMessage.value = '儲存失敗: ' + result.error
    }
  }
}

// 確認刪除
const confirmDelete = async (account) => {
  if (confirm(`確定要刪除 ${account.name} 嗎？`)) {
    await deleteAccount(account.id)
  }
}

// CSV 匯出
const exportCsv = () => {
  const header = COMMON_FIELDS
  const rows = accounts.value.map(a =>
    header.map(field => a[field] || '')
  )
  const bom = '\uFEFF'
  const csvContent = bom + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'supabase-commonaccount.csv'
  link.click()
  URL.revokeObjectURL(url)
}

// CSV 匯入
const csvFileInput = ref(null)

const parseCsv = (text) => {
  const parseRow = (line) => {
    const cells = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
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
      if (char === '"') {
        inQuotes = !inQuotes
        current += char
      } else if (char === '\n' && !inQuotes) {
        if (current.trim()) rows.push(current)
        current = ''
      } else {
        current += char
      }
    }
    if (current.trim()) rows.push(current)
    return rows
  }

  const lines = splitIntoRows(text)
  if (lines.length < 2) return []

  const headers = parseRow(lines[0])
  console.log('CSV Headers:', headers)

  return lines.slice(1).map((line, idx) => {
    const cells = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    if (idx === 0) console.log('First row parsed:', obj)
    return obj
  })
}

const handleImportCsv = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const text = await file.text()
  let rows = parseCsv(text)
  if (rows.length === 0) { alert('CSV 檔案無有效資料'); return }

  // 偵測 Appwrite 格式（有 $id, $createdAt 等系統欄位）
  const firstRow = rows[0]
  const isAppwrite = '$id' in firstRow || '$createdAt' in firstRow || '$collectionId' in firstRow

  if (isAppwrite) {
    console.log('偵測到 Appwrite CSV 格式，自動轉換欄位')
    rows = rows.map(r => {
      const mapped = {}
      for (const [key, value] of Object.entries(r)) {
        // 跳過 $ 開頭系統欄位
        if (key.startsWith('$')) continue
        mapped[key] = value
      }
      return mapped
    })
  }

  let confirmMsg = `確定匯入 ${rows.length} 筆常用項目資料？`
  if (isAppwrite) {
    confirmMsg = `ℹ️ 偵測到 Appwrite CSV 格式

已自動移除系統欄位（$id, $createdAt...）

確定匯入 ${rows.length} 筆常用項目資料？`
  }

  if (!confirm(confirmMsg)) return

  const result = await importAccounts(rows)
  if (result.success) {
    alert(`✅ ${result.message}！共 ${result.count} 筆資料`)
  } else {
    alert('匯入失敗: ' + result.error)
  }
  e.target.value = ''
}

// SEO
useHead({
  title: '鋒兄常用 - 鋒兄AI Supabase',
  meta: [
    { name: 'description', content: '常用帳號與連結管理' }
  ]
})
</script>

<style scoped>
.common-page {
  animation: fadeIn 0.3s ease-in;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
  border-radius: 12px;
  color: #333;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(255,255,255,0.5);
}

.page-description {
  font-size: 1.1rem;
  opacity: 0.8;
  color: #444;
}

.actions-bar {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
  max-width: 400px;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e0c3fc;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #8ec5fc;
  box-shadow: 0 0 0 3px rgba(142, 197, 252, 0.2);
}

.search-input::placeholder {
  color: #999;
}

/* 網站名稱篩選標籤列 */
.site-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.site-tag {
  padding: 0.3rem 0.7rem;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
  color: #666;
  transition: all 0.2s;
  white-space: nowrap;
}

.site-tag:hover {
  border-color: #8ec5fc;
  color: #333;
  background: #eef6ff;
}

.site-tag.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-color: transparent;
  font-weight: 600;
}

.search-result-info {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #8ec5fc;
  font-weight: 500;
  padding-left: 0.25rem;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-export, .btn-import {
  padding: 0.6rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #f0fdf4;
  border-color: #86efac;
}

.btn-import:hover {
  background: #fef3c7;
  border-color: #fcd34d;
}

.common-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.common-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  border-top: 4px solid #8ec5fc;
  display: flex;
  flex-direction: column;
}

.common-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 1.25rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card-title {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
  font-weight: 700;
}

.card-email {
  font-size: 0.8rem;
  color: #999;
  display: block;
  margin-top: 0.2rem;
  word-break: break-all;
}

.modal-email {
  font-size: 0.85rem;
  color: #999;
  display: block;
  margin-top: 0.2rem;
}

/* 查看詳細樣式 */
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.detail-num {
  font-size: 0.75rem;
  color: #999;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.detail-site {
  font-weight: 600;
  color: #333;
  min-width: 80px;
}

.detail-note {
  color: #666;
  flex: 1;
  word-break: break-word;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.card-content {
  padding: 1.25rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 行內編輯樣式 */
.card-editing {
  border-top-color: #f59e0b;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.inline-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.inline-input:focus {
  outline: none;
  border-color: #8ec5fc;
  box-shadow: 0 0 0 2px rgba(142, 197, 252, 0.2);
}

.inline-name {
  flex: 1;
  font-weight: 600;
  font-size: 1rem;
}

.inline-edit-content {
  max-height: 400px;
  overflow-y: auto;
}

.inline-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.inline-item-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.inline-item-num {
  font-size: 0.75rem;
  color: #999;
  width: 1.5rem;
  text-align: center;
  flex-shrink: 0;
}

.inline-site {
  flex: 2;
  min-width: 0;
}

.inline-note {
  flex: 3;
  min-width: 0;
}

.btn-show-all-slots {
  margin-top: 0.75rem;
  padding: 0.4rem;
  background: #f8f9fa;
  border: 1px dashed #ccc;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  font-size: 0.8rem;
  width: 100%;
  transition: all 0.2s;
}

.btn-show-all-slots:hover {
  background: #eef2f7;
  color: #555;
}

.btn-icon.save:hover {
  background: #ecfdf5;
}

.preview-list {
  flex: 1;
  margin-bottom: 1rem;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px dashed #f0f0f0;
}

.site-name {
  color: #555;
  font-weight: 500;
}

.note-text {
  color: #888;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-items {
  font-size: 0.85rem;
  color: #999;
  text-align: center;
  margin-top: 0.5rem;
  font-style: italic;
}

.no-items {
  text-align: center;
  color: #ccc;
  padding: 1rem 0;
}

.btn-view-all {
  width: 100%;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-view-all:hover {
  background: #eef2f7;
  color: #4a90e2;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-content.large-modal {
  max-width: 800px;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.error-message {
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.error-icon {
  font-size: 1.2rem;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #f0f0f0;
}

.btn-icon.delete:hover {
  background: #fee2e2;
}

.btn-primary {
  background: linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-submit {
  background: #8ec5fc;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f9fafb;
}

/* Form Styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 600;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #8ec5fc;
  box-shadow: 0 0 0 3px rgba(142, 197, 252, 0.2);
}

.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.form-textarea:focus {
  outline: none;
  border-color: #8ec5fc;
  box-shadow: 0 0 0 3px rgba(142, 197, 252, 0.2);
}

.items-container {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.item-block {
  background: white;
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.item-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #8ec5fc;
}

.item-number {
  display: inline-block;
  background: linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%);
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  min-width: 40px;
  text-align: center;
}

.item-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-label {
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.loading-state {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #8ec5fc;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .item-block {
    padding: 1rem;
  }
  
  .item-number {
    font-size: 1rem;
    padding: 0.25rem 0.6rem;
  }
  
  .field-label {
    font-size: 0.9rem;
  }
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
.summary-left, .summary-right { display: flex; align-items: center; gap: 1rem; }
.select-all-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500; }
.select-all-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
.selected-count { background: #3498db; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; }
.btn-batch-mode { padding: 0.5rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s; }
.btn-batch-mode:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
.btn-add-icon { width: 36px; height: 36px; border: none; border-radius: 50%; background: linear-gradient(135deg, #3498db 0%, #2ecc71 100%); color: white; font-size: 1.5rem; font-weight: 300; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.3s; line-height: 1; padding-bottom: 4px; }
.btn-add-icon:hover { transform: translateY(-2px) scale(1.1); box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4); }
.btn-cancel-batch { padding: 0.35rem 0.75rem; background: #e0e0e0; color: #666; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.2s; }
.btn-cancel-batch:hover { background: #d0d0d0; }
.btn-batch-delete { padding: 0.5rem 1rem; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s; }
.btn-batch-delete:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4); }
.btn-batch-delete:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
