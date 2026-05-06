<template>
  <section class="voice-panel" :class="{ expanded: isExpanded, listening: isListening }" aria-label="鋒兄語音輸入">
    <button
      type="button"
      class="voice-toggle"
      :class="{ active: isListening }"
      @click="toggleExpanded"
      aria-label="開啟語音輸入"
    >
      <span class="voice-dot"></span>
      <span>Voice</span>
    </button>

    <div v-if="isExpanded" class="voice-card">
      <div class="voice-card__head">
        <div>
          <p class="voice-kicker">{{ currentPageName }}</p>
          <h2>鋒兄語音輸入</h2>
        </div>
        <button type="button" class="voice-close" @click="closePanel" aria-label="關閉語音輸入">Close</button>
      </div>

      <div class="voice-controls">
        <button
          type="button"
          class="voice-main"
          :class="{ recording: isListening }"
          :disabled="!isSupported"
          @click="toggleListening"
        >
          {{ isListening ? '停止聆聽' : '開始聆聽' }}
        </button>
        <button type="button" class="voice-secondary" @click="clearTranscript">清空</button>
      </div>

      <p v-if="!isSupported" class="voice-status error">此瀏覽器尚未支援語音辨識，請使用 Chrome 或 Edge。</p>
      <p v-else class="voice-status" :class="{ error: statusType === 'error', success: statusType === 'success' }">
        {{ statusMessage }}
      </p>

      <div class="voice-transcript">
        <label>辨識內容</label>
        <textarea
          v-model="transcript"
          rows="3"
          placeholder="例如：新增、搜尋 Netflix、輸入 會議紀錄、切換到鋒兄食品、匯出 ZIP"
          @input="prepareCommand"
        ></textarea>
      </div>

      <div v-if="pendingAction" class="voice-confirm">
        <span class="confirm-label">等待確認</span>
        <strong>{{ pendingAction.label }}</strong>
        <p>{{ pendingAction.detail }}</p>
        <div class="confirm-actions">
          <button type="button" class="confirm-btn" @click="executePendingAction">確認執行</button>
          <button type="button" class="cancel-btn" @click="cancelPendingAction">取消</button>
        </div>
      </div>

      <div v-else class="voice-hints">
        <span v-for="hint in activeHints" :key="hint" class="hint-chip" @click="useHint(hint)">
          {{ hint }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  currentPage: { type: String, default: 'home' },
  pages: { type: Array, default: () => [] }
})

const emit = defineEmits(['navigate'])

const isExpanded = ref(false)
const isListening = ref(false)
const isSupported = ref(false)
const transcript = ref('')
const statusMessage = ref('按下開始後說出指令，系統會先預覽，確認後才執行。')
const statusType = ref('idle')
const pendingAction = ref(null)
let recognition = null

const pageAliases = {
  home: ['首頁', '鋒兄首頁', '主頁'],
  dashboard: ['儀表', '儀表板', '鋒兄儀表'],
  subscription: ['訂閱', '鋒兄訂閱'],
  food: ['食品', '食物', '商品庫存', '鋒兄食品'],
  note: ['筆記', '鋒兄筆記'],
  common: ['常用', '常用帳號', '鋒兄常用'],
  gallery: ['圖片', '圖庫', '鋒兄圖片'],
  video: ['影片', '鋒兄影片'],
  music: ['音樂', '鋒兄音樂'],
  document: ['文件', '檔案', '鋒兄文件'],
  podcast: ['播客', 'podcast', '鋒兄播客'],
  bank: ['銀行', '鋒兄銀行'],
  routine: ['例行', '流程', '鋒兄例行'],
  tools: ['工具', '比價', '鋒兄工具'],
  settings: ['設定', '系統設定', '鋒兄設定'],
  about: ['關於', '說明', '鋒兄關於']
}

const pageHints = {
  home: ['切換到鋒兄儀表', '切換到鋒兄訂閱', '切換到鋒兄食品', '搜尋 今日'],
  dashboard: ['切換到鋒兄訂閱', '切換到鋒兄食品', '重新整理', '往下'],
  subscription: ['新增訂閱', '搜尋 Netflix', '輸入 月費 390', '儲存'],
  food: ['新增食品', '搜尋 牛奶', '輸入 義美', '匯出 CSV'],
  note: ['新增筆記', '搜尋 會議', '輸入 今天值整理什麼', '批量選擇'],
  common: ['新增常用', '搜尋 Gmail', '輸入 example@gmail.com', '儲存'],
  gallery: ['新增圖片', '搜尋 封面', '匯入 ZIP', '匯出 ZIP'],
  video: ['新增影片', '搜尋 進化', '切換 Bilibili', '匯出 ZIP'],
  music: ['新增音樂', '搜尋 鋒兄', '輸入 歌詞', '匯出 ZIP'],
  document: ['新增文件', '搜尋 合約', '輸入 備註', '匯入 ZIP'],
  podcast: ['新增播客', '搜尋 訪談', '輸入 節目備註', '儲存'],
  bank: ['新增銀行', '搜尋 富邦', '輸入 帳號', '匯出 CSV'],
  routine: ['新增例行', '搜尋 備份', '輸入 每週檢查', '儲存'],
  tools: ['搜尋 Samsung 26', '手機比價', '鋒兄比價', '查詢價格'],
  settings: ['搜尋 Storage', '往下', '切換到鋒兄關於', '重新整理'],
  about: ['切換到鋒兄首頁', '切換到鋒兄設定', '往上', '搜尋 版本']
}

const currentPageConfig = computed(() => props.pages.find((page) => page.id === props.currentPage))
const currentPageName = computed(() => currentPageConfig.value?.name || '鋒兄系統')
const activeHints = computed(() => pageHints[props.currentPage] || ['新增', '搜尋', '輸入', '儲存'])

const setStatus = (message, type = 'idle') => {
  statusMessage.value = message
  statusType.value = type
}

const normalizeText = (value) => String(value || '').trim()

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const closePanel = () => {
  stopListening()
  isExpanded.value = false
}

const clearTranscript = () => {
  transcript.value = ''
  pendingAction.value = null
  setStatus('已清空，可以重新說一次。')
}

const useHint = (hint) => {
  transcript.value = hint
  prepareCommand()
}

const createRecognition = () => {
  if (typeof window === 'undefined') return null
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return null

  const instance = new SpeechRecognition()
  instance.lang = 'zh-TW'
  instance.continuous = false
  instance.interimResults = true
  instance.maxAlternatives = 1

  instance.onstart = () => {
    isListening.value = true
    setStatus('正在聆聽，說完後會產生待確認指令。')
  }

  instance.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0]?.transcript || '')
      .join('')
      .trim()
    transcript.value = text
    prepareCommand()
  }

  instance.onerror = (event) => {
    isListening.value = false
    setStatus(`語音辨識失敗：${event.error || '未知錯誤'}`, 'error')
  }

  instance.onend = () => {
    isListening.value = false
    if (transcript.value && !pendingAction.value) prepareCommand()
  }

  return instance
}

const toggleListening = () => {
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

const startListening = () => {
  if (!recognition) {
    setStatus('此瀏覽器尚未支援語音辨識。', 'error')
    return
  }
  pendingAction.value = null
  transcript.value = ''
  try {
    recognition.start()
  } catch {
    stopListening()
    setTimeout(() => recognition?.start(), 120)
  }
}

const stopListening = () => {
  if (recognition && isListening.value) recognition.stop()
  isListening.value = false
}

const findPageFromText = (text) => {
  const lower = text.toLowerCase()
  return props.pages.find((page) => {
    const aliases = [page.name, page.title, ...(pageAliases[page.id] || [])]
    return aliases.some((alias) => alias && lower.includes(String(alias).toLowerCase()))
  })
}

const findFirstVisible = (selectors) => {
  const items = document.querySelectorAll(selectors)
  return Array.from(items).find((el) => {
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !el.disabled
  })
}

const clickFirstVisible = (selectors) => {
  const target = findFirstVisible(selectors)
  if (!target) return false
  target.click()
  return true
}

const setNativeValue = (element, value) => {
  const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.focus()
}

const fillFocusedField = (value) => {
  const active = document.activeElement
  if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName) && !active.disabled && !active.readOnly) {
    setNativeValue(active, value)
    return true
  }
  const target = findFirstVisible('textarea, input[type="text"], input[type="search"], input[type="url"], input:not([type])')
  if (!target) return false
  setNativeValue(target, value)
  return true
}

const fillSearch = (value) => {
  const target = findFirstVisible('.search-input, input[type="search"], input[placeholder*="搜尋"]')
  if (!target) return false
  setNativeValue(target, value)
  return true
}

const scrollPage = (direction) => {
  const top = direction === 'top'
  const bottom = direction === 'bottom'
  window.scrollTo({
    top: top ? 0 : bottom ? document.documentElement.scrollHeight : window.scrollY + (direction === 'down' ? 520 : -520),
    behavior: 'smooth'
  })
}

const getInputPayload = (text) => {
  return text
    .replace(/^(請)?(輸入|填入|寫入|記錄|打字|貼上)\s*/i, '')
    .trim()
}

const getSearchPayload = (text) => {
  return text
    .replace(/^(請)?(搜尋|查詢|尋找|找)\s*/i, '')
    .trim()
}

const prepareCommand = () => {
  const text = normalizeText(transcript.value)
  if (!text) {
    pendingAction.value = null
    return
  }

  if (pendingAction.value && /^(確認|確定|執行|送出)$/i.test(text)) {
    executePendingAction()
    return
  }

  const page = findPageFromText(text)
  if (page && /(切換|前往|到|開啟|打開|進入|去)/.test(text)) {
    pendingAction.value = {
      label: `切換到 ${page.name}`,
      detail: '確認後會切換目前工作頁。',
      run: () => emit('navigate', page.id)
    }
    setStatus('已準備頁面切換，請確認。')
    return
  }

  if (/^(請)?(搜尋|查詢|尋找|找)/.test(text)) {
    const keyword = getSearchPayload(text)
    pendingAction.value = {
      label: `搜尋「${keyword || text}」`,
      detail: '確認後會填入目前頁面的搜尋欄。',
      run: () => fillSearch(keyword || text)
    }
    setStatus('已準備搜尋指令，請確認。')
    return
  }

  if (/^(請)?(輸入|填入|寫入|記錄|打字|貼上)/.test(text)) {
    const payload = getInputPayload(text)
    pendingAction.value = {
      label: `填入「${payload || text}」`,
      detail: '確認後會寫入目前聚焦欄位，若沒有聚焦欄位則寫入第一個可輸入欄位。',
      run: () => fillFocusedField(payload || text)
    }
    setStatus('已準備文字輸入，請確認。')
    return
  }

  const quickCommand = buildQuickCommand(text)
  if (quickCommand) {
    pendingAction.value = quickCommand
    setStatus('已準備快速操作，請確認。')
    return
  }

  pendingAction.value = {
    label: `填入「${text}」`,
    detail: '未偵測到明確指令，確認後會把內容填入目前欄位。',
    run: () => fillFocusedField(text)
  }
  setStatus('已轉成一般文字輸入，請確認。')
}

const buildQuickCommand = (text) => {
  if (/(新增|新增一筆|加一筆|建立)/.test(text)) {
    return { label: '新增一筆資料', detail: '確認後會按下目前頁面的新增按鈕。', run: () => clickFirstVisible('.btn-add-icon, .btn-primary, button[title*="新增"]') }
  }
  if (/(儲存|保存|送出|新增完成)/.test(text)) {
    return { label: '儲存目前表單', detail: '確認後會按下目前頁面的儲存或送出按鈕。', run: () => clickFirstVisible('.btn-save, .btn-submit, .btn-save-icon, button[title*="儲存"]') }
  }
  if (/(取消|關閉)/.test(text)) {
    return { label: '取消目前操作', detail: '確認後會按下取消或關閉按鈕。', run: () => clickFirstVisible('.btn-cancel-inline, .btn-cancel, .btn-close, button[title*="取消"]') }
  }
  if (/(匯入|導入)/.test(text)) {
    return { label: '開啟匯入', detail: '確認後會觸發目前頁面的匯入檔案選擇。', run: () => clickFirstVisible('.btn-import') }
  }
  if (/(匯出|導出|下載資料)/.test(text)) {
    return { label: '匯出資料', detail: '確認後會按下目前頁面的匯出按鈕。', run: () => clickFirstVisible('.btn-export') }
  }
  if (/(批量|多選|全選)/.test(text)) {
    return { label: '切換批量選擇', detail: '確認後會按下批量選擇或全選控制。', run: () => clickFirstVisible('.btn-batch-mode, .select-all-label input') }
  }
  if (/(重新整理|刷新|重整)/.test(text)) {
    return { label: '重新整理頁面資料', detail: '確認後會重新載入目前頁面。', run: () => window.location.reload() }
  }
  if (/(往上|到頂部|最上面)/.test(text)) {
    return { label: '捲到頁面上方', detail: '確認後會平滑捲到頁首。', run: () => scrollPage('top') }
  }
  if (/(往下|到底部|最下面)/.test(text)) {
    return { label: '捲到頁面下方', detail: '確認後會平滑捲到頁尾。', run: () => scrollPage('bottom') }
  }
  if (/bilibili/i.test(text)) {
    return { label: '切換 Bilibili 顯示', detail: '確認後會按下 Bilibili 顯示模式。', run: () => clickButtonByText('Bilibili') }
  }
  if (/youtube/i.test(text)) {
    return { label: '切換 YouTube 顯示', detail: '確認後會按下 YouTube 顯示模式。', run: () => clickButtonByText('YouTube') }
  }
  return null
}

const clickButtonByText = (label) => {
  const buttons = Array.from(document.querySelectorAll('button'))
  const target = buttons.find((button) => button.textContent?.toLowerCase().includes(label.toLowerCase()) && !button.disabled)
  if (!target) return false
  target.click()
  return true
}

const executePendingAction = async () => {
  if (!pendingAction.value) return
  const action = pendingAction.value
  pendingAction.value = null
  await nextTick()
  const result = action.run()
  if (result === false) {
    setStatus('找不到可執行的目標，請先切到正確頁面或點選欄位。', 'error')
  } else {
    setStatus('已執行。需要寫入或刪除時，頁面本身仍會再確認。', 'success')
    transcript.value = ''
  }
}

const cancelPendingAction = () => {
  pendingAction.value = null
  setStatus('已取消，沒有執行任何操作。')
}

watch(() => props.currentPage, () => {
  pendingAction.value = null
  setStatus(`目前在 ${currentPageName.value}，可以說新增、搜尋、輸入、匯入或匯出。`)
})

onMounted(() => {
  recognition = createRecognition()
  isSupported.value = !!recognition
})

onBeforeUnmount(() => {
  stopListening()
  recognition = null
})
</script>

<style scoped>
.voice-panel {
  position: fixed;
  right: clamp(0.75rem, 2vw, 1.25rem);
  bottom: clamp(0.75rem, 2vw, 1.25rem);
  z-index: 1200;
  max-width: min(420px, calc(100vw - 1.5rem));
  font-family: var(--font-body);
}

.voice-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 3rem;
  padding: 0 1rem;
  border: 1px solid color-mix(in oklab, var(--accent) 45%, var(--border-color));
  border-radius: 999px;
  background: color-mix(in oklab, var(--card-bg) 92%, transparent);
  color: var(--text-primary);
  box-shadow: var(--shadow-soft);
  cursor: pointer;
}

.voice-toggle.active {
  border-color: #ef4444;
  color: #b91c1c;
}

.voice-dot {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 5px color-mix(in oklab, #22c55e 16%, transparent);
}

.voice-toggle.active .voice-dot {
  background: #ef4444;
  animation: voicePulse 1.2s ease-in-out infinite;
}

.voice-card {
  margin-top: 0.65rem;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: color-mix(in oklab, var(--card-bg) 96%, transparent);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(16px);
}

.voice-card__head,
.voice-controls,
.confirm-actions,
.voice-hints {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.voice-card__head {
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.voice-kicker {
  margin: 0 0 0.2rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.voice-card h2 {
  margin: 0;
  font-size: 1.2rem;
}

.voice-close,
.voice-secondary,
.cancel-btn {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 0.55rem 0.8rem;
  cursor: pointer;
}

.voice-main,
.confirm-btn {
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  padding: 0.65rem 1rem;
  font-weight: 800;
  cursor: pointer;
}

.voice-main:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.voice-main.recording {
  background: linear-gradient(135deg, #ef4444, #f97316);
}

.voice-status {
  margin: 0.7rem 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.voice-status.error {
  color: #dc2626;
}

.voice-status.success {
  color: #047857;
}

.voice-transcript label {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 800;
}

.voice-transcript textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0.75rem;
  font: inherit;
  line-height: 1.45;
}

.voice-confirm {
  margin-top: 0.85rem;
  padding: 0.8rem;
  border: 1px solid #f59e0b;
  border-radius: 14px;
  background: #fffbeb;
  color: #78350f;
}

.voice-confirm strong,
.voice-confirm p {
  display: block;
  margin: 0.25rem 0;
}

.confirm-label {
  color: #b45309;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.voice-hints {
  margin-top: 0.85rem;
}

.hint-chip {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 0.45rem 0.65rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
}

@keyframes voicePulse {
  0%, 100% { box-shadow: 0 0 0 4px color-mix(in oklab, #ef4444 16%, transparent); }
  50% { box-shadow: 0 0 0 10px color-mix(in oklab, #ef4444 0%, transparent); }
}

@media (max-width: 720px) {
  .voice-panel {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
  }

  .voice-card {
    max-height: min(72vh, 620px);
    overflow: auto;
  }
}
</style>
