<template>
  <section class="tool-panel ivv-panel">
    <div class="tool-panel__header">
      <div>
        <p class="panel-kicker">圖片 + 語音 = 影片</p>
        <h3>上傳圖片與語音稿，產生含字幕的影片</h3>
        <p class="tool-subtitle">
          參考
          <a
            href="https://github.com/huang1988pioneer/ImageVoiceVideo"
            target="_blank"
            rel="noreferrer"
            class="store-card__link"
          >ImageVoiceVideo</a>
          · 預設男聲；圖片為單一人物時可自動選聲
          · 輸入草稿暫存於本機（切換工具可還原）
          · 成品暫存至 Supabase Storage 供下載
        </p>
      </div>
    </div>

    <div class="ivv-layout">
      <div class="ivv-left">
        <!-- 1. Image -->
        <div class="ivv-card">
          <div class="ivv-card__head">
            <span class="ivv-step">1</span>
            <strong>封面圖片</strong>
            <button
              v-if="imagePreviewUrl"
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact ivv-draft-clear"
              @click="onClearImageClick"
            >
              清除圖片
            </button>
          </div>
          <div
            ref="imageDropzoneRef"
            class="ivv-dropzone"
            :class="{ 'has-preview': !!imagePreviewUrl, 'is-focused': dropzoneFocused }"
            tabindex="0"
            role="button"
            aria-label="上傳或從剪貼簿貼上封面圖片"
            @dragover.prevent
            @drop.prevent="onImageDrop"
            @paste="onImagePaste"
            @focus="dropzoneFocused = true"
            @blur="dropzoneFocused = false"
            @click="openImagePicker"
            @keydown.enter.prevent="openImagePicker"
            @keydown.space.prevent="openImagePicker"
          >
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              class="ivv-file-input"
              tabindex="-1"
              @change="onImagePick"
              @click.stop
            />
            <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="預覽" class="ivv-dropzone__img" />
            <button
              v-if="imagePreviewUrl"
              type="button"
              class="ivv-dropzone__clear"
              title="清除封面圖片"
              aria-label="清除封面圖片"
              @click.stop="onClearImageClick"
            >
              ×
            </button>
            <div v-else class="ivv-dropzone__empty">
              <span>拖放、點選或 Ctrl+V 貼上圖片</span>
              <small>JPG / PNG / WebP · 支援剪貼簿</small>
            </div>
          </div>
          <div class="ivv-image-actions">
            <button
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              :disabled="pastingClipboard"
              @click="pasteImageFromClipboard"
            >
              {{ pastingClipboard ? '讀取中…' : '從剪貼簿貼上' }}
            </button>
            <button
              v-if="imagePreviewUrl"
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              @click="onClearImageClick"
            >
              清除圖片
            </button>
          </div>
          <p v-if="draftHint" class="ivv-hint">{{ draftHint }}</p>
        </div>

        <!-- 2. Script -->
        <div class="ivv-card">
          <div class="ivv-card__head">
            <span class="ivv-step">2</span>
            <strong>語音稿</strong>
            <div class="ivv-card__head-actions">
              <button
                v-if="hasScriptText"
                type="button"
                class="tool-secondary-btn tool-secondary-btn--compact"
                @click="onClearScriptClick"
              >
                清除語音稿
              </button>
              <button
                v-if="hasDraft"
                type="button"
                class="tool-secondary-btn tool-secondary-btn--compact"
                @click="clearAllDraft"
              >
                清除暫存草稿
              </button>
            </div>
          </div>
          <label class="tool-field">
            <span>稿件語言</span>
            <select v-model="scriptLang" class="tool-input">
              <option v-for="opt in LANG_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.flag }} {{ opt.label }}
              </option>
            </select>
          </label>
          <label class="tool-field tool-field--wide">
            <span>內容（每行一段；可加「男：」「女：」指定該句性別，優先於軌道設定）</span>
            <div class="ivv-script-wrap">
              <textarea
                v-model="script"
                class="tool-input ivv-script"
                rows="6"
                placeholder="歡迎來到鋒兄工具&#10;今天帶你把圖片變成有旁白的影片&#10;女：這句會強制用女聲"
              />
              <button
                v-if="hasScriptText"
                type="button"
                class="ivv-script__clear"
                title="清除語音稿"
                aria-label="清除語音稿"
                @click="onClearScriptClick"
              >
                ×
              </button>
            </div>
          </label>
          <div class="ivv-image-actions">
            <button
              v-if="hasScriptText"
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              @click="onClearScriptClick"
            >
              清除語音稿
            </button>
          </div>
          <p class="ivv-hint">{{ lineCount }} 段台詞</p>
        </div>

        <!-- 3. Tracks -->
        <div class="ivv-card">
          <div class="ivv-card__head">
            <span class="ivv-step">3</span>
            <strong>語音語言</strong>
          </div>
          <div class="ivv-tracks">
            <div v-for="(track, idx) in tracks" :key="idx" class="ivv-track-row">
              <select v-model="track.language" class="tool-input" @change="syncTrackLabel(track)">
                <option v-for="opt in LANG_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.flag }} {{ opt.short }}
                </option>
              </select>
              <select v-model="track.gender" class="tool-input">
                <option value="auto">自動（依圖片）</option>
                <option value="male">男聲</option>
                <option value="female">女聲</option>
              </select>
              <button
                type="button"
                class="tube-delete-btn"
                :disabled="tracks.length <= 1"
                @click="removeTrack(idx)"
              >
                刪
              </button>
            </div>
          </div>
          <p v-if="genderHint" class="ivv-hint">{{ genderHint }}</p>
          <button
            type="button"
            class="tool-secondary-btn tool-secondary-btn--compact"
            :disabled="tracks.length >= 4"
            @click="addTrack"
          >
            新增語言軌道
          </button>
        </div>

        <!-- 4. Settings -->
        <div class="ivv-card">
          <div class="ivv-card__head">
            <span class="ivv-step">4</span>
            <strong>音訊與輸出</strong>
          </div>
          <div class="ivv-settings-grid">
            <label class="tool-field">
              <span>語速（-5 ~ 5）</span>
              <input v-model.number="rate" type="range" min="-5" max="5" step="1" class="ivv-range" />
              <em>{{ rate }}</em>
            </label>
            <label class="tool-field">
              <span>音量（0 ~ 100）</span>
              <input v-model.number="volume" type="range" min="0" max="100" step="5" class="ivv-range" />
              <em>{{ volume }}</em>
            </label>
            <label class="tool-field">
              <span>畫面方向</span>
              <select v-model="orientationMode" class="tool-input">
                <option value="auto">自動（依圖片）</option>
                <option value="portrait">直式 9:16</option>
                <option value="landscape">橫式 16:9</option>
              </select>
            </label>
            <label class="tool-field">
              <span>偏好格式</span>
              <select v-model="format" class="tool-input">
                <option value="webm">WebM（相容性佳）</option>
                <option value="mp4">MP4（若瀏覽器支援）</option>
              </select>
            </label>
            <label class="tool-field tool-field--wide">
              <span>檔名（選填）</span>
              <input v-model.trim="filename" type="text" class="tool-input" placeholder="自動使用首句台詞" />
            </label>
          </div>
        </div>
      </div>

      <div class="ivv-right">
        <div class="ivv-card ivv-preview-card">
          <div class="ivv-card__head">
            <span class="ivv-step">▶</span>
            <strong>即時預覽</strong>
            <span class="ivv-meta-tag">{{ canvasSize.label }} · {{ orientText }}</span>
          </div>
          <div
            class="ivv-preview-frame"
            :style="{ aspectRatio: `${canvasSize.width} / ${canvasSize.height}` }"
          >
            <canvas
              ref="canvasRef"
              class="ivv-canvas"
              :width="canvasSize.width"
              :height="canvasSize.height"
            />
          </div>
          <p class="ivv-hint">
            {{ canvasSize.width }}×{{ canvasSize.height }} · {{ lineCount }} 段 · {{ tracks.length }} 語
            · 靜態預覽僅示首句；成片依語音逐句切換字幕
          </p>
          <p v-if="tracks.length > 1" class="ivv-hint">
            多語軌道會同時疊加各語言字幕（每語一句，非重複台詞）
          </p>
        </div>

        <div class="ivv-action-stack">
          <p class="tool-notice" :class="{ 'ivv-status--busy': recording || uploading }">
            {{ status }}
          </p>
          <button
            type="button"
            class="tool-primary-btn"
            :disabled="recording || uploading"
            @click="handleGenerate"
          >
            {{ recording ? '生成中…' : uploading ? '上傳中…' : '生成影片並上傳暫存' }}
          </button>
          <p v-if="error" class="tool-error">{{ error }}</p>
        </div>

        <div v-if="result" class="ivv-card ivv-result-card">
          <div class="ivv-card__head">
            <strong>成品</strong>
            <span class="ivv-meta-tag">{{ result.ext.toUpperCase() }} · {{ result.durationLabel }}</span>
          </div>
          <video
            v-if="result.localUrl"
            class="ivv-result-video"
            :src="result.localUrl"
            controls
            playsinline
          />
          <div class="ivv-result-actions">
            <a
              v-if="result.downloadUrl"
              :href="result.downloadUrl"
              :download="result.fileName"
              target="_blank"
              rel="noreferrer"
              class="tool-primary-btn tool-primary-btn--compact"
            >
              下載影片
            </a>
            <button
              v-else-if="result.localUrl"
              type="button"
              class="tool-primary-btn tool-primary-btn--compact"
              @click="downloadLocal"
            >
              本機下載
            </button>
            <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="clearResult">
              清除
            </button>
          </div>
          <p v-if="result.storagePath" class="ivv-hint">
            Storage：<code>{{ result.storagePath }}</code>
          </p>
          <p v-if="result.uploadNotice" class="tool-notice">{{ result.uploadNotice }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useStorage } from '../../composables/useStorage'
import { LANG_OPTIONS } from '../../utils/imageVoiceVideo/languages'
import { parseScriptLines, safeFilename } from '../../utils/imageVoiceVideo/scriptParser'
import { drawFrame } from '../../utils/imageVoiceVideo/canvasRenderer'
import { resolveCanvasSize, orientationLabel } from '../../utils/imageVoiceVideo/videoSize'
import { recordImageVoiceVideo } from '../../utils/imageVoiceVideo/videoRecorder'
import {
  DEFAULT_VOICE_GENDER,
  detectSinglePersonGender,
  resolveTrackGender
} from '../../utils/imageVoiceVideo/personGender'

const TEMP_FOLDER = 'temp/image-voice-video'
const DRAFT_META_KEY = 'fengbro-tools-image-voice-draft'
const DRAFT_DB_NAME = 'FengImageVoiceDraft'
const DRAFT_STORE_NAME = 'drafts'
const DRAFT_IMAGE_KEY = 'last-image'
const { uploadFile } = useStorage()

const imageInputRef = ref(null)
const imageDropzoneRef = ref(null)
const canvasRef = ref(null)
const imagePreviewUrl = ref(null)
const imageEl = ref(null)
/** @type {import('vue').Ref<File|Blob|null>} */
const imageFile = ref(null)
const dropzoneFocused = ref(false)
const pastingClipboard = ref(false)
const script = ref('')
const scriptLang = ref('zh-TW')
const tracks = ref([
  { language: 'zh-TW', label: '繁中', gender: 'auto' }
])
const rate = ref(0)
const volume = ref(100)
const format = ref('webm')
const orientationMode = ref('auto')
const filename = ref('')
const status = ref('就緒 — 上傳圖片、貼上剪貼簿或輸入語音稿（預設男聲）')
const error = ref('')
const recording = ref(false)
const uploading = ref(false)
const aborted = ref(false)
const result = ref(null)
/** @type {import('vue').Ref<'male'|'female'|null>} */
const detectedGender = ref(null)
const genderHint = ref('語音預設男聲；軌道選「自動」時會依封面單一人物選聲')
const detectingGender = ref(false)
const draftHint = ref('')
const draftRestoring = ref(false)
let genderDetectSeq = 0
let imageDraftSeq = 0
let draftDbPromise = null
let draftSaveTimer = null
let draftHydrated = false

const hasScriptText = computed(() => Boolean(script.value?.trim()))

const hasDraft = computed(() => {
  const hasImage = Boolean(imagePreviewUrl.value || imageFile.value)
  const hasCustomSettings =
    scriptLang.value !== 'zh-TW' ||
    rate.value !== 0 ||
    volume.value !== 100 ||
    format.value !== 'webm' ||
    orientationMode.value !== 'auto' ||
    Boolean(filename.value?.trim()) ||
    tracks.value.length > 1 ||
    tracks.value.some((t) => t.language !== 'zh-TW' || t.gender !== 'auto')
  return hasScriptText.value || hasImage || hasCustomSettings
})

// ─── Draft persistence (localStorage meta + IndexedDB image) ───

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const initDraftDb = async () => {
  if (typeof window === 'undefined' || !window.indexedDB) return null
  if (!draftDbPromise) {
    draftDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DRAFT_DB_NAME, 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
          db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'key' })
        }
      }
    }).catch((err) => {
      draftDbPromise = null
      throw err
    })
  }
  return await draftDbPromise
}

const readDraftImage = async () => {
  try {
    const db = await initDraftDb()
    if (!db) return null
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction([DRAFT_STORE_NAME], 'readonly')
        .objectStore(DRAFT_STORE_NAME)
        .get(DRAFT_IMAGE_KEY)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

const writeDraftImage = async (file, seq = imageDraftSeq) => {
  try {
    const db = await initDraftDb()
    if (!db || !file) return false
    // Drop stale writes if user cleared / replaced the image meanwhile
    if (seq !== imageDraftSeq) return false
    const blob = file instanceof Blob ? file : new Blob([file], { type: file.type || 'image/png' })
    const record = {
      key: DRAFT_IMAGE_KEY,
      name: file.name || 'draft-image.png',
      type: blob.type || file.type || 'image/png',
      size: blob.size,
      updatedAt: new Date().toISOString(),
      blob
    }
    await new Promise((resolve, reject) => {
      const request = db
        .transaction([DRAFT_STORE_NAME], 'readwrite')
        .objectStore(DRAFT_STORE_NAME)
        .put(record)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    return seq === imageDraftSeq
  } catch (err) {
    console.warn('[image-voice] draft image save failed', err)
    return false
  }
}

const deleteDraftImage = async (seq = imageDraftSeq) => {
  try {
    const db = await initDraftDb()
    if (!db) return
    await new Promise((resolve, reject) => {
      const request = db
        .transaction([DRAFT_STORE_NAME], 'readwrite')
        .objectStore(DRAFT_STORE_NAME)
        .delete(DRAFT_IMAGE_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    // Ignore if a newer image write was started after this clear
    return seq === imageDraftSeq
  } catch {
    return false
  }
}

const buildDraftMeta = (hasImage = Boolean(imageFile.value || imagePreviewUrl.value)) => ({
  script: script.value,
  scriptLang: scriptLang.value,
  tracks: tracks.value.map((t) => ({
    language: t.language,
    label: t.label || langShort(t.language),
    gender: t.gender || 'auto'
  })),
  rate: rate.value,
  volume: volume.value,
  format: format.value,
  orientationMode: orientationMode.value,
  filename: filename.value,
  hasImage,
  updatedAt: new Date().toISOString()
})

const saveDraftMeta = (hasImage) => {
  if (typeof localStorage === 'undefined' || draftRestoring.value || !draftHydrated) return
  try {
    localStorage.setItem(DRAFT_META_KEY, JSON.stringify(buildDraftMeta(hasImage)))
  } catch (err) {
    console.warn('[image-voice] draft meta save failed', err)
  }
}

const scheduleDraftMetaSave = () => {
  if (draftRestoring.value || !draftHydrated) return
  if (draftSaveTimer) clearTimeout(draftSaveTimer)
  draftSaveTimer = setTimeout(() => {
    draftSaveTimer = null
    saveDraftMeta()
  }, 250)
}

const applyDraftMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return false
  if (typeof meta.script === 'string') script.value = meta.script
  if (typeof meta.scriptLang === 'string' && meta.scriptLang) scriptLang.value = meta.scriptLang
  if (Array.isArray(meta.tracks) && meta.tracks.length) {
    tracks.value = meta.tracks.slice(0, 4).map((t) => ({
      language: t.language || 'zh-TW',
      label: t.label || langShort(t.language || 'zh-TW'),
      gender: t.gender === 'male' || t.gender === 'female' || t.gender === 'auto' ? t.gender : 'auto'
    }))
  }
  if (typeof meta.rate === 'number' && Number.isFinite(meta.rate)) {
    rate.value = Math.min(5, Math.max(-5, Math.round(meta.rate)))
  }
  if (typeof meta.volume === 'number' && Number.isFinite(meta.volume)) {
    volume.value = Math.min(100, Math.max(0, Math.round(meta.volume)))
  }
  if (meta.format === 'webm' || meta.format === 'mp4') format.value = meta.format
  if (meta.orientationMode === 'auto' || meta.orientationMode === 'portrait' || meta.orientationMode === 'landscape') {
    orientationMode.value = meta.orientationMode
  }
  if (typeof meta.filename === 'string') filename.value = meta.filename
  return true
}

const restoreDraft = async () => {
  if (typeof localStorage === 'undefined') {
    draftHydrated = true
    return
  }

  draftRestoring.value = true
  try {
    const meta = safeJsonParse(localStorage.getItem(DRAFT_META_KEY) || 'null', null)
    const hasMeta = applyDraftMeta(meta)
    let restoredImage = false

    if (meta?.hasImage !== false) {
      const imageRecord = await readDraftImage()
      if (imageRecord?.blob) {
        const file = new File(
          [imageRecord.blob],
          imageRecord.name || 'draft-image.png',
          { type: imageRecord.type || imageRecord.blob.type || 'image/png' }
        )
        restoredImage = loadImageFromFile(file, 'draft')
      }
    }

    if (hasMeta || restoredImage) {
      const parts = []
      if (restoredImage) parts.push('圖片')
      if (meta?.script?.trim()) parts.push('語音稿')
      if (parts.length) {
        draftHint.value = `已還原上次暫存的${parts.join('與')}`
        status.value = draftHint.value
      } else if (hasMeta) {
        draftHint.value = '已還原上次的設定草稿'
      }
    }
  } catch (err) {
    console.warn('[image-voice] draft restore failed', err)
  } finally {
    draftRestoring.value = false
    draftHydrated = true
    // Re-save meta so hasImage matches actual restore result
    saveDraftMeta(Boolean(imageFile.value))
  }
}

const clearAllDraft = async () => {
  // Block auto-save while wiping so watchers / async image clear cannot re-write storage
  draftRestoring.value = true
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
    draftSaveTimer = null
  }
  clearImage({ skipDraftHint: true, skipPersist: true })
  clearScript({ skipDraftHint: true, skipPersist: true })
  scriptLang.value = 'zh-TW'
  tracks.value = [{ language: 'zh-TW', label: '繁中', gender: 'auto' }]
  rate.value = 0
  volume.value = 100
  format.value = 'webm'
  orientationMode.value = 'auto'
  filename.value = ''
  draftHint.value = ''
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(DRAFT_META_KEY)
  } catch {
    // ignore
  }
  await deleteDraftImage()
  draftRestoring.value = false
  status.value = '已清除暫存草稿'
  redrawPreview()
}

const lineCount = computed(() => parseScriptLines(script.value).length)

const canvasSize = computed(() =>
  resolveCanvasSize(orientationMode.value, imageEl.value)
)

const orientText = computed(() =>
  orientationLabel(orientationMode.value, canvasSize.value.orientation)
)

const langShort = (value) => LANG_OPTIONS.find(o => o.value === value)?.short || value

const syncTrackLabel = (track) => {
  track.label = langShort(track.language)
}

const addTrack = () => {
  if (tracks.value.length >= 4) return
  const used = new Set(tracks.value.map(t => t.language))
  const next = LANG_OPTIONS.find(o => !used.has(o.value)) || LANG_OPTIONS[0]
  tracks.value.push({
    language: next.value,
    label: next.short,
    gender: 'auto'
  })
}

const effectiveTrackGenders = computed(() =>
  tracks.value.map((t) => resolveTrackGender(t.gender, detectedGender.value))
)

const runGenderDetection = async (img) => {
  const seq = ++genderDetectSeq
  if (!img) {
    detectedGender.value = null
    genderHint.value = '語音預設男聲；軌道選「自動」時會依封面單一人物選聲'
    return
  }
  detectingGender.value = true
  genderHint.value = '正在分析封面人物…'
  try {
    const resultDetect = await detectSinglePersonGender(img)
    if (seq !== genderDetectSeq) return
    detectedGender.value = resultDetect.gender
    genderHint.value = resultDetect.message
    if (resultDetect.reason === 'single' && resultDetect.gender) {
      status.value = resultDetect.message
    }
  } catch {
    if (seq !== genderDetectSeq) return
    detectedGender.value = null
    genderHint.value = '人臉偵測失敗，使用預設男聲'
  } finally {
    if (seq === genderDetectSeq) detectingGender.value = false
  }
}

const removeTrack = (idx) => {
  if (tracks.value.length <= 1) return
  tracks.value.splice(idx, 1)
}

const openImagePicker = () => {
  imageInputRef.value?.click()
}

const loadImageFromFile = (file, source = 'upload') => {
  if (!file || !file.type?.startsWith('image/')) {
    error.value = '請選擇圖片檔案'
    return false
  }
  error.value = ''
  const seq = ++imageDraftSeq
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imageFile.value = file
  const url = URL.createObjectURL(file)
  imagePreviewUrl.value = url
  const img = new Image()
  img.onload = () => {
    if (seq !== imageDraftSeq) return
    imageEl.value = img
    if (source === 'clipboard') {
      status.value = '已從剪貼簿貼上封面圖片'
    } else if (source === 'drop') {
      status.value = '已載入拖放的封面圖片'
    } else if (source === 'draft') {
      status.value = '已還原暫存的封面圖片'
    } else {
      status.value = '已載入封面圖片'
    }
    if (source !== 'draft') {
      draftHint.value = '圖片與設定會自動暫存於本機'
    }
    redrawPreview()
    void runGenderDetection(img)
    // Persist image draft after successful decode (skip re-write when restoring)
    if (source !== 'draft' && !draftRestoring.value) {
      void writeDraftImage(file, seq).then((ok) => {
        if (ok) saveDraftMeta(true)
      })
    }
  }
  img.onerror = () => {
    if (seq !== imageDraftSeq) return
    error.value = '圖片載入失敗'
    imageEl.value = null
    imageFile.value = null
    detectedGender.value = null
    genderHint.value = '語音預設男聲；軌道選「自動」時會依封面單一人物選聲'
  }
  img.src = url
  return true
}

const fileFromClipboardData = (clipboardData) => {
  if (!clipboardData) return null

  const items = clipboardData.items
  if (items?.length) {
    for (const item of items) {
      if (item.kind === 'file' && item.type?.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) return file
      }
    }
  }

  const files = clipboardData.files
  if (files?.length) {
    for (const file of files) {
      if (file?.type?.startsWith('image/')) return file
    }
  }

  return null
}

const isEditablePasteTarget = (target) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

const onImagePick = (e) => {
  const file = e.target?.files?.[0]
  if (file) loadImageFromFile(file, 'upload')
}

const onImageDrop = (e) => {
  const file = e.dataTransfer?.files?.[0]
  if (file) loadImageFromFile(file, 'drop')
}

const onImagePaste = (e) => {
  const file = fileFromClipboardData(e.clipboardData)
  if (!file) return
  e.preventDefault()
  e.stopPropagation()
  loadImageFromFile(file, 'clipboard')
}

/** Panel-wide Ctrl+V: use clipboard image unless user is typing in a field. */
const onDocumentPaste = (e) => {
  if (isEditablePasteTarget(e.target)) return
  const file = fileFromClipboardData(e.clipboardData)
  if (!file) return
  e.preventDefault()
  loadImageFromFile(file, 'clipboard')
}

const pasteImageFromClipboard = async () => {
  if (pastingClipboard.value) return
  error.value = ''
  pastingClipboard.value = true
  try {
    // Prefer async Clipboard API (button click); fall back to focusing dropzone for Ctrl+V.
    if (navigator.clipboard?.read) {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (!type) continue
        const blob = await item.getType(type)
        const ext = (type.split('/')[1] || 'png').split('+')[0]
        const file = new File([blob], `clipboard.${ext}`, { type })
        loadImageFromFile(file, 'clipboard')
        return
      }
      error.value = '剪貼簿中沒有圖片（請先複製一張圖）'
      return
    }

    // Older browsers: focus dropzone so user can Ctrl+V
    imageDropzoneRef.value?.focus()
    error.value = '此瀏覽器請改用 Ctrl+V 貼到封面區塊'
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
      imageDropzoneRef.value?.focus()
      error.value = '無法直接讀取剪貼簿，請改用 Ctrl+V 貼到封面區塊'
    } else if (err?.name === 'NotFoundError') {
      error.value = '剪貼簿中沒有圖片（請先複製一張圖）'
    } else {
      error.value = err?.message || '讀取剪貼簿失敗'
    }
  } finally {
    pastingClipboard.value = false
  }
}

/** Manual clear from UI (never pass native click event into options). */
const onClearImageClick = () => {
  clearImage()
}

const onClearScriptClick = () => {
  clearScript()
}

const clearScript = (opts = {}) => {
  const options = opts && typeof opts === 'object' && !('isTrusted' in opts) ? opts : {}
  script.value = ''
  if (!options.skipDraftHint) {
    draftHint.value = imageFile.value || imagePreviewUrl.value
      ? '封面圖片仍暫存於本機（語音稿已清除）'
      : ''
    status.value = '已清除語音稿'
  }
  // watch will debounce-save meta; flush immediately so switch-tool keeps empty script
  if (!options.skipPersist && draftHydrated && !draftRestoring.value) {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer)
      draftSaveTimer = null
    }
    saveDraftMeta()
  }
  redrawPreview()
}

const clearImage = (opts = {}) => {
  const options = opts && typeof opts === 'object' && !('isTrusted' in opts) ? opts : {}
  genderDetectSeq += 1
  const seq = ++imageDraftSeq
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  imagePreviewUrl.value = null
  imageEl.value = null
  imageFile.value = null
  detectedGender.value = null
  genderHint.value = '語音預設男聲；軌道選「自動」時會依封面單一人物選聲'
  detectingGender.value = false
  if (imageInputRef.value) imageInputRef.value.value = ''
  if (!options.skipDraftHint) {
    draftHint.value = script.value?.trim() ? '語音稿仍暫存於本機（圖片已清除）' : ''
    status.value = '已清除封面圖片'
  }
  if (!options.skipPersist) {
    void deleteDraftImage(seq).then((ok) => {
      if (ok) saveDraftMeta(false)
    })
  }
  redrawPreview()
}

const redrawPreview = () => {
  // Recording paints onto a detached canvas and only mirrors here.
  // Avoid overwriting that mirror with the static layout preview.
  if (recording.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const size = canvasSize.value
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width
    canvas.height = size.height
  }
  // Sample only the first line — matching export (one cue at a time).
  // Never showAll-join every script line with " / " (that looked like duplicate burn-in).
  const lines = parseScriptLines(script.value)
  const first = lines[0]
  const subs = first
    ? [{ text: first.text, startAt: 0, endAt: 1, language: scriptLang.value }]
    : []
  drawFrame(canvas, imageEl.value, subs, 0, false)
}

watch([script, scriptLang, imageEl, canvasSize], () => {
  redrawPreview()
}, { deep: true })

// Auto-save text settings / tracks / audio options to localStorage
watch(
  [script, scriptLang, tracks, rate, volume, format, orientationMode, filename],
  () => {
    scheduleDraftMetaSave()
  },
  { deep: true }
)

const clearResult = () => {
  if (result.value?.localUrl) URL.revokeObjectURL(result.value.localUrl)
  result.value = null
  status.value = '就緒 — 可繼續生成'
}

const downloadLocal = () => {
  if (!result.value?.localUrl) return
  const a = document.createElement('a')
  a.href = result.value.localUrl
  a.download = result.value.fileName || `video.${result.value.ext}`
  a.click()
}

const handleGenerate = async () => {
  if (recording.value || uploading.value) return

  const scriptLines = parseScriptLines(script.value)
  if (!scriptLines.length) {
    error.value = '請輸入語音稿'
    return
  }
  if (!imageEl.value) {
    error.value = '請先上傳封面圖片'
    return
  }

  const canvas = canvasRef.value
  if (!canvas) return

  const size = canvasSize.value
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width
    canvas.height = size.height
  }

  clearResult()
  error.value = ''
  aborted.value = false
  recording.value = true
  status.value = '準備生成…'

  try {
    // Ensure auto tracks have a fresh detection if image is ready
    if (
      imageEl.value &&
      tracks.value.some((t) => t.gender === 'auto') &&
      !detectedGender.value &&
      !detectingGender.value
    ) {
      await runGenderDetection(imageEl.value)
    }
    if (detectingGender.value) {
      status.value = '正在分析封面人物以選擇語音…'
      // brief wait for in-flight detection (max ~8s)
      const waitUntil = Date.now() + 8000
      while (detectingGender.value && Date.now() < waitUntil) {
        await new Promise((r) => setTimeout(r, 100))
      }
    }

    const resolvedTracks = tracks.value.map((t, i) => ({
      ...t,
      gender: effectiveTrackGenders.value[i] || DEFAULT_VOICE_GENDER
    }))

    const recorded = await recordImageVoiceVideo({
      scriptLines,
      tracks: resolvedTracks,
      image: imageEl.value,
      canvas,
      format: format.value,
      rate: rate.value,
      volume: volume.value,
      scriptLanguage: scriptLang.value,
      detectedGender: detectedGender.value,
      onStatus: (msg) => { status.value = msg },
      isAborted: () => aborted.value
    })

    const baseName = safeFilename(
      filename.value || scriptLines[0]?.text || 'image-voice-video',
      'image-voice-video'
    )
    const fileName = `${baseName}.${recorded.ext}`
    const localUrl = URL.createObjectURL(recorded.blob)
    const mime = recorded.blob.type || (recorded.ext === 'mp4' ? 'video/mp4' : 'video/webm')
    const file = new File([recorded.blob], fileName, { type: mime })

    recording.value = false
    uploading.value = true
    status.value = '正在上傳暫存至 Supabase Storage…'

    // skipUsageCheck: avoid full-bucket recursive list (often NetworkError on large buckets)
    const upload = await uploadFile(file, TEMP_FOLDER, null, {
      skipUsageCheck: true,
      retries: 3
    })
    const durationLabel = `${recorded.duration.toFixed(1)} 秒`

    if (upload.success) {
      result.value = {
        localUrl,
        downloadUrl: upload.url,
        storagePath: upload.path,
        ext: recorded.ext,
        fileName,
        durationLabel,
        uploadNotice: '影片已暫存於 Supabase Storage，可下載後自行保存；容量有限請定期清理 temp 資料夾。'
      }
      status.value = `完成！${size.label} · ${durationLabel} — 已上傳暫存`
    } else {
      result.value = {
        localUrl,
        downloadUrl: '',
        storagePath: '',
        ext: recorded.ext,
        fileName,
        durationLabel,
        uploadNotice: `Storage 上傳失敗（${upload.error || '未知錯誤'}），仍可本機下載。`
      }
      status.value = `影片已生成，但上傳暫存失敗 — 請用本機下載`
      // Soft notice only: video is already usable via local download
      error.value = ''
    }
  } catch (err) {
    console.error(err)
    error.value = err?.message || String(err)
    status.value = `錯誤：${error.value}`
  } finally {
    recording.value = false
    uploading.value = false
  }
}

onMounted(() => {
  document.addEventListener('paste', onDocumentPaste)
  void restoreDraft()
})

onBeforeUnmount(() => {
  aborted.value = true
  document.removeEventListener('paste', onDocumentPaste)
  if (draftSaveTimer) {
    clearTimeout(draftSaveTimer)
    draftSaveTimer = null
    // Flush latest meta before unmount so switch-tool keeps script
    saveDraftMeta(Boolean(imageFile.value))
  }
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
  if (result.value?.localUrl) URL.revokeObjectURL(result.value.localUrl)
})
</script>

<style scoped>
.ivv-panel {
  padding: 1.2rem 1.4rem 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
  box-shadow: var(--shadow-soft);
}

.tool-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-kicker {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.tool-panel h3 {
  margin: 0.3rem 0 0;
  font-family: var(--font-display);
}

.tool-subtitle {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.ivv-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 1.1rem;
  align-items: start;
}

.ivv-left,
.ivv-right {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.ivv-card {
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: color-mix(in oklab, var(--bg-primary) 88%, transparent);
}

.ivv-card__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.ivv-draft-clear {
  margin-left: auto;
}

.ivv-card__head-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.ivv-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent-color, #3b82f6) 18%, transparent);
  color: var(--accent-color, #3b82f6);
  font-size: 0.72rem;
  font-weight: 700;
}

.ivv-meta-tag {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

.ivv-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  border: 1.5px dashed var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  overflow: hidden;
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
  position: relative;
  outline: none;
}

.ivv-dropzone.has-preview {
  border-style: solid;
}

.ivv-dropzone.is-focused,
.ivv-dropzone:focus-visible {
  border-color: var(--accent-color, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent-color, #3b82f6) 22%, transparent);
}

.ivv-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.ivv-dropzone__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-muted);
  pointer-events: none;
  padding: 1rem;
  text-align: center;
}

.ivv-dropzone__img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
  pointer-events: none;
}

.ivv-dropzone__clear {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  width: 2rem;
  height: 2rem;
  border: 1px solid color-mix(in oklab, #fff 35%, var(--border-color));
  border-radius: 999px;
  background: color-mix(in oklab, #0f172a 72%, transparent);
  color: #fff;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.ivv-dropzone__clear:hover {
  background: color-mix(in oklab, #ef4444 85%, #0f172a);
  border-color: transparent;
}

.ivv-image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.55rem;
}

.ivv-script-wrap {
  position: relative;
}

.ivv-script {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.5;
  width: 100%;
  box-sizing: border-box;
  padding-right: 2.5rem;
}

.ivv-script__clear {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  z-index: 2;
  width: 1.85rem;
  height: 1.85rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-secondary) 88%, transparent);
  color: var(--text-muted);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ivv-script__clear:hover {
  background: color-mix(in oklab, #ef4444 18%, var(--bg-primary));
  color: #ef4444;
  border-color: color-mix(in oklab, #ef4444 40%, var(--border-color));
}

.ivv-hint {
  margin: 0.45rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.ivv-hint code {
  font-size: 0.75rem;
  word-break: break-all;
}

.ivv-tracks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.ivv-track-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.45rem;
  align-items: center;
}

.ivv-settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.tool-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.tool-field--wide {
  grid-column: 1 / -1;
}

.tool-field em {
  font-style: normal;
  color: var(--text-primary);
  font-size: 0.8rem;
}

.tool-input {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
}

.ivv-range {
  width: 100%;
}

.tool-primary-btn,
.tool-secondary-btn {
  border: none;
  border-radius: 14px;
  padding: 0.75rem 1.1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tool-primary-btn {
  background: var(--accent-color, #3b82f6);
  color: #fff;
}

.tool-primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-primary-btn--compact,
.tool-secondary-btn--compact {
  padding: 0.5rem 0.85rem;
  font-size: 0.88rem;
  border-radius: 12px;
}

.tool-secondary-btn {
  background: color-mix(in oklab, var(--bg-secondary) 80%, transparent);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.tube-delete-btn {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-muted);
  border-radius: 10px;
  padding: 0.4rem 0.55rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.tube-delete-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-error {
  color: #ef4444;
  margin: 0.4rem 0 0;
  font-size: 0.9rem;
}

.tool-notice {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.45;
}

.ivv-status--busy {
  color: var(--accent-color, #3b82f6);
  font-weight: 600;
}

.ivv-preview-frame {
  width: 100%;
  max-height: min(52vh, 520px);
  margin: 0 auto;
  border-radius: 14px;
  overflow: hidden;
  background: #0a0f18;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ivv-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.ivv-action-stack {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.ivv-result-video {
  width: 100%;
  max-height: 320px;
  border-radius: 12px;
  background: #000;
}

.ivv-result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.store-card__link {
  color: var(--accent-color, #3b82f6);
  text-decoration: none;
}

.store-card__link:hover {
  text-decoration: underline;
}

@media (max-width: 960px) {
  .ivv-layout {
    grid-template-columns: 1fr;
  }

  .ivv-settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
