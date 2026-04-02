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
    <div v-if="persistentAudioTrack" class="persistent-audio-bar">
      <div class="persistent-audio-copy">
        <p class="persistent-audio-kicker">Now Playing</p>
        <strong>{{ persistentAudioTrack.name }}</strong>
        <span>{{ persistentAudioTrack.meta || '鋒兄音樂' }}</span>
      </div>

      <div class="persistent-audio-controls">
        <button
          type="button"
          class="persistent-audio-btn"
          @click="persistentAudioPlaying ? pauseGlobal() : resumeGlobal()"
        >
          {{ persistentAudioPlaying ? 'Pause' : 'Play' }}
        </button>

        <label class="persistent-audio-range">
          <span>{{ formatAudioTime(persistentAudioTime) }}</span>
          <input
            type="range"
            min="0"
            :max="Math.max(persistentAudioDuration, 1)"
            :value="persistentAudioTime"
            @input="seekGlobal($event.target.value)"
          />
          <span>{{ formatAudioTime(persistentAudioDuration) }}</span>
        </label>

        <label class="persistent-audio-volume">
          <span>Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="persistentAudioVolume"
            @input="setGlobalVolume($event.target.value)"
          />
        </label>

        <button type="button" class="persistent-audio-btn persistent-audio-btn-close" @click="stopGlobal()">
          Close
        </button>
      </div>
    </div>

    <div v-if="persistentVideoTrack" class="persistent-video-bar">
      <video class="persistent-video-preview" :src="persistentVideoTrack.src" autoplay muted playsinline></video>

      <div class="persistent-video-copy">
        <p class="persistent-audio-kicker">Now Watching</p>
        <strong>{{ persistentVideoTrack.name }}</strong>
        <span>{{ persistentVideoTrack.meta || '鋒兄影片' }}</span>
      </div>

      <div class="persistent-video-controls">
        <button
          type="button"
          class="persistent-audio-btn"
          @click="persistentVideoPlaying ? pausePersistentVideo() : resumePersistentVideo()"
        >
          {{ persistentVideoPlaying ? 'Pause' : 'Play' }}
        </button>

        <label class="persistent-audio-range">
          <span>{{ formatAudioTime(persistentVideoTime) }}</span>
          <input
            type="range"
            min="0"
            :max="Math.max(persistentVideoDuration, 1)"
            :value="persistentVideoTime"
            @input="seekPersistentVideo($event.target.value)"
          />
          <span>{{ formatAudioTime(persistentVideoDuration) }}</span>
        </label>

        <label class="persistent-audio-volume">
          <span>Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="persistentVideoVolume"
            @input="setPersistentVideoVolume($event.target.value)"
          />
        </label>

        <button type="button" class="persistent-audio-btn persistent-audio-btn-close" @click="stopPersistentVideo()">
          Close
        </button>
      </div>
    </div>

    <div
      v-if="showBirthdayEasterEgg"
      class="birthday-easter-egg"
      role="dialog"
      aria-modal="true"
      :aria-label="`${birthdayEasterEggContent.title}彩蛋`"
    >
      <div class="birthday-easter-egg__confetti" aria-hidden="true">
        <span
          v-for="piece in birthdayConfetti"
          :key="piece.id"
          class="birthday-easter-egg__piece"
          :style="piece.style"
        ></span>
      </div>

      <div class="birthday-easter-egg__backdrop" @click="dismissBirthdayEasterEgg"></div>

      <section class="birthday-easter-egg__card">
        <button
          type="button"
          class="birthday-easter-egg__close"
          @click="dismissBirthdayEasterEgg"
          aria-label="關閉彩蛋"
        >
          ×
        </button>

        <p class="birthday-easter-egg__eyebrow">{{ birthdayEasterEggContent.eyebrow }}</p>
        <h2>{{ birthdayEasterEggContent.title }}</h2>
        <p class="birthday-easter-egg__lead">{{ birthdayEasterEggContent.lead }}</p>
        <p class="birthday-easter-egg__headline">{{ birthdayEasterEggContent.headline }}</p>
        <p class="birthday-easter-egg__note">{{ birthdayEasterEggContent.note }}</p>
      </section>
    </div>

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
import { useToast } from '../composables/useToast'
import { getSupabaseCredentials } from '../composables/useSettings'
import { usePushNotification } from '../composables/usePushNotification'
import { usePersistentAudioPlayer } from '../composables/usePersistentAudioPlayer'
import { usePersistentVideoPlayer } from '../composables/usePersistentVideoPlayer'

// 組件引用
const subscriptionPageRef = ref(null)
const foodPageRef = ref(null)
const bankPageRef = ref(null)

// 使用 composables
const { subscriptions, totalMonthlyCost, loadSubscriptions, getUpcomingSubscriptions } = useSubscriptions()
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
const { warning: toastWarning } = useToast()
const { subscribe: subscribePush, checkSubscription: checkPushSubscription } = usePushNotification()
const {
  showScrollButtons,
  showTopButton, 
  showBottomButton, 
  scrollToTop, 
  scrollToBottom, 
  setupScrollListener, 
  removeScrollListener 
} = useScroll()
const {
  currentTrack: persistentAudioTrack,
  isPlaying: persistentAudioPlaying,
  currentTime: persistentAudioTime,
  duration: persistentAudioDuration,
  volume: persistentAudioVolume,
  resumeGlobal,
  pauseGlobal,
  stopGlobal,
  seekGlobal,
  setGlobalVolume
} = usePersistentAudioPlayer()
const {
  currentVideo: persistentVideoTrack,
  isPlaying: persistentVideoPlaying,
  currentTime: persistentVideoTime,
  duration: persistentVideoDuration,
  volume: persistentVideoVolume,
  resumeGlobal: resumePersistentVideo,
  pauseGlobal: pausePersistentVideo,
  stopGlobal: stopPersistentVideo,
  seekGlobal: seekPersistentVideo,
  setGlobalVolume: setPersistentVideoVolume
} = usePersistentVideoPlayer()

// 計算屬性
const subscriptionsCount = computed(() => subscriptions.value.length)
const foodsCount = computed(() => foods.value.length)
const isDevelopment = computed(() => false) // 設為 true 以啟用滾動調試
const placeholderPages = {}
const placeholderConfig = computed(() => placeholderPages[currentPage.value] || null)
const SUPABASE_URL_WARNING_KEY = 'feng-supabase-url-warning'
const BIRTHDAY_EASTER_EGG_KEY_PREFIX = 'feng-birthday-easter-egg'
const showBirthdayEasterEgg = ref(false)
const birthdayEasterEggContent = ref({
  eyebrow: 'APRIL 03 SPECIAL',
  title: '塗哥生日快樂',
  lead: '今天全站開啟限定彩蛋，祝福直接拉滿。',
  headline: '今彩539頭獎得主鋒兄',
  note: '願今天手氣、福氣、靈感一起爆發。'
})
const birthdayConfetti = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  style: {
    left: `${4 + index * 4.2}%`,
    animationDelay: `${(index % 6) * 0.35}s`,
    animationDuration: `${7 + (index % 5)}s`,
    opacity: `${0.35 + (index % 4) * 0.14}`,
    transform: `scale(${0.75 + (index % 3) * 0.2}) rotate(${index * 17}deg)`
  }
}))
const formatAudioTime = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const checkBirthdayEasterEgg = () => {
  if (!import.meta.client) return

  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const eventKey = `${month}-${day}`
  const easterEggConfigs = {
    '4-3': {
      eyebrow: 'APRIL 03 SPECIAL',
      title: '塗哥生日快樂',
      lead: '今天全站開啟限定彩蛋，祝福直接拉滿。',
      headline: '今彩539頭獎得主鋒兄',
      note: '願今天手氣、福氣、靈感一起爆發。'
    },
    '11-27': {
      eyebrow: 'NOVEMBER 27 SPECIAL',
      title: '鋒兄生日快樂',
      lead: '今天網站切換成壽星模式，替鋒兄送上專屬歡呼。',
      headline: '高考三級資訊處理榜首鋒兄',
      note: '願今天一路高光，喜氣、霸氣、好運全部到位。'
    }
  }
  const activeConfig = easterEggConfigs[eventKey]
  const storageKey = `${BIRTHDAY_EASTER_EGG_KEY_PREFIX}-${eventKey}`
  const alreadyDismissed = sessionStorage.getItem(storageKey) === 'dismissed'

  if (!activeConfig) {
    showBirthdayEasterEgg.value = false
    return
  }

  birthdayEasterEggContent.value = activeConfig
  showBirthdayEasterEgg.value = !alreadyDismissed
}

const dismissBirthdayEasterEgg = () => {
  showBirthdayEasterEgg.value = false
  if (import.meta.client) {
    const today = new Date()
    const storageKey = `${BIRTHDAY_EASTER_EGG_KEY_PREFIX}-${today.getMonth() + 1}-${today.getDate()}`
    sessionStorage.setItem(storageKey, 'dismissed')
  }
}

const getSupabaseUrlValidationMessage = (rawUrl) => {
  const value = String(rawUrl || '').trim()
  if (!value) return ''
  if (value.includes('supabse.co')) {
    return 'Supabase URL 拼字錯誤：目前是 supabse.co，正確應為 supabase.co。請到設定頁修正後再重新整理。'
  }
  return ''
}

// 生命週期
onMounted(async () => {
  checkBirthdayEasterEgg()

  const config = useRuntimeConfig()
  const creds = getSupabaseCredentials()
  const supabaseUrl = creds?.url || config.public.supabaseUrl
  const supabaseUrlWarning = getSupabaseUrlValidationMessage(supabaseUrl)

  if (supabaseUrlWarning) {
    toastWarning(supabaseUrlWarning, { duration: 10000 })
    if (import.meta.client && sessionStorage.getItem(SUPABASE_URL_WARNING_KEY) !== supabaseUrl) {
      sessionStorage.setItem(SUPABASE_URL_WARNING_KEY, supabaseUrl)
      alert(supabaseUrlWarning)
    }
  }

  // 載入初始資料
  await loadSubscriptions()
  loadFoods()

  // 檢查 3 天內即將到期的訂閱並發送通知（每天只通知一次）
  const today = new Date().toISOString().split('T')[0]
  const lastNotifyDate = localStorage.getItem('sub-notify-date')
  const upcoming = getUpcomingSubscriptions()

  if (upcoming.length > 0 && lastNotifyDate !== today) {
    localStorage.setItem('sub-notify-date', today)

    // 頁面內 toast 通知
    upcoming.forEach((sub, index) => {
      const daysLeft = Math.ceil((new Date(sub.nextdate) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
      const dayText = daysLeft === 0 ? '今天' : `${daysLeft} 天後`
      setTimeout(() => {
        toastWarning(`「${sub.name}」${dayText}到期（${sub.nextdate}）`, { duration: 8000 })
      }, index * 500)
    })

    // 瀏覽器原生通知（透過 Service Worker，支援手機）
    if ('Notification' in window) {
      const sendNativeNotifications = async () => {
        const registration = await navigator.serviceWorker?.ready
        upcoming.forEach((sub, index) => {
          const daysLeft = Math.ceil((new Date(sub.nextdate) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
          const dayText = daysLeft === 0 ? '今天' : `${daysLeft} 天後`
          const notifBody = `「${sub.name}」${dayText}到期（${sub.nextdate}）`
          setTimeout(() => {
            if (registration) {
              registration.showNotification('鋒兄訂閱提醒', {
                body: notifBody,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: `sub-${sub.id}`,
                vibrate: [200, 100, 200],
                requireInteraction: true
              })
            } else {
              new Notification('鋒兄訂閱提醒', {
                body: notifBody,
                icon: '/favicon.ico',
                tag: `sub-${sub.id}`
              })
            }
          }, index * 800)
        })
      }

      if (Notification.permission === 'granted') {
        sendNativeNotifications()
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            sendNativeNotifications()
          }
        })
      }
    }
  }

  // --- PWA 背景同步：儲存 Supabase 憑證到 IndexedDB ---
  // Service Worker 無法讀取 localStorage，需透過 IndexedDB 傳遞憑證
  if (import.meta.client && 'indexedDB' in window) {
    try {
      const url = creds?.url || config.public.supabaseUrl
      const key = creds?.key || config.public.supabaseAnonKey

      if (url && key) {
        const req = indexedDB.open('fengbroai-sw', 1)
        req.onupgradeneeded = (e) => {
          if (!e.target.result.objectStoreNames.contains('config')) {
            e.target.result.createObjectStore('config')
          }
        }
        req.onsuccess = (e) => {
          const db = e.target.result
          const tx = db.transaction('config', 'readwrite')
          tx.objectStore('config').put({ url, key }, 'supabase-creds')
        }
      }
    } catch (e) {
      console.warn('[PWA] 儲存憑證到 IndexedDB 失敗:', e)
    }
  }

  // --- PWA 背景同步：註冊 Periodic Background Sync ---
  // 支援：Android Chrome（已安裝 PWA）；iOS 目前不支援
  if (import.meta.client && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(async (registration) => {
      try {
        if (!('periodicSync' in registration)) return
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' })
        if (status.state === 'granted') {
          await registration.periodicSync.register('check-subscriptions', {
            minInterval: 24 * 60 * 60 * 1000  // 最少每天一次
          })
          console.log('[PWA] 背景訂閱檢查已註冊（每天）')
        }
      } catch (e) {
        console.log('[PWA] Periodic Background Sync 不支援或未授權:', e.message)
      }
    }).catch(() => {})
  }

  // --- Web Push：訂閱真正的背景推播（伺服器主動推送，不需要開 App）---
  // TODO: 完成以下步驟後取消註解：
  // 1. 在 Supabase 執行 supabase-push-table.sql 建立 push_subscriptions table
  // 2. 在 .env 填入 SUPABASE_SERVICE_ROLE_KEY
  // 3. 在 Netlify 環境變數設定 VAPID 相關金鑰
  // if (import.meta.client && 'serviceWorker' in navigator && 'PushManager' in window) {
  //   await checkPushSubscription()
  //   subscribePush().catch(() => {})
  // }

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
  font-family: var(--font-body);
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--accent) 14%, transparent), transparent 24%),
    radial-gradient(circle at right 12%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 26%),
    var(--bg-primary);
  min-height: 100vh;
  color: var(--text-primary);
  transition: background-color var(--transition-normal), color var(--transition-normal);
}

.app-container {
  display: flex;
  align-items: flex-start;
  min-height: 100vh;
  width: min(1720px, 100%);
  margin: 0 auto;
  gap: clamp(0.75rem, 1vw, 1.25rem);
  padding: clamp(0.65rem, 1vw, 1rem);
}

.main-content {
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: margin-left var(--transition-normal);
  min-height: 100vh;
}

.page-content {
  flex: 1;
  width: 100%;
  padding: 0.6rem 0.35rem 1.75rem;
  overflow: visible;
  background: transparent;
  transition: all var(--transition-normal);
  min-height: auto;
  max-height: none;
}

/* 手機版遮罩層 */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 12, 22, 0.45);
  z-index: 999;
  display: none;
}

/* 響應式設計 */
@media (min-width: 1200px) {
  .main-content { margin-left: 0; }
  .page-content { padding: 0.65rem 0.45rem 1.75rem; }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .main-content { margin-left: 0; }
  .app-container {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  .page-content { padding: 0.4rem 0.2rem 8rem; }
  .scroll-buttons { bottom: 9rem; }
  .persistent-audio-bar,
  .persistent-video-bar {
    width: calc(100vw - 1.5rem);
    border-radius: 22px;
  }
  .persistent-audio-bar {
    grid-template-columns: 1fr;
  }
  .persistent-audio-controls,
  .persistent-video-controls {
    flex-wrap: wrap;
  }
  .persistent-video-bar {
    grid-template-columns: 140px 1fr;
    bottom: 8rem;
  }
}

@media (max-width: 768px) {
  .mobile-overlay { display: block; }
  .app-container {
    display: block;
    width: 100%;
    padding: 0.5rem;
  }
  .page-content {
    padding: 0.2rem 0 10rem;
    padding-bottom: calc(10rem + env(safe-area-inset-bottom));
    min-height: auto;
    max-height: none;
    overflow: visible;
  }
  .main-content {
    overflow: visible;
    height: auto;
    min-height: auto;
  }
  .scroll-buttons {
    right: 0.85rem;
    bottom: calc(9rem + env(safe-area-inset-bottom));
  }
  .persistent-audio-bar,
  .persistent-video-bar {
    left: 0.5rem;
    right: 0.5rem;
    transform: none;
    width: auto;
    border-radius: 20px;
  }
  .persistent-audio-bar {
    bottom: calc(0.6rem + env(safe-area-inset-bottom));
    grid-template-columns: 1fr;
    gap: 0.85rem;
    padding: 0.85rem;
  }
  .persistent-audio-controls,
  .persistent-video-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 0.65rem;
  }
  .persistent-audio-range,
  .persistent-audio-volume {
    grid-column: 1 / -1;
  }
  .persistent-video-bar {
    bottom: calc(11.7rem + env(safe-area-inset-bottom));
    grid-template-columns: 1fr;
    gap: 0.85rem;
    padding: 0.85rem;
  }
  .persistent-video-preview {
    max-height: 140px;
  }
}

@media (max-width: 480px) {
  .page-content {
    padding: 0.15rem 0 11rem;
    padding-bottom: calc(11rem + env(safe-area-inset-bottom));
    min-height: auto;
    max-height: none;
  }
  .persistent-audio-copy strong,
  .persistent-video-copy strong {
    font-size: 0.95rem;
  }
  .persistent-audio-copy span,
  .persistent-video-copy span {
    font-size: 0.82rem;
  }
}

/* 頁面切換動畫 */
.page-content > * {
  animation: slideInUp 0.6s ease;
}

/* 滾動按鈕 */
.scroll-buttons {
  position: fixed;
  right: 2rem;
  bottom: 7.5rem;
  z-index: var(--z-fixed);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.persistent-audio-bar {
  position: fixed;
  left: 50%;
  bottom: 1rem;
  transform: translateX(-50%);
  width: min(1120px, calc(100vw - 2rem));
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow);
  z-index: calc(var(--z-fixed) + 1);
}

.persistent-audio-copy {
  min-width: 0;
}

.persistent-audio-kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.persistent-audio-copy strong,
.persistent-audio-copy span {
  display: block;
}

.persistent-audio-copy strong {
  margin-top: 0.18rem;
  font-family: var(--font-display);
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persistent-audio-copy span {
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.persistent-audio-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.persistent-audio-btn {
  border: 1px solid var(--border-color);
  background: color-mix(in oklab, var(--bg-secondary) 88%, transparent);
  color: var(--text-primary);
  border-radius: 999px;
  padding: 0.72rem 1rem;
  cursor: pointer;
}

.persistent-audio-btn-close {
  color: var(--danger);
}

.persistent-audio-range,
.persistent-audio-volume {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.persistent-audio-range {
  flex: 1;
}

.persistent-audio-range input,
.persistent-audio-volume input {
  width: 100%;
  min-width: 0;
}

.persistent-video-bar {
  position: fixed;
  left: 50%;
  bottom: 7.25rem;
  transform: translateX(-50%);
  width: min(1120px, calc(100vw - 2rem));
  display: grid;
  grid-template-columns: 180px minmax(180px, 240px) 1fr;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  background: color-mix(in oklab, var(--bg-secondary) 90%, transparent);
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow);
  z-index: calc(var(--z-fixed) + 1);
}

.persistent-video-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  object-fit: cover;
  background: #000;
}

.persistent-video-copy {
  min-width: 0;
}

.persistent-video-copy strong,
.persistent-video-copy span {
  display: block;
}

.persistent-video-copy strong {
  margin-top: 0.18rem;
  font-family: var(--font-display);
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persistent-video-copy span {
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.persistent-video-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.birthday-easter-egg {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal, 4000) + 12);
  display: grid;
  place-items: center;
  padding: 1.5rem;
  pointer-events: auto;
}

.birthday-easter-egg__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top, rgba(255, 215, 120, 0.22), transparent 36%),
    rgba(7, 12, 24, 0.64);
  backdrop-filter: blur(12px);
}

.birthday-easter-egg__confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.birthday-easter-egg__piece {
  position: absolute;
  top: -12%;
  width: 14px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f97316 0%, #facc15 45%, #ec4899 100%);
  box-shadow: 0 10px 30px rgba(249, 115, 22, 0.28);
  animation: birthdayConfettiFall linear infinite;
}

.birthday-easter-egg__piece:nth-child(3n) {
  background: linear-gradient(180deg, #38bdf8 0%, #818cf8 100%);
}

.birthday-easter-egg__piece:nth-child(4n) {
  background: linear-gradient(180deg, #34d399 0%, #22c55e 100%);
}

.birthday-easter-egg__card {
  position: relative;
  width: min(560px, 100%);
  padding: 2rem 1.6rem 1.7rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 32px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 237, 0.92)),
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.18), transparent 40%);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
  text-align: center;
  animation: birthdayCardEntrance 0.55s ease;
}

.birthday-easter-egg__close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  font-size: 1.5rem;
  cursor: pointer;
}

.birthday-easter-egg__eyebrow {
  margin-bottom: 0.7rem;
  color: #9a3412;
  font-size: 0.78rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.birthday-easter-egg__card h2 {
  margin: 0;
  color: #7c2d12;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1.05;
}

.birthday-easter-egg__lead,
.birthday-easter-egg__note {
  margin: 0.85rem 0 0;
  color: #6b7280;
  font-size: 1rem;
}

.birthday-easter-egg__headline {
  margin: 1.15rem 0 0;
  color: #dc2626;
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 3vw, 1.9rem);
  font-weight: 700;
}

@keyframes birthdayConfettiFall {
  0% {
    transform: translate3d(0, -10vh, 0) rotate(0deg);
  }
  100% {
    transform: translate3d(3vw, 110vh, 0) rotate(480deg);
  }
}

@keyframes birthdayCardEntrance {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
  .scroll-btn { width: 45px; height: 45px; font-size: 1.1rem; }
  .mobile-overlay ~ .scroll-buttons { display: none; }
  .birthday-easter-egg {
    padding: 1rem;
  }
  .birthday-easter-egg__card {
    padding: 1.65rem 1.15rem 1.35rem;
    border-radius: 26px;
  }
  .birthday-easter-egg__headline {
    line-height: 1.2;
  }
}

@media (max-width: 480px) {
  .scroll-btn { width: 40px; height: 40px; font-size: 1rem; }
  .persistent-audio-controls,
  .persistent-video-controls {
    grid-template-columns: 1fr;
  }
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
