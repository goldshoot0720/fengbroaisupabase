<template>
  <PageContainer>
    <div class="podcast-page">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">鋒兄播客</h1>
      </div>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋播客名稱..."
            class="search-input"
          />
        </div>
        <div class="csv-actions">
          <button @click="exportToZIP" class="btn btn-export">
            匯出 ZIP
          </button>
          <label class="btn btn-import">
            匯入 ZIP
            <input
              type="file"
              accept=".zip"
              @change="handleImportZIP"
              style="display: none"
            />
          </label>
        </div>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredPodcasts.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openAddModal" class="btn-add-icon" title="新增">+</button>
          <template v-if="batchMode">
            <label class="select-all-label"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /><span>全選</span></label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ podcasts.length }} 個項目</span>
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
      <div v-else-if="filteredPodcasts.length === 0" class="empty-state">
        <p v-if="searchQuery">找不到符合的播客</p>
        <p v-else>尚無播客記錄，點擊「新增播客」開始建立</p>
      </div>

      <!-- Podcasts Grid -->
      <div v-else class="podcasts-grid">
        <div
          v-for="podcast in filteredPodcasts"
          :key="podcast.id"
          class="podcast-card"
          :class="{ 'selected': selectedIds.has(podcast.id) }"
        >
          <div class="card-header">
            <div class="card-header-left">
              <input
                v-if="batchMode"
                type="checkbox"
                :checked="selectedIds.has(podcast.id)"
                @change="toggleSelect(podcast.id)"
                class="card-checkbox"
              />
              <h3 v-if="inlineEditId !== podcast.id" class="card-title">{{ podcast.name || '未命名' }}</h3>
              <input v-else v-model="inlineForm.name" class="inline-input inline-title-input" placeholder="名稱" />
            </div>
            <div class="card-header-right">
              <span v-if="podcast.category && inlineEditId !== podcast.id" class="category-badge">
                {{ podcast.category }}
              </span>
              <button v-if="inlineEditId !== podcast.id" @click="startInlineEdit(podcast)" class="btn-icon" title="編輯">✎</button>
              <button v-if="inlineEditId !== podcast.id" @click="confirmDelete(podcast)" class="btn-icon btn-icon-delete" title="刪除">✕</button>
            </div>
          </div>

          <!-- 行內編輯模式 -->
          <div v-if="inlineEditId === podcast.id" class="inline-edit-form">
            <div class="inline-row">
              <label>分類</label>
              <input v-model="inlineForm.category" class="inline-input" placeholder="分類" />
            </div>
            <div class="inline-row">
              <label>備註</label>
              <textarea v-model="inlineForm.note" class="inline-textarea" rows="2" placeholder="備註"></textarea>
            </div>
            <div class="inline-row">
              <label>音檔 URL</label>
              <input v-model="inlineForm.file" class="inline-input" placeholder="音檔路徑" />
            </div>
            <div class="inline-row">
              <label>封面 URL</label>
              <input v-model="inlineForm.cover" class="inline-input" placeholder="封面 URL" />
            </div>
            <div class="inline-row">
              <label>參考</label>
              <input v-model="inlineForm.ref" class="inline-input" placeholder="參考連結" />
            </div>
            <div class="inline-actions">
              <button @click="saveInlineEdit" class="btn-inline-save">💾 儲存</button>
              <button @click="cancelInlineEdit" class="btn-inline-cancel">取消</button>
            </div>
          </div>

          <!-- 正常顯示模式 -->
          <div v-else class="card-body">
            <div v-if="podcast.cover" class="cover-preview">
              <img :src="podcast.cover" :alt="podcast.name" />
            </div>

            <div v-if="podcast.file" class="card-audio">
              <audio controls :src="podcast.file" class="audio-player" @play="pauseOthers($event)"></audio>
            </div>

            <div v-if="podcast.note" class="note-preview">
              {{ truncateText(podcast.note, 100) }}
            </div>

            <div v-if="podcast.ref" class="ref-link">
              <a :href="podcast.ref" target="_blank" rel="noopener noreferrer">
                參考連結
              </a>
            </div>
          </div>
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
            <span v-if="importProgress.stats.audioOk > 0" class="stat-tag stat-ok">🎧 {{ importProgress.stats.audioOk }}</span>
            <span v-if="importProgress.stats.coverOk > 0" class="stat-tag stat-ok">🖼️ {{ importProgress.stats.coverOk }}</span>
            <span v-if="importProgress.stats.fail > 0" class="stat-tag stat-fail">❌ {{ importProgress.stats.fail }}</span>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ isEditMode ? '編輯播客' : '新增播客' }}</h2>
            <button @click="closeModal" class="close-btn">&times;</button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="form-group">
                <label for="name">名稱 *</label>
                <input
                  id="name"
                  v-model="formData.name"
                  type="text"
                  required
                  class="form-input"
                  placeholder="輸入播客名稱"
                />
              </div>

              <div class="form-group">
                <label>上傳音檔</label>
                <div class="upload-area">
                  <input
                    ref="audioFileInput"
                    type="file"
                    accept="audio/*"
                    @change="handleAudioUpload"
                    style="display: none"
                  />
                  <button
                    type="button"
                    @click="$refs.audioFileInput.click()"
                    class="btn btn-upload"
                    :disabled="audioUploading"
                  >
                    {{ audioUploading ? '上傳中...' : '選擇音檔' }}
                  </button>
                </div>
                <div v-if="formData.file" class="audio-preview">
                  <audio :src="formData.file" controls class="preview-audio"></audio>
                  <button type="button" @click="removeAudio" class="btn-remove">移除</button>
                </div>
              </div>

              <div class="form-group">
                <label for="file">檔案路徑</label>
                <input
                  id="file"
                  v-model="formData.file"
                  type="text"
                  class="form-input"
                  placeholder="自動上傳或手動輸入 URL"
                />
              </div>

              <div class="form-group">
                <label for="filetype">檔案格式</label>
                <input
                  id="filetype"
                  v-model="formData.filetype"
                  type="text"
                  class="form-input"
                  placeholder="例如: mp3, m4a, wav"
                />
              </div>

              <div class="form-group">
                <label for="category">分類</label>
                <input
                  id="category"
                  v-model="formData.category"
                  type="text"
                  class="form-input"
                  placeholder="輸入分類"
                />
              </div>

              <div class="form-group">
                <label>封面上傳</label>
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
                  id="cover"
                  v-model="formData.cover"
                  type="text"
                  class="form-input"
                  placeholder="或輸入封面 URL"
                />
              </div>

              <div class="form-group">
                <label for="note">備註</label>
                <textarea
                  id="note"
                  v-model="formData.note"
                  class="form-textarea"
                  rows="4"
                  placeholder="輸入備註內容"
                ></textarea>
              </div>

              <div class="form-group">
                <label for="ref">參考連結</label>
                <input
                  id="ref"
                  v-model="formData.ref"
                  type="url"
                  class="form-input"
                  placeholder="輸入參考連結 URL"
                />
              </div>

              <div class="form-group">
                <label for="hash">Hash</label>
                <input
                  id="hash"
                  v-model="formData.hash"
                  type="text"
                  class="form-input"
                  placeholder="輸入檔案 Hash 值"
                />
              </div>

              <div class="modal-actions">
                <button type="button" @click="closeModal" class="btn btn-cancel">
                  取消
                </button>
                <button type="submit" class="btn btn-primary">
                  {{ isEditMode ? '更新' : '新增' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { usePodcasts } from '../../composables/usePodcasts'
import { useStorage } from '../../composables/useStorage'

// Set page title
useHead({
  title: '鋒兄播客 - 鋒兄AI Appwrite'
})

// Composable
const { podcasts, loading, FIELDS, loadPodcasts, addPodcast, updatePodcast, deletePodcast, importPodcasts } = usePodcasts()

// State
const searchQuery = ref('')
const showModal = ref(false)
const isEditMode = ref(false)
const currentPodcast = ref(null)

// Batch mode state
const batchMode = ref(false)
const selectedIds = ref(new Set())

// Upload state
const audioFileInput = ref(null)
const coverFileInput = ref(null)
const { uploadFile } = useStorage()
const audioUploading = ref(false)
const coverUploading = ref(false)
const formData = ref({
  name: '',
  file: '',
  filetype: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  cover: ''
})

// Inline editing state
const inlineEditId = ref(null)
const inlineForm = ref({})

const startInlineEdit = (podcast) => {
  inlineEditId.value = podcast.id
  inlineForm.value = {
    name: podcast.name || '',
    file: podcast.file || '',
    filetype: podcast.filetype || '',
    note: podcast.note || '',
    ref: podcast.ref || '',
    category: podcast.category || '',
    hash: podcast.hash || '',
    cover: podcast.cover || ''
  }
}

const saveInlineEdit = async () => {
  if (!inlineEditId.value) return
  try {
    await updatePodcast(inlineEditId.value, inlineForm.value)
    inlineEditId.value = null
    inlineForm.value = {}
  } catch (error) {
    console.error('Inline edit error:', error)
    alert('儲存失敗: ' + error.message)
  }
}

const cancelInlineEdit = () => {
  inlineEditId.value = null
  inlineForm.value = {}
}

// 播放時暫停其他音訊
const pauseOthers = (event) => {
  document.querySelectorAll('.audio-player').forEach(audio => {
    if (audio !== event.target) audio.pause()
  })
}

// Computed
const filteredPodcasts = computed(() => {
  if (!searchQuery.value) return podcasts.value
  const query = searchQuery.value.toLowerCase()
  return podcasts.value.filter(podcast =>
    podcast.name?.toLowerCase().includes(query)
  )
})

const isAllSelected = computed(() => {
  return filteredPodcasts.value.length > 0 &&
         filteredPodcasts.value.every(p => selectedIds.value.has(p.id))
})

// Batch mode methods
const enterBatchMode = () => {
  batchMode.value = true
  selectedIds.value = new Set()
}

const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value = new Set()
}

const toggleSelect = (id) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredPodcasts.value.map(p => p.id))
  }
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  const confirmed = prompt(`確定要刪除 ${count} 個播客嗎？請輸入「DELETE podcast」確認：`)
  if (confirmed !== 'DELETE podcast') {
    if (confirmed !== null) {
      alert('輸入不正確，已取消刪除')
    }
    return
  }

  try {
    const deletePromises = Array.from(selectedIds.value).map(id => deletePodcast(id))
    await Promise.all(deletePromises)
    alert(`成功刪除 ${count} 個播客`)
    exitBatchMode()
  } catch (error) {
    console.error('Error deleting podcasts:', error)
    alert('刪除失敗，請稍後再試')
  }
}

// Methods
const openAddModal = () => {
  isEditMode.value = false
  currentPodcast.value = null
  formData.value = {
    name: '',
    file: '',
    filetype: '',
    note: '',
    ref: '',
    category: '',
    hash: '',
    cover: ''
  }
  showModal.value = true
}

const openEditModal = (podcast) => {
  isEditMode.value = true
  currentPodcast.value = podcast
  formData.value = {
    name: podcast.name || '',
    file: podcast.file || '',
    filetype: podcast.filetype || '',
    note: podcast.note || '',
    ref: podcast.ref || '',
    category: podcast.category || '',
    hash: podcast.hash || '',
    cover: podcast.cover || ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditMode.value = false
  currentPodcast.value = null
  formData.value = {
    name: '',
    file: '',
    filetype: '',
    note: '',
    ref: '',
    category: '',
    hash: '',
    cover: ''
  }
}

// Audio upload handler
const handleAudioUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  audioUploading.value = true
  try {
    const result = await uploadFile(file, 'podcast')
    if (result.success) {
      formData.value.file = result.url
      const ext = file.name.split('.').pop()
      if (ext) formData.value.filetype = ext
      // 如果名稱為空，使用檔案名稱（不含副檔名）作為預設名稱
      if (!formData.value.name) {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        formData.value.name = fileNameWithoutExt
      }
      alert('音檔上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('上傳失敗: ' + error.message)
  } finally {
    audioUploading.value = false
  }
}

// Remove audio
const removeAudio = () => {
  formData.value.file = ''
  formData.value.filetype = ''
  if (audioFileInput.value) {
    audioFileInput.value.value = ''
  }
}

// Cover upload handler
const handleCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  try {
    const result = await uploadFile(file, 'podcast-covers')
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

const handleSubmit = async () => {
  try {
    if (isEditMode.value && currentPodcast.value) {
      await updatePodcast(currentPodcast.value.id, formData.value)
    } else {
      await addPodcast(formData.value)
    }
    closeModal()
  } catch (error) {
    console.error('Error saving podcast:', error)
    alert('儲存失敗，請稍後再試')
  }
}

const confirmDelete = async (podcast) => {
  if (confirm(`確定要刪除播客「${podcast.name}」嗎？`)) {
    try {
      await deletePodcast(podcast.id)
    } catch (error) {
      console.error('Error deleting podcast:', error)
      alert('刪除失敗，請稍後再試')
    }
  }
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const getFileName = (filePath) => {
  if (!filePath) return ''
  return filePath.split('/').pop()
}

// ZIP Export
const exportToZIP = async () => {
  if (podcasts.value.length === 0) {
    alert('沒有資料可匯出')
    return
  }

  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default

    const zip = new JSZip()

    // Create JSON data
    const jsonData = JSON.stringify(podcasts.value, null, 2)
    zip.file('podcasts.json', jsonData)

    // Generate ZIP file
    const blob = await zip.generateAsync({ type: 'blob' })

    // Download
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'supabase-podcast.zip')
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
const parsePodcastCsv = (text) => {
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

// ZIP Import — 相容 supabase (podcasts.json) 及 appwrite (podcast.csv + podcast/ + covers/)
const handleImportZIP = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    updateImportProgress({ active: true, title: '📦 正在解壓 ZIP...', step: '讀取檔案中', current: 0, total: 1, stats: null, itemName: file.name })

    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    const csvFile = zip.file('podcast.csv')
    const jsonFile = zip.file('podcasts.json')

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：podcast.csv + podcast/ + covers/ =====
      updateImportProgress({ step: '解析 CSV...', itemName: 'podcast.csv' })
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parsePodcastCsv(cleanText)

      if (parsed.length === 0) {
        resetImportProgress()
        alert('CSV 檔案無有效資料')
        return
      }

      resetImportProgress()
      const confirmMsg = `ℹ️ 偵測到 Appwrite podcast.zip 格式\n\n共 ${parsed.length} 筆播客\n系統將自動上傳音檔、封面至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      updateImportProgress({
        active: true, title: '🎧 匯入播客中...', step: '準備上傳',
        current: 0, total: parsed.length,
        stats: { audioOk: 0, coverOk: 0, fail: 0 }, itemName: ''
      })

      const { uploadFile: uploadToStorage } = useStorage()
      const stats = { audioOk: 0, coverOk: 0, fail: 0 }

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        const itemLabel = mapped.name || `第 ${i + 1} 筆`
        updateImportProgress({ current: i + 1, itemName: itemLabel })

        // 上傳音檔 (podcast/ 資料夾)
        const filePath = mapped.file
        if (filePath && filePath.startsWith('podcast/')) {
          updateImportProgress({ step: `🎧 上傳音檔 ${i + 1}/${parsed.length}` })
          const zipEntry = zip.file(filePath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = filePath.split('/').pop() || `podcast_${i}.mp3`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'mp3'
              const mimeMap = { mp3: 'audio/mpeg', flac: 'audio/flac', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', wma: 'audio/x-ms-wma' }
              const fileObj = new window.File([blob], fileName, { type: mimeMap[ext] || `audio/${ext}` })
              const uploadResult = await uploadToStorage(fileObj, 'podcast')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                if (!mapped.filetype) mapped.filetype = ext
                stats.audioOk++
              } else {
                console.warn(`上傳音檔失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳音檔失敗 (${mapped.name}):`, err)
              mapped.file = ''
              stats.fail++
            }
          } else {
            mapped.file = ''
          }
        }

        // 上傳封面 (covers/ 資料夾)
        const coverPath = mapped.cover
        if (coverPath && coverPath.startsWith('covers/')) {
          updateImportProgress({ step: `🖼️ 上傳封面 ${i + 1}/${parsed.length}` })
          const zipEntry = zip.file(coverPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = coverPath.split('/').pop() || `cover_${i}.jpg`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
              const fileObj = new window.File([blob], fileName, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
              const uploadResult = await uploadToStorage(fileObj, 'podcast-covers')
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
      // ===== Supabase 格式：podcasts.json =====
      updateImportProgress({ step: '解析 JSON...', itemName: 'podcasts.json' })
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
      if (!confirm(`確定要匯入 ${records.length} 筆播客記錄嗎？`)) return

      updateImportProgress({ active: true, title: '📥 匯入中...', step: '寫入資料庫', current: 0, total: records.length })

    } else {
      resetImportProgress()
      alert('ZIP 檔案中找不到 podcast.csv 或 podcasts.json')
      return
    }

    // 匯入記錄到資料庫
    if (records.length > 0) {
      updateImportProgress({ step: '💾 寫入資料庫...', current: importProgress.value.total, percent: 99 })
      const result = await importPodcasts(records)
      resetImportProgress()
      if (result.success) {
        await loadPodcasts()
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

// Load data on mount
onMounted(() => {
  loadPodcasts()
})
</script>

<style scoped>
.podcast-page {
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

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-box {
  flex: 1;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #11998e;
  box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.1);
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
}

.btn-export {
  background: #f3f4f6;
  color: #374151;
}

.btn-export:hover {
  background: #e5e7eb;
}

.btn-import {
  background: #f3f4f6;
  color: #374151;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-import:hover {
  background: #e5e7eb;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f4f6;
  border-top-color: #11998e;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.podcasts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.podcast-card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.2s;
}

.podcast-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  padding: 1.25rem;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.card-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.podcast-card.selected {
  outline: 3px solid #3498db;
  outline-offset: 2px;
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  font-size: 0.85rem;
}

.card-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.2rem;
  transition: all 0.2s;
  line-height: 1;
}

.btn-icon:hover {
  color: white;
  transform: scale(1.2);
}

.btn-icon-delete:hover {
  color: #fca5a5;
}

/* Audio player */
.card-audio {
  margin-bottom: 0.75rem;
}

.audio-player {
  width: 100%;
  height: 40px;
  border-radius: 8px;
}

/* Inline editing */
.inline-edit-form {
  padding: 1rem 1.25rem;
}

.inline-row {
  margin-bottom: 0.6rem;
}

.inline-row label {
  display: block;
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.15rem;
  font-weight: 500;
}

.inline-input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.inline-input:focus {
  outline: none;
  border-color: #11998e;
  box-shadow: 0 0 0 2px rgba(17, 153, 142, 0.1);
}

.inline-title-input {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.inline-title-input:focus {
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.inline-title-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.inline-textarea {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.inline-textarea:focus {
  outline: none;
  border-color: #11998e;
  box-shadow: 0 0 0 2px rgba(17, 153, 142, 0.1);
}

.inline-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-inline-save {
  padding: 0.4rem 1rem;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-inline-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
}

.btn-inline-cancel {
  padding: 0.4rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-inline-cancel:hover {
  background: #e5e7eb;
}

.card-body {
  padding: 1.25rem;
}

.cover-preview {
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  overflow: hidden;
}

.cover-preview img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.note-preview {
  color: #6b7280;
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.info-item .label {
  color: #6b7280;
  font-weight: 500;
}

.info-item .value {
  color: #374151;
  word-break: break-all;
}

.info-item .hash {
  font-family: monospace;
  font-size: 0.85rem;
}

.ref-link {
  margin-top: 0.5rem;
}

.ref-link a {
  color: #11998e;
  text-decoration: none;
  font-size: 0.9rem;
}

.ref-link a:hover {
  text-decoration: underline;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.btn-edit {
  flex: 1;
  background: #f3f4f6;
  color: #374151;
}

.btn-edit:hover {
  background: #e5e7eb;
}

.btn-delete {
  flex: 1;
  background: #fee2e2;
  color: #dc2626;
}

.btn-delete:hover {
  background: #fecaca;
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
  animation: fadeIn 0.2s ease-in;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.close-btn:hover {
  opacity: 0.8;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
  font-size: 0.95rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #11998e;
  box-shadow: 0 0 0 3px rgba(17, 153, 142, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

/* Responsive */
@media (max-width: 768px) {
  .podcasts-grid {
    grid-template-columns: 1fr;
  }

  .actions-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .csv-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
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
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.audio-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.75rem 0;
  padding: 0.75rem;
  background: #f1f5f9;
  border-radius: 8px;
}

.preview-audio {
  max-width: 250px;
  height: 40px;
}

.cover-upload-preview {
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

/* Summary Bar Styles */
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
  border: 4px solid #e5e7eb; border-top-color: #38ef7d;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
.import-title { font-size: 1.3rem; font-weight: 700; color: #1f2937; margin: 0 0 0.5rem; }
.import-step { font-size: 0.95rem; color: #6b7280; margin: 0 0 1.25rem; }
.import-progress-bar {
  width: 100%; height: 10px; background: #e5e7eb;
  border-radius: 99px; overflow: hidden; margin-bottom: 0.75rem;
}
.import-progress-fill {
  height: 100%; background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
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
