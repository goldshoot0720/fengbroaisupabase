<template>
  <section class="tool-panel vm-panel">
    <div class="tool-panel__header">
      <div>
        <p class="panel-kicker">影片合併</p>
        <h3>多段影片串接，輸出 MP4</h3>
        <p class="tool-subtitle">
          參考
          <a
            href="https://github.com/huang1988pioneer/VideoMerge"
            target="_blank"
            rel="noreferrer"
            class="store-card__link"
          >VideoMerge</a>
          · 首尾幀預覽 · 本機 FFmpeg.wasm 處理（不上傳伺服器）
          · 首次合併需下載核心約 30MB
        </p>
      </div>
    </div>

    <!-- 1. Upload -->
    <div class="vm-card">
      <div class="vm-card__head">
        <span class="vm-step">1</span>
        <strong>加入影片</strong>
        <div class="vm-card__actions">
          <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="openPicker">
            再加入
          </button>
          <button
            type="button"
            class="tool-secondary-btn tool-secondary-btn--compact"
            :disabled="!clips.length || merging"
            @click="clearAll"
          >
            清除全部
          </button>
        </div>
      </div>

      <div
        class="vm-dropzone"
        :class="{ 'is-dragover': isDragOver }"
        role="button"
        tabindex="0"
        aria-label="上傳影片"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="onDrop"
        @click="openPicker"
        @keydown.enter.prevent="openPicker"
        @keydown.space.prevent="openPicker"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept="video/*"
          multiple
          class="vm-file-input"
          tabindex="-1"
          @change="onFilePick"
          @click.stop
        />
        <div class="vm-dropzone__empty">
          <span>拖曳或點選多段影片</span>
          <small>MP4 / WebM / MOV · 清單會暫存於本機（重新整理可還原）</small>
        </div>
      </div>
      <p v-if="pickError" class="tool-error">{{ pickError }}</p>
    </div>

    <!-- 2. Options -->
    <div class="vm-layout">
      <div class="vm-card">
        <div class="vm-card__head">
          <span class="vm-step">2</span>
          <strong>輸出選項</strong>
        </div>

        <label class="vm-check">
          <input v-model="noAudio" type="checkbox" :disabled="merging" />
          <span>不要聲音（輸出無音軌）</span>
        </label>

        <div class="vm-section">
          <p class="vm-section__title">延長 / 循環</p>
          <div class="vm-format-toggle" role="group" aria-label="延長方式">
            <button
              type="button"
              class="vm-format-btn"
              :class="{ active: loopMode === 'once' }"
              :disabled="merging"
              @click="loopMode = 'once'"
            >
              播一次
            </button>
            <button
              type="button"
              class="vm-format-btn"
              :class="{ active: loopMode === 'count' }"
              :disabled="merging"
              @click="loopMode = 'count'"
            >
              重複次數
            </button>
            <button
              type="button"
              class="vm-format-btn"
              :class="{ active: loopMode === 'duration' }"
              :disabled="merging"
              @click="loopMode = 'duration'"
            >
              目標時長
            </button>
          </div>
          <label v-if="loopMode === 'count'" class="tool-field">
            <span>重複幾次</span>
            <input
              v-model.number="loopCount"
              type="number"
              min="1"
              :max="LOOP_LIMITS.maxCount"
              class="tool-input"
              :disabled="merging"
            />
          </label>
          <div v-if="loopMode === 'duration'" class="vm-duration-row">
            <label class="tool-field">
              <span>時</span>
              <input v-model.number="loopHours" type="number" min="0" max="2" class="tool-input" :disabled="merging" />
            </label>
            <label class="tool-field">
              <span>分</span>
              <input v-model.number="loopMins" type="number" min="0" max="59" class="tool-input" :disabled="merging" />
            </label>
            <label class="tool-field">
              <span>秒</span>
              <input v-model.number="loopSecs" type="number" min="0" max="59" class="tool-input" :disabled="merging" />
            </label>
          </div>
          <p class="vm-hint">{{ extendEstimate }}</p>
        </div>

        <div class="vm-section">
          <p class="vm-section__title">自訂音軌</p>
          <div class="vm-audio-row">
            <input
              ref="audioInputRef"
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac"
              class="vm-file-input"
              @change="onAudioPick"
            />
            <button
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              :disabled="merging || noAudio"
              @click="audioInputRef?.click()"
            >
              選擇 MP3
            </button>
            <button
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              :disabled="!audioFile || merging"
              @click="clearAudio"
            >
              清除
            </button>
            <span class="vm-hint">{{ audioFile ? audioFile.name : '未選擇（可選）' }}</span>
          </div>
          <p class="vm-hint">音訊短於影片會循環；長於影片則裁到影片長度。勾選「不要聲音」時會忽略。</p>
        </div>
      </div>

      <div class="vm-card">
        <div class="vm-card__head">
          <span class="vm-step">3</span>
          <strong>語音稿字幕</strong>
        </div>
        <label class="vm-check">
          <input v-model="useScriptSubs" type="checkbox" :disabled="merging" />
          <span>使用語音稿上字幕</span>
        </label>
        <label class="tool-field tool-field--wide">
          <span>講稿（純文字 / SRT / VTT）</span>
          <textarea
            v-model="scriptText"
            class="tool-input vm-script"
            rows="5"
            :disabled="merging"
            placeholder="貼上語音稿，依影片時長自動切句。&#10;也支援 SRT / VTT 時間軸。"
          />
        </label>
        <label class="tool-field">
          <span>初始偏移（秒）</span>
          <input
            v-model.number="subOffset"
            type="number"
            step="0.1"
            min="-30"
            max="30"
            class="tool-input"
            :disabled="merging"
          />
        </label>
        <p class="vm-hint">正數延後、負數提前。合併時會 soft-mux 進 MP4（mov_text）。</p>
      </div>
    </div>

    <!-- 3. Clips list -->
    <div class="vm-card">
      <div class="vm-card__head">
        <span class="vm-step">4</span>
        <strong>片段與首尾幀</strong>
        <span class="vm-meta-tag">{{ clipsCountLabel }}</span>
      </div>

      <div v-if="!clips.length" class="vm-empty">
        加入影片後，這裡會顯示每段的<strong>首幀</strong>與<strong>尾幀</strong>預覽。
      </div>

      <ul v-else class="vm-clip-list" aria-label="影片片段清單">
        <li v-for="(clip, idx) in clips" :key="clip.id" class="vm-clip">
          <div class="vm-clip__frames">
            <div class="vm-clip__frame">
              <img v-if="clip.firstFrame" :src="clip.firstFrame" alt="首幀" />
              <span v-else class="vm-clip__placeholder">…</span>
              <small>首幀</small>
            </div>
            <div class="vm-clip__frame">
              <img v-if="clip.lastFrame" :src="clip.lastFrame" alt="尾幀" />
              <span v-else class="vm-clip__placeholder">…</span>
              <small>尾幀</small>
            </div>
          </div>
          <div class="vm-clip__meta">
            <strong class="vm-clip__name" :title="clip.name">{{ idx + 1 }}. {{ clip.name }}</strong>
            <span class="vm-clip__detail">
              <template v-if="clip.status === 'loading'">讀取中…</template>
              <template v-else-if="clip.status === 'error'">{{ clip.error || '讀取失敗' }}</template>
              <template v-else>
                {{ formatDuration(clip.duration) }}
                <template v-if="clip.width"> · {{ clip.width }}×{{ clip.height }}</template>
                · {{ formatBytes(clip.size) }}
              </template>
            </span>
          </div>
          <div class="vm-clip__actions">
            <button
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              :disabled="idx === 0 || merging"
              title="上移"
              @click="moveClip(idx, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              :disabled="idx >= clips.length - 1 || merging"
              title="下移"
              @click="moveClip(idx, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              :disabled="merging"
              @click="removeClip(idx)"
            >
              移除
            </button>
          </div>
        </li>
      </ul>

      <div class="vm-merge-bar">
        <div>
          <strong>準備就緒後合併</strong>
          <p class="vm-hint">{{ mergeHint }}</p>
        </div>
        <button
          type="button"
          class="tool-primary-btn"
          :disabled="!canMerge || merging"
          @click="runMerge"
        >
          {{ merging ? '合併中…' : '合併為 MP4' }}
        </button>
      </div>

      <div v-if="merging || progressRatio > 0" class="vm-progress">
        <div class="vm-progress__label">
          <strong>{{ progressStatus }}</strong>
          <span>{{ Math.round(progressRatio * 100) }}%</span>
        </div>
        <div class="vm-progress__track" role="progressbar" :aria-valuenow="Math.round(progressRatio * 100)">
          <div class="vm-progress__fill" :style="{ width: `${Math.round(progressRatio * 100)}%` }" />
        </div>
        <details v-if="logLines.length" class="vm-log">
          <summary>技術日誌</summary>
          <pre>{{ logLines.join('\n') }}</pre>
        </details>
      </div>
      <p v-if="mergeError" class="tool-error">{{ mergeError }}</p>
    </div>

    <!-- Result -->
    <div v-if="resultUrl" class="vm-card vm-result">
      <div class="vm-card__head">
        <strong>合併結果</strong>
        <span v-if="resultMeta" class="vm-meta-tag">{{ resultMeta }}</span>
      </div>
      <video class="vm-result-video" :src="resultUrl" controls playsinline />
      <div class="vm-result-actions">
        <button type="button" class="tool-primary-btn tool-primary-btn--compact" @click="downloadResult">
          下載 MP4
        </button>
        <button
          v-if="lastSrtText"
          type="button"
          class="tool-secondary-btn tool-secondary-btn--compact"
          @click="downloadSrt"
        >
          下載 SRT
        </button>
        <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="clearResult">
          清除結果
        </button>
      </div>
      <p v-if="resultNotice" class="vm-hint">{{ resultNotice }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { extractFrames, formatBytes, formatDuration } from '../../utils/videoMerge/frames'
import {
  clearClips,
  clearStoredAudio,
  clearStoredPreview,
  loadAudio,
  loadClips,
  loadPreview,
  saveAudio,
  saveClips,
  savePreview
} from '../../utils/videoMerge/clipStore'
import {
  chunksToSrt,
  getMediaDuration,
  resolveSubtitleTimeline,
  scriptToSubtitles,
  shiftChunks,
  tileChunksToDuration
} from '../../utils/videoMerge/subtitle'

const SCRIPT_KEY = 'fengbro.tools.videomerge.script'
const SCRIPT_OPT_KEY = 'fengbro.tools.videomerge.scriptOpt'
/** Soft limit aligned with utils/videoMerge/merge.js LOOP_LIMITS */
const LOOP_LIMITS = { maxCount: 999, maxDurationSec: 2 * 60 * 60 }

const fileInputRef = ref(null)
const audioInputRef = ref(null)
const isDragOver = ref(false)
const pickError = ref('')
const mergeError = ref('')
const clips = ref([])
const audioFile = ref(null)
const noAudio = ref(false)
const loopMode = ref('once')
const loopCount = ref(2)
const loopHours = ref(0)
const loopMins = ref(1)
const loopSecs = ref(0)
const useScriptSubs = ref(false)
const scriptText = ref('')
const subOffset = ref(0)
const merging = ref(false)
const progressRatio = ref(0)
const progressStatus = ref('')
const logLines = ref([])
const resultUrl = ref('')
const resultBlob = ref(null)
const resultMeta = ref('')
const resultNotice = ref('')
const lastSrtText = ref('')
const lastSrtFilename = ref('')

let persistTimer = null
let idSeq = 0

const readyClips = computed(() => clips.value.filter((c) => c.status === 'ready' && c.file))
const canMerge = computed(() => readyClips.value.length > 0 && !merging.value)

const clipsCountLabel = computed(() => {
  if (!clips.value.length) return '尚未加入'
  const ready = readyClips.value.length
  const total = clips.value.length
  const dur = readyClips.value.reduce((s, c) => s + (c.duration || 0), 0)
  return `${ready}/${total} 就緒 · 合計 ${formatDuration(dur)}`
})

const baseSequenceDuration = computed(() =>
  readyClips.value.reduce((sum, c) => sum + (c.duration || 0), 0)
)

const targetSeconds = computed(() => {
  const h = Math.max(0, Math.floor(Number(loopHours.value) || 0))
  const m = Math.max(0, Math.floor(Number(loopMins.value) || 0))
  const s = Math.max(0, Math.floor(Number(loopSecs.value) || 0))
  return h * 3600 + m * 60 + s
})

const extendEstimate = computed(() => {
  const base = baseSequenceDuration.value
  const baseLabel = base > 0 ? formatDuration(base) : '—'
  if (loopMode.value === 'once') {
    return base > 0 ? `輸出約 ${baseLabel}` : '選擇重複次數或目標時長可自動延長'
  }
  if (loopMode.value === 'count') {
    const count = Math.max(1, Math.floor(Number(loopCount.value) || 1))
    const out = base > 0 ? base * count : 0
    return base > 0
      ? `基底 ${baseLabel} × ${count} 次 ≈ ${formatDuration(out)}`
      : `將重複整段序列 ${count} 次`
  }
  const target = targetSeconds.value
  if (target <= 0) return '請設定目標時長（時 / 分 / 秒）'
  if (base > 0) {
    const loops = Math.ceil(target / base)
    return `基底 ${baseLabel} → 循環約 ${loops} 次，裁切至 ${formatDuration(target)}`
  }
  return `目標時長 ${formatDuration(target)}`
})

const mergeHint = computed(() => {
  if (!clips.value.length) return '請先加入至少一段影片'
  if (clips.value.some((c) => c.status === 'loading')) return '尚有片段在讀取首尾幀…'
  if (!readyClips.value.length) return '沒有可合併的就緒片段'
  if (useScriptSubs.value && !scriptText.value.trim()) return '已勾選字幕但尚未輸入講稿'
  return '標準化為 1280×720 · 30fps · H.264 + AAC'
})

const openPicker = () => fileInputRef.value?.click()

const onFilePick = (event) => {
  const files = Array.from(event.target?.files || [])
  addFiles(files)
  if (event.target) event.target.value = ''
}

const onDrop = (event) => {
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || []).filter(
    (f) => f.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name)
  )
  addFiles(files)
}

const uid = () => `vm-${Date.now()}-${++idSeq}`

const addFiles = async (files) => {
  pickError.value = ''
  if (!files.length) return
  const videoFiles = files.filter(
    (f) => f.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name)
  )
  if (!videoFiles.length) {
    pickError.value = '請選擇影片檔（MP4 / WebM / MOV 等）'
    return
  }

  for (const file of videoFiles) {
    const clip = {
      id: uid(),
      file,
      name: file.name || `video-${idSeq}`,
      size: file.size,
      firstFrame: null,
      lastFrame: null,
      duration: null,
      width: null,
      height: null,
      status: 'loading',
      error: null
    }
    clips.value.push(clip)
    try {
      const meta = await extractFrames(file)
      clip.firstFrame = meta.firstFrame
      clip.lastFrame = meta.lastFrame
      clip.duration = meta.duration
      clip.width = meta.width
      clip.height = meta.height
      clip.status = 'ready'
    } catch (err) {
      clip.status = 'error'
      clip.error = err?.message || String(err)
    }
    schedulePersist()
  }
}

const schedulePersist = () => {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    saveClips(clips.value).catch(() => {})
  }, 400)
}

const moveClip = (idx, delta) => {
  const next = idx + delta
  if (next < 0 || next >= clips.value.length) return
  const arr = clips.value.slice()
  const [item] = arr.splice(idx, 1)
  arr.splice(next, 0, item)
  clips.value = arr
  schedulePersist()
}

const removeClip = (idx) => {
  clips.value.splice(idx, 1)
  schedulePersist()
}

const clearAll = async () => {
  clips.value = []
  pickError.value = ''
  mergeError.value = ''
  await clearClips()
  await clearAudio(true)
  clearResult(true)
}

const onAudioPick = (event) => {
  const file = event.target?.files?.[0]
  if (event.target) event.target.value = ''
  if (!file) return
  const ok =
    file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)
  if (!ok) {
    pickError.value = '請選擇音訊檔（建議 MP3）'
    return
  }
  audioFile.value = file
  if (noAudio.value) noAudio.value = false
  saveAudio(file).catch(() => {})
}

const clearAudio = async (silent = false) => {
  audioFile.value = null
  if (audioInputRef.value) audioInputRef.value.value = ''
  await clearStoredAudio()
  if (!silent) pickError.value = ''
}

const getLoopOptions = () => {
  const baseDurationSec = baseSequenceDuration.value
  if (loopMode.value === 'count') {
    return {
      mode: 'count',
      count: Math.max(1, Math.floor(Number(loopCount.value) || 1)),
      baseDurationSec
    }
  }
  if (loopMode.value === 'duration') {
    return {
      mode: 'duration',
      targetSeconds: targetSeconds.value,
      baseDurationSec
    }
  }
  return { mode: 'once', baseDurationSec }
}

const estimateOutputDuration = () => {
  const base = baseSequenceDuration.value
  if (loopMode.value === 'count') {
    return base * Math.max(1, Math.floor(Number(loopCount.value) || 1))
  }
  if (loopMode.value === 'duration') {
    return Math.max(0.1, targetSeconds.value || base)
  }
  return base
}

const buildSubtitleSrt = async () => {
  if (!useScriptSubs.value || !scriptText.value.trim()) {
    return { srt: null, notice: '' }
  }

  const videoDur = estimateOutputDuration()
  let audioDur = 0
  if (audioFile.value && !noAudio.value) {
    try {
      audioDur = await getMediaDuration(audioFile.value)
    } catch {
      audioDur = 0
    }
  }

  const timeline = resolveSubtitleTimeline({
    videoDur,
    audioDur,
    hasCustomAudio: Boolean(audioFile.value) && !noAudio.value
  })

  let built = scriptToSubtitles(scriptText.value, timeline.cycleDur)
  let chunks = built.chunks

  const offset = Number(subOffset.value) || 0
  if (Math.abs(offset) >= 0.001) {
    chunks = shiftChunks(chunks, offset, timeline.totalDur)
  }

  if (timeline.totalDur > timeline.cycleDur + 0.25 && timeline.cycleDur > 0.2) {
    chunks = tileChunksToDuration(chunks, timeline.cycleDur, timeline.totalDur)
  }

  const srt = chunksToSrt(chunks)
  lastSrtText.value = srt
  lastSrtFilename.value = `subtitles-${new Date().toISOString().slice(0, 10)}.srt`
  return {
    srt,
    notice: `字幕 ${chunks.length} 句（${built.source}）`
  }
}

const runMerge = async () => {
  if (!canMerge.value) return
  merging.value = true
  mergeError.value = ''
  progressRatio.value = 0
  progressStatus.value = '準備中…'
  logLines.value = []
  clearResult(false)

  try {
    const files = readyClips.value.map((c) => c.file)
    const clipDurations = readyClips.value.map((c) => c.duration || 10)
    const loop = getLoopOptions()

    const { srt, notice: subNotice } = await buildSubtitleSrt()

    // Dynamic import keeps @ffmpeg/ffmpeg out of SSR bundle
    const { mergeVideos } = await import('../../utils/videoMerge/merge.js')

    const result = await mergeVideos(files, {
      noAudio: noAudio.value,
      audioFile: noAudio.value ? null : audioFile.value,
      subtitleSrt: srt,
      clipDurations,
      loop,
      onLog: (msg) => {
        logLines.value.push(msg)
        if (logLines.value.length > 80) logLines.value.shift()
      },
      onProgress: (r) => {
        progressRatio.value = Math.min(1, Math.max(0, r))
      },
      onStatus: (s) => {
        progressStatus.value = s
      }
    })

    resultBlob.value = result.blob
    resultUrl.value = URL.createObjectURL(result.blob)
    resultMeta.value = formatBytes(result.blob.size)
    resultNotice.value = [
      subNotice,
      result.subtitlesEmbedded ? '字幕已嵌入影片' : srt ? '字幕未嵌入，可另下載 SRT' : ''
    ]
      .filter(Boolean)
      .join(' · ')

    await savePreview(result.blob, {
      hasSubtitles: result.subtitlesEmbedded,
      filename: `merged-${Date.now()}.mp4`
    }).catch(() => {})

    progressStatus.value = '完成'
    progressRatio.value = 1
  } catch (err) {
    mergeError.value = err?.message || String(err)
    progressStatus.value = '失敗'
  } finally {
    merging.value = false
  }
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const downloadResult = () => {
  if (!resultBlob.value) return
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadBlob(resultBlob.value, `fengbro-merged-${stamp}.mp4`)
}

const downloadSrt = () => {
  if (!lastSrtText.value) return
  const bom = '\uFEFF'
  downloadBlob(
    new Blob([bom + lastSrtText.value], { type: 'application/x-subrip;charset=utf-8' }),
    lastSrtFilename.value || 'subtitles.srt'
  )
}

const clearResult = (clearStorage = true) => {
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
  resultBlob.value = null
  resultMeta.value = ''
  resultNotice.value = ''
  if (clearStorage) clearStoredPreview().catch(() => {})
}

watch([scriptText, useScriptSubs], () => {
  try {
    localStorage.setItem(SCRIPT_KEY, scriptText.value)
    localStorage.setItem(SCRIPT_OPT_KEY, useScriptSubs.value ? '1' : '0')
  } catch {
    /* ignore */
  }
})

onMounted(async () => {
  try {
    const savedScript = localStorage.getItem(SCRIPT_KEY)
    if (savedScript != null) scriptText.value = savedScript
    const opt = localStorage.getItem(SCRIPT_OPT_KEY)
    if (opt != null) useScriptSubs.value = opt === '1'
  } catch {
    /* ignore */
  }

  try {
    const restored = await loadClips()
    if (restored.length) {
      clips.value = restored
      for (const clip of clips.value) {
        if (clip.status === 'loading' || !clip.firstFrame) {
          try {
            const meta = await extractFrames(clip.file)
            clip.firstFrame = meta.firstFrame
            clip.lastFrame = meta.lastFrame
            clip.duration = meta.duration
            clip.width = meta.width
            clip.height = meta.height
            clip.status = 'ready'
            clip.error = null
          } catch (err) {
            clip.status = 'error'
            clip.error = err?.message || String(err)
          }
        }
      }
      schedulePersist()
    }
  } catch {
    /* ignore */
  }

  try {
    const audio = await loadAudio()
    if (audio) audioFile.value = audio
  } catch {
    /* ignore */
  }

  try {
    const preview = await loadPreview()
    if (preview?.blob) {
      resultBlob.value = preview.blob
      resultUrl.value = URL.createObjectURL(preview.blob)
      resultMeta.value = formatBytes(preview.blob.size)
      resultNotice.value = '已還原上次合併預覽'
    }
  } catch {
    /* ignore */
  }
})

onBeforeUnmount(() => {
  if (persistTimer) clearTimeout(persistTimer)
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
})
</script>

<style scoped>
.vm-panel {
  padding: 1.2rem 1.4rem 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tool-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
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

.store-card__link {
  color: var(--accent-color, #3b82f6);
}

.tool-error {
  margin: 0.55rem 0 0;
  color: var(--danger-color, #ef4444);
  font-size: 0.88rem;
}

.vm-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.vm-card {
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: color-mix(in oklab, var(--bg-primary) 88%, transparent);
}

.vm-card__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.vm-card__actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.vm-step {
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

.vm-meta-tag {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

.vm-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 1.5px dashed var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
  position: relative;
  outline: none;
}

.vm-dropzone.is-dragover,
.vm-dropzone:focus-visible {
  border-color: var(--accent-color, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent-color, #3b82f6) 22%, transparent);
}

.vm-file-input {
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

.vm-dropzone__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-muted);
  pointer-events: none;
  padding: 1rem;
  text-align: center;
}

.vm-check {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.vm-section {
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid color-mix(in oklab, var(--border-color) 80%, transparent);
}

.vm-section__title {
  margin: 0 0 0.5rem;
  font-size: 0.86rem;
  font-weight: 600;
}

.vm-format-toggle {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  overflow: hidden;
  width: fit-content;
  margin-bottom: 0.65rem;
  flex-wrap: wrap;
}

.vm-format-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  padding: 0.4rem 0.85rem;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.vm-format-btn.active {
  background: color-mix(in oklab, var(--accent-color, #3b82f6) 18%, transparent);
  color: var(--text-primary, inherit);
  font-weight: 600;
}

.vm-format-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vm-duration-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.vm-audio-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.vm-hint {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.tool-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.tool-field--wide {
  width: 100%;
}

.tool-input {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
}

.vm-script {
  resize: vertical;
  min-height: 100px;
  line-height: 1.45;
}

.tool-primary-btn,
.tool-secondary-btn {
  border: none;
  border-radius: 14px;
  padding: 0.75rem 1.1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tool-primary-btn {
  background: var(--accent-color, #3b82f6);
  color: #fff;
}

.tool-primary-btn:disabled,
.tool-secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-secondary-btn {
  border: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
  color: var(--text-primary);
}

.tool-primary-btn--compact,
.tool-secondary-btn--compact {
  padding: 0.4rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.vm-empty {
  padding: 1.2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  border: 1px dashed var(--border-color);
  border-radius: 14px;
}

.vm-clip-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.vm-clip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: color-mix(in oklab, var(--bg-secondary) 88%, transparent);
}

.vm-clip__frames {
  display: flex;
  gap: 0.4rem;
}

.vm-clip__frame {
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.vm-clip__frame img {
  width: 72px;
  height: 42px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: #000;
}

.vm-clip__placeholder {
  width: 72px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.8rem;
}

.vm-clip__frame small {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.vm-clip__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.vm-clip__name {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vm-clip__detail {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.vm-clip__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.vm-merge-bar {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in oklab, var(--border-color) 80%, transparent);
}

.vm-progress {
  margin-top: 0.85rem;
}

.vm-progress__label {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.88rem;
  margin-bottom: 0.4rem;
}

.vm-progress__track {
  height: 8px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-secondary) 80%, transparent);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.vm-progress__fill {
  height: 100%;
  background: var(--accent-color, #3b82f6);
  border-radius: 999px;
  transition: width 0.2s ease;
}

.vm-log {
  margin-top: 0.55rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.vm-log pre {
  margin: 0.4rem 0 0;
  max-height: 160px;
  overflow: auto;
  padding: 0.55rem;
  border-radius: 10px;
  background: color-mix(in oklab, var(--bg-primary) 90%, transparent);
  border: 1px solid var(--border-color);
  white-space: pre-wrap;
  word-break: break-all;
}

.vm-result-video {
  width: 100%;
  max-height: 360px;
  border-radius: 14px;
  background: #000;
  border: 1px solid var(--border-color);
}

.vm-result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

@media (max-width: 900px) {
  .vm-layout {
    grid-template-columns: 1fr;
  }

  .vm-clip {
    grid-template-columns: 1fr;
  }

  .vm-clip__actions {
    justify-content: flex-start;
  }
}
</style>
