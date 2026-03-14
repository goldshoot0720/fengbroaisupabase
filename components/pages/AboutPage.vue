<template>
  <PageContainer>
    <div class="about-page">

      <!-- Hero / 公司簡介 -->
      <div class="hero-section">
        <div class="hero-logo">🤖</div>
        <h1 class="app-title">鋒兄AI Supabase</h1>
        <p class="version">v2.0</p>
        <p class="description">個人資料管理系統，整合 Supabase 雲端資料庫，由鋒兄獨立開發與維護</p>
      </div>

      <!-- 公司簡介 -->
      <div class="section company-section">
        <h2 class="section-title">🏢 公司簡介</h2>
        <div class="company-card">
          <div class="company-row">
            <span class="company-label">開發者</span>
            <span class="company-value">鋒兄（個人開發）</span>
          </div>
          <div class="company-row">
            <span class="company-label">系統名稱</span>
            <span class="company-value">鋒兄AI Supabase 個人資料管理平台</span>
          </div>
          <div class="company-row">
            <span class="company-label">版本</span>
            <span class="company-value">v2.0（2026年）</span>
          </div>
          <div class="company-row">
            <span class="company-label">定位</span>
            <span class="company-value">整合多模組的個人資料雲端管理系統，支援筆記、媒體、文件、銀行、訂閱等全方位管理</span>
          </div>
          <div class="company-row">
            <span class="company-label">資料庫</span>
            <span class="company-value">Supabase（PostgreSQL）雲端托管</span>
          </div>
          <div class="company-row">
            <span class="company-label">部署平台</span>
            <span class="company-value">Netlify（全球 CDN 加速）</span>
          </div>
        </div>
      </div>

      <!-- 系統架構 / 程式碼行數 -->
      <div class="section stats-section">
        <h2 class="section-title">📊 系統架構</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">32,919</span>
            <span class="stat-label">程式碼行數</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">54</span>
            <span class="stat-label">程式碼檔案</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">11</span>
            <span class="stat-label">功能模組</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">2026/03/03</span>
            <span class="stat-label">最後更新</span>
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
      </div>

      <!-- 功能模組 -->
      <div class="section features-section">
        <h2 class="section-title">🧩 功能模組</h2>
        <div class="features-grid">
          <div class="feature-card">
            <span class="feature-icon">📝</span>
            <h3>鋒兄筆記</h3>
            <p>個人筆記管理，支援分類、搜尋、匯入匯出</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">⭐</span>
            <h3>鋒兄常用</h3>
            <p>常用帳號管理，快速存取重要連結與資訊</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🖼️</span>
            <h3>鋒兄圖片</h3>
            <p>圖片庫管理，支援上傳、預覽、分類</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎥</span>
            <h3>鋒兄影片</h3>
            <p>影片庫管理，支援連結與封面管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎵</span>
            <h3>鋒兄音樂</h3>
            <p>音樂庫管理，支援播放與分類</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📄</span>
            <h3>鋒兄文件</h3>
            <p>文件管理，支援行內編輯、檔案上傳、ZIP 匯入匯出</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎙️</span>
            <h3>鋒兄播客</h3>
            <p>播客管理，支援音訊連結與摘要</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">💰</span>
            <h3>鋒兄銀行</h3>
            <p>銀行帳戶管理，支援多帳戶與餘額追蹤</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📅</span>
            <h3>鋒兄例行</h3>
            <p>例行事務管理，支援週期性任務追蹤</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">💳</span>
            <h3>鋒兄訂閱</h3>
            <p>訂閱服務管理，支援到期提醒與費用統計</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🛒</span>
            <h3>鋒兄食品</h3>
            <p>食品庫存管理，支援效期追蹤與分類</p>
          </div>
        </div>
      </div>

      <!-- 技術文件 -->
      <div class="section tech-doc-section">
        <h2 class="section-title">📋 技術文件</h2>
        <div class="doc-grid">
          <div class="doc-card">
            <div class="doc-icon">🗄️</div>
            <h3>資料庫設計</h3>
            <ul>
              <li>Supabase PostgreSQL 雲端資料庫</li>
              <li>各模組獨立資料表（notes、articles、documents…）</li>
              <li>RLS（Row Level Security）保護資料</li>
              <li>支援 JSONB 彈性欄位擴充</li>
            </ul>
          </div>
          <div class="doc-card">
            <div class="doc-icon">📦</div>
            <h3>Storage 架構</h3>
            <ul>
              <li>Supabase Storage 分 bucket 存放</li>
              <li>documents / document-covers / images…</li>
              <li>支援依副檔名分資料夾上傳</li>
              <li>公開存取 URL 即時生成</li>
            </ul>
          </div>
          <div class="doc-card">
            <div class="doc-icon">🔄</div>
            <h3>匯入匯出</h3>
            <ul>
              <li>支援 ZIP 格式匯入（含附件）</li>
              <li>相容 Appwrite CSV 匯出格式</li>
              <li>自動上傳 files/ covers/ 子資料夾</li>
              <li>進度條即時顯示匯入狀態</li>
            </ul>
          </div>
          <div class="doc-card">
            <div class="doc-icon">⚡</div>
            <h3>前端架構</h3>
            <ul>
              <li>Nuxt 4 + Vue 3 Composition API</li>
              <li>Composables 統一資料邏輯</li>
              <li>行內編輯（Inline Edit）模式</li>
              <li>批量選擇刪除功能</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 使用手冊 -->
      <div class="section manual-section">
        <h2 class="section-title">📖 使用手冊</h2>
        <div class="manual-list">
          <div class="manual-item">
            <div class="manual-step">1</div>
            <div class="manual-content">
              <h3>新增資料</h3>
              <p>點擊頂部 <strong>+</strong> 按鈕，直接在清單頂端展開行內新增卡片，填寫欄位後點 💾 儲存。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">2</div>
            <div class="manual-content">
              <h3>編輯資料</h3>
              <p>點擊卡片右上角 ✏️ 按鈕，卡片原地展開為行內編輯模式，修改後點 💾 儲存或 ✕ 取消。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">3</div>
            <div class="manual-content">
              <h3>上傳檔案</h3>
              <p>在新增/編輯模式中點「選擇檔案」，檔案自動上傳至 Supabase Storage，圖片會即時預覽。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">4</div>
            <div class="manual-content">
              <h3>搜尋與篩選</h3>
              <p>頂部搜尋框輸入關鍵字即時篩選，分類下拉可快速切換分類檢視。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">5</div>
            <div class="manual-content">
              <h3>批量刪除</h3>
              <p>點「批量選擇」進入勾選模式，勾選後點「刪除選中」一次刪除多筆資料。</p>
            </div>
          </div>
          <div class="manual-item">
            <div class="manual-step">6</div>
            <div class="manual-content">
              <h3>匯入 / 匯出</h3>
              <p>點「匯出 ZIP」將所有資料打包下載；點「匯入 ZIP」可從 Appwrite 格式或 Supabase 格式批量還原資料。</p>
            </div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <p class="info-text">所有資料支援 ZIP 匯入/匯出，相容 Appwrite 格式 ✦ 全端由鋒兄獨立開發維護</p>
      </div>

    </div>
  </PageContainer>
</template>

<script setup>
import PageContainer from '../layout/PageContainer.vue'

useHead({
  title: '鋒兄關於 - 鋒兄AI Supabase'
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
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Hero ── */
.hero-section {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 2.5rem;
  box-shadow: 0 10px 30px rgba(102,126,234,0.3);
}
.hero-logo { font-size: 3.5rem; margin-bottom: 0.5rem; }
.app-title { font-size: 2.6rem; font-weight: 700; margin: 0 0 0.4rem; }
.version   { font-size: 1.1rem; opacity: 0.85; margin: 0 0 0.8rem; }
.description { font-size: 1.05rem; opacity: 0.95; max-width: 560px; margin: 0 auto; }

/* ── Section 共用 ── */
.section { margin-bottom: 2.5rem; }
.section-title {
  font-size: 1.6rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* ── 公司簡介 ── */
.company-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.company-row {
  display: flex;
  padding: 0.9rem 1.4rem;
  border-bottom: 1px solid #f0f4f8;
  gap: 1rem;
  align-items: flex-start;
}
.company-row:last-child { border-bottom: none; }
.company-label {
  font-weight: 600;
  color: #667eea;
  min-width: 90px;
  font-size: 0.9rem;
  padding-top: 2px;
}
.company-value { color: #4a5568; font-size: 0.95rem; line-height: 1.5; }

/* ── 系統架構 ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1.2rem;
  margin-bottom: 1.5rem;
}
.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.4rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102,126,234,0.18);
  border-color: #667eea;
}
.stat-value {
  font-size: 1.7rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.stat-label { font-size: 0.85rem; color: #718096; font-weight: 500; }

.tech-stack { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.tech-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1.2rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 3px 10px rgba(102,126,234,0.3);
  transition: transform 0.2s ease;
}
.tech-badge:hover { transform: scale(1.06); }

/* ── 功能模組 ── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
}
.feature-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.6rem;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(102,126,234,0.2);
  border-color: #667eea;
}
.feature-icon { font-size: 2.4rem; display: block; margin-bottom: 0.8rem; }
.feature-card h3 { font-size: 1.1rem; font-weight: 600; margin: 0 0 0.4rem; color: #2d3748; }
.feature-card p  { font-size: 0.85rem; color: #718096; margin: 0; line-height: 1.5; }

/* ── 技術文件 ── */
.doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.2rem;
}
.doc-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: all 0.3s ease;
}
.doc-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(102,126,234,0.15);
  border-color: #667eea;
}
.doc-icon { font-size: 2rem; margin-bottom: 0.6rem; }
.doc-card h3 { font-size: 1rem; font-weight: 600; margin: 0 0 0.6rem; color: #2d3748; }
.doc-card ul  { margin: 0; padding-left: 1.2rem; }
.doc-card li  { font-size: 0.85rem; color: #718096; margin-bottom: 0.3rem; line-height: 1.5; }

/* ── 使用手冊 ── */
.manual-list { display: flex; flex-direction: column; gap: 1rem; }
.manual-item {
  display: flex;
  gap: 1.2rem;
  align-items: flex-start;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  transition: all 0.3s ease;
}
.manual-item:hover {
  border-color: #667eea;
  box-shadow: 0 6px 16px rgba(102,126,234,0.15);
}
.manual-step {
  min-width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}
.manual-content h3 { font-size: 1rem; font-weight: 600; margin: 0 0 0.3rem; color: #2d3748; }
.manual-content p  { font-size: 0.9rem; color: #718096; margin: 0; line-height: 1.6; }
.manual-content strong { color: #667eea; }

/* ── Info ── */
.info-section {
  text-align: center;
  padding: 1.5rem 2rem;
  background: #f7fafc;
  border-radius: 12px;
  border: 2px dashed #cbd5e0;
}
.info-text { font-size: 1rem; color: #4a5568; margin: 0; font-weight: 500; }

/* ── RWD ── */
@media (max-width: 768px) {
  .about-page   { padding: 1rem; }
  .hero-section { padding: 2rem 1rem; }
  .app-title    { font-size: 1.8rem; }
  .section-title { font-size: 1.3rem; }
  .features-grid { grid-template-columns: 1fr 1fr; }
  .doc-grid      { grid-template-columns: 1fr; }
  .company-row   { flex-direction: column; gap: 0.2rem; }
  .company-label { min-width: auto; }
}
@media (max-width: 480px) {
  .features-grid { grid-template-columns: 1fr; }
}
</style>
