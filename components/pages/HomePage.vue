<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
      <div class="hero-content">
        <div class="hero-actions">
          <button class="hero-btn primary" @click="$emit('navigate', 'dashboard')">
            <span class="btn-icon">📊</span>
            進入儀表板
          </button>
          <button class="hero-btn secondary" @click="scrollToTech">
            <span class="btn-icon">🔧</span>
            技術架構
          </button>
        </div>
      </div>
    </section>

    <!-- Tech Stack Section -->
    <section class="tech-section" ref="techSection">
      <div class="section-header">
        <h2 class="section-title">技術架構</h2>
        <p class="section-desc">採用現代化全端技術打造，兼顧效能與開發體驗</p>
      </div>
      <div class="tech-grid">
        <div class="tech-card" v-for="(tech, index) in techStack" :key="tech.name" :style="{ animationDelay: `${index * 0.1}s` }">
          <div class="tech-icon-wrapper" :style="{ background: tech.gradient }">
            <span class="tech-icon">{{ tech.icon }}</span>
          </div>
          <div class="tech-info">
            <div class="tech-label">{{ tech.label }}</div>
            <h3 class="tech-name">{{ tech.name }}</h3>
            <p class="tech-desc">{{ tech.description }}</p>
          </div>
          <div class="tech-tag" :style="{ color: tech.tagColor, background: tech.tagBg }">
            {{ tech.tag }}
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="section-header">
        <h2 class="section-title">功能模組</h2>
        <p class="section-desc">涵蓋日常管理所需的各項功能</p>
      </div>
      <div class="features-grid">
        <div
          class="feature-card"
          v-for="(feature, index) in features"
          :key="feature.name"
          :style="{ animationDelay: `${index * 0.08}s` }"
          @click="$emit('navigate', feature.page)"
        >
          <span class="feature-icon">{{ feature.icon }}</span>
          <h3 class="feature-name">{{ feature.name }}</h3>
          <p class="feature-desc">{{ feature.description }}</p>
          <div class="feature-arrow">→</div>
        </div>
      </div>
    </section>

    <!-- Architecture Diagram -->
    <section class="arch-section">
      <div class="section-header">
        <h2 class="section-title">系統架構圖</h2>
        <p class="section-desc">前後端分離，雲端部署的現代化架構</p>
      </div>
      <div class="arch-diagram">
        <div class="arch-layer">
          <div class="arch-layer-label">使用者端</div>
          <div class="arch-nodes">
            <div class="arch-node browser">
              <span class="arch-icon">🌐</span>
              <span>瀏覽器</span>
            </div>
          </div>
        </div>
        <div class="arch-arrow-down">
          <div class="arrow-line"></div>
          <div class="arrow-label">HTTPS</div>
        </div>
        <div class="arch-layer">
          <div class="arch-layer-label">部署平台</div>
          <div class="arch-nodes">
            <div class="arch-node netlify">
              <span class="arch-icon">🚀</span>
              <span>Netlify CDN</span>
            </div>
            <div class="arch-node ssr">
              <span class="arch-icon">⚡</span>
              <span>Netlify Functions (SSR)</span>
            </div>
          </div>
        </div>
        <div class="arch-arrow-down">
          <div class="arrow-line"></div>
          <div class="arrow-label">API</div>
        </div>
        <div class="arch-layer">
          <div class="arch-layer-label">後端服務</div>
          <div class="arch-nodes">
            <div class="arch-node supabase">
              <span class="arch-icon">🗄️</span>
              <span>Supabase (PostgreSQL)</span>
            </div>
            <div class="arch-node storage">
              <span class="arch-icon">📦</span>
              <span>Supabase Storage</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="home-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="footer-logo">🏢</span>
          <span class="footer-title">鋒兄管理系統</span>
          <span class="footer-subtitle">鋒兄AI</span>
        </div>
        <p class="footer-text">Built with Nuxt + Vue + Supabase</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineEmits(['navigate'])

const techSection = ref(null)

const scrollToTech = () => {
  techSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const techStack = [
  {
    icon: '🚀',
    label: '網頁部署',
    name: 'Netlify',
    description: '全球 CDN 加速，自動化 CI/CD 部署流程，提供即時預覽與自訂網域',
    tag: 'Hosting',
    tagColor: '#00c7b7',
    tagBg: 'rgba(0, 199, 183, 0.1)',
    gradient: 'linear-gradient(135deg, #00c7b7 0%, #00a99d 100%)'
  },
  {
    icon: '💚',
    label: '前端框架',
    name: 'Nuxt (基於 Vue)',
    description: '支援 SSR/SSG 的 Vue 全端框架，具備自動路由、元件自動匯入與模組化架構',
    tag: 'Frontend',
    tagColor: '#00dc82',
    tagBg: 'rgba(0, 220, 130, 0.1)',
    gradient: 'linear-gradient(135deg, #00dc82 0%, #36e4a0 100%)'
  },
  {
    icon: '⚡',
    label: '後端服務',
    name: 'Supabase (BaaS)',
    description: '開源 Firebase 替代方案，內建 PostgreSQL 資料庫、即時訂閱與 Row Level Security',
    tag: 'Backend',
    tagColor: '#3ecf8e',
    tagBg: 'rgba(62, 207, 142, 0.1)',
    gradient: 'linear-gradient(135deg, #3ecf8e 0%, #1a9f60 100%)'
  },
  {
    icon: '📦',
    label: '多媒體儲存',
    name: 'Supabase Storage',
    description: '大型檔案物件儲存服務，支援圖片、影片、音樂等多媒體檔案的上傳與管理',
    tag: 'Storage',
    tagColor: '#6c63ff',
    tagBg: 'rgba(108, 99, 255, 0.1)',
    gradient: 'linear-gradient(135deg, #6c63ff 0%, #4834d4 100%)'
  }
]

const features = [
  { icon: '📊', name: '儀表板', description: '總覽所有數據統計', page: 'dashboard' },
  { icon: '💳', name: '訂閱管理', description: '追蹤訂閱費用與到期日', page: 'subscription' },
  { icon: '🍔', name: '食物管理', description: '記錄飲食資訊', page: 'food' },
  { icon: '🎬', name: '影片庫', description: '管理影片收藏', page: 'video' },
  { icon: '🖼️', name: '圖片庫', description: '瀏覽與管理圖片', page: 'gallery' },
  { icon: '🎵', name: '音樂庫', description: '音樂播放與管理', page: 'music' },
  { icon: '🏦', name: '銀行統計', description: '財務數據管理', page: 'bank' },
  { icon: '📝', name: '鋒兄筆記', description: '記錄筆記與想法', page: 'note' }
]
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* ===== Hero Section ===== */
.hero {
  position: relative;
  padding: 4rem 2rem;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
  margin-bottom: 3rem;
}

.hero-bg-shapes {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  background: white;
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: -80px;
  right: -60px;
  animation: float 8s ease-in-out infinite;
}

.shape-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -30px;
  animation: float 6s ease-in-out infinite reverse;
}

.shape-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 60%;
  animation: float 10s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-badge {
  display: inline-block;
  padding: 0.35rem 1.2rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  backdrop-filter: blur(10px);
  margin-bottom: 1.5rem;
  animation: fadeIn 0.6s ease;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 1.2rem;
  animation: fadeIn 0.8s ease;
}

.title-line {
  display: block;
}

.title-line.accent {
  background: linear-gradient(90deg, #ffd700, #ffa500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--font-lg);
  opacity: 0.9;
  max-width: 500px;
  margin: 0 auto 2rem;
  line-height: 1.7;
  animation: fadeIn 1s ease;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  animation: fadeIn 1.2s ease;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.8rem;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-bounce);
}

.hero-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.hero-btn.primary {
  background: white;
  color: #764ba2;
}

.hero-btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-icon {
  font-size: 1.2rem;
}

/* ===== Section Common ===== */
.section-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: var(--font-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.section-desc {
  color: var(--text-secondary);
  font-size: var(--font-md);
}

/* ===== Tech Stack Section ===== */
.tech-section {
  margin-bottom: 3rem;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.tech-card {
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  transition: all var(--transition-bounce);
  animation: fadeIn 0.6s ease both;
  position: relative;
  overflow: hidden;
}

.tech-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 35px var(--shadow);
  border-color: var(--primary);
}

.tech-icon-wrapper {
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.tech-info {
  flex: 1;
  min-width: 0;
}

.tech-label {
  font-size: var(--font-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.tech-name {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.4rem;
}

.tech-desc {
  font-size: var(--font-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}

.tech-tag {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: var(--font-xs);
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
}

/* ===== Features Section ===== */
.features-section {
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.2rem;
}

.feature-card {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-bounce);
  animation: fadeIn 0.5s ease both;
  position: relative;
}

.feature-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 35px var(--shadow);
  border-color: var(--primary);
}

.feature-card:hover .feature-arrow {
  opacity: 1;
  transform: translateX(4px);
}

.feature-icon {
  display: block;
  font-size: 2.2rem;
  margin-bottom: 0.8rem;
}

.feature-name {
  font-size: var(--font-md);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.3rem;
}

.feature-desc {
  font-size: var(--font-sm);
  color: var(--text-muted);
}

.feature-arrow {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  font-size: var(--font-lg);
  color: var(--primary);
  opacity: 0;
  transition: all var(--transition-bounce);
}

/* ===== Architecture Diagram ===== */
.arch-section {
  margin-bottom: 3rem;
}

.arch-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 2rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
}

.arch-layer {
  width: 100%;
  text-align: center;
}

.arch-layer-label {
  font-size: var(--font-xs);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 0.8rem;
}

.arch-nodes {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.arch-node {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-size: var(--font-sm);
  font-weight: 600;
  border: 2px solid;
  transition: all var(--transition-bounce);
}

.arch-node:hover {
  transform: scale(1.05);
}

.arch-node.browser {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #3b82f6;
}

.arch-node.netlify {
  background: rgba(0, 199, 183, 0.1);
  border-color: #00c7b7;
  color: #00c7b7;
}

.arch-node.ssr {
  background: rgba(0, 220, 130, 0.1);
  border-color: #00dc82;
  color: #00dc82;
}

.arch-node.supabase {
  background: rgba(62, 207, 142, 0.1);
  border-color: #3ecf8e;
  color: #3ecf8e;
}

.arch-node.storage {
  background: rgba(108, 99, 255, 0.1);
  border-color: #6c63ff;
  color: #6c63ff;
}

.arch-icon {
  font-size: 1.2rem;
}

.arch-arrow-down {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0;
}

.arrow-line {
  width: 2px;
  height: 30px;
  background: linear-gradient(180deg, var(--primary), var(--primary-hover));
  position: relative;
}

.arrow-line::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid var(--primary-hover);
}

.arrow-label {
  font-size: var(--font-xs);
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 0.3rem;
}

/* ===== Footer ===== */
.home-footer {
  padding: 2rem;
  text-align: center;
  border-top: 1px solid var(--border-color);
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.footer-logo {
  font-size: 1.5rem;
}

.footer-text {
  color: var(--text-muted);
  font-size: var(--font-sm);
}

/* ===== Dark Mode ===== */
:global(.dark) .hero {
  background: linear-gradient(135deg, #4c51bf 0%, #553c9a 100%);
}

:global(.dark) .title-line.accent {
  background: linear-gradient(90deg, #ffd700, #ffa500);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

:global(.dark) .tech-card,
:global(.dark) .feature-card,
:global(.dark) .arch-diagram {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

:global(.dark) .arch-node.browser {
  background: rgba(96, 165, 250, 0.15);
  border-color: #60a5fa;
  color: #60a5fa;
}

:global(.dark) .arch-node.netlify {
  background: rgba(0, 199, 183, 0.15);
  color: #2dd4bf;
  border-color: #2dd4bf;
}

:global(.dark) .arch-node.ssr {
  background: rgba(0, 220, 130, 0.15);
  color: #34d399;
  border-color: #34d399;
}

:global(.dark) .arch-node.supabase {
  background: rgba(62, 207, 142, 0.15);
  color: #4ade80;
  border-color: #4ade80;
}

:global(.dark) .arch-node.storage {
  background: rgba(108, 99, 255, 0.15);
  color: #818cf8;
  border-color: #818cf8;
}

/* ===== Responsive ===== */
@media (max-width: 1024px) {
  .tech-grid {
    grid-template-columns: 1fr;
  }
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 3rem 1.5rem;
  }
  .hero-title {
    font-size: 2.2rem;
  }
  .hero-subtitle {
    font-size: var(--font-md);
  }
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .arch-nodes {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 2.5rem 1rem;
    border-radius: var(--radius-lg);
  }
  .hero-title {
    font-size: 1.8rem;
  }
  .hero-actions {
    flex-direction: column;
  }
  .hero-btn {
    width: 100%;
    justify-content: center;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
