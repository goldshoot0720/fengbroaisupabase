<template>
  <PageContainer>
    <div class="music-db-page">
      <div class="page-header">
        <h1 class="page-title">鋒兄音樂</h1>
      </div>

      <div class="actions-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋音樂名稱..."
          class="search-input"
        />
        <div class="csv-actions">
          <button @click="exportToZIP" class="btn-export">匯出 ZIP</button>
          <label class="btn-import">
            匯入 ZIP
            <input
              type="file"
              accept=".zip"
              @change="handleFileImport"
              style="display: none"
            />
          </label>
        </div>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredMusics.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增">+</button>
          <template v-if="batchMode">
            <label class="select-all-label"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /><span>全選</span></label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ musics.length }} 首 ({{ groupedMusics.length }} 組)</span>
          <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>
        </div>
        <div class="summary-right">
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除選中 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <!-- 快取狀態列 -->
      <div class="cache-bar">
        <div class="cache-info">
          <span class="cache-icon">💾</span>
          <span>已快取 <strong>{{ cachedCount }}</strong> / {{ musicsWithFile.length }} 首音樂</span>
          <span v-if="totalCacheSize > 0" class="cache-size">({{ (totalCacheSize / 1024 / 1024).toFixed(1) }} MB)</span>
        </div>
        <div class="cache-actions">
          <button
            v-if="cachedCount < musicsWithFile.length"
            @click="cacheAllMusics"
            class="btn-cache-all"
            :disabled="cachingMusicId !== null"
          >
            {{ cachingMusicId !== null ? '⏳ 快取中...' : '📥 全部快取' }}
          </button>
          <button
            v-if="cachedCount > 0"
            @click="clearAllMusicCache"
            class="btn-clear-cache"
          >
            🗑️ 清除快取
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-state">載入中...</div>

      <div v-else-if="filteredMusics.length === 0 && !isAddingInline" class="empty-state">
        <p v-if="searchQuery">找不到符合的音樂記錄</p>
        <p v-else>尚無音樂記錄，點擊「新增」開始建立</p>
      </div>

      <div v-if="isAddingInline || filteredMusics.length > 0" class="music-grid">

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="music-card card-editing">
          <div class="card-header">
            <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="歌曲名稱 *" style="flex:1" />
            <div class="card-actions">
              <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
              <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
            </div>
          </div>
          <div class="card-body inline-edit-content">
            <div class="inline-edit-form">
              <div class="inline-field-row"><label>語言</label><input v-model="addForm.language" type="text" class="inline-input" placeholder="中文/英語/日語..." /></div>
              <div class="inline-field-row"><label>分類</label><input v-model="addForm.category" type="text" class="inline-input" placeholder="分類" /></div>
              <!-- 音檔上傳 -->
              <div class="inline-field-row">
                <label>上傳音檔</label>
                <div style="flex:1">
                  <div class="inline-upload-row">
                    <input ref="addAudioInput" type="file" accept="audio/*" style="display:none" @change="handleAddAudioUpload" />
                    <button type="button" class="btn-inline-upload-music" :class="{ disabled: addAudioUploading }" @click="$refs.addAudioInput.click()">
                      {{ addAudioUploading ? '上傳中...' : '🎵 選擇音檔' }}
                    </button>
                    <button v-if="addForm.file" type="button" class="btn-inline-remove-sm" @click="addForm.file = ''">✕</button>
                  </div>
                  <input v-model="addForm.file" type="text" class="inline-input" placeholder="或輸入音檔 URL" style="margin-top:0.3rem" />
                  <audio v-if="addForm.file" controls :src="addForm.file" class="inline-audio-preview"></audio>
                </div>
              </div>
              <div class="inline-field-row"><label>格式</label><input v-model="addForm.filetype" type="text" class="inline-input" placeholder="mp3, flac, wav..." /></div>
              <!-- 封面上傳 -->
              <div class="inline-field-row">
                <label>封面</label>
                <div style="flex:1">
                  <div class="inline-upload-row">
                    <input ref="addCoverInput" type="file" accept="image/*" style="display:none" @change="handleAddCoverUpload" />
                    <button type="button" class="btn-inline-upload-music" :class="{ disabled: addCoverUploading }" @click="$refs.addCoverInput.click()">
                      {{ addCoverUploading ? '上傳中...' : '🖼️ 選擇封面' }}
                    </button>
                    <button v-if="addForm.cover" type="button" class="btn-inline-remove-sm" @click="addForm.cover = ''">✕</button>
                  </div>
                  <input v-model="addForm.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" style="margin-top:0.3rem" />
                  <img v-if="addForm.cover" :src="addForm.cover" alt="封面" class="inline-cover-preview" />
                </div>
              </div>
              <div class="inline-field-row"><label>備註</label><input v-model="addForm.note" type="text" class="inline-input" placeholder="備註" /></div>
              <div class="inline-field-row"><label>歌詞</label><textarea v-model="addForm.lyrics" class="inline-input inline-textarea" rows="3" placeholder="歌詞"></textarea></div>
            </div>
          </div>
        </div>
        <div
          v-for="group in groupedMusics"
          :key="group.name"
          class="music-card"
          :class="{ 'card-selected': group.items.some(m => selectedIds.has(m.id)), 'card-editing': editingId === getActiveItem(group).id }"
        >
          <!-- 行內編輯模式 -->
          <template v-if="editingId === getActiveItem(group).id">
            <div class="card-header">
              <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="歌曲名稱">
              <div class="card-actions">
                <button class="btn-icon save" @click="saveInlineEdit" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
              </div>
            </div>
            <div class="card-body inline-edit-content">
              <div class="inline-edit-form">
                <div class="inline-field-row">
                  <label>語言</label>
                  <input v-model="editForm.language" type="text" class="inline-input" placeholder="中文/英語/日語...">
                </div>
                <div class="inline-field-row">
                  <label>分類</label>
                  <input v-model="editForm.category" type="text" class="inline-input" placeholder="分類">
                </div>
                <!-- 音檔上傳 -->
                <div class="inline-field-row">
                  <label>音檔</label>
                  <div style="flex:1">
                    <div class="inline-upload-row">
                      <input ref="editAudioInput" type="file" accept="audio/*" style="display:none" @change="handleEditAudioUpload" />
                      <button type="button" class="btn-inline-upload-music" :class="{ disabled: editAudioUploading }" @click="$refs.editAudioInput.click()">
                        {{ editAudioUploading ? '上傳中...' : '🎵 上傳音檔' }}
                      </button>
                      <button v-if="editForm.file" type="button" class="btn-inline-remove-sm" @click="editForm.file = ''">✕</button>
                    </div>
                    <input v-model="editForm.file" type="text" class="inline-input" placeholder="或輸入音檔 URL" style="margin-top:0.3rem" />
                    <audio v-if="editForm.file" controls :src="editForm.file" class="inline-audio-preview"></audio>
                  </div>
                </div>
                <div class="inline-field-row">
                  <label>格式</label>
                  <input v-model="editForm.filetype" type="text" class="inline-input" placeholder="mp3, flac...">
                </div>
                <!-- 封面上傳 -->
                <div class="inline-field-row">
                  <label>封面</label>
                  <div style="flex:1">
                    <div class="inline-upload-row">
                      <input ref="editCoverInput" type="file" accept="image/*" style="display:none" @change="handleEditCoverUpload" />
                      <button type="button" class="btn-inline-upload-music" :class="{ disabled: editCoverUploading }" @click="$refs.editCoverInput.click()">
                        {{ editCoverUploading ? '上傳中...' : '🖼️ 上傳封面' }}
                      </button>
                      <button v-if="editForm.cover" type="button" class="btn-inline-remove-sm" @click="editForm.cover = ''">✕</button>
                    </div>
                    <input v-model="editForm.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" style="margin-top:0.3rem">
                    <img v-if="editForm.cover" :src="editForm.cover" alt="封面" class="inline-cover-preview" />
                  </div>
                </div>
                <div class="inline-field-row">
                  <label>備註</label>
                  <input v-model="editForm.note" type="text" class="inline-input" placeholder="備註">
                </div>
                <div class="inline-field-row">
                  <label>參考</label>
                  <input v-model="editForm.ref" type="text" class="inline-input" placeholder="參考">
                </div>
                <div class="inline-field-row">
                  <label>歌詞</label>
                  <textarea v-model="editForm.lyrics" class="inline-input inline-textarea" rows="3" placeholder="歌詞"></textarea>
                </div>
                <div class="inline-field-row">
                  <label>Hash</label>
                  <input v-model="editForm.hash" type="text" class="inline-input" placeholder="Hash">
                </div>
              </div>
            </div>
          </template>

          <!-- 顯示模式 -->
          <template v-else>
          <div class="card-header">
            <input
              v-if="batchMode"
              type="checkbox"
              :checked="group.items.every(m => selectedIds.has(m.id))"
              @change="toggleGroupSelect(group)"
              class="card-checkbox"
            />
            <h3 class="card-title">{{ group.name || '未命名' }}</h3>
            <div class="card-actions">
              <button @click="startInlineEdit(getActiveItem(group))" class="btn-edit" title="編輯">
                ✎
              </button>
              <button @click="deleteRecord(getActiveItem(group).id)" class="btn-delete" title="刪除">
                ✕
              </button>
            </div>
          </div>
          <div class="card-body">
            <!-- 語言切換 chips -->
            <div v-if="group.items.length > 1" class="lang-chips">
              <button
                v-for="(item, idx) in group.items"
                :key="item.id"
                class="lang-chip"
                :class="{ active: getActiveIndex(group) === idx }"
                @click="setActiveVersion(group.name, idx)"
              >
                {{ item.language || '未知語言' }}
              </button>
            </div>
            <!-- 單一語言時顯示 badge -->
            <div v-else class="badges">
              <span v-if="getActiveItem(group).category" class="badge badge-category">{{ getActiveItem(group).category }}</span>
              <span v-if="getActiveItem(group).language" class="badge badge-language">{{ getActiveItem(group).language }}</span>
            </div>
            <!-- 分類 badge (多語言也顯示) -->
            <div v-if="group.items.length > 1 && getActiveItem(group).category" class="badges" style="margin-top: 0.25rem">
              <span class="badge badge-category">{{ getActiveItem(group).category }}</span>
            </div>
            <div v-if="getActiveItem(group).file || getActiveItem(group).cover" class="card-media">
              <div v-if="getActiveItem(group).cover" class="card-cover">
                <img :src="getActiveItem(group).cover" :alt="group.name || '封面'" class="card-cover-image" />
              </div>
              <div v-if="getActiveItem(group).file" class="card-audio">
                <audio controls :src="getAudioSrc(getActiveItem(group))" class="audio-player" @play="pauseOthers($event)"></audio>
              </div>
            </div>
            <div v-if="getActiveItem(group).lyrics" class="card-field">
              <strong>歌詞:</strong>
              <pre class="lyrics-text">{{ getActiveItem(group).lyrics }}</pre>
            </div>
            <p v-if="getActiveItem(group).note" class="card-field">
              <strong>備註:</strong> {{ truncate(getActiveItem(group).note, 80) }}
            </p>
            <p v-if="getActiveItem(group).ref" class="card-field">
              <strong>參考:</strong> {{ getActiveItem(group).ref }}
            </p>

            <!-- 多版本提示 -->
            <p v-if="group.items.length > 1" class="version-hint">
              共 {{ group.items.length }} 個語言版本
            </p>
          </div>
          <!-- 快取按鈕 -->
          <div v-if="getActiveItem(group).file && !batchMode" class="card-cache-actions">
            <button v-if="musicCache.has(getActiveItem(group).id)" @click="uncacheMusic(getActiveItem(group).id)" class="btn-cached" title="已快取 (點擊清除)">✅</button>
            <button v-else @click="cacheMusicItem(getActiveItem(group))" class="btn-cache" :disabled="cachingMusicId === getActiveItem(group).id" :title="cachingMusicId === getActiveItem(group).id ? '快取中...' : '快取音樂'">
              {{ cachingMusicId === getActiveItem(group).id ? '⏳' : '📥' }}
            </button>
          </div>
          </template>
        </div>
      </div>

      <!-- 匯入進度 Overlay -->
      <div v-if="importProgress.active" class="import-overlay">
        <div class="import-modal">
          <div class="import-spinner"></div>
          <h3 class="import-title">{{ importProgress.title }}</h3>
          <p class="import-step">{{ importProgress.step }}</p>
          <div class="import-progress-bar">
            <div class="import-progress-fill" :style="{ width: importProgress.percent + '%' }"></div>
          </div>
          <p class="import-percent">{{ importProgress.current }} / {{ importProgress.total }}（{{ importProgress.percent }}%）</p>
          <p v-if="importProgress.itemName" class="import-item-name">{{ importProgress.itemName }}</p>
          <div v-if="importProgress.stats" class="import-stats">
            <span v-if="importProgress.stats.musicOk > 0" class="stat-tag stat-ok">🎵 {{ importProgress.stats.musicOk }}</span>
            <span v-if="importProgress.stats.lyricsOk > 0" class="stat-tag stat-ok">📝 {{ importProgress.stats.lyricsOk }}</span>
            <span v-if="importProgress.stats.coverOk > 0" class="stat-tag stat-ok">🖼️ {{ importProgress.stats.coverOk }}</span>
            <span v-if="importProgress.stats.fail > 0" class="stat-tag stat-fail">❌ {{ importProgress.stats.fail }}</span>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ editingMusic ? '編輯音樂' : '新增音樂' }}</h2>
            <button @click="closeModal" class="btn-close">✕</button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveMusic">
              <div class="form-group">
                <label>名稱</label>
                <input v-model="formData.name" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>上傳音樂檔案</label>
                <div class="upload-area">
                  <input
                    ref="audioFileInput"
                    type="file"
                    accept="audio/*"
                    @change="handleAudioUpload"
                    style="display: none"
                  />
                  <button type="button" @click="$refs.audioFileInput.click()" class="btn-upload" :disabled="uploading">
                    {{ uploading ? '上傳中...' : '選擇檔案' }}
                  </button>
                  <span v-if="uploadProgress > 0" class="upload-progress">{{ uploadProgress }}%</span>
                </div>
                <div v-if="formData.file" class="file-preview">
                  <audio controls :src="formData.file" class="audio-preview"></audio>
                  <button type="button" @click="removeAudio" class="btn-remove">移除</button>
                </div>
              </div>
              <div class="form-group">
                <label>檔案路徑 (或自動上傳)</label>
                <input v-model="formData.file" type="text" class="form-input" placeholder="自動填入或手動輸入" />
              </div>
              <div class="form-group">
                <label>檔案格式</label>
                <input v-model="formData.filetype" type="text" class="form-input" placeholder="例如: mp3, flac, wav" />
              </div>
              <div class="form-group">
                <label>歌詞</label>
                <textarea v-model="formData.lyrics" class="form-textarea" rows="4" placeholder="輸入歌詞內容..."></textarea>
              </div>
              <div class="form-group">
                <label>語言</label>
                <select v-model="languageSelect" @change="handleLanguageChange" class="form-input">
                  <option value="">選擇語言</option>
                  <option value="中文">中文</option>
                  <option value="英語">英語</option>
                  <option value="日語">日語</option>
                  <option value="韓語">韓語</option>
                  <option value="粵語">粵語</option>
                  <option value="custom">自訂...</option>
                </select>
                <input
                  v-if="languageSelect === 'custom'"
                  v-model="formData.language"
                  type="text"
                  class="form-input"
                  placeholder="輸入自訂語言"
                  style="margin-top: 0.5rem"
                />
              </div>
              <div class="form-group">
                <label>備註</label>
                <input v-model="formData.note" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>參考</label>
                <input v-model="formData.ref" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>分類</label>
                <input v-model="formData.category" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>Hash</label>
                <input v-model="formData.hash" type="text" class="form-input" />
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
                    class="btn-upload"
                    :disabled="coverUploading"
                  >
                    {{ coverUploading ? '上傳中...' : '選擇封面' }}
                  </button>
                </div>
                <div v-if="formData.cover" class="cover-preview">
                  <img :src="formData.cover" alt="封面預覽" class="preview-image" />
                  <button type="button" @click="removeCover" class="btn-remove">移除</button>
                </div>
                <input v-model="formData.cover" type="text" class="form-input" placeholder="或輸入封面 URL" />
              </div>
              <div class="modal-actions">
                <button type="button" @click="closeModal" class="btn-cancel">
                  取消
                </button>
                <button type="submit" class="btn-save">儲存</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useMusicRecords } from '../../composables/useMusicRecords'
import { useStorage } from '../../composables/useStorage'

useHead({
  title: '鋒兄音樂 - 鋒兄AI Supabase'
})

const { musics, loading, FIELDS, loadMusics, addMusic, updateMusic, deleteMusic, importMusics } = useMusicRecords()
const { uploading, uploadProgress, uploadFile } = useStorage()

// 行內編輯
const editingId = ref(null)
const editForm = reactive({})

const startInlineEdit = (music) => {
  Object.assign(editForm, {
    id: music.id,
    name: music.name || '',
    file: music.file || '',
    filetype: music.filetype || '',
    lyrics: music.lyrics || '',
    note: music.note || '',
    ref: music.ref || '',
    category: music.category || '',
    hash: music.hash || '',
    language: music.language || '',
    cover: music.cover || ''
  })
  editingId.value = music.id
}

const cancelInlineEdit = () => {
  editingId.value = null
}

const saveInlineEdit = async () => {
  if (!editForm.name) {
    alert('請輸入歌曲名稱')
    return
  }
  try {
    await updateMusic(editForm.id, { ...editForm })
    editingId.value = null
    await loadMusics()
  } catch (error) {
    console.error('Inline edit save error:', error)
    alert('儲存失敗: ' + error.message)
  }
}

const searchQuery = ref('')
const showModal = ref(false)
const editingMusic = ref(null)
const audioFileInput = ref(null)
const coverFileInput = ref(null)
const coverUploading = ref(false)
const languageSelect = ref('')
const formData = ref({
  name: '',
  file: '',
  filetype: '',
  lyrics: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  language: '',
  cover: ''
})

// Batch mode state
const batchMode = ref(false)
const selectedIds = ref(new Set())

const enterBatchMode = () => {
  batchMode.value = true
  selectedIds.value.clear()
}

const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value.clear()
}

const toggleSelect = (id) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

const isAllSelected = computed(() => {
  return filteredMusics.value.length > 0 &&
         filteredMusics.value.every(m => selectedIds.value.has(m.id))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    filteredMusics.value.forEach(m => selectedIds.value.add(m.id))
  }
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return

  const isFullDelete = count === musics.value.length
  const confirmText = isFullDelete
    ? `確定要刪除全部 ${count} 個項目嗎？這將清空整個資料表！\n\n請輸入「DELETE musicdb」確認：`
    : `確定要刪除選中的 ${count} 個項目嗎？`

  if (isFullDelete) {
    const userInput = prompt(confirmText)
    if (userInput !== 'DELETE musicdb') {
      alert('確認文字不正確，已取消刪除')
      return
    }
  } else {
    if (!confirm(confirmText)) return
  }

  try {
    const idsToDelete = Array.from(selectedIds.value)
    for (const id of idsToDelete) {
      await deleteMusic(id)
    }
    await loadMusics()
    exitBatchMode()
    alert(`成功刪除 ${count} 個項目`)
  } catch (error) {
    console.error('Error deleting selected:', error)
    alert('批量刪除失敗: ' + error.message)
  }
}

const filteredMusics = computed(() => {
  if (!searchQuery.value) return musics.value
  const query = searchQuery.value.toLowerCase()
  return musics.value.filter(music =>
    music.name?.toLowerCase().includes(query)
  )
})

// 按歌曲名稱分組
const groupedMusics = computed(() => {
  const map = new Map()
  for (const music of filteredMusics.value) {
    const key = (music.name || '').trim().toLowerCase()
    if (!map.has(key)) {
      map.set(key, { name: music.name || '未命名', items: [] })
    }
    map.get(key).items.push(music)
  }
  return Array.from(map.values())
})

// 每個 group 目前選中的版本 index
const activeVersionMap = ref(new Map())

function getActiveIndex(group) {
  const key = (group.name || '').trim().toLowerCase()
  return activeVersionMap.value.get(key) || 0
}

function getActiveItem(group) {
  const idx = getActiveIndex(group)
  return group.items[idx] || group.items[0]
}

function setActiveVersion(groupName, idx) {
  const key = (groupName || '').trim().toLowerCase()
  activeVersionMap.value.set(key, idx)
  activeVersionMap.value = new Map(activeVersionMap.value) // trigger reactivity
}

function toggleGroupSelect(group) {
  const allSelected = group.items.every(m => selectedIds.value.has(m.id))
  if (allSelected) {
    group.items.forEach(m => selectedIds.value.delete(m.id))
  } else {
    group.items.forEach(m => selectedIds.value.add(m.id))
  }
}

// 匯入進度狀態
const importProgress = ref({
  active: false,
  title: '',
  step: '',
  current: 0,
  total: 0,
  percent: 0,
  itemName: '',
  stats: null
})

function updateImportProgress(fields) {
  Object.assign(importProgress.value, fields)
  if (fields.current !== undefined && importProgress.value.total > 0) {
    importProgress.value.percent = Math.round((fields.current / importProgress.value.total) * 100)
  }
}

function resetImportProgress() {
  importProgress.value = {
    active: false, title: '', step: '', current: 0, total: 0, percent: 0, itemName: '', stats: null
  }
}

// 音樂快取
const musicCache = ref(new Map()) // id -> { blobUrl, size }
const cachingMusicId = ref(null)
const totalCacheSize = ref(0)

const musicsWithFile = computed(() => musics.value.filter(m => m.file))
const cachedCount = computed(() => musicCache.value.size)

function getAudioSrc(music) {
  const cached = musicCache.value.get(music.id)
  if (cached) return cached.blobUrl
  return music.file
}

async function cacheMusicItem(music) {
  if (!music.file || musicCache.value.has(music.id)) return
  cachingMusicId.value = music.id
  try {
    const response = await fetch(music.file)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    musicCache.value.set(music.id, { blobUrl, size: blob.size, name: music.name })
    totalCacheSize.value += blob.size
    musicCache.value = new Map(musicCache.value)
    console.log(`✅ 快取成功: ${music.name} (${(blob.size / 1024 / 1024).toFixed(1)} MB)`)
  } catch (err) {
    console.error(`快取失敗: ${music.name}`, err)
    alert(`快取失敗: ${err.message}`)
  } finally {
    cachingMusicId.value = null
  }
}

function uncacheMusic(musicId) {
  const cached = musicCache.value.get(musicId)
  if (cached) {
    URL.revokeObjectURL(cached.blobUrl)
    totalCacheSize.value -= cached.size
    musicCache.value.delete(musicId)
    musicCache.value = new Map(musicCache.value)
  }
}

async function cacheAllMusics() {
  const uncached = musicsWithFile.value.filter(m => !musicCache.value.has(m.id))
  if (uncached.length === 0) { alert('所有音樂已快取'); return }
  if (!confirm(`確定要快取 ${uncached.length} 首音樂？`)) return
  for (const music of uncached) {
    await cacheMusicItem(music)
  }
  alert(`快取完成！共 ${musicCache.value.size} 首 (${(totalCacheSize.value / 1024 / 1024).toFixed(1)} MB)`)
}

function clearAllMusicCache() {
  if (!confirm('確定要清除所有音樂快取？')) return
  for (const [, cached] of musicCache.value) {
    URL.revokeObjectURL(cached.blobUrl)
  }
  musicCache.value = new Map()
  totalCacheSize.value = 0
}

const pauseOthers = (event) => {
  document.querySelectorAll('.audio-player').forEach(audio => {
    if (audio !== event.target) audio.pause()
  })
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// 行內新增
const isAddingInline = ref(false)
const addForm = ref({ name: '', file: '', filetype: '', lyrics: '', note: '', ref: '', category: '', hash: '', language: '', cover: '' })
const openInlineAdd = () => { addForm.value = { name: '', file: '', filetype: '', lyrics: '', note: '', ref: '', category: '', hash: '', language: '', cover: '' }; isAddingInline.value = true }
const cancelInlineAdd = () => { isAddingInline.value = false }
const saveInlineAdd = async () => {
  if (!addForm.value.name) { alert('請輸入歌曲名稱'); return }
  try { await addMusic(addForm.value); isAddingInline.value = false; await loadMusics() } catch(e) { alert('新增失敗: ' + e.message) }
}

// 行內新增上傳 refs 和狀態
const addAudioInput = ref(null)
const addCoverInput = ref(null)
const addAudioUploading = ref(false)
const addCoverUploading = ref(false)

const handleAddAudioUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  addAudioUploading.value = true
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const result = await uploadFile(file, 'music')
    if (result.success) {
      addForm.value.file = result.url
      if (!addForm.value.filetype) addForm.value.filetype = ext
      if (!addForm.value.name) addForm.value.name = file.name.replace(/\.[^.]+$/, '')
    } else {
      alert('音檔上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('音檔上傳失敗: ' + err.message)
  } finally {
    addAudioUploading.value = false
    if (event.target) event.target.value = ''
  }
}

const handleAddCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  addCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'music-covers')
    if (result.success) {
      addForm.value.cover = result.url
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('封面上傳失敗: ' + err.message)
  } finally {
    addCoverUploading.value = false
    if (event.target) event.target.value = ''
  }
}

// 行內編輯上傳 refs 和狀態
const editAudioInput = ref(null)
const editCoverInput = ref(null)
const editAudioUploading = ref(false)
const editCoverUploading = ref(false)

const handleEditAudioUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  editAudioUploading.value = true
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const result = await uploadFile(file, 'music')
    if (result.success) {
      editForm.file = result.url
      if (!editForm.filetype) editForm.filetype = ext
    } else {
      alert('音檔上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('音檔上傳失敗: ' + err.message)
  } finally {
    editAudioUploading.value = false
    if (event.target) event.target.value = ''
  }
}

const handleEditCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  editCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'music-covers')
    if (result.success) {
      editForm.cover = result.url
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('封面上傳失敗: ' + err.message)
  } finally {
    editCoverUploading.value = false
    if (event.target) event.target.value = ''
  }
}

const openAddModal = () => {
  editingMusic.value = null
  formData.value = { name: '', file: '', filetype: '', lyrics: '', note: '', ref: '', category: '', hash: '', language: '', cover: '' }
  showModal.value = true
}

const openEditModal = (music) => {
  editingMusic.value = music
  formData.value = {
    name: music.name || '',
    file: music.file || '',
    filetype: music.filetype || '',
    lyrics: music.lyrics || '',
    note: music.note || '',
    ref: music.ref || '',
    category: music.category || '',
    hash: music.hash || '',
    language: music.language || '',
    cover: music.cover || ''
  }
  // Set language select
  const predefinedLanguages = ['中文', '英語', '日語', '韓語', '粵語']
  if (predefinedLanguages.includes(music.language)) {
    languageSelect.value = music.language
  } else if (music.language) {
    languageSelect.value = 'custom'
  } else {
    languageSelect.value = ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingMusic.value = null
  languageSelect.value = ''
}

// Audio upload handler
const handleAudioUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    // Get file extension
    const fileExt = file.name.split('.').pop()
    formData.value.filetype = fileExt

    // Upload to Supabase Storage
    const result = await uploadFile(file, 'music')

    if (result.success) {
      formData.value.file = result.url
      // 若名稱為空，預設為上傳檔名（去掉副檔名）
      if (!formData.value.name) {
        formData.value.name = file.name.replace(/\.[^.]+$/, '')
      }
      alert('檔案上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('上傳失敗: ' + error.message)
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
    const result = await uploadFile(file, 'music-covers')
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

// Language change handler
const handleLanguageChange = () => {
  if (languageSelect.value !== 'custom') {
    formData.value.language = languageSelect.value
  }
}

const saveMusic = async () => {
  try {
    if (editingMusic.value) {
      await updateMusic(editingMusic.value.id, formData.value)
    } else {
      await addMusic(formData.value)
    }
    closeModal()
    await loadMusics()
  } catch (error) {
    console.error('Error saving music:', error)
    alert('儲存失敗: ' + error.message)
  }
}

const deleteRecord = async (id) => {
  if (!confirm('確定要刪除此音樂記錄嗎？')) return
  try {
    await deleteMusic(id)
    await loadMusics()
  } catch (error) {
    console.error('Error deleting music:', error)
    alert('刪除失敗: ' + error.message)
  }
}

const exportToZIP = async () => {
  if (musics.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default

    const zip = new JSZip()

    // Create JSON data
    const jsonData = JSON.stringify(musics.value, null, 2)
    zip.file('music.json', jsonData)

    // Generate ZIP file
    const blob = await zip.generateAsync({ type: 'blob' })

    // Download
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'supabase-music.zip')
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

// CSV Parser
const parseMusicCsv = (text) => {
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

// ZIP Import — 相容 supabase (music.json) 及 appwrite-music.zip (music.csv + music/ + lyrics/ + covers/)
const handleFileImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    updateImportProgress({ active: true, title: '📦 正在解壓 ZIP...', step: '讀取檔案中', current: 0, total: 1, stats: null, itemName: file.name })

    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // 偵測格式：Appwrite (music.csv) vs Supabase (music.json)
    const csvFile = zip.file('music.csv')
    const jsonFile = zip.file('music.json')

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：music.csv + music/ + lyrics/ + covers/ =====
      updateImportProgress({ step: '解析 CSV...', itemName: 'music.csv' })
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseMusicCsv(cleanText)

      if (parsed.length === 0) {
        resetImportProgress()
        alert('CSV 檔案無有效資料')
        return
      }

      resetImportProgress()
      const confirmMsg = `ℹ️ 偵測到 Appwrite music.zip 格式\n\n共 ${parsed.length} 筆音樂\n系統將自動上傳音樂檔案、封面至 Supabase Storage，並讀取歌詞\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      updateImportProgress({
        active: true,
        title: '🎵 匯入音樂中...',
        step: '準備上傳',
        current: 0,
        total: parsed.length,
        stats: { musicOk: 0, lyricsOk: 0, coverOk: 0, fail: 0 },
        itemName: ''
      })

      const { uploadFile: uploadToStorage } = useStorage()
      const stats = { musicOk: 0, lyricsOk: 0, coverOk: 0, fail: 0 }

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        const itemLabel = mapped.name || `第 ${i + 1} 筆`
        updateImportProgress({ current: i + 1, itemName: itemLabel })

        // 上傳音樂檔案 (music/ 資料夾)
        const musicPath = mapped.file
        if (musicPath && musicPath.startsWith('music/')) {
          updateImportProgress({ step: `🎵 上傳音樂 ${i + 1}/${parsed.length}` })
          const zipEntry = zip.file(musicPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = musicPath.split('/').pop() || `music_${i}.mp3`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'mp3'
              const mimeMap = { mp3: 'audio/mpeg', flac: 'audio/flac', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', wma: 'audio/x-ms-wma' }
              const fileObj = new window.File([blob], fileName, { type: mimeMap[ext] || `audio/${ext}` })
              const uploadResult = await uploadToStorage(fileObj, 'music')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                if (!mapped.filetype) mapped.filetype = ext
                stats.musicOk++
              } else {
                console.warn(`上傳音樂失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳音樂失敗 (${mapped.name}):`, err)
              mapped.file = ''
              stats.fail++
            }
          } else {
            mapped.file = ''
          }
        }

        // 讀取歌詞檔案 (lyrics/ 資料夾)
        const lyricsPath = mapped.lyrics
        if (lyricsPath && lyricsPath.startsWith('lyrics/')) {
          updateImportProgress({ step: `📝 讀取歌詞 ${i + 1}/${parsed.length}` })
          const zipEntry = zip.file(lyricsPath)
          if (zipEntry) {
            try {
              mapped.lyrics = await zipEntry.async('text')
              stats.lyricsOk++
            } catch (err) {
              console.warn(`讀取歌詞失敗 (${mapped.name}):`, err)
              mapped.lyrics = ''
            }
          } else {
            mapped.lyrics = ''
          }
        }

        // 上傳封面圖 (covers/ 資料夾)
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
              const uploadResult = await uploadToStorage(fileObj, 'music-covers')
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
      // ===== Supabase 格式：music.json =====
      updateImportProgress({ step: '解析 JSON...', itemName: 'music.json' })
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
      if (!confirm(`確定要匯入 ${records.length} 筆音樂記錄嗎？`)) return

      updateImportProgress({ active: true, title: '📥 匯入中...', step: '寫入資料庫', current: 0, total: records.length })

    } else {
      resetImportProgress()
      alert('ZIP 檔案中找不到 music.csv 或 music.json')
      return
    }

    // 匯入記錄到資料庫
    if (records.length > 0) {
      updateImportProgress({ step: '💾 寫入資料庫...', current: importProgress.value.total, percent: 99 })
      const result = await importMusics(records)
      resetImportProgress()
      if (result.success) {
        await loadMusics()
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

onMounted(() => {
  loadMusics()
})
</script>

<style scoped>
/* 行內編輯樣式 */
.card-editing {
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.2);
  border-left: 4px solid #f093fb;
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
  border-color: #f093fb;
  box-shadow: 0 0 0 2px rgba(240, 147, 251, 0.15);
}

.inline-name {
  flex: 1;
  font-weight: 600;
  font-size: 1rem;
}

.inline-edit-content {
  max-height: 500px;
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

.btn-icon.save:hover {
  background: #ecfdf5;
}
.music-db-page {
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
  font-weight: bold;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
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
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-export:hover,
.btn-import:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-add {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
}

/* ── Cache Bar ── */
.cache-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border: 1px solid #f9a8d4;
  border-radius: 12px;
  flex-wrap: wrap;
}

.cache-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #9d174d;
}

.cache-icon { font-size: 1.1rem; }

.cache-size {
  color: #be185d;
  font-weight: 500;
}

.cache-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-cache-all {
  padding: 0.35rem 0.85rem;
  background: linear-gradient(135deg, #ec4899, #be185d);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cache-all:hover:not(:disabled) {
  background: linear-gradient(135deg, #be185d, #9d174d);
  transform: translateY(-1px);
}

.btn-cache-all:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-clear-cache {
  padding: 0.35rem 0.85rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-cache:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fca5a5;
}

.card-cache-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0.25rem 0.5rem;
  gap: 0.4rem;
}

.btn-cached,
.btn-cache {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-cached {
  background: #d1fae5;
  color: #059669;
}

.btn-cached:hover {
  background: #fef2f2;
  color: #dc2626;
}

.btn-cache {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-cache:hover:not(:disabled) {
  background: #e0f2fe;
  color: #0284c7;
}

.btn-cache:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.music-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.music-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.music-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(240, 147, 251, 0.2);
  border-color: #f093fb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  word-break: break-word;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-edit,
.btn-delete {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit {
  background: #e3f2fd;
  color: #1976d2;
}

.btn-edit:hover {
  background: #1976d2;
  color: white;
}

.btn-delete {
  background: #ffebee;
  color: #d32f2f;
}

.btn-delete:hover {
  background: #d32f2f;
  color: white;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge-category {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.badge-language {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* ── Language Chips ── */
.lang-chips {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.lang-chip {
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 2px solid #e0e0e0;
  background: #f5f5f5;
  color: #555;
  cursor: pointer;
  transition: all 0.25s ease;
}

.lang-chip:hover {
  border-color: #b388ff;
  background: #f3e5f5;
  color: #7c4dff;
}

.lang-chip.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.version-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #aaa;
  text-align: right;
  font-style: italic;
}

.card-field {
  margin: 0;
  color: #555;
  font-size: 0.95rem;
  line-height: 1.5;
  word-break: break-word;
}

.card-field strong {
  color: #333;
  font-weight: 600;
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

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
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
  font-weight: 600;
  color: #333;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  font-family: inherit;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-save {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-save {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }

  .actions-bar {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .csv-actions {
    width: 100%;
  }

  .btn-export,
  .btn-import {
    flex: 1;
  }

  .music-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .btn-cancel,
  .btn-save {
    width: 100%;
  }
}

/* Media Row: Cover + Audio Player */
.card-media {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.5rem 0;
}

.card-cover-image {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.card-audio {
  flex: 1;
  min-width: 0;
}

.audio-player {
  width: 100%;
  height: 40px;
  border-radius: 8px;
}

.lyrics-text {
  margin: 0.25rem 0 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.8;
  color: #555;
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 8px;
}

/* Cover Upload Styles */
.cover-preview {
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

/* Summary Bar Styles */
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
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
}

.btn-batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  flex-shrink: 0;
}

.card-selected {
  border-color: #3498db !important;
  background: rgba(52, 152, 219, 0.05);
}

/* ── Import Progress Overlay ── */
.import-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

.import-modal {
  background: white;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  width: 90%;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.import-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 1.25rem;
  border: 4px solid #e5e7eb;
  border-top-color: #f093fb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.import-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem;
}

.import-step {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0 0 1.25rem;
}

.import-progress-bar {
  width: 100%;
  height: 10px;
  background: #e5e7eb;
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.import-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
  border-radius: 99px;
  transition: width 0.3s ease;
}

.import-percent {
  font-size: 0.9rem;
  color: #374151;
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.import-item-name {
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0 0 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.import-stats {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stat-tag {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-weight: 500;
}

.stat-ok {
  background: #d1fae5;
  color: #065f46;
}

.stat-fail {
  background: #fee2e2;
  color: #991b1b;
}

/* ── 行內上傳樣式 ── */
.inline-upload-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}

.btn-inline-upload-music {
  padding: 0.3rem 0.7rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.btn-inline-upload-music:hover {
  opacity: 0.85;
}

.btn-inline-upload-music.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-inline-remove-sm {
  width: 22px;
  height: 22px;
  padding: 0;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}

.btn-inline-remove-sm:hover {
  background: #fca5a5;
}

.inline-audio-preview {
  width: 100%;
  height: 36px;
  margin-top: 0.3rem;
  border-radius: 6px;
}

.inline-cover-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  margin-top: 0.4rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  display: block;
}
</style>
