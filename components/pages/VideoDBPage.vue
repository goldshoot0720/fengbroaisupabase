<template>
  <PageContainer>
    <div class="video-page" :class="`mode-${videoDisplayMode}`">
      <h1 class="page-title">鋒兄影片</h1>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋影片名稱..."
          class="search-input"
        />
        <div class="csv-actions">
          <div class="view-switcher" role="group" aria-label="影片顯示風格">
            <button
              type="button"
              class="view-switch-btn"
              :class="{ active: videoDisplayMode === 'youtube' }"
              @click="setVideoDisplayMode('youtube')"
            >
              YouTube
            </button>
            <button
              type="button"
              class="view-switch-btn"
              :class="{ active: videoDisplayMode === 'bilibili' }"
              @click="setVideoDisplayMode('bilibili')"
            >
              Bilibili
            </button>
          </div>
          <button @click="exportZip" class="btn-export" title="匯出 ZIP">
            <span>📤</span> 匯出 ZIP
          </button>
          <label class="btn-import" title="匯入 ZIP">
            <span>📥</span> 匯入 ZIP
            <input
              type="file"
              accept=".zip"
              @change="handleImport"
              style="display: none"
            />
          </label>
        </div>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredVideos.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增">+</button>
          <template v-if="batchMode">
            <label class="select-all-label"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /><span>全選</span></label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ videos.length }} 個項目</span>
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
          <span>已快取 <strong>{{ cachedCount }}</strong> / {{ videosWithFile.length }} 部影片</span>
          <span v-if="totalCacheSize > 0" class="cache-size">({{ (totalCacheSize / 1024 / 1024).toFixed(1) }} MB)</span>
        </div>
        <div class="cache-actions">
          <button
            v-if="cachedCount < videosWithFile.length"
            @click="cacheAllVideos"
            class="btn-cache-all"
            :disabled="cachingVideoId !== null"
          >
            {{ cachingVideoId !== null ? '⏳ 快取中...' : '📥 全部快取' }}
          </button>
          <button
            v-if="cachedCount > 0"
            @click="clearAllCache"
            class="btn-clear-cache"
          >
            🗑️ 清除快取
          </button>
        </div>
      </div>

      <Teleport to="body">
        <section v-if="currentPlayingVideo" class="shared-video-panel">
          <div class="shared-video-stage">
            <div v-show="!isVideoPlayerCollapsed">
              <video
                ref="activePlayerRef"
                :src="currentPlayingVideoSrc"
                controls
                autoplay
                playsinline
                class="active-player"
              ></video>
              <div class="player-actions">
                <button
                  v-if="pictureInPictureSupported"
                  @click.stop="enterPictureInPictureIfPlaying"
                  class="pip-player-btn"
                  title="切換到子母畫面"
                  type="button"
                >
                  子母畫面
                </button>
                <button @click.stop="closeActivePlayer" class="close-player-btn" title="關閉播放" type="button">✕</button>
              </div>
            </div>
          </div>
          <div class="shared-video-copy">
            <p class="shared-video-kicker">影片播放器</p>
            <h3>{{ currentPlayingVideo.name || '未命名影片' }}</h3>
            <p>
              <span v-if="currentPlayingVideo.category">{{ currentPlayingVideo.category }}</span>
              <span v-if="currentPlayingVideo.category && currentPlayingVideo.filetype">・</span>
              <span v-if="currentPlayingVideo.filetype">{{ currentPlayingVideo.filetype.toUpperCase() }}</span>
            </p>
            <button type="button" class="shared-video-collapse" @click="toggleVideoPlayerCollapsed">
              {{ isVideoPlayerCollapsed ? '展開' : '收合' }}
            </button>
          </div>
        </section>
      </Teleport>

      <!-- Loading State -->
      <div v-if="loading" class="loading">載入中...</div>

      <!-- Empty State -->
      <div v-else-if="filteredVideos.length === 0 && !isAddingInline" class="empty-state">
        <p v-if="searchQuery">找不到符合的影片</p>
        <p v-else>尚無影片記錄，點擊「新增」開始</p>
      </div>

      <!-- Video Grid -->
      <div v-if="isAddingInline || filteredVideos.length > 0" class="video-grid" :class="`video-grid--${videoDisplayMode}`">

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="video-card">
          <div class="inline-edit-form">
            <div class="inline-form-group"><label>名稱 *</label><input v-model="addNewForm.name" type="text" class="inline-input" placeholder="影片名稱" /></div>
            <div class="inline-form-group"><label>分類</label><input v-model="addNewForm.category" type="text" class="inline-input" placeholder="分類" /></div>
            <div class="inline-form-group">
              <label>上傳影片</label>
              <div class="upload-area">
                <input ref="addVideoInput" type="file" accept="video/*" multiple @change="handleAddVideoUpload" style="display:none" />
                <button type="button" @click="$refs.addVideoInput.click()" class="btn-upload" :disabled="addVideoUploading">
                  {{ addVideoUploading ? '上傳中...' : '選擇影片' }}
                </button>
              </div>
              <div v-if="addSelectedVideos.length > 0" class="selected-file-list">
                <span class="selected-file-summary">已選 {{ addSelectedVideos.length }} 部影片</span>
                <div class="selected-file-chips">
                  <span v-for="file in addSelectedVideos" :key="file.name + file.size" class="selected-file-chip">{{ file.name }}</span>
                </div>
                <button type="button" @click="clearAddSelectedVideos" class="btn-remove-sm">清除已選</button>
              </div>
              <div v-if="addVideoUploading" class="upload-progress-block">
                <div class="upload-progress-head">
                  <span>影片上傳進度</span>
                  <span class="upload-progress">{{ videoUploadProgress }}%</span>
                </div>
                <div class="upload-progress-bar">
                  <div class="upload-progress-fill" :style="{ width: `${videoUploadProgress}%` }"></div>
                </div>
              </div>
              <div v-if="getAddVideoPreviewSrc()" class="inline-video-preview">
                <video :src="getAddVideoPreviewSrc()" controls preload="metadata" class="card-video"></video>
              </div>
            </div>
            <div class="inline-form-group"><label>或輸入影片URL</label><input v-model="addNewForm.file" type="text" class="inline-input" placeholder="影片 URL" :disabled="addSelectedVideos.length > 0" /></div>
            <div class="inline-form-group"><label>檔案類型</label><input v-model="addNewForm.filetype" type="text" class="inline-input" placeholder="mp4, mov..." /></div>
            <div class="inline-form-group">
              <label>封面上傳</label>
              <div class="upload-area">
                <input ref="addCoverInput" type="file" accept="image/*" @change="handleAddCoverUpload" style="display:none" />
                <button type="button" @click="$refs.addCoverInput.click()" class="btn-upload" :disabled="addCoverUploading">
                  {{ addCoverUploading ? '上傳中...' : '選擇封面' }}
                </button>
              </div>
              <div v-if="addNewForm.cover" class="inline-cover-preview">
                <img :src="addNewForm.cover" alt="封面預覽" class="preview-cover-img" />
                <button type="button" @click="addNewForm.cover = ''" class="btn-remove-sm">移除</button>
              </div>
              <input v-model="addNewForm.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" style="margin-top:0.25rem" />
            </div>
            <div class="inline-form-group"><label>備註</label><textarea v-model="addNewForm.note" class="inline-textarea" rows="2" placeholder="備註"></textarea></div>
            <div class="inline-edit-actions">
              <button @click="saveInlineAdd" class="btn-save" :disabled="loading">儲存</button>
              <button @click="cancelInlineAdd" class="btn-cancel-inline">取消</button>
            </div>
          </div>
        </div>
        <div
          v-for="video in filteredVideos"
          :key="video.id"
          class="video-card"
          :class="{ 'is-selected': selectedIds.has(video.id), 'video-card--bilibili': videoDisplayMode === 'bilibili' }"
          @click="batchMode && toggleSelection(video.id)"
        >
          <!-- 行內編輯模式 -->
          <template v-if="inlineEditId === video.id">
            <div class="inline-edit-form">
              <div class="inline-form-group">
                <label>名稱 *</label>
                <input v-model="inlineEditData.name" type="text" class="inline-input" placeholder="影片名稱" />
              </div>
              <div class="inline-form-group">
                <label>分類</label>
                <input v-model="inlineEditData.category" type="text" class="inline-input" placeholder="分類" />
              </div>
              <div class="inline-form-group">
                <label>備註</label>
                <textarea v-model="inlineEditData.note" class="inline-textarea" rows="2" placeholder="備註"></textarea>
              </div>
              <div class="inline-form-group">
                <label>上傳影片</label>
                <div class="upload-area">
                  <input
                    ref="inlineVideoInput"
                    type="file"
                    accept="video/*"
                    @change="handleInlineVideoUpload"
                    style="display: none"
                  />
                  <button type="button" @click="$refs.inlineVideoInput.click()" class="btn-upload" :disabled="inlineVideoUploading">
                    {{ inlineVideoUploading ? '上傳中...' : '選擇影片' }}
                  </button>
                </div>
                <div v-if="inlineVideoUploading" class="upload-progress-block">
                  <div class="upload-progress-head">
                    <span>影片上傳進度</span>
                    <span class="upload-progress">{{ videoUploadProgress }}%</span>
                  </div>
                  <div class="upload-progress-bar">
                    <div class="upload-progress-fill" :style="{ width: `${videoUploadProgress}%` }"></div>
                  </div>
                </div>
                <div v-if="getInlineVideoPreviewSrc()" class="inline-video-preview">
                  <video :src="getInlineVideoPreviewSrc()" controls preload="metadata" class="card-video"></video>
                </div>
              </div>
              <div class="inline-form-group">
                <label>檔案路徑</label>
                <input v-model="inlineEditData.file" type="text" class="inline-input" placeholder="URL" />
              </div>
              <div class="inline-form-group">
                <label>檔案類型</label>
                <input v-model="inlineEditData.filetype" type="text" class="inline-input" placeholder="mp4, avi..." />
              </div>
              <div class="inline-form-group">
                <label>參考</label>
                <input v-model="inlineEditData.ref" type="text" class="inline-input" placeholder="參考連結" />
              </div>
              <div class="inline-form-group">
                <label>雜湊值</label>
                <input v-model="inlineEditData.hash" type="text" class="inline-input" placeholder="Hash" />
              </div>
              <div class="inline-form-group">
                <label>封面上傳</label>
                <div class="upload-area">
                  <input
                    ref="inlineCoverInput"
                    type="file"
                    accept="image/*"
                    @change="handleInlineCoverUpload"
                    style="display: none"
                  />
                  <button type="button" @click="$refs.inlineCoverInput.click()" class="btn-upload" :disabled="inlineCoverUploading">
                    {{ inlineCoverUploading ? '上傳中...' : '選擇封面' }}
                  </button>
                </div>
                <div v-if="inlineEditData.cover" class="inline-cover-preview">
                  <img :src="inlineEditData.cover" alt="封面預覽" class="preview-cover-img" />
                  <button type="button" @click="inlineEditData.cover = ''" class="btn-remove-sm">移除</button>
                </div>
                <input v-model="inlineEditData.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" />
              </div>
              <div class="inline-edit-actions">
                <button @click="saveInlineEdit" class="btn-save" :disabled="loading">儲存</button>
                <button @click="cancelInlineEdit" class="btn-cancel-inline">取消</button>
              </div>
            </div>
          </template>

          <!-- YouTube/Bilibili 風格顯示模式 -->
          <template v-else>
            <!-- 縮圖區域 -->
            <div class="thumbnail-wrapper" @click="handlePlay(video)" @mouseenter="warmThumbnail(video)">
              <input v-if="batchMode" type="checkbox" :checked="selectedIds.has(video.id)" @click.stop="toggleSelection(video.id)" class="batch-checkbox" />
              <template v-if="video.cover">
                <img :src="video.cover" :alt="video.name" class="thumbnail-img" />
              </template>
              <template v-else-if="video.file && canRenderVideoThumbnail(video)">
                <video
                  :src="getThumbnailVideoSrc(video)"
                  preload="metadata"
                  class="thumbnail-video"
                  muted
                  playsinline
                  @loadedmetadata="seekThumbnailFrame"
                ></video>
              </template>
              <div v-else class="thumbnail-placeholder">
                <span class="placeholder-icon">🎬</span>
              </div>
              <!-- 播放按鈕覆蓋層 -->
              <div v-if="video.file" class="play-overlay">
                <span class="play-btn">▶</span>
              </div>
              <!-- 類型標籤 -->
              <span v-if="video.filetype" class="filetype-tag">{{ video.filetype.toUpperCase() }}</span>
            </div>

            <!-- 影片資訊區 -->
            <div class="video-meta">
              <div v-if="videoDisplayMode === 'bilibili'" class="bilibili-avatar">鋒</div>
              <div class="video-copy">
                <h3 class="video-title">{{ video.name || '未命名' }}</h3>
                <div class="meta-row">
                  <span v-if="video.category" class="category-chip">{{ video.category }}</span>
                  <span v-if="video.ref" class="meta-ref" :title="video.ref">🔗 參考</span>
                </div>
                <p v-if="video.note" class="video-desc">{{ truncateText(video.note, videoDisplayMode === 'bilibili' ? 56 : 80) }}</p>
                <div v-if="videoDisplayMode === 'bilibili'" class="bilibili-stats">
                  <span>{{ video.filetype ? video.filetype.toUpperCase() : 'VIDEO' }}</span>
                  <span>{{ video.category || '鋒兄頻道' }}</span>
                </div>
              </div>
            </div>

            <!-- 操作列 -->
            <div v-if="!batchMode" class="card-actions-bar">
              <button
                v-if="video.file"
                @click.stop="handlePlay(video)"
                class="action-btn play-card-btn"
                :title="playingVideoId === video.id ? '播放中' : '播放影片'"
              >
                {{ playingVideoId === video.id ? '⏸️' : '▶️' }}
              </button>
              <button @click="startInlineEdit(video)" class="action-btn edit-btn" title="編輯">✏️</button>
              <button @click="handleDelete(video)" class="action-btn delete-btn" title="刪除">🗑️</button>
              <template v-if="video.file">
                <button @click.stop="downloadVideo(video)" class="action-btn download-btn" :disabled="downloadingVideoId === video.id" :title="downloadingVideoId === video.id ? '下載中...' : '下載影片'">{{ downloadingVideoId === video.id ? '⏬' : '⬇️' }}</button>
                <button v-if="videoCache.has(video.id)" @click.stop="uncacheVideo(video.id)" class="action-btn cached-btn" title="已快取 (點擊清除)">✅</button>
                <button v-else @click.stop="cacheVideo(video)" class="action-btn cache-btn" :disabled="cachingVideoId === video.id" :title="cachingVideoId === video.id ? '快取中...' : '快取影片'">{{ cachingVideoId === video.id ? '⏳' : '📥' }}</button>
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>{{ isEditing ? '編輯影片' : '新增影片' }}</h2>
            <button @click="closeModal" class="btn-close">&times;</button>
          </div>

          <form @submit.prevent="handleSubmit" class="modal-body">
            <div class="form-group">
              <label for="name">名稱 *</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                placeholder="輸入影片名稱"
              />
            </div>

            <div class="form-group">
              <label>上傳影片</label>
              <div class="upload-area">
                <input
                  ref="videoFileInput"
                  type="file"
                  accept="video/*"
                  @change="handleVideoUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.videoFileInput.click()"
                  class="btn-upload"
                  :disabled="videoUploading"
                >
                  {{ videoUploading ? '上傳中...' : '選擇影片' }}
                </button>
                <span v-if="videoUploadProgress > 0" class="upload-progress">{{ videoUploadProgress }}%</span>
              </div>
              <div v-if="videoUploading" class="upload-progress-block">
                <div class="upload-progress-head">
                  <span>影片上傳進度</span>
                  <span class="upload-progress">{{ videoUploadProgress }}%</span>
                </div>
                <div class="upload-progress-bar">
                  <div class="upload-progress-fill" :style="{ width: `${videoUploadProgress}%` }"></div>
                </div>
              </div>
              <div v-if="getFormVideoPreviewSrc()" class="video-preview">
                <video :src="getFormVideoPreviewSrc()" controls class="preview-video"></video>
                <button type="button" @click="removeVideo" class="btn-remove">移除</button>
              </div>
            </div>

            <div class="form-group">
              <label for="file">檔案路徑</label>
              <input
                id="file"
                v-model="formData.file"
                type="text"
                placeholder="自動上傳或手動輸入 URL"
              />
            </div>

            <div class="form-group">
              <label for="filetype">檔案類型</label>
              <input
                id="filetype"
                v-model="formData.filetype"
                type="text"
                placeholder="例: mp4, avi, mov"
              />
            </div>

            <div class="form-group">
              <label for="category">分類</label>
              <input
                id="category"
                v-model="formData.category"
                type="text"
                placeholder="影片分類"
              />
            </div>

            <div class="form-group">
              <label for="ref">參考</label>
              <input
                id="ref"
                v-model="formData.ref"
                type="text"
                placeholder="參考連結或資訊"
              />
            </div>

            <div class="form-group">
              <label for="hash">雜湊值</label>
              <input
                id="hash"
                v-model="formData.hash"
                type="text"
                placeholder="檔案雜湊值"
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
              <input
                id="cover"
                v-model="formData.cover"
                type="text"
                placeholder="或輸入封面 URL"
              />
            </div>

            <div class="form-group">
              <label for="note">備註</label>
              <textarea
                id="note"
                v-model="formData.note"
                rows="4"
                placeholder="輸入備註說明"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModal" class="btn-cancel">
                取消
              </button>
              <button type="submit" class="btn-submit">
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
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useVideoRecords } from '../../composables/useVideoRecords'
import { useStorage } from '../../composables/useStorage'

useHead({
  title: '鋒兄影片 - 鋒兄AI Supabase'
})

const {
  videos,
  loading,
  FIELDS,
  loadVideos,
  addVideo,
  updateVideo,
  deleteVideo,
  importVideos
} = useVideoRecords()

// Search
const searchQuery = ref('')
const VIDEO_DISPLAY_MODE_KEY = 'feng-video-display-mode'
const videoDisplayMode = ref('youtube')

// Batch mode state
const batchMode = ref(false)
const selectedIds = ref(new Set())

// Upload state
const videoFileInput = ref(null)
const coverFileInput = ref(null)
const {
  uploading: videoUploading,
  uploadProgress: videoUploadProgress,
  uploadFile,
  isMultipartManifestUrl,
  resolveMultipartFile,
  resolveMultipartPreviewFile
} = useStorage()
const coverUploading = ref(false)

// Modal state
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

// Form data
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

// Video player state
const playingVideoId = ref(null)
const activePlayerRef = ref(null)
const isVideoPlayerCollapsed = ref(false)
const MEDIA_PLAY_EVENT = 'feng-global-media-play'
const pictureInPictureSupported = computed(() => {
  return typeof document !== 'undefined' && document.pictureInPictureEnabled
})
const currentPlayingVideo = computed(() => {
  if (playingVideoId.value === null) return null
  return videos.value.find((video) => video.id === playingVideoId.value) || null
})
const currentPlayingVideoSrc = computed(() => {
  if (!currentPlayingVideo.value?.file) return ''
  return getVideoSrc(currentPlayingVideo.value)
})
const isExpectedMediaAbort = (error) => {
  const message = String(error?.message || '')
  return error?.name === 'AbortError' || message.includes('aborted by the user agent')
}

// Video caching state
const videoCache = ref(new Map()) // id -> { blobUrl, size }
const resolvedVideoSources = ref(new Map()) // id -> { blobUrl, size }
const thumbnailVideoSources = ref(new Map()) // id -> blob url for multipart thumbnail
const resolvingVideoIds = ref(new Set())
const resolvingThumbnailIds = ref(new Set())
const resolvingVideoPromises = new Map()
const resolvingThumbnailPromises = new Map()
const cachingVideoId = ref(null)
const downloadingVideoId = ref(null)
const totalCacheSize = ref(0)
const formVideoPreviewSrc = ref('')
const addVideoPreviewSrc = ref('')
const inlineVideoPreviewSrc = ref('')
const VIDEO_CACHE_DB_NAME = 'FengVideoCache'
const VIDEO_CACHE_STORE_NAME = 'videos'
let videoCacheDbPromise = null

function updateTotalCacheSize() {
  let total = 0
  for (const [, cached] of videoCache.value) {
    total += cached?.size || 0
  }
  totalCacheSize.value = total
}

function getVideoCacheKey(videoId) {
  return String(videoId)
}

async function initVideoCacheDb() {
  if (typeof window === 'undefined' || !window.indexedDB) return null
  if (!videoCacheDbPromise) {
    videoCacheDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(VIDEO_CACHE_DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(VIDEO_CACHE_STORE_NAME)) {
          db.createObjectStore(VIDEO_CACHE_STORE_NAME, { keyPath: 'cacheKey' })
        }
      }
    }).catch((error) => {
      videoCacheDbPromise = null
      throw error
    })
  }
  return await videoCacheDbPromise
}

async function readPersistedVideoCache(videoId) {
  const db = await initVideoCacheDb()
  if (!db) return null

  return await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readonly')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .get(getVideoCacheKey(videoId))

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

async function persistVideoCache(video, blob) {
  const db = await initVideoCacheDb()
  if (!db) return

  const record = {
    cacheKey: getVideoCacheKey(video.id),
    videoId: video.id,
    fileRef: video.file,
    name: video.name || '',
    size: blob.size,
    cachedAt: new Date().toISOString(),
    blob
  }

  await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readwrite')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .put(record)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function deletePersistedVideoCache(videoId) {
  const db = await initVideoCacheDb()
  if (!db) return

  await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readwrite')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .delete(getVideoCacheKey(videoId))

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearPersistedVideoCache() {
  const db = await initVideoCacheDb()
  if (!db) return

  await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readwrite')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function hydratePersistedVideoCache() {
  const currentIds = new Set(videos.value.map(video => String(video.id)))
  const nextCache = new Map()

  for (const [videoId, cached] of videoCache.value) {
    if (!currentIds.has(String(videoId))) {
      revokeIfBlobUrl(cached?.blobUrl)
      continue
    }
    nextCache.set(videoId, cached)
  }

  for (const video of videos.value) {
    if (!video?.file || nextCache.has(video.id)) continue

    try {
      const record = await readPersistedVideoCache(video.id)
      if (!record) continue

      if (!record.blob || record.fileRef !== video.file) {
        await deletePersistedVideoCache(video.id)
        continue
      }

      const blobUrl = URL.createObjectURL(record.blob)
      nextCache.set(video.id, {
        blobUrl,
        size: record.size || record.blob.size,
        name: record.name || video.name
      })
    } catch (error) {
      console.error(`載入持久化快取失敗 (${video.name || video.id}):`, error)
    }
  }

  videoCache.value = nextCache
  updateTotalCacheSize()
}

function revokeIfBlobUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function setPreviewSrc(targetRef, nextUrl) {
  if (targetRef.value && targetRef.value !== nextUrl) {
    revokeIfBlobUrl(targetRef.value)
  }
  targetRef.value = nextUrl || ''
}

function isMultipartVideo(file) {
  return isMultipartManifestUrl(file)
}

function canRenderVideoThumbnail(video) {
  if (!video?.file) return false
  if (!isMultipartVideo(video.file)) return true
  return thumbnailVideoSources.value.has(video.id)
}

async function ensureThumbnailVideoSource(video) {
  if (!video?.file || !isMultipartVideo(video.file)) return video?.file || ''

  const existing = thumbnailVideoSources.value.get(video.id)
  if (existing) return existing
  if (resolvingThumbnailPromises.has(video.id)) {
    return await resolvingThumbnailPromises.get(video.id)
  }

  resolvingThumbnailIds.value.add(video.id)
  resolvingThumbnailIds.value = new Set(resolvingThumbnailIds.value)

  const promise = (async () => {
    try {
      const { blob } = await resolveMultipartPreviewFile(video.file)
      const blobUrl = URL.createObjectURL(blob)
      thumbnailVideoSources.value.set(video.id, blobUrl)
      thumbnailVideoSources.value = new Map(thumbnailVideoSources.value)
      return blobUrl
    } finally {
      resolvingThumbnailIds.value.delete(video.id)
      resolvingThumbnailIds.value = new Set(resolvingThumbnailIds.value)
      resolvingThumbnailPromises.delete(video.id)
    }
  })()

  resolvingThumbnailPromises.set(video.id, promise)
  return await promise
}

function getThumbnailVideoSrc(video) {
  if (!video?.file) return ''
  if (!isMultipartVideo(video.file)) return video.file

  return thumbnailVideoSources.value.get(video.id) || ''
}

function warmThumbnail(video) {
  if (!video?.file || video.cover || !isMultipartVideo(video.file)) return
  if (thumbnailVideoSources.value.has(video.id) || resolvingThumbnailIds.value.has(video.id)) return
  ensureThumbnailVideoSource(video).catch((error) => {
    console.error('縮圖載入失敗:', error)
  })
}

function seekThumbnailFrame(event) {
  const videoEl = event.target
  if (!videoEl || videoEl.dataset.thumbnailSeeked === '1') return

  const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0
  const targetTime = duration > 1 ? 1 : 0

  if (targetTime <= 0) {
    videoEl.dataset.thumbnailSeeked = '1'
    return
  }

  videoEl.dataset.thumbnailSeeked = '1'
  try {
    videoEl.currentTime = targetTime
  } catch {
    // Ignore seek failures on partial/short videos.
  }
}

async function ensureResolvedVideoSource(video) {
  if (!video?.file || !isMultipartVideo(video.file)) return video?.file || ''

  const cached = videoCache.value.get(video.id)
  if (cached?.blobUrl) return cached.blobUrl

  const existing = resolvedVideoSources.value.get(video.id)
  if (existing) return existing.blobUrl
  if (resolvingVideoPromises.has(video.id)) {
    return await resolvingVideoPromises.get(video.id)
  }

  resolvingVideoIds.value.add(video.id)
  resolvingVideoIds.value = new Set(resolvingVideoIds.value)

  const promise = (async () => {
    try {
      const { blob } = await resolveMultipartFile(video.file)
      const blobUrl = URL.createObjectURL(blob)
      resolvedVideoSources.value.set(video.id, { blobUrl, size: blob.size })
      resolvedVideoSources.value = new Map(resolvedVideoSources.value)
      return blobUrl
    } finally {
      resolvingVideoIds.value.delete(video.id)
      resolvingVideoIds.value = new Set(resolvingVideoIds.value)
      resolvingVideoPromises.delete(video.id)
    }
  })()

  resolvingVideoPromises.set(video.id, promise)
  return await promise
}

function getVideoSrc(video) {
  const cached = videoCache.value.get(video.id)
  if (cached) return cached.blobUrl
  const resolved = resolvedVideoSources.value.get(video.id)
  if (resolved) return resolved.blobUrl
  if (isMultipartVideo(video.file)) {
    return ''
  }
  return video.file
}

async function getVideoBlobForDownload(video) {
  const cachedRecord = await readPersistedVideoCache(video.id)
  if (cachedRecord?.blob && cachedRecord.fileRef === video.file) {
    return cachedRecord.blob
  }

  if (isMultipartVideo(video.file)) {
    return (await resolveMultipartFile(video.file)).blob
  }

  const response = await fetch(video.file)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.blob()
}

function buildDownloadFilename(video) {
  const safeBaseName = (video.name || 'feng-video')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')

  const ext = (video.filetype || '').trim().replace(/^\./, '').toLowerCase()
  if (ext) return `${safeBaseName}.${ext}`

  try {
    const url = new URL(video.file, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const pathname = url.pathname || ''
    const detectedExt = pathname.split('.').pop()
    if (detectedExt && detectedExt !== pathname) {
      return `${safeBaseName}.${detectedExt.toLowerCase()}`
    }
  } catch {
    // Ignore invalid URLs and fall back to mp4.
  }

  return `${safeBaseName}.mp4`
}

async function downloadVideo(video) {
  if (!video?.file || downloadingVideoId.value === video.id) return

  downloadingVideoId.value = video.id
  try {
    const blob = await getVideoBlobForDownload(video)
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = buildDownloadFilename(video)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('下載失敗:', error)
    alert('下載失敗: ' + error.message)
  } finally {
    downloadingVideoId.value = null
  }
}

async function handlePlay(video) {
  if (!video?.file || batchMode.value) return
  try {
    const cached = videoCache.value.get(video.id)
    let src = cached?.blobUrl || video.file
    if (isMultipartVideo(video.file) && !cached?.blobUrl) {
      src = await ensureResolvedVideoSource(video)
    }
    if (!src) {
      throw new Error('影片仍在準備中，請稍後再試')
    }
    window.dispatchEvent(new CustomEvent(MEDIA_PLAY_EVENT, { detail: { source: 'video', id: video.id } }))
    playingVideoId.value = video.id
    await nextTick()
    try {
      await activePlayerRef.value?.play?.()
    } catch (error) {
      if (!isExpectedMediaAbort(error)) {
        throw error
      }
    }
  } catch (error) {
    if (isExpectedMediaAbort(error)) return
    console.error('影片載入失敗:', error)
    alert('影片載入失敗: ' + error.message)
  }
}

async function ensureActivePlayerReady(videoEl) {
  if (!videoEl || videoEl.readyState >= 1) return

  await new Promise((resolve) => {
    const cleanup = () => {
      videoEl.removeEventListener('loadedmetadata', cleanup)
      videoEl.removeEventListener('error', cleanup)
      resolve()
    }

    videoEl.addEventListener('loadedmetadata', cleanup, { once: true })
    videoEl.addEventListener('error', cleanup, { once: true })
  })
}

async function enterPictureInPictureIfPlaying() {
  if (!pictureInPictureSupported.value || playingVideoId.value === null) return false

  await nextTick()
  const videoEl = activePlayerRef.value
  if (!videoEl || typeof videoEl.requestPictureInPicture !== 'function') return false

  if (document.pictureInPictureElement === videoEl) return true

  try {
    await ensureActivePlayerReady(videoEl)
    await videoEl.play().catch(() => {})
    await videoEl.requestPictureInPicture()
    return true
  } catch (error) {
    console.warn('子母畫面啟動失敗:', error)
    return false
  }
}

async function closeActivePlayer() {
  const videoEl = activePlayerRef.value

  if (typeof document !== 'undefined' && document.pictureInPictureElement === videoEl && document.exitPictureInPicture) {
    try {
      await document.exitPictureInPicture()
    } catch (error) {
      console.warn('關閉子母畫面失敗:', error)
    }
  }

  if (videoEl) {
    videoEl.pause()
  }

  playingVideoId.value = null
}

const toggleVideoPlayerCollapsed = () => {
  isVideoPlayerCollapsed.value = !isVideoPlayerCollapsed.value
}

const handleExternalMediaPlay = async (event) => {
  if (event.detail?.source === 'video') return
  if (playingVideoId.value !== null) {
    await closeActivePlayer()
  }
}

async function cacheVideo(video) {
  if (!video.file || videoCache.value.has(video.id)) return
  cachingVideoId.value = video.id
  try {
    const blob = isMultipartVideo(video.file)
      ? (await resolveMultipartFile(video.file)).blob
      : await (async () => {
          const response = await fetch(video.file)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return await response.blob()
        })()
    const blobUrl = URL.createObjectURL(blob)
    await persistVideoCache(video, blob)
    videoCache.value.set(video.id, { blobUrl, size: blob.size, name: video.name })
    // Force reactivity
    videoCache.value = new Map(videoCache.value)
    updateTotalCacheSize()
    console.log(`✅ 快取成功: ${video.name} (${(blob.size / 1024 / 1024).toFixed(1)} MB)`)
  } catch (err) {
    console.error(`快取失敗: ${video.name}`, err)
    alert(`快取失敗: ${err.message}`)
  } finally {
    cachingVideoId.value = null
  }
}

async function uncacheVideo(videoId) {
  const cached = videoCache.value.get(videoId)
  if (cached) {
    URL.revokeObjectURL(cached.blobUrl)
    videoCache.value.delete(videoId)
    videoCache.value = new Map(videoCache.value)
    updateTotalCacheSize()
  }
  try {
    await deletePersistedVideoCache(videoId)
  } catch (error) {
    console.error(`刪除持久化快取失敗 (${videoId}):`, error)
  }
}

async function cacheAllVideos() {
  const uncached = filteredVideos.value.filter(v => v.file && !videoCache.value.has(v.id))
  if (uncached.length === 0) { alert('所有影片已快取'); return }
  if (!confirm(`確定要快取 ${uncached.length} 部影片？`)) return
  for (const video of uncached) {
    await cacheVideo(video)
  }
  alert(`快取完成！共 ${videoCache.value.size} 部影片 (${(totalCacheSize.value / 1024 / 1024).toFixed(1)} MB)`)
}

async function clearAllCache() {
  if (!confirm('確定要清除所有影片快取？')) return
  for (const [, cached] of videoCache.value) {
    URL.revokeObjectURL(cached.blobUrl)
  }
  videoCache.value = new Map()
  updateTotalCacheSize()
  try {
    await clearPersistedVideoCache()
  } catch (error) {
    console.error('清除持久化快取失敗:', error)
  }
}

function getInlineVideoPreviewSrc() {
  if (!inlineEditData.value.file) return ''
  if (inlineVideoPreviewSrc.value) return inlineVideoPreviewSrc.value
  return isMultipartVideo(inlineEditData.value.file) ? '' : inlineEditData.value.file
}

function getAddVideoPreviewSrc() {
  if (!addNewForm.value.file) return ''
  if (addVideoPreviewSrc.value) return addVideoPreviewSrc.value
  return isMultipartVideo(addNewForm.value.file) ? '' : addNewForm.value.file
}

function getFormVideoPreviewSrc() {
  if (!formData.value.file) return ''
  if (formVideoPreviewSrc.value) return formVideoPreviewSrc.value
  return isMultipartVideo(formData.value.file) ? '' : formData.value.file
}

// Inline editing state
const inlineEditId = ref(null)
const inlineEditData = ref({})
const inlineVideoInput = ref(null)
const inlineCoverInput = ref(null)
const inlineVideoUploading = ref(false)
const inlineCoverUploading = ref(false)

function startInlineEdit(video) {
  setPreviewSrc(inlineVideoPreviewSrc, '')
  inlineEditId.value = video.id
  inlineEditData.value = {
    name: video.name || '',
    file: video.file || '',
    filetype: video.filetype || '',
    note: video.note || '',
    ref: video.ref || '',
    category: video.category || '',
    hash: video.hash || '',
    cover: video.cover || ''
  }
}

function cancelInlineEdit() {
  setPreviewSrc(inlineVideoPreviewSrc, '')
  inlineEditId.value = null
  inlineEditData.value = {}
}

async function saveInlineEdit() {
  if (!inlineEditData.value.name) {
    alert('請輸入影片名稱')
    return
  }
  try {
    await updateVideo(inlineEditId.value, inlineEditData.value)
    await loadVideos()
    setPreviewSrc(inlineVideoPreviewSrc, '')
    inlineEditId.value = null
    inlineEditData.value = {}
  } catch (error) {
    console.error('更新失敗:', error)
    alert('更新失敗: ' + error.message)
  }
}

async function handleInlineVideoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  inlineVideoUploading.value = true
  try {
    const result = await uploadFile(file, 'video')
    if (result.success) {
      inlineEditData.value.file = result.url
      setPreviewSrc(inlineVideoPreviewSrc, result.previewUrl || result.url)
      if (!inlineEditData.value.name) {
        inlineEditData.value.name = file.name.replace(/\.[^.]+$/, '')
      }
      const ext = file.name.split('.').pop()
      if (ext) inlineEditData.value.filetype = ext
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    alert('上傳失敗: ' + error.message)
  } finally {
    inlineVideoUploading.value = false
  }
}

async function handleInlineCoverUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  inlineCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'video-covers')
    if (result.success) {
      inlineEditData.value.cover = result.url
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (error) {
    alert('封面上傳失敗: ' + error.message)
  } finally {
    inlineCoverUploading.value = false
  }
}

// Computed
const filteredVideos = computed(() => {
  if (!searchQuery.value.trim()) {
    return videos.value
  }
  const query = searchQuery.value.toLowerCase()
  return videos.value.filter((video) =>
    video.name?.toLowerCase().includes(query)
  )
})

const isAllSelected = computed(() => {
  return filteredVideos.value.length > 0 && filteredVideos.value.every(v => selectedIds.value.has(v.id))
})

const videosWithFile = computed(() => videos.value.filter(v => v.file))
const cachedCount = computed(() => videoCache.value.size)

// Batch mode methods
function enterBatchMode() {
  batchMode.value = true
  selectedIds.value = new Set()
}

function exitBatchMode() {
  batchMode.value = false
  selectedIds.value = new Set()
}

function toggleSelection(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredVideos.value.map(v => v.id))
  }
}

async function deleteSelected() {
  if (selectedIds.value.size === 0) return

  const count = selectedIds.value.size
  const isFullDelete = count === videos.value.length

  const confirmText = isFullDelete
    ? `確定要刪除全部 ${count} 個影片嗎？\n\n⚠️ 這將刪除所有影片！請在下方輸入 "DELETE videodb" 確認：`
    : `確定要刪除選中的 ${count} 個影片嗎？`

  if (isFullDelete) {
    const userInput = prompt(confirmText)
    if (userInput !== 'DELETE videodb') {
      alert('刪除已取消')
      return
    }
  } else {
    if (!confirm(confirmText)) return
  }

  try {
    const cachedDeletePromises = Array.from(selectedIds.value).map(id => uncacheVideo(id))
    await Promise.all(cachedDeletePromises)
    const deletePromises = Array.from(selectedIds.value).map(id => deleteVideo(id))
    await Promise.all(deletePromises)
    alert(`成功刪除 ${count} 個影片`)
    await loadVideos()
    exitBatchMode()
  } catch (error) {
    console.error('批量刪除失敗:', error)
    alert('批量刪除失敗: ' + error.message)
  }
}

// Methods
function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function setVideoDisplayMode(mode) {
  if (!['youtube', 'bilibili'].includes(mode)) return
  videoDisplayMode.value = mode
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(VIDEO_DISPLAY_MODE_KEY, mode)
  }
}

// 行內新增
const isAddingInline = ref(false)
const addNewForm = ref({ name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
const addVideoInput = ref(null)
const addCoverInput = ref(null)
const addVideoUploading = ref(false)
const addCoverUploading = ref(false)
const addSelectedVideos = ref([])

const getFileBaseName = (fileName = '') => fileName.replace(/\.[^.]+$/, '')
const getFileExtension = (fileName = '') => fileName.split('.').pop() || ''

const resetInlineAddForm = () => {
  addNewForm.value = { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' }
  addSelectedVideos.value = []
}

const openInlineAdd = () => {
  resetInlineAddForm()
  setPreviewSrc(addVideoPreviewSrc, '')
  isAddingInline.value = true
}
const cancelInlineAdd = () => {
  resetInlineAddForm()
  setPreviewSrc(addVideoPreviewSrc, '')
  isAddingInline.value = false
}

const clearAddSelectedVideos = () => {
  addSelectedVideos.value = []
  setPreviewSrc(addVideoPreviewSrc, '')
}

const saveInlineAdd = async () => {
  if (addSelectedVideos.value.length > 0) {
    addVideoUploading.value = true
    try {
      const records = []
      for (const file of addSelectedVideos.value) {
        const result = await uploadFile(file, 'video')
        if (!result.success) {
          throw new Error(`${file.name}: ${result.error}`)
        }
        records.push({
          name: addSelectedVideos.value.length === 1 && addNewForm.value.name ? addNewForm.value.name : getFileBaseName(file.name),
          file: result.url,
          filetype: addNewForm.value.filetype || getFileExtension(file.name),
          note: addNewForm.value.note,
          ref: addNewForm.value.ref,
          category: addNewForm.value.category,
          hash: addNewForm.value.hash,
          cover: addNewForm.value.cover
        })
      }

      const result = await importVideos(records)
      if (!result.success) {
        throw new Error(result.error || '匯入失敗')
      }
      resetInlineAddForm()
      setPreviewSrc(addVideoPreviewSrc, '')
      isAddingInline.value = false
      await loadVideos()
    } catch (e) {
      alert('批次上傳失敗: ' + e.message)
    } finally {
      addVideoUploading.value = false
    }
    return
  }

  if (!addNewForm.value.name) { alert('請輸入影片名稱'); return }
  try {
    await addVideo(addNewForm.value)
    resetInlineAddForm()
    setPreviewSrc(addVideoPreviewSrc, '')
    isAddingInline.value = false
    await loadVideos()
  } catch(e) {
    alert('新增失敗: ' + e.message)
  }
}

async function handleAddVideoUpload(event) {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  addSelectedVideos.value = files
  addNewForm.value.file = ''
  if (files.length === 1) {
    const file = files[0]
    if (!addNewForm.value.name) addNewForm.value.name = getFileBaseName(file.name)
    const ext = getFileExtension(file.name)
    if (ext && !addNewForm.value.filetype) addNewForm.value.filetype = ext
    setPreviewSrc(addVideoPreviewSrc, URL.createObjectURL(file))
  } else {
    setPreviewSrc(addVideoPreviewSrc, '')
  }
  event.target.value = ''
}

async function handleAddCoverUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  addCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'video-covers')
    if (result.success) { addNewForm.value.cover = result.url }
    else { alert('封面上傳失敗: ' + result.error) }
  } catch (e) { alert('封面上傳失敗: ' + e.message) } finally { addCoverUploading.value = false }
}

function openAddModal() {
  isEditing.value = false
  editingId.value = null
  formData.value = { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' }
  setPreviewSrc(formVideoPreviewSrc, '')
  showModal.value = true
}

function openEditModal(video) {
  isEditing.value = true
  editingId.value = video.id
  formData.value = {
    name: video.name || '',
    file: video.file || '',
    filetype: video.filetype || '',
    note: video.note || '',
    ref: video.ref || '',
    category: video.category || '',
    hash: video.hash || '',
    cover: video.cover || ''
  }
  setPreviewSrc(formVideoPreviewSrc, '')
  showModal.value = true
}

function closeModal() {
  setPreviewSrc(formVideoPreviewSrc, '')
  showModal.value = false
  isEditing.value = false
  editingId.value = null
}

// 影片上傳處理
async function handleVideoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const result = await uploadFile(file, 'video')
    if (result.success) {
      formData.value.file = result.url
      setPreviewSrc(formVideoPreviewSrc, result.previewUrl || result.url)
      if (!formData.value.name) {
        formData.value.name = file.name.replace(/\.[^.]+$/, '')
      }
      const ext = file.name.split('.').pop()
      if (ext) formData.value.filetype = ext
      alert('影片上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('上傳失敗: ' + error.message)
  }
}

// 移除影片
function removeVideo() {
  setPreviewSrc(formVideoPreviewSrc, '')
  formData.value.file = ''
  formData.value.filetype = ''
  if (videoFileInput.value) {
    videoFileInput.value.value = ''
  }
}

// 封面上傳處理
async function handleCoverUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  try {
    const result = await uploadFile(file, 'video-covers')
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

// 移除封面
function removeCover() {
  formData.value.cover = ''
  if (coverFileInput.value) {
    coverFileInput.value.value = ''
  }
}

async function handleSubmit() {
  try {
    if (isEditing.value) {
      await updateVideo(editingId.value, formData.value)
      alert('影片已更新')
    } else {
      await addVideo(formData.value)
      alert('影片已新增')
    }
    closeModal()
    await loadVideos()
  } catch (error) {
    console.error('操作失敗:', error)
    alert('操作失敗: ' + error.message)
  }
}

async function handleDelete(video) {
  if (!confirm(`確定要刪除影片「${video.name}」嗎？`)) {
    return
  }
  try {
    await uncacheVideo(video.id)
    await deleteVideo(video.id)
    alert('影片已刪除')
    await loadVideos()
  } catch (error) {
    console.error('刪除失敗:', error)
    alert('刪除失敗: ' + error.message)
  }
}

// ZIP Export
async function exportZip() {
  if (videos.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default

    const zip = new JSZip()

    // Create JSON data
    const jsonData = JSON.stringify(videos.value, null, 2)
    zip.file('videos.json', jsonData)

    // Generate ZIP file
    const blob = await zip.generateAsync({ type: 'blob' })

    // Download
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'supabase-videos.zip')
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
function parseCsv(text) {
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

// ZIP Import (相容 Appwrite 結構: video.csv + videos/ + covers/)
async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // 偵測格式：Appwrite (video.csv) vs Supabase (videos.json)
    const csvFile = zip.file('video.csv')
    const jsonFile = zip.file('videos.json')

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：video.csv + videos/ 資料夾 + covers/ 資料夾 =====
      console.log('偵測到 Appwrite video.zip 格式')
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseCsv(cleanText)

      if (parsed.length === 0) {
        alert('CSV 檔案無有效資料')
        return
      }

      const confirmMsg = `ℹ️ 偵測到 Appwrite video.zip 格式\n\n共 ${parsed.length} 筆影片\n系統將自動上傳影片與封面至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      const { uploadFile: uploadToStorage } = useStorage()
      let videoUploadOk = 0, videoUploadFail = 0
      let coverUploadOk = 0, coverUploadFail = 0

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        // 移除 Appwrite 系統欄位 ($id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId)
        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        // 上傳影片檔案 (videos/ 資料夾)
        const videoPath = mapped.file
        if (videoPath && videoPath.startsWith('videos/')) {
          const zipEntry = zip.file(videoPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = videoPath.split('/').pop() || `video_${i}.mp4`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4'
              const mimeMap = { mp4: 'video/mp4', avi: 'video/x-msvideo', mov: 'video/quicktime', mkv: 'video/x-matroska', webm: 'video/webm', wmv: 'video/x-ms-wmv' }
              const fileObj = new window.File([blob], fileName, {
                type: mimeMap[ext] || `video/${ext}`
              })
              const uploadResult = await uploadToStorage(fileObj, 'video')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                videoUploadOk++
              } else {
                console.warn(`上傳影片失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                videoUploadFail++
              }
            } catch (err) {
              console.warn(`上傳影片失敗 (${mapped.name}):`, err)
              mapped.file = ''
              videoUploadFail++
            }
          } else {
            console.warn(`ZIP 中找不到影片檔案: ${videoPath}`)
            mapped.file = ''
          }
        }

        // 上傳封面圖 (covers/ 資料夾)
        const coverPath = mapped.cover
        if (coverPath && coverPath.startsWith('covers/')) {
          const zipEntry = zip.file(coverPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = coverPath.split('/').pop() || `cover_${i}.jpg`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
              const fileObj = new window.File([blob], fileName, {
                type: `image/${ext === 'jpg' ? 'jpeg' : ext}`
              })
              const uploadResult = await uploadToStorage(fileObj, 'video-covers')
              if (uploadResult.success) {
                mapped.cover = uploadResult.url
                coverUploadOk++
              } else {
                console.warn(`上傳封面失敗 (${mapped.name}):`, uploadResult.error)
                mapped.cover = ''
                coverUploadFail++
              }
            } catch (err) {
              console.warn(`上傳封面失敗 (${mapped.name}):`, err)
              mapped.cover = ''
              coverUploadFail++
            }
          } else {
            console.warn(`ZIP 中找不到封面檔案: ${coverPath}`)
            mapped.cover = ''
          }
        }

        records.push(mapped)
        console.log(`匯入進度: ${i + 1}/${parsed.length}`)
      }

      if (videoUploadFail > 0 || coverUploadFail > 0) {
        console.warn(`影片上傳: ${videoUploadOk} 成功, ${videoUploadFail} 失敗 | 封面上傳: ${coverUploadOk} 成功, ${coverUploadFail} 失敗`)
      }

    } else if (jsonFile) {
      // ===== Supabase 格式：videos.json =====
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

      if (!confirm(`確定要匯入 ${records.length} 筆影片記錄嗎？`)) return

    } else {
      alert('ZIP 檔案中找不到 video.csv 或 videos.json')
      return
    }

    // 匯入記錄到資料庫
    if (records.length > 0) {
      await importVideos(records)
      alert(`成功匯入 ${records.length} 筆影片資料`)
      await loadVideos()
    }
  } catch (error) {
    console.error('匯入失敗:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    event.target.value = ''
  }
}

// Lifecycle
onMounted(() => {
  ;(async () => {
    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem(VIDEO_DISPLAY_MODE_KEY)
      if (savedMode === 'youtube' || savedMode === 'bilibili') {
        videoDisplayMode.value = savedMode
      }
    }
    await loadVideos()
    await hydratePersistedVideoCache()
  })()
  if (typeof window !== 'undefined') {
    window.addEventListener(MEDIA_PLAY_EVENT, handleExternalMediaPlay)
  }
})

watch(videos, async () => {
  await hydratePersistedVideoCache()

  if (playingVideoId.value !== null && !videos.value.some(video => video.id === playingVideoId.value)) {
    await closeActivePlayer()
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener(MEDIA_PLAY_EVENT, handleExternalMediaPlay)
  }
  for (const [, cached] of videoCache.value) {
    URL.revokeObjectURL(cached.blobUrl)
  }
  for (const [, resolved] of resolvedVideoSources.value) {
    URL.revokeObjectURL(resolved.blobUrl)
  }
  for (const [, thumbnailSrc] of thumbnailVideoSources.value) {
    URL.revokeObjectURL(thumbnailSrc)
  }
  setPreviewSrc(formVideoPreviewSrc, '')
  setPreviewSrc(addVideoPreviewSrc, '')
  setPreviewSrc(inlineVideoPreviewSrc, '')
})

defineExpose({
  enterPictureInPictureIfPlaying
})
</script>

<style scoped>
.video-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 2rem;
}

/* ── Actions Bar ── */
.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 20px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background: #f9fafb;
}

.search-input:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.15);
  background: white;
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-export,
.btn-import {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover,
.btn-import:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-import { cursor: pointer; }

.view-switcher {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.view-switch-btn {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-switch-btn.active {
  background: white;
  color: #111827;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
}

/* ── Cache Bar ── */
.cache-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 12px;
  flex-wrap: wrap;
}

.cache-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #0369a1;
}

.cache-icon {
  font-size: 1.1rem;
}

.cache-size {
  color: #0284c7;
  font-weight: 500;
}

.cache-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-cache-all {
  padding: 0.35rem 0.85rem;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cache-all:hover:not(:disabled) {
  background: linear-gradient(135deg, #0284c7, #0369a1);
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

.loading,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #9ca3af;
  font-size: 1.1rem;
}

/* ── YouTube/Bilibili Grid ── */
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.video-grid--bilibili {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem 1.1rem;
}

@media (min-width: 1200px) {
  .video-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

/* ── Video Card ── */
.video-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.video-card--bilibili {
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fff7fb 100%);
  box-shadow: 0 10px 30px rgba(244, 114, 182, 0.10);
}

.video-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

/* ── Thumbnail Area ── */
.thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: #0f0f0f;
  overflow: hidden;
  cursor: pointer;
}

.thumbnail-img,
.thumbnail-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-card:hover .thumbnail-img,
.video-card:hover .thumbnail-video {
  transform: scale(1.05);
}

.thumbnail-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.placeholder-icon {
  font-size: 3rem;
  opacity: 0.6;
}

/* Play Overlay */
.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0);
  transition: all 0.25s ease;
  opacity: 0;
}

.video-card:hover .play-overlay {
  opacity: 1;
  background: rgba(0, 0, 0, 0.35);
}

.play-btn {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: #0f0f0f;
  transform: scale(0.8);
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding-left: 4px;
}

.video-card:hover .play-btn {
  transform: scale(1);
}

/* Filetype Tag */
.filetype-tag {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
}

/* Batch Checkbox */
.batch-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  z-index: 2;
  accent-color: #ff6b6b;
}

/* ── Video Meta ── */
.video-meta {
  padding: 0.75rem 0.875rem 0.5rem;
}

.mode-bilibili .video-meta {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  padding: 0.9rem 0.95rem 0.7rem;
}

.video-copy {
  min-width: 0;
}

.bilibili-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fb7185 0%, #f472b6 100%);
  color: white;
  font-size: 0.95rem;
  font-weight: 800;
  box-shadow: 0 10px 18px rgba(244, 114, 182, 0.28);
}

.video-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f0f0f;
  margin: 0 0 0.4rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.category-chip {
  font-size: 0.75rem;
  color: #606060;
  background: #f2f2f2;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-weight: 500;
}

.meta-ref {
  font-size: 0.75rem;
  color: #065fd4;
  cursor: pointer;
}

.video-desc {
  font-size: 0.8rem;
  color: #606060;
  line-height: 1.4;
  margin: 0.25rem 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bilibili-stats {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-top: 0.45rem;
  color: #9ca3af;
  font-size: 0.73rem;
}

.bilibili-stats span {
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: #fdf2f8;
  color: #be185d;
}

/* ── Action Buttons (hover reveal) ── */
.card-actions-bar {
  display: flex;
  gap: 0.25rem;
  padding: 0 0.75rem 0.75rem;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.2s ease;
}

.mode-bilibili .card-actions-bar {
  opacity: 1;
  transform: none;
  padding: 0 0.9rem 0.95rem;
  gap: 0.4rem;
}

.mode-bilibili .action-btn {
  background: #fff;
}

.video-card:hover .card-actions-bar {
  opacity: 1;
  transform: translateY(0);
}

.action-btn {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 0.3rem 0.65rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.edit-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.delete-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

/* ── Selected Card ── */
.video-card.is-selected {
  box-shadow: 0 0 0 2px #ff6b6b;
  cursor: pointer;
}

/* ── Modal Styles ── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease-in;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #0f0f0f;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.75rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 0.6rem 1.25rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover { background: #e5e7eb; }

.btn-submit {
  padding: 0.6rem 1.25rem;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover {
  background: #ee5a5a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

/* ── Video/Cover Preview in Modal ── */
.video-preview,
.cover-preview {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-video {
  width: 100%;
  max-height: 200px;
  border-radius: 8px;
  background: #000;
}

.preview-image {
  max-width: 200px;
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
}

.btn-remove {
  padding: 0.3rem 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.btn-remove:hover {
  background: #dc2626;
  color: white;
}

.upload-progress {
  font-size: 0.85rem;
  color: #ff6b6b;
  font-weight: 600;
}

.upload-progress-block {
  margin-top: 0.5rem;
}

.upload-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
  color: #6b7280;
}

.upload-progress-bar {
  width: 100%;
  height: 8px;
  background: #fde2e2;
  border-radius: 999px;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #ff6b6b 0%, #ee5a24 100%);
  border-radius: 999px;
  transition: width 0.2s ease;
}

/* ── Summary Bar ── */
.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-count {
  color: #ff6b6b;
  font-weight: 600;
}

.btn-add-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ff6b6b;
  background: white;
  color: #ff6b6b;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-add-icon:hover {
  background: #ff6b6b;
  color: white;
  transform: rotate(90deg);
}

.btn-batch-mode {
  padding: 0.4rem 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 18px;
  color: #6b7280;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-batch-mode:hover { background: #f3f4f6; }

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-cancel-batch {
  padding: 0.3rem 0.6rem;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 15px;
  color: #6b7280;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-cancel-batch:hover { background: #f3f4f6; }

.btn-batch-delete {
  padding: 0.4rem 0.75rem;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-batch-delete:hover {
  background: #ee5a5a;
  transform: translateY(-1px);
}

.btn-batch-delete:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Inline Edit Styles ── */
.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.inline-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.inline-form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.inline-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.inline-input:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.inline-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box;
}

.inline-textarea:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.inline-video-preview {
  border-radius: 8px;
  overflow: hidden;
  margin-top: 0.25rem;
}

.card-video {
  width: 100%;
  display: block;
}

.inline-cover-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.preview-cover-img {
  width: 80px;
  height: 45px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.btn-remove-sm {
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove-sm:hover { background: #dc2626; color: white; }

.inline-edit-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-save {
  padding: 0.45rem 1rem;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  background: #ee5a5a;
  transform: translateY(-1px);
}

.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-cancel-inline {
  padding: 0.45rem 1rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 18px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-inline:hover { background: #e5e7eb; }

.upload-area {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-upload {
  padding: 0.35rem 0.7rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upload:hover { background: #e5e7eb; }
.btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }

.selected-file-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.selected-file-summary {
  font-size: 0.8rem;
  color: #4b5563;
  font-weight: 600;
}

.selected-file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.selected-file-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #fff1f2;
  color: #be123c;
  font-size: 0.75rem;
  line-height: 1.3;
  word-break: break-all;
}

/* Active Player */
.player-wrapper {
  position: relative;
  width: 100%;
  background: #000;
}

.active-player {
  width: 100%;
  display: block;
  max-height: 300px;
}

.player-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  z-index: 2;
}

.pip-player-btn,
.close-player-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.pip-player-btn {
  min-width: 92px;
  height: 32px;
  padding: 0 0.8rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.88);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.pip-player-btn:hover {
  background: rgba(29, 78, 216, 0.96);
  transform: translateY(-1px);
}

.close-player-btn {
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  border-radius: 50%;
  font-size: 0.85rem;
}

.close-player-btn:hover {
  background: rgba(255, 107, 107, 0.9);
  transform: scale(1.1);
}

.shared-video-panel {
  position: fixed;
  right: 1.25rem;
  bottom: 5rem;
  z-index: 1200;
  display: grid;
  gap: 0.9rem;
  width: min(460px, calc(100vw - 2rem));
  padding: 1rem;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96) 0%, rgba(245, 243, 255, 0.98) 100%);
  box-shadow: 0 16px 32px rgba(59, 130, 246, 0.12);
  backdrop-filter: blur(12px);
}

.shared-video-stage {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
}

.shared-video-copy {
  min-width: 0;
}

.shared-video-kicker {
  margin: 0 0 0.2rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #2563eb;
}

.shared-video-copy h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #111827;
}

.shared-video-copy p {
  margin: 0.2rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.shared-video-collapse {
  margin-top: 0.6rem;
  align-self: flex-start;
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.play-card-btn {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: white;
}

.play-card-btn:hover {
  filter: brightness(1.05);
}

@media (max-width: 768px) {
  .shared-video-panel {
    right: 0.75rem;
    bottom: 4.5rem;
    width: calc(100vw - 1.5rem);
  }
}
</style>
