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
          :disabled="!isSupported || (isListening && !canStopListening)"
          @click="toggleListening"
        >
          {{ voiceMainLabel }}
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
          placeholder="例如：鋒兄食品、新增食品、搜尋 Netflix、日期 明天、輸入 月費 390、先新增再輸入名稱牛奶"
          @input="handleTranscriptInput"
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

      <details class="voice-guide">
        <summary>可說指令</summary>
        <div class="guide-grid">
          <div v-for="group in commandGuide" :key="group.title" class="guide-group">
            <strong>{{ group.title }}</strong>
            <button
              v-for="example in group.examples"
              :key="example"
              type="button"
              @click="useHint(example)"
            >
              {{ example }}
            </button>
          </div>
        </div>
      </details>
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
const MIN_RECORDING_MS = 10000
const recordingElapsedMs = ref(0)
const recordingStartedAt = ref(0)
let recognition = null
let recordingTimer = null
let manuallyStopping = false
let shouldKeepListening = false

const canStopListening = computed(() => !isListening.value || recordingElapsedMs.value >= MIN_RECORDING_MS)
const recordingRemainingSeconds = computed(() => {
  if (!isListening.value) return 0
  return Math.max(0, Math.ceil((MIN_RECORDING_MS - recordingElapsedMs.value) / 1000))
})
const voiceMainLabel = computed(() => {
  if (!isListening.value) return '開始錄音'
  if (!canStopListening.value) return `至少錄音 ${recordingRemainingSeconds.value} 秒`
  return '結束錄音'
})

const pageAliases = {
  home: ['首頁', '鋒兄首頁', '主頁', '開始', 'home'],
  dashboard: ['儀表', '儀表板', '總覽', '鋒兄儀表', 'dashboard'],
  subscription: ['訂閱', '續訂', '月費', '扣款', '鋒兄訂閱', 'subscription'],
  food: ['食品', '食物', '商品庫存', '庫存', '到期食品', '鋒兄食品', 'food'],
  note: ['筆記', '記事', '紀錄', '會議紀錄', '鋒兄筆記', 'note'],
  common: ['常用', '常用帳號', '帳號', '網站帳號', '鋒兄常用', 'common'],
  gallery: ['圖片', '圖庫', '照片', '相簿', '鋒兄圖片', 'gallery'],
  video: ['影片', '視頻', '影像', '鋒兄影片', 'video'],
  music: ['音樂', '歌曲', '歌', '鋒兄音樂', 'music'],
  document: ['文件', '檔案', '文檔', '資料夾', '鋒兄文件', 'document'],
  podcast: ['播客', 'podcast', '節目', '訪談', '鋒兄播客'],
  bank: ['銀行', '帳戶', '存款', '金融', '鋒兄銀行', 'bank'],
  routine: ['例行', '流程', '任務', '固定流程', '鋒兄例行', 'routine'],
  tools: ['工具', '比價', '手機比價', '鋒兄工具', 'tools'],
  settings: ['設定', '系統設定', '來源設定', '偏好設定', '鋒兄設定', 'settings'],
  about: ['關於', '說明', '幫助', '版本', '鋒兄關於', 'about']
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

const fieldAliases = [
  { key: 'name', aliases: ['名稱', '標題', '服務名稱', '影片名稱', '音樂名稱', '文件名稱', '播客名稱', '銀行名稱', '食品名稱', '品名'] },
  { key: 'category', aliases: ['分類', '類別'] },
  { key: 'note', aliases: ['備註', '說明', '內容', '筆記內容', '活動'] },
  { key: 'account', aliases: ['帳號', 'email', 'Email', '信箱'] },
  { key: 'price', aliases: ['價格', '金額', '月費', '費用'] },
  { key: 'date', aliases: ['日期', '到期日', '有效期限', '續訂日', '下次日期'] },
  { key: 'shop', aliases: ['商店', '店家', '來源', '分行', '網站'] },
  { key: 'url', aliases: ['網址', '連結', 'URL', '檔案', '影片URL', '音檔URL', '圖片URL'] },
  { key: 'cover', aliases: ['封面', '封面URL'] },
  { key: 'filetype', aliases: ['格式', '檔案類型', '副檔名'] },
  { key: 'lyrics', aliases: ['歌詞'] },
  { key: 'ref', aliases: ['參考', '參考連結'] },
  { key: 'hash', aliases: ['hash', 'Hash', '雜湊'] },
  { key: 'quantity', aliases: ['數量', '庫存', '份數', '瓶數', '包數', '個數'] },
  { key: 'status', aliases: ['狀態', '續訂狀態', '是否續訂'] },
  { key: 'phone', aliases: ['電話', '手機', '聯絡電話'] },
  { key: 'deposit', aliases: ['存款'] },
  { key: 'card', aliases: ['卡號'] },
  { key: 'address', aliases: ['地址'] }
]

const pageFieldSelectors = {
  subscription: {
    name: 'input[placeholder*="服務"], input[placeholder*="名稱"], .col-name input:first-child',
    category: 'input[placeholder*="分類"]',
    note: 'textarea[placeholder*="備註"], textarea',
    account: 'input[placeholder*="帳號"], input[list="account-options"]',
    price: 'input[type="number"], input[placeholder="0"]',
    date: 'input[type="date"]',
    shop: 'input[type="url"], input[placeholder*="網址"]',
    url: 'input[type="url"], input[placeholder*="網址"]'
  },
  food: {
    name: 'input[placeholder*="食品"], input[placeholder*="名稱"], .inline-name',
    category: 'input[placeholder*="分類"]',
    note: 'textarea[placeholder*="備註"], input[placeholder*="備註"]',
    price: 'input[placeholder*="價格"], input[type="number"]',
    date: 'input[type="date"]',
    shop: 'input[placeholder*="商店"], input[placeholder*="店"], input[placeholder*="shop"]',
    quantity: 'input[placeholder*="數量"], input[placeholder*="0"], input[type="number"]',
    url: 'input[placeholder*="照片"], input[placeholder*="URL"]'
  },
  note: {
    name: 'input[placeholder*="標題"], input[placeholder*="快速標題"]',
    category: 'input[placeholder*="分類"]',
    note: 'textarea[placeholder*="內容"], textarea',
    date: 'input[type="date"]',
    url: 'input[placeholder*="連結"], input[type="url"]'
  },
  common: {
    name: 'input[placeholder*="example"], .inline-name',
    note: 'input[placeholder*="備註"], .inline-note',
    shop: 'input[placeholder*="網站"], .inline-site',
    url: 'input[placeholder*="網站"], .inline-site'
  },
  gallery: {
    name: 'input[placeholder*="圖片"], input[placeholder*="名稱"], .inline-name',
    category: 'input[placeholder*="分類"]',
    note: 'input[placeholder*="備註"], textarea',
    url: 'input[placeholder*="URL"], input[placeholder*="https"]',
    cover: 'input[placeholder*="封面"]',
    filetype: 'input[placeholder*="jpg"], input[placeholder*="png"]'
  },
  video: {
    name: 'input[placeholder*="影片名稱"], input[placeholder*="名稱"]',
    category: 'input[placeholder*="分類"]',
    note: 'textarea[placeholder*="備註"], textarea',
    url: 'input[placeholder*="影片 URL"], input[placeholder*="URL"], input[id="file"]',
    cover: 'input[placeholder*="封面"], input[id="cover"]',
    filetype: 'input[placeholder*="mp4"], input[id="filetype"]',
    ref: 'input[placeholder*="參考"], input[id="ref"]',
    hash: 'input[placeholder*="Hash"]'
  },
  music: {
    name: 'input[placeholder*="歌曲"], input[placeholder*="音樂"], .inline-name',
    category: 'input[placeholder*="分類"]',
    note: 'input[placeholder*="備註"], textarea[placeholder*="備註"]',
    lyrics: 'textarea[placeholder*="歌詞"], textarea',
    url: 'input[placeholder*="音檔"], input[placeholder*="URL"]',
    cover: 'input[placeholder*="封面"]',
    filetype: 'input[placeholder*="mp3"], input[placeholder*="flac"]',
    ref: 'input[placeholder*="參考"]',
    hash: 'input[placeholder*="Hash"]'
  },
  document: {
    name: 'input[placeholder*="文件名稱"], input[placeholder*="名稱"], .inline-name',
    category: 'input[placeholder*="分類"]',
    note: 'textarea[placeholder*="備註"], textarea',
    url: 'input[placeholder*="檔案 URL"], input[placeholder*="URL"]',
    cover: 'input[placeholder*="封面"]',
    ref: 'input[placeholder*="參考"]',
    hash: 'input[placeholder*="Hash"]'
  },
  podcast: {
    name: 'input[placeholder*="播客名稱"], input[placeholder*="名稱"], .inline-title-input',
    category: 'input[placeholder*="分類"]',
    note: 'textarea[placeholder*="備註"], textarea',
    url: 'input[placeholder*="音檔"], input[placeholder*="URL"]',
    cover: 'input[placeholder*="封面"]',
    filetype: 'input[placeholder*="mp3"]',
    ref: 'input[placeholder*="參考"]'
  },
  bank: {
    name: 'input[placeholder*="銀行名稱"], .inline-name',
    account: 'input[placeholder*="帳號"]',
    card: 'input[placeholder*="卡號"]',
    deposit: 'input[placeholder*="存款"], input[type="number"]',
    shop: 'input[placeholder*="分行"], input[placeholder*="網點"]',
    address: 'input[placeholder*="地址"]',
    note: 'textarea[placeholder*="活動"], textarea'
  },
  routine: {
    name: 'input[placeholder*="名稱"]',
    note: 'textarea[placeholder*="備註"], textarea',
    date: 'input[type="date"]',
    url: 'input[placeholder*="https"], input[placeholder*="連結"]'
  },
  tools: {
    name: 'input[placeholder*="型號"], input[placeholder*="網址"], input[type="text"]',
    url: 'input[placeholder*="網址"], input[type="url"]'
  },
  settings: {
    name: 'input[type="text"], input[type="url"], input[type="password"]',
    url: 'input[type="url"], input[placeholder*="URL"]',
    note: 'textarea, input[type="text"]'
  },
  home: {
    name: '.search-input, input[type="text"]',
    note: 'textarea, input[type="text"]'
  },
  dashboard: {
    name: '.search-input, input[type="text"]',
    note: 'textarea, input[type="text"]'
  },
  about: {
    name: '.search-input, input[type="text"]',
    note: 'textarea, input[type="text"]'
  }
}

const currentPageConfig = computed(() => props.pages.find((page) => page.id === props.currentPage))
const currentPageName = computed(() => currentPageConfig.value?.name || '鋒兄系統')
const currentPageIndex = computed(() => props.pages.findIndex((page) => page.id === props.currentPage))
const nextPage = computed(() => props.pages[(currentPageIndex.value + 1) % props.pages.length])
const previousPage = computed(() => props.pages[(currentPageIndex.value - 1 + props.pages.length) % props.pages.length])
const navigationExamples = computed(() => props.pages.map((page) => `切換到${page.name}`))
const activeHints = computed(() => {
  const base = pageHints[props.currentPage] || ['新增', '搜尋', '輸入', '儲存']
  const next = nextPage.value ? [`下一個選單：${nextPage.value.name}`] : []
  return [...base, ...next, '全選', '編輯第一筆', '刪除第一筆']
})
const commandGuide = computed(() => [
  {
    title: '全部選單',
    examples: navigationExamples.value
  },
  {
    title: '欄位輸入',
    examples: ['名稱 Netflix', '分類 Suno', '備註 今天整理完成', '價格 390', '數量 12', '日期 下週五', '網址 https://example.com']
  },
  {
    title: '一句話新增',
    examples: ['新增食品 牛奶 數量三 明天到期', '新增訂閱 Netflix 月費 390 下週五', '新增銀行 富邦 存款 5000', '新增筆記 會議紀錄 備註 今天整理完成']
  },
  {
    title: '資料操作',
    examples: ['新增', '儲存', '取消', '編輯第一筆', '刪除第一筆', '全選', '匯入 ZIP', '匯出 CSV', '批量選擇']
  },
  {
    title: '顯示與篩選',
    examples: ['搜尋 鋒兄', '清空搜尋', '卡片式', '列表式', '今年', '五月', '全部月份', '深色模式']
  },
  {
    title: '媒體工具',
    examples: ['播放', '暫停', '下一首', '上一首', '快取', '下載', '切換 Bilibili', '切換 YouTube']
  }
])

const setStatus = (message, type = 'idle') => {
  statusMessage.value = message
  statusType.value = type
}

const normalizeText = (value) => String(value || '').trim()

const normalizeCommandText = (value) => normalizeText(value)
  .replace(/[，。；;、]/g, ' ')
  .replace(/\s+/g, ' ')

const splitCommands = (value) => normalizeCommandText(value)
  .split(/\s*(?:然後|接著|再來|再|並且|以及|and then|then)\s*/i)
  .map((item) => item.trim())
  .filter(Boolean)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const closePanel = () => {
  stopListening({ force: true })
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

const updateRecordingElapsed = () => {
  recordingElapsedMs.value = recordingStartedAt.value ? Date.now() - recordingStartedAt.value : 0
}

const startRecordingTimer = () => {
  if (recordingTimer) clearInterval(recordingTimer)
  updateRecordingElapsed()
  recordingTimer = setInterval(updateRecordingElapsed, 250)
}

const clearRecordingTimer = () => {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
}

const finalizeRecording = () => {
  clearRecordingTimer()
  shouldKeepListening = false
  manuallyStopping = false
  isListening.value = false
  updateRecordingElapsed()

  if (transcript.value.trim()) {
    prepareCommand()
    setStatus('錄音已結束，已產生待確認指令。', pendingAction.value ? 'success' : 'idle')
  } else {
    setStatus('錄音已結束，但沒有辨識到內容。可以再試一次。')
  }
}

const handleTranscriptInput = () => {
  if (!isListening.value) prepareCommand()
}

const createRecognition = () => {
  if (typeof window === 'undefined') return null
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return null

  const instance = new SpeechRecognition()
  instance.lang = 'zh-TW'
  instance.continuous = true
  instance.interimResults = true
  instance.maxAlternatives = 1

  instance.onstart = () => {
    isListening.value = true
    setStatus('錄音中，至少 10 秒後才能手動結束。')
  }

  instance.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0]?.transcript || '')
      .join('')
      .trim()
    transcript.value = text
  }

  instance.onerror = (event) => {
    if (manuallyStopping && event.error === 'aborted') return
    isListening.value = false
    clearRecordingTimer()
    shouldKeepListening = false
    setStatus(`語音辨識失敗：${event.error || '未知錯誤'}`, 'error')
  }

  instance.onend = () => {
    if (shouldKeepListening && !manuallyStopping) {
      try {
        recognition?.start()
      } catch {
        setTimeout(() => recognition?.start(), 150)
      }
      return
    }
    finalizeRecording()
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
  manuallyStopping = false
  shouldKeepListening = true
  recordingStartedAt.value = Date.now()
  recordingElapsedMs.value = 0
  startRecordingTimer()
  try {
    recognition.start()
  } catch {
    clearRecordingTimer()
    shouldKeepListening = false
    manuallyStopping = false
    isListening.value = false
    setStatus('語音辨識啟動失敗，請稍後再試一次。', 'error')
  }
}

const stopListening = ({ force = false } = {}) => {
  if (!isListening.value && !shouldKeepListening) return
  updateRecordingElapsed()
  if (!force && recordingElapsedMs.value < MIN_RECORDING_MS) {
    setStatus(`請至少錄音 10 秒，還差 ${recordingRemainingSeconds.value} 秒。`)
    return
  }

  manuallyStopping = true
  shouldKeepListening = false
  clearRecordingTimer()
  if (recognition && isListening.value) {
    recognition.stop()
    return
  }
  isListening.value = false
  finalizeRecording()
}

const findPageFromText = (text) => {
  const lower = text.toLowerCase()
  const exact = props.pages.find((page) => {
    const aliases = [page.name, page.title, ...(pageAliases[page.id] || [])]
    return aliases.some((alias) => alias && lower === String(alias).toLowerCase())
  })
  if (exact) return exact
  return props.pages.find((page) => {
    const aliases = [page.name, page.title, page.id, ...(pageAliases[page.id] || [])]
    return aliases.some((alias) => alias && lower.includes(String(alias).toLowerCase()))
  })
}

const findPageByOffset = (offset) => {
  if (!props.pages.length) return null
  const currentIndex = currentPageIndex.value >= 0 ? currentPageIndex.value : 0
  return props.pages[(currentIndex + offset + props.pages.length) % props.pages.length]
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForVisible = async (selectors, timeout = 1800) => {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const target = findFirstVisible(selectors)
    if (target) return target
    await wait(80)
  }
  return null
}

const clickVisibleByText = (selectors, labels) => {
  const wanted = labels.map((label) => String(label).toLowerCase())
  const items = Array.from(document.querySelectorAll(selectors))
  const target = items.find((item) => {
    const rect = item.getBoundingClientRect()
    const style = window.getComputedStyle(item)
    const text = `${item.textContent || ''} ${item.getAttribute('aria-label') || ''} ${item.getAttribute('title') || ''}`.toLowerCase()
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !item.disabled && wanted.some((label) => text.includes(label))
  })
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

const findFieldKey = (text) => {
  const lower = text.toLowerCase()
  return fieldAliases.find((field) => field.aliases.some((alias) => lower.includes(alias.toLowerCase())))?.key || ''
}

const getFieldSelector = (fieldKey) => {
  return pageFieldSelectors[props.currentPage]?.[fieldKey] || pageFieldSelectors[props.currentPage]?.note || ''
}

const fillNamedField = (fieldKey, value) => {
  const selector = getFieldSelector(fieldKey)
  const target = selector ? findFirstVisible(selector) : null
  if (!target) return false
  setNativeValue(target, normalizeFieldValue(fieldKey, value))
  return true
}

const fillNamedFieldOnPage = async (pageId, fieldKey, value) => {
  const selector = pageFieldSelectors[pageId]?.[fieldKey] || pageFieldSelectors[pageId]?.note || ''
  const target = selector ? await waitForVisible(selector) : null
  if (!target) return false
  setNativeValue(target, normalizeFieldValue(fieldKey, value))
  return true
}

const normalizeFieldValue = (fieldKey, value) => {
  const raw = String(value || '').trim()
  if (fieldKey === 'date') return normalizeSpokenDate(raw)
  if (['price', 'quantity', 'deposit'].includes(fieldKey)) {
    return spokenNumberToDigits(raw).replace(/[^\d.-]/g, '')
  }
  return raw
}

const chineseDigitMap = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9
}

const parseSmallChineseNumber = (value) => {
  if (!value) return null
  if (/^\d+$/.test(value)) return Number(value)
  if (value === '十') return 10
  const tenMatch = value.match(/^([零〇一二兩三四五六七八九])?十([零〇一二兩三四五六七八九])?$/)
  if (tenMatch) {
    const tens = tenMatch[1] ? chineseDigitMap[tenMatch[1]] : 1
    const ones = tenMatch[2] ? chineseDigitMap[tenMatch[2]] : 0
    return tens * 10 + ones
  }
  if (value.length === 1 && value in chineseDigitMap) return chineseDigitMap[value]
  return null
}

const spokenNumberToDigits = (value) => String(value || '').replace(/[零〇一二兩三四五六七八九]?十[零〇一二兩三四五六七八九]?|[零〇一二兩三四五六七八九]/g, (match) => {
  const parsed = parseSmallChineseNumber(match)
  return parsed === null ? match : String(parsed)
})

const parseWeekdayOffset = (raw, today) => {
  const weekMatch = raw.match(/(下下週|下週|這週|本週|週|星期|禮拜)([一二三四五六日天])/)
  if (!weekMatch) return null
  const weekdayMap = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }
  const targetDay = weekdayMap[weekMatch[2]]
  const currentDay = today.getDay()
  let offset = targetDay - currentDay
  if (/下下週/.test(weekMatch[1])) offset += 14
  else if (/下週/.test(weekMatch[1])) offset += 7
  else if (offset < 0) offset += 7
  return offset
}

const normalizeSpokenDate = (raw) => {
  const today = new Date()
  const build = (date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  if (!raw || /今天|今日/.test(raw)) return build(today)
  if (/昨天|昨日/.test(raw)) {
    const date = new Date(today)
    date.setDate(date.getDate() - 1)
    return build(date)
  }
  if (/明天|明日/.test(raw)) {
    const date = new Date(today)
    date.setDate(date.getDate() + 1)
    return build(date)
  }
  if (/大後天/.test(raw)) {
    const date = new Date(today)
    date.setDate(date.getDate() + 3)
    return build(date)
  }
  if (/後天/.test(raw)) {
    const date = new Date(today)
    date.setDate(date.getDate() + 2)
    return build(date)
  }
  if (/下個月|下月/.test(raw)) {
    const date = new Date(today)
    date.setMonth(date.getMonth() + 1)
    return build(date)
  }
  if (/上個月|上月/.test(raw)) {
    const date = new Date(today)
    date.setMonth(date.getMonth() - 1)
    return build(date)
  }

  const weekdayOffset = parseWeekdayOffset(raw, today)
  if (weekdayOffset !== null) {
    const date = new Date(today)
    date.setDate(date.getDate() + weekdayOffset)
    return build(date)
  }

  const normalizedNumberRaw = spokenNumberToDigits(raw)
  const daysMatch = normalizedNumberRaw.match(/(\d+)\s*(天|日)後/)
  if (daysMatch) {
    const date = new Date(today)
    date.setDate(date.getDate() + Number(daysMatch[1]))
    return build(date)
  }

  const dateMatch = normalizedNumberRaw.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})|(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(日|號)?|(\d{1,2})[/-](\d{1,2})|(\d{1,2})\s*月\s*(\d{1,2})\s*(日|號)?/)
  if (dateMatch?.[1]) {
    return `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
  }
  if (dateMatch?.[4]) {
    return `${dateMatch[4]}-${dateMatch[5].padStart(2, '0')}-${dateMatch[6].padStart(2, '0')}`
  }
  if (dateMatch?.[8]) {
    return `${today.getFullYear()}-${dateMatch[8].padStart(2, '0')}-${dateMatch[9].padStart(2, '0')}`
  }
  if (dateMatch?.[10]) {
    return `${today.getFullYear()}-${dateMatch[10].padStart(2, '0')}-${dateMatch[11].padStart(2, '0')}`
  }
  return raw
}

const fillSearch = (value) => {
  const target = findFirstVisible('.search-input, input[type="search"], input[placeholder*="搜尋"]')
  if (!target) return false
  setNativeValue(target, value)
  return true
}

const selectByText = (selectors, labels) => {
  const select = findFirstVisible(selectors)
  if (!select || select.tagName !== 'SELECT') return false
  const wanted = labels.map((item) => String(item).toLowerCase())
  const option = Array.from(select.options).find((opt) => {
    const text = `${opt.textContent || ''} ${opt.value || ''}`.toLowerCase()
    return wanted.some((label) => text.includes(label))
  })
  if (!option) return false
  select.value = option.value
  select.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

const extractFieldPayload = (text, fieldKey) => {
  const allAliases = fieldAliases.find((field) => field.key === fieldKey)?.aliases || []
  let value = text
  value = value.replace(/^(請)?(把|將)?\s*/, '')
  value = value.replace(/(輸入|填入|寫入|記錄|打字|貼上|設定|改成|設為|填)\s*/g, '')
  allAliases.forEach((alias) => {
    value = value.replace(new RegExp(alias, 'gi'), '')
  })
  value = value.replace(/^(為|成|到|是|:|：)\s*/, '').trim()
  return value || text
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
    .replace(/^(請)?(搜尋|查詢|尋找|找|過濾)\s*/i, '')
    .trim()
}

const getPageScopedText = (text, pageId) => {
  let scoped = normalizeCommandText(text)
  const aliases = [pageId, ...(pageAliases[pageId] || [])]
  aliases.forEach((alias) => {
    scoped = scoped.replace(new RegExp(String(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  })
  return scoped
    .replace(/^(請)?(新增|建立|加一筆|記錄|新增一筆|我要)\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const extractTokenValue = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

const stripKnownFieldPhrases = (text) => {
  return text
    .replace(/(月費|價格|金額|費用)\s*[零〇一二兩三四五六七八九十\d.,-]+/g, ' ')
    .replace(/(數量|庫存|份數|瓶數|包數|個數)\s*[零〇一二兩三四五六七八九十\d.,-]+/g, ' ')
    .replace(/(存款|餘額)\s*[零〇一二兩三四五六七八九十\d.,-]+/g, ' ')
    .replace(/(帳號|信箱|email)\s*[^\s]+/gi, ' ')
    .replace(/(商店|店家|來源|分行|網站)\s*[^\s]+/g, ' ')
    .replace(/(日期|到期|有效期限|續訂|下次付款|下次日期)?\s*(昨天|昨日|今天|今日|明天|明日|大後天|後天|下週[一二三四五六日天]?|這週[一二三四五六日天]?|本週[一二三四五六日天]?|星期[一二三四五六日天]|禮拜[一二三四五六日天]|下個月|下月|\d+\s*(天|日)後|\d{1,2}\s*月\s*\d{1,2}\s*(日|號)?|\d{4}[/-]\d{1,2}[/-]\d{1,2})/g, ' ')
    .replace(/(備註|說明|內容)\s*.+$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const extractSmartDatePhrase = (text) => {
  return text.match(/昨天|昨日|今天|今日|明天|明日|大後天|後天|下週[一二三四五六日天]?|這週[一二三四五六日天]?|本週[一二三四五六日天]?|星期[一二三四五六日天]|禮拜[一二三四五六日天]|下個月|下月|\d+\s*(天|日)後|\d{1,2}\s*月\s*\d{1,2}\s*(日|號)?|\d{4}[/-]\d{1,2}[/-]\d{1,2}/)?.[0] || ''
}

const parseSmartCreatePayload = (text, pageId) => {
  const scoped = getPageScopedText(text, pageId)
  const fields = {}
  const price = extractTokenValue(scoped, [/(?:月費|價格|金額|費用)\s*([零〇一二兩三四五六七八九十\d.,-]+)/])
  const quantity = extractTokenValue(scoped, [/(?:數量|庫存|份數|瓶數|包數|個數)\s*([零〇一二兩三四五六七八九十\d.,-]+)/])
  const deposit = extractTokenValue(scoped, [/(?:存款|餘額)\s*([零〇一二兩三四五六七八九十\d.,-]+)/])
  const account = extractTokenValue(scoped, [/(?:帳號|信箱|email)\s*([^\s]+)/i])
  const shop = extractTokenValue(scoped, [/(?:商店|店家|來源|分行|網站)\s*([^\s]+)/])
  const note = extractTokenValue(scoped, [/(?:備註|說明|內容)\s*(.+)$/])
  const date = extractSmartDatePhrase(scoped)

  if (price) fields.price = price
  if (quantity) fields.quantity = quantity
  if (deposit) fields.deposit = deposit
  if (account) fields.account = account
  if (shop) fields.shop = shop
  if (note) fields.note = note
  if (date) fields.date = date

  const name = stripKnownFieldPhrases(scoped)
  if (name) fields.name = name

  return fields
}

const buildSmartCreateCommand = (text) => {
  if (!/(新增|建立|加一筆|記錄|新增一筆)/.test(text)) return null
  const page = findPageFromText(text) || currentPageConfig.value
  if (!page) return null
  const fields = parseSmartCreatePayload(text, page.id)
  if (!Object.keys(fields).length) return null

  return {
    label: `新增${page.name}：${fields.name || '新資料'}`,
    detail: Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('，'),
    run: async () => {
      if (props.currentPage !== page.id) {
        emit('navigate', page.id)
        await wait(260)
      }
      const added = clickFirstVisible('.btn-add-icon, button[title*="新增"], .btn-primary')
      if (!added) return false
      await wait(220)
      for (const [fieldKey, value] of Object.entries(fields)) {
        const ok = await fillNamedFieldOnPage(page.id, fieldKey, value)
        if (!ok && fieldKey === 'name') return false
      }
      return true
    }
  }
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

  const commands = splitCommands(text)
  if (commands.length > 1) {
    pendingAction.value = buildMultiCommand(commands)
    setStatus('已準備連續語音指令，請確認。')
    return
  }

  const smartCreateCommand = buildSmartCreateCommand(text)
  if (smartCreateCommand) {
    pendingAction.value = smartCreateCommand
    setStatus('已準備一句話新增，請確認。')
    return
  }

  if (/(下一個選單|下一頁|下一個頁面|下一項)/.test(text)) {
    const page = findPageByOffset(1)
    pendingAction.value = {
      label: `切換到 ${page?.name || '下一個選單'}`,
      detail: '確認後會切到目前選單的下一項。',
      run: () => page && emit('navigate', page.id)
    }
    setStatus('已準備切換下一個選單，請確認。')
    return
  }

  if (/(上一個選單|上一頁|上一個頁面|前一項)/.test(text)) {
    const page = findPageByOffset(-1)
    pendingAction.value = {
      label: `切換到 ${page?.name || '上一個選單'}`,
      detail: '確認後會切到目前選單的上一項。',
      run: () => page && emit('navigate', page.id)
    }
    setStatus('已準備切換上一個選單，請確認。')
    return
  }

  const page = findPageFromText(text)
  if (page && (/(切換|前往|到|開啟|打開|進入|去|我要|顯示|查看|跳到)/.test(text) || pageAliases[page.id]?.includes(text))) {
    pendingAction.value = {
      label: `切換到 ${page.name}`,
      detail: '確認後會切換目前工作頁。',
      run: () => emit('navigate', page.id)
    }
    setStatus('已準備頁面切換，請確認。')
    return
  }

  if (/^(請)?(搜尋|查詢|尋找|找|過濾)/.test(text)) {
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
    const fieldKey = findFieldKey(text)
    if (fieldKey) {
      const payload = extractFieldPayload(text, fieldKey)
      pendingAction.value = {
        label: `填入${fieldAliases.find((field) => field.key === fieldKey)?.aliases[0] || '欄位'}「${payload}」`,
        detail: `確認後會寫入目前頁面的${fieldAliases.find((field) => field.key === fieldKey)?.aliases[0] || '指定'}欄位。`,
        run: () => fillNamedField(fieldKey, payload)
      }
      setStatus('已準備指定欄位輸入，請確認。')
      return
    }

    const payload = getInputPayload(text)
    pendingAction.value = {
      label: `填入「${payload || text}」`,
      detail: '確認後會寫入目前聚焦欄位，若沒有聚焦欄位則寫入第一個可輸入欄位。',
      run: () => fillFocusedField(payload || text)
    }
    setStatus('已準備文字輸入，請確認。')
    return
  }

  const fieldKey = findFieldKey(text)
  if (fieldKey && /(名稱|標題|分類|備註|內容|帳號|價格|金額|月費|日期|商店|店家|網址|連結|封面|格式|歌詞|參考|hash|數量|存款|卡號|地址)/i.test(text)) {
    const payload = extractFieldPayload(text, fieldKey)
    pendingAction.value = {
      label: `填入${fieldAliases.find((field) => field.key === fieldKey)?.aliases[0] || '欄位'}「${payload}」`,
      detail: '確認後會依目前頁面找到對應欄位並填入。',
      run: () => fillNamedField(fieldKey, payload)
    }
    setStatus('已辨識到頁面欄位，請確認。')
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

const buildMultiCommand = (commands) => {
  return {
    label: `連續執行 ${commands.length} 個指令`,
    detail: commands.join(' → '),
    run: async () => {
      for (const command of commands) {
        const action = resolveCommand(command)
        if (!action) return false
        const result = action.run()
        if (result === false) return false
        await new Promise((resolve) => setTimeout(resolve, 180))
      }
      return true
    }
  }
}

const resolveCommand = (text) => {
  const smartCreateCommand = buildSmartCreateCommand(text)
  if (smartCreateCommand) return smartCreateCommand

  const page = findPageFromText(text)
  if (page && (/(切換|前往|到|開啟|打開|進入|去|我要|顯示|查看|跳到)/.test(text) || pageAliases[page.id]?.includes(text))) {
    return { run: () => emit('navigate', page.id) }
  }
  if (/^(請)?(搜尋|查詢|尋找|找|過濾)/.test(text)) {
    const keyword = getSearchPayload(text)
    return { run: () => fillSearch(keyword || text) }
  }
  if (/^(請)?(輸入|填入|寫入|記錄|打字|貼上)/.test(text)) {
    const fieldKey = findFieldKey(text)
    if (fieldKey) {
      const payload = extractFieldPayload(text, fieldKey)
      return { run: () => fillNamedField(fieldKey, payload) }
    }
    const payload = getInputPayload(text)
    return { run: () => fillFocusedField(payload || text) }
  }
  const fieldKey = findFieldKey(text)
  if (fieldKey) {
    const payload = extractFieldPayload(text, fieldKey)
    return { run: () => fillNamedField(fieldKey, payload) }
  }
  return buildQuickCommand(text)
}

const buildQuickCommand = (text) => {
  if (/(確認|確定|執行|送出)$/.test(text) && pendingAction.value) {
    return { label: '確認目前待執行指令', detail: '確認後會執行目前語音面板裡的待確認動作。', run: () => executePendingAction() }
  }
  if (/(關閉語音|收起語音|隱藏語音面板|關掉語音)/.test(text)) {
    return { label: '關閉語音面板', detail: '確認後會收起語音輸入面板。', run: () => closePanel() }
  }
  if (/(清空語音|清除語音|重講|重新輸入)/.test(text)) {
    return { label: '清空語音內容', detail: '確認後會清空目前辨識文字。', run: () => clearTranscript() }
  }
  if (/(打開選單|開啟選單|收合選單|關閉選單|側邊欄|導覽列)/.test(text)) {
    return { label: '切換側邊選單', detail: '確認後會切換側邊導覽列。', run: () => clickFirstVisible('.sidebar-toggle, .mobile-menu-toggle, button[aria-label*="選單"], button[aria-label*="menu"]') }
  }
  if (/(說明|幫助|可用指令|語音指令)/.test(text)) {
    return { label: '展開語音指令說明', detail: '確認後會展開語音面板裡的可說指令。', run: () => clickFirstVisible('.voice-guide summary') }
  }
  if (/(卡片式|卡片模式|卡片)/.test(text)) {
    return { label: '切換卡片式', detail: '確認後會按下卡片式顯示。', run: () => clickButtonByText('卡片式') || clickButtonByText('卡片') }
  }
  if (/(列表式|清單式|列表|清單)/.test(text)) {
    return { label: '切換列表式', detail: '確認後會按下列表式顯示。', run: () => clickButtonByText('列表式') || clickButtonByText('列表') || clickButtonByText('清單') }
  }
  if (/(深色|黑暗|dark)/i.test(text)) {
    return { label: '切換深色模式', detail: '確認後會切換目前深淺色模式。', run: () => clickFirstVisible('.dark-mode-toggle') || clickButtonByText('Dark') }
  }
  if (/(淺色|亮色|light)/i.test(text)) {
    return { label: '切換淺色模式', detail: '確認後會切換目前深淺色模式。', run: () => clickFirstVisible('.dark-mode-toggle') || clickButtonByText('Light') || clickButtonByText('Dark') }
  }
  if (/(昨天|昨日|今天|今日|明天|明日|大後天|後天|下週|這週|本週|星期|禮拜|下個月|下月|\d+\s*(天|日)後).*(日期|有效期限|到期|續訂)/.test(text)) {
    const fieldKey = 'date'
    const payload = text.match(/昨天|昨日|今天|今日|明天|明日|大後天|後天|下週[一二三四五六日天]?|這週[一二三四五六日天]?|本週[一二三四五六日天]?|星期[一二三四五六日天]|禮拜[一二三四五六日天]|下個月|下月|\d+\s*(天|日)後/)?.[0] || text
    return { label: `設定日期「${payload}」`, detail: '確認後會把日期欄位填成對應日期。', run: () => fillNamedField(fieldKey, payload) }
  }
  if (/(今年|明年|去年|\d{4}\s*年|全部年份|無日期)/.test(text)) {
    const labels = []
    if (/全部年份/.test(text)) labels.push('全部年份', '')
    else if (/無日期/.test(text)) labels.push('無日期', 'none')
    else labels.push(text.match(/\d{4}/)?.[0] || (text.includes('明年') ? String(new Date().getFullYear() + 1) : text.includes('去年') ? String(new Date().getFullYear() - 1) : String(new Date().getFullYear())))
    return { label: '設定年份篩選', detail: '確認後會調整目前頁面的年份篩選。', run: () => selectByText('.date-filter-select, select', labels) }
  }
  if (/(全部月份|\d{1,2}\s*月|一月|二月|三月|四月|五月|六月|七月|八月|九月|十月|十一月|十二月)/.test(text)) {
    const monthNames = { 一月: '1', 二月: '2', 三月: '3', 四月: '4', 五月: '5', 六月: '6', 七月: '7', 八月: '8', 九月: '9', 十月: '10', 十一月: '11', 十二月: '12' }
    const monthName = Object.keys(monthNames).find((name) => text.includes(name))
    const label = /全部月份/.test(text) ? '全部月份' : monthName ? monthNames[monthName] : text.match(/\d{1,2}/)?.[0]
    return { label: '設定月份篩選', detail: '確認後會調整目前頁面的月份篩選。', run: () => selectByText('.date-filter-select, select', [label]) }
  }
  if (/(續訂|自動續訂|不續訂|七天|7天|即將到期)/.test(text)) {
    const label = /不續訂/.test(text) ? '不續訂' : /七天|7天|即將到期/.test(text) ? '7' : '續訂'
    return { label: '設定訂閱篩選', detail: '確認後會按下符合的訂閱篩選按鈕。', run: () => clickButtonByText(label) }
  }
  if (/(播放|開始播放)/.test(text)) {
    return { label: '播放媒體', detail: '確認後會按下目前可見的播放按鈕或播放控制。', run: () => clickFirstVisible('.play-overlay, .play-btn, .persistent-audio-btn, button[title*="播放"]') || clickButtonByText('Play') }
  }
  if (/(預覽|查看檔案|看檔案|打開檔案)/.test(text)) {
    return { label: '預覽或開啟檔案', detail: '確認後會按下目前可見的預覽或開啟檔案按鈕。', run: () => clickVisibleByText('button, a', ['預覽', '開啟檔案', '開新分頁']) }
  }
  if (/(暫停|停止播放|pause)/i.test(text)) {
    return { label: '暫停媒體', detail: '確認後會按下目前可見的暫停控制。', run: () => clickButtonByText('Pause') || clickFirstVisible('.persistent-audio-btn') }
  }
  if (/(快取|預載|下載影片|下載音樂)/.test(text)) {
    return { label: '媒體快取或下載', detail: '確認後會按下目前可見的快取、預載或下載按鈕。', run: () => clickFirstVisible('.cache-btn, .btn-cache-all, .download-btn, button[title*="快取"], button[title*="下載"]') }
  }
  if (/(下一首|下一部|下一個|下一張)/.test(text)) {
    return { label: '下一個媒體', detail: '確認後會按下下一首、下一部或下一張。', run: () => clickVisibleByText('button', ['下一', 'next']) || clickFirstVisible('button[title*="下一"], button[aria-label*="下一"]') }
  }
  if (/(上一首|上一部|上一個|前一個|上一張)/.test(text)) {
    return { label: '上一個媒體', detail: '確認後會按下上一首、上一部或上一張。', run: () => clickVisibleByText('button', ['上一', '前一', 'previous']) || clickFirstVisible('button[title*="上一"], button[aria-label*="上一"]') }
  }
  if (/csv/i.test(text) && /(匯入|導入)/.test(text)) {
    return { label: '匯入 CSV', detail: '確認後會開啟目前頁面的 CSV 匯入。', run: () => clickFirstVisible('.btn-import') }
  }
  if (/csv/i.test(text) && /(匯出|導出)/.test(text)) {
    return { label: '匯出 CSV', detail: '確認後會按下目前頁面的 CSV 匯出。', run: () => clickFirstVisible('.btn-export') }
  }
  if (/zip/i.test(text) && /(匯入|導入)/.test(text)) {
    return { label: '匯入 ZIP', detail: '確認後會開啟目前頁面的 ZIP 匯入。', run: () => clickFirstVisible('.btn-import') }
  }
  if (/zip/i.test(text) && /(匯出|導出)/.test(text)) {
    return { label: '匯出 ZIP', detail: '確認後會按下目前頁面的 ZIP 匯出。', run: () => clickFirstVisible('.btn-export') }
  }
  if (/(新增|新增一筆|加一筆|建立)/.test(text)) {
    return { label: '新增一筆資料', detail: '確認後會按下目前頁面的新增按鈕。', run: () => clickFirstVisible('.btn-add-icon, .btn-primary, button[title*="新增"]') }
  }
  if (/(編輯第一筆|修改第一筆|第一筆編輯|編輯目前|修改目前)/.test(text)) {
    return { label: '編輯第一筆資料', detail: '確認後會按下第一個可見的編輯按鈕。', run: () => clickFirstVisible('.btn-edit-icon, button[title*="編輯"], button[aria-label*="編輯"]') }
  }
  if (/(查看第一筆|檢視第一筆|展開第一筆|看第一筆)/.test(text)) {
    return { label: '查看第一筆資料', detail: '確認後會按下第一個可見的查看、展開或預覽按鈕。', run: () => clickVisibleByText('button, a', ['查看', '檢視', '展開', '預覽']) }
  }
  if (/(刪除第一筆|刪第一筆|第一筆刪除|刪除目前|刪掉目前)/.test(text)) {
    return { label: '刪除第一筆資料', detail: '確認後會按下第一個可見的刪除按鈕；頁面若有安全確認仍會再詢問。', run: () => clickFirstVisible('.btn-delete-icon, button[title*="刪除"], button[aria-label*="刪除"]') }
  }
  if (/(上傳|選擇檔案|加入圖片|加入影片|加入音檔|加入文件)/.test(text)) {
    return { label: '開啟檔案選擇', detail: '確認後會按下目前可見的上傳或檔案選擇按鈕。', run: () => clickFirstVisible('.btn-upload-photo, .upload-btn, button[title*="上傳"], label[class*="upload"], input[type="file"]') }
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
  if (/(取消全選|清除選取|取消選取)/.test(text)) {
    return { label: '取消選取', detail: '確認後會取消批量選取或離開批量模式。', run: () => clickFirstVisible('.btn-cancel-batch, .select-all-label input') }
  }
  if (/(批量|多選|全選)/.test(text)) {
    const all = /(全選|全部選取)/.test(text)
    return { label: all ? '全選目前列表' : '切換批量選擇', detail: '確認後會按下批量選擇或全選控制。', run: () => clickFirstVisible(all ? '.select-all-label input, input[type="checkbox"]' : '.btn-batch-mode, .select-all-label input') }
  }
  if (/(清空搜尋|清除搜尋|取消搜尋)/.test(text)) {
    return { label: '清空搜尋', detail: '確認後會清空目前頁面的搜尋欄。', run: () => fillSearch('') }
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
  if (/(開啟|打開|按下|點擊|點選).+/.test(text)) {
    const label = text.replace(/^(請)?(開啟|打開|按下|點擊|點選)\s*/, '').trim()
    return { label: `按下「${label}」`, detail: '確認後會尋找目前頁面符合文字的按鈕或連結。', run: () => clickVisibleByText('button, a, label, summary', [label]) }
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
  const result = await action.run()
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

.voice-guide {
  margin-top: 0.85rem;
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
}

.voice-guide summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 800;
}

.guide-grid {
  display: grid;
  gap: 0.7rem;
  margin-top: 0.75rem;
}

.guide-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.35rem;
}

.guide-group strong {
  color: var(--text-primary);
  font-size: 0.78rem;
}

.guide-group button {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: color-mix(in oklab, var(--bg-secondary) 86%, transparent);
  color: var(--text-secondary);
  padding: 0.45rem 0.55rem;
  text-align: left;
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}

.guide-group button:hover {
  border-color: var(--accent);
  color: var(--text-primary);
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
