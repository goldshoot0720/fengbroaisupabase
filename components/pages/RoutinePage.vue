<template>
  <PageContainer>
    <div class="routine-page">
      <div class="actions-bar">
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋例行名稱..."
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <div class="csv-actions">
          <button @click="exportZip" class="btn-export" :disabled="exporting">
            {{ exporting ? '匯出中...' : '匯出 ZIP' }}
          </button>
          <button @click="exportCsv" class="btn-export">匯出 CSV</button>
          <label class="btn-import">
            匯入 ZIP/CSV
            <input
              type="file"
              accept=".csv,.zip"
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
              <th>最近例行之三</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- 行內新增面板 -->
            <template v-if="isAddingInline">
              <tr class="row-editing">
                <td colspan="7" class="td-inline-edit-full">
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
                <td colspan="7" class="td-inline-edit-full">
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
                      <img :src="resolveMediaUrl(editForm.photo)" alt="預覽" />
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
                <td class="td-name" data-label="名稱">{{ routine.name }}</td>
                <td class="td-note" data-label="備註">{{ routine.note || '' }}</td>
                <td class="td-photo" data-label="圖片">
                  <img
                    v-if="routine.photo"
                    :src="resolveMediaUrl(routine.photo)"
                    :alt="routine.name"
                    class="table-photo"
                    @click="previewImage = resolveMediaUrl(routine.photo)"
                  />
                </td>
                <td class="td-date" data-label="最近例行之一">
                  <span class="date-main">{{ formatDate(routine.lastdate1) }}</span>
                  <span v-if="getRoutineGapLabel(routine.lastdate1, routine.lastdate2)" class="date-subline">
                    {{ getRoutineGapLabel(routine.lastdate1, routine.lastdate2) }}
                  </span>
                </td>
                <td class="td-date" data-label="最近例行之二">
                  <span class="date-main">{{ formatDate(routine.lastdate2) }}</span>
                  <span v-if="getRoutineGapLabel(routine.lastdate2, routine.lastdate3)" class="date-subline">
                    {{ getRoutineGapLabel(routine.lastdate2, routine.lastdate3) }}
                  </span>
                </td>
                <td class="td-date" data-label="最近例行之三">{{ formatDate(routine.lastdate3) }}</td>
                <td class="td-actions" data-label="操作">
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
                <img :src="resolveMediaUrl(formData.photo)" alt="預覽" class="preview-image" />
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
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'

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

const { uploading, uploadProgress, uploadFile, getPublicUrl } = useStorage()

const resolveMediaUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value
  return getPublicUrl(value) || value
}

const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-routine-search-history', searchQuery)
const photoInput = ref(null)
const showModal = ref(false)
const previewImage = ref(null)
const isEditMode = ref(false)
const exporting = ref(false)

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

const getRoutineDateSortValue = (dateString) => {
  const parsed = parseDateOnly(dateString)
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : -Infinity
}

const sortRoutinesByRecentDate = (items) => {
  return [...items].sort((a, b) => {
    const dateDiff = getRoutineDateSortValue(b.lastdate1) - getRoutineDateSortValue(a.lastdate1)
    if (dateDiff !== 0) return dateDiff
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hant')
  })
}

const filteredRoutines = computed(() => {
  if (!searchQuery.value) return sortRoutinesByRecentDate(routines.value)
  const query = searchQuery.value.toLowerCase()
  return sortRoutinesByRecentDate(
    routines.value.filter(routine =>
      routine.name?.toLowerCase().includes(query)
    )
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

const parseDateOnly = (dateString) => {
  if (!dateString) return null
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const getRoutineGapDays = (date1, date2) => {
  const d1 = parseDateOnly(date1)
  const d2 = parseDateOnly(date2)
  if (!d1 || !d2 || Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null
  const diffMs = Math.abs(d2 - d1)
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const getRoutineGapLabel = (date1, date2) => {
  const days = getRoutineGapDays(date1, date2)
  return days === null ? '' : `相差 ${days} 天`
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

const exportZip = async () => {
  if (routines.value.length === 0) {
    alert('無資料可匯出')
    return
  }
  exporting.value = true
  try {
    const { exportRecordsAsMediaZip } = await import('../../utils/zipMediaBundle')
    const stats = await exportRecordsAsMediaZip({
      records: routines.value,
      jsonFileName: 'routines.json',
      downloadName: 'supabase-routine.zip',
      mediaMap: {
        photo: { folder: 'photos', fallbackExt: 'jpg' }
      },
      resolveUrl: resolveMediaUrl
    })
    alert(`匯出成功！\n照片成功 ${stats.ok}，失敗 ${stats.fail}，略過 ${stats.skipped}`)
  } catch (error) {
    console.error('Routine ZIP export failed:', error)
    alert('匯出失敗：' + error.message)
  } finally {
    exporting.value = false
  }
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
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.zip')) {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      const jsonFile = zip.file('routines.json')
      if (!jsonFile) {
        alert('ZIP 中找不到 routines.json')
        return
      }
      const jsonData = JSON.parse(await jsonFile.async('text'))
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        alert('JSON 檔案格式錯誤或無資料')
        return
      }
      let records = jsonData.map(({ id, created_at, updated_at, ...rest }) => rest)
      if (!confirm(`確定匯入 ${records.length} 筆例行事務？\n若 ZIP 內含照片，會自動上傳。`)) return

      const { reuploadLocalMediaFromZip } = await import('../../utils/zipMediaBundle')
      const reuploaded = await reuploadLocalMediaFromZip({
        zip,
        records,
        mediaMap: {
          photo: { prefixes: ['photos/', 'media/'], storageFolder: 'routine', mimeFallback: 'image/jpeg' }
        },
        uploadFile
      })
      records = reuploaded.records
      const result = await importRoutines(records)
      if (result.success) {
        await loadRoutines()
        alert(result.message || `成功匯入 ${result.count || records.length} 筆`)
      } else {
        alert('匯入失敗: ' + result.error)
      }
      return
    }

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
  background: var(--warning-light);
  box-shadow: inset 0 0 0 2px var(--warning-text);
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

/* .inline-edit-panel 内的標籤，提高 specificity 贏過 .inline-field-row label */
.inline-edit-panel .inline-edit-label {
  min-width: 110px;
  font-size: 0.82rem;
  color: var(--warning-text);
  font-weight: 600;
  padding-top: 0.45rem;
  flex-shrink: 0;
}

.inline-actions-row {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--warning);
  margin-top: 0.25rem;
}

.row-editing .td-note {
  min-width: 150px;
}

/* 行內編輯第二列（備註）樣式 */
.row-editing-note td {
  background: var(--warning-light);
  border-top: 1px dashed var(--warning);
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
  color: var(--warning-text);
  font-size: 0.9rem;
}

.td-note-empty {
  background: transparent !important;
  min-width: 80px;
}

/* 行內編輯第三列（圖片、操作）樣式 */
.row-editing-photo td {
  background: var(--warning-light);
  border-top: 1px dashed var(--warning);
  padding: 0.75rem 1rem;
  vertical-align: top;
}

.td-photo-full {
  min-width: 300px;
}

.photo-label {
  font-weight: 600;
  color: var(--warning-text);
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
  border-radius: var(--radius-sm);
  border: 2px solid var(--warning);
}

.inline-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--warning);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  transition: all 0.2s;
  background: var(--bg-surface);
  font-family: inherit;
}

.inline-input:focus {
  outline: none;
  border-color: var(--warning);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

.inline-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
  padding: 0.5rem;
}

/* textarea 在整合面板內不限寬度 */
.inline-edit-panel .inline-textarea {
  max-width: none;
  width: 100%;
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
  background: var(--warning-solid);
  border: none;
  border-radius: var(--radius-sm);
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
  box-shadow: var(--elevation-2);
}

.inline-upload-status {
  font-size: 0.75rem;
  color: var(--warning-text);
  margin-top: 0.25rem;
  font-weight: 500;
}

.btn-save {
  background: var(--success-solid);
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  color: var(--on-solid);
}

.btn-save:hover {
  transform: scale(1.05);
  box-shadow: var(--elevation-2);
}

.btn-cancel {
  background: var(--danger-solid);
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  color: var(--on-solid);
  margin-left: 0.25rem;
  width: auto;
  max-width: 100px;
  white-space: nowrap;
}

.btn-cancel:hover {
  transform: scale(1.05);
  box-shadow: var(--elevation-2);
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

.search-area {
  flex: 1 1 320px;
  min-width: 260px;
}

.search-input {
  width: 100%;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: var(--warning);
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-export,
.btn-import {
  padding: 0.75rem 1.5rem;
  background: var(--primary-solid);
  color: var(--on-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-export:hover,
.btn-import:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-import {
  display: inline-block;
}

.btn-add {
  padding: 0.75rem 2rem;
  background: var(--warning-solid);
  color: var(--on-solid);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.routine-table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-1);
}

.routine-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-width: 760px;
  table-layout: fixed;
}

.routine-table thead {
  background: var(--warning-solid);
}

.routine-table thead th {
  padding: 0.875rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--on-solid);
  font-size: 0.95rem;
  white-space: nowrap;
}

.routine-table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background 0.2s;
}

.routine-table tbody tr:hover {
  background: color-mix(in oklab, var(--warning) 6%, transparent);
}

.routine-table tbody tr:last-child {
  border-bottom: none;
}

.routine-table td {
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  color: var(--text-primary);
  vertical-align: middle;
}

.td-name {
  font-weight: 600;
  width: 12%;
  min-width: 100px;
}

.td-note {
  width: 22%;
  max-width: 260px;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
}

.td-photo {
  width: 9%;
  min-width: 72px;
}

.table-photo {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: var(--elevation-1);
}

.table-photo:hover {
  transform: scale(1.1);
}

.td-date {
  width: 11%;
  white-space: nowrap;
  font-size: 0.9rem;
}

.date-main,
.date-subline {
  display: block;
}

.date-subline {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.td-actions {
  white-space: nowrap;
  width: 13%;
}

/* Lightbox */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in oklab, var(--overlay-scrim) 80%, transparent);
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
  border-radius: var(--radius-md);
  box-shadow: var(--elevation-2);
}

.btn-shift,
.btn-edit,
.btn-delete {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-shift {
  background: var(--success-solid);
  color: var(--on-solid);
}

.btn-shift:hover {
  transform: scale(1.05);
  box-shadow: var(--elevation-2);
}

.btn-edit {
  background: var(--primary-solid);
  color: var(--on-primary);
}

.btn-edit:hover {
  transform: scale(1.05);
  box-shadow: var(--elevation-2);
}

.btn-delete {
  background: var(--danger-solid);
  color: var(--on-solid);
}

.btn-delete:hover {
  transform: scale(1.05);
  box-shadow: var(--elevation-2);
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in oklab, var(--overlay-scrim) 50%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--elevation-3);
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
  background: var(--warning-solid);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--text-muted);
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
  background: var(--bg-surface);
  color: var(--text-primary);
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
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-group input,
.form-group textarea {
  padding: 0.75rem;
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--warning);
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
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-cancel {
  background: var(--bg-inset);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--border-strong);
}

.btn-submit {
  background: var(--warning-solid);
  color: var(--on-solid);
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
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
  background: var(--primary-solid);
  color: var(--on-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-upload:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-progress {
  font-size: 0.9rem;
  color: var(--primary-text);
  font-weight: 500;
}

.photo-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
}

.preview-image {
  max-width: 150px;
  max-height: 100px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  box-shadow: var(--elevation-1);
}

.btn-remove {
  padding: 0.5rem 1rem;
  background: var(--danger-solid);
  color: var(--on-solid);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-remove:hover {
  transform: scale(1.05);
  box-shadow: var(--elevation-2);
}

.url-input {
  margin-top: 0.5rem;
}

.summary-bar { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--success-light); border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.95rem; color: var(--text-secondary); flex-wrap: wrap; gap: 0.5rem; }
.summary-left, .summary-right { display: flex; align-items: center; gap: 1rem; }
.summary-right { flex-wrap: wrap; justify-content: flex-end; }
.select-all-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500; }
.select-all-label input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
.selected-count { background: var(--primary-solid); color: var(--on-primary); padding: 0.25rem 0.75rem; border-radius: var(--radius-lg); font-size: 0.85rem; font-weight: 600; }
.btn-batch-mode { padding: 0.5rem 1rem; background: var(--primary-solid); color: var(--on-primary); border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s; }
.btn-batch-mode:hover { transform: translateY(-2px); box-shadow: var(--elevation-2); }
.btn-add-icon { width: 36px; height: 36px; border: none; border-radius: 50%; background: var(--success-solid); color: var(--on-solid); font-size: 1.5rem; font-weight: 300; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.3s; line-height: 1; padding-bottom: 4px; }
.btn-add-icon:hover { transform: translateY(-2px) scale(1.1); box-shadow: var(--elevation-2); }
.btn-cancel-batch { padding: 0.35rem 0.75rem; background: var(--bg-inset); color: var(--text-secondary); border: none; border-radius: var(--radius-xs); cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: all 0.2s; }
.btn-cancel-batch:hover { background: var(--border-strong); }
.btn-batch-delete { padding: 0.5rem 1rem; background: var(--danger-solid); color: var(--on-solid); border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: all 0.3s; }
.btn-batch-delete:hover { transform: translateY(-2px); box-shadow: var(--elevation-2); }
.btn-batch-delete:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 1440px) {
  .routine-table thead th {
    padding: 0.75rem 0.7rem;
    font-size: 0.9rem;
  }

  .routine-table td {
    padding: 0.7rem 0.7rem;
    font-size: 0.9rem;
  }

  .td-name {
    width: 11%;
    min-width: 88px;
  }

  .td-note {
    width: 20%;
    max-width: 220px;
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .td-photo {
    width: 7%;
    min-width: 60px;
  }

  .table-photo {
    width: 44px;
    height: 44px;
  }

  .td-date {
    width: 10%;
    font-size: 0.86rem;
  }

  .td-days {
    width: 9%;
  }

  .days-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.8rem;
  }

  .td-actions {
    width: 16%;
  }

  .btn-shift,
  .btn-edit,
  .btn-delete {
    padding: 0.35rem 0.65rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .routine-table {
    min-width: 0;
    table-layout: auto;
  }

  .routine-table thead {
    display: none;
  }

  .routine-table,
  .routine-table tbody,
  .routine-table tr,
  .routine-table td {
    display: block;
    width: 100%;
  }

  .routine-table tbody tr {
    margin-bottom: 1rem;
    border: 1px solid var(--border-subtle);
    border-radius: 18px;
    background: var(--bg-surface);
    box-shadow: var(--elevation-1);
    overflow: hidden;
  }

  .routine-table td {
    display: grid;
    grid-template-columns: minmax(108px, 148px) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: start;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border-subtle);
  }

  .routine-table td:last-child {
    border-bottom: 0;
  }

  .routine-table td::before {
    content: attr(data-label);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--text-secondary);
  }

  .td-name,
  .td-note,
  .td-photo,
  .td-date,
  .td-days,
  .td-actions {
    width: auto;
    max-width: none;
    min-width: 0;
    white-space: normal;
  }

  .td-photo {
    align-items: center;
  }

  .td-photo:empty::after {
    content: '—';
    color: var(--text-muted);
  }

  .td-days {
    text-align: left;
  }

  .td-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .td-actions::before {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .routine-table td {
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }

  .summary-right {
    width: 100%;
    justify-content: flex-start;
  }
}

</style>
