<template>
  <div class="home-page">
    <div class="home-identity">
      <img src="/fengbro-home-person.webp" alt="鋒兄" width="48" height="64" />
      <div><h2>鋒兄手帳</h2><time v-if="workDate" :datetime="workDate">{{ workDateLabel }}</time></div>
    </div>

    <div class="home-workspace">
      <section class="expiry-panel" aria-labelledby="expiry-heading">
        <div class="section-head">
          <h2 id="expiry-heading">到期提醒</h2>
          <button type="button" class="text-action" @click="emit('navigate', 'dashboard')">查看總覽</button>
        </div>
        <div v-for="row in priorities" :key="row.page" class="expiry-row">
          <div>
            <h3>{{ row.title }} <small>{{ row.period }}</small></h3>
            <p v-if="row.page === 'food' && expiredSummary" class="expired-summary">{{ expiredSummary }}</p>
            <p aria-live="polite" :class="{ 'needs-attention': row.hasItems }">{{ row.summary }}</p>
          </div>
          <button v-if="row.retry" type="button" class="row-action" :aria-label="`重新讀取${row.title}`" @click="row.retry({ force: true })">重試</button>
          <button v-else type="button" class="row-action" @click="emit('navigate', row.page)">
            管理{{ row.title }}
          </button>
        </div>
        <button
          v-if="subscriptionReadState === 'unconfigured' || foodReadState === 'unconfigured'"
          type="button" class="text-action source-link" @click="emit('navigate', 'settings')"
        >設定資料來源</button>
      </section>

      <nav class="shortcut-panel" aria-labelledby="shortcut-heading">
        <h2 id="shortcut-heading">常用入口</h2>
        <div class="shortcuts">
          <button v-for="item in shortcuts" :key="item.page" type="button" @click="emit('navigate', item.page)">
            {{ item.label }}<NavIcon name="chevron-right" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </div>

    <section
      v-if="sleepWarning"
      class="sleep-warning"
      :class="`sleep-warning--${sleepWarning.level}`"
      role="alert"
      aria-live="polite"
    >
      <strong>{{ sleepWarning.title }}</strong>
      <span>{{ sleepWarning.message }}</span>
    </section>

    <section v-if="tubeAlert" class="tube-home-alert" role="alert" aria-live="polite">
      <div class="tube-home-alert__copy">
        <span class="tube-home-alert__label">鋒兄tube</span>
        <strong>3 天內有 {{ tubeAlert.count }} 部新影片</strong>
        <p>{{ tubeAlert.summary }}</p>
      </div>
      <div class="tube-home-alert__actions">
        <button class="hero-btn hero-btn-primary" type="button" @click="emit('navigate', 'tools:tube')">查看鋒兄tube</button>
        <button class="hero-btn hero-btn-secondary" type="button" @click="dismissTubeAlert">稍後提醒</button>
      </div>
    </section>

    <section v-if="tubeStaleAlert" class="tube-home-alert" role="alert" aria-live="polite">
      <div class="tube-home-alert__copy">
        <span class="tube-home-alert__label">鋒兄tube</span>
        <strong>{{ tubeStaleAlert.count }} 個頻道超過 3 個月沒更新</strong>
        <p>{{ tubeStaleAlert.summary }}</p>
      </div>
      <div class="tube-home-alert__actions">
        <button class="hero-btn hero-btn-primary" type="button" @click="emit('navigate', 'tools:tube')">查看鋒兄tube</button>
        <button class="hero-btn hero-btn-secondary" type="button" @click="dismissTubeStaleAlert">今天略過</button>
      </div>
    </section>

    <section v-if="financeAlert" class="tube-home-alert finance-home-alert" role="alert" aria-live="polite">
      <div class="tube-home-alert__copy">
        <span class="tube-home-alert__label">鋒兄金融</span>
        <strong>金融指標創新高</strong>
        <p>{{ financeAlert.summary }}</p>
      </div>
      <div class="tube-home-alert__actions">
        <button class="hero-btn hero-btn-primary" type="button" @click="emit('navigate', 'tools:finance')">查看鋒兄金融</button>
        <button class="hero-btn hero-btn-secondary" type="button" @click="dismissFinanceAlert">今天略過</button>
      </div>
    </section>

    <footer class="home-footer">
      <span>鋒兄 © 2026 至 2027 FengBroAI Supabase</span>
      <span>上次更新 <strong>{{ lastUpdateDateLabel }}</strong></span>
      <span>產品程式碼 <strong>{{ linesOfCodeLabel }}</strong> 行</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  FENG_TUBE_CHANNELS,
  FENG_TUBE_CHANNELS_STORAGE_KEY
} from '../../utils/fengTubeChannels'

import NavIcon from '../ui/NavIcon.vue'
import { useDashboard } from '../../composables/useDashboard'
import { todayKey } from '../../utils/notificationHelpers'
import { FINANCE_INSTRUMENTS_STORAGE_KEY } from '../../utils/fengbroFinanceCustom'

const emit = defineEmits(['navigate'])
const runtimeConfig = useRuntimeConfig()

const { loadFoods, loadSubscriptions, subscriptionAlerts, subscriptionReadState, foodAlerts, foodReadState, formatDaysRemaining } = useDashboard()

const shortcuts = [
  { page: 'trial-purchase', label: '試用／首購' },
  { page: 'shopping', label: '購物清單' },
  { page: 'note', label: '筆記' },
  { page: 'common', label: '常用帳號' },
  { page: 'reinstall', label: '重灌軟體' },
  { page: 'gallery', label: '圖片庫' },
  { page: 'video', label: '影片' },
  { page: 'music', label: '音樂' },
]

function priorityRow(page, title, period, items, state, reload) {
  let summary
  const readable = ['ready', 'cached', 'offline'].includes(state)
  if (readable) {
    const first = items[0]
    summary = first
      ? `${items.length} 項，${first.name || '未命名'}${formatDaysRemaining(first.daysRemaining)}到期`
      : '這段期間沒有到期項目'
    if (state === 'cached') summary += '（快取，更新中）'
    if (state === 'offline') summary += '（上次資料，更新失敗）'
  } else if (state === 'unconfigured') {
    summary = '尚未連接資料來源'
  } else {
    summary = state === 'error' ? '讀取失敗' : '讀取中…'
  }
  return { page, title, period, summary, retry: ['offline', 'error'].includes(state) ? reload : null, hasItems: readable && items.length > 0 }
}

const priorities = computed(() => [
  priorityRow('subscription', '訂閱', '3 天內', subscriptionAlerts.value.critical, subscriptionReadState.value, loadSubscriptions),
  priorityRow('food', '食品', '7 天內', foodAlerts.value.critical, foodReadState.value, loadFoods),
])

const expiredSummary = computed(() => {
  const items = foodAlerts.value.expired
  if (!['ready', 'cached', 'offline'].includes(foodReadState.value) || !items.length) return ''
  return `${items.length} 項已過期，${items[0].name || '未命名食品'}過期 ${Math.abs(items[0].daysRemaining)} 天`
})
const workDate = ref('')
const workDateLabel = computed(() => workDate.value && new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
}).format(new Date(workDate.value + 'T12:00:00')))

const lastUpdateDateLabel = computed(() => {
  const raw = runtimeConfig.public?.lastUpdateDate
  if (typeof raw !== 'string' || !raw) return '—'
  // Prefer ISO date (YYYY-MM-DD) from build; show as-is for zh-TW readability.
  return raw.slice(0, 10)
})

const linesOfCodeLabel = computed(() => {
  const n = Number(runtimeConfig.public?.linesOfCode)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return n.toLocaleString('zh-TW')
})

const currentHour = ref(null)
const tubeAlertVideos = ref([])
const tubeAlertDismissed = ref(false)
const tubeStaleChannels = ref([])
const tubeStaleDismissed = ref(false)
const financeHighItems = ref([])
const financeAlertDismissed = ref(false)
let sleepWarningTimer = null

const TUBE_ALERT_DISMISS_KEY = 'feng-tube-alert-dismissed-date'
const TUBE_STALE_ALERT_DISMISS_KEY = 'feng-tube-stale-alert-dismissed-date'
const FINANCE_ALERT_DISMISS_KEY = 'feng-finance-alert-dismissed-date'

const updateCurrentHour = () => {
  const now = new Date()
  currentHour.value = now.getHours()
  workDate.value = todayKey(now)
}

const sleepWarning = computed(() => {
  if (currentHour.value === null) return null

  if (currentHour.value >= 0 && currentHour.value <= 2) {
    return {
      level: 'yellow',
      title: '黃色警告',
      message: '請入睡'
    }
  }

  if (currentHour.value >= 3 && currentHour.value <= 6) {
    return {
      level: 'red',
      title: '紅色警告',
      message: '請入睡'
    }
  }

  return null
})

const tubeAlert = computed(() => {
  if (tubeAlertDismissed.value || tubeAlertVideos.value.length === 0) return null
  const channelNames = [...new Set(tubeAlertVideos.value.map(video => video.channelLabel).filter(Boolean))]
  const summary = channelNames.length > 0
    ? `新片來自 ${channelNames.slice(0, 4).join('、')}${channelNames.length > 4 ? ' 等頻道' : ''}。`
    : '指定頻道有新的 YouTube 影片。'

  return {
    count: tubeAlertVideos.value.length,
    summary
  }
})

const tubeStaleAlert = computed(() => {
  if (tubeStaleDismissed.value || tubeStaleChannels.value.length === 0) return null
  const names = tubeStaleChannels.value
    .slice(0, 4)
    .map(channel => `${channel.label}（${channel.daysSinceLatest} 天）`)
    .join('、')

  return {
    count: tubeStaleChannels.value.length,
    summary: `${names}${tubeStaleChannels.value.length > 4 ? ' 等頻道' : ''} 已停更，可到鋒兄tube 移除或保留。`
  }
})

const financeAlert = computed(() => {
  if (financeAlertDismissed.value || financeHighItems.value.length === 0) return null
  const labels = financeHighItems.value.map(item => `${item.name} ${item.price}`).join('、')
  return {
    count: financeHighItems.value.length,
    summary: `${labels} 已達創新高，請到鋒兄金融確認來源與數值。`
  }
})

/** 首頁提醒沿用工具頁存下的頻道清單（產品預設清單已清空）。 */
const readSavedList = (key) => {
  if (!import.meta.client) return []
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

const loadTubeAlert = async () => {
  try {
    const savedChannels = readSavedList(FENG_TUBE_CHANNELS_STORAGE_KEY)
    if (!savedChannels.length && !FENG_TUBE_CHANNELS.length) return
    const response = await $fetch('/api/feng-tools/youtube', {
      query: savedChannels.length > 0 ? { channels: JSON.stringify(savedChannels) } : undefined
    })
    tubeAlertVideos.value = Array.isArray(response?.newVideos) ? response.newVideos : []
    tubeStaleChannels.value = Array.isArray(response?.staleChannels) ? response.staleChannels : []
  } catch (error) {
    console.warn('[HomePage] 鋒兄tube 通知載入失敗', error)
  }
}

const loadFinanceAlert = async () => {
  try {
    const instruments = readSavedList(FINANCE_INSTRUMENTS_STORAGE_KEY)
    if (!instruments.length) return
    const response = await $fetch('/api/feng-tools/finance', {
      method: 'POST',
      body: { instruments, skipHistory: true }
    })
    financeHighItems.value = (response?.quotes || []).filter(item => item.recordTag === 'new-high')
  } catch (error) {
    console.warn('[HomePage] 鋒兄金融通知載入失敗', error)
  }
}

const dismissTubeAlert = () => {
  tubeAlertDismissed.value = true
  if (import.meta.client) {
    localStorage.setItem(TUBE_ALERT_DISMISS_KEY, todayKey())
  }
}

const dismissTubeStaleAlert = () => {
  tubeStaleDismissed.value = true
  if (import.meta.client) {
    localStorage.setItem(TUBE_STALE_ALERT_DISMISS_KEY, todayKey())
  }
}

const dismissFinanceAlert = () => {
  financeAlertDismissed.value = true
  if (import.meta.client) {
    localStorage.setItem(FINANCE_ALERT_DISMISS_KEY, todayKey())
  }
}

onMounted(() => {
  updateCurrentHour()
  sleepWarningTimer = window.setInterval(updateCurrentHour, 60 * 1000)

  if (import.meta.client) {
    tubeAlertDismissed.value = localStorage.getItem(TUBE_ALERT_DISMISS_KEY) === todayKey()
    tubeStaleDismissed.value = localStorage.getItem(TUBE_STALE_ALERT_DISMISS_KEY) === todayKey()
    financeAlertDismissed.value = localStorage.getItem(FINANCE_ALERT_DISMISS_KEY) === todayKey()
  }
  if (!tubeAlertDismissed.value || !tubeStaleDismissed.value) loadTubeAlert()
  if (!financeAlertDismissed.value) loadFinanceAlert()
})

onUnmounted(() => {
  if (sleepWarningTimer) {
    window.clearInterval(sleepWarningTimer)
  }
})

</script>

<style scoped>
.home-page {
  width: min(100%, 76rem);
  margin-inline: auto;
  display: grid;
  gap: var(--sp-4);
}

.home-identity {
  display: flex; align-items: center; gap: var(--sp-4);
  padding-block: var(--sp-3) var(--sp-4); border-bottom: 2px solid var(--text-primary);
}
.home-identity img { object-fit: cover; border-radius: var(--radius-sm); }
.home-identity h2 { font-size: var(--text-2xl); line-height: 1.25; }
.home-identity time { color: var(--text-secondary); font-variant-numeric: tabular-nums; }
.home-workspace {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--sp-4);
  align-items: start;
}
.expiry-panel, .shortcut-panel { min-width: 0; padding-block: var(--sp-4); }
.expiry-panel { padding-inline-end: var(--sp-5); }
.shortcut-panel { border-inline-start: var(--hairline); padding-inline-start: var(--sp-5); }
.section-head, .expiry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}
.home-page h2 { font-size: var(--text-xl); }
.home-page h3 { font-size: var(--text-md); }
.expiry-row {
  padding-block: var(--sp-3);
  border-top: var(--hairline);
}
.expiry-row:last-child { padding-bottom: 0; }
.expiry-row small, .expiry-row p, .home-footer {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}
.expiry-row small { margin-inline-start: var(--sp-1); font-weight: 400; }
.expiry-row p { margin-top: var(--sp-1); overflow-wrap: anywhere; }
.expiry-row .needs-attention { color: var(--warning-text); }
.home-page button {
  min-height: var(--control-h-lg);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
.row-action, .shortcuts button, .hero-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  padding: var(--sp-1) var(--sp-3);
}
.row-action { flex-shrink: 0; font-size: var(--text-sm); }
.home-page button:hover { background: var(--bg-muted); }
.text-action {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--primary-text);
  padding-inline: var(--sp-2);
}
.section-head { margin-bottom: var(--sp-2); }
.source-link { text-decoration: underline; text-underline-offset: 0.2em; }
.shortcuts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-2);
  margin-top: var(--sp-3);
}
.shortcuts button {
  border: 0; border-radius: 0; border-bottom: var(--hairline); background: transparent;
  display: flex; align-items: center; justify-content: space-between; text-align: start;
  padding-inline: var(--sp-1); gap: var(--sp-2);
}
.shortcuts button svg { color: var(--text-secondary); width: 1rem; }
.expiry-row .expired-summary { color: var(--danger-text); font-weight: 600; }
.home-page button:active { background: var(--bg-inset); }
.sleep-warning, .tube-home-alert {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: var(--hairline);
  border-radius: var(--radius-md);
  background: var(--warning-light);
  color: var(--warning-text);
}
.sleep-warning--red, .finance-home-alert { background: var(--danger-light); color: var(--danger-text); }
.tube-home-alert { justify-content: space-between; }
.tube-home-alert__copy { flex: 1 1 18rem; min-width: 0; overflow-wrap: anywhere; }
.tube-home-alert__copy strong { display: block; font-size: var(--text-lg); }
.tube-home-alert__label { font-size: var(--text-sm); }
.tube-home-alert__actions, .home-footer { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.hero-btn-primary { background: var(--primary-solid); color: var(--on-primary); border-color: transparent; }
.home-page .hero-btn-primary:hover { background: var(--primary-solid-hover); }
.home-footer { border-top: var(--hairline); padding-block: var(--sp-3); gap: var(--sp-2) var(--sp-5); }
.home-footer strong { font-weight: 500; font-variant-numeric: tabular-nums; }

@media (max-width: 1024px) {
  .home-workspace { grid-template-columns: minmax(0, 1fr); }
  .expiry-panel, .shortcut-panel { padding-inline: 0; }
  .shortcut-panel { border-inline-start: 0; border-top: var(--hairline); }
}
@media (max-width: 480px) {
  .home-identity img { width: 36px; height: 48px; }
}
</style>
