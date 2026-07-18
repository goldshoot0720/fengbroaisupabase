<template>
  <PageContainer>
    <div class="document-page">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">鋒兄文件</h1>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <div class="search-group search-area">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋文件名稱..."
            class="search-input"
            @keyup.enter="commitSearchHistory()"
            @blur="commitSearchHistory()"
          />
          <RecentSearchChips
            :terms="recentSearches"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>

        <div class="filter-group">
          <select v-model="filterCategory" class="filter-select">
            <option value="">全部分類</option>
            <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <button v-if="filterCategory" class="btn-clear-filter" @click="filterCategory = ''" title="清除篩選">✕</button>
        </div>

        <div class="view-switcher" role="group" aria-label="文件顯示模式">
          <button
            type="button"
            class="view-switch-btn"
            :class="{ active: documentViewMode === 'card' }"
            @click="setDocumentViewMode('card')"
          >
            卡片式
          </button>
          <button
            type="button"
            class="view-switch-btn"
            :class="{ active: documentViewMode === 'list' }"
            @click="setDocumentViewMode('list')"
          >
            列表式
          </button>
        </div>

        <div class="csv-actions">
          <button @click="exportToZip" class="btn btn-export" :disabled="importProgress.active">
            匯出 ZIP
          </button>
          <label class="btn btn-import" :class="{ disabled: importProgress.active }">
            匯入 ZIP
            <input
              type="file"
              accept=".zip"
              @change="handleZipImport"
              :disabled="importProgress.active"
              style="display: none"
            />
          </label>
        </div>

      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredDocuments.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增">+</button>
          <template v-if="batchMode">
            <label class="select-all-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全選</span>
            </label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span v-if="filterCategory || searchQuery">篩選結果 {{ filteredDocuments.length }} / 共 {{ documents.length }} 項</span>
          <span v-else>共 {{ documents.length }} 個項目</span>
          <span v-if="filterCategory" class="filter-active-badge">分類：{{ filterCategory }}</span>
          <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>
        </div>
        <div class="summary-right">
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除選中 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>載入中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredDocuments.length === 0 && !isAddingInline" class="empty-state">
        <div class="empty-icon">📄</div>
        <p class="empty-text">
          {{ searchQuery ? '找不到符合的文件' : '尚無文件記錄' }}
        </p>
        <button v-if="!searchQuery" @click="openInlineAdd" class="btn btn-primary">
          新增第一筆文件
        </button>
      </div>

      <!-- Documents Grid -->
      <div v-if="isAddingInline || filteredDocuments.length > 0" :class="['documents-grid', `documents-grid--${documentViewMode}`]">

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="document-card card-editing" :class="{ 'document-card--list': documentViewMode === 'list' }">
          <div class="card-header">
            <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="文件名稱" autofocus>
            <div class="card-actions">
              <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
              <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
            </div>
          </div>
          <div class="card-body inline-edit-content">
            <div class="inline-edit-form">
              <div class="inline-field-row">
                <label>分類</label>
                <input v-model="addForm.category" type="text" class="inline-input" placeholder="分類">
              </div>
              <div class="inline-field-row">
                <label>備註</label>
                <textarea v-model="addForm.note" class="inline-input inline-textarea" rows="3" placeholder="備註"></textarea>
              </div>
              <div class="inline-field-row">
                <label>參考</label>
                <input v-model="addForm.ref" type="text" class="inline-input" placeholder="參考">
              </div>
              <div class="inline-field-row">
                <label>Hash</label>
                <input v-model="addForm.hash" type="text" class="inline-input" placeholder="Hash">
              </div>
              <div class="inline-field-row">
                <label>檔案</label>
                <div class="inline-upload-area">
                  <label class="btn-inline-upload" :class="{ disabled: addFileUploading }">
                    {{ addFileUploading ? '上傳中...' : '選擇檔案' }}
                    <input type="file" multiple style="display:none" :disabled="addFileUploading" @change="handleAddFileUpload" />
                  </label>
                  <span v-if="addForm.file" class="inline-file-name">📎 {{ getFileName(addForm.file) }}
                    <button type="button" class="btn-inline-remove" @click="addForm.file = ''">✕</button>
                  </span>
                  <img v-if="addForm.file && isImageUrl(addForm.file)" :src="addForm.file" class="inline-img-preview" alt="預覽" />
                  <input v-model="addForm.file" type="text" class="inline-input" placeholder="或輸入檔案 URL" style="margin-top:4px">
                </div>
              </div>
              <div class="inline-field-row">
                <label>封面URL</label>
                <input v-model="addForm.cover" type="text" class="inline-input" placeholder="封面 URL">
              </div>
            </div>
          </div>
        </div>
        <div
          v-for="document in filteredDocuments"
          :key="document.id"
          class="document-card"
          :class="{ 'batch-selected': selectedIds.has(document.id), 'card-editing': inlineEditingId === document.id, 'document-card--list': documentViewMode === 'list' }"
          @click="batchMode && toggleSelect(document.id)"
          :style="{ cursor: batchMode ? 'pointer' : 'default' }"
        >
          <!-- 行內編輯模式 -->
          <template v-if="inlineEditingId === document.id">
            <div class="card-header">
              <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="文件名稱">
              <div class="card-actions">
                <button class="btn-icon save" @click="saveInlineEdit" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
              </div>
            </div>
            <div class="card-body inline-edit-content">
              <div class="inline-edit-form">
                <div class="inline-field-row">
                  <label>分類</label>
                  <input v-model="editForm.category" type="text" class="inline-input" placeholder="分類">
                </div>
                <div class="inline-field-row">
                  <label>備註</label>
                  <textarea v-model="editForm.note" class="inline-input inline-textarea" rows="3" placeholder="備註"></textarea>
                </div>
                <div class="inline-field-row">
                  <label>參考</label>
                  <input v-model="editForm.ref" type="text" class="inline-input" placeholder="參考">
                </div>
                <div class="inline-field-row">
                  <label>Hash</label>
                  <input v-model="editForm.hash" type="text" class="inline-input" placeholder="Hash">
                </div>
                <div class="inline-field-row">
                  <label>檔案</label>
                  <div class="inline-upload-area">
                    <label class="btn-inline-upload" :class="{ disabled: inlineFileUploading }">
                      {{ inlineFileUploading ? '上傳中...' : '選擇檔案' }}
                      <input type="file" style="display:none" :disabled="inlineFileUploading" @change="handleInlineFileUpload" />
                    </label>
                    <span v-if="editForm.file" class="inline-file-name">📎 {{ getFileName(editForm.file) }}
                      <button type="button" class="btn-inline-remove" @click="editForm.file = ''">✕</button>
                    </span>
                    <img v-if="editForm.file && isImageUrl(editForm.file)" :src="editForm.file" class="inline-img-preview" alt="預覽" />
                    <input v-model="editForm.file" type="text" class="inline-input" placeholder="或輸入檔案 URL" style="margin-top:4px">
                  </div>
                </div>
                <div class="inline-field-row">
                  <label>封面URL</label>
                  <input v-model="editForm.cover" type="text" class="inline-input" placeholder="封面 URL">
                </div>
              </div>
            </div>
          </template>

          <!-- 顯示模式 -->
          <template v-else>
          <div class="card-header">
            <h3 class="card-title">{{ document.name || '未命名' }}</h3>
            <div class="card-actions">
              <button @click="startInlineEdit(document)" class="btn-icon" title="編輯">
                ✏️
              </button>
              <button @click="confirmDelete(document)" class="btn-icon" title="刪除">
                🗑️
              </button>
            </div>
          </div>

          <div class="card-body">
            <div v-if="document.category" class="category-badge">
              {{ document.category }}
            </div>

            <div v-if="document.note" class="note-preview">
              {{ truncateText(document.note, 100) }}
            </div>

            <div v-if="document.file" class="file-info">
              <template v-if="isImageUrl(document.file)">
                <div class="file-img-actions">
                  <span class="file-name">{{ getFileName(document.file) }}</span>
                  <button type="button" class="btn-download btn-preview" @click="openFilePreview(document)">預覽</button>
                  <a :href="document.file" :download="getFileName(document.file)" target="_blank" class="btn-download" title="下載">下載</a>
                </div>
              </template>
              <template v-else>
                <span class="file-icon">📎</span>
                <span class="file-name">{{ getFileName(document.file) }}</span>
                <button type="button" class="btn-download btn-preview" @click="openFilePreview(document)">預覽</button>
                <a :href="document.file" :download="getFileName(document.file)" target="_blank" class="btn-download" title="下載">下載</a>
              </template>
            </div>

            <div v-if="document.ref" class="ref-info">
              <span class="label">參考:</span>
              <span class="value">{{ document.ref }}</span>
            </div>

            <div v-if="document.cover" class="cover-preview">
              <img :src="document.cover" :alt="document.name" class="cover-image" />
            </div>
          </div>

          <div class="card-footer">
            <span class="hash-info" v-if="document.hash">
              Hash: {{ truncateText(document.hash, 16) }}
            </span>
            <span class="timestamp">
              {{ formatDate(document.created_at) }}
            </span>
          </div>
          </template>
        </div>
      </div>

      <!-- 匯入進度 Overlay -->
      <div v-if="importProgress.active" class="import-overlay">
        <div class="import-modal-box">
          <div class="import-spinner-anim"></div>
          <h3 class="import-title">{{ importProgress.title }}</h3>
          <p class="import-step">{{ importProgress.step }}</p>
          <div class="import-progress-bar">
            <div class="import-progress-fill" :style="{ width: importProgress.percent + '%' }"></div>
          </div>
          <p class="import-percent">{{ importProgress.current }} / {{ importProgress.total }}（{{ importProgress.percent }}%）</p>
          <p v-if="importProgress.itemName" class="import-item-name">{{ importProgress.itemName }}</p>
          <div v-if="importProgress.stats" class="import-stats">
            <span v-if="importProgress.stats.fileOk > 0" class="stat-tag stat-ok">📄 {{ importProgress.stats.fileOk }}</span>
            <span v-if="importProgress.stats.coverOk > 0" class="stat-tag stat-ok">🖼️ {{ importProgress.stats.coverOk }}</span>
            <span v-if="importProgress.stats.fail > 0" class="stat-tag stat-fail">❌ {{ importProgress.stats.fail }}</span>
          </div>
        </div>
      </div>

      <!-- File Preview Modal -->
      <div v-if="previewDocument" class="modal-overlay file-preview-overlay" @click.self="closeFilePreview">
        <div class="modal-content file-preview-modal">
          <div class="modal-header">
            <h2 class="modal-title">{{ previewDocument.name || getFileName(previewDocument.file) }}</h2>
            <button @click="closeFilePreview" class="btn-close">×</button>
          </div>
          <div class="file-preview-modal-body">
            <img
              v-if="getFilePreviewType(previewDocument.file) === 'image'"
              :src="previewDocument.file"
              :alt="previewDocument.name"
              class="file-preview-large-img"
            />
            <iframe
              v-else-if="getFilePreviewType(previewDocument.file) === 'pdf'"
              :src="previewDocument.file"
              class="file-preview-large-frame"
              :title="previewDocument.name || getFileName(previewDocument.file)"
            ></iframe>
            <div
              v-else-if="getFilePreviewType(previewDocument.file) === 'text'"
              class="file-preview-text-panel"
            >
              <div v-if="previewTextLoading" class="file-preview-fallback">
                <p>文字讀取中...</p>
              </div>
              <div v-else-if="previewTextError" class="file-preview-fallback">
                <p>{{ previewTextError }}</p>
                <a :href="previewDocument.file" target="_blank" rel="noopener" class="btn btn-primary">開啟檔案</a>
              </div>
              <pre v-else class="file-preview-text-content">{{ previewText }}</pre>
            </div>
            <video
              v-else-if="getFilePreviewType(previewDocument.file) === 'video'"
              :src="previewDocument.file"
              class="file-preview-large-media"
              controls
              autoplay
            ></video>
            <audio
              v-else-if="getFilePreviewType(previewDocument.file) === 'audio'"
              :src="previewDocument.file"
              class="file-preview-large-audio"
              controls
              autoplay
            ></audio>
            <iframe
              v-else-if="getOfficePreviewUrl(previewDocument.file)"
              :src="getOfficePreviewUrl(previewDocument.file)"
              class="file-preview-large-frame"
              :title="previewDocument.name || getFileName(previewDocument.file)"
            ></iframe>
            <div v-else class="file-preview-fallback">
              <span class="file-generic-icon">{{ getFilePreviewIcon(previewDocument.file) }}</span>
              <p>{{ getFilePreviewLabel(previewDocument.file) }}</p>
              <a :href="previewDocument.file" target="_blank" rel="noopener" class="btn btn-primary">開啟檔案</a>
            </div>
          </div>
          <div class="file-preview-modal-actions">
            <a :href="previewDocument.file" target="_blank" rel="noopener" class="btn btn-secondary">開新分頁</a>
            <a :href="previewDocument.file" :download="getFileName(previewDocument.file)" class="btn btn-primary">下載</a>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title">
              {{ isEditing ? '編輯文件' : '新增文件' }}
            </h2>
            <button @click="closeModal" class="btn-close">×</button>
          </div>

          <form @submit.prevent="handleSubmit" class="modal-form">
            <div class="form-group">
              <label class="form-label">名稱 *</label>
              <input
                v-model="formData.name"
                type="text"
                class="form-input"
                required
                placeholder="請輸入文件名稱"
              />
            </div>

            <div class="form-group">
              <label class="form-label">上傳檔案</label>
              <div class="upload-area">
                <input
                  ref="fileInput"
                  type="file"
                  :multiple="!isEditing"
                  @change="handleFileUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.fileInput.click()"
                  class="btn btn-upload"
                  :disabled="fileUploading"
                >
                  {{ fileUploading ? '上傳中...' : '選擇檔案' }}
                </button>
              </div>
              <div v-if="formData.file" class="file-preview">
                <span>📄 {{ getFileName(formData.file) }}</span>
                <button type="button" @click="removeFile" class="btn-remove">移除</button>
              </div>
              <input
                v-model="formData.file"
                type="text"
                class="form-input"
                placeholder="或輸入檔案 URL"
              />
            </div>

            <div class="form-group">
              <label class="form-label">備註</label>
              <textarea
                v-model="formData.note"
                class="form-textarea"
                rows="4"
                placeholder="請輸入備註..."
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">參考</label>
              <input
                v-model="formData.ref"
                type="text"
                class="form-input"
                placeholder="參考來源"
              />
            </div>

            <div class="form-group">
              <label class="form-label">分類</label>
              <input
                v-model="formData.category"
                type="text"
                class="form-input"
                placeholder="文件分類"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Hash</label>
              <input
                v-model="formData.hash"
                type="text"
                class="form-input"
                placeholder="檔案 Hash 值"
              />
            </div>

            <div class="form-group">
              <label class="form-label">封面上傳</label>
              <div class="upload-area">
                <input
                  ref="coverFileInput"
                  type="file"
                  accept="image/*"
                  @change="handleCoverUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.coverFileInput.click()"
                  class="btn btn-upload"
                  :disabled="coverUploading"
                >
                  {{ coverUploading ? '上傳中...' : '選擇封面' }}
                </button>
              </div>
              <div v-if="formData.cover" class="cover-upload-preview">
                <img :src="formData.cover" alt="封面預覽" class="preview-image" />
                <button type="button" @click="removeCover" class="btn-remove">移除</button>
              </div>
              <input
                v-model="formData.cover"
                type="text"
                class="form-input"
                placeholder="或輸入封面 URL"
              />
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModal" class="btn btn-secondary">
                取消
              </button>
              <button type="submit" class="btn btn-primary">
                {{ isEditing ? '更新' : '新增' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useDocuments } from '../../composables/useDocuments'
import { useStorage } from '../../composables/useStorage'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchChips from '../ui/RecentSearchChips.vue'

// SEO
useHead({
  title: '鋒兄文件 - 鋒兄AI Supabase'
})

// Composable
const {
  documents,
  loading,
  FIELDS,
  loadDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  importDocuments
} = useDocuments()

// Search & Filter
const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-document-search-history', searchQuery)
const filterCategory = ref('')
const DOCUMENT_VIEW_MODE_KEY = 'feng-document-view-mode'
const documentViewMode = ref('card')
const previewDocument = ref(null)
const previewText = ref('')
const previewTextLoading = ref(false)
const previewTextError = ref('')

const availableCategories = computed(() => {
  const cats = new Set()
  documents.value.forEach(doc => { if (doc.category) cats.add(doc.category) })
  return [...cats].sort()
})

const setDocumentViewMode = (mode) => {
  if (!['card', 'list'].includes(mode)) return
  documentViewMode.value = mode
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DOCUMENT_VIEW_MODE_KEY, mode)
  }
}

const openFilePreview = async (documentItem) => {
  previewDocument.value = documentItem
  previewText.value = ''
  previewTextError.value = ''
  if (getFilePreviewType(documentItem?.file) === 'text') {
    await loadPreviewText(documentItem.file)
  }
}

const closeFilePreview = () => {
  previewDocument.value = null
  previewText.value = ''
  previewTextError.value = ''
}

// Batch mode
const batchMode = ref(false)
const selectedIds = ref(new Set())
const enterBatchMode = () => { batchMode.value = true }
const exitBatchMode = () => { batchMode.value = false; selectedIds.value = new Set() }
const isAllSelected = computed(() => filteredDocuments.value.length > 0 && filteredDocuments.value.every(a => selectedIds.value.has(a.id)))
const toggleSelect = (id) => { const s = new Set(selectedIds.value); if (s.has(id)) s.delete(id); else s.add(id); selectedIds.value = s }
const toggleSelectAll = () => { if (isAllSelected.value) selectedIds.value = new Set(); else selectedIds.value = new Set(filteredDocuments.value.map(a => a.id)) }
const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return
  if (count === documents.value.length) {
    const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE document 確認：`)
    if (input !== 'DELETE document') { alert('輸入不正確，已取消'); return }
  } else { if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) return }
  let ok = 0
  for (const id of [...selectedIds.value]) { const r = await deleteDocument(id); if (r.success) ok++ }
  selectedIds.value = new Set(); batchMode.value = false
  alert(`已刪除 ${ok} 筆`)
}

// Upload state
const fileInput = ref(null)
const coverFileInput = ref(null)
const inlineFileInput = ref(null)
const triggerInlineFileInput = () => { inlineFileInput.value?.click() }
const { uploadFile } = useStorage()
const fileUploading = ref(false)
const coverUploading = ref(false)
const inlineFileUploading = ref(false)

// 行內新增
const isAddingInline = ref(false)
const addForm = reactive({ name: '', file: '', note: '', ref: '', category: '', hash: '', cover: '' })
const addFileInput = ref(null)
const addFileUploading = ref(false)

const openInlineAdd = () => {
  Object.assign(addForm, { name: '', file: '', note: '', ref: '', category: '', hash: '', cover: '' })
  isAddingInline.value = true
  inlineEditingId.value = null
}

const cancelInlineAdd = () => {
  isAddingInline.value = false
}

const triggerAddFileInput = () => { addFileInput.value?.click() }

const getNameFromLocalFile = (file) => {
  const name = file?.name || 'document'
  const dotIndex = name.lastIndexOf('.')
  return dotIndex > 0 ? name.slice(0, dotIndex) : name
}

const createDocumentFromUploadedFile = async (file, fileUrl, baseData = {}) => {
  const name = baseData.name || getNameFromLocalFile(file)
  return await addDocument({
    ...baseData,
    name,
    file: fileUrl
  })
}

const handleAddFileUpload = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  addFileUploading.value = true
  try {
    if (files.length > 1) {
      updateImportProgress({
        active: true,
        title: '多檔上傳中',
        step: '上傳文件檔案',
        current: 0,
        total: files.length,
        stats: { fileOk: 0, coverOk: 0, fail: 0 },
        itemName: ''
      })

      const stats = { fileOk: 0, coverOk: 0, fail: 0 }
      const baseData = {
        note: addForm.note,
        ref: addForm.ref,
        category: addForm.category,
        hash: addForm.hash,
        cover: addForm.cover
      }

      for (let index = 0; index < files.length; index++) {
        const batchFile = files[index]
        updateImportProgress({
          step: `上傳文件 ${index + 1}/${files.length}`,
          current: index,
          itemName: batchFile.name,
          stats: { ...stats }
        })

        const uploadResult = await uploadFile(batchFile, 'documents')
        if (uploadResult.success) {
          const created = await createDocumentFromUploadedFile(batchFile, uploadResult.url, baseData)
          if (created.success) stats.fileOk++
          else stats.fail++
        } else {
          stats.fail++
        }

        updateImportProgress({
          current: index + 1,
          itemName: batchFile.name,
          stats: { ...stats }
        })
      }

      resetImportProgress()
      isAddingInline.value = false
      await loadDocuments()
      alert(`已完成多檔上傳：成功 ${stats.fileOk} 筆，失敗 ${stats.fail} 筆`)
      return
    }

    const file = files[0]
    const result = await uploadFile(file, 'documents')
    if (result.success) {
      addForm.file = result.url
      if (!addForm.name) addForm.name = getNameFromLocalFile(file)
    }
    else { alert('上傳失敗: ' + result.error) }
  } catch (error) {
    resetImportProgress()
    alert('上傳失敗: ' + error.message)
  } finally {
    addFileUploading.value = false
    if (addFileInput.value) addFileInput.value.value = ''
  }
}

const saveInlineAdd = async () => {
  if (!addForm.name) { alert('請輸入文件名稱'); return }
  try {
    await addDocument({ ...addForm })
    isAddingInline.value = false
    await loadDocuments()
  } catch (error) {
    alert('新增失敗: ' + error.message)
  }
}


const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

// 行內編輯
const inlineEditingId = ref(null)
const editForm = reactive({})

const startInlineEdit = (doc) => {
  Object.assign(editForm, {
    id: doc.id,
    name: doc.name || '',
    file: doc.file || '',
    note: doc.note || '',
    ref: doc.ref || '',
    category: doc.category || '',
    hash: doc.hash || '',
    cover: doc.cover || ''
  })
  inlineEditingId.value = doc.id
}

const cancelInlineEdit = () => {
  inlineEditingId.value = null
}

const handleInlineFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  inlineFileUploading.value = true
  try {
    const result = await uploadFile(file, 'documents')
    if (result.success) {
      editForm.file = result.url
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    alert('上傳失敗: ' + error.message)
  } finally {
    inlineFileUploading.value = false
    if (inlineFileInput.value) inlineFileInput.value.value = ''
  }
}

const saveInlineEdit = async () => {
  if (!editForm.name) {
    alert('請輸入文件名稱')
    return
  }
  try {
    await updateDocument(editForm.id, { ...editForm })
    inlineEditingId.value = null
    await loadDocuments()
  } catch (error) {
    console.error('Inline edit save error:', error)
    alert('儲存失敗: ' + error.message)
  }
}

// Form data
const formData = ref({
  name: '',
  file: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  cover: ''
})

// Computed
const filteredDocuments = computed(() => {
  let list = documents.value
  if (filterCategory.value) {
    list = list.filter(doc => doc.category === filterCategory.value)
  }
  if (!searchQuery.value) return list
  const query = searchQuery.value.toLowerCase()
  return list.filter(doc => doc.name?.toLowerCase().includes(query))
})

// Methods
const openAddModal = () => {
  isEditing.value = false
  editingId.value = null
  resetForm()
  showModal.value = true
}

const openEditModal = (document) => {
  isEditing.value = true
  editingId.value = document.id
  formData.value = {
    name: document.name || '',
    file: document.file || '',
    note: document.note || '',
    ref: document.ref || '',
    category: document.category || '',
    hash: document.hash || '',
    cover: document.cover || ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

// File upload handler
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  fileUploading.value = true
  try {
    if (!isEditing.value && files.length > 1) {
      updateImportProgress({
        active: true,
        title: '多檔上傳中',
        step: '上傳文件檔案',
        current: 0,
        total: files.length,
        stats: { fileOk: 0, coverOk: 0, fail: 0 },
        itemName: ''
      })

      const stats = { fileOk: 0, coverOk: 0, fail: 0 }
      const baseData = {
        note: formData.value.note,
        ref: formData.value.ref,
        category: formData.value.category,
        hash: formData.value.hash,
        cover: formData.value.cover
      }

      for (let index = 0; index < files.length; index++) {
        const batchFile = files[index]
        updateImportProgress({
          step: `上傳文件 ${index + 1}/${files.length}`,
          current: index,
          itemName: batchFile.name,
          stats: { ...stats }
        })

        const uploadResult = await uploadFile(batchFile, 'documents')
        if (uploadResult.success) {
          const created = await createDocumentFromUploadedFile(batchFile, uploadResult.url, baseData)
          if (created.success) stats.fileOk++
          else stats.fail++
        } else {
          stats.fail++
        }

        updateImportProgress({
          current: index + 1,
          itemName: batchFile.name,
          stats: { ...stats }
        })
      }

      resetImportProgress()
      closeModal()
      await loadDocuments()
      alert(`已完成多檔上傳：成功 ${stats.fileOk} 筆，失敗 ${stats.fail} 筆`)
      return
    }

    const file = files[0]
    const result = await uploadFile(file, 'documents')
    if (result.success) {
      formData.value.file = result.url
      if (!formData.value.name) formData.value.name = getNameFromLocalFile(file)
      alert('檔案上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    resetImportProgress()
    alert('上傳失敗: ' + error.message)
  } finally {
    fileUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

// Remove file
const removeFile = () => {
  formData.value.file = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Cover upload handler
const handleCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  try {
    const result = await uploadFile(file, 'document-covers')
    if (result.success) {
      formData.value.cover = result.url
      alert('封面上傳成功！')
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Cover upload error:', error)
    alert('封面上傳失敗: ' + error.message)
  } finally {
    coverUploading.value = false
  }
}

// Remove cover
const removeCover = () => {
  formData.value.cover = ''
  if (coverFileInput.value) {
    coverFileInput.value.value = ''
  }
}

const resetForm = () => {
  formData.value = {
    name: '',
    file: '',
    note: '',
    ref: '',
    category: '',
    hash: '',
    cover: ''
  }
}

const handleSubmit = async () => {
  try {
    if (isEditing.value) {
      await updateDocument(editingId.value, formData.value)
    } else {
      await addDocument(formData.value)
    }
    closeModal()
    await loadDocuments()
  } catch (error) {
    console.error('Error saving document:', error)
    alert('儲存失敗，請稍後再試')
  }
}

const confirmDelete = async (document) => {
  if (confirm(`確定要刪除文件「${document.name}」嗎？`)) {
    try {
      await deleteDocument(document.id)
      await loadDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('刪除失敗，請稍後再試')
    }
  }
}

// ZIP Export
const exportToZip = async () => {
  if (documents.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  try {
    updateImportProgress({
      active: true,
      title: '📦 匯出 ZIP 中...',
      step: '打包文件媒體',
      current: 0,
      total: documents.value.length,
      percent: 0,
      stats: null,
      itemName: ''
    })

    const { exportRecordsAsMediaZip } = await import('../../utils/zipMediaBundle')
    const { getPublicUrl } = useStorage()
    const resolveDocUrl = (value) => {
      if (!value) return ''
      if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value
      return getPublicUrl(value) || value
    }

    const stats = await exportRecordsAsMediaZip({
      records: documents.value,
      jsonFileName: 'documents.json',
      downloadName: 'supabase-documents.zip',
      mediaMap: {
        file: { folder: 'files', fallbackExt: 'bin' },
        cover: { folder: 'covers', fallbackExt: 'jpg' }
      },
      resolveUrl: resolveDocUrl,
      onProgress: ({ stage, current, total, percent, stats: packStats }) => {
        if (stage === 'media') {
          updateImportProgress({
            step: '打包文件媒體',
            current: current || 0,
            total: total || documents.value.length,
            itemName: `成功 ${packStats?.ok || 0} / 失敗 ${packStats?.fail || 0}`
          })
        } else {
          updateImportProgress({
            step: '壓縮 ZIP',
            current: documents.value.length,
            total: documents.value.length,
            itemName: `${percent || 0}%`
          })
        }
      }
    })

    updateImportProgress({ step: '匯出完成', current: documents.value.length, total: documents.value.length, itemName: 'supabase-documents.zip' })
    await new Promise(resolve => setTimeout(resolve, 250))
    resetImportProgress()
    alert(`匯出成功！\n媒體成功 ${stats.ok}，失敗 ${stats.fail}，略過 ${stats.skipped}`)
  } catch (error) {
    resetImportProgress()
    console.error('Error exporting ZIP:', error)
    alert('匯出失敗：' + error.message)
  }
}

// 匯入進度狀態
const importProgress = ref({
  active: false, title: '', step: '', current: 0, total: 0, percent: 0, itemName: '', stats: null
})
function updateImportProgress(fields) {
  Object.assign(importProgress.value, fields)
  if (fields.current !== undefined && importProgress.value.total > 0) {
    importProgress.value.percent = Math.round((fields.current / importProgress.value.total) * 100)
  }
}
function resetImportProgress() {
  importProgress.value = { active: false, title: '', step: '', current: 0, total: 0, percent: 0, itemName: '', stats: null }
}

// CSV Parser
const parseDocCsv = (text) => {
  const rows = []
  let row = []
  let current = ''
  let inQuotes = false
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]
    if (char === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if (char === '\n' && !inQuotes) {
      row.push(current.trim())
      if (row.some(cell => cell !== '')) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }

  row.push(current.trim())
  if (row.some(cell => cell !== '')) rows.push(row)
  if (rows.length < 2) return []

  const headers = rows[0]
  return rows.slice(1).map(cells => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
}

// ZIP Import — 相容 supabase (documents.json) 及 appwrite (document.csv + files/ + covers/)
const isRemoteImportUrl = (value) => /^https?:\/\//i.test(value || '')

const getImportFileName = (path = '', fallback = 'file') => {
  const cleanPath = String(path || '').replace(/\\/g, '/')
  return cleanPath.split('/').pop() || fallback
}

const getImportMimeType = (fileName = '') => {
  const ext = getImportFileName(fileName).split('.').pop()?.toLowerCase() || ''
  const mimeMap = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4'
  }
  return mimeMap[ext] || 'application/octet-stream'
}

const findZipEntry = (zip, allZipFiles, rawPath, preferredFolder = 'files') => {
  if (!rawPath || isRemoteImportUrl(rawPath)) return null
  const normalizedPath = String(rawPath).replace(/\\/g, '/').replace(/^\/+/, '')
  const candidates = [
    normalizedPath,
    `${preferredFolder}/${normalizedPath}`,
    `files/${normalizedPath}`,
    `covers/${normalizedPath}`
  ]

  for (const candidate of candidates) {
    const entry = zip.file(candidate)
    if (entry) return entry
  }

  const baseName = getImportFileName(normalizedPath)
  const matchedPath = allZipFiles.find((path) => {
    const normalized = path.replace(/\\/g, '/')
    return normalized === baseName || normalized.endsWith(`/${baseName}`)
  })
  return matchedPath ? zip.file(matchedPath) : null
}

const getFirstRowValue = (row, keys) => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

const mapImportedDocumentRow = (row, index) => {
  const cleaned = {}
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('$')) continue
    cleaned[key] = value
  }

  const fileValue = getFirstRowValue(cleaned, ['file', 'file1', 'attachment', 'attachment1'])
  const fileName = getFirstRowValue(cleaned, ['filename', 'fileName', 'file1name', 'file1Name'])
  const title = getFirstRowValue(cleaned, ['name', 'title', 'subject', 'heading'])

  return {
    name: title || fileName || getImportFileName(fileValue, `Appwrite document ${index + 1}`),
    file: fileValue,
    note: getFirstRowValue(cleaned, ['note', 'content', 'description', 'body', 'summary']),
    ref: getFirstRowValue(cleaned, ['ref', 'reference', 'source', 'url', 'url1']),
    category: getFirstRowValue(cleaned, ['category', 'type', 'tag']),
    hash: getFirstRowValue(cleaned, ['hash']),
    cover: getFirstRowValue(cleaned, ['cover', 'thumbnail', 'image', 'cover1'])
  }
}

const handleZipImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    updateImportProgress({ active: true, title: '📦 正在解壓 ZIP...', step: '讀取檔案中', current: 0, total: 1, stats: null, itemName: file.name })

    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    const csvNames = [
      'document.csv',
      'documents.csv',
      'appwrite-document.csv',
      'appwrite-documents.csv',
      'appwrite-article.csv',
      'supabase-document.csv',
      'supabase-documents.csv',
      'supabase-article.csv'
    ]
    let csvFile = null
    for (const csvName of csvNames) {
      csvFile = zip.file(csvName)
      if (csvFile) break
    }
    if (!csvFile) {
      const csvFiles = zip.file(/\.csv$/i)
      csvFile = csvFiles[0] || null
    }
    const jsonFile = zip.file('documents.json')
    const allZipFiles = []
    zip.forEach((path, entry) => {
      if (!entry.dir) allZipFiles.push(path)
    })

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：document.csv + files/ + covers/ =====
      updateImportProgress({ step: '解析 CSV...', itemName: csvFile.name || 'document.csv' })
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseDocCsv(cleanText)

      if (parsed.length === 0) {
        resetImportProgress()
        alert('CSV 檔案無有效資料')
        return
      }

      resetImportProgress()
      const confirmMsg = `ℹ️ 偵測到 Appwrite document.zip 格式\n\n共 ${parsed.length} 筆文件\n系統將自動上傳檔案、封面至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      updateImportProgress({
        active: true, title: '📄 匯入文件中...', step: '準備上傳',
        current: 0, total: parsed.length,
        stats: { fileOk: 0, coverOk: 0, fail: 0 }, itemName: ''
      })

      const { uploadFile: uploadToStorage } = useStorage()
      const stats = { fileOk: 0, coverOk: 0, fail: 0 }

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        const mapped = mapImportedDocumentRow(row, i)

        const itemLabel = mapped.name || `第 ${i + 1} 筆`
        updateImportProgress({ current: i + 1, itemName: itemLabel })

        // 上傳檔案 (files/ 資料夾)
        const filePath = mapped.file
        const fileEntry = findZipEntry(zip, allZipFiles, filePath, 'files')
        if (filePath && !fileEntry && !isRemoteImportUrl(filePath)) mapped.file = ''
        if (filePath && fileEntry) {
          updateImportProgress({ step: `📄 上傳檔案 ${i + 1}/${parsed.length}` })
          const zipEntry = fileEntry
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = getFirstRowValue(row, ['filename', 'fileName', 'file1name', 'file1Name']) || getImportFileName(filePath, `file_${i}`)
              const ext = fileName.split('.').pop()?.toLowerCase() || ''
              const mimeMap = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain', zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', mp3: 'audio/mpeg', mp4: 'video/mp4' }
              const fileObj = new window.File([blob], fileName, { type: mimeMap[ext] || 'application/octet-stream' })
              const uploadResult = await uploadToStorage(fileObj, 'documents')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                stats.fileOk++
              } else {
                console.warn(`上傳檔案失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳檔案失敗 (${mapped.name}):`, err)
              mapped.file = ''
              stats.fail++
            }
          } else {
            mapped.file = ''
          }
        }

        // 上傳封面 (covers/ 資料夾)
        const coverPath = mapped.cover
        const coverEntry = findZipEntry(zip, allZipFiles, coverPath, 'covers')
        if (coverPath && !coverEntry && !isRemoteImportUrl(coverPath)) mapped.cover = ''
        if (coverPath && coverEntry) {
          updateImportProgress({ step: `🖼️ 上傳封面 ${i + 1}/${parsed.length}` })
          const zipEntry = coverEntry
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = getImportFileName(coverPath, `cover_${i}.jpg`)
              const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
              const fileObj = new window.File([blob], fileName, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
              const uploadResult = await uploadToStorage(fileObj, 'document-covers')
              if (uploadResult.success) {
                mapped.cover = uploadResult.url
                stats.coverOk++
              } else {
                console.warn(`上傳封面失敗 (${mapped.name}):`, uploadResult.error)
                mapped.cover = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳封面失敗 (${mapped.name}):`, err)
              mapped.cover = ''
              stats.fail++
            }
          } else {
            mapped.cover = ''
          }
        }

        updateImportProgress({ stats: { ...stats } })
        records.push(mapped)
      }

    } else if (jsonFile) {
      // ===== Supabase 格式：documents.json =====
      updateImportProgress({ step: '解析 JSON...', itemName: 'documents.json' })
      const jsonText = await jsonFile.async('text')
      const jsonData = JSON.parse(jsonText)

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        resetImportProgress()
        alert('JSON 檔案格式錯誤或無資料')
        return
      }

      records = jsonData.map(record => {
        const { id, created_at, updated_at, ...rest } = record
        return rest
      })

      resetImportProgress()
      if (!confirm(`確定要匯入 ${records.length} 筆文件記錄嗎？\n若 ZIP 內含檔案/封面，會自動上傳。`)) return

      updateImportProgress({
        active: true,
        title: '📄 匯入文件中...',
        step: '上傳媒體',
        current: 0,
        total: records.length,
        stats: null,
        itemName: ''
      })
      const { reuploadLocalMediaFromZip } = await import('../../utils/zipMediaBundle')
      const { uploadFile: uploadToStorage } = useStorage()
      const reuploaded = await reuploadLocalMediaFromZip({
        zip,
        records,
        mediaMap: {
          file: { prefixes: ['files/', 'media/'], storageFolder: 'documents', mimeFallback: 'application/octet-stream' },
          cover: { prefixes: ['covers/'], storageFolder: 'document-covers', mimeFallback: 'image/jpeg' }
        },
        uploadFile: uploadToStorage,
        onProgress: ({ current, total, stats }) => {
          updateImportProgress({
            current,
            total,
            step: '上傳媒體',
            itemName: `成功 ${stats.ok} / 失敗 ${stats.fail}`
          })
        }
      })
      records = reuploaded.records
      updateImportProgress({ step: '寫入資料庫', current: records.length, total: records.length })

    } else {
      resetImportProgress()
      alert('ZIP 檔案中找不到 document.csv 或 documents.json')
      return
    }

    // 匯入記錄到資料庫
    if (records.length > 0) {
      updateImportProgress({ step: '💾 寫入資料庫...', current: importProgress.value.total, percent: 99 })
      const result = await importDocuments(records)
      resetImportProgress()
      if (result.success) {
        await loadDocuments()
        alert(`✅ ${result.message}！共 ${result.count} 筆資料`)
      } else {
        alert('匯入失敗: ' + result.error)
      }
    } else {
      resetImportProgress()
    }
  } catch (error) {
    resetImportProgress()
    console.error('Error importing ZIP:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    event.target.value = ''
  }
}

// Utility functions
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const getFileName = (filePath) => {
  if (!filePath) return ''
  return filePath.split('/').pop() || filePath
}

const isImageUrl = (url) => {
  if (!url) return false
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)
}

const getFileExtension = (url) => {
  if (!url) return ''
  const cleanUrl = String(url).split('?')[0].split('#')[0]
  return cleanUrl.split('.').pop()?.toLowerCase() || ''
}

const getFilePreviewType = (url) => {
  const ext = getFileExtension(url)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (['txt', 'csv', 'json', 'md', 'log', 'xml', 'html', 'css', 'js', 'ts'].includes(ext)) return 'text'
  if (['mp4', 'webm', 'ogg', 'mov', 'm4v'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'oga'].includes(ext)) return 'audio'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office'
  return 'file'
}

const getOfficePreviewUrl = (url) => {
  if (getFilePreviewType(url) !== 'office' || !/^https?:\/\//i.test(url || '')) return ''
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`
}

const getFilePreviewIcon = (url) => {
  const type = getFilePreviewType(url)
  if (type === 'office') return '📄'
  if (type === 'audio') return '🎧'
  if (type === 'video') return '🎬'
  return '📎'
}

const getFilePreviewLabel = (url) => {
  const type = getFilePreviewType(url)
  if (type === 'office') return 'Office 文件可線上預覽'
  if (type === 'file') return '此檔案可開啟或下載'
  return '檔案預覽'
}

const scoreDecodedText = (text = '') => {
  const replacementCount = (text.match(/\uFFFD/g) || []).length
  const controlCount = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length
  return replacementCount * 8 + controlCount * 4
}

const decodePreviewText = (buffer) => {
  const candidates = [
    new TextDecoder('utf-8').decode(buffer),
    new TextDecoder('big5').decode(buffer)
  ]

  return candidates.sort((a, b) => scoreDecodedText(a) - scoreDecodedText(b))[0]
}

const loadPreviewText = async (url) => {
  previewTextLoading.value = true
  previewTextError.value = ''
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    previewText.value = decodePreviewText(buffer)
  } catch (error) {
    console.error('Text preview error:', error)
    previewTextError.value = '文字預覽失敗，請改用開啟檔案或下載。'
  } finally {
    previewTextLoading.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  if (typeof localStorage !== 'undefined') {
    const savedMode = localStorage.getItem(DOCUMENT_VIEW_MODE_KEY)
    if (savedMode === 'card' || savedMode === 'list') {
      documentViewMode.value = savedMode
    }
  }
  loadDocuments()
})
</script>

<style scoped>
/* 行內編輯樣式 */
.card-editing {
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.2);
  border-left: 4px solid #4facfe;
}

/* 圖片預覽 */
.inline-img-preview {
  display: block;
  max-width: 100%;
  max-height: 160px;
  border-radius: 6px;
  margin-top: 6px;
  object-fit: contain;
  border: 1px solid rgba(255,255,255,0.1);
}
.file-img-preview {
  display: block;
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 6px;
}
.file-img-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
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
  border-color: #4facfe;
  box-shadow: 0 0 0 2px rgba(79, 172, 254, 0.15);
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
  min-width: 60px;
  font-size: 0.8rem;
  color: #666;
  padding-top: 0.4rem;
  flex-shrink: 0;
}

.inline-textarea {
  resize: vertical;
  min-height: 60px;
}

.btn-icon.save:hover {
  background: #ecfdf5;
}

/* Filter select */
.filter-group {
  display: flex;
  align-items: center;
}

.filter-select {
  padding: 0.65rem 0.8rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 130px;
}

.filter-select:focus {
  outline: none;
  border-color: #4facfe;
}

/* Inline upload */
.inline-upload-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.btn-inline-upload {
  padding: 0.3rem 0.7rem;
  font-size: 0.82rem;
  border: 1px solid #4facfe;
  border-radius: 4px;
  background: #f0f9ff;
  color: #0369a1;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.2s;
}

.btn-inline-upload:hover:not(:disabled) {
  background: #e0f2fe;
}

.btn-inline-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.inline-file-name {
  font-size: 0.82rem;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-inline-remove {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0 2px;
}

.document-page {
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

/* Header */
.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Actions Bar */
.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-group {
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #4facfe;
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn:disabled,
.btn.disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn-primary {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
}

.btn-secondary {
  background: #e2e8f0;
  color: #334155;
}

.btn-secondary:hover {
  background: #cbd5e1;
}

.btn-export {
  background: #10b981;
  color: white;
}

.btn-export:hover {
  background: #059669;
  transform: translateY(-2px);
}

.btn-import {
  background: #3b82f6;
  color: white;
  display: inline-block;
  text-align: center;
}

.btn-import:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 4rem 2rem;
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 1rem;
  border: 4px solid #e2e8f0;
  border-top-color: #4facfe;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.25rem;
  color: #64748b;
  margin-bottom: 2rem;
}

.view-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem;
  background: #eef2ff;
  border-radius: 999px;
}

.view-switch-btn {
  border: none;
  background: transparent;
  color: #475569;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-switch-btn.active {
  background: white;
  color: #1d4ed8;
  box-shadow: 0 2px 6px rgba(29, 78, 216, 0.15);
}

/* Documents Grid */
.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.documents-grid--list {
  grid-template-columns: 1fr;
}

.document-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.document-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(79, 172, 254, 0.2);
  border-color: #4facfe;
}

.document-card--list {
  padding: 1.1rem 1.25rem;
}

.document-card--list:hover {
  transform: none;
}

.document-card--list .card-header {
  margin-bottom: 0.75rem;
}

.document-card--list .card-body {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.9fr);
  gap: 1rem 1.25rem;
  align-items: start;
}

.document-card--list .card-footer {
  margin-top: 0.5rem;
}

.document-card--list .cover-preview {
  margin-top: 0;
}

.document-card--list .cover-image,
.document-card--list .file-img-preview {
  max-height: 120px;
  object-fit: contain;
  background: #f8fafc;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex: 1;
  word-break: break-word;
}

.card-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  align-self: flex-start;
}

.note-preview {
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.5;
}

.file-info {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  gap: 0.5rem;
  padding: 0.65rem;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 0.9rem;
}

.file-preview-frame {
  width: 100%;
  min-height: 92px;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
}

.file-embed-preview {
  display: block;
  width: 100%;
  height: 240px;
  border: 0;
  background: #fff;
}

.file-text-preview {
  background: #f8fafc;
}

.file-media-preview {
  display: block;
  width: 100%;
  max-height: 260px;
  background: #0f172a;
}

.file-audio-preview {
  display: block;
  width: 100%;
  padding: 1rem;
  background: #fff;
}

.file-generic-preview {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  min-height: 92px;
  justify-content: center;
  color: #475569;
  font-weight: 600;
  text-align: center;
  padding: 1rem;
  flex-wrap: wrap;
}

.file-generic-icon {
  font-size: 1.7rem;
}

.btn-office-preview {
  color: #2563eb;
  font-size: 0.85rem;
  text-decoration: none;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
}

.file-icon {
  font-size: 1.2rem;
}

.file-name {
  color: #475569;
  word-break: break-all;
  flex: 1;
}

.btn-download {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #2563eb;
  font-size: 1rem;
  text-decoration: none;
  opacity: 0.7;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-preview {
  font-weight: 700;
}

.btn-download:hover {
  opacity: 1;
  transform: scale(1.15);
}

.ref-info {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #64748b;
}

.ref-info .label {
  font-weight: 500;
}

.cover-preview {
  margin-top: 0.5rem;
}

.cover-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  font-size: 0.85rem;
  color: #94a3b8;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hash-info {
  font-family: monospace;
  color: #64748b;
}

.timestamp {
  color: #94a3b8;
}

/* Modal */
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
  animation: fadeIn 0.2s ease-in;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

.file-preview-modal {
  max-width: min(1040px, 94vw);
  max-height: 92vh;
}

.file-preview-modal-body {
  padding: 1rem;
  background: #f8fafc;
}

.file-preview-large-img {
  display: block;
  width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 10px;
  background: white;
}

.file-preview-large-frame {
  display: block;
  width: 100%;
  height: min(72vh, 720px);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
}

.file-preview-text-panel {
  width: 100%;
  max-height: 72vh;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
}

.file-preview-text-content {
  margin: 0;
  padding: 1rem;
  color: #0f172a;
  font-family: Consolas, "Courier New", monospace;
  font-size: 0.95rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.file-preview-large-media {
  display: block;
  width: 100%;
  max-height: 72vh;
  border-radius: 10px;
  background: #0f172a;
}

.file-preview-large-audio {
  display: block;
  width: 100%;
  margin: 2rem 0;
}

.file-preview-fallback {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #475569;
  text-align: center;
}

.file-preview-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #94a3b8;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.modal-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #334155;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4facfe;
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }

  .actions-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-group {
    width: 100%;
  }

  .csv-actions {
    width: 100%;
  }

  .csv-actions .btn {
    flex: 1;
  }

  .view-switcher {
    width: 100%;
    justify-content: center;
  }

  .documents-grid {
    grid-template-columns: 1fr;
  }

  .document-card--list .card-body {
    grid-template-columns: 1fr;
  }

  .modal-content {
    margin: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .card-header {
    flex-direction: column;
  }

  .card-actions {
    align-self: flex-end;
  }
}

/* Upload Area Styles */
.upload-area {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.btn-upload {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.file-preview, .cover-upload-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: #f1f5f9;
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

/* Summary Bar */
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
.document-card.batch-selected { border-color: #3498db; background: linear-gradient(135deg, rgba(52, 152, 219, 0.05) 0%, rgba(46, 204, 113, 0.05) 100%); }

/* ── Import Progress Overlay ── */
.import-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; animation: fadeIn 0.2s ease;
}
.import-modal-box {
  background: white; border-radius: 20px;
  padding: 2.5rem 2rem; width: 90%; max-width: 420px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.import-spinner-anim {
  width: 48px; height: 48px; margin: 0 auto 1.25rem;
  border: 4px solid #e5e7eb; border-top-color: #4facfe;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
.import-title { font-size: 1.3rem; font-weight: 700; color: #1f2937; margin: 0 0 0.5rem; }
.import-step { font-size: 0.95rem; color: #6b7280; margin: 0 0 1.25rem; }
.import-progress-bar {
  width: 100%; height: 10px; background: #e5e7eb;
  border-radius: 99px; overflow: hidden; margin-bottom: 0.75rem;
}
.import-progress-fill {
  height: 100%; background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 99px; transition: width 0.3s ease;
}
.import-percent { font-size: 0.9rem; color: #374151; font-weight: 600; margin: 0 0 0.25rem; }
.import-item-name {
  font-size: 0.85rem; color: #9ca3af; margin: 0 0 1rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.import-stats { display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap; }
.stat-tag { font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 12px; font-weight: 500; }
.stat-ok { background: #d1fae5; color: #065f46; }
.stat-fail { background: #fee2e2; color: #991b1b; }
</style>
