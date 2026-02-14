<template>
  <div id="app">
    <!-- 整體應用容器 -->
    <div class="app-container">
      <!-- 側邊欄 -->
      <AppSidebar
        :is-open="sidebarOpen"
        :current-page="currentPage"
        :pages="pages"
        @toggle="toggleSidebar"
        @navigate="setCurrentPage"
      />

      <!-- 主要內容區 -->
      <div class="main-content" :class="{ 'sidebar-open': sidebarOpen }">
        <!-- 頂部標題 -->
        <AppHeader
          :title="pageTitle"
          :subtitle="pageSubtitle"
          :is-dark-mode="isDarkMode"
          @toggle-sidebar="toggleSidebar"
          @toggle-dark-mode="toggleDarkMode"
        />

        <!-- 頁面內容 -->
        <main class="page-content">
          <!-- 儀表板 -->
          <DashboardPage 
            v-if="currentPage === 'dashboard'"
            :subscriptions-count="subscriptionsCount"
            :foods-count="foodsCount"
            :total-monthly-cost="totalMonthlyCost"
            @navigate="setCurrentPage"
          />

          <!-- 訂閱管理 -->
          <SubscriptionPage 
            v-if="currentPage === 'subscription'"
            ref="subscriptionPageRef"
          />

          <!-- 食物管理 -->
          <FoodPage 
            v-if="currentPage === 'food'"
            ref="foodPageRef"
          />

          <!-- 圖片庫 -->
          <GalleryPage
            v-if="currentPage === 'gallery'"
          />

          <!-- 影片管理 -->
          <VideoDBPage
            v-if="currentPage === 'video'"
          />

          <!-- 音樂管理 -->
          <MusicDBPage
            v-if="currentPage === 'music'"
          />

          <!-- 文件管理 -->
          <DocumentPage
            v-if="currentPage === 'document'"
          />

          <!-- 播客管理 -->
          <PodcastPage
            v-if="currentPage === 'podcast'"
          />

          <!-- 例行事務 -->
          <RoutinePage
            v-if="currentPage === 'routine'"
          />

          <!-- 關於 -->
          <AboutPage
            v-if="currentPage === 'about'"
          />

          <!-- 銀行統計 -->
          <BankPage 
            v-if="currentPage === 'bank'"
            ref="bankPageRef"
          />

          <!-- 鋒兄筆記 -->
          <NotePage 
            v-if="currentPage === 'note'"
          />

          <CommonPage
            v-if="currentPage === 'common'"
          />

          <!-- 鋒兄設定 -->
          <SettingsPage
            v-if="currentPage === 'settings'"
          />

          <!-- 鋒兄首頁 -->
          <HomePage
            v-if="currentPage === 'home'"
            @navigate="setCurrentPage"
          />

          <PageContainer
            v-if="placeholderConfig"
            :title="placeholderConfig.title"
            :icon="placeholderConfig.icon"
          >
            <EmptyState
              :icon="placeholderConfig.icon"
              title="功能建置中"
              :description="placeholderConfig.description"
            />
          </PageContainer>
        </main>
      </div>
    </div>

    <!-- 手機版遮罩層 -->
    <div 
      v-if="sidebarOpen" 
      class="mobile-overlay"
      @click="closeSidebar"
    ></div>

    <!-- 滾動按鈕 -->
    <div class="scroll-buttons">
      <button
        v-show="showScrollButtons && showTopButton"
        @click="scrollToTop"
        class="scroll-btn scroll-top"
        title="回到頂部"
      >
        ⬆️
      </button>
      
      <button
        v-show="showScrollButtons && showBottomButton"
        @click="scrollToBottom"
        class="scroll-btn scroll-bottom"
        title="跳到底部"
      >
        ⬇️
      </button>
    </div>

    <!-- Toast 通知容器 -->
    <ToastContainer />

    <!-- 開發模式下的滾動狀態指示器 -->
    <div 
      v-if="isDevelopment" 
      class="scroll-debug-info"
    >
      <div>滾動檢測: {{ showScrollButtons ? '✅' : '❌' }}</div>
      <div>頂部按鈕: {{ showTopButton ? '✅' : '❌' }}</div>
      <div>底部按鈕: {{ showBottomButton ? '✅' : '❌' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import DashboardPage from '../components/pages/DashboardPage.vue'
import SubscriptionPage from '../components/pages/SubscriptionPage.vue'
import FoodPage from '../components/pages/FoodPage.vue'
import GalleryPage from '../components/pages/GalleryPage.vue'
import VideoDBPage from '../components/pages/VideoDBPage.vue'
import MusicDBPage from '../components/pages/MusicDBPage.vue'
import DocumentPage from '../components/pages/DocumentPage.vue'
import PodcastPage from '../components/pages/PodcastPage.vue'
import RoutinePage from '../components/pages/RoutinePage.vue'
import AboutPage from '../components/pages/AboutPage.vue'
import NotePage from '../components/pages/NotePage.vue'
import CommonPage from '../components/pages/CommonPage.vue'
import BankPage from '../components/pages/BankPage.vue'
import SettingsPage from '../components/pages/SettingsPage.vue'
import HomePage from '../components/pages/HomePage.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import ToastContainer from '../components/ui/ToastContainer.vue'

// 使用 composables
import { useSubscriptions } from '../composables/useSubscriptions'
import { useFoods } from '../composables/useFoods'
import { useTheme } from '../composables/useTheme'
import { useNavigation } from '../composables/useNavigation'
import { useScroll } from '../composables/useScroll'

// 組件引用
const subscriptionPageRef = ref(null)
const foodPageRef = ref(null)
const bankPageRef = ref(null)

// 使用 composables
const { subscriptions, totalMonthlyCost, loadSubscriptions } = useSubscriptions()
const { foods, loadFoods } = useFoods()
const { isDarkMode, toggleDarkMode, initTheme } = useTheme()
const { 
  currentPage,
  sidebarOpen,
  pages,
  pageTitle,
  pageSubtitle,
  setCurrentPage, 
  toggleSidebar, 
  closeSidebar, 
  handleResize 
} = useNavigation()
const { 
  showScrollButtons, 
  showTopButton, 
  showBottomButton, 
  scrollToTop, 
  scrollToBottom, 
  setupScrollListener, 
  removeScrollListener 
} = useScroll()

// 計算屬性
const subscriptionsCount = computed(() => subscriptions.value.length)
const foodsCount = computed(() => foods.value.length)
const isDevelopment = computed(() => false) // 設為 true 以啟用滾動調試
const placeholderPages = {}
const placeholderConfig = computed(() => placeholderPages[currentPage.value] || null)

// 生命週期
onMounted(async () => {
  // 載入初始資料
  loadSubscriptions()
  loadFoods()
  
  // 初始化主題
  initTheme()
  
  if (import.meta.client) {
    // 監聽視窗大小變化
    window.addEventListener('resize', handleResize)
    
    // 設置滾動監聽
    await nextTick()
    setupScrollListener()
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', handleResize)
    removeScrollListener()
  }
})
</script>

<style scoped>
/* 應用程式主要樣式 */

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: var(--bg-primary);
  min-height: 100vh;
  color: var(--text-primary);
  transition: background-color var(--transition-normal), color var(--transition-normal);
}

.app-container {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  transition: margin-left var(--transition-normal);
}

.page-content {
  flex: 1;
  width: 100%;
  padding: 2.5rem;
  overflow-y: auto;
  background: var(--bg-primary);
  transition: all var(--transition-bounce);
  min-height: calc(100vh - 80px);
  max-height: calc(100vh - 80px);
}

/* 手機版遮罩層 */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

/* 響應式設計 */
@media (min-width: 1200px) {
  .main-content { margin-left: 0; }
  .page-content { padding: 2rem 3rem; }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .main-content { margin-left: 0; }
  .page-content { padding: 2.5rem 3rem; }
}

@media (max-width: 768px) {
  .mobile-overlay { display: block; }
  .page-content { padding: 1.5rem; }
}

@media (max-width: 480px) {
  .page-content { padding: 1rem; }
}

/* 頁面切換動畫 */
.page-content > * {
  animation: slideInUp 0.6s var(--transition-bounce);
}

/* 滾動按鈕 */
.scroll-buttons {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  z-index: var(--z-fixed);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scroll-btn {
  width: 50px;
  height: 50px;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-bounce);
  backdrop-filter: blur(10px);
}

.scroll-btn:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.25);
}

.scroll-top {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: white;
}

.scroll-bottom {
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  color: white;
}

/* 開發模式調試資訊 */
.scroll-debug-info {
  position: fixed;
  top: 100px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 12px;
  z-index: var(--z-tooltip);
}

/* 響應式調整 */
@media (max-width: 768px) {
  .scroll-buttons { right: 1rem; bottom: 1rem; }
  .scroll-btn { width: 45px; height: 45px; font-size: 1.1rem; }
  .mobile-overlay ~ .scroll-buttons { display: none; }
}

@media (max-width: 480px) {
  .scroll-buttons { right: 0.5rem; bottom: 0.5rem; }
  .scroll-btn { width: 40px; height: 40px; font-size: 1rem; }
}
</style>

<!-- 全域暗黑模式樣式 -->
<style>
/* Nuxt UI 暗黑模式增強樣式 */

/* 自定義 CSS 變數 - 配合 Nuxt UI */
:root {
  --custom-shadow: rgba(0, 0, 0, 0.1);
  --custom-shadow-hover: rgba(0, 0, 0, 0.15);
}

.dark {
  --custom-shadow: rgba(0, 0, 0, 0.3);
  --custom-shadow-hover: rgba(0, 0, 0, 0.4);
}

/* 卡片陰影增強 */
.stat-card,
.subscription-card,
.food-card,
.video-card,
.image-card {
  box-shadow: 0 4px 15px var(--custom-shadow);
  transition: all 0.3s ease;
}

.stat-card:hover,
.subscription-card:hover,
.food-card:hover,
.video-card:hover,
.image-card:hover {
  box-shadow: 0 8px 25px var(--custom-shadow-hover);
}

/* 滾動按鈕增強 */
.scroll-btn {
  box-shadow: 0 4px 15px var(--custom-shadow) !important;
}

.scroll-btn:hover {
  box-shadow: 0 6px 20px var(--custom-shadow-hover) !important;
}

/* 暗黑模式樣式已移至 variables.css 和各個元件中 */

:global(.dark) .status-badge.not-cached {
  background: rgba(248, 113, 113, 0.2) !important;
  color: #f87171 !important;
}

:global(.dark) .status-badge.blob-exists {
  background: rgba(96, 165, 250, 0.2) !important;
  color: #60a5fa !important;
}

:global(.dark) .status-badge.blob-missing {
  background: rgba(248, 113, 113, 0.2) !important;
  color: #f87171 !important;
}

/* GalleryPage 特定樣式 */
:global(.dark) .image-gallery-container h1 {
  color: #ffffff !important;
  text-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.9) !important,
    0 2px 4px rgba(0, 0, 0, 0.7) !important,
    0 4px 8px rgba(0, 0, 0, 0.5) !important;
}

:global(.dark) .gallery-info p {
  color: #cbd5e1 !important;
}

:global(.dark) .gallery-stats .stat-item {
  color: #94a3b8 !important;
}

:global(.dark) .image-card {
  color: #f1f5f9 !important;
}

:global(.dark) .image-list-item {
  color: #f1f5f9 !important;
}

:global(.dark) .image-list-item .list-image-name {
  color: #ffffff !important;
  font-weight: bold !important;
}

:global(.dark) .image-list-item .list-image-details {
  color: #f1f5f9 !important;
}

:global(.dark) .image-list-item .detail-item {
  color: #94a3b8 !important;
}

:global(.dark) .image-info .image-name {
  color: #ffffff !important;
}

:global(.dark) .image-info .image-size {
  color: #cbd5e1 !important;
}

:global(.dark) .no-images,
:global(.dark) .no-results {
  color: #94a3b8 !important;
}

:global(.dark) .no-images h3,
:global(.dark) .no-results h3 {
  color: #f1f5f9 !important;
}

:global(.dark) .lightbox-content {
  background: #1e293b !important;
  border: 1px solid #475569 !important;
}

:global(.dark) .lightbox-info h3 {
  color: #ffffff !important;
}

:global(.dark) .lightbox-details span {
  color: #94a3b8 !important;
}

/* 通用表單元素增強 */
:global(.dark) .auth-btn.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  color: white !important;
  border: 1px solid #2563eb !important;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3) !important;
}

:global(.dark) .auth-btn.primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4) !important;
  transform: translateY(-2px) !important;
}

:global(.dark) .auth-btn.secondary {
  background: linear-gradient(135deg, #64748b 0%, #475569 100%) !important;
  color: white !important;
  border: 1px solid #475569 !important;
}

:global(.dark) .auth-btn.secondary:hover {
  background: linear-gradient(135deg, #475569 0%, #334155 100%) !important;
  transform: translateY(-2px) !important;
}

/* 通用卡片懸停效果增強 */
:global(.dark) .subscription-card:hover,
:global(.dark) .food-card:hover,
:global(.dark) .video-card:hover,
:global(.dark) .image-card:hover {
  transform: translateY(-5px) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6) !important;
}

/* 通用輸入框增強 */
:global(.dark) input:focus,
:global(.dark) textarea:focus,
:global(.dark) select:focus {
  border-color: #60a5fa !important;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2) !important;
  background: #0f172a !important;
}

/* 通用按鈕增強 */
:global(.dark) .action-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  transform: scale(1.05) !important;
}

/* 確保所有頁面標題都突出顯示 */
:global(.dark) .page-content h1,
:global(.dark) .page-content h2,
:global(.dark) .page-content h3 {
  color: #f1f5f9 !important;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
}

/* DashboardPage 特定樣式增強 */
:global(.dark) .dashboard-title {
  color: #ffffff !important;
  text-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.9) !important,
    0 2px 4px rgba(0, 0, 0, 0.7) !important,
    0 4px 8px rgba(0, 0, 0, 0.5) !important;
}

:global(.dark) .stat-card h3 {
  color: #cbd5e1 !important;
}

:global(.dark) .stat-card .stat-number {
  color: #60a5fa !important;
  background: none !important;
  -webkit-background-clip: unset !important;
  -webkit-text-fill-color: unset !important;
  background-clip: unset !important;
}

:global(.dark) .stat-card .stat-label {
  color: #94a3b8 !important;
}

:global(.dark) .action-card h3 {
  color: #f1f5f9 !important;
}

:global(.dark) .action-card .action-description {
  color: #94a3b8 !important;
}

/* 確保所有表單和輸入框在暗黑模式下可見 */
:global(.dark) .form-group label {
  color: #cbd5e1 !important;
}

:global(.dark) .form-group input,
:global(.dark) .form-group textarea,
:global(.dark) .form-group select {
  background: #1e293b !important;
  color: #f1f5f9 !important;
  border: 1px solid #475569 !important;
}

:global(.dark) .form-group input::placeholder,
:global(.dark) .form-group textarea::placeholder {
  color: #64748b !important;
}

/* 確保所有列表項目文字可見 */
:global(.dark) .list-header h3 {
  color: #ffffff !important;
}

:global(.dark) .summary .total-count,
:global(.dark) .summary .total-cost,
:global(.dark) .summary .expiry-warning {
  color: inherit !important;
}

/* 修復可能的透明文字問題 */
:global(.dark) * {
  -webkit-text-fill-color: unset !important;
}

:global(.dark) *[style*="background-clip: text"],
:global(.dark) *[style*="-webkit-background-clip: text"] {
  background: none !important;
  -webkit-background-clip: unset !important;
  -webkit-text-fill-color: unset !important;
  background-clip: unset !important;
  color: inherit !important;
}
</style>
