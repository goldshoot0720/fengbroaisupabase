<template>
  <PageContainer>
    <div class="gallery-page">
      <!-- 操作區 -->
      <div class="actions-bar">
        <div class="search-box">
          <span class="icon">🔍</span>
          <input v-model="searchQuery" type="text" placeholder="搜尋圖片名稱..." class="search-input">
        </div>
        <div class="action-buttons">
          <div class="csv-actions">
            <button v-if="images.length > 0" @click="exportImagesZip" class="btn-export">
              <span class="icon">📤</span> 匯出 ZIP
            </button>
            <button @click="$refs.zipFileInput.click()" class="btn-import">
              <span class="icon">📥</span> 匯入 ZIP
            </button>
            <input
              ref="zipFileInput"
              type="file"
              accept=".zip"
              style="display:none"
              @change="handleImportZip"
            >
          </div>
        </div>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredImages.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增">+</button>
          <template v-if="batchMode">
            <label class="select-all-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全選</span>
            </label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ images.length }} 個項目</span>
          <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>
        </div>
        <div class="summary-right">
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除選中 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-if="loading && images.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>載入資料中...</p>
      </div>

      <!-- 圖片列表 -->
      <div v-if="isAddingInline || filteredImages.length > 0 || !loading" class="images-container" :class="[`images-container--${viewMode}`]">

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="image-card card-editing image-card--editor">
          <div class="image-header">
            <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="圖片名稱 *" style="flex:1" />
            <div class="image-actions">
              <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
              <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
            </div>
          </div>
          <div class="inline-add-form">
            <div class="inline-field-row">
              <label>上傳圖片</label>
              <label class="btn-inline-upload" :class="{ disabled: addUploading }">
                {{ addUploading ? '上傳中...' : '選擇圖片' }}
                <input type="file" accept="image/*" multiple style="display:none" :disabled="addUploading" @change="handleAddImageUpload" />
              </label>
              <span v-if="addSelectedFiles.length > 0" class="inline-file-name">
                已選 {{ addSelectedFiles.length }} 張
                <button type="button" class="btn-inline-remove" @click="clearAddSelectedFiles">✕</button>
              </span>
              <span v-else-if="addForm.file" class="inline-file-name">📎
                <button type="button" class="btn-inline-remove" @click="addForm.file = ''">✕</button>
              </span>
            </div>
            <div v-if="addSelectedFiles.length > 0" class="inline-selected-files">
              <span v-for="file in addSelectedFiles" :key="file.name + file.size" class="selected-file-chip">
                {{ file.name }}
              </span>
            </div>
            <div v-else-if="addForm.file" class="inline-img-preview-wrap">
              <img :src="addForm.file" class="inline-img-preview" alt="預覽" />
            </div>
            <div class="inline-field-row">
              <label>或輸入URL</label>
              <input v-model="addForm.file" type="text" class="inline-input" placeholder="https://..." :disabled="addSelectedFiles.length > 0" />
            </div>
            <div class="inline-field-row">
              <label>分類</label>
              <input v-model="addForm.category" type="text" class="inline-input" placeholder="分類" />
            </div>
            <div class="inline-field-row">
              <label>備註</label>
              <input v-model="addForm.note" type="text" class="inline-input" placeholder="備註" />
            </div>
            <div class="inline-field-row">
              <label>類型</label>
              <input v-model="addForm.filetype" type="text" class="inline-input" placeholder="jpg, png..." />
            </div>
          </div>
        </div>

        <div v-if="filteredImages.length === 0 && !isAddingInline" class="empty-state">
          <p>沒有找到相關圖片</p>
        </div>

        <div v-for="image in filteredImages" :key="image.id" class="image-card" :class="[{ 'card-editing': editingId === image.id }, imageCardModeClass(image.id)]">

          <!-- 行內編輯模式 -->
          <template v-if="editingId === image.id">
            <div class="image-header">
              <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="圖片名稱 *" style="flex:1" />
              <div class="image-actions">
                <button class="btn-icon save" @click="saveInlineEdit" :disabled="editUploading" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
              </div>
            </div>
            <div class="inline-add-form">
              <!-- 圖片預覽 -->
              <div v-if="editForm.file" class="inline-img-preview-wrap">
                <img :src="editForm.file" class="inline-img-preview" alt="預覽" />
              </div>
              <!-- 上傳圖片 -->
              <div class="inline-field-row">
                <label>上傳圖片</label>
                <label class="btn-inline-upload" :class="{ disabled: editUploading }">
                  {{ editUploading ? '上傳中...' : '選擇圖片' }}
                  <input type="file" accept="image/*" style="display:none" :disabled="editUploading" @change="handleEditImageUpload" />
                </label>
                <button v-if="editForm.file" type="button" class="btn-inline-remove" @click="editForm.file = ''" title="移除圖片">✕</button>
              </div>
              <!-- 輸入 URL -->
              <div class="inline-field-row">
                <label>或輸入URL</label>
                <input v-model="editForm.file" type="text" class="inline-input" placeholder="https://..." />
              </div>
              <div class="inline-field-row">
                <label>分類</label>
                <input v-model="editForm.category" type="text" class="inline-input" placeholder="分類" />
              </div>
              <div class="inline-field-row">
                <label>備註</label>
                <input v-model="editForm.note" type="text" class="inline-input" placeholder="備註" />
              </div>
              <div class="inline-field-row">
                <label>類型</label>
                <input v-model="editForm.filetype" type="text" class="inline-input" placeholder="jpg, png..." />
              </div>
            </div>
          </template>

          <!-- 一般顯示模式 -->
          <template v-else>
            <div class="image-header">
              <div class="image-meta">
                <span v-if="image.category" class="category-badge">{{ image.category }}</span>
              </div>
              <div class="image-actions">
                <button class="btn-icon" @click="openInlineEdit(image)" title="行內編輯">✏️</button>
                <button class="btn-icon delete" @click="confirmDelete(image)" title="刪除">🗑️</button>
              </div>
            </div>

            <h3 class="image-name">{{ image.name || '無名稱' }}</h3>

            <div class="image-details">
              <div v-if="image.note" class="detail-row">
                <span class="detail-label">備註:</span>
                <p class="detail-value">{{ image.note }}</p>
              </div>
              <div v-if="image.file" class="card-image-wrapper">
                <img :src="image.file" :alt="image.name || '圖片'" class="card-image" />
              </div>
              <div v-if="image.filetype" class="detail-row">
                <span class="file-type-badge">{{ image.filetype }}</span>
              </div>
            </div>

            <!-- 其他資訊 -->
            <div class="image-extra" v-if="hasExtra(image)">
              <div v-if="image.ref" class="extra-item">
                <span class="extra-label">參考:</span>
                <span class="extra-value">{{ image.ref }}</span>
              </div>
              <div v-if="image.hash" class="extra-item">
                <span class="extra-label">Hash:</span>
                <span class="extra-value hash-value">{{ image.hash }}</span>
              </div>
              <div v-if="image.cover" class="extra-item">
                <span class="extra-label">封面:</span>
                <span class="extra-value">{{ image.cover }}</span>
              </div>
            </div>
          </template>

        </div>
      </div>

      <!-- 編輯/新增 Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ isEditing ? '編輯圖片' : '新增圖片' }}</h3>
            <button class="btn-close" @click="closeModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>名稱 <span class="required">*</span></label>
              <input v-model="formData.name" type="text" class="form-input" placeholder="請輸入圖片名稱">
            </div>

            <div class="form-group">
              <label>上傳圖片</label>
              <div class="upload-area">
                <input
                  ref="imageFileInput"
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.imageFileInput.click()"
                  class="btn-upload"
                  :disabled="imageUploading"
                >
                  {{ imageUploading ? '上傳中...' : '選擇圖片' }}
                </button>
                <span v-if="imageUploadProgress > 0" class="upload-progress">{{ imageUploadProgress }}%</span>
              </div>
              <div v-if="formData.file" class="image-preview">
                <img :src="formData.file" alt="預覽" class="preview-image" />
                <button type="button" @click="removeImage" class="btn-remove">移除</button>
              </div>
            </div>

            <div class="form-group">
              <label>檔案路徑</label>
              <input v-model="formData.file" type="text" class="form-input" placeholder="自動上傳或手動輸入 URL">
            </div>

            <div class="form-group">
              <label>檔案類型</label>
              <input v-model="formData.filetype" type="text" class="form-input" placeholder="例: jpg, png, webp">
            </div>

            <div class="form-group">
              <label>分類</label>
              <input v-model="formData.category" type="text" class="form-input" placeholder="請輸入分類">
            </div>

            <div class="form-group">
              <label>備註</label>
              <textarea v-model="formData.note" class="form-textarea" rows="4" placeholder="請輸入備註說明..."></textarea>
            </div>

            <div class="form-section">
              <h4 @click="toggleSection('extra')" class="section-toggle">
                🔧 進階設定 {{ showSection.extra ? '▼' : '▶' }}
              </h4>
              <div v-if="showSection.extra" class="section-content">
                <div class="form-group">
                  <label>參考來源</label>
                  <input v-model="formData.ref" type="text" class="form-input" placeholder="參考來源或連結">
                </div>
                <div class="form-group">
                  <label>Hash 值</label>
                  <input v-model="formData.hash" type="text" class="form-input" placeholder="檔案 Hash 值">
                </div>
                <div class="form-group">
                  <label>封面圖片上傳</label>
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
                      class="btn-upload"
                      :disabled="coverUploading"
                    >
                      {{ coverUploading ? '上傳中...' : '選擇封面' }}
                    </button>
                  </div>
                  <div v-if="formData.cover" class="image-preview">
                    <img :src="formData.cover" alt="封面預覽" class="preview-image" />
                    <button type="button" @click="removeCover" class="btn-remove">移除</button>
                  </div>
                  <input v-model="formData.cover" type="text" class="form-input" placeholder="或輸入封面 URL">
                </div>
              </div>
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
import { ref, onMounted, reactive, computed } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import { useImages } from '../../composables/useImages'
import { useStorage } from '../../composables/useStorage'

const {
  images,
  loading,
  FIELDS,
  loadImages,
  addImage,
  updateImage,
  deleteImage,
  importImages
} = useImages()

// 狀態
const showModal = ref(false)
const isEditing = ref(false)
const searchQuery = ref('')
const viewMode = ref('hybrid')
const showSection = reactive({
  extra: false
})

const batchMode = ref(false)
const selectedIds = ref(new Set())
const enterBatchMode = () => { batchMode.value = true }
const exitBatchMode = () => { batchMode.value = false; selectedIds.value = new Set() }
const isAllSelected = computed(() => filteredImages.value.length > 0 && filteredImages.value.every(a => selectedIds.value.has(a.id)))
const toggleSelect = (id) => { const s = new Set(selectedIds.value); if (s.has(id)) s.delete(id); else s.add(id); selectedIds.value = s }
const toggleSelectAll = () => { if (isAllSelected.value) selectedIds.value = new Set(); else selectedIds.value = new Set(filteredImages.value.map(a => a.id)) }
const viewOptions = [
  { value: 'hybrid', label: '??' },
  { value: 'card', label: '??' },
  { value: 'list', label: '??' }
]

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return
  if (count === images.value.length) {
    const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE image 確認：`)
    if (input !== 'DELETE image') { alert('輸入不正確，已取消'); return }
  } else { if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) return }
  let ok = 0
  for (const id of [...selectedIds.value]) { const r = await deleteImage(id); if (r.success) ok++ }
  selectedIds.value = new Set(); batchMode.value = false
  alert(`已刪除 ${ok} 筆`)
}

// 上傳狀態
const imageFileInput = ref(null)
const coverFileInput = ref(null)
const { uploading: imageUploading, uploadProgress: imageUploadProgress, uploadFile: uploadImageFile } = useStorage()
const coverUploading = ref(false)
const coverUploadProgress = ref(0)

// 表單資料
const formData = reactive({
  id: null,
  name: '',
  file: '',
  filetype: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  cover: ''
})

// 初始化
onMounted(() => {
  loadImages()
})

// 搜尋過濾
const filteredImages = computed(() => {
  if (!searchQuery.value) return images.value

  const query = searchQuery.value.toLowerCase()
  return images.value.filter(image =>
    (image.name && image.name.toLowerCase().includes(query)) ||
    (image.category && image.category.toLowerCase().includes(query))
  )
})

const imageCardModeClass = (imageId) => {
  if (viewMode.value === 'card') return 'image-card--card'
  if (viewMode.value === 'list') return 'image-card--list'

  const index = filteredImages.value.findIndex((image) => image.id === imageId)
  return index >= 0 && index < 2 ? 'image-card--card' : 'image-card--list'
}

// 檢查是否有額外資訊
const hasExtra = (image) => {
  return image.ref || image.hash || image.cover
}

// 切換區塊顯示
const toggleSection = (section) => {
  showSection[section] = !showSection[section]
}

// 行內新增
const isAddingInline = ref(false)
const addForm = reactive({ name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
const addUploading = ref(false)
const addSelectedFiles = ref([])

// 行內編輯
const editingId = ref(null)
const editForm = reactive({ name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
const editUploading = ref(false)

const openInlineEdit = (image) => {
  editingId.value = image.id
  Object.assign(editForm, { name: image.name || '', file: image.file || '', filetype: image.filetype || '', note: image.note || '', ref: image.ref || '', category: image.category || '', hash: image.hash || '', cover: image.cover || '' })
}
const cancelInlineEdit = () => { editingId.value = null }

const handleEditImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  editUploading.value = true
  try {
    const result = await uploadImageFile(file, 'gallery')
    if (result.success) {
      editForm.file = result.url
      if (!editForm.name) editForm.name = file.name.replace(/\.[^.]+$/, '')
      if (!editForm.filetype) editForm.filetype = file.name.split('.').pop() || ''
    } else { alert('上傳失敗: ' + result.error) }
  } catch (e) { alert('上傳失敗: ' + e.message) } finally { editUploading.value = false }
}

const saveInlineEdit = async () => {
  if (!editForm.name) { alert('請輸入圖片名稱'); return }
  try {
    const result = await updateImage(editingId.value, { ...editForm })
    if (result.success) { editingId.value = null; await loadImages() }
    else { alert('儲存失敗: ' + result.error) }
  } catch (e) { alert('儲存失敗: ' + e.message) }
}

const getFileBaseName = (fileName = '') => fileName.replace(/\.[^.]+$/, '')
const getFileExtension = (fileName = '') => fileName.split('.').pop() || ''

const resetAddForm = () => {
  Object.assign(addForm, { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
  addSelectedFiles.value = []
}

const openInlineAdd = () => {
  resetAddForm()
  isAddingInline.value = true
}
const cancelInlineAdd = () => {
  resetAddForm()
  isAddingInline.value = false
}

const clearAddSelectedFiles = () => {
  addSelectedFiles.value = []
}

const handleAddImageUpload = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  addSelectedFiles.value = files
  addForm.file = ''
  if (files.length === 1) {
    if (!addForm.name) addForm.name = getFileBaseName(files[0].name)
    if (!addForm.filetype) addForm.filetype = getFileExtension(files[0].name)
  } else if (!addForm.filetype) {
    addForm.filetype = ''
  }
  event.target.value = ''
}

const saveInlineAdd = async () => {
  if (addSelectedFiles.value.length > 0) {
    addUploading.value = true
    try {
      const records = []
      for (const file of addSelectedFiles.value) {
        const result = await uploadImageFile(file, 'gallery')
        if (!result.success) {
          throw new Error(`${file.name}: ${result.error}`)
        }
        records.push({
          name: addSelectedFiles.value.length === 1 && addForm.name ? addForm.name : getFileBaseName(file.name),
          file: result.url,
          filetype: addForm.filetype || getFileExtension(file.name),
          note: addForm.note,
          ref: addForm.ref,
          category: addForm.category,
          hash: addForm.hash,
          cover: addForm.cover
        })
      }

      const result = await importImages(records)
      if (result.success) {
        resetAddForm()
        isAddingInline.value = false
        await loadImages()
      } else {
        alert('新增失敗: ' + result.error)
      }
    } catch (e) {
      alert('批次上傳失敗: ' + e.message)
    } finally {
      addUploading.value = false
    }
    return
  }

  if (!addForm.name) { alert('請輸入圖片名稱'); return }
  try {
    const result = await addImage({ ...addForm })
    if (result.success) { resetAddForm(); isAddingInline.value = false; await loadImages() }
    else { alert('新增失敗: ' + result.error) }
  } catch (e) { alert('新增失敗: ' + e.message) }
}

// 開啟新增 Modal
const openAddModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

// 開啟編輯 Modal
const editImage = (image) => {
  isEditing.value = true
  Object.assign(formData, image)
  showModal.value = true
}

// 重置表單
const resetForm = () => {
  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })
  formData.id = null
  showSection.extra = false
}

// 關閉 Modal
const closeModal = () => {
  showModal.value = false
  resetForm()
}

// 圖片上傳處理
const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const result = await uploadImageFile(file, 'gallery')
    if (result.success) {
      formData.file = result.url
      // 名稱預設為上傳檔案名稱（去除副檔名）
      if (!formData.name) {
        formData.name = file.name.replace(/\.[^.]+$/, '')
      }
      // 自動偵測檔案類型
      const ext = file.name.split('.').pop()
      if (ext) formData.filetype = ext
      alert('圖片上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('上傳失敗: ' + error.message)
  }
}

// 移除已上傳圖片
const removeImage = () => {
  formData.file = ''
  formData.filetype = ''
  if (imageFileInput.value) {
    imageFileInput.value.value = ''
  }
}

// 封面圖片上傳處理
const handleCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  try {
    const { uploadFile } = useStorage()
    const result = await uploadFile(file, 'gallery-covers')
    if (result.success) {
      formData.cover = result.url
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

// 移除封面
const removeCover = () => {
  formData.cover = ''
  if (coverFileInput.value) {
    coverFileInput.value.value = ''
  }
}

// 提交表單
const handleSubmit = async () => {
  if (!formData.name) {
    alert('請輸入圖片名稱')
    return
  }

  let result
  if (isEditing.value) {
    result = await updateImage(formData.id, formData)
  } else {
    result = await addImage(formData)
  }

  if (result.success) {
    closeModal()
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 確認刪除
const confirmDelete = async (image) => {
  if (confirm(`確定要刪除這張圖片嗎？\n名稱: ${image.name || '(無名稱)'}`)) {
    await deleteImage(image.id)
  }
}

// ZIP 匯出
const exportImagesZip = async () => {
  if (images.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default

    const zip = new JSZip()

    // Create JSON data
    const jsonData = JSON.stringify(images.value, null, 2)
    zip.file('images.json', jsonData)

    // Generate ZIP file
    const blob = await zip.generateAsync({ type: 'blob' })

    // Download
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'supabase-images.zip')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    alert('匯出成功！')
  } catch (error) {
    console.error('Error exporting ZIP:', error)
    alert('匯出失敗：' + error.message)
  }
}

const zipFileInput = ref(null)

// ZIP Import — 相容 supabase-images.zip (images.json) 及 appwrite-image.zip (image.csv + images/)
const handleImportZip = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // 偵測格式：Appwrite (image.csv) vs Supabase (images.json)
    const csvFile = zip.file('image.csv')
    const jsonFile = zip.file('images.json')

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：image.csv + images/ 資料夾 =====
      console.log('偵測到 Appwrite image.zip 格式')
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseImageCsv(cleanText)

      if (parsed.length === 0) {
        alert('CSV 檔案無有效資料')
        return
      }

      const confirmMsg = `ℹ️ 偵測到 Appwrite image.zip 格式\n\n共 ${parsed.length} 筆圖片\n系統將自動上傳圖片至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      const { uploadFile: uploadToStorage } = useStorage()
      let uploadOk = 0
      let uploadFail = 0

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        // 移除 Appwrite 系統欄位
        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        // 上傳圖片檔案
        const localPath = mapped.file
        if (localPath && localPath.startsWith('images/')) {
          const zipEntry = zip.file(localPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = localPath.split('/').pop() || `image_${i}.jpg`
              const fileObj = new window.File([blob], fileName, {
                type: blob.type || `image/${mapped.filetype || 'jpeg'}`
              })
              const uploadResult = await uploadToStorage(fileObj, 'gallery')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                uploadOk++
              } else {
                console.warn(`上傳圖片失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                uploadFail++
              }
            } catch (err) {
              console.warn(`上傳圖片失敗 (${mapped.name}):`, err)
              mapped.file = ''
              uploadFail++
            }
          } else {
            console.warn(`ZIP 中找不到檔案: ${localPath}`)
            mapped.file = ''
          }
        }

        records.push(mapped)
      }

      if (uploadFail > 0) {
        console.warn(`圖片上傳: ${uploadOk} 成功, ${uploadFail} 失敗`)
      }

    } else if (jsonFile) {
      // ===== Supabase 格式：images.json =====
      const jsonText = await jsonFile.async('text')
      const jsonData = JSON.parse(jsonText)

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        alert('JSON 檔案格式錯誤或無資料')
        return
      }

      records = jsonData.map(record => {
        const { id, created_at, updated_at, ...rest } = record
        return rest
      })

      if (!confirm(`確定要匯入 ${records.length} 筆圖片資料嗎？`)) return

    } else {
      alert('ZIP 檔案中找不到 images.json 或 image.csv')
      return
    }

    const result = await importImages(records)
    if (result.success) {
      alert(`✅ ${result.message}！共 ${result.count} 筆資料`)
    } else {
      alert('匯入失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Error importing ZIP:', error)
    alert('匯入失敗：' + error.message)
  }

  e.target.value = ''
}

// 解析 image.csv（Appwrite 格式）
const parseImageCsv = (text) => {
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
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const cells = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
}

// SEO
useHead({
  title: '鋒兄圖片 - 鋒兄AI Supabase',
  meta: [
    { name: 'description', content: '圖片管理系統' }
  ]
})
</script>

<style scoped>
.gallery-page {
  animation: fadeIn 0.3s ease-in;
}

.actions-bar {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.summary-left,
.summary-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
}

.view-chip {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
  transition: all var(--transition-fast);
}

.view-chip.active {
  background: var(--surface-strong);
  color: var(--text-inverse);
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

.search-box {
  flex: 1;
  min-width: 250px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-box .icon {
  position: absolute;
  left: 12px;
  color: #999;
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.images-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

.images-container--card {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.images-container--list {
  grid-template-columns: 1fr;
}

.images-container--hybrid {
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.image-card--editor {
  grid-column: 1 / -1;
}

.image-card {
  background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--border-strong);
}

.image-card--card {
  min-height: 360px;
}

.image-card--card .card-image-wrapper {
  aspect-ratio: 16 / 9;
}

.image-card--card .card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.images-container--hybrid .image-card--card:nth-of-type(2),
.images-container--hybrid .image-card--card:nth-of-type(3) {
  grid-column: span 6;
}

.images-container--hybrid .image-card--list {
  grid-column: 1 / -1;
}

.image-card--list {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 1rem 1.25rem;
  align-items: start;
}

.image-card--list .image-header,
.image-card--list .image-name,
.image-card--list .image-details,
.image-card--list .image-extra {
  grid-column: 2;
}

.image-card--list .card-image-wrapper {
  grid-column: 1;
  grid-row: 1 / span 4;
  margin-top: 0;
  width: 100%;
  max-width: 240px;
}

.image-card--list .card-image {
  aspect-ratio: 4 / 3;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.category-badge {
  font-size: 0.85rem;
  color: var(--text-inverse);
  background: linear-gradient(135deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 72%, black 28%) 100%);
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-weight: 500;
}

.image-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem;
  border-radius: 4px;
  opacity: 0.6;
  transition: all 0.2s;
}

.btn-icon:hover {
  opacity: 1;
  background: #f0f0f0;
}

.btn-icon.delete:hover {
  background: #fee2e2;
}

.image-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-details {
  flex: 1;
  margin-bottom: 1rem;
}

.detail-row {
  margin-bottom: 0.75rem;
}

.detail-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
  display: block;
  margin-bottom: 0.25rem;
}

.detail-value {
  color: #333;
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
  word-break: break-all;
}

.card-image-wrapper {
  margin-bottom: 0.75rem;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
}

.card-image {
  width: 100%;
  height: auto;
  max-height: none;
  object-fit: cover;
  display: block;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}

.card-image:hover {
  transform: scale(1.02);
}

.file-type-badge {
  display: inline-block;
  font-size: 0.75rem;
  background: #667eea;
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 600;
}

.image-extra {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px dashed #eee;
  font-size: 0.85rem;
}

.extra-item {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.extra-label {
  color: #666;
  font-weight: 500;
  min-width: 50px;
}

.extra-value {
  color: #333;
  word-break: break-all;
}

.hash-value {
  font-family: monospace;
  font-size: 0.8rem;
  color: #555;
}

/* Modal & Form Styles */
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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.25rem 1.5rem;
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
  overflow-y: auto;
}

.modal-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
}

.required {
  color: #ef4444;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

.form-section {
  margin-top: 1.5rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.section-toggle {
  cursor: pointer;
  user-select: none;
  color: #666;
  margin: 0 0 1rem 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-toggle:hover {
  color: #333;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

.btn-submit {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  background: #e0e0e0;
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
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #888;
  font-size: 1.1rem;
  background: #f9f9f9;
  border-radius: 12px;
  grid-column: 1 / -1;
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

.image-preview {
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

/* 行內新增 / 行內編輯 */
.card-editing {
  border-left-color: #f59e0b;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.inline-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
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

.inline-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.inline-field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inline-field-row label {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
  min-width: 60px;
  flex-shrink: 0;
}

.btn-inline-upload {
  display: inline-block;
  padding: 0.3rem 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn-inline-upload.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-inline-remove {
  background: none;
  border: 1px solid #f87171;
  color: #f87171;
  border-radius: 4px;
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-inline-remove:hover {
  background: #fee2e2;
}

.inline-selected-files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.selected-file-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #eef6ff;
  color: #245b99;
  font-size: 0.78rem;
  line-height: 1.3;
  word-break: break-all;
}

.inline-img-preview-wrap {
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: #f8f9fa;
  margin-bottom: 0.25rem;
}

.inline-img-preview {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  display: block;
  border-radius: 6px;
}

.btn-icon.save:hover {
  background: #ecfdf5;
}
</style>

@media (max-width: 960px) {
  .images-container--hybrid {
    grid-template-columns: 1fr;
  }

  .images-container--hybrid .image-card--card,
  .images-container--hybrid .image-card--list {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .summary-right,
  .csv-actions,
  .action-buttons {
    width: 100%;
  }

  .view-switcher {
    width: 100%;
    justify-content: space-between;
  }

  .view-chip {
    flex: 1;
  }

  .image-card--list {
    grid-template-columns: 1fr;
  }

  .image-card--list .image-header,
  .image-card--list .image-name,
  .image-card--list .image-details,
  .image-card--list .image-extra,
  .image-card--list .card-image-wrapper {
    grid-column: 1;
    grid-row: auto;
  }
}
