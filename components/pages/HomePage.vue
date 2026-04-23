<template>
  <div class="home-page">
    <section class="hero-grid">
      <article class="hero-panel hero-primary">
        <div class="hero-ascii-shell" aria-label="feng bro ascii art">
          <div class="hero-ascii-head">
            <span class="hero-ascii-dot"></span>
            <span class="hero-ascii-dot"></span>
            <span class="hero-ascii-dot"></span>
            <p>feng bro / home signal</p>
          </div>
          <pre class="hero-ascii-art">{{ asciiArt }}</pre>
        </div>

        <p class="eyebrow">2026 interface direction</p>
        <h1 class="hero-title">
          用科技編輯風，
          <span>重新整理日常管理介面。</span>
        </h1>
        <p class="hero-copy">
          這個工作台是為科技人設計的資訊首頁。它讓訂閱成本、食品期限與資料入口像雜誌專題一樣好掃讀，快速、冷靜、清楚。
        </p>

        <div class="hero-actions">
          <button class="hero-btn hero-btn-primary" type="button" @click="$emit('navigate', 'dashboard')">
            打開總覽
          </button>
          <button class="hero-btn hero-btn-secondary" type="button" @click="$emit('navigate', 'subscription')">
            前往訂閱管理
          </button>
        </div>

        <div class="hero-metrics">
          <div v-for="metric in metrics" :key="metric.label" class="metric-card">
            <span class="metric-value">{{ metric.value }}</span>
            <span class="metric-label">{{ metric.label }}</span>
          </div>
        </div>
      </article>

      <aside class="hero-panel hero-briefing">
        <p class="briefing-label">Issue Brief</p>
        <div class="briefing-item">
          <span class="briefing-index">A1</span>
          <div>
            <h2>訂閱</h2>
            <p>以付款週期、價格與提醒節點為主軸，像編輯摘要一樣先抓重點。</p>
          </div>
        </div>
        <div class="briefing-item">
          <span class="briefing-index">B2</span>
          <div>
            <h2>食品</h2>
            <p>聚焦保存期限、補貨優先級與庫存壓力，讓日常判斷更快。</p>
          </div>
        </div>
        <div class="briefing-divider"></div>
        <p class="briefing-note">
          版面刻意保留留白與編輯節奏，避免傳統後台那種過度擁擠、每塊都像卡片的視覺疲勞。
        </p>
      </aside>
    </section>

    <section class="editorial-strip">
      <div class="strip-heading">
        <p class="eyebrow">Primary workflow</p>
        <h2>今天最重要的三個入口</h2>
      </div>
      <div class="strip-grid">
        <button v-for="item in primaryRoutes" :key="item.page" class="strip-card" type="button" @click="$emit('navigate', item.page)">
          <span class="strip-index">{{ item.index }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </button>
      </div>
    </section>

    <section class="feature-layout">
      <div class="section-copy">
        <p class="eyebrow">Interface system</p>
        <h2>不是一般儀表板，而是可掃讀的工作版面</h2>
        <p>
          新版介面以科技編輯排版為核心，混合強對比字級、細線框架、模組化資訊塊與節奏化留白，讓管理行為更像閱讀一份精簡週報。
        </p>
      </div>

      <div class="feature-list">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <span class="feature-kicker">{{ feature.kicker }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section class="channel-layout">
      <div class="channel-panel">
        <p class="eyebrow">Content channels</p>
        <h2>延伸模組仍保持在同一份編輯系統裡</h2>
        <p>圖庫、影片、音樂、文件與例行流程會維持一致的色彩、字體與資訊密度，不再像不同年代拼接出來的頁面。</p>
      </div>

      <div class="channel-grid">
        <button
          v-for="channel in channels"
          :key="channel.page"
          class="channel-card"
          type="button"
          @click="$emit('navigate', channel.page)"
        >
          <span class="channel-no">{{ channel.index }}</span>
          <div>
            <strong>{{ channel.title }}</strong>
            <p>{{ channel.description }}</p>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
defineEmits(['navigate'])

const asciiArt = String.raw`███████╗███████╗███╗   ██╗ ██████╗     ██████╗ ██████╗  ██████╗
██╔════╝██╔════╝████╗  ██║██╔════╝     ██╔══██╗██╔══██╗██╔═══██╗
█████╗  █████╗  ██╔██╗ ██║██║  ███╗    ██████╔╝██████╔╝██║   ██║
██╔══╝  ██╔══╝  ██║╚██╗██║██║   ██║    ██╔══██╗██╔══██╗██║   ██║
██║     ███████╗██║ ╚████║╚██████╔╝    ██████╔╝██║  ██║╚██████╔╝
╚═╝     ╚══════╝╚═╝  ╚═══╝ ╚═════╝     ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ `

const metrics = [
  { value: '02', label: '核心任務模組' },
  { value: '15+', label: '資料頁面入口' },
  { value: '24/7', label: '隨時可檢視狀態' }
]

const primaryRoutes = [
  { index: '01', title: '總覽', description: '快速掌握近期續訂、食品期限與整體管理壓力。', page: 'dashboard' },
  { index: '02', title: '訂閱管理', description: '整理平台費用、付款時間與續訂節奏。', page: 'subscription' },
  { index: '03', title: '鋒兄食品', description: '追蹤數量、期限與補貨優先順序。', page: 'food' }
]

const features = [
  {
    kicker: 'Typography',
    title: '更強的文字階層',
    description: '用編輯式字級與對比建立視覺節奏，讓你先看到重要資訊，再看細節。'
  },
  {
    kicker: 'Navigation',
    title: '導覽像目錄，不像表單',
    description: '側欄改成具有章節感的目錄系統，每個入口都帶有簡短上下文。'
  },
  {
    kicker: 'Mood',
    title: '冷靜、專業、帶未來感',
    description: '避免廉價霓虹與過度玻璃化，用乾淨的留白、深色結構與精準高亮塑造質感。'
  }
]

const channels = [
  { index: '04', title: '筆記 / 常用帳號', description: '維持快速檢索與低干擾的資訊視圖。', page: 'note' },
  { index: '05', title: '圖庫 / 影片 / 音樂', description: '多媒體資料也使用相同的編排與節奏。', page: 'gallery' },
  { index: '06', title: '文件 / 例行流程 / 設定', description: '從內容到系統設定都落在同一套視覺母語。', page: 'document' }
]
</script>

<style scoped>
.home-page {
  display: grid;
  gap: clamp(1.4rem, 1rem + 1vw, 2.4rem);
  padding-bottom: 0.4rem;
}

.hero-grid,
.feature-layout,
.channel-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
  gap: 1.2rem;
}

.hero-panel,
.editorial-strip,
.feature-card,
.channel-panel,
.channel-card {
  border: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
  box-shadow: var(--shadow-soft);
}

.hero-panel,
.editorial-strip,
.channel-panel {
  border-radius: 34px;
}

.hero-panel {
  padding: clamp(1.3rem, 1rem + 1.2vw, 2.2rem);
}

.hero-primary {
  position: relative;
  overflow: hidden;
  min-height: 520px;
  background:
    radial-gradient(circle at top right, color-mix(in oklab, var(--accent) 18%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in oklab, var(--bg-secondary) 96%, white 4%), color-mix(in oklab, var(--bg-tertiary) 62%, transparent));
}

.hero-primary::after {
  content: '';
  position: absolute;
  inset: auto -10% -22% auto;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--primary) 18%, transparent);
}

.eyebrow,
.briefing-label,
.feature-kicker,
.strip-index,
.channel-no {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.eyebrow,
.briefing-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.hero-title {
  margin-top: 1rem;
  max-width: 10ch;
  font-size: clamp(2.8rem, 2rem + 2vw, 5.4rem);
  line-height: 0.94;
}

.hero-title span {
  display: block;
  color: var(--primary);
}

.hero-copy {
  margin-top: 1.2rem;
  max-width: 58ch;
  color: var(--text-secondary);
  font-size: 1.05rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 1.15rem;
}

.hero-btn {
  min-height: 48px;
  border-radius: 999px;
  padding: 0.9rem 1.3rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
}

.hero-btn:hover,
.strip-card:hover,
.channel-card:hover {
  transform: translateY(-2px);
}

.hero-btn-primary {
  background: var(--surface-strong);
  color: var(--text-inverse);
}

.hero-btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 2rem;
}

.hero-ascii-shell {
  margin-top: 0.7rem;
  border: 1px solid color-mix(in oklab, var(--border-color) 84%, transparent);
  border-radius: 24px;
  overflow: hidden;
  background:
    linear-gradient(180deg, color-mix(in oklab, var(--surface-strong) 10%, var(--bg-secondary)), color-mix(in oklab, var(--bg-secondary) 94%, black 6%));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.hero-ascii-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid color-mix(in oklab, var(--border-color) 82%, transparent);
  background: color-mix(in oklab, var(--bg-secondary) 78%, transparent);
}

.hero-ascii-head p {
  margin: 0 0 0 0.35rem;
  color: var(--text-secondary);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-ascii-dot {
  width: 0.58rem;
  height: 0.58rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--accent) 62%, white);
}

.hero-ascii-dot:nth-child(2) {
  background: color-mix(in oklab, var(--warning) 70%, white);
}

.hero-ascii-dot:nth-child(3) {
  background: color-mix(in oklab, var(--success) 68%, white);
}

.hero-ascii-art {
  margin: 0;
  padding: 1rem 1rem 1.1rem;
  overflow-x: auto;
  color: color-mix(in oklab, var(--text-primary) 82%, var(--primary));
  font-family: "Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: clamp(0.48rem, 0.36rem + 0.34vw, 0.78rem);
  line-height: 1.18;
  letter-spacing: 0.02em;
}

.metric-card {
  padding: 0.95rem 1rem;
  border-radius: 22px;
  background: color-mix(in oklab, var(--bg-secondary) 70%, transparent);
  border: 1px solid var(--border-color);
}

.metric-value {
  display: block;
  font-family: var(--font-display);
  font-size: 1.7rem;
}

.metric-label {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.hero-briefing {
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface-strong) 94%, white 6%), color-mix(in oklab, var(--surface-strong) 90%, black 10%));
  color: var(--text-inverse);
}

.briefing-item {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 0.9rem;
  margin-top: 1.1rem;
}

.briefing-index {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  font-family: var(--font-display);
}

.hero-briefing h2 {
  font-size: 1.2rem;
}

.hero-briefing p {
  color: rgba(255, 255, 255, 0.75);
  margin-top: 0.35rem;
}

.briefing-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  margin: 1.3rem 0 1rem;
}

.briefing-note {
  font-size: 0.95rem;
}

.editorial-strip {
  padding: 1.35rem;
}

.strip-heading h2,
.section-copy h2,
.channel-panel h2 {
  margin-top: 0.4rem;
  font-size: clamp(1.8rem, 1.5rem + 1vw, 3rem);
  line-height: 1.05;
}

.strip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
  margin-top: 1.25rem;
}

.strip-card,
.channel-card {
  text-align: left;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  padding: 1rem;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.strip-card:hover,
.channel-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
}

.strip-index,
.channel-no,
.feature-kicker {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.strip-card strong,
.channel-card strong {
  display: block;
  margin-top: 0.6rem;
  font-size: 1.05rem;
}

.strip-card p,
.feature-card p,
.channel-card p,
.section-copy p,
.channel-panel p {
  margin-top: 0.4rem;
  color: var(--text-secondary);
}

.section-copy,
.channel-panel {
  padding: clamp(1.3rem, 1rem + 1vw, 2rem);
  border: 1px solid var(--border-color);
  border-radius: 30px;
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
}

.feature-list,
.channel-grid {
  display: grid;
  gap: 0.9rem;
}

.feature-card {
  padding: 1.25rem;
  border-radius: 24px;
}

.feature-card h3 {
  margin-top: 0.55rem;
  font-size: 1.25rem;
}

.channel-grid {
  grid-template-columns: 1fr;
}

@media (min-width: 769px) and (max-width: 1180px) {
  .hero-grid,
  .feature-layout,
  .channel-layout {
    grid-template-columns: 1fr;
  }

  .strip-grid,
  .channel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hero-primary {
    min-height: 440px;
  }
}

@media (max-width: 768px) {
  .hero-grid,
  .feature-layout,
  .channel-layout,
  .strip-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel,
  .editorial-strip,
  .section-copy,
  .channel-panel {
    border-radius: 26px;
  }

  .hero-primary {
    min-height: auto;
  }

  .hero-title {
    margin-top: 0.75rem;
    font-size: clamp(2.3rem, 1.7rem + 4vw, 3.6rem);
  }

  .hero-copy {
    font-size: 0.98rem;
  }

  .hero-ascii-art {
    font-size: clamp(0.42rem, 0.34rem + 0.5vw, 0.66rem);
  }

  .hero-metrics,
  .channel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .briefing-item {
    grid-template-columns: 44px 1fr;
    gap: 0.75rem;
  }

  .briefing-index {
    width: 44px;
    height: 44px;
    border-radius: 14px;
  }

  .feature-card,
  .strip-card,
  .channel-card {
    border-radius: 20px;
  }
}

@media (max-width: 640px) {
  .hero-title {
    max-width: none;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-ascii-art {
    font-size: 0.39rem;
    line-height: 1.12;
  }

  .hero-btn {
    width: 100%;
  }

  .hero-metrics,
  .channel-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel,
  .editorial-strip,
  .section-copy,
  .channel-panel {
    padding: 1.1rem;
  }

  .strip-heading h2,
  .section-copy h2,
  .channel-panel h2 {
    font-size: clamp(1.45rem, 1.2rem + 2vw, 2rem);
  }

  .feature-card {
    padding: 1rem;
  }
}
</style>
