<template>
  <PageContainer>
    <div class="about-page">
      <section class="hero-section">
        <div class="hero-logo">FA</div>
        <h1 class="app-title">鋒兄關於</h1>
        <p class="version">系統版本 {{ systemVersion }}</p>
        <p class="description">
          鋒兄 AI Supabase 是一套以 Nuxt、Vue、Supabase 為核心的個人工作資料庫，整合筆記、音樂、影片、文件、帳號、訂閱與工具頁。
        </p>
      </section>

      <section class="section company-section">
        <h2 class="section-title">系統定位</h2>
        <div class="company-card">
          <div class="company-row">
            <span class="company-label">名稱</span>
            <span class="company-value">鋒兄 AI Supabase</span>
          </div>
          <div class="company-row">
            <span class="company-label">用途</span>
            <span class="company-value">集中整理資料、附件、媒體內容與日常管理流程。</span>
          </div>
          <div class="company-row">
            <span class="company-label">目前版本</span>
            <span class="company-value">{{ systemVersion }}</span>
          </div>
          <div class="company-row">
            <span class="company-label">技術核心</span>
            <span class="company-value">Nuxt、Vue、Supabase、Netlify、PostgreSQL、JSZip。</span>
          </div>
          <div class="company-row">
            <span class="company-label">部署方式</span>
            <span class="company-value">前端與 API 走 Netlify，資料與 Storage 以 Supabase 為主。</span>
          </div>
        </div>
      </section>

      <section class="section stats-section">
        <h2 class="section-title">版本資訊</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ systemVersion }}</span>
            <span class="stat-label">系統版本號</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ nuxtVersion }}</span>
            <span class="stat-label">Nuxt 版本號</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ vueVersion }}</span>
            <span class="stat-label">Vue 版本號</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ lastUpdateDateLabel }}</span>
            <span class="stat-label">本次更新</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ linesOfCodeLabel }}</span>
            <span class="stat-label">產品程式碼行</span>
          </div>
        </div>
        <div class="tech-stack">
          <span class="tech-badge">Nuxt 4</span>
          <span class="tech-badge">Vue 3</span>
          <span class="tech-badge">Supabase</span>
          <span class="tech-badge">Netlify</span>
          <span class="tech-badge">JSZip</span>
          <span class="tech-badge">PostgreSQL</span>
        </div>
      </section>

      <section class="section features-section">
        <h2 class="section-title">目前重點功能</h2>
        <div class="features-grid">
          <article class="feature-card">
            <span class="feature-icon">📝</span>
            <h3>鋒兄筆記/文件</h3>
            <p>支援分類篩選、置頂、附件篩選與快速整理工作筆記。</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon">🎵</span>
            <h3>音樂資料</h3>
            <p>管理歌曲、歌詞、封面與播放內容，並維持播放器同步。</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon">🎬</span>
            <h3>影片資料</h3>
            <p>整理影片、封面與分段檔案，支援 multipart manifest 引用判斷。</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon">📄</span>
            <h3>文件中心</h3>
            <p>支援 ZIP 匯出/匯入、CSV 匯出/匯入、附件 CSV 表格預覽與進度顯示。</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon">🧰</span>
            <h3>鋒兄工具</h3>
            <p>整合 BigGo、手動價錢、手機通路比價、YouTube、金融、新聞、圖片語音成片、PNG／JPEG 轉換，以及多段影片合併。</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon">🗂️</span>
            <h3>系統設定</h3>
            <p>可檢查資料表、管理帳號、掃描 Storage 多餘檔案與查看版本資訊。</p>
          </article>
        </div>
      </section>

      <section class="section tech-doc-section">
        <h2 class="section-title">資料與匯入設計</h2>
        <div class="doc-grid">
          <article class="doc-card">
            <div class="doc-icon">🗃️</div>
            <h3>資料表結構</h3>
            <ul>
              <li>文章、筆記、音樂、影片、文件、Podcast 各自分表管理。</li>
              <li>欄位設計以標題、內容、分類、日期、網址與附件欄位為主。</li>
              <li>支援 Supabase 與 Appwrite 匯入情境。</li>
            </ul>
          </article>
          <article class="doc-card">
            <div class="doc-icon">📦</div>
            <h3>ZIP 匯出匯入</h3>
            <ul>
              <li>可匯出結構化 JSON / CSV 與附件檔案。</li>
              <li>匯入時會顯示進度，降低大量資料操作的不確定感。</li>
              <li>文件中心已支援 ZIP／CSV 匯入匯出，以及附件 CSV 表格預覽。</li>
            </ul>
          </article>
          <article class="doc-card">
            <div class="doc-icon">☁️</div>
            <h3>Storage 管理</h3>
            <ul>
              <li>掃描 Supabase Storage 全部檔案。</li>
              <li>比對資料庫引用，找出未引用的圖片、影片、音樂、文件與 Podcast。</li>
              <li>分段影片會連同 manifest 與 PART 一起納入引用判斷。</li>
            </ul>
          </article>
          <article class="doc-card">
            <div class="doc-icon">🔌</div>
            <h3>前端架構</h3>
            <ul>
              <li>使用 Nuxt 4 + Vue 3 Composition API。</li>
              <li>各頁面以 composables 與 page components 分工。</li>
              <li>工具頁與設定頁都走同一套 UI 風格與本地歷史快照策略。</li>
            </ul>
          </article>
        </div>
      </section>

      <section class="section manual-section">
        <h2 class="section-title">使用方式</h2>
        <div class="manual-list">
          <div class="manual-item">
            <div class="manual-step">1</div>
            <div class="manual-content">
              <h3>建立資料</h3>
              <p>在各資料頁按下新增按鈕，先記錄標題與日期，再慢慢補內容與附件。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">2</div>
            <div class="manual-content">
              <h3>整理分類</h3>
              <p>透過分類、置頂與有附件篩選，把常用內容留在前面。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">3</div>
            <div class="manual-content">
              <h3>匯入匯出</h3>
              <p>需要搬資料時可用 ZIP 匯出匯入，文件頁也能接 Appwrite 匯入格式。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">4</div>
            <div class="manual-content">
              <h3>清理 Storage</h3>
              <p>在系統設定掃描 Storage，先看未引用檔案，再決定是否批次刪除。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">5</div>
            <div class="manual-content">
              <h3>通路比價</h3>
              <p>鋒兄工具可查 BigGo、手動紀錄商品價錢與走勢、手機通路比價（每 7 天一筆快照）、YouTube、金融報價、鎖定網站新聞搜尋、圖片語音成片、PNG／JPEG 批次轉換、多段影片合併，以及 YouTube／Bilibili 轉 MP3／MP4（需本機 yt-dlp，參考 YoutubeBilibiliMP4MP3Converter）。</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section legacy-features-section">
        <h2 class="section-title">鋒兄事業與服務資訊</h2>
        <div class="about-tabs" role="tablist" aria-label="關於頁內容">
          <button v-for="panel in aboutPanels" :key="panel.id" type="button" role="tab" :aria-selected="activeAboutPanel === panel.id" :class="{ active: activeAboutPanel === panel.id }" @click="activeAboutPanel = panel.id">
            {{ panel.label }}
          </button>
        </div>

        <div v-if="activeAboutPanel === 'ceo'" class="profile-layout">
          <img src="/fengbro-home-person.webp" alt="人工智慧水電行執行長" class="profile-image">
          <div class="profile-copy">
            <span class="profile-role">人工智慧水電行 · 執行長（CEO）</span>
            <h3>策略願景、產業經驗與卓越領導</h3>
            <p>結合傳統水電工程與人工智慧，推動服務自動化與產業創新；作為公司最大股東與執行長，引領企業持續轉型。</p>
            <div class="shareholding"><strong>37% 以上</strong><span>持股比例 · 控股股東</span></div>
          </div>
        </div>

        <div v-else-if="activeAboutPanel === 'cats'" class="cat-list">
          <article v-for="cat in cats" :key="cat.name" class="cat-profile">
            <img :src="cat.image" :alt="cat.name">
            <div><h3>{{ cat.name }} · {{ cat.type }}</h3><p>{{ cat.description }}</p><span>{{ cat.tags.join(' · ') }}</span></div>
          </article>
        </div>

        <div v-else-if="activeAboutPanel === 'plumber'" class="business-units">
          <div class="business-intro"><h3>水電大亨 · 事業版圖</h3><p>從傳統水電工程起家，逐步發展為橫跨科技、金融、教育、醫療等領域的綜合事業群。</p></div>
          <article v-for="unit in businessUnits" :key="unit.name"><span>{{ unit.icon }}</span><div><strong>{{ unit.name }}</strong><small>{{ unit.description }}</small></div></article>
        </div>

        <div v-else class="service-directory">
          <article v-for="service in services" :key="service.name">
            <div><h3>{{ service.name }}</h3><p>{{ service.description }}</p></div>
            <div class="service-links"><a :href="service.url" target="_blank" rel="noreferrer">開啟服務</a><a :href="service.repository" target="_blank" rel="noreferrer">自動化專案</a></div>
          </article>
          <p class="service-caution">自動化結果只代表工作流執行狀態；帳戶獎勵、會員權益與地區限制仍以各服務頁面為準。請勿將帳密、Cookie 或 API 金鑰寫入版本庫。</p>
        </div>
      </section>

      <div class="info-section">
        <p class="info-text">
          這一頁現在會跟著目前系統版本同步更新，避免設定頁、關於頁和實際 build 版本各說各話。
        </p>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { computed, ref } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import packageJson from '../../package.json'

const runtimeConfig = useRuntimeConfig()

const activeAboutPanel = ref('ceo')
const aboutPanels = [
  { id: 'ceo', label: '執行長' },
  { id: 'cats', label: '貓咪家族' },
  { id: 'plumber', label: '水電大亨' },
  { id: 'services', label: '影音與自動簽到服務' },
]
const cats = [
  { name: '喵布布', type: '三花貓', image: 'https://raw.githubusercontent.com/goldshoot0720/fengbroaiappwrite/main/public/cats2.25fimage1.png', description: '活潑、好奇又親人的三花貓，喜歡曬太陽、逗貓棒與小魚乾。', tags: ['活潑', '好奇', '親人'] },
  { name: '喵白白', type: '白貓', image: 'https://raw.githubusercontent.com/goldshoot0720/fengbroaiappwrite/main/public/cats2.25fimage2.png', description: '溫柔優雅的白貓，喜歡睡覺、被摸摸與吃罐罐。', tags: ['溫柔', '優雅', '慵懶'] },
]
const businessUnits = [
  ['🔧', '水電工程行', '專業水電工程服務'], ['🧠', '水電人工智慧股份有限公司', 'AI 技術研發與應用'],
  ['🌐', '水電資訊', '資訊系統整合服務'], ['💻', '水電科技', '科技創新與研發'], ['🏗️', '水電營造', '大型營造工程'],
  ['🏢', '水電建設', '建設開發與管理'], ['🤖', '水電機器人', '智能機器人研發'], ['🏦', '水電銀行', '金融服務與投資'],
  ['🍽️', '水電餐飲', '餐飲連鎖經營'], ['📚', '水電文化事業', '文化產業發展'], ['🏥', '水電醫院', '醫療健康服務'],
  ['🎓', '水電大學', '高等教育機構'], ['🏛️', '水電基金會', '公益慈善基金會'],
].map(([icon, name, description]) => ({ icon, name, description }))
const services = [
  ['Bilibili', '影音社群、創作者內容與每日經驗任務資訊。', 'https://www.bilibili.com', 'https://github.com/huang1988pioneer/CronBilibiliMission'],
  ['MindVideo', '每日 API 簽到、點數與連續簽到摘要。', 'https://www.mindvideo.ai', 'https://github.com/huang1988pioneer/AutoSignMindVideo'],
  ['LitVideo', 'LitMedia 每日簽到與執行結果 artifacts。', 'https://www.litmedia.ai', 'https://github.com/huang1988pioneer/AutoSignLitVideo'],
  ['Musicful', 'Musicful growth center 每日簽到與 streak 報告。', 'https://www.musicful.ai', 'https://github.com/huang1988pioneer/AutoSignMusicful'],
  ['Digen', '每日登入獎勵與多帳號摘要。', 'https://digen.ai', 'https://github.com/huang1988pioneer/AutoSignDigen'],
  ['OiiOii', '每日 lunch 領取與失敗截圖 artifacts。', 'https://www.oiioii.ai', 'https://github.com/huang1988pioneer/AutoSignOiiOii'],
].map(([name, description, url, repository]) => ({ name, description, url, repository }))

const systemVersion = computed(() => `v${packageJson.version || '未設定'}`)
const nuxtVersion = computed(() => packageJson.dependencies?.nuxt || '未設定')
const vueVersion = computed(() => packageJson.dependencies?.vue || '未設定')

/** Same build-time source as 鋒兄首頁 footer (utils/repoStats.js). */
const lastUpdateDateLabel = computed(() => {
  const raw = runtimeConfig.public?.lastUpdateDate
  if (typeof raw !== 'string' || !raw) return '—'
  const iso = raw.slice(0, 10)
  // Display as YYYY/MM/DD to match prior about-page style.
  return iso.replaceAll('-', '/')
})

const linesOfCodeLabel = computed(() => {
  const n = Number(runtimeConfig.public?.linesOfCode)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return n.toLocaleString('zh-TW')
})

useHead({
  title: '鋒兄關於 - 鋒兄 AI Supabase'
})
</script>

<style scoped>
.about-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  animation: fadeIn 0.5s ease-in;
}

.about-tabs { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin-bottom: var(--spacing-lg); }
.about-tabs button { min-height: 44px; padding: 0 var(--spacing-md); border: 1px solid var(--border-strong); border-radius: var(--radius-full); color: var(--text-secondary); background: var(--bg-surface); cursor: pointer; font-weight: 700; }
.about-tabs button.active { border-color: var(--primary); color: var(--text-inverse); background: var(--primary); }
.profile-layout { display: grid; grid-template-columns: minmax(220px, 0.75fr) minmax(0, 1.25fr); gap: var(--spacing-xl); align-items: center; }
.profile-image { width: 100%; max-height: 360px; object-fit: cover; border-radius: var(--radius-lg); background: var(--bg-muted); }
.profile-copy { display: flex; flex-direction: column; gap: var(--spacing-md); }
.profile-copy h3, .profile-copy p { margin: 0; }
.profile-role { color: var(--primary); font-weight: 800; }
.shareholding { display: flex; flex-direction: column; gap: var(--spacing-2xs); padding: var(--spacing-md); border-radius: var(--radius-md); background: var(--success-light); }
.shareholding strong { color: var(--success); font-size: var(--text-3xl); }
.cat-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-lg); }
.cat-profile { overflow: hidden; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--bg-surface); }
.cat-profile img { width: 100%; height: 300px; object-fit: cover; }
.cat-profile div { padding: var(--spacing-lg); }
.cat-profile h3, .cat-profile p { margin: 0 0 var(--spacing-xs); }
.cat-profile span { color: var(--primary); font-size: var(--text-sm); font-weight: 700; }
.business-intro { grid-column: 1 / -1; max-width: 70ch; }
.business-units { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--spacing-sm); }
.business-units article { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-md); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-surface); }
.business-units article > span { font-size: var(--text-2xl); }
.business-units article div { display: flex; flex-direction: column; }
.business-units small { color: var(--text-muted); }
.service-directory { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.service-directory article { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); padding: var(--spacing-md); border-bottom: 1px solid var(--border-subtle); }
.service-directory h3, .service-directory p { margin: 0; }
.service-directory p { color: var(--text-secondary); }
.service-links { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); }
.service-links a { min-height: 40px; display: inline-flex; align-items: center; padding: 0 var(--spacing-sm); border-radius: var(--radius-sm); color: var(--primary); background: var(--primary-muted); font-weight: 700; white-space: nowrap; }
.service-caution { padding: var(--spacing-md); border-radius: var(--radius-sm); background: var(--warning-light); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-section {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 2.5rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.hero-logo {
  width: 72px;
  height: 72px;
  margin: 0 auto 0.8rem;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  font-size: 1.7rem;
  font-weight: 700;
}

.app-title {
  font-size: 2.6rem;
  font-weight: 700;
  margin: 0 0 0.4rem;
}

.version {
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0 0 0.8rem;
}

.description {
  font-size: 1.05rem;
  opacity: 0.95;
  max-width: 620px;
  margin: 0 auto;
  line-height: 1.7;
}

.section {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.6rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #2d3748;
}

.company-card,
.stat-card,
.feature-card,
.doc-card,
.manual-item,
.info-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.company-row {
  display: flex;
  padding: 0.95rem 1.4rem;
  border-bottom: 1px solid #f0f4f8;
  gap: 1rem;
  align-items: flex-start;
}

.company-row:last-child {
  border-bottom: none;
}

.company-label {
  font-weight: 600;
  color: #667eea;
  min-width: 92px;
  font-size: 0.9rem;
  padding-top: 2px;
}

.company-value {
  color: #4a5568;
  font-size: 0.95rem;
  line-height: 1.6;
}

.stats-grid,
.features-grid,
.doc-grid {
  display: grid;
  gap: 1.2rem;
}

.stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  margin-bottom: 1.5rem;
}

.stat-card {
  padding: 1.4rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  transition: all 0.3s ease;
}

.stat-card:hover,
.feature-card:hover,
.doc-card:hover,
.manual-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.16);
  border-color: #667eea;
}

.stat-value {
  font-size: 1.45rem;
  font-weight: 700;
  color: #4c51bf;
}

.stat-label {
  font-size: 0.85rem;
  color: #718096;
  font-weight: 500;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tech-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
}

.features-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.feature-card {
  padding: 1.6rem;
  text-align: center;
  transition: all 0.3s ease;
}

.feature-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.8rem;
}

.feature-card h3,
.doc-card h3,
.manual-content h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: #2d3748;
}

.feature-card p,
.doc-card li,
.manual-content p,
.info-text {
  font-size: 0.92rem;
  color: #718096;
  line-height: 1.6;
}

.doc-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.doc-card {
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.doc-icon {
  font-size: 1.8rem;
  margin-bottom: 0.7rem;
}

.doc-card ul {
  margin: 0;
  padding-left: 1.1rem;
}

.manual-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.manual-item {
  display: flex;
  gap: 1.2rem;
  align-items: flex-start;
  padding: 1.2rem 1.5rem;
  transition: all 0.3s ease;
}

.manual-step {
  min-width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
  flex-shrink: 0;
}

.manual-content strong {
  color: #667eea;
}

.info-section {
  text-align: center;
  padding: 1.5rem 2rem;
  border-style: dashed;
}

.info-text {
  margin: 0;
  font-weight: 500;
}

@media (max-width: 768px) {
  .profile-layout, .cat-list { grid-template-columns: 1fr; }
  .service-directory article { align-items: flex-start; flex-direction: column; }
  .about-page {
    padding: 1rem;
  }

  .hero-section {
    padding: 2rem 1rem;
  }

  .app-title {
    font-size: 1.9rem;
  }

  .section-title {
    font-size: 1.3rem;
  }

  .company-row {
    flex-direction: column;
    gap: 0.2rem;
  }

  .company-label {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .features-grid,
  .doc-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .manual-item {
    padding: 1rem;
  }
}
</style>
