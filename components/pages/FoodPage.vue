<template>
  <div class="food-management">
    <!-- 操作列 -->
    <div class="actions-bar">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜尋食品..."
      />
      <div class="csv-actions">
        <button v-if="foods.length > 0" @click="exportFoodsCsv" class="btn-export">匯出 CSV</button>
        <label class="btn-import">
          匯入 CSV
          <input ref="csvFileInput" type="file" accept=".csv" style="display:none" @change="handleImportCsv" />
        </label>
      </div>
    </div>

    <!-- 摘要列 + 批量操作 -->
    <div class="summary-bar">
      <div class="summary-left">
        <!-- 批量選擇模式按鈕 -->
        <button
          v-if="!batchMode && filteredFoods.length > 0"
          @click="enterBatchMode"
          class="btn-batch-mode"
        >
          批量選擇
        </button>

        <!-- 新增按鈕 -->
        <button @click="startAddRow" class="btn-add-icon" title="新增食品">+</button>

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

        <span>共 {{ foods.length }} 個項目</span>
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
        <span v-if="expiringFoods.length > 0" class="expiry-warning">{{ expiringFoods.length }} 項即將到期</span>
      </div>
    </div>

    <!-- 食物表格 -->
    <div v-if="foodLoading" class="loading">載入中...</div>
    <div v-else-if="filteredFoods.length === 0 && !showAddRow" class="empty-state">暫無食品記錄</div>
    <div v-else class="food-table-container">
      <table class="food-table">
        <thead>
          <tr>
            <th v-if="batchMode" class="col-checkbox">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th class="col-name">名稱</th>
            <th class="col-date">有效期限</th>
            <th class="col-amount">數量</th>
            <th class="col-price">價格</th>
            <th class="col-photo">圖片</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <!-- 新增行 -->
          <tr v-if="showAddRow" class="add-row">
            <td v-if="batchMode" class="col-checkbox"></td>
            <td class="col-name">
              <input v-model="addForm.name" type="text" class="inline-input" placeholder="食物名稱 *" />
              <input v-model="addForm.shop" type="text" class="inline-input inline-small" placeholder="購買商店" />
            </td>
            <td class="col-date">
              <input v-model="addForm.todate" type="date" class="inline-input inline-date" />
            </td>
            <td class="col-amount">
              <input v-model="addForm.amount" type="number" class="inline-input inline-number" placeholder="0" min="1" />
            </td>
            <td class="col-price">
              <input v-model="addForm.price" type="number" class="inline-input inline-number" placeholder="0" min="0" />
            </td>
            <td class="col-photo">
              <input v-model="addForm.photo" type="text" class="inline-input inline-small" placeholder="照片URL" />
            </td>
            <td class="col-actions">
              <button @click="saveAddRow" class="btn-icon btn-save-icon" title="新增">✓</button>
              <button @click="cancelAddRow" class="btn-icon btn-cancel-icon" title="取消">✕</button>
            </td>
          </tr>

          <tr
            v-for="food in filteredFoods"
            :key="food.id"
            :class="{ selected: selectedIds.includes(food.id), editing: editingRowId === food.id }"
          >
            <!-- 批量選擇 Checkbox -->
            <td v-if="batchMode" class="col-checkbox">
              <input
                type="checkbox"
                :value="food.id"
                v-model="selectedIds"
              />
            </td>

            <!-- 編輯模式：行内編輯 -->
            <template v-if="editingRowId === food.id">
              <td class="col-name">
                <input v-model="editForm.name" type="text" class="inline-input" placeholder="食物名稱" />
                <input v-model="editForm.shop" type="text" class="inline-input inline-small" placeholder="購買商店" />
              </td>
              <td class="col-date">
                <input v-model="editForm.todate" type="date" class="inline-input inline-date" />
              </td>
              <td class="col-amount">
                <input v-model="editForm.amount" type="number" class="inline-input inline-number" placeholder="0" min="1" />
              </td>
              <td class="col-price">
                <input v-model="editForm.price" type="number" class="inline-input inline-number" placeholder="0" min="0" />
              </td>
              <td class="col-photo">
                <div v-if="editForm.photo" class="inline-photo-preview">
                  <img :src="editForm.photo" alt="預覽" class="mini-photo" @click="previewImage = editForm.photo" />
                </div>
                <input v-model="editForm.photo" type="text" class="inline-input inline-small" placeholder="照片URL" />
              </td>
              <td class="col-actions">
                <button @click="saveInlineEdit(food.id)" class="btn-icon btn-save-icon" title="儲存">✓</button>
                <button @click="cancelInlineEdit" class="btn-icon btn-cancel-icon" title="取消">✕</button>
              </td>
            </template>

            <!-- 正常顯示模式 -->
            <template v-else>
              <td class="col-name">
                <div class="name-cell">
                  <span class="food-name">{{ food.name }}</span>
                  <span v-if="food.shop" class="food-shop">{{ food.shop }}</span>
                </div>
              </td>
              <td class="col-date">
                <span :class="getExpiryClass(food.todate)">{{ formatDate(food.todate) }}</span>
              </td>
              <td class="col-amount">
                <span>{{ food.amount || '' }}</span>
              </td>
              <td class="col-price">
                <span v-if="food.price" class="price-value">NT$ {{ food.price }}</span>
              </td>
              <td class="col-photo">
                <img
                  v-if="food.photo"
                  :src="food.photo"
                  :alt="food.name"
                  class="table-photo"
                  @click="previewImage = food.photo"
                />
              </td>
              <td class="col-actions">
                <button @click="startInlineEdit(food)" class="btn-icon btn-edit-icon" title="編輯">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button @click="deleteFood(food.id)" class="btn-icon btn-delete-icon" title="刪除">✕</button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Image Preview Lightbox -->
    <div v-if="previewImage" class="lightbox-overlay" @click="previewImage = null">
      <img :src="previewImage" class="lightbox-image" />
    </div>

    <!-- 安全確認 Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="closeConfirmModal">
      <div class="modal confirm-modal">
        <div class="modal-header danger">
          <h2>安全確認</h2>
          <button @click="closeConfirmModal" class="btn-close">&times;</button>
        </div>
        <div class="confirm-body">
          <p class="confirm-warning">
            您即將刪除 <strong>{{ selectedIds.length }}</strong> 個食品項目
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFoods } from '../../composables/useFoods'
import { useFormatters } from '../../composables/useFormatters'

const searchQuery = ref('')
const previewImage = ref(null)

const {
  foods,
  foodLoading,
  expiringFoods,
  sortedFoods,
  loadFoods,
  addFoodInline,
  importFoods,
  isAppwriteFormat,
  updateFoodInline,
  deleteFood,
  batchDeleteFoods
} = useFoods()

const { formatDate, getExpiryClass } = useFormatters()

// 批量選擇
const selectedIds = ref([])
const batchMode = ref(false)

const enterBatchMode = () => {
  batchMode.value = true
  selectedIds.value = []
}

const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value = []
}

// 行内編輯
const editingRowId = ref(null)
const editForm = ref({
  name: '',
  shop: '',
  todate: '',
  amount: null,
  price: null,
  photo: '',
  photohash: ''
})

// 行内新增
const showAddRow = ref(false)
const addForm = ref({
  name: '',
  shop: '',
  todate: '',
  amount: null,
  price: null,
  photo: '',
  photohash: ''
})

const startAddRow = () => {
  showAddRow.value = true
  addForm.value = {
    name: '',
    shop: '',
    todate: '',
    amount: null,
    price: null,
    photo: '',
    photohash: ''
  }
}

const cancelAddRow = () => {
  showAddRow.value = false
}

const saveAddRow = async () => {
  if (!addForm.value.name) {
    alert('請輸入食物名稱')
    return
  }
  const result = await addFoodInline(addForm.value)
  if (result.success) {
    showAddRow.value = false
  } else {
    alert('新增失敗: ' + result.error)
  }
}

const startInlineEdit = (food) => {
  editingRowId.value = food.id
  editForm.value = {
    name: food.name || '',
    shop: food.shop || '',
    todate: food.todate || '',
    amount: food.amount || null,
    price: food.price || null,
    photo: food.photo || '',
    photohash: food.photohash || ''
  }
}

const cancelInlineEdit = () => {
  editingRowId.value = null
}

const saveInlineEdit = async (id) => {
  const result = await updateFoodInline(id, editForm.value)
  if (result.success) {
    editingRowId.value = null
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 安全確認 Modal
const showConfirmModal = ref(false)
const confirmInput = ref('')
const CONFIRM_TEXT = 'DELETE food'

const isAllSelected = computed(() => {
  return filteredFoods.value.length > 0 &&
         selectedIds.value.length === filteredFoods.value.length
})

const isConfirmValid = computed(() => {
  return confirmInput.value === CONFIRM_TEXT
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredFoods.value.map(f => f.id)
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

  const result = await batchDeleteFoods(selectedIds.value)
  if (result.success) {
    selectedIds.value = []
    batchMode.value = false
    closeConfirmModal()
    alert(`成功刪除 ${result.count} 個食品！`)
  } else {
    alert('批量刪除失敗: ' + result.error)
  }
}

const filteredFoods = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sortedFoods.value
  return sortedFoods.value.filter(f =>
    (f.name || '').toLowerCase().includes(q) ||
    (f.shop || '').toLowerCase().includes(q)
  )
})

onMounted(() => {
  loadFoods()
})

const exportFoodsCsv = () => {
  const header = ['name', 'amount', 'price', 'shop', 'todate', 'photo', 'photohash']
  const rows = sortedFoods.value.map(food => [
    food.name || '', food.amount ?? '', food.price ?? '',
    food.shop || '', food.todate || '', food.photo || '', food.photohash || ''
  ])
  const bom = '\uFEFF'
  const csvContent = bom + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'supabase-food.csv'
  link.click()
  URL.revokeObjectURL(url)
}

const csvFileInput = ref(null)

const parseCsv = (text) => {
  const parseRow = (line) => {
    const cells = []; let current = ''; let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') { if (inQuotes && line[i+1] === '"') { current += '"'; i++ } else inQuotes = !inQuotes }
      else if (char === ',' && !inQuotes) { cells.push(current.trim()); current = '' }
      else current += char
    }
    cells.push(current.trim()); return cells
  }
  const splitIntoRows = (text) => {
    const rows = []; let current = ''; let inQuotes = false
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '"') { inQuotes = !inQuotes; current += char }
      else if (char === '\n' && !inQuotes) { if (current.trim()) rows.push(current); current = '' }
      else current += char
    }
    if (current.trim()) rows.push(current); return rows
  }
  const lines = splitIntoRows(text)
  if (lines.length < 2) return []
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const cells = parseRow(line); const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' }); return obj
  })
}

const handleImportCsv = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) { alert('CSV 檔案無有效資料'); return }
  const isAppwrite = isAppwriteFormat(rows)
  let confirmMsg = `確定匯入 ${rows.length} 筆食品資料？`
  if (isAppwrite) confirmMsg = `偵測到 ISO 8601 日期格式\n系統將自動轉換\n\n確定匯入 ${rows.length} 筆食品資料？`
  if (!confirm(confirmMsg)) return
  const result = await importFoods(rows)
  if (result.success) alert(`成功匯入 ${result.count} 筆食品！`)
  else alert('匯入失敗: ' + result.error)
  e.target.value = ''
}

defineExpose({ foods, expiringFoods })
</script>

<style scoped>
.food-management {
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
  border-color: #27ae60;
}

.csv-actions { display: flex; gap: 0.5rem; }

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

.btn-import { display: inline-block; }

/* Summary bar */
.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(39, 174, 96, 0.08) 0%, rgba(46, 204, 113, 0.08) 100%);
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
  background: #27ae60;
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
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
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
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
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

.btn-cancel-batch:hover { background: #d0d0d0; }

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

.expiry-warning {
  color: #e74c3c;
  font-weight: 700;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
}

/* Table */
.food-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow-x: auto;
  border: 1px solid #f0f0f0;
}

.food-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.food-table thead {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.food-table th {
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
  white-space: nowrap;
}

.food-table td {
  padding: 0.875rem 0.75rem;
  border-bottom: 1px solid #e9ecef;
  vertical-align: middle;
}

.food-table tbody tr {
  transition: background-color 0.2s;
}

.food-table tbody tr:hover {
  background-color: #f8f9fa;
}

.food-table tbody tr.selected {
  background-color: rgba(39, 174, 96, 0.1);
}

.food-table tbody tr.selected:hover {
  background-color: rgba(39, 174, 96, 0.15);
}

.food-table tbody tr.editing {
  background-color: rgba(255, 243, 205, 0.5);
}

.food-table tbody tr.editing:hover {
  background-color: rgba(255, 243, 205, 0.7);
}

.food-table tbody tr.add-row {
  background-color: rgba(212, 237, 218, 0.5);
  border-left: 3px solid #28a745;
}

.food-table tbody tr.add-row:hover {
  background-color: rgba(212, 237, 218, 0.7);
}

/* Inline editing inputs */
.inline-input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #27ae60;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s;
}

.inline-input:focus {
  outline: none;
  border-color: #219a52;
  box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
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

.inline-number {
  width: 80px;
  text-align: right;
}

.inline-photo-preview {
  margin-bottom: 0.35rem;
}

.mini-photo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
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
  min-width: 150px;
  max-width: 220px;
}

.col-date {
  width: 110px;
  white-space: nowrap;
}

.col-amount {
  width: 70px;
  text-align: center;
}

.col-price {
  width: 90px;
}

.col-photo {
  width: 60px;
}

.col-actions {
  width: 100px;
  text-align: center;
}

/* Cell content */
.name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.food-name {
  font-weight: 600;
  color: #2c3e50;
}

.food-shop {
  font-size: 0.8rem;
  color: #6c757d;
}

.price-value {
  font-weight: 600;
  color: #e67e22;
}

.table-photo {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.table-photo:hover { transform: scale(1.1); }

.date-normal { color: #27ae60; }
.date-soon { color: #f39c12; font-weight: bold; }
.date-overdue { color: #e74c3c; font-weight: bold; }
.date-critical { color: #e74c3c; font-weight: bold; }

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

/* Lightbox */
.lightbox-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: pointer;
}

.lightbox-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

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
  max-width: 450px;
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
}

.modal-header.danger h2 {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
  width: 32px; height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.btn-close:hover { background: #f5f5f5; color: #333; }

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

.confirm-error {
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 0.75rem;
  text-align: center;
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

.btn-cancel { background: #e0e0e0; color: #666; }
.btn-cancel:hover { background: #d0d0d0; }

.btn-danger {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%) !important;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive */
@media (max-width: 768px) {
  .food-table-container {
    font-size: 0.85rem;
  }

  .food-table th,
  .food-table td {
    padding: 0.625rem 0.5rem;
  }

  .col-name {
    min-width: 120px;
  }

  .col-price,
  .food-shop {
    display: none;
  }
}
</style>
