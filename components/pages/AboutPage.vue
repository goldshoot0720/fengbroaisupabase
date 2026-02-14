<template>
  <PageContainer>
    <div class="about-page">
      <div class="hero-section">
        <h1 class="app-title">鋒兄AI Supabase</h1>
        <p class="version">v2.0</p>
        <p class="description">個人資料管理系統，整合 Supabase 雲端資料庫</p>
      </div>

      <div class="features-section">
        <h2 class="section-title">功能模組</h2>
        <div class="features-grid">
          <div class="feature-card">
            <span class="feature-icon">📝</span>
            <h3>鋒兄筆記</h3>
            <p>個人筆記管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">⭐</span>
            <h3>鋒兄常用</h3>
            <p>常用帳號管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🖼️</span>
            <h3>鋒兄圖片</h3>
            <p>圖片庫管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎥</span>
            <h3>鋒兄影片</h3>
            <p>影片庫管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎵</span>
            <h3>鋒兄音樂</h3>
            <p>音樂庫管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📄</span>
            <h3>鋒兄文件</h3>
            <p>文件管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🎙️</span>
            <h3>鋒兄播客</h3>
            <p>播客管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">💰</span>
            <h3>鋒兄銀行</h3>
            <p>銀行帳戶管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📅</span>
            <h3>鋒兄例行</h3>
            <p>例行事務管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">💳</span>
            <h3>鋒兄訂閱</h3>
            <p>訂閱服務管理</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🛒</span>
            <h3>鋒兄食品</h3>
            <p>食品庫存管理</p>
          </div>
        </div>
      </div>

      <div class="tech-section">
        <h2 class="section-title">技術架構</h2>
        <div class="tech-stack">
          <span class="tech-badge">Nuxt 3</span>
          <span class="tech-badge">Vue 3</span>
          <span class="tech-badge">Supabase</span>
          <span class="tech-badge">Netlify</span>
        </div>
      </div>

      <div class="info-section">
        <p class="info-text">所有資料支援 CSV 匯入/匯出，相容 Appwrite 格式</p>
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-section {
  text-align: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  margin-bottom: 3rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.app-title {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
  margin-bottom: 0.5rem;
}

.version {
  font-size: 1.25rem;
  opacity: 0.9;
  margin: 0;
  margin-bottom: 1rem;
}

.description {
  font-size: 1.125rem;
  opacity: 0.95;
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.features-section {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 2rem;
  color: #2d3748;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.feature-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  margin-bottom: 0.5rem;
  color: #2d3748;
}

.feature-card p {
  font-size: 0.95rem;
  color: #718096;
  margin: 0;
}

.tech-section {
  margin-bottom: 3rem;
}

.tech-stack {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.tech-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: transform 0.2s ease;
}

.tech-badge:hover {
  transform: scale(1.05);
}

.info-section {
  text-align: center;
  padding: 2rem;
  background: #f7fafc;
  border-radius: 12px;
  border: 2px dashed #cbd5e0;
}

.info-text {
  font-size: 1.125rem;
  color: #4a5568;
  margin: 0;
  font-weight: 500;
}

@media (max-width: 768px) {
  .about-page {
    padding: 1rem;
  }

  .hero-section {
    padding: 2rem 1rem;
    margin-bottom: 2rem;
  }

  .app-title {
    font-size: 2rem;
  }

  .version {
    font-size: 1rem;
  }

  .description {
    font-size: 1rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .feature-card {
    padding: 1.5rem;
  }

  .tech-stack {
    gap: 0.75rem;
  }

  .tech-badge {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .info-text {
    font-size: 1rem;
  }
}
</style>
