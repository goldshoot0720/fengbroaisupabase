<template>
  <PageContainer>
    <div class="podcast-page">
      <!-- ══ Spotify 式節目標頭 ══ -->
      <header class="pc-hero">
        <div class="pc-hero-art" aria-hidden="true">
          <img v-if="heroCover" :src="heroCover" alt="" class="pc-hero-img" />
          <span v-else class="pc-hero-note">🎙</span>
        </div>
        <div class="pc-hero-copy">
          <p class="pc-hero-label">Podcast</p>
          <h1 class="pc-hero-title">鋒兄播客</h1>
          <p class="pc-hero-meta">
            <span class="pc-hero-owner"><span class="pc-owner-dot">鋒</span> 鋒兄</span>
            <span class="pc-dot">·</span>
            <span>{{ podcasts.length }} 集</span>
            <span class="pc-dot">·</span>
            <span>{{ categoryChips.length - 1 }} 個分類</span>
          </p>
        </div>
      </header>

      <!-- ══ 控制列 ══ -->
      <div class="pc-actions">
        <button
          class="pc-play-big"
          :title="isPlaying ? '暫停' : '從第一集開始播放'"
          :disabled="playableEpisodes.length === 0"
          @click="isPlaying ? togglePlay() : playAll()"
        >
          {{ isPlaying ? '❚❚' : '▶' }}
        </button>
        <button class="pc-ghost-btn" title="新增播客" @click="openInlineAdd">＋</button>
        <button class="pc-ghost-btn" title="匯出 ZIP" @click="exportToZIP">📤</button>
        <label class="pc-ghost-btn" title="匯入 ZIP">
          📥
          <input type="file" accept=".zip" @change="handleImportZIP" style="display: none" />
        </label>
        <div class="pc-actions-spacer"></div>
        <div class="search-box search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋播客名稱..."
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <button v-if="!batchMode && filteredPodcasts.length > 0" @click="enterBatchMode" class="pc-text-btn">選取</button>
        <template v-if="batchMode">
          <label class="select-all-label"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /><span>全選</span></label>
          <button @click="exitBatchMode" class="pc-text-btn">取消</button>
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除 ({{ selectedIds.size }})</button>
        </template>
      </div>

      <!-- 分類膠囊 -->
      <div v-if="categoryChips.length > 1" class="pc-chips" role="tablist" aria-label="分類篩選">
        <button
          v-for="chip in categoryChips"
          :key="chip.value"
          type="button"
          role="tab"
          class="pc-chip"
          :class="{ active: activeCategory === chip.value }"
          :aria-selected="activeCategory === chip.value"
          @click="activeCategory = chip.value"
        >
          {{ chip.label }} <span class="pc-chip-count">{{ chip.count }}</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>載入中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPodcasts.length === 0 && !isAddingInline" class="empty-state">
        <span class="empty-icon" aria-hidden="true">🎙</span>
        <p v-if="searchQuery || activeCategory !== 'all'">找不到符合的播客</p>
        <p v-else>尚無播客記錄，點擊「＋」開始建立</p>
      </div>

      <!-- ══ 集數列表 ══ -->
      <div v-if="isAddingInline || filteredPodcasts.length > 0" class="podcasts-grid">
        <h2 v-if="filteredPodcasts.length > 0" class="pc-section-title">所有集數</h2>

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="podcast-card card-editing">
          <div class="card-header">
            <div class="card-header-left">
              <input v-model="addForm.name" type="text" class="inline-input inline-title-input" placeholder="播客名稱 *" style="flex:1" />
            </div>
            <div class="card-header-right">
              <button @click="saveInlineAdd" class="btn-icon" title="儲存">💾</button>
              <button @click="cancelInlineAdd" class="btn-icon" title="取消">✕</button>
            </div>
          </div>
          <div class="inline-edit-form">
            <div class="inline-row"><label>分類</label><input v-model="addForm.category" class="inline-input" placeholder="分類" /></div>
            <div class="inline-row"><label>備註</label><textarea v-model="addForm.note" class="inline-textarea" rows="2" placeholder="備註"></textarea></div>
            <div class="inline-row">
              <label>音檔</label>
              <div class="inline-upload-group">
                <input
                  ref="addAudioFileInput"
                  type="file"
                  accept="audio/*"
                  @change="handleAddAudioUpload"
                  style="display:none"
                />
                <button type="button" @click="$refs.addAudioFileInput.click()" class="btn-inline-upload" :disabled="addAudioUploading">
                  {{ addAudioUploading ? '上傳中...' : '🎵 上傳音檔' }}
                </button>
                <input v-model="addForm.file" class="inline-input" placeholder="或輸入音檔 URL" />
              </div>
            </div>
            <div class="inline-row"><label>格式</label><input v-model="addForm.filetype" class="inline-input" placeholder="例如 mp3" /></div>
            <div class="inline-row">
              <label>封面</label>
              <div class="inline-upload-group">
                <input
                  ref="addCoverFileInput"
                  type="file"
                  accept="image/*"
                  @change="handleAddCoverUpload"
                  style="display:none"
                />
                <button type="button" @click="$refs.addCoverFileInput.click()" class="btn-inline-upload" :disabled="addCoverUploading">
                  {{ addCoverUploading ? '上傳中...' : '🖼️ 上傳封面' }}
                </button>
                <input v-model="addForm.cover" class="inline-input" placeholder="或輸入封面 URL" />
              </div>
            </div>
            <div v-if="addForm.cover" class="inline-cover-preview">
              <img :src="addForm.cover" alt="封面預覽" />
            </div>
            <div class="inline-row"><label>參考</label><input v-model="addForm.ref" class="inline-input" placeholder="參考連結" /></div>
          </div>
        </div>

        <div
          v-for="(podcast, pi) in filteredPodcasts"
          :key="podcast.id"
          class="podcast-card"
          :class="{
            selected: selectedIds.has(podcast.id),
            'card-editing': inlineEditId === podcast.id,
            'is-current': currentEpisodeId === podcast.id
          }"
        >
          <!-- 行內編輯模式 -->
          <template v-if="inlineEditId === podcast.id">
            <div class="card-header">
              <div class="card-header-left">
                <input v-model="inlineForm.name" class="inline-input inline-title-input" placeholder="名稱" />
              </div>
            </div>
            <div class="inline-edit-form">
              <div class="inline-row">
                <label>分類</label>
                <input v-model="inlineForm.category" class="inline-input" placeholder="分類" />
              </div>
              <div class="inline-row">
                <label>備註</label>
                <textarea v-model="inlineForm.note" class="inline-textarea" rows="2" placeholder="備註"></textarea>
              </div>
              <div class="inline-row">
                <label>音檔</label>
                <div class="inline-upload-group">
                  <input
                    :ref="el => inlineAudioInputs[podcast.id] = el"
                    type="file"
                    accept="audio/*"
                    @change="(e) => handleInlineAudioUpload(e, podcast.id)"
                    style="display:none"
                  />
                  <button type="button" @click="inlineAudioInputs[podcast.id]?.click()" class="btn-inline-upload" :disabled="inlineAudioUploading">
                    {{ inlineAudioUploading ? '上傳中...' : '🎵 上傳音檔' }}
                  </button>
                  <input v-model="inlineForm.file" class="inline-input" placeholder="或輸入音檔 URL" />
                </div>
              </div>
              <div class="inline-row">
                <label>格式</label>
                <input v-model="inlineForm.filetype" class="inline-input" placeholder="例如 mp3" />
              </div>
              <div class="inline-row">
                <label>封面</label>
                <div class="inline-upload-group">
                  <input
                    :ref="el => inlineCoverInputs[podcast.id] = el"
                    type="file"
                    accept="image/*"
                    @change="(e) => handleInlineCoverUpload(e, podcast.id)"
                    style="display:none"
                  />
                  <button type="button" @click="inlineCoverInputs[podcast.id]?.click()" class="btn-inline-upload" :disabled="inlineCoverUploading">
                    {{ inlineCoverUploading ? '上傳中...' : '🖼️ 上傳封面' }}
                  </button>
                  <input v-model="inlineForm.cover" class="inline-input" placeholder="或輸入封面 URL" />
                </div>
              </div>
              <div v-if="inlineForm.cover" class="inline-cover-preview">
                <img :src="inlineForm.cover" alt="封面預覽" />
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
          </template>

          <!-- ══ 集數列 ══ -->
          <template v-else>
            <div class="pc-episode" @dblclick="podcast.file && playEpisode(podcast)">
              <input
                v-if="batchMode"
                type="checkbox"
                :checked="selectedIds.has(podcast.id)"
                @change="toggleSelect(podcast.id)"
                class="card-checkbox"
              />
              <div class="pc-ep-art">
                <img v-if="podcast.cover" :src="resolveMediaUrl(podcast.cover)" :alt="podcast.name" loading="lazy" />
                <span v-else class="pc-ep-art-note">🎙</span>
              </div>

              <div class="pc-ep-copy">
                <h3 class="card-title">{{ podcast.name || '未命名' }}</h3>
                <div class="pc-ep-meta">
                  <span class="pc-ep-index">EP {{ String(pi + 1).padStart(2, '0') }}</span>
                  <span v-if="podcast.category" class="category-badge">{{ podcast.category }}</span>
                  <span v-if="podcast.filetype" class="pc-type-badge">{{ podcast.filetype.toUpperCase() }}</span>
                  <span v-if="currentEpisodeId === podcast.id" class="pc-now-tag">播放中</span>
                </div>
                <p v-if="podcast.note" class="note-preview">{{ truncateText(podcast.note, 130) }}</p>
                <div class="pc-ep-tools">
                  <button
                    class="pc-ep-play"
                    :disabled="!podcast.file"
                    :title="currentEpisodeId === podcast.id && isPlaying ? '暫停' : '播放'"
                    @click="currentEpisodeId === podcast.id ? togglePlay() : playEpisode(podcast)"
                  >
                    <span aria-hidden="true">{{ currentEpisodeId === podcast.id && isPlaying ? '❚❚' : '▶' }}</span>
                    {{ currentEpisodeId === podcast.id && isPlaying ? '暫停' : '播放' }}
                  </button>
                  <a
                    v-if="podcast.file"
                    :href="resolveMediaUrl(podcast.file)"
                    :download="podcast.name || 'podcast'"
                    target="_blank"
                    rel="noopener"
                    class="btn-icon"
                    title="下載"
                  >⬇</a>
                  <a
                    v-if="podcast.ref"
                    :href="podcast.ref"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-icon"
                    title="參考連結"
                  >🔗</a>
                  <button @click="startInlineEdit(podcast)" class="btn-icon" title="編輯">✎</button>
                  <button @click="confirmDelete(podcast)" class="btn-icon btn-icon-delete" title="刪除">✕</button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ══ 底部播放列 ══ -->
      <footer v-if="currentEpisode" class="pc-player">
        <div class="pc-player-now">
          <span class="pc-player-art">
            <img v-if="currentEpisode.cover" :src="resolveMediaUrl(currentEpisode.cover)" :alt="currentEpisode.name" />
            <span v-else class="pc-ep-art-note">🎙</span>
          </span>
          <span class="pc-player-copy">
            <strong>{{ currentEpisode.name || '未命名' }}</strong>
            <span>{{ currentEpisode.category || '鋒兄播客' }}</span>
          </span>
        </div>

        <div class="pc-player-center">
          <div class="pc-transport">
            <button class="pc-t-btn" title="倒轉 15 秒" @click="skipSeconds(-15)">↺15</button>
            <button class="pc-t-btn" title="上一集" :disabled="playableEpisodes.length < 2" @click="playPrevEpisode">⏮</button>
            <button class="pc-t-btn pc-t-btn--play" :title="isPlaying ? '暫停' : '播放'" @click="togglePlay">
              {{ isPlaying ? '❚❚' : '▶' }}
            </button>
            <button class="pc-t-btn" title="下一集" :disabled="playableEpisodes.length < 2" @click="playNextEpisode">⏭</button>
            <button class="pc-t-btn" title="快轉 30 秒" @click="skipSeconds(30)">30↻</button>
          </div>
          <div class="pc-scrub">
            <span class="pc-time">{{ formatTime(playerCurrentTime) }}</span>
            <input
              class="pc-progress"
              type="range"
              min="0"
              :max="Math.max(playerDuration, 0.1)"
              step="0.1"
              :value="playerCurrentTime"
              :style="{ '--played': `${playedPercent}%` }"
              aria-label="播放進度"
              @input="seekTo($event.target.value)"
            />
            <span class="pc-time">{{ formatTime(playerDuration) }}</span>
          </div>
        </div>

        <div class="pc-player-right">
          <label class="pc-speed">
            <span class="sr-only">播放速度</span>
            <select :value="playbackRate" aria-label="播放速度" @change="setPlaybackRate($event.target.value)">
              <option v-for="rate in speedOptions" :key="rate" :value="rate">{{ rate }}x</option>
            </select>
          </label>
          <button class="pc-t-btn" :title="isMuted ? '取消靜音' : '靜音'" @click="toggleMute">
            {{ isMuted || volume === 0 ? '🔇' : volume < 0.45 ? '🔉' : '🔊' }}
          </button>
          <input
            class="pc-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="isMuted ? 0 : volume"
            aria-label="音量"
            @input="setVolume($event.target.value)"
          />
        </div>

        <audio
          ref="playerAudioRef"
          class="audio-player pc-audio"
          :src="currentEpisode.file ? resolveMediaUrl(currentEpisode.file) : ''"
          @play="onPlayerPlay"
          @pause="onPlayerPause"
          @timeupdate="onPlayerTimeUpdate"
          @loadedmetadata="onPlayerLoaded"
          @volumechange="onPlayerVolumeChange"
          @ended="onPlayerEnded"
        ></audio>
      </footer>

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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { usePodcasts } from '../../composables/usePodcasts'
import { useStorage } from '../../composables/useStorage'
import { usePersistentAudioPlayer } from '../../composables/usePersistentAudioPlayer'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'

// Set page title
useHead({
  title: '鋒兄播客 - 鋒兄AI Supabase'
})

// Composable
const { podcasts, loading, FIELDS, loadPodcasts, addPodcast, updatePodcast, deletePodcast, importPodcasts } = usePodcasts()
const {
  currentTrack: persistentAudioTrack,
  snapshotFromElement,
  pauseGlobal,
  takeoverFromElement,
  restoreToElement,
  releaseLocalSession
} = usePersistentAudioPlayer()

// State
const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-podcast-search-history', searchQuery)
const showModal = ref(false)
const isEditMode = ref(false)
const currentPodcast = ref(null)

// Batch mode state
const batchMode = ref(false)
const selectedIds = ref(new Set())

// Upload state
const audioFileInput = ref(null)
const coverFileInput = ref(null)
const { uploadFile, getPublicUrl } = useStorage()

const resolveMediaUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value
  return getPublicUrl(value) || value
}
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
const inlineAudioUploading = ref(false)
const inlineCoverUploading = ref(false)
const inlineAudioInputs = {}
const inlineCoverInputs = {}

// Inline add upload state
const addAudioUploading = ref(false)
const addCoverUploading = ref(false)
const podcastAudioRefs = new Map()

const setPodcastAudioRef = (id, element) => {
  if (!id) return
  if (element) {
    podcastAudioRefs.set(id, element)
  } else {
    podcastAudioRefs.delete(id)
  }
}

const getPodcastTrackMeta = (podcast) => {
  if (!podcast) return null
  return {
    id: podcast.id,
    name: podcast.name || 'Podcast',
    src: resolveMediaUrl(podcast.file || ''),
    cover: resolveMediaUrl(podcast.cover || ''),
    meta: podcast.category || podcast.filetype || 'Podcast'
  }
}

// Inline edit: upload audio
const handleInlineAudioUpload = async (event, podcastId) => {
  const file = event.target.files?.[0]
  if (!file) return
  inlineAudioUploading.value = true
  try {
    const result = await uploadFile(file, 'podcast')
    if (result.success) {
      inlineForm.value.file = result.url
      const ext = file.name.split('.').pop()
      if (ext && !inlineForm.value.filetype) inlineForm.value.filetype = ext
      alert('音檔上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('上傳失敗: ' + err.message)
  } finally {
    inlineAudioUploading.value = false
  }
}

// Inline edit: upload cover
const handleInlineCoverUpload = async (event, podcastId) => {
  const file = event.target.files?.[0]
  if (!file) return
  inlineCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'podcast-covers')
    if (result.success) {
      inlineForm.value.cover = result.url
      alert('封面上傳成功！')
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('封面上傳失敗: ' + err.message)
  } finally {
    inlineCoverUploading.value = false
  }
}

// Inline add: upload audio
const handleAddAudioUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  addAudioUploading.value = true
  try {
    const result = await uploadFile(file, 'podcast')
    if (result.success) {
      addForm.value.file = result.url
      const ext = file.name.split('.').pop()
      if (ext) addForm.value.filetype = ext
      if (!addForm.value.name) addForm.value.name = file.name.replace(/\.[^/.]+$/, '')
      alert('音檔上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('上傳失敗: ' + err.message)
  } finally {
    addAudioUploading.value = false
  }
}

// Inline add: upload cover
const handleAddCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  addCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'podcast-covers')
    if (result.success) {
      addForm.value.cover = result.url
      alert('封面上傳成功！')
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('封面上傳失敗: ' + err.message)
  } finally {
    addCoverUploading.value = false
  }
}

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
const handlePodcastPlay = async (event, podcast) => {
  const element = event?.target
  if (!element || !podcast?.file) return

  pauseOthers(event)

  const track = getPodcastTrackMeta(podcast)
  if (!track) return

  if (!persistentAudioTrack.value || persistentAudioTrack.value.id !== track.id) {
    pauseGlobal()
  }

  const restored = await restoreToElement(element, track)
  snapshotFromElement(element, track, { playing: restored ? true : !element.paused })
}

const handlePodcastPause = (event, podcast) => {
  const element = event?.target
  const track = getPodcastTrackMeta(podcast)
  if (!element || !track) return
  // Only sync pause for the active session — ignore pauseOthers side-effects.
  if (!persistentAudioTrack.value || persistentAudioTrack.value.id !== track.id) return
  snapshotFromElement(element, track, { playing: false })
}

const handlePodcastProgress = (event, podcast) => {
  const element = event?.target
  const track = getPodcastTrackMeta(podcast)
  if (!element || !track) return
  // Avoid non-active tracks / metadata events opening a floating session.
  if (!persistentAudioTrack.value || persistentAudioTrack.value.id !== track.id) return
  snapshotFromElement(element, track, { playing: !element.paused })
}

const activeCategory = ref('all')

const filteredPodcasts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const category = activeCategory.value
  return podcasts.value.filter((podcast) => {
    if (query && !podcast.name?.toLowerCase().includes(query)) return false
    if (category === 'all') return true
    if (category === '__uncategorized__') return !podcast.category
    return podcast.category === category
  })
})

/** 分類膠囊 */
const categoryChips = computed(() => {
  const counts = new Map()
  let uncategorized = 0
  podcasts.value.forEach((podcast) => {
    if (podcast.category) counts.set(podcast.category, (counts.get(podcast.category) || 0) + 1)
    else uncategorized += 1
  })
  const chips = [{ value: 'all', label: '全部', count: podcasts.value.length }]
  Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([label, count]) => chips.push({ value: label, label, count }))
  if (uncategorized > 0) chips.push({ value: '__uncategorized__', label: '未分類', count: uncategorized })
  return chips
})

const heroCover = computed(() => {
  const withCover = podcasts.value.find((podcast) => podcast.cover)
  return withCover ? resolveMediaUrl(withCover.cover) : ''
})

/* ══════════ Spotify 式單一播放器 ══════════ */
const playerAudioRef = ref(null)
const currentEpisodeId = ref(null)
const isPlaying = ref(false)
const playerCurrentTime = ref(0)
const playerDuration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const playbackRate = ref(1)
const speedOptions = [0.75, 1, 1.25, 1.5, 1.75, 2]

const playableEpisodes = computed(() => filteredPodcasts.value.filter((podcast) => podcast.file))
const currentEpisode = computed(() =>
  podcasts.value.find((podcast) => podcast.id === currentEpisodeId.value) || null
)
const playedPercent = computed(() => {
  if (!playerDuration.value) return 0
  return Math.min(100, (playerCurrentTime.value / playerDuration.value) * 100)
})

function formatTime(seconds) {
  const total = Number(seconds)
  if (!Number.isFinite(total) || total < 0) return '0:00'
  const hours = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = Math.floor(total % 60)
  if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${mins}:${String(secs).padStart(2, '0')}`
}

async function playEpisode(podcast) {
  if (!podcast?.file) return
  if (currentEpisodeId.value !== podcast.id) {
    currentEpisodeId.value = podcast.id
    playerCurrentTime.value = 0
    playerDuration.value = 0
    await nextTick()
  }
  const element = playerAudioRef.value
  if (!element) return
  try {
    element.volume = isMuted.value ? 0 : volume.value
    element.playbackRate = playbackRate.value
    await element.play()
  } catch (err) {
    console.error('播放失敗:', err)
  }
}

function playAll() {
  const first = playableEpisodes.value[0]
  if (first) playEpisode(first)
}

async function togglePlay() {
  const element = playerAudioRef.value
  if (!element) {
    playAll()
    return
  }
  if (element.paused) {
    try { await element.play() } catch (err) { console.error('播放失敗:', err) }
  } else {
    element.pause()
  }
}

function stepEpisode(step) {
  const list = playableEpisodes.value
  if (list.length === 0) return
  const index = list.findIndex((podcast) => podcast.id === currentEpisodeId.value)
  const next = index < 0 ? 0 : (index + step + list.length) % list.length
  playEpisode(list[next])
}

const playNextEpisode = () => stepEpisode(1)
const playPrevEpisode = () => stepEpisode(-1)

function skipSeconds(offset) {
  const element = playerAudioRef.value
  if (!element) return
  const next = Math.min(Math.max(0, element.currentTime + offset), element.duration || Infinity)
  element.currentTime = next
  playerCurrentTime.value = next
}

function seekTo(value) {
  const element = playerAudioRef.value
  const time = Number(value)
  if (!element || !Number.isFinite(time)) return
  element.currentTime = time
  playerCurrentTime.value = time
}

function setVolume(value) {
  const next = Math.min(1, Math.max(0, Number(value) || 0))
  volume.value = next
  isMuted.value = next === 0
  if (playerAudioRef.value) {
    playerAudioRef.value.volume = next
    playerAudioRef.value.muted = next === 0
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (playerAudioRef.value) {
    playerAudioRef.value.muted = isMuted.value
    if (!isMuted.value && volume.value === 0) {
      volume.value = 0.6
      playerAudioRef.value.volume = 0.6
    }
  }
}

function setPlaybackRate(rate) {
  const next = Number(rate) || 1
  playbackRate.value = next
  if (playerAudioRef.value) playerAudioRef.value.playbackRate = next
}

async function onPlayerPlay(event) {
  isPlaying.value = true
  await handlePodcastPlay(event, currentEpisode.value)
}

function onPlayerPause(event) {
  isPlaying.value = false
  handlePodcastPause(event, currentEpisode.value)
}

function onPlayerTimeUpdate(event) {
  playerCurrentTime.value = event.target.currentTime || 0
  handlePodcastProgress(event, currentEpisode.value)
}

function onPlayerLoaded(event) {
  playerDuration.value = event.target.duration || 0
  event.target.volume = isMuted.value ? 0 : volume.value
  event.target.playbackRate = playbackRate.value
}

function onPlayerVolumeChange(event) {
  volume.value = event.target.volume
  isMuted.value = event.target.muted || event.target.volume === 0
}

function onPlayerEnded() {
  if (playableEpisodes.value.length > 1) playNextEpisode()
  else isPlaying.value = false
}

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

// 行內新增
const isAddingInline = ref(false)
const addForm = ref({ name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
const openInlineAdd = () => { addForm.value = { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' }; isAddingInline.value = true }
const cancelInlineAdd = () => { isAddingInline.value = false }
const saveInlineAdd = async () => {
  if (!addForm.value.name) { alert('請輸入播客名稱'); return }
  try { await addPodcast(addForm.value); isAddingInline.value = false } catch(e) { alert('新增失敗: ' + e.message) }
}

// Methods
const openAddModal = () => {
  isEditMode.value = false
  currentPodcast.value = null
  formData.value = { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' }
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
    updateImportProgress({
      active: true,
      title: '📦 匯出 ZIP 中...',
      step: '打包播客音檔',
      current: 0,
      total: podcasts.value.length,
      stats: null,
      itemName: ''
    })
    const { exportRecordsAsMediaZip } = await import('../../utils/zipMediaBundle')
    const stats = await exportRecordsAsMediaZip({
      records: podcasts.value,
      jsonFileName: 'podcasts.json',
      downloadName: 'supabase-podcast.zip',
      mediaMap: {
        file: { folder: 'podcast', fallbackExt: 'mp3' },
        cover: { folder: 'covers', fallbackExt: 'jpg' }
      },
      resolveUrl: resolveMediaUrl,
      onProgress: ({ stage, current, total, percent, stats: packStats }) => {
        if (stage === 'media') {
          updateImportProgress({
            step: '打包播客音檔',
            current: current || 0,
            total: total || podcasts.value.length,
            itemName: `成功 ${packStats?.ok || 0} / 失敗 ${packStats?.fail || 0}`
          })
        } else {
          updateImportProgress({
            step: '壓縮 ZIP',
            current: podcasts.value.length,
            total: podcasts.value.length,
            itemName: `${percent || 0}%`
          })
        }
      }
    })
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
      // ===== Supabase 格式：podcasts.json（可含 podcast/、covers/ 媒體）=====
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
      if (!confirm(`確定要匯入 ${records.length} 筆播客記錄嗎？\n若 ZIP 內含音檔/封面，會自動上傳。`)) return

      updateImportProgress({
        active: true,
        title: '🎧 匯入播客中...',
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
          file: { prefixes: ['podcast/', 'media/'], storageFolder: 'podcast', mimeFallback: 'audio/mpeg', filetypeField: 'filetype' },
          cover: { prefixes: ['covers/'], storageFolder: 'podcast-covers', mimeFallback: 'image/jpeg' }
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

onBeforeUnmount(async () => {
  const element = playerAudioRef.value
  const track = getPodcastTrackMeta(currentEpisode.value)
  if (element && track?.src && !element.paused && !element.ended) {
    await takeoverFromElement(element, track)
    return
  }
  // Not actively playing: drop local session so the bar does not pop up after leave.
  releaseLocalSession()
})
</script>

<style scoped>
/* ============================================================
   鋒兄播客 — Spotify Podcast 風格
   · 節目標頭、綠色播放鍵、集數清單、底部播放列（含 15/30 秒跳轉與變速）
   ============================================================ */
.podcast-page {
  --pc-green: #1db954;
  --pc-green-hi: #1ed760;
  --pc-bg: #121212;
  --pc-bg-2: #181818;
  --pc-bg-3: #242424;
  --pc-bg-4: #2c2c2c;
  --pc-line: rgba(255, 255, 255, 0.09);
  --pc-text: #ffffff;
  --pc-text-2: #b3b3b3;
  --pc-text-3: #7d7d7d;
  --pc-danger: #f15e6c;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding-bottom: var(--sp-4);
  border-radius: var(--radius-lg);
  overflow: clip; /* clip 不建立捲動容器，底部播放列的 sticky 才有效 */
  background: var(--pc-bg);
  color: var(--pc-text);
  font-family: var(--font-body);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ══════════ 節目標頭 ══════════ */
.pc-hero {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-5);
  padding: var(--sp-8) var(--sp-6) var(--sp-5);
  background: linear-gradient(180deg, #4a2f6b 0%, #2c1f43 42%, var(--pc-bg) 100%);
}

.pc-hero-art {
  flex: 0 0 auto;
  width: 168px;
  height: 168px;
  border-radius: var(--radius-md);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #3d3d3d, #1a1a1a);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.55);
}

.pc-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-hero-note {
  font-size: 3.25rem;
}

.pc-hero-copy {
  min-width: 0;
  padding-bottom: var(--sp-2);
}

.pc-hero-label {
  margin: 0 0 var(--sp-2);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--pc-text-2);
}

.pc-hero-title {
  margin: 0 0 var(--sp-3);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.2rem + 3vw, 3.5rem);
  font-weight: 700;
  line-height: 1.04;
  letter-spacing: -0.03em;
}

.pc-hero-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  margin: 0;
  font-size: var(--text-sm);
  color: var(--pc-text-2);
}

.pc-hero-owner {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-weight: 600;
  color: var(--pc-text);
}

.pc-owner-dot {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--pc-green);
  color: #06120b;
  font-family: var(--font-display);
  font-size: 0.6875rem;
  font-weight: 700;
}

.pc-dot {
  color: var(--pc-text-3);
}

/* ══════════ 控制列 ══════════ */
.pc-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: 0 var(--sp-6);
}

.pc-play-big {
  width: 54px;
  height: 54px;
  border: none;
  border-radius: 50%;
  background: var(--pc-green);
  color: #06120b;
  font-size: 1.25rem;
  padding-left: 3px;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.pc-play-big:hover:not(:disabled) {
  transform: scale(1.06);
  background: var(--pc-green-hi);
}

.pc-play-big:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pc-ghost-btn {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--pc-text-2);
  font-size: 1rem;
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.pc-ghost-btn:hover {
  color: var(--pc-text);
  background: rgba(255, 255, 255, 0.08);
}

.pc-actions-spacer {
  flex: 1;
}

.search-area {
  flex: 0 1 260px;
  min-width: 180px;
}

.search-area :deep(input) {
  height: 34px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  background: var(--pc-bg-3);
  color: var(--pc-text);
  font-size: var(--text-sm);
}

.search-area :deep(input::placeholder) {
  color: var(--pc-text-3);
}

.search-area :deep(input:focus) {
  outline: none;
  border-color: var(--pc-text-2);
  background: var(--pc-bg-4);
}

.pc-text-btn {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--pc-line);
  background: transparent;
  color: var(--pc-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.pc-text-btn:hover {
  color: var(--pc-text);
  border-color: var(--pc-text-2);
}

.select-all-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--pc-text-2);
  cursor: pointer;
}

.select-all-label input,
.card-checkbox {
  accent-color: var(--pc-green);
  cursor: pointer;
}

.btn-batch-delete {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid color-mix(in oklab, var(--pc-danger) 50%, transparent);
  background: transparent;
  color: var(--pc-danger);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-batch-delete:hover:not(:disabled) {
  background: var(--pc-danger);
  color: #fff;
}

.btn-batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ══════════ 分類膠囊 ══════════ */
.pc-chips {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
  padding: 0 var(--sp-6) var(--sp-1);
  scrollbar-width: none;
}

.pc-chips::-webkit-scrollbar {
  display: none;
}

.pc-chip {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 var(--sp-4);
  border: none;
  border-radius: var(--radius-full);
  background: var(--pc-bg-3);
  color: var(--pc-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pc-chip:hover {
  background: var(--pc-bg-4);
  color: var(--pc-text);
}

.pc-chip.active {
  background: var(--pc-text);
  color: #121212;
  font-weight: 600;
}

.pc-chip-count {
  font-family: var(--font-mono);
  font-size: 10px;
  opacity: 0.7;
}

/* ══════════ 狀態 ══════════ */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-16) var(--sp-4);
  color: var(--pc-text-3);
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid var(--pc-bg-4);
  border-top-color: var(--pc-green);
  animation: pcSpin 0.8s linear infinite;
}

@keyframes pcSpin {
  to { transform: rotate(360deg); }
}

/* ══════════ 集數列表 ══════════ */
.podcasts-grid {
  display: flex;
  flex-direction: column;
  padding: 0 var(--sp-6);
}

.pc-section-title {
  margin: 0 0 var(--sp-2);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
}

.podcast-card {
  border-bottom: 1px solid var(--pc-line);
}

.podcast-card.selected {
  background: rgba(29, 185, 84, 0.1);
}

.pc-episode {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.pc-episode:hover {
  background: rgba(255, 255, 255, 0.05);
}

.podcast-card.is-current .card-title {
  color: var(--pc-green);
}

.pc-ep-art {
  flex: 0 0 auto;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--pc-bg-3);
}

.pc-ep-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-ep-art-note {
  font-size: 1.75rem;
  color: var(--pc-text-3);
}

.pc-ep-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.card-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--pc-text);
  line-height: 1.3;
}

.pc-ep-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.pc-ep-index {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  color: var(--pc-text-3);
}

.category-badge {
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: rgba(29, 185, 84, 0.16);
  color: var(--pc-green);
}

.pc-type-badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--pc-bg-3);
  color: var(--pc-text-2);
}

.pc-now-tag {
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--pc-green);
  color: #06120b;
  font-weight: 600;
}

.note-preview {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--pc-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pc-ep-tools {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.pc-ep-play {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: 32px;
  padding: 0 var(--sp-4);
  border: none;
  border-radius: var(--radius-full);
  background: var(--pc-text);
  color: #121212;
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.pc-ep-play:hover:not(:disabled) {
  background: var(--pc-green);
  color: #06120b;
  transform: scale(1.03);
}

.pc-ep-play:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--pc-text-2);
  font-size: 0.8125rem;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--pc-text);
}

.btn-icon-delete:hover {
  color: var(--pc-danger);
}

/* ══════════ 行內編輯 ══════════ */
.podcast-card.card-editing {
  border: 1px solid var(--pc-line);
  border-left: 4px solid var(--pc-green);
  border-radius: var(--radius-md);
  background: var(--pc-bg-2);
  padding: var(--sp-4);
  margin: var(--sp-2) 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.card-header-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.card-header-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.inline-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.inline-row > label {
  flex: 0 0 60px;
  padding-top: 8px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--pc-text-3);
}

.inline-input,
.inline-textarea {
  flex: 1;
  min-width: 160px;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--pc-line);
  background: var(--pc-bg-3);
  color: var(--pc-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.inline-input:focus,
.inline-textarea:focus {
  outline: none;
  border-color: var(--pc-green);
  box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.2);
}

.inline-textarea {
  resize: vertical;
}

.inline-title-input {
  font-size: var(--text-md);
  font-weight: 600;
}

.inline-upload-group {
  flex: 1;
  min-width: 200px;
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  align-items: center;
}

.btn-inline-upload {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px dashed var(--pc-line);
  background: transparent;
  color: var(--pc-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-inline-upload:hover:not(:disabled) {
  border-color: var(--pc-green);
  color: var(--pc-green);
}

.btn-inline-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inline-cover-preview img {
  width: 110px;
  height: 110px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--pc-line);
}

.inline-actions {
  display: flex;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--pc-line);
}

.btn-inline-save {
  height: 32px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: none;
  background: var(--pc-green);
  color: #06120b;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
}

.btn-inline-save:hover {
  background: var(--pc-green-hi);
}

.btn-inline-cancel {
  height: 32px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--pc-line);
  background: transparent;
  color: var(--pc-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-inline-cancel:hover {
  color: var(--pc-text);
  border-color: var(--pc-text-2);
}

/* ══════════ 底部播放列 ══════════ */
.pc-player {
  position: sticky;
  bottom: 0;
  z-index: var(--z-sticky);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-4);
  margin-top: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  background: #000;
  border-top: 1px solid var(--pc-line);
}

.pc-player-now {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}

.pc-player-art {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--pc-bg-3);
}

.pc-player-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pc-player-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pc-player-copy strong {
  font-size: var(--text-sm);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-player-copy span {
  font-size: var(--text-2xs);
  color: var(--pc-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-player-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.pc-transport {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.pc-t-btn {
  display: grid;
  place-items: center;
  min-width: 32px;
  height: 30px;
  padding: 0 var(--sp-1);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--pc-text-2);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  cursor: pointer;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.pc-t-btn:hover:not(:disabled) {
  color: var(--pc-text);
  transform: scale(1.08);
}

.pc-t-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pc-t-btn--play {
  width: 36px;
  height: 36px;
  background: var(--pc-text);
  color: #000;
  font-family: inherit;
  font-size: 0.8125rem;
}

.pc-t-btn--play:hover {
  background: #fff;
  transform: scale(1.06);
}

.pc-scrub {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  max-width: 600px;
}

.pc-time {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--pc-text-3);
  min-width: 40px;
  text-align: center;
}

.pc-progress {
  flex: 1;
  height: 4px;
  appearance: none;
  border-radius: var(--radius-full);
  background: linear-gradient(
    90deg,
    var(--pc-text) 0%,
    var(--pc-text) var(--played, 0%),
    rgba(255, 255, 255, 0.24) var(--played, 0%),
    rgba(255, 255, 255, 0.24) 100%
  );
  cursor: pointer;
}

.pc-scrub:hover .pc-progress {
  background: linear-gradient(
    90deg,
    var(--pc-green) 0%,
    var(--pc-green) var(--played, 0%),
    rgba(255, 255, 255, 0.24) var(--played, 0%),
    rgba(255, 255, 255, 0.24) 100%
  );
}

.pc-progress::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--pc-text);
  border: none;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.pc-scrub:hover .pc-progress::-webkit-slider-thumb {
  opacity: 1;
}

.pc-progress::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--pc-text);
  border: none;
}

.pc-player-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
}

.pc-speed select {
  height: 28px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-full);
  border: 1px solid var(--pc-line);
  background: var(--pc-bg-3);
  color: var(--pc-text);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
}

.pc-volume {
  width: 90px;
  height: 4px;
  accent-color: var(--pc-green);
  cursor: pointer;
}

.pc-audio {
  display: none;
}

/* ══════════ 匯入 Overlay ══════════ */
.import-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(3px);
}

.import-modal-box {
  width: min(420px, 90vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-6);
  border-radius: var(--radius-lg);
  background: var(--pc-bg-2);
  border: 1px solid var(--pc-line);
  color: var(--pc-text);
  text-align: center;
}

.import-spinner-anim {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid var(--pc-bg-4);
  border-top-color: var(--pc-green);
  animation: pcSpin 0.8s linear infinite;
}

.import-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.import-step,
.import-percent,
.import-item-name {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--pc-text-2);
}

.import-item-name {
  color: var(--pc-text-3);
  overflow-wrap: anywhere;
}

.import-progress-bar {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--pc-bg-4);
  overflow: hidden;
}

.import-progress-fill {
  height: 100%;
  background: var(--pc-green);
  transition: width var(--transition-normal);
}

.import-stats {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  justify-content: center;
}

.stat-tag {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.stat-ok {
  background: rgba(29, 185, 84, 0.16);
  color: var(--pc-green);
}

.stat-fail {
  background: rgba(241, 94, 108, 0.16);
  color: var(--pc-danger);
}

/* ══════════ Modal ══════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-4);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(3px);
}

.modal-content {
  width: min(600px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: var(--pc-bg-2);
  border: 1px solid var(--pc-line);
  color: var(--pc-text);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--pc-line);
}

.modal-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
}

.close-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--pc-text-2);
  font-size: 1.375rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--pc-bg-4);
  color: var(--pc-text);
}

.modal-body {
  padding: var(--sp-5);
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.form-group label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--pc-text-3);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--pc-line);
  background: var(--pc-bg-3);
  color: var(--pc-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--pc-green);
  box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.2);
}

.form-textarea {
  resize: vertical;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.audio-preview,
.cover-upload-preview {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-top: var(--sp-2);
}

.preview-audio {
  flex: 1;
  min-width: 200px;
  filter: invert(0.9) hue-rotate(180deg);
}

.preview-image {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--pc-line);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--pc-line);
  background: transparent;
  color: var(--pc-text-2);
  font-family: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:hover {
  color: var(--pc-text);
  border-color: var(--pc-text-2);
}

.btn-primary {
  background: var(--pc-green);
  border-color: var(--pc-green);
  color: #06120b;
  font-weight: 700;
}

.btn-primary:hover {
  background: var(--pc-green-hi);
  color: #06120b;
}

.btn-upload {
  height: 32px;
  border-style: dashed;
  font-size: var(--text-xs);
}

.btn-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-remove {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--pc-line);
  background: transparent;
  color: var(--pc-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-remove:hover {
  color: var(--pc-danger);
  border-color: var(--pc-danger);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--pc-line);
}

/* ══════════ 響應式 ══════════ */
@media (max-width: 768px) {
  .pc-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--sp-5) var(--sp-4) var(--sp-4);
  }

  .pc-hero-art {
    width: 128px;
    height: 128px;
  }

  .pc-actions,
  .pc-chips,
  .podcasts-grid {
    padding-left: var(--sp-4);
    padding-right: var(--sp-4);
  }

  .pc-episode {
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-1);
  }

  .pc-ep-art {
    width: 68px;
    height: 68px;
  }

  .card-title {
    font-size: var(--text-md);
  }

  .pc-player {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-4);
  }

  .pc-player-right {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner,
  .import-spinner-anim {
    animation: none;
  }

  .pc-play-big:hover,
  .pc-t-btn:hover,
  .pc-ep-play:hover {
    transform: none;
  }
}
</style>
