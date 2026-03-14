<template>
  <div class="responsive-layout">
    <!-- 側邊選單 -->
    <nav class="sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
      <div class="sidebar-header">
        <h2>選單</h2>
        <button 
          class="sidebar-toggle mobile-only" 
          @click="toggleSidebar"
          aria-label="關閉選單"
        >
          ✕
        </button>
      </div>
      <ul class="nav-list">
        <li><a href="#" @click="setActiveContent('home')">首頁</a></li>
        <li><a href="#" @click="setActiveContent('about')">關於我們</a></li>
        <li><a href="#" @click="setActiveContent('services')">服務項目</a></li>
        <li><a href="#" @click="setActiveContent('portfolio')">作品集</a></li>
        <li><a href="#" @click="setActiveContent('contact')">聯絡我們</a></li>
      </ul>
    </nav>

    <!-- 主要內容區域 -->
    <main class="main-content">
      <!-- 手機版選單按鈕 -->
      <button 
        class="menu-toggle mobile-only" 
        @click="toggleSidebar"
        aria-label="開啟選單"
      >
        ☰
      </button>
      
      <!-- 內容展示區域 -->
      <div class="content-area">
        <ContentDisplay :activeContent="activeContent" />
      </div>
    </main>

    <!-- 遮罩層 (手機版) -->
    <div 
      v-if="isSidebarOpen" 
      class="overlay mobile-only" 
      @click="closeSidebar"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isSidebarOpen = ref(false)
const activeContent = ref('home')

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  isSidebarOpen.value = false
}

const setActiveContent = (content) => {
  activeContent.value = content
  // 手機版選擇項目後自動關閉選單
  if (window.innerWidth <= 768) {
    closeSidebar()
  }
}

// 監聽視窗大小變化
const handleResize = () => {
  if (window.innerWidth > 768) {
    isSidebarOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.responsive-layout {
  display: flex;
  height: 100vh;
  position: relative;
}

/* 側邊選單樣式 */
.sidebar {
  background: #2c3e50;
  color: white;
  transition: transform 0.3s ease;
  z-index: 1000;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #34495e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.sidebar-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-list li {
  border-bottom: 1px solid #34495e;
}

.nav-list a {
  display: block;
  padding: 1rem;
  color: white;
  text-decoration: none;
  transition: background-color 0.2s;
}

.nav-list a:hover {
  background-color: #34495e;
}

/* 主要內容區域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-toggle {
  display: none;
  background: #3498db;
  color: white;
  border: none;
  padding: 1rem;
  font-size: 1.2rem;
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 999;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.mobile-only {
  display: none;
}

/* 電腦版和平板橫向 (寬度 > 768px) */
@media (min-width: 769px) {
  .sidebar {
    width: 250px;
    position: static;
  }
  
  .responsive-layout {
    flex-direction: row;
  }
}

/* 手機版和平板直向 (寬度 <= 768px) */
@media (max-width: 768px) {
  .responsive-layout {
    flex-direction: column;
  }
  
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    transform: translateX(-100%);
  }
  
  .sidebar-open {
    transform: translateX(0);
  }
  
  .menu-toggle,
  .sidebar-toggle,
  .overlay {
    display: block;
  }
  
  .mobile-only {
    display: block;
  }
  
  .content-area {
    padding: 1rem;
  }
}

/* 平板橫向 (768px - 1024px 且橫向) */
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .sidebar {
    width: 200px;
  }
}

/* 平板直向 (768px - 1024px 且直向) */
@media (min-width: 769px) and (max-width: 1024px) and (orientation: portrait) {
  .responsive-layout {
    flex-direction: column;
  }
  
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    transform: translateX(-100%);
  }
  
  .sidebar-open {
    transform: translateX(0);
  }
  
  .menu-toggle,
  .sidebar-toggle,
  .overlay {
    display: block;
  }
  
  .mobile-only {
    display: block;
  }
}
</style>