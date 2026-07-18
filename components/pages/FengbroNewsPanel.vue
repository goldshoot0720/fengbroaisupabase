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
            <template v-if="result.maxAgeYears"> · 近 {{ result.maxAgeYears }} 年</template>）
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

let searchAbort = null
let searchTimer = null

const lockedCount = computed(() => sites.value.filter((s) => s.locked).length)

const adapterLabel = (adapter) => adapterOptions.find((a) => a.id === adapter)?.label || adapter

const formatDateTime = (value) => {
  if (!value) return '--'
  return new Date(value).toLocaleString('zh-TW')
}

const formatDate = (value) => {
  if (!value) return '--'
  return new Date(value).toLocaleDateString('zh-TW')
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

onMounted(() => {
  loadBentoStores(true)
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
  background: linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 70%, #1d4ed8));
  color: #fff;
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
  color: var(--primary);
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
  border: 1px solid color-mix(in oklab, #ef4444 30%, var(--border-color));
  border-radius: 12px;
  background: color-mix(in oklab, #ef4444 8%, var(--bg-primary));
  color: #b91c1c;
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
  border: 1px solid color-mix(in oklab, #ef4444 35%, var(--border-color));
  border-radius: 14px;
  background: color-mix(in oklab, #ef4444 10%, var(--bg-primary));
  color: #b91c1c;
  padding: 0.75rem 0.9rem;
  font-size: 0.9rem;
}

.tool-notice {
  margin: 0;
  border: 1px solid color-mix(in oklab, #f59e0b 35%, var(--border-color));
  border-radius: 14px;
  background: color-mix(in oklab, #f59e0b 10%, var(--bg-primary));
  color: color-mix(in oklab, #92400e 70%, var(--text-primary));
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
  color: var(--primary);
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
  border-color: color-mix(in oklab, #f59e0b 45%, var(--border-color));
  background: color-mix(in oklab, #f59e0b 10%, var(--bg-primary));
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
  color: var(--primary);
  font-size: 0.88rem;
  text-decoration: none;
}

.store-card__link:hover {
  text-decoration: underline;
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
}
</style>
