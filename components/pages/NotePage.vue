<template>
  <PageContainer>
    <div class="note-page">
      <!-- 搜尋列 -->
      <div class="actions-bar">
        <div class="search-box">
          <span class="icon">🔍</span>
          <input v-model="searchQuery" type="text" placeholder="搜尋筆記標題或內容..." class="search-input">
        </div>
        <div class="action-buttons">
          <button v-if="articles.length > 0" @click="exportArticlesZip" class="btn-export" :disabled="zipExporting">
            <span class="icon">📦</span> {{ zipExporting ? '匯出中...' : '匯出 ZIP' }}
          </button>
          <button @click="$refs.zipFileInput.click()" class="btn-import" :disabled="zipImporting">
            <span class="icon">📦</span> {{ zipImporting ? '匯入中...' : '匯入 ZIP' }}
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

      <!-- 摘要列：批量選擇 + 新增 + 項目數 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button
            v-if="!batchMode && filteredArticles.length > 0"
            @click="enterBatchMode"
            class="btn-batch-mode"
          >
            批量選擇
          </button>
          <button @click="startAddRow" class="btn-add-icon" title="新增筆記">+</button>
          <template v-if="batchMode">
            <label class="select-all-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全選</span>
            </label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ articles.length }} 個項目</span>
          <span v-if="selectedIds.size > 0" class="selected-count">
            已選 {{ selectedIds.size }} 項
          </span>
        </div>
        <div class="summary-right">
          <div v-if="filteredArticles.length > 0 || showAddRow" class="view-switcher" role="tablist" aria-label="筆記版型切換">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              type="button"
              class="view-chip"
              :class="{ active: viewMode === option.value }"
              @click="viewMode = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <button
            v-if="selectedIds.size > 0"
            class="btn-batch-delete"
            @click="deleteSelected"
            :disabled="loading"
          >
            刪除選中 ({{ selectedIds.size }})
          </button>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-if="loading && articles.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>載入資料中...</p>
      </div>

      <!-- 空狀態 -->
      <div v-if="!loading && filteredArticles.length === 0 && !showAddRow" class="empty-state">
        <p>沒有找到相關筆記 🍃</p>
      </div>

      <!-- 筆記列表 -->
      <div
        class="notes-container"
        :class="[`notes-container--${viewMode}`]"
        v-if="filteredArticles.length > 0 || showAddRow"
      >

        <!-- 行內新增卡片 -->
        <div v-if="showAddRow" class="note-card note-card-editing add-card note-card--editor">
          <div class="inline-form">
            <div class="inline-row">
              <input v-model="addForm.title" type="text" class="inline-input" placeholder="標題 *" />
              <input v-model="addForm.newdate" type="date" class="inline-input inline-date" />
            </div>
            <textarea v-model="addForm.content" class="inline-textarea" rows="4" placeholder="內容..."></textarea>
            <div class="inline-section">
              <h4 @click="addSection.urls = !addSection.urls" class="section-toggle">
                🔗 連結 {{ addSection.urls ? '▼' : '▶' }}
              </h4>
              <div v-if="addSection.urls" class="section-content">
                <input v-model="addForm.url1" type="url" class="inline-input mb-2" placeholder="連結 1" />
                <input v-model="addForm.url2" type="url" class="inline-input mb-2" placeholder="連結 2" />
                <input v-model="addForm.url3" type="url" class="inline-input" placeholder="連結 3" />
              </div>
            </div>
            <div class="inline-section">
              <h4 @click="addSection.files = !addSection.files" class="section-toggle">
                📎 附件 (最多 3 個) {{ addSection.files ? '▼' : '▶' }}
              </h4>
              <div v-if="addSection.files" class="section-content">
                <div v-for="n in 3" :key="'add-file-' + n" class="attachment-upload-item" :class="{ 'mb-3': n < 3 }">
                  <label class="attachment-label">附件 {{ n }}</label>
                  <div v-if="addForm['file' + n]" class="attachment-preview">
                    <div class="attachment-preview-content">
                      <img v-if="isImageType(addForm['file' + n + 'type'])" :src="addForm['file' + n]" alt="預覽" class="attachment-thumb" />
                      <div v-else class="attachment-file-icon">📄</div>
                      <div class="attachment-info">
                        <span class="attachment-name">{{ addForm['file' + n + 'name'] || '已上傳' }}</span>
                        <span class="attachment-type-badge">{{ addForm['file' + n + 'type'] || 'FILE' }}</span>
                      </div>
                    </div>
                    <button type="button" class="btn-remove-attachment" @click="addForm['file' + n] = ''; addForm['file' + n + 'name'] = ''; addForm['file' + n + 'type'] = ''">✕</button>
                  </div>
                  <div v-else class="attachment-drop-zone" @click="triggerFileInput(n, 'add')" @dragover.prevent @drop.prevent="handleFileDrop($event, n, 'add')">
                    <span class="drop-icon">📎</span>
                    <span class="drop-text">點擊或拖曳上傳</span>
                  </div>
                  <input :ref="el => { if (el) addFileInputRefs[n] = el }" type="file" style="display:none" @change="handleFileUpload($event, n, 'add')" />
                  <div v-if="uploadingSlot === 'add-' + n" class="attachment-progress">
                    <div class="progress-bar"><div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div></div>
                    <span class="progress-text">上傳中...</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="inline-actions">
              <button @click="saveAddRow" class="btn-save-icon" title="新增">✓ 新增</button>
              <button @click="cancelAddRow" class="btn-cancel-icon" title="取消">✕ 取消</button>
            </div>
          </div>
        </div>

        <!-- 筆記卡片列表 -->
        <div
          v-for="article in filteredArticles"
          :key="article.id"
          class="note-card"
          :class="[
            {
              'note-selected': selectedIds.has(article.id),
              'note-card-editing': editingRowId === article.id
            },
            noteCardModeClass(article.id)
          ]"
        >

          <!-- 編輯模式 -->
          <template v-if="editingRowId === article.id">
            <div class="inline-form">
              <div class="inline-row">
                <input v-model="editForm.title" type="text" class="inline-input" placeholder="標題 *" />
                <input v-model="editForm.newdate" type="date" class="inline-input inline-date" />
              </div>
              <textarea v-model="editForm.content" class="inline-textarea" rows="4" placeholder="內容..."></textarea>
              <div class="inline-section">
                <h4 @click="editSection.urls = !editSection.urls" class="section-toggle">
                  🔗 連結 {{ editSection.urls ? '▼' : '▶' }}
                </h4>
                <div v-if="editSection.urls" class="section-content">
                  <input v-model="editForm.url1" type="url" class="inline-input mb-2" placeholder="連結 1" />
                  <input v-model="editForm.url2" type="url" class="inline-input mb-2" placeholder="連結 2" />
                  <input v-model="editForm.url3" type="url" class="inline-input" placeholder="連結 3" />
                </div>
              </div>
              <div class="inline-section">
                <h4 @click="editSection.files = !editSection.files" class="section-toggle">
                  📎 附件 (最多 3 個) {{ editSection.files ? '▼' : '▶' }}
                </h4>
                <div v-if="editSection.files" class="section-content">
                  <div v-for="n in 3" :key="'edit-file-' + n" class="attachment-upload-item" :class="{ 'mb-3': n < 3 }">
                    <label class="attachment-label">附件 {{ n }}</label>
                    <div v-if="editForm['file' + n]" class="attachment-preview">
                      <div class="attachment-preview-content">
                        <img v-if="isImageType(editForm['file' + n + 'type'])" :src="editForm['file' + n]" alt="預覽" class="attachment-thumb" />
                        <div v-else class="attachment-file-icon">📄</div>
                        <div class="attachment-info">
                          <span class="attachment-name">{{ editForm['file' + n + 'name'] || '已上傳' }}</span>
                          <span class="attachment-type-badge">{{ editForm['file' + n + 'type'] || 'FILE' }}</span>
                        </div>
                      </div>
                      <button type="button" class="btn-remove-attachment" @click="editForm['file' + n] = ''; editForm['file' + n + 'name'] = ''; editForm['file' + n + 'type'] = ''">✕</button>
                    </div>
                    <div v-else class="attachment-drop-zone" @click="triggerFileInput(n, 'edit')" @dragover.prevent @drop.prevent="handleFileDrop($event, n, 'edit')">
                      <span class="drop-icon">📎</span>
                      <span class="drop-text">點擊或拖曳上傳</span>
                    </div>
                    <input :ref="el => { if (el) editFileInputRefs[n] = el }" type="file" style="display:none" @change="handleFileUpload($event, n, 'edit')" />
                    <div v-if="uploadingSlot === 'edit-' + n" class="attachment-progress">
                      <div class="progress-bar"><div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div></div>
                      <span class="progress-text">上傳中...</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="inline-actions">
                <button @click="saveInlineEdit(article.id)" class="btn-save-icon" title="儲存">✓ 儲存</button>
                <button @click="cancelInlineEdit" class="btn-cancel-icon" title="取消">✕ 取消</button>
              </div>
            </div>
          </template>

          <!-- 顯示模式 -->
          <template v-else>
            <div class="note-header">
              <div class="note-meta">
                <label v-if="batchMode" class="card-checkbox" @click.stop>
                  <input type="checkbox" :checked="selectedIds.has(article.id)" @change="toggleSelect(article.id)" />
                </label>
                <span class="note-date">{{ formatDate(article.newdate) }}</span>
              </div>
              <div class="note-actions">
                <button class="btn-icon" @click="startInlineEdit(article)" title="編輯">✏️</button>
                <button class="btn-icon delete" @click="confirmDelete(article)" title="刪除">🗑️</button>
              </div>
            </div>

            <h3 class="note-title">{{ article.title || '無標題' }}</h3>

            <div class="note-content">
              <p>{{ article.content }}</p>
            </div>

            <!-- 連結與附件區 -->
            <div class="note-attachments" v-if="hasAttachments(article)">
              <div class="attachment-group" v-if="article.url1 || article.url2 || article.url3">
                <h4>🔗 相關連結</h4>
                <div class="links-list">
                  <a v-if="article.url1" :href="article.url1" target="_blank" class="link-item">{{ article.url1 }}</a>
                  <a v-if="article.url2" :href="article.url2" target="_blank" class="link-item">{{ article.url2 }}</a>
                  <a v-if="article.url3" :href="article.url3" target="_blank" class="link-item">{{ article.url3 }}</a>
                </div>
              </div>

              <div class="attachment-group" v-if="article.file1 || article.file2 || article.file3">
                <h4>📎 附件檔案</h4>
                <div class="files-list">
                  <template v-for="n in 3" :key="'file' + n">
                    <div v-if="article['file' + n]" class="file-item-card">
                      <img
                        v-if="isImageType(article['file' + n + 'type'])"
                        :src="article['file' + n]"
                        :alt="article['file' + n + 'name'] || '附件'"
                        class="file-preview-img"
                        @click="openPreview(article['file' + n])"
                      />
                      <div v-else class="file-icon-box">📄</div>
                      <div class="file-detail">
                        <span class="file-name">{{ article['file' + n + 'name'] || '附件 ' + n }}</span>
                        <span class="file-type">{{ article['file' + n + 'type'] || 'FILE' }}</span>
                      </div>
                      <a :href="article['file' + n]" target="_blank" class="btn-download" title="開啟/下載">⬇️</a>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 圖片預覽 Lightbox -->
      <div v-if="previewUrl" class="lightbox-overlay" @click="previewUrl = null">
        <div class="lightbox-content" @click.stop>
          <button class="lightbox-close" @click="previewUrl = null">✕</button>
          <img :src="previewUrl" alt="預覽" class="lightbox-img" />
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import { useArticles } from '../../composables/useArticles'
import { useStorage } from '../../composables/useStorage'

const {
  articles,
  loading,
  loadArticles,
  addArticle,
  updateArticle,
  deleteArticle,
  importArticles
} = useArticles()

const { uploading, uploadProgress, uploadFile } = useStorage()

// 空表單模板
const emptyForm = () => ({
  title: '', content: '', newdate: '',
  url1: '', url2: '', url3: '',
  file1: '', file1name: '', file1type: '',
  file2: '', file2name: '', file2type: '',
  file3: '', file3name: '', file3type: ''
})

// 狀態
const searchQuery = ref('')
const viewMode = ref('hybrid')
const uploadingSlot = ref(null)
const previewUrl = ref(null)
const batchMode = ref(false)
const selectedIds = ref(new Set())

const viewOptions = [
  { value: 'hybrid', label: '混合' },
  { value: 'card', label: '卡片' },
  { value: 'list', label: '列表' }
]

// 行內新增
const showAddRow = ref(false)
const addForm = reactive(emptyForm())
const addSection = reactive({ urls: false, files: false })
const addFileInputRefs = {}

// 行內編輯
const editingRowId = ref(null)
const editForm = reactive(emptyForm())
const editSection = reactive({ urls: false, files: false })
const editFileInputRefs = {}

// 初始化
onMounted(() => {
  loadArticles()
})

// 搜尋過濾
const filteredArticles = computed(() => {
  if (!searchQuery.value) return articles.value
  
  const query = searchQuery.value.toLowerCase()
  return articles.value.filter(article => 
    (article.title && article.title.toLowerCase().includes(query)) ||
    (article.content && article.content.toLowerCase().includes(query))
  )
})

const noteCardModeClass = (articleId) => {
  if (viewMode.value === 'card') return 'note-card--card'
  if (viewMode.value === 'list') return 'note-card--list'

  const index = filteredArticles.value.findIndex((article) => article.id === articleId)
  return index >= 0 && index < 2 ? 'note-card--card' : 'note-card--list'
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

// 檢查是否有附件
const hasAttachments = (article) => {
  return article.url1 || article.url2 || article.url3 ||
         article.file1 || article.file2 || article.file3
}

// 行內新增
const startAddRow = () => {
  Object.assign(addForm, emptyForm())
  addForm.newdate = new Date().toISOString().split('T')[0]
  addSection.urls = false
  addSection.files = false
  showAddRow.value = true
  editingRowId.value = null
}

const cancelAddRow = () => {
  showAddRow.value = false
}

const saveAddRow = async () => {
  if (!addForm.title && !addForm.content) {
    alert('請至少輸入標題或內容')
    return
  }
  const result = await addArticle({ ...addForm })
  if (result.success) {
    showAddRow.value = false
  } else {
    alert('新增失敗: ' + result.error)
  }
}

// 行內編輯
const startInlineEdit = (article) => {
  const data = { ...article }
  if (data.newdate) data.newdate = data.newdate.split('T')[0]
  Object.assign(editForm, data)
  editSection.urls = !!(article.url1 || article.url2 || article.url3)
  editSection.files = !!(article.file1 || article.file2 || article.file3)
  editingRowId.value = article.id
  showAddRow.value = false
}

const cancelInlineEdit = () => {
  editingRowId.value = null
}

const saveInlineEdit = async (id) => {
  if (!editForm.title && !editForm.content) {
    alert('請至少輸入標題或內容')
    return
  }
  const result = await updateArticle(id, { ...editForm })
  if (result.success) {
    editingRowId.value = null
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 確認刪除
const confirmDelete = async (article) => {
  if (confirm(`確定要刪除這則筆記嗎？\n標題: ${article.title || '(無標題)'}`)) {
    await deleteArticle(article.id)
    selectedIds.value.delete(article.id)
  }
}

// 批量選擇
const enterBatchMode = () => {
  batchMode.value = true
}

const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value = new Set()
}

const isAllSelected = computed(() => {
  return filteredArticles.value.length > 0 && filteredArticles.value.every(a => selectedIds.value.has(a.id))
})

const toggleSelect = (id) => {
  const s = new Set(selectedIds.value)
  if (s.has(id)) { s.delete(id) } else { s.add(id) }
  selectedIds.value = s
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredArticles.value.map(a => a.id))
  }
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return

  const isDeletingAll = count === articles.value.length

  if (isDeletingAll) {
    const input = prompt(`即將刪除全部 ${count} 筆筆記！\n\n請輸入 DELETE article 確認：`)
    if (input !== 'DELETE article') {
      alert('輸入不正確，已取消刪除')
      return
    }
  } else {
    if (!confirm(`確定要刪除選中的 ${count} 筆筆記嗎？`)) return
  }

  let successCount = 0
  const ids = [...selectedIds.value]
  for (const id of ids) {
    const result = await deleteArticle(id)
    if (result.success) successCount++
  }
  selectedIds.value = new Set()
  batchMode.value = false
  alert(`已刪除 ${successCount} 筆筆記`)
}

const zipFileInput = ref(null)
const zipExporting = ref(false)
const zipImporting = ref(false)

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

// ZIP 匯出（format: 'appwrite' | 'supabase'）
const exportArticlesZip = async () => {
  if (articles.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  const header = ['title', 'content', 'category', 'ref', 'newdate', 'url1', 'url2', 'url3', 'file1', 'file1name', 'file1type', 'file2', 'file2name', 'file2type', 'file3', 'file3name', 'file3type']

  zipExporting.value = true
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const filesFolder = zip.folder('files')
    const csvRows = []

    for (let rowIdx = 0; rowIdx < articles.value.length; rowIdx++) {
      const a = articles.value[rowIdx]
      const row = {
        title: a.title || '',
        content: a.content || '',
        category: a.category || '',
        ref: a.ref || '',
        newdate: a.newdate || '',
        url1: a.url1 || '',
        url2: a.url2 || '',
        url3: a.url3 || '',
        file1: a.file1 || '',
        file1name: a.file1name || '',
        file1type: a.file1type || '',
        file2: a.file2 || '',
        file2name: a.file2name || '',
        file2type: a.file2type || '',
        file3: a.file3 || '',
        file3name: a.file3name || '',
        file3type: a.file3type || ''
      }

      // 下載每個 file slot 的附件並存入 ZIP
      for (let slot = 1; slot <= 3; slot++) {
        const fileUrl = row['file' + slot]
        const fileName = row['file' + slot + 'name']
        if (!fileUrl) continue

        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 10000) // 10 秒逾時
          const response = await fetch(fileUrl, { signal: controller.signal })
          clearTimeout(timer)
          if (response.ok) {
            const blob = await response.blob()
            const zipFileName = `${rowIdx}_${slot}_${fileName || 'file'}`
            filesFolder.file(zipFileName, blob)
            row['file' + slot] = `files/${zipFileName}`
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.warn(`下載附件逾時 (row ${rowIdx}, slot ${slot}): ${fileUrl}`)
          } else {
            console.warn(`下載附件失敗 (row ${rowIdx}, slot ${slot}):`, err)
          }
        }
      }

      csvRows.push(row)
    }

    // 組裝 CSV
    const csvContent = [
      header,
      ...csvRows.map(row => header.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`))
    ].map(r => r.join(',')).join('\n')

    zip.file('supabase-article.csv', csvContent)

    // 下載 ZIP
    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = 'supabase-article.zip'
    link.click()
    URL.revokeObjectURL(url)

    alert(`匯出成功！共 ${csvRows.length} 筆筆記`)
  } catch (error) {
    console.error('ZIP 匯出失敗:', error)
    alert('匯出失敗：' + error.message)
  } finally {
    zipExporting.value = false
  }
}

// ZIP 匯入
const handleImportZip = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  zipImporting.value = true
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // 找到 CSV 檔案（優先找 appwrite-article.csv / supabase-article.csv，否則找任何 .csv）
    let csvFile = zip.file('appwrite-article.csv') || zip.file('supabase-article.csv')
    if (!csvFile) {
      const csvFiles = zip.file(/\.csv$/i)
      if (csvFiles.length > 0) {
        csvFile = csvFiles[0]
      }
    }
    if (!csvFile) {
      alert('ZIP 檔案中找不到 CSV 檔案')
      return
    }

    const rawCsvText = await csvFile.async('text')
    // 移除 BOM 字元
    const csvText = rawCsvText.replace(/^\uFEFF/, '')
    let rows = parseCsv(csvText)
    if (rows.length === 0) {
      alert('CSV 檔案無有效資料')
      return
    }

    // 欄位轉換（相容 Appwrite 與 Supabase 格式）
    const firstRow = rows[0]
    const hasAppwriteSystemFields = '$id' in firstRow || '$createdAt' in firstRow || '$collectionId' in firstRow
    const hasNewDateCamel = 'newDate' in firstRow

    if (hasAppwriteSystemFields || hasNewDateCamel) {
      console.log('偵測到 Appwrite/camelCase 格式 ZIP，自動轉換欄位')
      rows = rows.map(r => {
        const mapped = {}
        for (const [key, value] of Object.entries(r)) {
          if (key.startsWith('$')) {
            if (key === '$createdAt' && !r.newDate && !r.newdate) {
              mapped.newdate = value
            }
            continue
          }
          if (key === 'newDate') {
            mapped.newdate = value
          } else {
            mapped[key] = value
          }
        }
        return mapped
      })
    }

    // 統計附件數量
    let fileCount = 0
    for (const row of rows) {
      for (let s = 1; s <= 3; s++) {
        const fp = row['file' + s]
        if (fp && fp.startsWith('files/')) fileCount++
      }
    }

    let confirmMsg = `確定匯入 ${rows.length} 筆筆記資料？`
    if (fileCount > 0) {
      confirmMsg += `\n（含 ${fileCount} 個附件將自動上傳至 Supabase Storage）`
    }
    if (!confirm(confirmMsg)) return

    // MIME type 對照表
    const mimeTypes = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
      pdf: 'application/pdf', zip: 'application/zip', mp3: 'audio/mpeg', mp4: 'video/mp4',
      txt: 'text/plain', json: 'application/json', csv: 'text/csv'
    }
    const getMimeType = (name) => {
      const ext = (name || '').split('.').pop().toLowerCase()
      return mimeTypes[ext] || 'application/octet-stream'
    }

    // 列出 ZIP 中 files/ 目錄下的所有檔案（方便 debug & fallback 比對）
    const allZipFiles = []
    zip.forEach((path, entry) => {
      if (!entry.dir) allZipFiles.push(path)
    })
    console.log('ZIP 內所有檔案:', allZipFiles)

    // 遍歷每筆記錄，上傳附件
    let uploadedCount = 0
    let failedCount = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      for (let slot = 1; slot <= 3; slot++) {
        const filePath = row['file' + slot]
        if (!filePath) continue
        // 已是完整 URL（Supabase 或其他）直接保留
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) continue

        // 嘗試多種路徑找到 ZIP 中的檔案
        let zipEntry = zip.file(filePath)
        if (!zipEntry && !filePath.startsWith('files/')) {
          zipEntry = zip.file('files/' + filePath)
        }
        if (!zipEntry) {
          // 模糊比對：用檔名末段匹配
          const baseName = filePath.split('/').pop()
          const match = allZipFiles.find(p => p.endsWith('/' + baseName) || p === baseName)
          if (match) zipEntry = zip.file(match)
        }

        if (!zipEntry) {
          console.warn(`ZIP 中找不到檔案: ${filePath}`)
          row['file' + slot] = ''
          failedCount++
          continue
        }

        try {
          const arrayBuffer = await zipEntry.async('arraybuffer')
          const fileName = row['file' + slot + 'name'] || filePath.split('/').pop()
          const mimeType = getMimeType(fileName)
          const fileObj = new File([arrayBuffer], fileName, { type: mimeType })

          console.log(`上傳附件 row=${i} slot=${slot}: ${fileName} (${mimeType}, ${fileObj.size} bytes)`)
          const result = await uploadFile(fileObj, 'article')
          if (result.success) {
            row['file' + slot] = result.url
            uploadedCount++
          } else {
            console.warn(`上傳附件失敗 (row ${i}, slot ${slot}):`, result.error)
            row['file' + slot] = ''
            failedCount++
          }
        } catch (err) {
          console.warn(`處理附件失敗 (row ${i}, slot ${slot}):`, err)
          row['file' + slot] = ''
          failedCount++
        }
      }
    }
    if (fileCount > 0) {
      console.log(`附件上傳完成: 成功 ${uploadedCount}, 失敗 ${failedCount}`)
    }

    const result = await importArticles(rows)
    if (result.success) {
      let msg = `匯入成功！共 ${result.count} 筆資料`
      if (uploadedCount > 0) msg += `\n附件上傳: ${uploadedCount} 個成功`
      if (failedCount > 0) msg += `\n附件失敗: ${failedCount} 個`
      alert(msg)
    } else {
      alert('匯入失敗: ' + result.error)
    }
  } catch (error) {
    console.error('ZIP 匯入失敗:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    zipImporting.value = false
    e.target.value = ''
  }
}

// 判斷是否為圖片類型
const isImageType = (type) => {
  if (!type) return false
  const t = type.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(t)
}

// 取得檔案副檔名
const getFileExt = (filename) => {
  if (!filename) return ''
  return filename.split('.').pop().toLowerCase()
}

// 觸發檔案選擇（mode: 'add' | 'edit'）
const triggerFileInput = (slot, mode) => {
  if (mode === 'add') addFileInputRefs[slot]?.click()
  else editFileInputRefs[slot]?.click()
}

// 上傳檔案（mode: 'add' | 'edit'）
const handleFileUpload = async (e, slot, mode) => {
  const file = e.target.files?.[0]
  if (!file) return
  const form = mode === 'add' ? addForm : editForm
  uploadingSlot.value = mode + '-' + slot
  const result = await uploadFile(file, 'article')
  if (result.success) {
    form['file' + slot] = result.url
    form['file' + slot + 'name'] = file.name
    form['file' + slot + 'type'] = getFileExt(file.name)
  } else {
    alert('上傳失敗: ' + result.error)
  }
  uploadingSlot.value = null
  e.target.value = ''
}

// 拖曳上傳（mode: 'add' | 'edit'）
const handleFileDrop = async (e, slot, mode) => {
  const file = e.dataTransfer.files?.[0]
  if (!file) return
  const form = mode === 'add' ? addForm : editForm
  uploadingSlot.value = mode + '-' + slot
  const result = await uploadFile(file, 'article')
  if (result.success) {
    form['file' + slot] = result.url
    form['file' + slot + 'name'] = file.name
    form['file' + slot + 'type'] = getFileExt(file.name)
  } else {
    alert('上傳失敗: ' + result.error)
  }
  uploadingSlot.value = null
}

// 開啟大圖預覽
const openPreview = (url) => {
  previewUrl.value = url
}

// SEO
useHead({
  title: '鋒兄筆記 - 鋒兄AI Supabase',
  meta: [
    { name: 'description', content: '記錄生活點滴與重要資訊' }
  ]
})
</script>

<style scoped>
.note-page {
  animation: fadeIn 0.3s ease-in;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  border-radius: 12px;
  color: #333;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.page-description {
  font-size: 1.1rem;
  opacity: 0.8;
  margin-bottom: 0;
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
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}

.btn-batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.card-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin-right: 0.5rem;
}

.note-selected {
  border-color: color-mix(in oklab, var(--danger) 38%, var(--border-color)) !important;
  background: color-mix(in oklab, var(--danger-light) 28%, var(--bg-secondary));
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
  gap: 0.5rem;
  flex-wrap: wrap;
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
  border-color: #a8edea;
  box-shadow: 0 0 0 3px rgba(168, 237, 234, 0.3);
}

.notes-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
}

.notes-container--card {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.notes-container--list {
  grid-template-columns: 1fr;
}

.notes-container--hybrid {
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.note-card--editor {
  grid-column: 1 / -1;
}

.note-card {
  background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.note-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--border-strong);
}

.note-card--card {
  min-height: 340px;
}

.notes-container--hybrid .note-card--card:nth-of-type(2),
.notes-container--hybrid .note-card--card:nth-of-type(3) {
  grid-column: span 6;
}

.notes-container--hybrid .note-card--list {
  grid-column: 1 / -1;
}

.note-card--list {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem 1.25rem;
  align-items: start;
}

.note-card--list .note-header,
.note-card--list .note-title,
.note-card--list .note-content,
.note-card--list .note-attachments {
  grid-column: 1;
}

.note-card--list .note-actions {
  grid-column: 2;
}

.note-card--list .note-header {
  margin-bottom: 0;
  padding-bottom: 0.25rem;
  border-bottom: none;
}

.note-card--list .note-title {
  margin-bottom: 0.35rem;
  font-size: 1.05rem;
}

.note-card--list .note-content {
  max-height: 96px;
  margin-bottom: 0;
}

.note-card--list .note-attachments {
  margin-top: 0.4rem;
  padding-top: 0.8rem;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.note-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: color-mix(in oklab, var(--bg-tertiary) 88%, transparent);
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.note-actions {
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

.note-title {
  font-size: 1.28rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  line-height: 1.4;
}

.note-content {
  flex: 1;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 0.95rem;
  white-space: pre-wrap;
  margin-bottom: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.note-attachments {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-color);
  font-size: 0.9rem;
}

.attachment-group h4 {
  font-size: 0.9rem;
  color: #666;
  margin: 0.5rem 0;
}

.links-list, .files-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.link-item {
  color: #4a90e2;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.link-item:hover {
  text-decoration: underline;
}

/* 附件卡片（列表顯示） */
.file-item-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #f9f9f9;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.file-preview-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.file-preview-img:hover {
  transform: scale(1.1);
}

.file-icon-box {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: #e5e7eb;
  border-radius: 6px;
  flex-shrink: 0;
}

.file-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.file-type {
  font-size: 0.7rem;
  background: #ddd;
  color: #555;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  text-transform: uppercase;
  width: fit-content;
}

.file-name {
  color: #555;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-download {
  text-decoration: none;
  font-size: 1.1rem;
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.btn-download:hover {
  opacity: 1;
}

/* 行內編輯卡片 */
.note-card-editing {
  border-color: color-mix(in oklab, var(--warning) 40%, var(--border-color)) !important;
  background: color-mix(in oklab, var(--warning-light) 40%, var(--bg-secondary));
}

.add-card {
  border-color: color-mix(in oklab, var(--success) 40%, var(--border-color)) !important;
  background: color-mix(in oklab, var(--success-light) 35%, var(--bg-secondary));
}

.inline-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.inline-row {
  display: flex;
  gap: 0.75rem;
}

.inline-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.inline-input:focus {
  outline: none;
  border-color: #a8edea;
  box-shadow: 0 0 0 2px rgba(168, 237, 234, 0.3);
}

.inline-date {
  width: 160px;
  flex-shrink: 0;
}

.inline-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;
}

.inline-textarea:focus {
  outline: none;
  border-color: #a8edea;
  box-shadow: 0 0 0 2px rgba(168, 237, 234, 0.3);
}

.inline-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.5rem;
}

.inline-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-save-icon {
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save-icon:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
}

.btn-cancel-icon {
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-icon:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(149, 165, 166, 0.4);
}

/* 上傳區域 */
.attachment-upload-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  background: #fafafa;
}

.attachment-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 0.5rem;
}

.attachment-drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.attachment-drop-zone:hover {
  border-color: #a8edea;
  background: #f0faf9;
}

.drop-icon { font-size: 1.2rem; }
.drop-text { font-size: 0.9rem; color: #888; }

.attachment-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.attachment-preview-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.attachment-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.attachment-file-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: #e5e7eb;
  border-radius: 6px;
  flex-shrink: 0;
}

.attachment-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.attachment-name {
  font-size: 0.85rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-type-badge {
  font-size: 0.7rem;
  background: #a8edea;
  color: #444;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  text-transform: uppercase;
  width: fit-content;
}

.btn-remove-attachment {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-remove-attachment:hover {
  background: #dc2626;
}

.attachment-progress {
  margin-top: 0.5rem;
}

.progress-bar {
  height: 5px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #a8edea, #6ee7b7);
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  color: #10b981;
  margin-top: 0.2rem;
  display: block;
}

/* Lightbox 預覽 */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 2rem;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-close {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: white;
  color: #333;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  z-index: 1;
}

.lightbox-close:hover {
  background: #f0f0f0;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.section-toggle {
  cursor: pointer;
  user-select: none;
  color: #666;
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-toggle:hover {
  color: #333;
}

.section-content {
  margin-bottom: 0.5rem;
}

.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }

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

.loading-state {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #a8edea;
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

@media (max-width: 960px) {
  .notes-container--hybrid {
    grid-template-columns: 1fr;
  }

  .notes-container--hybrid .note-card--card,
  .notes-container--hybrid .note-card--list {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .summary-bar,
  .summary-left,
  .summary-right,
  .actions-bar {
    align-items: stretch;
  }

  .summary-right,
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

  .note-card--list {
    grid-template-columns: 1fr;
  }

  .note-card--list .note-actions {
    grid-column: 1;
    justify-self: end;
  }
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
</style>
