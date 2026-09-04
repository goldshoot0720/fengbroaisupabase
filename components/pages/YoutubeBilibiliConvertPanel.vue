<template>
  <section class="tool-panel ybc-panel">
    <div class="tool-panel__header">
      <div>
        <p class="panel-kicker">YouTube / Bilibili</p>
        <h3>網址轉成 MP3 或 MP4</h3>
        <p class="tool-subtitle">
          參考
          <a
            href="https://github.com/huang1988pioneer/YoutubeBilibiliMP4MP3Converter"
            target="_blank"
            rel="noreferrer"
            class="store-card__link"
          >YoutubeBilibiliMP4MP3Converter</a>
          · 伺服器端以 yt-dlp + ffmpeg 轉檔
          · 需本機／自架環境安裝工具（Netlify 無伺服器通常不可用）
        </p>
      </div>
    </div>

    <!-- Tool status -->
    <div class="ybc-card ybc-status-card" :class="{ 'is-ready': toolReady, 'is-missing': toolReady === false }">
      <div class="ybc-card__head">
        <span class="ybc-step">0</span>
        <strong>轉檔環境</strong>
        <span class="ybc-meta-tag">{{ statusLabel }}</span>
      </div>
      <p class="ybc-hint">{{ statusNote }}</p>
      <p v-if="statusInstall" class="ybc-hint ybc-hint--code">{{ statusInstall }}</p>
      <div class="ybc-status-actions">
        <button
          type="button"
          class="tool-secondary-btn tool-secondary-btn--compact"
          :disabled="statusLoading"
          @click="refreshStatus"
        >
          {{ statusLoading ? '檢查中…' : '重新檢查' }}
        </button>
        <a
          href="https://github.com/huang1988pioneer/YoutubeBilibiliMP4MP3Converter"
          target="_blank"
          rel="noreferrer"
          class="tool-secondary-btn tool-secondary-btn--compact store-card__link"
        >
          桌面版（本機 yt-dlp）
        </a>
      </div>
    </div>

    <div class="ybc-layout">
      <!-- URLs -->
      <div class="ybc-card">
        <div class="ybc-card__head">
          <span class="ybc-step">1</span>
          <strong>影片網址</strong>
          <button
            type="button"
            class="tool-secondary-btn tool-secondary-btn--compact ybc-clear"
            :disabled="converting"
            @click="clearUrls"
          >
            清除網址
          </button>
        </div>

        <label class="tool-field">
          <span>網址組數</span>
          <div class="ybc-format-toggle" role="group" aria-label="網址組數">
            <button
              v-for="n in URL_COUNTS"
              :key="n"
              type="button"
              class="ybc-format-btn"
              :class="{ active: urlCount === n }"
              :disabled="converting"
              @click="urlCount = n"
            >
              {{ n }}
            </button>
          </div>
        </label>

        <div class="ybc-url-list">
          <label v-for="i in urlCount" :key="i" class="tool-field tool-field--wide">
            <span>網址 {{ i }}</span>
            <input
              v-model.trim="urls[i - 1]"
              type="url"
              class="tool-input"
              :disabled="converting"
              :placeholder="i === 1 ? 'https://www.youtube.com/watch?v=… 或 bilibili.com/video/BV…' : `網址 ${i}`"
              @keydown.enter.prevent="runConvert"
            />
          </label>
        </div>
        <p class="ybc-hint">支援 YouTube 單片／播放清單、Bilibili 影片（例：BV 號連結）。一次最多 7 組。</p>
      </div>

      <!-- Options -->
      <div class="ybc-card">
        <div class="ybc-card__head">
          <span class="ybc-step">2</span>
          <strong>輸出格式</strong>
        </div>

        <label class="tool-field">
          <span>格式</span>
          <div class="ybc-format-toggle" role="group" aria-label="輸出格式">
            <button
              type="button"
              class="ybc-format-btn"
              :class="{ active: outputFormat === 'mp3' }"
              :disabled="converting"
              @click="outputFormat = 'mp3'"
            >
              MP3
            </button>
            <button
              type="button"
              class="ybc-format-btn"
              :class="{ active: outputFormat === 'mp4' }"
              :disabled="converting"
              @click="outputFormat = 'mp4'"
            >
              MP4
            </button>
          </div>
        </label>

        <label v-if="outputFormat === 'mp4'" class="tool-field">
          <span>MP4 畫質</span>
          <div class="ybc-format-toggle" role="group" aria-label="MP4 畫質">
            <button
              type="button"
              class="ybc-format-btn"
              :class="{ active: mp4Quality === '1080p' }"
              :disabled="converting"
              @click="mp4Quality = '1080p'"
            >
              1080p
            </button>
            <button
              type="button"
              class="ybc-format-btn"
              :class="{ active: mp4Quality === '4k' }"
              :disabled="converting"
              @click="mp4Quality = '4k'"
            >
              4K
            </button>
          </div>
        </label>

        <p class="ybc-hint">
          {{ outputFormat === 'mp3' ? '抽取音訊為 MP3（最高音質），可嵌入縮圖與中文字幕（若平台有提供）。' : `下載並合併為 MP4（最高 ${mp4Quality === '4k' ? '4K' : '1080p'}）。` }}
        </p>

        <div class="ybc-actions">
          <button
            type="button"
            class="tool-primary-btn"
            :disabled="!canConvert"
            @click="runConvert"
          >
            {{ converting ? '轉換中…' : `轉成 ${outputFormat.toUpperCase()}` }}
          </button>
        </div>
        <p class="tool-notice" :class="{ 'ybc-status--busy': converting }">{{ progressStatus }}</p>
        <p v-if="error" class="tool-error">{{ error }}</p>
      </div>
    </div>

    <!-- Log -->
    <div class="ybc-card">
      <div class="ybc-card__head">
        <span class="ybc-step">3</span>
        <strong>記錄</strong>
      </div>
      <pre class="ybc-log" aria-live="polite">{{ logText || '（轉換時會顯示 yt-dlp 記錄）' }}</pre>
    </div>

    <!-- Result -->
    <div v-if="result" class="ybc-card ybc-result">
      <div class="ybc-card__head">
        <strong>成品</strong>
        <span class="ybc-meta-tag">{{ result.filename }} · {{ formatBytes(result.size) }}</span>
      </div>
      <audio v-if="result.isAudio" class="ybc-player" :src="result.url" controls />
      <video v-else-if="result.isVideo" class="ybc-player" :src="result.url" controls playsinline />
      <div class="ybc-result-actions">
        <a
          class="tool-primary-btn tool-primary-btn--compact"
          :href="result.url"
          :download="result.filename"
        >
          下載 {{ result.extLabel }}
        </a>
        <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="clearResult">
          清除
        </button>
      </div>
      <p v-if="result.notice" class="ybc-hint">{{ result.notice }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const URL_COUNTS = [1, 3, 7]
const PREFS_KEY = 'fengbro.tools.ytbili-convert'

const urls = ref(['', '', '', '', '', '', ''])
const urlCount = ref(1)
const outputFormat = ref('mp3')
const mp4Quality = ref('1080p')
const converting = ref(false)
const progressStatus = ref('準備就緒')
const error = ref('')
const logText = ref('')
const result = ref(null)

const statusLoading = ref(false)
const toolReady = ref(null)
const statusNote = ref('正在檢查 yt-dlp / ffmpeg…')
const statusInstall = ref('')

const filledUrls = computed(() =>
  urls.value
    .slice(0, urlCount.value)
    .map((u) => u.trim())
    .filter(Boolean)
)

const canConvert = computed(
  () => filledUrls.value.length > 0 && !converting.value && toolReady.value === true
)

const statusLabel = computed(() => {
  if (statusLoading.value) return '檢查中'
  if (toolReady.value === true) return '就緒'
  if (toolReady.value === false) return '缺少工具'
  return '未知'
})

const formatBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const clearUrls = () => {
  urls.value = ['', '', '', '', '', '', '']
  progressStatus.value = '網址已清除'
}

const clearResult = () => {
  if (result.value?.url) URL.revokeObjectURL(result.value.url)
  result.value = null
}

const refreshStatus = async () => {
  statusLoading.value = true
  try {
    const res = await fetch('/api/feng-tools/media-dl/status')
    const data = await res.json()
    toolReady.value = Boolean(data?.ready)
    statusNote.value = data?.note || ''
    statusInstall.value = data?.ready ? '' : data?.installHint || ''
    if (data?.ready) {
      progressStatus.value = '準備就緒 — 可開始轉換'
      logText.value = [
        data.ytDlp ? `yt-dlp: ${data.ytDlp}` : '',
        data.ffmpeg ? `ffmpeg: ${data.ffmpeg}` : '',
        data.ffprobe ? `ffprobe: ${data.ffprobe}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    } else {
      progressStatus.value = '需要 yt-dlp 與 ffmpeg 才能轉換'
      logText.value = [
        data?.installHint || '',
        data?.note || '',
        '也可使用桌面版：https://github.com/huang1988pioneer/YoutubeBilibiliMP4MP3Converter'
      ]
        .filter(Boolean)
        .join('\n')
    }
  } catch (err) {
    toolReady.value = false
    statusNote.value = err?.message || String(err)
    statusInstall.value = ''
    progressStatus.value = '無法連線狀態 API'
  } finally {
    statusLoading.value = false
  }
}

const runConvert = async () => {
  if (!canConvert.value) {
    if (toolReady.value === false) {
      error.value = '伺服器未安裝 yt-dlp / ffmpeg，請見上方說明或改用桌面版'
    } else if (!filledUrls.value.length) {
      error.value = '請至少輸入一個 YouTube 或 Bilibili 網址'
    }
    return
  }

  converting.value = true
  error.value = ''
  clearResult()
  progressStatus.value = `正在轉換 ${filledUrls.value.length} 個項目…`
  logText.value = `開始轉換（${outputFormat.value.toUpperCase()}）…\n`

  try {
    const res = await fetch('/api/feng-tools/media-dl/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: filledUrls.value,
        format: outputFormat.value,
        mp4Quality: mp4Quality.value
      })
    })

    if (!res.ok) {
      let msg = `轉換失敗（HTTP ${res.status}）`
      let logs = ''
      try {
        const data = await res.json()
        msg = data?.statusMessage || data?.message || msg
        if (data?.data?.logs?.length) logs = data.data.logs.join('\n')
        if (data?.data?.installHint) statusInstall.value = data.data.installHint
        if (res.status === 503) toolReady.value = false
      } catch {
        const text = await res.text().catch(() => '')
        if (text) msg = text.slice(0, 400)
      }
      error.value = msg
      if (logs) logText.value += `\n${logs}`
      progressStatus.value = '轉換失敗'
      return
    }

    const blob = await res.blob()
    const headerName = res.headers.get('X-Fengbro-Filename')
    const filename = headerName
      ? decodeURIComponent(headerName)
      : guessFilename(res.headers.get('Content-Disposition'), blob.type)
    const successCount = res.headers.get('X-Fengbro-Success-Count')
    const total = res.headers.get('X-Fengbro-Total')
    const url = URL.createObjectURL(blob)
    const isAudio = /audio\//i.test(blob.type) || /\.mp3$/i.test(filename)
    const isVideo = /video\//i.test(blob.type) || /\.mp4$/i.test(filename)
    const isZip = /zip/i.test(blob.type) || /\.zip$/i.test(filename)

    result.value = {
      url,
      filename,
      size: blob.size,
      isAudio: isAudio && !isZip,
      isVideo: isVideo && !isZip,
      extLabel: isZip ? 'ZIP' : isAudio ? 'MP3' : isVideo ? 'MP4' : '檔案',
      notice:
        successCount && total
          ? `完成 ${successCount}/${total} 個項目`
          : ''
    }
    progressStatus.value = result.value.notice
      ? `完成！${result.value.notice}`
      : `完成！${filename}`
    logText.value += `\n下載就緒：${filename}（${formatBytes(blob.size)}）`
  } catch (err) {
    error.value = err?.message || String(err)
    progressStatus.value = '轉換時發生錯誤'
    logText.value += `\n${error.value}`
  } finally {
    converting.value = false
  }
}

const guessFilename = (disposition, mime) => {
  if (disposition) {
    const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition)
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1].replace(/"/g, ''))
      } catch {
        return m[1].replace(/"/g, '')
      }
    }
  }
  if (/audio\//i.test(mime || '')) return 'converted.mp3'
  if (/video\//i.test(mime || '')) return 'converted.mp4'
  if (/zip/i.test(mime || '')) return 'converted.zip'
  return 'converted.bin'
}

const persistPrefs = () => {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        urlCount: urlCount.value,
        outputFormat: outputFormat.value,
        mp4Quality: mp4Quality.value
      })
    )
  } catch {
    /* ignore */
  }
}

watch([urlCount, outputFormat, mp4Quality], persistPrefs)

onMounted(() => {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (URL_COUNTS.includes(data.urlCount)) urlCount.value = data.urlCount
      if (data.outputFormat === 'mp3' || data.outputFormat === 'mp4') {
        outputFormat.value = data.outputFormat
      }
      if (data.mp4Quality === '1080p' || data.mp4Quality === '4k') {
        mp4Quality.value = data.mp4Quality
      }
    }
  } catch {
    /* ignore */
  }
  refreshStatus()
})

onBeforeUnmount(() => {
  clearResult()
})
</script>

<style scoped>
.ybc-panel {
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
  color: var(--primary-text);
  text-decoration: none;
}

.tool-error {
  margin: 0.55rem 0 0;
  color: var(--danger-text);
  font-size: 0.88rem;
}

.tool-notice {
  margin: 0.55rem 0 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.ybc-status--busy {
  color: var(--primary-text);
}

.ybc-layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.ybc-card {
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: color-mix(in oklab, var(--bg-primary) 88%, transparent);
}

.ybc-status-card.is-ready {
  border-color: color-mix(in oklab, var(--success) 45%, var(--border-color));
}

.ybc-status-card.is-missing {
  border-color: color-mix(in oklab, var(--warning) 45%, var(--border-color));
}

.ybc-card__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.ybc-clear {
  margin-left: auto;
}

.ybc-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary) 18%, transparent);
  color: var(--primary-text);
  font-size: 0.72rem;
  font-weight: 700;
}

.ybc-meta-tag {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ybc-hint {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.ybc-hint--code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.78rem;
  word-break: break-all;
}

.ybc-status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.65rem;
}

.ybc-url-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.65rem;
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
  border-radius: var(--radius-lg);
  padding: 0.55rem 0.7rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
}

.ybc-format-toggle {
  display: inline-flex;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  overflow: hidden;
  width: fit-content;
  flex-wrap: wrap;
}

.ybc-format-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  padding: 0.4rem 0.9rem;
  font: inherit;
  font-size: 0.88rem;
  cursor: pointer;
}

.ybc-format-btn.active {
  background: color-mix(in oklab, var(--primary) 18%, transparent);
  color: var(--text-primary, inherit);
  font-weight: 600;
}

.ybc-format-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ybc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
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
  background: var(--primary-solid);
  color: var(--on-primary);
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
  border-radius: var(--radius-lg);
  font-size: 0.85rem;
}

.ybc-log {
  margin: 0;
  min-height: 140px;
  max-height: 240px;
  overflow: auto;
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-lg);
  background: color-mix(in oklab, var(--neutral-solid) 92%, transparent);
  color: var(--text-inverse);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}

.ybc-player {
  width: 100%;
  max-height: 320px;
  border-radius: var(--radius-lg);
  background: var(--surface-strong);
  border: 1px solid var(--border-color);
}

.ybc-result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

@media (max-width: 900px) {
  .ybc-layout {
    grid-template-columns: 1fr;
  }
}
</style>
