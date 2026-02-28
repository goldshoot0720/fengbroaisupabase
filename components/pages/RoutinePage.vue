<template>
  <PageContainer>
    <div class="routine-page">
      <div class="actions-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋例行名稱..."
          class="search-input"
        />
        <div class="csv-actions">
          <button @click="exportCsv" class="btn-export">匯出 CSV</button>
          <label class="btn-import">
            匯入 CSV
            <input
              type="file"
              accept=".csv"
              @change="handleImport"
              style="display: none"
            />
          </label>
        </div>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredRoutines.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增">+</button>
          <template v-if="batchMode">
            <label class="select-all-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全選</span>
            </label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ routines.length }} 個項目</span>
          <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>
        </div>
        <div class="summary-right">
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除選中 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <div v-if="loading" class="loading">載入中...</div>
      <div v-else-if="filteredRoutines.length === 0 && !isAddingInline" class="empty-state">
        暫無例行記錄
      </div>
      <div v-if="isAddingInline || filteredRoutines.length > 0" class="routine-table-wrapper">
        <table class="routine-table">
          <thead>
            <tr>
              <th>名稱</th>
              <th>備註</th>
              <th>圖片</th>
              <th>最近例行之一</th>
              <th>最近例行之二</th>
              <th>相距天數</th>
              <th>最近例行之三</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- 行內新增面板 -->
            <template v-if="isAddingInline">
              <tr class="row-editing">
                <td colspan="8" class="td-inline-edit-full">
                  <div class="inline-edit-panel">
                    <div class="inline-field-row">
                      <label class="inline-edit-label">名稱</label>
                      <input v-model="addForm.name" type="text" class="inline-input" placeholder="名稱 *">
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">最近例行之一</label>
                      <input v-model="addForm.lastdate1" type="date" class="inline-input">
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">最近例行之二</label>
                      <input v-model="addForm.lastdate2" type="date" class="inline-input">
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">最近例行之三</label>
                      <input v-model="addForm.lastdate3" type="date" class="inline-input">
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">連結</label>
                      <input v-model="addForm.link" type="text" class="inline-input" placeholder="https://...">
                    </div>
                    <div class="inline-field-row" style="flex-direction:column;align-items:flex-start;gap:0.25rem">
                      <label class="inline-edit-label">備註</label>
                      <textarea v-model="addForm.note" class="inline-input inline-textarea" rows="5" placeholder="備註..."></textarea>
                    </div>
                    <div class="inline-actions-row">
                      <button @click="saveInlineAdd" class="btn-save">💾 儲存</button>
                      <button @click="cancelInlineAdd" class="btn-cancel">✕ 取消</button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            <template v-for="routine in filteredRoutines" :key="routine.id">
              <!-- 行內編輯模式 - 整合單列 -->
              <tr v-if="editingId === routine.id" class="row-editing">
                <td colspan="8" class="td-inline-edit-full">
                  <div class="inline-edit-panel">
                    <div class="inline-field-row">
                      <label class="inline-edit-label">名稱</label>
                      <input
                        ref="inlineNameInput"
                        v-model="editForm.name"
                        type="text"
                        class="inline-input"
                        placeholder="名稱"
                        @keydown.enter="saveInlineEdit"
                        @keydown.escape="cancelInlineEdit"
                      >
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">最近例行之一</label>
                      <input v-model="editForm.lastdate1" type="date" class="inline-input" @keydown.escape="cancelInlineEdit">
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">最近例行之二</label>
                      <input v-model="editForm.lastdate2" type="date" class="inline-input" @keydown.escape="cancelInlineEdit">
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">最近例行之三</label>
                      <input v-model="editForm.lastdate3" type="date" class="inline-input" @keydown.escape="cancelInlineEdit">
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">連結</label>
                      <input v-model="editForm.link" type="text" class="inline-input" placeholder="https://..." @keydown.escape="cancelInlineEdit">
                    </div>
                    <div class="inline-field-row" style="flex-direction:column;align-items:flex-start;gap:0.25rem">
                      <label class="inline-edit-label">備註</label>
                      <textarea
                        v-model="editForm.note"
                        class="inline-input inline-textarea"
                        rows="5"
                        placeholder="輸入備註內容..."
                        @keydown.escape="cancelInlineEdit"
                      ></textarea>
                    </div>
                    <div class="inline-field-row">
                      <label class="inline-edit-label">圖片</label>
                      <div class="inline-photo-edit" style="flex:1">
                        <input
                          v-model="editForm.photo"
                          type="text"
                          class="inline-input"
                          placeholder="圖片 URL"
                          @keydown.enter="saveInlineEdit"
                          @keydown.escape="cancelInlineEdit"
                        >
                        <label class="btn-inline-upload" title="上傳圖片">
                          📷
                          <input type="file" accept="image/*" @change="handleInlinePhotoUpload" style="display: none" />
                        </label>
                      </div>
                    </div>
                    <div v-if="inlineUploading" class="inline-upload-status">上傳中...</div>
                    <div v-if="editForm.photo" class="inline-photo-preview">
                      <img :src="editForm.photo" alt="預覽" />
                    </div>
                    <div class="inline-actions-row">
                      <button @click="saveInlineEdit" class="btn-save" title="儲存 (Enter)">💾 儲存</button>
                      <button @click="cancelInlineEdit" class="btn-cancel" title="取消 (Esc)">✕ 取消</button>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- 顯示模式 -->
              <tr v-else>
                <td class="td-name">{{ routine.name }}</td>
                <td class="td-note">{{ routine.note || '' }}</td>
                <td class="td-photo">
                  <img
                    v-if="routine.photo"
                    :src="routine.photo"
                    :alt="routine.name"
                    class="table-photo"
                    @click="previewImage = routine.photo"
                  />
                </td>
                <td class="td-date">{{ formatDate(routine.lastdate1) }}</td>
                <td class="td-date">{{ formatDate(routine.lastdate2) }}</td>
                <td class="td-days">
                  <span v-if="getDaysBetween(routine.lastdate1, routine.lastdate2) !== null" class="days-badge">
                    {{ getDaysBetween(routine.lastdate1, routine.lastdate2) }} 天
                  </span>
                </td>
                <td class="td-date">{{ formatDate(routine.lastdate3) }}</td>
                <td class="td-actions">
                  <button @click="handleShiftDates(routine)" class="btn-shift" title="日期遞移">&rarr;</button>
                  <button @click="startInlineEdit(routine)" class="btn-edit">編輯</button>
                  <button @click="handleDelete(routine.id)" class="btn-delete">刪除</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Image Preview Lightbox -->
      <div v-if="previewImage" class="lightbox-overlay" @click="previewImage = null">
        <img :src="previewImage" class="lightbox-image" />
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ isEditMode ? '編輯例行' : '新增例行' }}</h2>
            <button @click="closeModal" class="btn-close">×</button>
          </div>
          <form @submit.prevent="handleSubmit" class="modal-form">
            <div class="form-group">
              <label>名稱 *</label>
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="例行名稱"
              />
            </div>
            <div class="form-group">
              <label>備註</label>
              <textarea
                v-model="formData.note"
                rows="3"
                placeholder="備註說明"
              ></textarea>
            </div>
            <div class="form-group">
              <label>最後日期1</label>
              <input v-model="formData.lastdate1" type="date" />
            </div>
            <div class="form-group">
              <label>最後日期2</label>
              <input v-model="formData.lastdate2" type="date" />
            </div>
            <div class="form-group">
              <label>最後日期3</label>
              <input v-model="formData.lastdate3" type="date" />
            </div>
            <div class="form-group">
              <label>連結</label>
              <input
                v-model="formData.link"
                type="text"
                placeholder="https://..."
              />
            </div>
            <div class="form-group">
              <label>照片上傳</label>
              <div class="upload-area">
                <input
                  ref="photoInput"
                  type="file"
                  accept="image/*"
                  @change="handlePhotoUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.photoInput.click()"
                  class="btn-upload"
                  :disabled="uploading"
                >
                  {{ uploading ? '上傳中...' : '選擇照片' }}
                </button>
                <span v-if="uploadProgress > 0" class="upload-progress">{{ uploadProgress }}%</span>
              </div>
              <div v-if="formData.photo" class="photo-preview">
                <img :src="formData.photo" alt="預覽" class="preview-image" />
                <button type="button" @click="removePhoto" class="btn-remove">移除</button>
              </div>
              <input
                v-model="formData.photo"
                type="text"
                placeholder="或直接輸入照片 URL"
                class="url-input"
              />
            </div>
            <div class="modal-actions">
              <button type="button" @click="closeModal" class="btn-cancel">
                取消
              </button>
              <button type="submit" class="btn-submit">
                {{ isEditMode ? '更新' : '新增' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, reactive, nextTick } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useRoutines } from '../../composables/useRoutines'
import { useStorage } from '../../composables/useStorage'

useHead({
  title: '鋒兄例行 - 鋒兄AI Supabase'
})

const {
  routines,
  loading,
  FIELDS,
  loadRoutines,
  addRoutine,
  updateRoutine,
  deleteRoutine,
  importRoutines
} = useRoutines()

const { uploading, uploadProgress, uploadFile } = useStorage()

const searchQuery = ref('')
const photoInput = ref(null)
const showModal = ref(false)
const previewImage = ref(null)
const isEditMode = ref(false)

// 行內編輯
const editingId = ref(null)
const editForm = reactive({})
const inlineNameInput = ref(null)
const inlineUploading = ref(false)

const startInlineEdit = (routine) => {
  Object.assign(editForm, {
    id: routine.id,
    name: routine.name || '',
    note: routine.note || '',
    photo: routine.photo || '',
    lastdate1: routine.lastdate1 || '',
    lastdate2: routine.lastdate2 || '',
    lastdate3: routine.lastdate3 || ''
  })
  editingId.value = routine.id
  // 自動聚焦到名稱輸入框
  nextTick(() => {
    inlineNameInput.value?.focus()
    inlineNameInput.value?.select()
  })
}

// 行內圖片上傳
const handleInlinePhotoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  inlineUploading.value = true
  try {
    const result = await uploadFile(file, 'routine')
    if (result.success) {
      editForm.photo = result.url
      // 短暫提示上傳成功
      setTimeout(() => {
        inlineUploading.value = false
      }, 500)
    } else {
      alert('上傳失敗: ' + result.error)
      inlineUploading.value = false
    }
  } catch (error) {
    console.error('Inline upload error:', error)
    alert('上傳失敗: ' + error.message)
    inlineUploading.value = false
  } finally {
    event.target.value = ''
  }
}

const cancelInlineEdit = () => {
  editingId.value = null
}

const saveInlineEdit = async () => {
  if (!editForm.name) {
    alert('請輸入例行名稱')
    return
  }
  try {
    await updateRoutine(editForm.id, { ...editForm })
    editingId.value = null
    await loadRoutines()
  } catch (error) {
    console.error('Inline edit save error:', error)
    alert('儲存失敗: ' + error.message)
  }
}
const formData = ref({
  id: null,
  name: '',
  note: '',
  lastdate1: '',
  lastdate2: '',
  lastdate3: '',
  link: '',
  photo: ''
})

const batchMode = ref(false)
const selectedIds = ref(new Set())
const enterBatchMode = () => { batchMode.value = true }
const exitBatchMode = () => { batchMode.value = false; selectedIds.value = new Set() }
const isAllSelected = computed(() => filteredRoutines.value.length > 0 && filteredRoutines.value.every(a => selectedIds.value.has(a.id)))
const toggleSelect = (id) => { const s = new Set(selectedIds.value); if (s.has(id)) s.delete(id); else s.add(id); selectedIds.value = s }
const toggleSelectAll = () => { if (isAllSelected.value) selectedIds.value = new Set(); else selectedIds.value = new Set(filteredRoutines.value.map(a => a.id)) }
const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return
  if (count === routines.value.length) {
    const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE routine 確認：`)
    if (input !== 'DELETE routine') { alert('輸入不正確，已取消'); return }
  } else { if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) return }
  let ok = 0
  for (const id of [...selectedIds.value]) { const r = await deleteRoutine(id); if (r.success) ok++ }
  selectedIds.value = new Set(); batchMode.value = false
  alert(`已刪除 ${ok} 筆`)
}

const filteredRoutines = computed(() => {
  if (!searchQuery.value) return routines.value
  const query = searchQuery.value.toLowerCase()
  return routines.value.filter(routine =>
    routine.name?.toLowerCase().includes(query)
  )
})

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('zh-TW')
  } catch (e) {
    return dateString
  }
}

const getDaysBetween = (date1, date2) => {
  if (!date1 || !date2) return null
  try {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diffMs = Math.abs(d1 - d2)
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  } catch (e) {
    return null
  }
}

const resetForm = () => {
  formData.value = {
    id: null,
    name: '',
    note: '',
    lastdate1: '',
    lastdate2: '',
    lastdate3: '',
    link: '',
    photo: ''
  }
}

// 行內新增
const isAddingInline = ref(false)
const addForm = ref({ name: '', note: '', lastdate1: '', lastdate2: '', lastdate3: '', link: '', photo: '' })
const openInlineAdd = () => { addForm.value = { name: '', note: '', lastdate1: '', lastdate2: '', lastdate3: '', link: '', photo: '' }; isAddingInline.value = true }
const cancelInlineAdd = () => { isAddingInline.value = false }
const saveInlineAdd = async () => {
  if (!addForm.value.name) { alert('請輸入例行名稱'); return }
  try {
    await addRoutine({ ...addForm.value, lastdate1: addForm.value.lastdate1 || null, lastdate2: addForm.value.lastdate2 || null, lastdate3: addForm.value.lastdate3 || null })
    isAddingInline.value = false; await loadRoutines()
  } catch (e) { alert('新增失敗: ' + e.message) }
}

const openAddModal = () => {
  resetForm()
  isEditMode.value = false
  showModal.value = true
}

const openEditModal = (routine) => {
  formData.value = {
    id: routine.id,
    name: routine.name || '',
    note: routine.note || '',
    lastdate1: routine.lastdate1 ? routine.lastdate1.split('T')[0] : '',
    lastdate2: routine.lastdate2 ? routine.lastdate2.split('T')[0] : '',
    lastdate3: routine.lastdate3 ? routine.lastdate3.split('T')[0] : '',
    link: routine.link || '',
    photo: routine.photo || ''
  }
  isEditMode.value = true
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

// Photo upload handler
const handlePhotoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const result = await uploadFile(file, 'routine')
    if (result.success) {
      formData.value.photo = result.url
      alert('照片上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('上傳失敗: ' + error.message)
  }
}

// Remove uploaded photo
const removePhoto = () => {
  formData.value.photo = ''
  if (photoInput.value) {
    photoInput.value.value = ''
  }
}

const handleSubmit = async () => {
  try {
    const data = {
      name: formData.value.name,
      note: formData.value.note,
      lastdate1: formData.value.lastdate1 || null,
      lastdate2: formData.value.lastdate2 || null,
      lastdate3: formData.value.lastdate3 || null,
      link: formData.value.link,
      photo: formData.value.photo
    }

    if (isEditMode.value) {
      await updateRoutine(formData.value.id, data)
    } else {
      await addRoutine(data)
    }
    closeModal()
  } catch (error) {
    console.error('Failed to save routine:', error)
    alert('儲存失敗: ' + error.message)
  }
}

const handleShiftDates = async (routine) => {
  if (!confirm('確定要執行日期遞移嗎？\n\n最近例行之一 → 最近例行之二\n最近例行之二 → 最近例行之三\n最近例行之一 → 清空')) return
  try {
    await updateRoutine(routine.id, {
      ...routine,
      lastdate1: null,
      lastdate2: routine.lastdate1 || null,
      lastdate3: routine.lastdate2 || null
    })
  } catch (error) {
    console.error('Failed to shift dates:', error)
    alert('日期遞移失敗: ' + error.message)
  }
}

const handleDelete = async (id) => {
  if (!confirm('確定要刪除此例行記錄嗎?')) return
  try {
    await deleteRoutine(id)
  } catch (error) {
    console.error('Failed to delete routine:', error)
    alert('刪除失敗: ' + error.message)
  }
}

const exportCsv = () => {
  if (routines.value.length === 0) {
    alert('無資料可匯出')
    return
  }

  const headers = FIELDS
  const rows = routines.value.map(routine => {
    return FIELDS.map(field => {
      const value = routine[field] ?? ''
      const escaped = String(value).replace(/"/g, '""')
      return `"${escaped}"`
    }).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'supabase-routine.csv'
  link.click()
}

const parseCsv = (text) => {
  const lines = []
  let currentLine = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentLine.push(currentField)
        currentField = ''
      } else if (char === '\n') {
        currentLine.push(currentField)
        if (currentLine.length > 0) {
          lines.push(currentLine)
        }
        currentLine = []
        currentField = ''
      } else if (char === '\r') {
        // Skip
      } else {
        currentField += char
      }
    }
  }

  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField)
    lines.push(currentLine)
  }

  return lines
}

const handleImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const lines = parseCsv(text.replace(/^\uFEFF/, ''))

    if (lines.length < 2) {
      alert('CSV 檔案格式不正確')
      return
    }

    const headers = lines[0]
    const isAppwrite = headers.some(h => h.startsWith('$'))

    const records = lines.slice(1).map(line => {
      const record = {}
      headers.forEach((header, index) => {
        const cleanHeader = header.replace(/^\$/, '')
        let value = line[index] || ''

        // Skip Appwrite system fields
        if (header.startsWith('$') && !['$createdAt', '$updatedAt'].includes(header)) {
          return
        }

        // Map Appwrite timestamps
        if (isAppwrite && header === '$createdAt' && !headers.includes('created_at')) {
          record.created_at = value
        } else if (isAppwrite && header === '$updatedAt' && !headers.includes('updated_at')) {
          record.updated_at = value
        } else if (FIELDS.includes(cleanHeader)) {
          record[cleanHeader] = value
        }
      })
      return record
    })

    await importRoutines(records)
    alert(`成功匯入 ${records.length} 筆記錄`)
    event.target.value = ''
  } catch (error) {
    console.error('Import failed:', error)
    alert('匯入失敗: ' + error.message)
  }
}

onMounted(() => {
  loadRoutines()
})
</script>

<style scoped>
/* 行內編輯樣式 */
.row-editing {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
  box-shadow: inset 0 0 0 2px #f59e0b;
}

.row-editing td {
  padding: 0.75rem;
  vertical-align: top;
}

/* 整合行內編輯面板 */
.td-inline-edit-full {
  padding: 1rem 1.25rem !important;
}

.inline-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  max-width: 600px;
}

.inline-edit-label {
  min-width: 110px;
  font-size: 0.82rem;
  color: #92400e;
  font-weight: 600;
  padding-top: 0.45rem;
  flex-shrink: 0;
}

.inline-actions-row {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px dashed #f59e0b;
  margin-top: 0.25rem;
}

.row-editing .td-note {
  min-width: 150px;
}

/* 行內編輯第二列（備註）樣式 */
.row-editing-note td {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
  border-top: 1px dashed #f59e0b;
  padding: 0.75rem 1rem;
}

.td-note-full {
  width: 100%;
}

.inline-note-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.note-label {
  font-weight: 600;
  color: #92400e;
  font-size: 0.9rem;
}

.td-note-empty {
  background: transparent !important;
  min-width: 80px;
}

/* 行內編輯第三列（圖片、操作）樣式 */
.row-editing-photo td {
  background: linear-gradient(135deg, #fef9c3 0%, #fde047 100%) !important;
  border-top: 1px dashed #f59e0b;
  padding: 0.75rem 1rem;
  vertical-align: top;
}

.td-photo-full {
  min-width: 300px;
}

.photo-label {
  font-weight: 600;
  color: #92400e;
  font-size: 0.9rem;
  display: block;
  margin-bottom: 0.5rem;
}

.td-photo-empty {
  background: transparent !important;
}

.td-actions-empty {
  background: transparent !important;
}

.td-actions-full {
  text-align: right;
}

.inline-actions-wrapper {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.inline-actions-wrapper .btn-save,
.inline-actions-wrapper .btn-cancel {
  width: auto;
  padding: 0.5rem 1rem;
  font-size: 0.95rem;
  white-space: nowrap;
}

.inline-photo-preview {
  margin-top: 0.5rem;
  max-width: 120px;
}

.inline-photo-preview img {
  width: 100%;
  max-height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 2px solid #fbbf24;
}

.inline-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid #fbbf24;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
  background: white;
  font-family: inherit;
}

.inline-input:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.inline-textarea {
  resize: vertical;
  min-height: 60px;
  max-width: 480px;
  line-height: 1.5;
  padding: 0.5rem;
}

.inline-photo-edit {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inline-photo-edit .inline-input {
  flex: 1;
  min-width: 80px;
}

.btn-inline-upload {
  background: linear-gradient(135deg, #f2994a 0%, #f2c94c 100%);
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-inline-upload:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(242, 153, 74, 0.3);
}

.inline-upload-status {
  font-size: 0.75rem;
  color: #f59e0b;
  margin-top: 0.25rem;
  font-weight: 500;
}

.btn-save {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s;
  color: white;
}

.btn-save:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-cancel {
  background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s;
  color: white;
  margin-left: 0.25rem;
  width: auto;
  max-width: 100px;
  white-space: nowrap;
}

.btn-cancel:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}
.routine-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
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
  border-color: #f2994a;
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

.btn-add {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #f2994a 0%, #f2c94c 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(242, 153, 74, 0.4);
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
}

.routine-table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.routine-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  min-width: 900px;
}

.routine-table thead {
  background: linear-gradient(135deg, #f2994a 0%, #f2c94c 100%);
}

.routine-table thead th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-weight: 600;
  color: white;
  font-size: 0.95rem;
  white-space: nowrap;
}

.routine-table tbody tr {
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.routine-table tbody tr:hover {
  background: rgba(242, 153, 74, 0.06);
}

.routine-table tbody tr:last-child {
  border-bottom: none;
}

.routine-table td {
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  color: #333;
  vertical-align: middle;
}

.td-name {
  font-weight: 600;
  min-width: 100px;
}

.td-note {
  max-width: 200px;
  white-space: pre-wrap;
  word-break: break-word;
  color: #666;
}

.td-photo {
  width: 60px;
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

.table-photo:hover {
  transform: scale(1.1);
}

.td-date {
  white-space: nowrap;
  font-size: 0.9rem;
}

.td-days {
  text-align: center;
}

.days-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  background: linear-gradient(135deg, rgba(242, 153, 74, 0.15) 0%, rgba(242, 201, 76, 0.15) 100%);
  color: #e67e22;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
}

.td-actions {
  white-space: nowrap;
}

/* Lightbox */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

.btn-shift,
.btn-edit,
.btn-delete {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-shift {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-shift:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
}

.btn-edit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-edit:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-delete {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-delete:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  max-width: 600px;
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
  background: linear-gradient(135deg, #f2994a 0%, #f2c94c 100%);
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

.form-group input,
.form-group textarea {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #f2994a;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
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
  background: linear-gradient(135deg, #f2994a 0%, #f2c94c 100%);
  color: white;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(242, 153, 74, 0.4);
}

/* Upload Area Styles */
.upload-area {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.btn-upload {
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

.btn-upload:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-progress {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 500;
}

.photo-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.preview-image {
  max-width: 150px;
  max-height: 100px;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn-remove {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-remove:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
}

.url-input {
  margin-top: 0.5rem;
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
