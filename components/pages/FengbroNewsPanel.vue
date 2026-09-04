<template>
  <div class="news-root">
    <section class="tool-panel">
      <div class="tool-panel__header">
        <div>
          <p class="panel-kicker">FengBro News</p>
          <h3>鋒兄新聞</h3>
          <p class="tool-subtitle">
            鎖定網站焦點後，只在指定網站搜尋「標題包含關鍵字」的文章（最多三年內）。
          </p>
        </div>
        <div class="tool-panel__actions">
          <span v-if="result?.fetchedAt" class="news-chip">
            更新：{{ formatDateTime(result.fetchedAt) }}
          </span>
          <span class="news-chip">
            來源 {{ sites.length }} · 鎖定 {{ lockedCount }}
            <template v-if="sites.length !== defaultSiteCount">
              · 預設 {{ defaultSiteCount }}
            </template>
          </span>
          <button type="button" class="tool-primary-btn tool-primary-btn--compact" @click="openManagerNew">
            新增新聞來源
          </button>
          <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="managerOpen = !managerOpen">
            {{ managerOpen ? '收合來源' : '展開來源' }}
          </button>
        </div>
      </div>

      <div v-if="managerOpen" class="news-manager">
        <div class="news-manager__header">
          <div>
            <h4>新聞來源網站 · 共 {{ sites.length }} 個</h4>
            <p class="tool-subtitle">
              可新增任意新聞／公部門網站。鎖定後才會納入標題關鍵字搜尋；設定存在本機瀏覽器。
              目前鎖定 {{ lockedCount }}，內建預設 {{ defaultSiteCount }} 個。
            </p>
          </div>
          <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="handleResetSites">
            還原預設（{{ defaultSiteCount }}）
          </button>
        </div>

        <div class="news-form">
          <p class="news-form__title">{{ editingId ? '編輯新聞來源' : '新增新聞來源網站' }}</p>
          <div class="news-form__row">
            <input
              v-model.trim="draftName"
              type="text"
              class="tool-input"
              placeholder="網站名稱（可留空，自動用網域）"
              @keydown.enter.prevent="handleSaveSite"
            />
            <input
              v-model.trim="draftHomeUrl"
              type="text"
              class="tool-input"
              placeholder="網站網址，例如 https://www.youtube.com/@tnews6460/videos"
              @keydown.enter.prevent="handleSaveSite"
            />
            <button type="button" class="tool-primary-btn tool-primary-btn--compact" @click="handleSaveSite">
              {{ editingId ? '儲存來源' : '新增來源' }}
            </button>
          </div>

          <div class="news-form__meta">
            <button type="button" class="news-link-btn" @click="advancedOpen = !advancedOpen">
              {{ advancedOpen ? '收合進階設定' : '進階設定（適配器／搜尋模板）' }}
            </button>
            <button v-if="editingId" type="button" class="news-link-btn" @click="clearDraft">取消編輯</button>
          </div>

          <div v-if="advancedOpen" class="news-form__advanced">
            <select v-model="draftAdapter" class="tool-input">
              <option v-for="opt in adapterOptions" :key="opt.id" :value="opt.id">
                {{ opt.label }} — {{ opt.hint }}
              </option>
            </select>
            <input
              v-model.trim="draftTemplate"
              type="text"
              class="tool-input"
              placeholder="搜尋 URL 模板（可選），關鍵字用 {q}"
            />
            <p class="tool-subtitle">
              通用來源會掃首頁／新聞列表；若站內有關鍵字搜尋頁，可填模板例如
              <code>https://example.gov.tw/search?q={q}</code>
            </p>
          </div>

          <p v-if="formMessage" class="tool-notice">{{ formMessage }}</p>
        </div>

        <div class="news-site-grid">
          <article
            v-for="site in sites"
            :key="site.id"
            class="news-site-card"
            :class="{ locked: site.locked, unlocked: !site.locked }"
          >
            <div class="news-site-card__copy">
              <p class="news-site-card__name">
                {{ site.locked ? '🔒' : '🔓' }} {{ site.name }}
              </p>
              <a :href="site.homeUrl" target="_blank" rel="noreferrer" class="store-card__link">
                {{ site.domain }} · {{ adapterLabel(site.adapter) }}
              </a>
            </div>
            <div class="news-site-card__actions">
              <button
                type="button"
                class="tool-secondary-btn tool-secondary-btn--compact"
                :title="site.locked ? '解除鎖定' : '鎖定焦點'"
                @click="handleToggleLock(site.id)"
              >
                {{ site.locked ? '鎖定中' : '未鎖定' }}
              </button>
              <button
                type="button"
                class="tool-secondary-btn tool-secondary-btn--compact"
                @click="handleEditSite(site)"
              >
                編輯
              </button>
              <button type="button" class="news-danger-btn" title="刪除來源" @click="handleDeleteSite(site.id)">
                刪除
              </button>
            </div>
          </article>
        </div>
      </div>

      <div class="news-search">
        <label class="tool-field tool-field--wide">
          <span>文章標題包含</span>
          <div class="news-search__row">
            <input
              v-model.trim="query"
              type="text"
              class="tool-input"
              placeholder="例如 中新地下道"
              @keydown.enter.prevent="runSearch()"
            />
            <button type="button" class="tool-primary-btn" :disabled="loading" @click="runSearch()">
              {{ loading ? `搜尋中${searchElapsedSec > 0 ? ` ${searchElapsedSec}s` : '…'}` : '搜尋新聞' }}
            </button>
            <button v-if="loading" type="button" class="tool-secondary-btn" @click="cancelSearch">取消</button>
            <button v-else type="button" class="tool-secondary-btn" @click="runSearch()">重新整理</button>
          </div>
        </label>
        <p class="tool-subtitle">
          僅顯示近三年內可判斷日期的新聞；無日期者保留。目前鎖定 {{ lockedCount }} 站（並行抓取，單站逾時會略過）。
          範例：標題含「中新地下道」。
        </p>

        <div class="news-recent">
          <div class="news-recent__header">
            <span>最近搜尋文章標題</span>
            <button
              v-if="recentQueries.length"
              type="button"
              class="news-link-btn"
              @click="clearRecentQueries"
            >
              清除全部
            </button>
          </div>
          <p v-if="!recentQueries.length" class="tool-subtitle">搜尋過的文章標題會出現在這裡，點一下可再次搜尋。</p>
          <div v-else class="news-recent__chips">
            <span v-for="term in recentQueries" :key="term" class="news-recent-chip">
              <button type="button" :disabled="loading" @click="runSearch(term)">{{ term }}</button>
              <button type="button" class="news-recent-chip__remove" :aria-label="`移除 ${term}`" @click="removeRecentQuery(term)">×</button>
            </span>
          </div>
        </div>
      </div>

      <p v-if="error" class="tool-error">{{ error }}</p>

      <div v-if="result" class="news-results">
        <h4>
          「{{ result.query }}」共 {{ result.resultCount }} 則
          <span class="news-results__meta">
            （焦點 {{ result.siteCount }} 站
            <template v-if="result.partial && result.searchedCount != null">
              · 已搜 {{ result.searchedCount }}
            </template>
            <template v-if="result.maxAgeYears"> · 近 {{ result.maxAgeYears }} 年</template>
            <template v-if="result.partial"> · 部分結果</template>）
          </span>
        </h4>

        <div v-if="result.warnings?.length" class="tool-notice">
          <p v-for="warning in result.warnings" :key="warning">{{ warning }}</p>
        </div>

        <p v-if="!result.results?.length" class="tool-empty">鎖定網站內沒有標題符合的文章。</p>
        <div v-else class="news-article-list">
          <a
            v-for="article in result.results"
            :key="article.url"
            :href="article.url"
            target="_blank"
            rel="noreferrer"
            class="news-article-card"
          >
            <div>
              <p class="news-article-card__title">{{ article.title }}</p>
              <p class="news-article-card__meta">
                {{ article.siteName }}
                <span>·</span>
                {{ article.domain }}
                <template v-if="article.publishedAt">
                  <span>·</span>
                  {{ formatDate(article.publishedAt) }}
                </template>
              </p>
              <p class="news-article-card__url">{{ article.url }}</p>
            </div>
            <span class="news-article-card__icon" aria-hidden="true">↗</span>
          </a>
        </div>

        <div v-if="result.bySite?.length" class="news-by-site">
          <p class="panel-kicker">各站結果</p>
          <div class="news-by-site__grid">
            <div v-for="site in result.bySite" :key="site.siteId" class="news-by-site__card">
              <strong>{{ site.siteName }}</strong>
              <p>
                {{ site.articles?.length || 0 }} 則
                <template v-if="site.error"> · {{ site.error }}</template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="tool-panel news-bento">
      <div class="tool-panel__header">
        <div>
          <p class="panel-kicker">TRA Bento</p>
          <h3>台鐵便當門市據點</h3>
          <p class="tool-subtitle">來源：臺鐵官網門市據點（預設顯示桃園／中壢）</p>
        </div>
        <div class="tool-panel__actions">
          <a :href="traBentoUrl" target="_blank" rel="noreferrer" class="store-card__link">官方門市據點</a>
          <button type="button" class="tool-secondary-btn tool-secondary-btn--compact" @click="toggleBentoFocus">
            {{ bentoFocusOnly ? '顯示臺北分處全部' : '只看桃園／中壢' }}
          </button>
          <button
            type="button"
            class="tool-primary-btn tool-primary-btn--compact"
            :disabled="bentoLoading"
            @click="loadBentoStores(bentoFocusOnly)"
          >
            {{ bentoLoading ? '讀取中' : '更新' }}
          </button>
        </div>
      </div>

      <p class="news-bento__url">{{ traBentoUrl }}</p>
      <p v-if="bentoError" class="tool-error">{{ bentoError }}</p>
      <p v-if="bentoResult?.warning" class="tool-notice">{{ bentoResult.warning }}</p>

      <p v-if="bentoLoading && !bentoResult" class="tool-empty">讀取台鐵便當門市…</p>
      <div v-else-if="bentoResult?.stores?.length" class="news-bento-grid">
        <article
          v-for="store in bentoResult.stores"
          :key="`${store.name}-${store.detail}`"
          class="news-bento-card"
          :class="{ focus: store.focus }"
        >
          <strong>{{ store.name }}</strong>
          <p>{{ store.detail }}</p>
          <span v-if="store.stationHint" class="news-chip">{{ store.stationHint }}</span>
        </article>
      </div>
      <p v-else class="tool-empty">尚無門市資料</p>

      <p v-if="bentoResult?.fetchedAt" class="news-bento__footer">
        {{ bentoResult.live ? '即時' : '備援' }} · {{ formatDateTime(bentoResult.fetchedAt) }}
      </p>
    </section>

    <section class="tool-panel news-pop">
      <div class="tool-panel__header">
        <div>
          <p class="panel-kicker">Population</p>
          <h3>桃園／中壢人口統計</h3>
          <p class="tool-subtitle">
            最近三個月人口數與新增人口數，以及近十年（年底）走勢。來源：桃園市政府資料開放平台民政局。
          </p>
        </div>
        <div class="tool-panel__actions">
          <a
            v-if="popResult?.sourceUrl"
            :href="popResult.sourceUrl"
            target="_blank"
            rel="noreferrer"
            class="store-card__link"
          >
            開放資料
          </a>
          <button
            type="button"
            class="tool-primary-btn tool-primary-btn--compact"
            :disabled="popLoading"
            @click="loadPopulation(true)"
          >
            {{ popLoading ? '讀取中' : '更新' }}
          </button>
        </div>
      </div>

      <p v-if="popError" class="tool-error">{{ popError }}</p>
      <p v-if="popResult?.warning" class="tool-notice">{{ popResult.warning }}</p>
      <p v-if="popLoading && !popResult" class="tool-empty">讀取人口統計…</p>

      <div v-else-if="popResult" class="news-pop__grid">
        <article
          v-for="region in popRegions"
          :key="region.id"
          class="news-pop-card"
        >
          <div class="news-pop-card__header">
            <div>
              <p class="panel-kicker">{{ region.id === 'zhongli' ? 'Zhongli' : 'Taoyuan City' }}</p>
              <h4>{{ region.label }}人口統計</h4>
            </div>
            <div class="news-pop-card__latest">
              <span class="news-pop-card__latest-label">{{ region.latestLabel || '最新' }}</span>
              <strong>{{ formatPopulation(region.latestPopulation) }}</strong>
              <span
                class="news-pop-change"
                :class="changeClass(region.latestChange)"
              >
                {{ formatChange(region.latestChange) }}
              </span>
            </div>
          </div>

          <div class="news-pop-table-wrap">
            <p class="news-pop-section-title">最近三個月</p>
            <table class="news-pop-table">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>人口數</th>
                  <th>新增人口數</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in region.recentMonths" :key="row.label">
                  <td>{{ row.label }}</td>
                  <td>{{ formatPopulation(row.population) }}</td>
                  <td>
                    <span class="news-pop-change" :class="changeClass(row.change)">
                      {{ formatChange(row.change) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!region.recentMonths?.length">
                  <td colspan="3" class="news-pop-table__empty">尚無近月資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="news-pop-chart-block">
            <p class="news-pop-section-title">近十年走勢（年底）</p>
            <div v-if="region.yearly?.length" class="news-pop-chart" role="img" :aria-label="`${region.label}近十年人口走勢`">
              <svg
                class="news-pop-chart__svg"
                viewBox="0 0 360 160"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient :id="`pop-fill-${region.id}`" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.28" />
                    <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.02" />
                  </linearGradient>
                </defs>
                <polyline
                  v-if="chartArea(region.yearly)"
                  :points="chartArea(region.yearly)"
                  :fill="`url(#pop-fill-${region.id})`"
                  stroke="none"
                />
                <polyline
                  :points="chartLine(region.yearly)"
                  fill="none"
                  stroke="var(--primary)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  v-for="(pt, idx) in chartDots(region.yearly)"
                  :key="`${region.id}-dot-${idx}`"
                  :cx="pt.x"
                  :cy="pt.y"
                  r="3.2"
                  fill="var(--bg-primary)"
                  stroke="var(--primary)"
                  stroke-width="1.8"
                />
              </svg>
              <div class="news-pop-chart__axis">
                <span v-for="y in region.yearly" :key="`${region.id}-y-${y.label}`">
                  {{ y.year }}
                </span>
              </div>
              <div class="news-pop-chart__range">
                <span>最低 {{ formatPopulation(minPop(region.yearly)) }}</span>
                <span>最高 {{ formatPopulation(maxPop(region.yearly)) }}</span>
              </div>
            </div>
            <p v-else class="tool-empty">尚無年度走勢資料</p>
          </div>
        </article>
      </div>

      <p v-if="popResult?.fetchedAt" class="news-bento__footer">
        {{ popResult.live ? '即時' : '備援' }} · {{ formatDateTime(popResult.fetchedAt) }}
        <template v-if="popResult.sourceLabel"> · {{ popResult.sourceLabel }}</template>
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  DEFAULT_FENGBRO_NEWS_SITES,
  DEFAULT_FENGBRO_NEWS_SITES_COUNT,
  FENGBRO_NEWS_QUERY_KEY,
  FENGBRO_NEWS_SITES_KEY,
  fengbroNewsSiteKey,
  guessFengbroNewsAdapter,
  normalizeFengbroNewsSite,
  normalizeFengbroNewsSites,
  normalizeHomeUrl
} from '../../utils/fengbroNewsSites'

const CLIENT_SEARCH_TIMEOUT_MS = 55_000
const RECENT_QUERIES_KEY = 'fengbro-news-titles'
const MAX_RECENT = 12
const TRA_BENTO_URL = 'https://www.railway.gov.tw/tra-tip-web/tip/tip004/tip421/storeLocation'

const adapterOptions = [
  { id: 'generic-keyword-url', label: '通用來源（自動）', hint: '掃首頁／列表或 {q} 搜尋模板' },
  { id: 'youtube-channel', label: 'YouTube 頻道', hint: '頻道影片標題關鍵字' },
  { id: 'tycg-traffic', label: '桃園交通局', hint: 'businessd/post 關鍵字列表' },
  { id: 'rb-nreo', label: '鐵道局北工', hint: 'NREO 最新消息（reader）' },
  { id: 'tycg-zhongli', label: '中壢區公所', hint: 'News.aspx 分頁掃標題' }
]

const defaultSiteCount = DEFAULT_FENGBRO_NEWS_SITES_COUNT
const traBentoUrl = TRA_BENTO_URL

const loadSites = () => {
  if (!import.meta.client) return DEFAULT_FENGBRO_NEWS_SITES.map((s) => ({ ...s }))
  try {
    const raw = localStorage.getItem(FENGBRO_NEWS_SITES_KEY)
    if (!raw) return DEFAULT_FENGBRO_NEWS_SITES.map((s) => ({ ...s }))
    return normalizeFengbroNewsSites(JSON.parse(raw))
  } catch {
    return DEFAULT_FENGBRO_NEWS_SITES.map((s) => ({ ...s }))
  }
}

const loadQuery = () => {
  if (!import.meta.client) return '中新地下道'
  try {
    return localStorage.getItem(FENGBRO_NEWS_QUERY_KEY) || '中新地下道'
  } catch {
    return '中新地下道'
  }
}

const loadRecentQueries = () => {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(RECENT_QUERIES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.trim()).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

const sites = ref(loadSites())
const query = ref(loadQuery())
const loading = ref(false)
const error = ref('')
const result = ref(null)
const managerOpen = ref(false)
const advancedOpen = ref(false)
const searchElapsedSec = ref(0)
const recentQueries = ref(loadRecentQueries())

const draftName = ref('')
const draftHomeUrl = ref('')
const draftAdapter = ref('generic-keyword-url')
const draftTemplate = ref('')
const editingId = ref(null)
const formMessage = ref('')

const bentoLoading = ref(false)
const bentoError = ref('')
const bentoResult = ref(null)
const bentoFocusOnly = ref(true)

const popLoading = ref(false)
const popError = ref('')
const popResult = ref(null)

let searchAbort = null
let searchTimer = null

const lockedCount = computed(() => sites.value.filter((s) => s.locked).length)

const popRegions = computed(() => {
  if (!popResult.value) return []
  return [popResult.value.city, popResult.value.zhongli].filter(Boolean)
})

const adapterLabel = (adapter) => adapterOptions.find((a) => a.id === adapter)?.label || adapter

const formatDateTime = (value) => {
  if (!value) return '--'
  return new Date(value).toLocaleString('zh-TW')
}

const formatDate = (value) => {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('zh-TW')
}

const formatPopulation = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toLocaleString('zh-TW')
}

const formatChange = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  if (n === 0) return '0'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toLocaleString('zh-TW')}`
}

const changeClass = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return ''
  const n = Number(value)
  if (n > 0) return 'is-up'
  if (n < 0) return 'is-down'
  return 'is-flat'
}

const chartPadding = { top: 14, right: 12, bottom: 12, left: 12 }

const chartBounds = (series) => {
  const values = (series || []).map((p) => Number(p.population)).filter((n) => Number.isFinite(n))
  if (!values.length) return null
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min = Math.max(0, min - 1)
    max = max + 1
  }
  // pad range a little for readability
  const pad = (max - min) * 0.08
  return { min: min - pad, max: max + pad, count: series.length }
}

const chartPoints = (series) => {
  const bounds = chartBounds(series)
  if (!bounds || !series?.length) return []
  const w = 360
  const h = 160
  const { top, right, bottom, left } = chartPadding
  const innerW = w - left - right
  const innerH = h - top - bottom
  const n = series.length
  return series.map((p, i) => {
    const x = left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    const t = (Number(p.population) - bounds.min) / (bounds.max - bounds.min)
    const y = top + innerH * (1 - t)
    return { x, y, population: p.population, label: p.label }
  })
}

const chartLine = (series) => chartPoints(series).map((p) => `${p.x},${p.y}`).join(' ')

const chartArea = (series) => {
  const pts = chartPoints(series)
  if (!pts.length) return ''
  const h = 160
  const bottom = h - chartPadding.bottom
  const first = pts[0]
  const last = pts[pts.length - 1]
  return [
    `${first.x},${bottom}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${last.x},${bottom}`
  ].join(' ')
}

const chartDots = (series) => chartPoints(series)

const minPop = (series) => {
  const values = (series || []).map((p) => Number(p.population)).filter((n) => Number.isFinite(n))
  return values.length ? Math.min(...values) : null
}

const maxPop = (series) => {
  const values = (series || []).map((p) => Number(p.population)).filter((n) => Number.isFinite(n))
  return values.length ? Math.max(...values) : null
}

const persistSites = () => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(FENGBRO_NEWS_SITES_KEY, JSON.stringify(sites.value))
  } catch {
    // ignore
  }
}

const persistQuery = () => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(FENGBRO_NEWS_QUERY_KEY, query.value)
  } catch {
    // ignore
  }
}

const persistRecent = () => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(recentQueries.value))
  } catch {
    // ignore
  }
}

watch(sites, persistSites, { deep: true })
watch(query, persistQuery)

const clearDraft = () => {
  draftName.value = ''
  draftHomeUrl.value = ''
  draftAdapter.value = 'generic-keyword-url'
  draftTemplate.value = ''
  editingId.value = null
  advancedOpen.value = false
  formMessage.value = ''
}

const openManagerNew = () => {
  managerOpen.value = true
  clearDraft()
}

const handleSaveSite = () => {
  const homeUrl = normalizeHomeUrl(draftHomeUrl.value)
  if (!homeUrl && !draftName.value.trim()) {
    formMessage.value = '請至少填寫網站網址（或名稱＋網址）'
    return
  }
  if (!homeUrl) {
    formMessage.value = '請填寫網站網址，例如 https://example.gov.tw/'
    return
  }

  const adapter =
    draftAdapter.value === 'generic-keyword-url'
      ? guessFengbroNewsAdapter(homeUrl)
      : draftAdapter.value

  const site = normalizeFengbroNewsSite({
    id: editingId.value || undefined,
    name: draftName.value,
    homeUrl,
    adapter,
    searchUrlTemplate: draftTemplate.value || undefined,
    locked: true
  })

  if (!site) {
    formMessage.value = '無法解析此網站，請檢查網址格式'
    return
  }

  const wasEditing = Boolean(editingId.value)
  const siteKey = fengbroNewsSiteKey(site)

  if (editingId.value) {
    sites.value = sites.value.map((s) =>
      s.id === editingId.value ? { ...site, id: editingId.value, locked: s.locked } : s
    )
  } else {
    const existing = sites.value.find((s) => fengbroNewsSiteKey(s) === siteKey)
    if (existing) {
      site.locked = existing.locked
      site.id = existing.id
    }
    sites.value = [
      ...sites.value.filter((s) => fengbroNewsSiteKey(s) !== siteKey && s.id !== site.id),
      { ...site, locked: true }
    ]
  }

  const message = wasEditing ? `已更新來源「${site.name}」` : `已新增並鎖定來源「${site.name}」`
  clearDraft()
  formMessage.value = message
  error.value = ''
}

const handleEditSite = (site) => {
  editingId.value = site.id
  draftName.value = site.name
  draftHomeUrl.value = site.homeUrl
  draftAdapter.value = site.adapter
  draftTemplate.value = site.searchUrlTemplate || ''
  advancedOpen.value = site.adapter !== 'generic-keyword-url' || Boolean(site.searchUrlTemplate)
  formMessage.value = ''
  managerOpen.value = true
}

const handleDeleteSite = (id) => {
  sites.value = sites.value.filter((s) => s.id !== id)
  if (editingId.value === id) clearDraft()
}

const handleToggleLock = (id) => {
  sites.value = sites.value.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s))
}

const handleResetSites = () => {
  sites.value = DEFAULT_FENGBRO_NEWS_SITES.map((s) => ({ ...s }))
  clearDraft()
}

const stopSearchTimer = () => {
  if (searchTimer) {
    clearInterval(searchTimer)
    searchTimer = null
  }
}

const cancelSearch = () => {
  searchAbort?.abort()
  searchAbort = null
  stopSearchTimer()
  loading.value = false
  searchElapsedSec.value = 0
}

const addRecentQuery = (term) => {
  const cleaned = term.trim()
  if (!cleaned) return
  recentQueries.value = [cleaned, ...recentQueries.value.filter((x) => x !== cleaned)].slice(0, MAX_RECENT)
  persistRecent()
}

const removeRecentQuery = (term) => {
  recentQueries.value = recentQueries.value.filter((x) => x !== term)
  persistRecent()
}

const clearRecentQueries = () => {
  recentQueries.value = []
  persistRecent()
}

const runSearch = async (overrideQuery) => {
  const q = (overrideQuery ?? query.value).trim()
  if (!q) {
    error.value = '請輸入文章標題關鍵字'
    return
  }
  if (lockedCount.value === 0) {
    error.value = '請先鎖定至少一個網站焦點'
    return
  }

  if (overrideQuery !== undefined) {
    query.value = q
  }

  searchAbort?.abort()
  stopSearchTimer()

  const controller = new AbortController()
  searchAbort = controller
  const clientTimeout = setTimeout(() => controller.abort(), CLIENT_SEARCH_TIMEOUT_MS)

  loading.value = true
  error.value = ''
  searchElapsedSec.value = 0
  const started = Date.now()
  searchTimer = setInterval(() => {
    searchElapsedSec.value = Math.floor((Date.now() - started) / 1000)
  }, 500)

  try {
    const locked = sites.value.filter((s) => s.locked)
    const data = await $fetch('/api/feng-tools/news', {
      method: 'POST',
      body: {
        q,
        onlyLocked: true,
        sites: locked
      },
      signal: controller.signal
    })
    result.value = data
    addRecentQuery(q)
  } catch (err) {
    if (err?.name === 'AbortError' || err?.cause?.name === 'AbortError') {
      error.value = `搜尋已中止或逾時（>${Math.round(CLIENT_SEARCH_TIMEOUT_MS / 1000)} 秒）。可減少鎖定來源後再試。`
    } else {
      result.value = null
      error.value = err?.data?.statusMessage || err?.message || '鋒兄新聞搜尋失敗'
    }
  } finally {
    clearTimeout(clientTimeout)
    if (searchAbort === controller) searchAbort = null
    stopSearchTimer()
    loading.value = false
    searchElapsedSec.value = 0
  }
}

const loadBentoStores = async (focusOnly) => {
  bentoLoading.value = true
  bentoError.value = ''
  try {
    bentoResult.value = await $fetch('/api/feng-tools/news-bento', {
      query: { focus: focusOnly ? '1' : '0' }
    })
  } catch (err) {
    bentoResult.value = null
    bentoError.value = err?.data?.statusMessage || err?.message || '台鐵便當門市讀取失敗'
  } finally {
    bentoLoading.value = false
  }
}

const toggleBentoFocus = () => {
  bentoFocusOnly.value = !bentoFocusOnly.value
  loadBentoStores(bentoFocusOnly.value)
}

const loadPopulation = async (refresh = false) => {
  popLoading.value = true
  popError.value = ''
  try {
    popResult.value = await $fetch('/api/feng-tools/population', {
      query: refresh ? { refresh: '1' } : undefined
    })
  } catch (err) {
    popResult.value = null
    popError.value = err?.data?.statusMessage || err?.message || '人口統計讀取失敗'
  } finally {
    popLoading.value = false
  }
}

onMounted(() => {
  loadBentoStores(true)
  loadPopulation(false)
})

onUnmounted(() => {
  cancelSearch()
})
</script>

<style scoped>
.news-root {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.tool-panel {
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
  box-shadow: var(--shadow-soft);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tool-panel__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.tool-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.panel-kicker {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.tool-panel h3,
.news-manager h4,
.news-results h4 {
  margin: 0.3rem 0 0;
  font-family: var(--font-display);
}

.tool-subtitle {
  margin: 0.45rem 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
}

.tool-input {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0.75rem 0.9rem;
  font: inherit;
}

.tool-primary-btn,
.tool-secondary-btn {
  border-radius: 14px;
  padding: 0.72rem 1rem;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.tool-primary-btn {
  border: 0;
  background: linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 70%, var(--primary-solid)));
  color: var(--on-primary);
  font-weight: 700;
}

.tool-primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tool-secondary-btn {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.tool-primary-btn--compact,
.tool-secondary-btn--compact {
  padding: 0.55rem 0.85rem;
  font-size: 0.88rem;
}

.news-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
}

.news-manager,
.news-search,
.news-results,
.news-form {
  border: 1px solid color-mix(in oklab, var(--border-color) 80%, transparent);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-primary) 88%, transparent);
  padding: 1rem;
}

.news-manager__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.news-form {
  border-style: dashed;
  margin-bottom: 1rem;
}

.news-form__title {
  margin: 0 0 0.75rem;
  font-weight: 700;
}

.news-form__row {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr) auto;
  gap: 0.55rem;
}

.news-form__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.65rem;
}

.news-form__advanced {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.75rem;
}

.news-link-btn {
  border: 0;
  background: transparent;
  color: var(--primary-text);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.news-site-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.65rem;
}

.news-site-card {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 0.8rem;
  background: var(--bg-primary);
}

.news-site-card.locked {
  border-color: color-mix(in oklab, var(--primary) 35%, var(--border-color));
  background: color-mix(in oklab, var(--primary) 8%, var(--bg-primary));
}

.news-site-card.unlocked {
  opacity: 0.82;
}

.news-site-card__name {
  margin: 0;
  font-weight: 700;
  font-size: 0.92rem;
}

.news-site-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: flex-start;
  justify-content: flex-end;
}

.news-danger-btn {
  border: 1px solid color-mix(in oklab, var(--danger) 30%, var(--border-color));
  border-radius: var(--radius-lg);
  background: color-mix(in oklab, var(--danger-solid) 8%, var(--bg-primary));
  color: var(--danger-text);
  padding: 0.45rem 0.7rem;
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}

.news-search__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.45rem;
}

.news-search__row .tool-input {
  flex: 1 1 220px;
  min-width: 0;
}

.tool-field span {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 600;
}

.news-recent {
  margin-top: 0.9rem;
  border-top: 1px dashed var(--border-color);
  padding-top: 0.85rem;
}

.news-recent__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.news-recent__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.55rem;
}

.news-recent-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  border: 1px solid color-mix(in oklab, var(--primary) 28%, var(--border-color));
  border-radius: 999px;
  background: color-mix(in oklab, var(--primary) 8%, var(--bg-primary));
  padding-left: 0.7rem;
  max-width: 100%;
}

.news-recent-chip button {
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0.4rem 0.15rem;
}

.news-recent-chip__remove {
  padding: 0.35rem 0.55rem !important;
  color: var(--text-muted) !important;
}

.tool-error {
  margin: 0;
  border: 1px solid color-mix(in oklab, var(--danger) 35%, var(--border-color));
  border-radius: 14px;
  background: color-mix(in oklab, var(--danger-solid) 10%, var(--bg-primary));
  color: var(--danger-text);
  padding: 0.75rem 0.9rem;
  font-size: 0.9rem;
}

.tool-notice {
  margin: 0;
  border: 1px solid color-mix(in oklab, var(--warning) 35%, var(--border-color));
  border-radius: 14px;
  background: color-mix(in oklab, var(--warning-solid) 10%, var(--bg-primary));
  color: color-mix(in oklab, var(--warning-text) 70%, var(--text-primary));
  padding: 0.75rem 0.9rem;
  font-size: 0.86rem;
  line-height: 1.55;
}

.tool-empty {
  margin: 0;
  border: 1px dashed var(--border-color);
  border-radius: 18px;
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.92rem;
}

.news-results__meta {
  font-weight: 400;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.news-article-list {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.85rem;
}

.news-article-card {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--bg-primary);
  padding: 0.95rem 1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}

.news-article-card:hover {
  border-color: color-mix(in oklab, var(--primary) 40%, var(--border-color));
  transform: translateY(-1px);
}

.news-article-card__title {
  margin: 0;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.45;
}

.news-article-card__meta,
.news-article-card__url {
  margin: 0.35rem 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.45;
}

.news-article-card__url {
  color: color-mix(in oklab, var(--primary) 75%, var(--text-secondary));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.news-article-card__icon {
  color: var(--primary-text);
  opacity: 0.7;
}

.news-by-site {
  margin-top: 1rem;
}

.news-by-site__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.55rem;
  margin-top: 0.55rem;
}

.news-by-site__card {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-primary);
  padding: 0.7rem 0.8rem;
  font-size: 0.84rem;
}

.news-by-site__card strong {
  display: block;
  margin-bottom: 0.25rem;
}

.news-by-site__card p {
  margin: 0;
  color: var(--text-secondary);
}

.news-bento__url {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  word-break: break-all;
}

.news-bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}

.news-bento-card {
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--bg-primary);
  padding: 0.95rem;
}

.news-bento-card.focus {
  border-color: color-mix(in oklab, var(--warning) 45%, var(--border-color));
  background: color-mix(in oklab, var(--warning-solid) 10%, var(--bg-primary));
}

.news-bento-card strong {
  display: block;
  margin-bottom: 0.4rem;
}

.news-bento-card p {
  margin: 0 0 0.55rem;
  color: var(--text-secondary);
  line-height: 1.55;
  font-size: 0.9rem;
}

.news-bento__footer {
  margin: 0;
  text-align: right;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.store-card__link {
  color: var(--primary-text);
  font-size: 0.88rem;
  text-decoration: none;
}

.store-card__link:hover {
  text-decoration: underline;
}

.news-pop__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.news-pop-card {
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-primary) 92%, transparent);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.news-pop-card__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.news-pop-card h4 {
  margin: 0.25rem 0 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.news-pop-card__latest {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  min-width: 7.5rem;
}

.news-pop-card__latest-label {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.news-pop-card__latest strong {
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.news-pop-section-title {
  margin: 0 0 0.5rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
}

.news-pop-table-wrap {
  overflow-x: auto;
}

.news-pop-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}

.news-pop-table th,
.news-pop-table td {
  padding: 0.55rem 0.45rem;
  border-bottom: 1px solid color-mix(in oklab, var(--border-color) 85%, transparent);
  text-align: left;
}

.news-pop-table th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.78rem;
}

.news-pop-table th:nth-child(2),
.news-pop-table td:nth-child(2),
.news-pop-table th:nth-child(3),
.news-pop-table td:nth-child(3) {
  text-align: right;
}

.news-pop-table__empty {
  text-align: center !important;
  color: var(--text-secondary);
}

.news-pop-change {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.news-pop-change.is-up {
  color: var(--success-text);
}

.news-pop-change.is-down {
  color: var(--danger-text);
}

.news-pop-change.is-flat {
  color: var(--text-secondary);
}

.news-pop-chart-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.news-pop-chart {
  border: 1px solid color-mix(in oklab, var(--border-color) 80%, transparent);
  border-radius: var(--radius-xl);
  background: color-mix(in oklab, var(--bg-secondary) 70%, var(--bg-primary));
  padding: 0.65rem 0.55rem 0.5rem;
}

.news-pop-chart__svg {
  display: block;
  width: 100%;
  height: 150px;
}

.news-pop-chart__axis {
  display: flex;
  justify-content: space-between;
  gap: 0.15rem;
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.68rem;
  overflow: hidden;
}

.news-pop-chart__axis span {
  flex: 1 1 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.news-pop-chart__range {
  display: flex;
  justify-content: space-between;
  margin-top: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .news-form__row {
    grid-template-columns: 1fr;
  }

  .news-site-card {
    flex-direction: column;
  }

  .news-site-card__actions {
    justify-content: flex-start;
  }

  .news-pop-card__latest {
    align-items: flex-start;
  }
}
</style>
