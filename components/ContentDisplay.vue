<template>
  <div class="content-display">
    <div v-if="activeContent === 'home'" class="content-section">
      <h1>歡迎來到首頁</h1>
      <p>這是一個響應式UI設計示例，展示了不同裝置上的佈局適應。</p>
      <div class="feature-grid">
        <div class="feature-card">
          <h3>響應式設計</h3>
          <p>自動適應不同螢幕尺寸</p>
        </div>
        <div class="feature-card">
          <h3>現代化介面</h3>
          <p>簡潔美觀的使用者體驗</p>
        </div>
        <div class="feature-card">
          <h3>跨平台支援</h3>
          <p>支援桌面、平板、手機</p>
        </div>
      </div>
    </div>

    <div v-else-if="activeContent === 'about'" class="content-section">
      <h1>關於我們</h1>
      <p>我們是一個專注於響應式網頁設計的團隊。</p>
      <div class="about-content">
        <div class="about-text">
          <h3>我們的使命</h3>
          <p>創造優秀的使用者體驗，讓每個裝置都能完美展示內容。</p>
          
          <h3>設計理念</h3>
          <ul>
            <li>使用者優先的設計思維</li>
            <li>跨裝置一致性體驗</li>
            <li>簡潔而功能完整</li>
            <li>效能與美觀並重</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else-if="activeContent === 'services'" class="content-section">
      <h1>服務項目</h1>
      <div class="services-grid">
        <div class="service-item">
          <h3>響應式網頁設計</h3>
          <p>為不同裝置量身打造的網頁體驗</p>
        </div>
        <div class="service-item">
          <h3>使用者介面設計</h3>
          <p>直觀易用的介面設計服務</p>
        </div>
        <div class="service-item">
          <h3>前端開發</h3>
          <p>現代化的前端技術實作</p>
        </div>
        <div class="service-item">
          <h3>效能優化</h3>
          <p>提升網站載入速度與使用體驗</p>
        </div>
      </div>
    </div>

    <div v-else-if="activeContent === 'portfolio'" class="content-section">
      <h1>作品集</h1>
      <div class="portfolio-grid">
        <div class="portfolio-item">
          <div class="portfolio-image">
            <div class="placeholder-image">專案 1</div>
          </div>
          <h3>電商網站</h3>
          <p>響應式購物平台設計</p>
        </div>
        <div class="portfolio-item">
          <div class="portfolio-image">
            <div class="placeholder-image">專案 2</div>
          </div>
          <h3>企業官網</h3>
          <p>現代化企業形象網站</p>
        </div>
        <div class="portfolio-item">
          <div class="portfolio-image">
            <div class="placeholder-image">專案 3</div>
          </div>
          <h3>行動應用</h3>
          <p>跨平台行動應用介面</p>
        </div>
      </div>
    </div>

    <div v-else-if="activeContent === 'contact'" class="content-section">
      <h1>聯絡我們</h1>
      <div class="contact-content">
        <div class="contact-info">
          <h3>聯絡資訊</h3>
          <p><strong>電話：</strong> +886-2-1234-5678</p>
          <p><strong>信箱：</strong> contact@example.com</p>
          <p><strong>地址：</strong> 台北市信義區信義路五段7號</p>
        </div>
        <div class="contact-form">
          <h3>聯絡表單</h3>
          <form @submit.prevent="submitForm">
            <div class="form-group">
              <label for="name">姓名</label>
              <input type="text" id="name" v-model="form.name" required>
            </div>
            <div class="form-group">
              <label for="email">電子信箱</label>
              <input type="email" id="email" v-model="form.email" required>
            </div>
            <div class="form-group">
              <label for="message">訊息</label>
              <textarea id="message" v-model="form.message" rows="4" required></textarea>
            </div>
            <button type="submit" class="submit-btn">送出訊息</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  activeContent: {
    type: String,
    default: 'home'
  }
})

const form = ref({
  name: '',
  email: '',
  message: ''
})

const submitForm = () => {
  alert('表單已送出！（這是示例功能）')
  // 重置表單
  form.value = {
    name: '',
    email: '',
    message: ''
  }
}
</script>

<style scoped>
.content-display {
  max-width: 1200px;
  margin: 0 auto;
}

.content-section {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

h1 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 2.5rem;
}

h3 {
  color: #34495e;
  margin-bottom: 0.5rem;
}

p {
  line-height: 1.6;
  color: #555;
  margin-bottom: 1rem;
}

/* 功能網格 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.feature-card {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

/* 服務項目網格 */
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.service-item {
  background: white;
  padding: 2rem;
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.service-item:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

/* 作品集網格 */
.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.portfolio-item {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 15px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.portfolio-item:hover {
  transform: translateY(-5px);
}

.portfolio-image {
  height: 200px;
  background: #ecf0f1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-image {
  color: #7f8c8d;
  font-size: 1.2rem;
  font-weight: bold;
}

.portfolio-item h3,
.portfolio-item p {
  padding: 0 1.5rem;
}

.portfolio-item p {
  padding-bottom: 1.5rem;
}

/* 關於我們內容 */
.about-content {
  margin-top: 2rem;
}

.about-text ul {
  margin-left: 2rem;
  margin-bottom: 1rem;
}

.about-text li {
  margin-bottom: 0.5rem;
  color: #555;
}

/* 聯絡內容 */
.contact-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  margin-top: 2rem;
}

.contact-info p {
  margin-bottom: 0.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.submit-btn {
  background: #3498db;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover {
  background: #2980b9;
}

/* 響應式調整 */
@media (max-width: 768px) {
  h1 {
    font-size: 2rem;
  }
  
  .feature-grid,
  .services-grid,
  .portfolio-grid {
    grid-template-columns: 1fr;
  }
  
  .contact-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .feature-card,
  .service-item {
    padding: 1.5rem;
  }
}

@media (max-width: 480px) {
  h1 {
    font-size: 1.75rem;
  }
  
  .feature-card,
  .service-item {
    padding: 1rem;
  }
}
</style>