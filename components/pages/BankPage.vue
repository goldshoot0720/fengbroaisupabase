<template>
  <PageContainer>
    <div class="bank-page">
      <!-- 操作區 -->
      <div class="actions-bar">
        <div class="total-assets-card">
          <div class="label">總資產</div>
          <div class="amount">NT$ {{ formatNumber(totalAssets) }}</div>
        </div>
        <div class="csv-actions">
          <button v-if="banks.length > 0" @click="exportBanksCsv" class="btn-csv export">
            匯出 CSV
          </button>
          <button @click="$refs.csvFileInput.click()" class="btn-csv import">
            匯入 CSV
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

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && banks.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增帳戶">+</button>
          <template v-if="batchMode">
            <label class="select-all-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全選</span>
            </label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ banks.length }} 個項目</span>
          <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>
        </div>
        <div class="summary-right">
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除選中 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-if="loading && banks.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>載入資料中...</p>
      </div>

      <!-- 空狀態 (無資料時顯示) -->
      <div v-else-if="banks.length === 0 && !isAddingInline" class="empty-state">
        <div class="empty-icon">🏦</div>
        <h3>尚無銀行帳戶資料</h3>
        <p>您可以手動新增，或直接匯入預設的 9 家銀行。</p>
        <div class="empty-actions">
          <button class="btn-primary" @click="handleInitDefaults">
            <span class="icon">⚡</span> 一鍵匯入預設銀行
          </button>
          <button class="btn-secondary" @click="openAddModal">
            <span class="icon">➕</span> 手動新增
          </button>
        </div>
      </div>

      <!-- 銀行列表 Grid -->
      <div v-if="isAddingInline || banks.length > 0" class="bank-grid">

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="bank-card card-editing">
          <div class="bank-header">
            <div class="bank-title">
              <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="銀行名稱 *" />
            </div>
            <div class="bank-actions">
              <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
              <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
            </div>
          </div>
          <div class="bank-info inline-edit-content">
            <div class="inline-edit-form">
              <div class="inline-field-row"><label>存款</label><input v-model.number="addForm.deposit" type="number" class="inline-input" placeholder="0" /></div>
              <div class="inline-field-row"><label>帳號</label><input v-model="addForm.account" type="text" class="inline-input" placeholder="帳號" /></div>
              <div class="inline-field-row"><label>卡號</label><input v-model="addForm.card" type="text" class="inline-input" placeholder="卡號" /></div>
              <div class="inline-field-row"><label>分行</label><input v-model="addForm.site" type="text" class="inline-input" placeholder="分行/網點" /></div>
              <div class="inline-field-row"><label>地址</label><input v-model="addForm.address" type="text" class="inline-input" placeholder="地址" /></div>
              <div class="inline-field-row"><label>提款</label><input v-model.number="addForm.withdrawals" type="number" class="inline-input" placeholder="提款" /></div>
              <div class="inline-field-row"><label>轉帳</label><input v-model.number="addForm.transfer" type="number" class="inline-input" placeholder="轉帳" /></div>
              <div class="inline-field-row"><label>活動</label><textarea v-model="addForm.activity" class="inline-input inline-textarea" rows="2" placeholder="活動/備註"></textarea></div>
            </div>
          </div>
        </div>
        <div v-for="bank in banks" :key="bank.id" class="bank-card" :class="{ 'card-editing': editingId === bank.id }">
          <!-- 行內編輯模式 -->
          <template v-if="editingId === bank.id">
            <div class="bank-header">
              <div class="bank-title">
                <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="銀行名稱">
              </div>
              <div class="bank-actions">
                <button class="btn-icon save" @click="saveInlineEdit" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
              </div>
            </div>
            <div class="bank-info inline-edit-content">
              <div class="inline-edit-form">
                <div class="inline-field-row">
                  <label>存款</label>
                  <input v-model.number="editForm.deposit" type="number" class="inline-input" placeholder="存款金額">
                </div>
                <div class="inline-field-row">
                  <label>帳號</label>
                  <input v-model="editForm.account" type="text" class="inline-input" placeholder="帳號">
                </div>
                <div class="inline-field-row">
                  <label>卡號</label>
                  <input v-model="editForm.card" type="text" class="inline-input" placeholder="卡號">
                </div>
                <div class="inline-field-row">
                  <label>分行</label>
                  <input v-model="editForm.site" type="text" class="inline-input" placeholder="分行/網點">
                </div>
                <div class="inline-field-row">
                  <label>地址</label>
                  <input v-model="editForm.address" type="text" class="inline-input" placeholder="地址">
                </div>
                <div class="inline-field-row">
                  <label>提款</label>
                  <input v-model.number="editForm.withdrawals" type="number" class="inline-input" placeholder="提款">
                </div>
                <div class="inline-field-row">
                  <label>轉帳</label>
                  <input v-model.number="editForm.transfer" type="number" class="inline-input" placeholder="轉帳">
                </div>
                <div class="inline-field-row">
                  <label>活動</label>
                  <textarea v-model="editForm.activity" class="inline-input inline-textarea" rows="2" placeholder="活動/備註"></textarea>
                </div>
              </div>
            </div>
          </template>

          <!-- 顯示模式 -->
          <template v-else>
          <div class="bank-header">
            <div class="bank-title">
              <img 
                v-if="getBankFavicon(bank.name)" 
                :src="getBankFavicon(bank.name)" 
                :alt="bank.name"
                class="bank-favicon"
                @error="$event.target.style.display='none'"
              >
              <h3 class="bank-name">{{ bank.name }}</h3>
            </div>
            <div class="bank-actions">
              <button class="btn-icon" @click="startInlineEdit(bank)" title="編輯">✏️</button>
              <button class="btn-icon delete" @click="confirmDelete(bank)" title="刪除">🗑️</button>
            </div>
          </div>
          
          <div class="bank-info">
            <div class="info-item highlight">
              <span class="label">存款</span>
              <span class="value">NT$ {{ formatNumber(bank.deposit) }}</span>
            </div>
            
            <div class="info-row">
              <div class="info-item">
                <span class="label">帳號</span>
                <span class="value">{{ bank.account || '未設定' }}</span>
              </div>
              <div class="info-item">
                <span class="label">卡號</span>
                <span class="value">{{ bank.card || '未設定' }}</span>
              </div>
            </div>

            <div class="info-details" v-if="showDetails[bank.id]">
              <div class="detail-item">
                <span class="label">分行/網點:</span> {{ bank.site || '-' }}
              </div>
              <div class="detail-item">
                <span class="label">地址:</span> {{ bank.address || '-' }}
              </div>
              <div class="detail-item">
                <span class="label">提款:</span> NT$ {{ formatNumber(bank.withdrawals) }}
              </div>
              <div class="detail-item">
                <span class="label">轉帳:</span> NT$ {{ formatNumber(bank.transfer) }}
              </div>
              <div class="detail-item full-width">
                <span class="label">活動/備註:</span> {{ bank.activity || '-' }}
              </div>
            </div>
            
            <button 
              class="btn-toggle-details" 
              @click="toggleDetails(bank.id)"
            >
              {{ showDetails[bank.id] ? '收起詳細資訊' : '顯示詳細資訊' }}
            </button>
          </div>
          </template>
        </div>
      </div>

      <!-- 編輯/新增 Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ isEditing ? '編輯銀行帳戶' : '新增銀行帳戶' }}</h3>
            <button class="btn-close" @click="closeModal">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>銀行名稱</label>
              <select v-model="formData.name" class="form-select">
                <option value="" disabled>請選擇銀行</option>
                <option v-for="name in defaultBankNames" :key="name" :value="name">
                  {{ name }}
                </option>
                <option value="other">其他 (手動輸入)</option>
              </select>
              <input 
                v-if="formData.name === 'other' || !defaultBankNames.includes(formData.name)" 
                v-model="customBankName" 
                type="text" 
                class="form-input mt-2" 
                placeholder="輸入銀行名稱"
              >
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>存款金額</label>
                <input v-model.number="formData.deposit" type="number" class="form-input">
              </div>
              <div class="form-group">
                <label>帳號</label>
                <input v-model="formData.account" type="text" class="form-input">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>卡號</label>
                <input v-model="formData.card" type="text" class="form-input">
              </div>
              <div class="form-group">
                <label>分行/網點</label>
                <input v-model="formData.site" type="text" class="form-input">
              </div>
            </div>

            <div class="form-group">
              <label>地址</label>
              <input v-model="formData.address" type="text" class="form-input">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>提款紀錄</label>
                <input v-model.number="formData.withdrawals" type="number" class="form-input">
              </div>
              <div class="form-group">
                <label>轉帳紀錄</label>
                <input v-model.number="formData.transfer" type="number" class="form-input">
              </div>
            </div>

            <div class="form-group">
              <label>活動/備註</label>
              <textarea v-model="formData.activity" class="form-textarea" rows="3"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">取消</button>
            <button class="btn-submit" @click="handleSubmit" :disabled="loading">
              {{ loading ? '處理中...' : '確認儲存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import { useBanks } from '../../composables/useBanks'

const {
  banks,
  loading,
  defaultBankNames,
  getBankFavicon,
  loadBanks,
  addBank,
  importBanks,
  updateBank,
  deleteBank,
  initDefaultBanks,
  totalAssets
} = useBanks()

// 狀態
const showModal = ref(false)
const isEditing = ref(false)
const showDetails = ref({})
const customBankName = ref('')

// 行內編輯
const editingId = ref(null)
const editForm = reactive({})

const startInlineEdit = (bank) => {
  Object.assign(editForm, {
    id: bank.id,
    name: bank.name || '',
    deposit: bank.deposit || 0,
    site: bank.site || '',
    address: bank.address || '',
    withdrawals: bank.withdrawals || 0,
    transfer: bank.transfer || 0,
    activity: bank.activity || '',
    card: bank.card || '',
    account: bank.account || ''
  })
  editingId.value = bank.id
}

const cancelInlineEdit = () => {
  editingId.value = null
}

const saveInlineEdit = async () => {
  if (!editForm.name) {
    alert('請輸入銀行名稱')
    return
  }
  const result = await updateBank(editForm.id, { ...editForm })
  if (result.success) {
    editingId.value = null
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

const batchMode = ref(false)
const selectedIds = ref(new Set())

const enterBatchMode = () => { batchMode.value = true }
const exitBatchMode = () => { batchMode.value = false; selectedIds.value = new Set() }

const isAllSelected = computed(() => {
  return banks.value.length > 0 && banks.value.every(a => selectedIds.value.has(a.id))
})

const toggleSelect = (id) => {
  const s = new Set(selectedIds.value)
  if (s.has(id)) { s.delete(id) } else { s.add(id) }
  selectedIds.value = s
}

const toggleSelectAll = () => {
  if (isAllSelected.value) { selectedIds.value = new Set() }
  else { selectedIds.value = new Set(banks.value.map(a => a.id)) }
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return
  if (count === banks.value.length) {
    const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE bank 確認：`)
    if (input !== 'DELETE bank') { alert('輸入不正確，已取消'); return }
  } else {
    if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) return
  }
  let ok = 0
  for (const id of [...selectedIds.value]) {
    const r = await deleteBank(id)
    if (r.success) ok++
  }
  selectedIds.value = new Set()
  batchMode.value = false
  alert(`已刪除 ${ok} 筆`)
}

// 表單資料
const formData = reactive({
  id: null,
  name: '',
  deposit: 0,
  site: '',
  address: '',
  withdrawals: 0,
  transfer: 0,
  activity: '',
  card: '',
  account: ''
})

// 初始化
onMounted(() => {
  loadBanks()
})

// 監聽銀行名稱選擇
watch(() => formData.name, (newVal) => {
  if (newVal === 'other') {
    customBankName.value = ''
  } else if (newVal && !defaultBankNames.includes(newVal)) {
    // 編輯時如果是自定義名稱
    customBankName.value = newVal
  }
})

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
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim()); current = ''
      } else { current += char }
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
      else { current += char }
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

const exportBanksCsv = () => {
  const header = ['銀行名稱', '存款', '帳號', '卡號', '分行/網點', '地址', '提款', '轉帳', '活動/備註']
  const rows = banks.value.map(b => [
    b.name || '',
    b.deposit ?? '',
    b.account || '',
    b.card || '',
    b.site || '',
    b.address || '',
    b.withdrawals ?? '',
    b.transfer ?? '',
    b.activity || ''
  ])
  const bom = '\uFEFF'
  const csvContent = bom + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'supabase-bank.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const handleImportCsv = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const text = await file.text()
  let rows = parseCsv(text)
  if (rows.length === 0) { alert('CSV 檔案無有效資料'); return }

  // 偵測 Appwrite 格式
  const firstRow = rows[0]
  const isAppwrite = '$id' in firstRow || '$createdAt' in firstRow || '$collectionId' in firstRow

  if (isAppwrite) {
    console.log('偵測到 Appwrite CSV 格式，自動轉換欄位')
    rows = rows.map(r => {
      const mapped = {}
      for (const [key, value] of Object.entries(r)) {
        if (key.startsWith('$')) continue
        mapped[key] = value
      }
      return mapped
    })
  }

  let confirmMsg = `確定匯入 ${rows.length} 筆銀行資料？`
  if (isAppwrite) {
    confirmMsg = `ℹ️ 偵測到 Appwrite CSV 格式\n\n已自動移除系統欄位（$id, $createdAt...）\n\n確定匯入 ${rows.length} 筆銀行資料？`
  }

  if (!confirm(confirmMsg)) return
  const result = await importBanks(rows)
  if (result.success) {
    alert(`✅ 成功匯入 ${result.count} 筆銀行帳戶！`)
  } else {
    alert('匯入失敗: ' + result.error)
  }
  e.target.value = ''
}

// 格式化數字
const formatNumber = (num) => {
  return Number(num || 0).toLocaleString()
}

// 切換詳細資訊
const toggleDetails = (id) => {
  showDetails.value[id] = !showDetails.value[id]
}

// 行內新增
const isAddingInline = ref(false)
const addForm = reactive({ name: '', deposit: 0, site: '', address: '', withdrawals: 0, transfer: 0, activity: '', card: '', account: '' })
const openInlineAdd = () => { Object.assign(addForm, { name: '', deposit: 0, site: '', address: '', withdrawals: 0, transfer: 0, activity: '', card: '', account: '' }); isAddingInline.value = true }
const cancelInlineAdd = () => { isAddingInline.value = false }
const saveInlineAdd = async () => {
  if (!addForm.name) { alert('請輸入銀行名稱'); return }
  const result = await addBank({ ...addForm })
  if (result.success) { isAddingInline.value = false } else { alert('新增失敗: ' + result.error) }
}

// 開啟新增 Modal
const openAddModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

// 開啟編輯 Modal
const editBank = (bank) => {
  isEditing.value = true
  Object.assign(formData, bank)
  
  // 處理自定義銀行名稱
  if (!defaultBankNames.includes(bank.name)) {
    customBankName.value = bank.name
    // 這裡我們暫時讓 select 顯示為空或保留原值，UI處理稍顯複雜
    // 簡單作法：如果不包含在預設列表，我們假設它是"other"
    // 但因為 select v-model 綁定的是 formData.name，所以我們需要一個 computed 或邏輯來處理
  }
  
  showModal.value = true
}

// 重置表單
const resetForm = () => {
  Object.keys(formData).forEach(key => {
    formData[key] = key === 'deposit' || key === 'withdrawals' || key === 'transfer' ? 0 : ''
  })
  formData.id = null
  customBankName.value = ''
}

// 關閉 Modal
const closeModal = () => {
  showModal.value = false
  resetForm()
}

// 提交表單
const handleSubmit = async () => {
  // 處理銀行名稱
  let finalName = formData.name
  if (finalName === 'other' || !defaultBankNames.includes(finalName)) {
    finalName = customBankName.value
  }
  
  if (!finalName) {
    alert('請輸入銀行名稱')
    return
  }

  const payload = {
    ...formData,
    name: finalName
  }

  let result
  if (isEditing.value) {
    result = await updateBank(formData.id, payload)
  } else {
    result = await addBank(payload)
  }

  if (result.success) {
    closeModal()
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 確認刪除
const confirmDelete = async (bank) => {
  if (confirm(`確定要刪除 ${bank.name} 的資料嗎？`)) {
    await deleteBank(bank.id)
  }
}

// 一鍵匯入預設銀行
const handleInitDefaults = async () => {
  if (confirm('確定要匯入 9 家預設銀行嗎？')) {
    const result = await initDefaultBanks()
    if (result.success) {
      alert('成功匯入預設銀行！')
    } else {
      alert('匯入失敗: ' + result.error)
    }
  }
}

// SEO
useHead({
  title: '銀行統計 - 鋒兄AI Supabase',
  meta: [
    { name: 'description', content: '管理銀行帳戶與資產統計' }
  ]
})
</script>

<style scoped>
/* 行內編輯樣式 */
.card-editing {
  box-shadow: 0 4px 12px rgba(250, 112, 154, 0.2);
  border-left: 4px solid #fa709a;
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
  border-color: #fa709a;
  box-shadow: 0 0 0 2px rgba(250, 112, 154, 0.15);
}

.inline-name {
  flex: 1;
  font-weight: 600;
  font-size: 1rem;
}

.inline-edit-content {
  padding: 1rem;
}

.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inline-field-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.inline-field-row label {
  min-width: 50px;
  font-size: 0.8rem;
  color: #666;
  padding-top: 0.4rem;
  flex-shrink: 0;
}

.inline-textarea {
  resize: vertical;
  min-height: 50px;
}

.btn-icon.save:hover {
  background: #ecfdf5;
}

.bank-page {
  animation: fadeIn 0.3s ease-in;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  margin-top: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #666;
  margin-bottom: 2rem;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  border-radius: 12px;
  color: white;
  position: relative;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.page-description {
  font-size: 1.1rem;
  opacity: 0.95;
  margin-bottom: 1.5rem;
}

.total-assets-card {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  color: white;
}

.total-assets-card .label {
  font-size: 0.8rem;
  opacity: 0.9;
  margin-bottom: 0.15rem;
}

.total-assets-card .amount {
  font-size: 1.5rem;
  font-weight: 800;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.actions-bar {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-csv {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.btn-csv.export {
  background: #27ae60;
}

.btn-csv.export:hover {
  background: #219a52;
}

.btn-csv.import {
  background: #2980b9;
}

.btn-csv.import:hover {
  background: #2471a3;
}

/* Grid Layout - 手機版優先一欄，平板以上兩欄 */
.bank-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 769px) {
  .bank-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.bank-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  border-top: 4px solid #fa709a;
}

.bank-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
}

.bank-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.75rem;
}

.bank-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bank-favicon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
  background: #f8f9fa;
  padding: 2px;
}

.bank-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.bank-actions {
  display: flex;
  gap: 0.5rem;
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

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.info-item.highlight {
  background: #fff5f7;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.info-item.highlight .value {
  color: #fa709a;
  font-weight: 700;
  font-size: 1.2rem;
}

.info-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.info-row .info-item {
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0;
}

.info-row .label {
  font-size: 0.8rem;
  color: #666;
}

.info-row .value {
  font-size: 0.95rem;
  font-weight: 500;
  word-break: break-all;
}

.label {
  color: #666;
}

.value {
  color: #333;
  font-weight: 500;
}

.btn-toggle-details {
  width: 100%;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-toggle-details:hover {
  background: #eee;
}

.info-details {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed #eee;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.detail-item.full-width {
  grid-column: 1 / -1;
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
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
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

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: #fa709a;
  box-shadow: 0 0 0 3px rgba(250, 112, 154, 0.1);
}

.mt-2 {
  margin-top: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
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
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: white;
  color: #fa709a;
  border: 1px solid #fa709a;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  margin-right: 1rem;
}

.btn-secondary:hover {
  background: #fff0f5;
}

.btn-submit {
  background: #fa709a;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit:disabled {
  background: #fca5c2;
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

.loading-state {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #fa709a;
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
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: linear-gradient(135deg, rgba(52, 152, 219, 0.08) 0%, rgba(46, 204, 113, 0.08) 100%); border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.95rem; color: #555; flex-wrap: wrap; gap: 0.5rem; }
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
