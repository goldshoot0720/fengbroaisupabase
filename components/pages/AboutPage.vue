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
            <span class="stat-value">2026/04/23</span>
            <span class="stat-label">本次更新</span>
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
            <h3>鋒兄筆記</h3>
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
            <p>支援 ZIP 匯出、ZIP 匯入、Appwrite CSV 匯入與進度顯示。</p>
          </article>
          <article class="feature-card">
            <span class="feature-icon">🧰</span>
            <h3>鋒兄工具</h3>
            <p>整合 BigGo 與手機通路比價，手機比價目前比對地標網通與傑昇通信。</p>
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
              <li>文件中心已支援 Appwrite 文件 ZIP 格式。</li>
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
              <p>鋒兄工具可查 BigGo 與手機比價，並留下每 7 天一筆的價格快照。</p>
            </div>
          </div>
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
import { computed } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import packageJson from '../../package.json'

const systemVersion = computed(() => `v${packageJson.version || '未設定'}`)
const nuxtVersion = computed(() => packageJson.dependencies?.nuxt || '未設定')
const vueVersion = computed(() => packageJson.dependencies?.vue || '未設定')

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
