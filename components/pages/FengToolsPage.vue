<template>
  <PageContainer>
    <div class="feng-tools-page">
      <section class="tools-hero">
        <div class="tools-hero__copy">
          <p class="tools-kicker">FENGBRO TOOLKIT</p>
          <h2>鋒兄工具</h2>
          <p class="tools-lead">
            集中處理比價、通路查價與每 7 天一次的歷史價格快照。先查現在，再留下一條能回頭看的價格軌跡。
          </p>
        </div>

        <div class="tools-segments" role="tablist" aria-label="鋒兄工具子選單">
          <button
            v-for="tab in toolTabs"
            :key="tab.value"
            type="button"
            class="tools-segment"
            :class="{ active: activeTool === tab.value }"
            @click="activeTool = tab.value"
          >
            <span class="tools-segment__label">{{ tab.label }}</span>
            <span class="tools-segment__desc">{{ tab.description }}</span>
          </button>
        </div>
      </section>

      <section v-if="activeTool === 'biggo'" class="tool-panel">
        <div class="tool-panel__header">
          <div>
            <p class="panel-kicker">鋒兄比價</p>
            <h3>貼上商品網址，抓 BigGo 比價與價格區間</h3>
          </div>
        </div>

        <div class="tool-input-grid">
          <label class="tool-field tool-field--wide">
            <span>商品網址</span>
            <input
              v-model.trim="biggoForm.url"
              type="url"
              class="tool-input"
              placeholder="https://24h.pchome.com.tw/prod/DRAHGT-A900HAAZH"
              @keydown.enter.prevent="runBiggoLookup"
            />
          </label>
          <button type="button" class="tool-primary-btn" :disabled="biggoLoading" @click="runBiggoLookup">
            {{ biggoLoading ? '查詢中...' : '開始比價' }}
          </button>
        </div>

        <p v-if="biggoError" class="tool-error">{{ biggoError }}</p>

        <template v-if="biggoResult">
          <div class="tool-meta">
            <div>
              <span class="tool-meta__label">商品</span>
              <strong>{{ biggoResult.productTitle }}</strong>
            </div>
            <div>
              <span class="tool-meta__label">BigGo 關鍵字</span>
              <strong>{{ biggoResult.keyword }}</strong>
            </div>
          </div>

          <div class="stats-grid">
            <article class="stat-tile">
              <span>現在價格</span>
              <strong>{{ formatCurrency(biggoResult.currentPrice) }}</strong>
            </article>
            <article class="stat-tile">
              <span>歷史最高價</span>
              <strong>{{ formatCurrency(biggoResult.historicalHigh) }}</strong>
            </article>
            <article class="stat-tile">
              <span>歷史最低價</span>
              <strong>{{ formatCurrency(biggoResult.historicalLow) }}</strong>
            </article>
          </div>

          <div class="chart-shell">
            <div class="chart-shell__header">
              <div>
                <p class="panel-kicker">價格統計圖</p>
                <h4>BigGo 查詢紀錄</h4>
              </div>
              <p class="chart-caption">每 7 天自動更新一次目前查詢結果</p>
            </div>

            <svg
              v-if="biggoChart.points.length > 1"
              class="price-chart"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-label="BigGo 價格走勢圖"
            >
              <polyline class="chart-area" :points="biggoChart.areaPoints" />
              <polyline class="chart-line" :points="biggoChart.points" />
              <circle
                v-for="point in biggoChart.circles"
                :key="point.key"
                class="chart-dot"
                :cx="point.x"
                :cy="point.y"
                r="1.8"
              />
            </svg>
            <div v-else class="chart-empty">至少累積兩筆 7 天快照後，這裡會出現走勢。</div>

            <div v-if="biggoHistory.length > 0" class="chart-legend chart-legend--row">
              <div v-for="entry in biggoHistory" :key="entry.date" class="history-chip">
                <span>{{ formatHistoryDate(entry.date) }}</span>
                <strong>{{ formatCurrency(entry.currentPrice) }}</strong>
              </div>
            </div>
          </div>
        </template>
      </section>

      <section v-else class="tool-panel">
        <div class="tool-panel__header">
          <div>
            <p class="panel-kicker">地標網通</p>
            <h3>輸入型號，抓容量版本與目前價格</h3>
          </div>
        </div>

        <div class="tool-input-grid">
          <label class="tool-field tool-field--wide">
            <span>型號名稱</span>
            <input
              v-model.trim="landtopForm.keyword"
              type="text"
              class="tool-input"
              placeholder="Apple iPhone 17 或 Samsung S26"
              @keydown.enter.prevent="runLandtopLookup"
            />
          </label>
          <button type="button" class="tool-primary-btn" :disabled="landtopLoading" @click="runLandtopLookup">
            {{ landtopLoading ? '查詢中...' : '查詢價格' }}
          </button>
        </div>

        <p v-if="landtopError" class="tool-error">{{ landtopError }}</p>

        <template v-if="landtopResult">
          <div class="tool-meta">
            <div>
              <span class="tool-meta__label">匹配商品</span>
              <strong>{{ landtopResult.productName }}</strong>
            </div>
            <div>
              <span class="tool-meta__label">來源</span>
              <strong>{{ landtopResult.brandLabel }}</strong>
            </div>
          </div>

          <div class="variant-grid">
            <article v-for="variant in landtopResult.variants" :key="variant.label" class="variant-card">
              <p class="variant-card__name">{{ variant.displayName }}</p>
              <strong>{{ variant.priceLabel }}</strong>
              <span class="variant-card__hint">{{ variant.statusText }}</span>
            </article>
          </div>

          <div class="chart-shell">
            <div class="chart-shell__header">
              <div>
                <p class="panel-kicker">價格統計圖</p>
                <h4>{{ landtopResult.productName }} 歷史記錄</h4>
              </div>
              <p class="chart-caption">每 7 天記錄一次各容量目前價格</p>
            </div>

            <svg
              v-if="landtopChart.paths.length > 0 && landtopChart.hasAtLeastTwoSnapshots"
              class="price-chart"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-label="地標網通價格走勢圖"
            >
              <polyline
                v-for="path in landtopChart.paths"
                :key="path.key"
                class="chart-line chart-line--multi"
                :class="path.className"
                :points="path.points"
              />
            </svg>
            <div v-else class="chart-empty">至少累積兩筆 7 天快照後，這裡會出現容量價格走勢。</div>

            <div v-if="landtopResult.variants.length > 0" class="chart-legend">
              <div
                v-for="variant in landtopResult.variants"
                :key="variant.label"
                class="legend-item"
              >
                <span class="legend-swatch" :class="seriesClassName(variant.label)"></span>
                <span>{{ variant.displayName }}</span>
              </div>
            </div>
          </div>
        </template>
      </section>
    </div>
  </PageContainer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import PageContainer from '../layout/PageContainer.vue'

const toolTabs = [
  { value: 'biggo', label: '鋒兄比價', description: '網址貼上後抓 BigGo 價格區間' },
  { value: 'landtop', label: '地標網通', description: '型號查詢容量與通路價格' }
]

const activeTool = ref('biggo')

const biggoForm = ref({ url: '' })
const biggoLoading = ref(false)
const biggoError = ref('')
const biggoResult = ref(null)
const biggoHistory = ref([])

const landtopForm = ref({ keyword: '' })
const landtopLoading = ref(false)
const landtopError = ref('')
const landtopResult = ref(null)
const landtopHistory = ref([])

const HISTORY_INTERVAL_DAYS = 7
const BIGGO_HISTORY_KEY = 'fengbro-tools-biggo-history'
const LANDTOP_HISTORY_KEY = 'fengbro-tools-landtop-history'

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' && !/^\d/.test(value)) return value
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount)
}

const formatHistoryDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase()

const readHistoryStore = (storageKey) => {
  if (!import.meta.client) return {}
  return safeJsonParse(localStorage.getItem(storageKey) || '{}', {})
}

const writeHistoryStore = (storageKey, store) => {
  if (!import.meta.client) return
  localStorage.setItem(storageKey, JSON.stringify(store))
}

const updateHistoryEntries = (storageKey, queryKey, nextEntry) => {
  const store = readHistoryStore(storageKey)
  const currentEntries = Array.isArray(store[queryKey]) ? store[queryKey] : []
  const nextDate = new Date(nextEntry.date)
  const lastEntry = currentEntries[currentEntries.length - 1]

  if (lastEntry?.date) {
    const lastDate = new Date(lastEntry.date)
    const diffDays = (nextDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < HISTORY_INTERVAL_DAYS) {
      currentEntries[currentEntries.length - 1] = nextEntry
    } else {
      currentEntries.push(nextEntry)
    }
  } else {
    currentEntries.push(nextEntry)
  }

  store[queryKey] = currentEntries
  writeHistoryStore(storageKey, store)
  return currentEntries
}

const loadHistoryEntries = (storageKey, queryKey) => {
  const store = readHistoryStore(storageKey)
  return Array.isArray(store[queryKey]) ? store[queryKey] : []
}

const buildSingleSeriesChart = (entries, field) => {
  const values = entries
    .map(entry => Number(entry[field]))
    .filter(value => Number.isFinite(value))

  if (values.length < 2) {
    return { points: '', areaPoints: '', circles: [] }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const circles = entries
    .map((entry, index) => {
      const value = Number(entry[field])
      if (!Number.isFinite(value)) return null
      const x = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 92 + 4
      const y = 96 - ((value - min) / range) * 72 - 6
      return {
        key: `${entry.date}-${index}`,
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2))
      }
    })
    .filter(Boolean)

  const points = circles.map(point => `${point.x},${point.y}`).join(' ')
  const areaPoints = `4,96 ${points} 96,96`

  return { points, areaPoints, circles }
}

const seriesPalette = ['chart-series-a', 'chart-series-b', 'chart-series-c', 'chart-series-d']

const seriesClassName = (label) => {
  const seed = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return seriesPalette[seed % seriesPalette.length]
}

const buildMultiSeriesChart = (entries, labels) => {
  const numericValues = []
  for (const entry of entries) {
    for (const label of labels) {
      const value = Number(entry.variants?.[label])
      if (Number.isFinite(value)) numericValues.push(value)
    }
  }

  if (numericValues.length === 0) {
    return { paths: [], hasAtLeastTwoSnapshots: false }
  }

  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1

  const paths = labels
    .map((label) => {
      const points = entries
        .map((entry, index) => {
          const value = Number(entry.variants?.[label])
          if (!Number.isFinite(value)) return null
          const x = entries.length === 1 ? 50 : (index / (entries.length - 1)) * 92 + 4
          const y = 96 - ((value - min) / range) * 72 - 6
          return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`
        })
        .filter(Boolean)
        .join(' ')

      if (!points) return null
      return { key: label, points, className: seriesClassName(label) }
    })
    .filter(Boolean)

  return { paths, hasAtLeastTwoSnapshots: entries.length > 1 }
}

const biggoChart = computed(() => buildSingleSeriesChart(biggoHistory.value, 'currentPrice'))
const landtopChart = computed(() => buildMultiSeriesChart(
  landtopHistory.value,
  landtopResult.value?.variants?.map(variant => variant.label) || []
))

const runBiggoLookup = async () => {
  if (!biggoForm.value.url) {
    biggoError.value = '請先貼上商品網址。'
    return
  }

  biggoLoading.value = true
  biggoError.value = ''

  try {
    const response = await $fetch('/api/feng-tools/biggo', {
      method: 'POST',
      body: { url: biggoForm.value.url }
    })

    biggoResult.value = response
    const queryKey = normalizeLookupKey(biggoForm.value.url)
    const nextHistory = updateHistoryEntries(BIGGO_HISTORY_KEY, queryKey, {
      date: new Date().toISOString(),
      currentPrice: response.currentPrice,
      historicalHigh: response.historicalHigh,
      historicalLow: response.historicalLow
    })
    biggoHistory.value = nextHistory
  } catch (error) {
    biggoError.value = error?.data?.statusMessage || error?.message || 'BigGo 查詢失敗。'
  } finally {
    biggoLoading.value = false
  }
}

const runLandtopLookup = async () => {
  if (!landtopForm.value.keyword) {
    landtopError.value = '請先輸入型號名稱。'
    return
  }

  landtopLoading.value = true
  landtopError.value = ''

  try {
    const response = await $fetch('/api/feng-tools/landtop', {
      method: 'POST',
      body: { keyword: landtopForm.value.keyword }
    })

    landtopResult.value = response
    const queryKey = normalizeLookupKey(landtopForm.value.keyword)
    const nextHistory = updateHistoryEntries(LANDTOP_HISTORY_KEY, queryKey, {
      date: new Date().toISOString(),
      variants: Object.fromEntries(
        response.variants.map(variant => [variant.label, variant.numericPrice ?? null])
      )
    })
    landtopHistory.value = nextHistory
  } catch (error) {
    landtopError.value = error?.data?.statusMessage || error?.message || '地標網通查詢失敗。'
  } finally {
    landtopLoading.value = false
  }
}

watch(
  () => biggoForm.value.url,
  (value) => {
    if (!value) {
      biggoHistory.value = []
      return
    }
    biggoHistory.value = loadHistoryEntries(BIGGO_HISTORY_KEY, normalizeLookupKey(value))
  },
  { immediate: true }
)

watch(
  () => landtopForm.value.keyword,
  (value) => {
    if (!value) {
      landtopHistory.value = []
      return
    }
    landtopHistory.value = loadHistoryEntries(LANDTOP_HISTORY_KEY, normalizeLookupKey(value))
  },
  { immediate: true }
)
</script>

<style scoped>
.feng-tools-page {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}

.tools-hero,
.tool-panel {
  border: 1px solid var(--border-color);
  border-radius: 28px;
  background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
  box-shadow: var(--shadow-soft);
}

.tools-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.95fr);
  gap: 1.2rem;
  padding: 1.4rem;
}

.tools-kicker,
.panel-kicker {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.tools-hero h2,
.tool-panel h3,
.chart-shell h4 {
  margin: 0.3rem 0 0;
  font-family: var(--font-display);
}

.tools-hero h2 {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
}

.tools-lead {
  margin: 0.7rem 0 0;
  color: var(--text-secondary);
  line-height: 1.75;
  max-width: 58ch;
}

.tools-segments {
  display: grid;
  gap: 0.8rem;
}

.tools-segment {
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: var(--bg-primary);
  padding: 1rem 1.05rem;
  text-align: left;
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.tools-segment:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.tools-segment.active {
  border-color: color-mix(in oklab, var(--primary) 42%, var(--border-color));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--primary) 28%, transparent);
}

.tools-segment__label,
.tools-segment__desc {
  display: block;
}

.tools-segment__label {
  font-weight: 700;
  color: var(--text-primary);
}

.tools-segment__desc {
  margin-top: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.55;
}

.tool-panel {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tool-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.tool-input-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: end;
}

.tool-field {
  display: grid;
  gap: 0.45rem;
}

.tool-field span {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.tool-input {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 52px;
  padding: 0.85rem 1rem;
}

.tool-primary-btn {
  min-height: 52px;
  border-radius: 999px;
  border: 0;
  padding: 0.85rem 1.2rem;
  background: linear-gradient(135deg, color-mix(in oklab, var(--primary) 82%, white), color-mix(in oklab, var(--accent) 65%, white));
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.tool-primary-btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

.tool-error {
  margin: 0;
  color: var(--danger);
}

.tool-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.8rem;
}

.tool-meta > div,
.stat-tile,
.variant-card {
  border-radius: 22px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  padding: 1rem;
}

.tool-meta__label {
  display: block;
  color: var(--text-secondary);
  font-size: 0.82rem;
  margin-bottom: 0.35rem;
}

.stats-grid,
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
}

.stat-tile span,
.variant-card__hint {
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.stat-tile strong,
.variant-card strong {
  display: block;
  margin-top: 0.45rem;
  font-size: 1.35rem;
  color: var(--text-primary);
}

.variant-card__name {
  margin: 0;
  font-weight: 700;
  color: var(--text-primary);
}

.variant-card__hint {
  display: block;
  margin-top: 0.55rem;
}

.chart-shell {
  border-radius: 24px;
  padding: 1rem 1rem 1.1rem;
  background: linear-gradient(180deg, color-mix(in oklab, var(--bg-primary) 92%, white), color-mix(in oklab, var(--bg-secondary) 94%, transparent));
  border: 1px solid var(--border-color);
}

.chart-shell__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
}

.chart-caption {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.price-chart {
  width: 100%;
  height: 260px;
  overflow: visible;
  border-radius: 18px;
  background:
    linear-gradient(to top, color-mix(in oklab, var(--border-color) 46%, transparent) 1px, transparent 1px) 0 0 / 100% 25%,
    linear-gradient(to right, color-mix(in oklab, var(--border-color) 26%, transparent) 1px, transparent 1px) 0 0 / 16.66% 100%,
    color-mix(in oklab, var(--bg-secondary) 94%, transparent);
}

.chart-area {
  fill: color-mix(in oklab, var(--primary) 18%, transparent);
  stroke: none;
}

.chart-line {
  fill: none;
  stroke: color-mix(in oklab, var(--primary) 88%, black);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-line--multi.chart-series-a { stroke: #2563eb; }
.chart-line--multi.chart-series-b { stroke: #db2777; }
.chart-line--multi.chart-series-c { stroke: #059669; }
.chart-line--multi.chart-series-d { stroke: #d97706; }

.chart-dot {
  fill: color-mix(in oklab, var(--primary) 90%, black);
  stroke: white;
  stroke-width: 0.7;
}

.chart-empty {
  min-height: 180px;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  text-align: center;
}

.chart-legend {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.chart-legend--row {
  gap: 0.55rem;
}

.history-chip,
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.history-chip strong {
  color: var(--text-primary);
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.legend-swatch.chart-series-a { background: #2563eb; }
.legend-swatch.chart-series-b { background: #db2777; }
.legend-swatch.chart-series-c { background: #059669; }
.legend-swatch.chart-series-d { background: #d97706; }

@media (max-width: 960px) {
  .tools-hero,
  .tool-input-grid {
    grid-template-columns: 1fr;
  }

  .tool-primary-btn {
    width: 100%;
  }

  .chart-shell__header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .tools-hero,
  .tool-panel {
    border-radius: 24px;
    padding: 1rem;
  }

  .price-chart {
    height: 220px;
  }
}
</style>
