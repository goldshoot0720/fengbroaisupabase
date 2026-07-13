<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">兄塗哥公關資訊Professional Business Solutions</h1>
        <p class="hero-subtitle">專業管理系統解決方案 · 前端使用Vue(Nuxt) | 後端使用 Supabase | 影片存放於 Netlify | 網頁存放於 Netlify Blobs</p>
        <div class="hero-buttons">
          <NuxtLink to="/about" class="btn btn-primary">了解更多</NuxtLink>
          <button class="btn btn-secondary">聯繫我們</button>
        </div>
      </div>
    </section>

    <!-- Services Preview -->
    <section class="services-preview">
      <div class="container">
        <h2>我們的服務</h2>
        <div class="services-grid">
          <div class="service-card">
            <div class="service-icon">📢</div>
            <h3>媒體關係</h3>
            <p>建立並維護與各大媒體的良好關係</p>
          </div>
          <div class="service-card">
            <div class="service-icon">💡</div>
            <h3>品牌策略</h3>
            <p>量身定制品牌傳播策略</p>
          </div>
          <div class="service-card">
            <div class="service-icon">🛡️</div>
            <h3>危機處理</h3>
            <p>專業的危機公關處理</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 版權信息 -->
    <footer class="footer-section">
      <div class="container">
        <div class="footer-content">
          <p class="copyright">
            鋒兄塗哥公關資訊Professional Business Solutions©版權所有 2025～2125 | 專業管理系統解決方案 前端使用Vue(Nuxt) | 後端使用 Supabase | 影片存放於 Netlify | 網頁存放於 Netlify Blobs
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
// 页面配置
useHead({
  title: '鋒兄塗哥公關資訊Professional Business Solutions - 專業管理系統解決方案',
  meta: [
    { name: 'description', content: '鋒兄塗哥公關資訊Professional Business Solutions©版權所有 2025～2125 | 專業管理系統解決方案 前端使用Vue(Nuxt) | 後端使用 Supabase | 影片存放於 Netlify | 網頁存放於 Netlify Blobs' }
  ]
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

/* Hero Section */
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 150px 0 100px;
  text-align: center;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.3rem;
  margin-bottom: 40px;
  opacity: 0.9;
}

.hero-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 15px 30px;
  border-radius: 50px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: white;
  color: #667eea;
}

/* Services Preview */
.services-preview {
  padding: 100px 0;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.services-preview h2 {
  text-align: center;
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 60px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.service-card {
  background: white;
  padding: 40px 30px;
  border-radius: 15px;
  text-align: center;
  box-shadow: 0 5px 20px rgba(0,0,0,0.08);
  transition: transform 0.3s ease;
}

.service-card:hover {
  transform: translateY(-10px);
}

.service-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.service-card h3 {
  font-size: 1.4rem;
  color: #333;
  margin-bottom: 15px;
}

.service-card p {
  line-height: 1.6;
  color: #666;
}

/* Footer Section */
.footer-section {
  background: #2c3e50;
  color: white;
  padding: 40px 0;
  text-align: center;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.copyright {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #ecf0f1;
}

.tech-info {
  font-size: 0.95rem;
  color: #bdc3c7;
  line-height: 1.6;
  opacity: 0.9;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .nav-menu {
    gap: 20px;
  }
  
  .footer-section {
    padding: 30px 0;
  }
  
  .copyright {
    font-size: 1rem;
  }
  
  .tech-info {
    font-size: 0.9rem;
  }
}
</style>