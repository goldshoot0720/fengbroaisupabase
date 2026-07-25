<template>
  <section class="tool-panel ifc-panel">
    <div class="tool-panel__header">
      <div>
        <p class="panel-kicker">圖片格式轉換</p>
        <h3>批次上傳圖片，轉成 JPEG 或 PNG</h3>
        <p class="tool-subtitle">
          參考
          <a
            href="https://github.com/huang1988pioneer/PNGJPEGConverter"
            target="_blank"
            rel="noreferrer"
            class="store-card__link"
          >PNGJPEGConverter</a>
          · 本機 Canvas 轉換，不上傳伺服器
          · 可一次選一連串檔案，或貼圖片網址
        </p>
      </div>
    </div>

    <div class="ifc-layout">
      <!-- Upload -->
      <div class="ifc-card">
        <div class="ifc-card__head">
          <span class="ifc-step">1</span>
          <strong>加入圖片</strong>
          <button
            v-if="items.length"
            type="button"
            class="tool-secondary-btn tool-secondary-btn--compact ifc-clear-all"
            @click="clearAll"
          >
            清除全部
          </button>
        </div>

        <div
          class="ifc-dropzone"
          :class="{ 'is-dragover': isDragOver }"
          role="button"
          tabindex="0"
          aria-label="上傳圖片"
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
            accept="image/png,image/jpeg,image/webp,image/bmp,image/gif,image/tiff,image/avif,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,.avif"
            multiple
            class="ifc-file-input"
            tabindex="-1"
            @change="onFilePick"
            @click.stop
          />
          <div class="ifc-dropzone__empty">
            <span>拖放或點選多張圖片</span>
            <small>PNG / JPEG / WebP / BMP / GIF / TIFF / AVIF（依瀏覽器解碼能力）</small>
          </div>
        </div>

        <div class="ifc-url-row">
          <label class="ifc-field ifc-field--grow">
            <span>圖片網址（可選）</span>
            <input
              v-model.trim="urlInput"
              type="url"
              class="tool-input"
              placeholder="https://example.com/photo.png"
              :disabled="fetchingUrl"
              @keydown.enter.prevent="addFromUrl"
            />
          </label>
          <button
            type="button"
            class="tool-secondary-btn"
            :disabled="!urlInput || fetchingUrl"
            @click="addFromUrl"
          >
            {{ fetchingUrl ? '讀取中…' : '加入網址' }}
          </button>
        </div>

        <p v-if="pickError" class="tool-error">{{ pickError }}</p>
        <p v-else-if="items.length" class="ifc-hint">已選 {{ items.length }} 張 · HEIC 等格式需瀏覽器支援才可解碼</p>
      </div>

      <!-- Options -->
      <div class="ifc-card">
        <div class="ifc-card__head">
          <span class="ifc-step">2</span>
          <strong>輸出設定</strong>
        </div>

        <div class="ifc-options">
          <label class="ifc-field">
            <span>目標格式</span>
            <div class="ifc-format-toggle" role="group" aria-label="目標格式">
              <button
                type="button"
                class="ifc-format-btn"
                :class="{ active: targetFormat === 'jpg' }"
                @click="targetFormat = 'jpg'"
              >
                JPEG
              </button>
              <button
                type="button"
                class="ifc-format-btn"
                :class="{ active: targetFormat === 'png' }"
                @click="targetFormat = 'png'"
              >
                PNG
              </button>
            </div>
          </label>

          <label v-if="targetFormat === 'jpg'" class="ifc-field">
            <span>JPEG 品質 {{ Math.round(jpegQuality * 100) }}%（1–100，預設 100）</span>
            <input
              v-model.number="jpegQuality"
              type="range"
              min="0.01"
              max="1"
              step="0.01"
              class="ifc-range"
            />
          </label>

          <label v-if="targetFormat === 'jpg'" class="ifc-field">
            <span>透明底色（有透明通道 → JPEG）</span>
            <select v-model="jpegBackground" class="tool-input ifc-select">
              <option value="#ffffff">白色（預設，同參考專案）</option>
              <option value="#000000">黑色</option>
              <option value="#f3f4f6">淺灰</option>
            </select>
          </label>
        </div>

        <div class="ifc-actions">
          <button
            type="button"
            class="tool-primary-btn"
            :disabled="!items.length || converting"
            @click="convertAll"
          >
            {{ converting ? `轉換中 ${convertProgress}/${items.length}…` : '開始轉換' }}
          </button>
          <button
            type="button"
            class="tool-secondary-btn"
            :disabled="!readyCount || converting || zipping"
            @click="downloadZip"
          >
            {{ zipping ? '打包中…' : '下載 ZIP' }}
          </button>
          <button
            type="button"
            class="tool-secondary-btn"
            :disabled="!readyCount || converting"
            @click="downloadAll"
          >
            全部下載
          </button>
        </div>
        <p v-if="convertError" class="tool-error">{{ convertError }}</p>
        <p v-else-if="readyCount" class="ifc-hint">
          已完成 {{ readyCount }} / {{ items.length }} 張 · 同名檔會自動加流水號
        </p>
      </div>
    </div>

    <!-- File list -->
    <div v-if="items.length" class="ifc-card ifc-list-card">
      <div class="ifc-card__head">
        <span class="ifc-step">3</span>
        <strong>檔案清單</strong>
      </div>

      <ul class="ifc-list" aria-label="待轉換圖片清單">
        <li v-for="item in items" :key="item.id" class="ifc-item">
          <div class="ifc-item__thumb-wrap">
            <img
              v-if="item.previewUrl"
              :src="item.resultUrl || item.previewUrl"
              :alt="item.name"
              class="ifc-item__thumb"
            />
          </div>
          <div class="ifc-item__meta">
            <strong class="ifc-item__name" :title="item.name">{{ item.name }}</strong>
            <span class="ifc-item__detail">
              {{ formatLabel(item.sourceFormat) }}
              <template v-if="item.fromUrl"> · 網址</template>
              <template v-if="item.width"> · {{ item.width }}×{{ item.height }}</template>
              · {{ formatBytes(item.sourceSize) }}
              <template v-if="item.status === 'done'">
                → {{ formatLabel(targetFormat) }} · {{ formatBytes(item.resultSize) }}
              </template>
            </span>
            <span v-if="item.error" class="ifc-item__error">{{ item.error }}</span>
            <span v-else-if="item.status === 'converting'" class="ifc-item__status">轉換中…</span>
            <span v-else-if="item.status === 'done'" class="ifc-item__status ifc-item__status--ok">完成</span>
            <span v-else class="ifc-item__status">等待</span>
          </div>
          <div class="ifc-item__actions">
            <button
              v-if="item.status === 'done' && item.resultBlob"
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              @click="downloadOne(item)"
            >
              下載
            </button>
            <button
              type="button"
              class="tool-secondary-btn tool-secondary-btn--compact"
              :disabled="converting"
              @click="removeItem(item.id)"
            >
              移除
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import JSZip from 'jszip'
import {
  convertImageFormat,
  detectSourceFormat,
  fetchImageAsFile,
  formatBytes,
  formatLabel,
  isSupportedImageFile,
  loadImageFromBlob,
  replaceExtension,
  uniqueFileName
} from '../../utils/imageFormatConvert'
import { sanitizeZipFileName } from '../../utils/zipMediaBundle'

const fileInputRef = ref(null)
const isDragOver = ref(false)
const pickError = ref('')
const convertError = ref('')
const converting = ref(false)
const zipping = ref(false)
const fetchingUrl = ref(false)
const convertProgress = ref(0)
const targetFormat = ref('jpg')
/** Default 100% — matches PNGJPEGConverter */
const jpegQuality = ref(1)
const jpegBackground = ref('#ffffff')
const urlInput = ref('')
const items = ref([])

let idSeq = 0

const readyCount = computed(() => items.value.filter((i) => i.status === 'done' && i.resultBlob).length)

const openPicker = () => {
  fileInputRef.value?.click()
}

const onFilePick = (event) => {
  const files = Array.from(event.target?.files || [])
  addFiles(files)
  if (event.target) event.target.value = ''
}

const onDrop = (event) => {
  isDragOver.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  addFiles(files)
}

const pushFileEntry = async (file, { fromUrl = false } = {}) => {
  const id = `ifc-${Date.now()}-${++idSeq}`
  const previewUrl = URL.createObjectURL(file)
  const sourceFormat = detectSourceFormat(file)
  const entry = {
    id,
    name: file.name || `image-${idSeq}`,
    file,
    sourceFormat,
    sourceSize: file.size,
    previewUrl,
    fromUrl,
    width: 0,
    height: 0,
    status: 'pending',
    error: '',
    resultBlob: null,
    resultUrl: '',
    resultSize: 0,
    outName: ''
  }
  items.value.push(entry)

  try {
    const img = await loadImageFromBlob(file)
    entry.width = img.naturalWidth || img.width
    entry.height = img.naturalHeight || img.height
  } catch {
    // dimensions optional; convert will surface decode errors
  }
}

const addFiles = async (files) => {
  pickError.value = ''
  convertError.value = ''
  if (!files.length) return

  const accepted = files.filter(isSupportedImageFile)
  const skipped = files.length - accepted.length
  if (!accepted.length) {
    pickError.value = '請選擇可支援的圖片（PNG / JPEG / WebP / BMP / GIF / TIFF / AVIF 等）'
    return
  }
  if (skipped > 0) {
    pickError.value = `已略過 ${skipped} 個非圖片檔`
  }

  for (const file of accepted) {
    await pushFileEntry(file)
  }
}

const addFromUrl = async () => {
  if (!urlInput.value || fetchingUrl.value) return
  pickError.value = ''
  convertError.value = ''
  fetchingUrl.value = true
  try {
    const file = await fetchImageAsFile(urlInput.value)
    await pushFileEntry(file, { fromUrl: true })
    urlInput.value = ''
  } catch (err) {
    pickError.value =
      err?.message ||
      '無法從網址載入圖片（可能被 CORS 阻擋，請改下載後本機上傳）'
  } finally {
    fetchingUrl.value = false
  }
}

const revokeItemUrls = (item) => {
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
}

const removeItem = (id) => {
  const idx = items.value.findIndex((i) => i.id === id)
  if (idx < 0) return
  revokeItemUrls(items.value[idx])
  items.value.splice(idx, 1)
}

const clearAll = () => {
  for (const item of items.value) revokeItemUrls(item)
  items.value = []
  pickError.value = ''
  convertError.value = ''
  convertProgress.value = 0
  urlInput.value = ''
}

const convertAll = async () => {
  if (!items.value.length || converting.value) return
  converting.value = true
  convertError.value = ''
  convertProgress.value = 0

  const target = targetFormat.value === 'png' ? 'png' : 'jpg'
  const quality = jpegQuality.value
  const background = jpegBackground.value
  const usedNames = new Set()

  try {
    for (const item of items.value) {
      item.status = 'converting'
      item.error = ''
      if (item.resultUrl) {
        URL.revokeObjectURL(item.resultUrl)
        item.resultUrl = ''
      }
      item.resultBlob = null
      item.resultSize = 0
      item.outName = ''

      try {
        const { blob, width, height } = await convertImageFormat(item.file, {
          target,
          quality,
          background
        })
        item.width = width
        item.height = height
        item.resultBlob = blob
        item.resultSize = blob.size
        item.resultUrl = URL.createObjectURL(blob)
        item.outName = uniqueFileName(replaceExtension(item.name, target), usedNames)
        item.status = 'done'
      } catch (err) {
        item.status = 'error'
        item.error = err?.message || String(err)
      }
      convertProgress.value += 1
    }

    const failed = items.value.filter((i) => i.status === 'error').length
    if (failed > 0) {
      convertError.value = `${failed} 張轉換失敗，其餘可下載`
    }
  } finally {
    converting.value = false
  }
}

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const downloadOne = (item) => {
  if (!item.resultBlob) return
  const name =
    item.outName || replaceExtension(item.name, targetFormat.value)
  triggerDownload(item.resultBlob, name)
}

const downloadAll = async () => {
  const ready = items.value.filter((i) => i.status === 'done' && i.resultBlob)
  if (!ready.length) return
  const used = new Set()
  for (const item of ready) {
    const name = uniqueFileName(
      sanitizeZipFileName(item.outName || replaceExtension(item.name, targetFormat.value)),
      used
    )
    triggerDownload(item.resultBlob, name)
    // Brief gap so browsers don't collapse multi-download prompts
    await new Promise((r) => setTimeout(r, 120))
  }
}

const downloadZip = async () => {
  const ready = items.value.filter((i) => i.status === 'done' && i.resultBlob)
  if (!ready.length || zipping.value) return
  zipping.value = true
  convertError.value = ''
  try {
    const zip = new JSZip()
    const used = new Set()
    for (const item of ready) {
      const name = uniqueFileName(
        sanitizeZipFileName(item.outName || replaceExtension(item.name, targetFormat.value)),
        used
      )
      zip.file(name, item.resultBlob)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    triggerDownload(blob, `fengbro-images-${targetFormat.value}-${stamp}.zip`)
  } catch (err) {
    convertError.value = err?.message || String(err)
  } finally {
    zipping.value = false
  }
}

onBeforeUnmount(() => {
  for (const item of items.value) revokeItemUrls(item)
})
</script>

<style scoped>
.ifc-panel {
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

.store-card__link {
  color: var(--accent-color, #3b82f6);
}

.tool-error {
  margin: 0.55rem 0 0;
  color: var(--danger-color, #ef4444);
  font-size: 0.88rem;
}

.ifc-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.ifc-card {
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: color-mix(in oklab, var(--bg-primary) 88%, transparent);
}

.ifc-list-card {
  margin-top: 1rem;
}

.ifc-card__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.ifc-clear-all {
  margin-left: auto;
}

.ifc-step {
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

.ifc-dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  border: 1.5px dashed var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
  position: relative;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.ifc-dropzone.is-dragover,
.ifc-dropzone:focus-visible {
  border-color: var(--accent-color, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent-color, #3b82f6) 22%, transparent);
}

.ifc-file-input {
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

.ifc-dropzone__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-muted);
  pointer-events: none;
  padding: 1rem;
  text-align: center;
}

.ifc-url-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.ifc-field--grow {
  flex: 1 1 12rem;
  min-width: 0;
}

.ifc-hint {
  margin: 0.55rem 0 0;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.ifc-options {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.ifc-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.86rem;
  color: var(--text-muted);
}

.ifc-format-toggle {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  overflow: hidden;
  width: fit-content;
}

.ifc-format-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  padding: 0.45rem 1.1rem;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.ifc-format-btn.active {
  background: color-mix(in oklab, var(--accent-color, #3b82f6) 18%, transparent);
  color: var(--text-primary, inherit);
  font-weight: 600;
}

.ifc-range {
  width: 100%;
  accent-color: var(--accent-color, #3b82f6);
}

.ifc-select {
  max-width: 16rem;
}

.tool-input {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
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

.tool-secondary-btn {
  border: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
  color: var(--text-primary);
}

.tool-secondary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-primary-btn--compact,
.tool-secondary-btn--compact {
  padding: 0.4rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.ifc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
}

.ifc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.ifc-item {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: color-mix(in oklab, var(--bg-secondary) 88%, transparent);
}

.ifc-item__thumb-wrap {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  background: color-mix(in oklab, var(--bg-primary) 80%, transparent);
  border: 1px solid var(--border-color);
}

.ifc-item__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ifc-item__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ifc-item__name {
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ifc-item__detail {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.ifc-item__error {
  font-size: 0.78rem;
  color: var(--danger-color, #ef4444);
}

.ifc-item__status {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.ifc-item__status--ok {
  color: var(--success-color, #22c55e);
}

.ifc-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
}

@media (max-width: 820px) {
  .ifc-layout {
    grid-template-columns: 1fr;
  }

  .ifc-item {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .ifc-item__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
</style>
