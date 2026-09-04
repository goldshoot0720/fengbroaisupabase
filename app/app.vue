<template>
  <div id="app">
    <!-- 整體應用容器 -->
    <div class="app-container">
      <!-- 側邊欄（手機版） -->
      <AppSidebar
        :is-open="sidebarOpen"
        :current-page="currentPage"
        :active-tool="activeTool"
        :pages="pages"
        @toggle="toggleSidebar"
        @navigate="handleSidebarNavigate"
      />

      <!-- 主要內容區 -->
      <div class="main-content">
        <!-- 頂部導航標題 -->
        <AppHeader
          :title="pageTitle"
          :title-hint="pageTitleHint"
          :subtitle="pageSubtitle"
          :is-dark-mode="isDarkMode"
          :pages="pages"
          :current-page="currentPage"
          :active-tool="activeTool"
          @toggle-sidebar="toggleSidebar"
          @toggle-dark-mode="toggleDarkMode"
          @navigate="handleSidebarNavigate"
        />

        <!-- 頁面內容 -->
        <section
          v-if="showBirthdayEasterEgg"
          class="birthday-easter-egg"
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

          <div class="birthday-easter-egg__card">
            <button
              type="button"
              class="birthday-easter-egg__close"
              @click="dismissBirthdayEasterEgg"
              aria-label="關閉彩蛋"
            >
              ×
            </button>

            <div class="birthday-easter-egg__copy">
              <p class="birthday-easter-egg__eyebrow">{{ birthdayEasterEggContent.eyebrow }}</p>
              <h2>{{ birthdayEasterEggContent.title }}</h2>
              <p class="birthday-easter-egg__lead">{{ birthdayEasterEggContent.lead }}</p>
              <p class="birthday-easter-egg__headline">{{ birthdayEasterEggContent.headline }}</p>
              <p class="birthday-easter-egg__note">{{ birthdayEasterEggContent.note }}</p>
            </div>
          </div>
        </section>

        <main class="page-content">
          <!-- 儀表板 -->
          <DashboardPage 
            v-if="currentPage === 'dashboard'"
            :subscriptions-count="subscriptionsCount"
            :foods-count="foodsCount"
            :total-monthly-cost="totalMonthlyCost"
            @navigate="navigateToPage"
          />

          <!-- 訂閱管理 -->
          <SubscriptionPage 
            v-if="currentPage === 'subscription'"
            ref="subscriptionPageRef"
          />

          <!-- 試用／首購 -->
          <TrialPurchasePage
            v-if="currentPage === 'trial-purchase'"
          />

          <!-- 重灌軟體 -->
          <ReinstallPage
            v-if="currentPage === 'reinstall'"
          />

          <!-- 額度管理 -->
          <QuotaPage
            v-if="currentPage === 'quota'"
          />

          <!-- 購物清單 -->
          <ShoppingPage
            v-if="currentPage === 'shopping'"
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

          <FengToolsPage
            v-if="currentPage === 'tools'"
            v-model="activeTool"
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
            @navigate="navigateToPage"
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
    <VoiceInputPanel
      v-if="voicePanelReady"
      :current-page="currentPage"
      :pages="pages"
      @navigate="navigateToPage"
    />

    <div 
      v-if="sidebarOpen" 
      class="mobile-overlay"
      @click="closeSidebar"
    ></div>

    <!-- 滾動按鈕：右下角上/下箭頭 -->
    <div v-show="showScrollButtons" class="scroll-buttons" aria-label="頁面捲動">
      <button
        v-show="showTopButton"
        type="button"
        @click="scrollToTop"
        class="scroll-btn scroll-top"
        title="回到頂端"
        aria-label="回到頂端"
      >
        ↑
      </button>

      <button
        v-show="showBottomButton"
        type="button"
        @click="scrollToBottom"
        class="scroll-btn scroll-bottom"
        title="移到底端"
        aria-label="移到底端"
      >
        ↓
      </button>
    </div>

    <!-- Toast 通知容器 -->
    <div v-if="showPersistentAudioPlayer" class="persistent-audio-bar">
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

    <div
      v-if="showPersistentVideoPlayer && persistentVideoTrack"
      class="persistent-video-bar"
      role="region"
      aria-label="影片迷你播放器"
    >
      <div class="persistent-video-thumb">
        <video
          class="persistent-video-preview"
          :src="persistentVideoTrack.src"
          autoplay
          muted
          playsinline
          loop
        ></video>
        <button
          type="button"
          class="persistent-video-thumb-play"
          :aria-label="persistentVideoPlaying ? '暫停' : '播放'"
          @click="persistentVideoPlaying ? pausePersistentVideo() : resumePersistentVideo()"
        >
          {{ persistentVideoPlaying ? '❚❚' : '▶' }}
        </button>
      </div>

      <div class="persistent-video-main">
        <div class="persistent-video-copy">
          <p class="persistent-video-kicker">正在觀看</p>
          <strong>{{ persistentVideoTrack.name }}</strong>
          <span>{{ persistentVideoTrack.meta || '鋒兄影片' }}</span>
        </div>

        <div class="persistent-video-progress-row">
          <span class="persistent-video-time">{{ formatAudioTime(persistentVideoTime) }}</span>
          <input
            class="persistent-video-progress"
            type="range"
            min="0"
            :max="Math.max(persistentVideoDuration, 1)"
            step="0.1"
            :value="persistentVideoTime"
            :aria-valuetext="`${formatAudioTime(persistentVideoTime)} / ${formatAudioTime(persistentVideoDuration)}`"
            aria-label="播放進度"
            @input="seekPersistentVideo($event.target.value)"
          />
          <span class="persistent-video-time">{{ formatAudioTime(persistentVideoDuration) }}</span>
        </div>
      </div>

      <div class="persistent-video-controls">
        <button
          type="button"
          class="persistent-video-btn"
          :aria-label="persistentVideoPlaying ? '暫停' : '播放'"
          @click="persistentVideoPlaying ? pausePersistentVideo() : resumePersistentVideo()"
        >
          {{ persistentVideoPlaying ? '❚❚' : '▶' }}
        </button>

        <label class="persistent-video-volume" title="音量">
          <span class="sr-only">音量</span>
          <span aria-hidden="true">{{ persistentVideoVolume === 0 ? '🔇' : persistentVideoVolume < 0.45 ? '🔉' : '🔊' }}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="persistentVideoVolume"
            aria-label="音量"
            @input="setPersistentVideoVolume($event.target.value)"
          />
        </label>

        <button
          type="button"
          class="persistent-video-btn persistent-video-btn-close"
          aria-label="關閉迷你播放器"
          @click="stopPersistentVideo()"
        >
          ✕
        </button>
      </div>
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
import { ref, computed, defineAsyncComponent, onMounted, onUnmounted, nextTick, watch } from 'vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import PageContainer from '../components/layout/PageContainer.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ToastContainer from '../components/ui/ToastContainer.vue'
import PageLoadingState from '../components/ui/PageLoadingState.vue'

// 頁面模組按需載入，避免影片、音樂與 AI 工具的重量影響首屏。
// `suspensible: false` 讓 loadingComponent 直接呈現，不會因 Suspense 造成空白頁。
const lazyPage = (loader) => defineAsyncComponent({
  loader,
  loadingComponent: PageLoadingState,
  delay: 120,
  suspensible: false
})
const DashboardPage = lazyPage(() => import('../components/pages/DashboardPage.vue'))
const SubscriptionPage = lazyPage(() => import('../components/pages/SubscriptionPage.vue'))
const FoodPage = lazyPage(() => import('../components/pages/FoodPage.vue'))
const GalleryPage = lazyPage(() => import('../components/pages/GalleryPage.vue'))
const VideoDBPage = lazyPage(() => import('../components/pages/VideoDBPage.vue'))
const MusicDBPage = lazyPage(() => import('../components/pages/MusicDBPage.vue'))
const DocumentPage = lazyPage(() => import('../components/pages/DocumentPage.vue'))
const PodcastPage = lazyPage(() => import('../components/pages/PodcastPage.vue'))
const RoutinePage = lazyPage(() => import('../components/pages/RoutinePage.vue'))
const AboutPage = lazyPage(() => import('../components/pages/AboutPage.vue'))
const NotePage = lazyPage(() => import('../components/pages/NotePage.vue'))
const FengToolsPage = lazyPage(() => import('../components/pages/FengToolsPage.vue'))
const CommonPage = lazyPage(() => import('../components/pages/CommonPage.vue'))
const BankPage = lazyPage(() => import('../components/pages/BankPage.vue'))
const SettingsPage = lazyPage(() => import('../components/pages/SettingsPage.vue'))
const HomePage = lazyPage(() => import('../components/pages/HomePage.vue'))
const VoiceInputPanel = lazyPage(() => import('../components/ui/VoiceInputPanel.vue'))

// 使用 composables
import { useSubscriptions } from '../composables/useSubscriptions'
import { useFoods } from '../composables/useFoods'
import { useTheme } from '../composables/useTheme'
import { useNavigation, isAppPageId } from '../composables/useNavigation'
import { useScroll } from '../composables/useScroll'
import { useToast } from '../composables/useToast'
import { getSupabaseCredentials } from '../composables/useSettings'
import { useNotifications } from '../composables/useNotifications'
import { useSiteStats } from '../composables/useSiteStats'
import { usePersistentAudioPlayer } from '../composables/usePersistentAudioPlayer'
import { usePersistentVideoPlayer } from '../composables/usePersistentVideoPlayer'

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
  pageTitleHint,
  pageSubtitle,
  setCurrentPage,
  restoreLastPage,
  toggleSidebar, 
  closeSidebar, 
  handleResize 
} = useNavigation()
const route = useRoute()
// True when the URL explicitly named a target page (/?page= or /about);
// then we must NOT override it with the remembered last page.
const hasExplicitPage = ref(false)
const applyRoutePage = () => {
  if (route.path === '/about') {
    hasExplicitPage.value = true
    setCurrentPage('about')
    return
  }
  const raw = route.query.page
  const page = Array.isArray(raw) ? raw[0] : raw
  if (typeof page === 'string' && isAppPageId(page)) {
    hasExplicitPage.value = true
    setCurrentPage(page)
    return
  }
  if (import.meta.server) {
    setCurrentPage('home')
  }
}
applyRoutePage()
watch(() => [route.path, route.query.page], applyRoutePage)
const { warning: toastWarning } = useToast()
const { bootstrapNotifications } = useNotifications()
const { recordSiteVisit, recordMenuUsage } = useSiteStats()
const {
  showScrollButtons,
  showTopButton,
  showBottomButton,
  scrollToTop,
  scrollToBottom,
  handleScroll,
  setupScrollListener,
  removeScrollListener
} = useScroll()
const {
  currentTrack: persistentAudioTrack,
  isPlaying: persistentAudioPlaying,
  currentTime: persistentAudioTime,
  duration: persistentAudioDuration,
  volume: persistentAudioVolume,
  showPersistentPlayer: showPersistentAudioPlayer,
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
  showPersistentPlayer: showPersistentVideoPlayer,
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
const TOOL_STORAGE_KEY = 'feng-tools-active-tool'
const TOOL_KEYS = ['biggo', 'manual', 'phone', 'tube', 'finance', 'news', 'image-voice', 'image-convert', 'video-merge', 'yt-bili-dl']
const readStoredTool = () => {
  if (typeof localStorage === 'undefined') return 'biggo'
  const saved = localStorage.getItem(TOOL_STORAGE_KEY)
  return TOOL_KEYS.includes(saved) ? saved : 'biggo'
}
const activeTool = ref(readStoredTool())
const voicePanelReady = ref(false)
let voicePanelIdleHandle = null
let voicePanelFallbackTimer = null
// 使用者意圖的導覽（側欄、頁頭、頁內快速卡、語音）。切到目標頁並回報
// 選單使用統計（fire-and-forget）；程式性的還原／路由解析不走這裡。
const navigateToPage = (pageId) => {
  if (typeof pageId !== 'string' || !pageId) return
  setCurrentPage(pageId)
  recordMenuUsage(pageId)
}
const handleSidebarNavigate = (pageId) => {
  // 子選單先解析出真正的 product page id，再統一交給 navigateToPage。
  if (typeof pageId === 'string') {
    if (pageId.startsWith('tools:')) {
      const tool = pageId.split(':')[1]
      if (TOOL_KEYS.includes(tool)) {
        activeTool.value = tool
      }
      navigateToPage('tools')
      return
    }
    if (pageId.startsWith('note:')) {
      navigateToPage(pageId.slice('note:'.length) === 'document' ? 'document' : 'note')
      return
    }
    if (pageId.startsWith('music:')) {
      navigateToPage(pageId.slice('music:'.length) === 'podcast' ? 'podcast' : 'music')
      return
    }
    if (pageId.startsWith('settings:')) {
      navigateToPage(pageId.slice('settings:'.length) === 'about' ? 'about' : 'settings')
      return
    }
  }
  navigateToPage(pageId)
}
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
  // Remember the last visited menu item and re-enter directly (unless the URL
  // explicitly pointed at a page). Runs client-side after hydration to avoid
  // SSR/client template mismatch.
  if (!hasExplicitPage.value) {
    restoreLastPage()
  }

  // Voice is a secondary tool; defer its large panel until the first paint is idle.
  const mountVoicePanel = () => { voicePanelReady.value = true }
  if (typeof window.requestIdleCallback === 'function') {
    voicePanelIdleHandle = window.requestIdleCallback(mountVoicePanel, { timeout: 1500 })
  } else {
    voicePanelFallbackTimer = window.setTimeout(mountVoicePanel, 700)
  }
  checkBirthdayEasterEgg()

  // 每個瀏覽器 session 記錄一次進站（人次＋連續天數）；純裝飾性，失敗不影響使用。
  recordSiteVisit()

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

  // 載入初始資料後，統一啟動通知流程（toast / 原生 / SW / Web Push / Resend Email）
  await loadSubscriptions()
  loadFoods()
  await bootstrapNotifications()

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
  if (typeof window !== 'undefined' && voicePanelIdleHandle !== null && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(voicePanelIdleHandle)
  }
  if (voicePanelFallbackTimer !== null) window.clearTimeout(voicePanelFallbackTimer)
  if (import.meta.client) {
    window.removeEventListener('resize', handleResize)
    removeScrollListener()
  }
})

// 切換頁面後內容高度會變，重新判斷是否顯示捲動箭頭
watch(currentPage, async () => {
  if (!import.meta.client) return
  await nextTick()
  handleScroll()
  setTimeout(handleScroll, 300)
})
</script>

<style scoped>
/* 應用程式主要樣式 */

#app {
  font-family: var(--font-body);
  /* 安靜的紙面：拿掉兩圈光暈，讓卡片自己是唯一的層次 */
  background: var(--bg-canvas);
  min-height: 100vh;
  color: var(--text-primary);
  transition: background-color var(--transition-normal), color var(--transition-normal);
}

.app-container {
  display: block;
  width: min(1720px, 100%);
  margin: 0 auto;
  padding: clamp(0.65rem, 1vw, 1rem);
}

.main-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
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
  background: color-mix(in oklab, var(--overlay-scrim) 48%, transparent);
  backdrop-filter: blur(10px) saturate(1.05);
  -webkit-backdrop-filter: blur(10px) saturate(1.05);
  z-index: 999;
  display: none;
  animation: overlayIn 180ms var(--ease-out-expo);
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 響應式設計 */
@media (min-width: 1200px) {
  .page-content { padding: 0.65rem 0.45rem 1.75rem; }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .app-container {
    padding: 0.75rem;
  }
  .page-content { padding: 0.4rem 0.2rem 8rem; }
  .scroll-buttons { bottom: 9rem; }
  .persistent-audio-bar,
  .persistent-video-bar {
    width: calc(100vw - 1.5rem);
    border-radius: var(--radius-xl);
  }
  .persistent-audio-bar {
    grid-template-columns: 1fr;
  }
  .persistent-audio-controls {
    flex-wrap: wrap;
  }
  .persistent-video-bar {
    grid-template-columns: 120px minmax(0, 1fr) auto;
    bottom: 8rem;
  }
}

@media (max-width: 768px) {
  .mobile-overlay { display: block; }

  #app {
    background:
      radial-gradient(circle at 12% -8%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 34%),
      radial-gradient(circle at 92% 8%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 28%),
      var(--bg-primary);
  }

  .app-container {
    display: block;
    width: 100%;
    max-width: 100%;
    padding: 0;
  }

  .main-content {
    overflow: visible;
    height: auto;
    min-height: 100dvh;
    min-height: 100vh;
    gap: 0;
  }

  .page-content {
    padding:
      0.55rem
      max(0.75rem, env(safe-area-inset-left, 0px))
      calc(7.5rem + env(safe-area-inset-bottom, 0px))
      max(0.75rem, env(safe-area-inset-right, 0px));
    min-height: auto;
    max-height: none;
    overflow: visible;
  }

  .scroll-buttons {
    right: max(0.75rem, env(safe-area-inset-right, 0px));
    bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
    gap: 0.55rem;
  }

  .scroll-btn {
    width: 46px;
    height: 46px;
    border-radius: var(--control-radius);
    font-size: 1rem;
    border: 1px solid var(--border-color);
    background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: var(--elevation-1);
  }

  .persistent-audio-bar,
  .persistent-video-bar {
    left: max(0.55rem, env(safe-area-inset-left, 0px));
    right: max(0.55rem, env(safe-area-inset-right, 0px));
    transform: none;
    width: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
    backdrop-filter: blur(18px) saturate(1.1);
    -webkit-backdrop-filter: blur(18px) saturate(1.1);
    box-shadow: 0 14px 36px color-mix(in oklab, oklch(0.16 0 0) 22%, transparent);
  }

  .persistent-audio-bar {
    bottom: calc(0.55rem + env(safe-area-inset-bottom, 0px));
    grid-template-columns: 1fr;
    gap: 0.7rem;
    padding: 0.75rem 0.8rem;
  }

  .persistent-audio-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 0.55rem;
  }

  .persistent-audio-btn {
    min-height: 44px;
    border-radius: var(--control-radius);
    font-weight: 700;
  }

  .persistent-audio-range,
  .persistent-audio-volume {
    grid-column: 1 / -1;
    min-height: 40px;
  }

  .persistent-video-bar {
    bottom: calc(10.5rem + env(safe-area-inset-bottom, 0px));
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 0.65rem 0.75rem;
    padding: 0.7rem 0.75rem;
  }

  .persistent-video-main {
    grid-column: 2;
    grid-row: 1;
  }

  .persistent-video-thumb {
    grid-column: 1;
    grid-row: 1;
  }

  .persistent-video-controls {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .persistent-video-thumb-play {
    opacity: 1;
  }

  .persistent-video-volume input[type='range'] {
    width: 64px;
  }

  .birthday-easter-egg {
    margin: 0.5rem max(0.75rem, env(safe-area-inset-left, 0px)) 0;
    border-radius: var(--radius-xl);
  }
}

@media (max-width: 480px) {
  .page-content {
    padding-left: max(0.65rem, env(safe-area-inset-left, 0px));
    padding-right: max(0.65rem, env(safe-area-inset-right, 0px));
    padding-bottom: calc(7.75rem + env(safe-area-inset-bottom, 0px));
  }

  .persistent-audio-copy strong,
  .persistent-video-copy strong {
    font-size: 0.95rem;
  }

  .persistent-audio-copy span,
  .persistent-video-copy span {
    font-size: 0.82rem;
  }

  .scroll-buttons {
    bottom: calc(6.25rem + env(safe-area-inset-bottom, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-overlay {
    animation: none;
  }

  .page-content > * {
    animation: none;
  }
}

/* 頁面切換動畫 */
.page-content > * {
  animation: slideInUp 0.6s ease;
}

/* 滾動按鈕 */
.scroll-buttons {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right, 0px));
  bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-fixed);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  pointer-events: none;
}

.scroll-buttons .scroll-btn {
  pointer-events: auto;
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
  border-radius: var(--radius-xl);
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
  width: min(960px, calc(100vw - 2rem));
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr) auto;
  gap: 0.85rem 1rem;
  align-items: center;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: color-mix(in oklab, var(--bg-surface) 92%, transparent);
  backdrop-filter: blur(18px) saturate(1.05);
  -webkit-backdrop-filter: blur(18px) saturate(1.05);
  box-shadow: var(--elevation-3);
  z-index: calc(var(--z-fixed) + 1);
}

.persistent-video-thumb {
  position: relative;
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: oklch(0.14 0 0);
  aspect-ratio: 16 / 9;
}

.persistent-video-preview {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background: var(--surface-strong);
}

.persistent-video-thumb-play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--primary) 88%, black 12%);
  color: var(--on-primary);
  font-size: 0.85rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out-expo);
}

.persistent-video-thumb:hover .persistent-video-thumb-play,
.persistent-video-thumb:focus-within .persistent-video-thumb-play {
  opacity: 1;
}

.persistent-video-thumb-play:focus-visible {
  opacity: 1;
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.persistent-video-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.persistent-video-copy {
  min-width: 0;
}

.persistent-video-kicker {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 650;
  letter-spacing: 0.02em;
}

.persistent-video-copy strong,
.persistent-video-copy span {
  display: block;
}

.persistent-video-copy strong {
  margin-top: 0.1rem;
  font-family: var(--font-body);
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persistent-video-copy span {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persistent-video-progress-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.45rem;
  align-items: center;
}

.persistent-video-time {
  font-size: 0.72rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  white-space: nowrap;
}

.persistent-video-progress {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 5px;
  border-radius: var(--radius-full);
  background: var(--bg-inset);
  outline: none;
  cursor: pointer;
}

.persistent-video-progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--bg-surface);
  box-shadow: var(--elevation-1);
  cursor: pointer;
}

.persistent-video-progress::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border: 2px solid var(--bg-surface);
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.persistent-video-controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.persistent-video-btn {
  appearance: none;
  border: 1px solid var(--border-subtle);
  background: var(--bg-muted);
  color: var(--text-primary);
  min-width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color var(--duration-fast) ease, border-color var(--duration-fast) ease;
}

.persistent-video-btn:hover {
  background: var(--bg-inset);
  border-color: var(--border-strong);
}

.persistent-video-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.persistent-video-btn-close {
  background: var(--danger-light);
  color: var(--danger-text);
  border-color: transparent;
}

.persistent-video-btn-close:hover {
  background: color-mix(in oklab, var(--danger) 22%, transparent);
}

.persistent-video-volume {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.45rem;
  border-radius: var(--radius-md);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.persistent-video-volume input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 72px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--bg-inset);
  outline: none;
  cursor: pointer;
}

.persistent-video-volume input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.persistent-video-volume input[type='range']::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.birthday-easter-egg {
  position: relative;
  margin: 0.35rem 0 0.75rem;
  border-radius: var(--radius-xl);
  overflow: hidden;
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
  background: var(--danger-solid);
  box-shadow: var(--elevation-3);
  animation: birthdayConfettiFall linear infinite;
}

.birthday-easter-egg__piece:nth-child(3n) {
  background: var(--primary-solid);
}

.birthday-easter-egg__piece:nth-child(4n) {
  background: var(--success-solid);
}

.birthday-easter-egg__card {
  position: relative;
  width: 100%;
  padding: 1.45rem 1.6rem 1.35rem;
  border: 1px solid color-mix(in oklab, var(--warning) 28%, var(--border-color));
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at top right, color-mix(in oklab, var(--accent) 16%, transparent), transparent 46%),
    var(--bg-surface);
  box-shadow: var(--elevation-1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  animation: birthdayCardEntrance 0.55s ease;
}

.birthday-easter-egg__copy {
  min-width: 0;
  padding-right: 2.25rem;
}

.birthday-easter-egg__close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: var(--control-radius);
  background: var(--surface-hover);
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
}

.birthday-easter-egg__eyebrow {
  margin-bottom: 0.7rem;
  color: var(--primary-strong);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.birthday-easter-egg__card h2 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: clamp(1.55rem, 3vw, 2.4rem);
  line-height: 1.08;
}

.birthday-easter-egg__lead,
.birthday-easter-egg__note {
  margin: 0.55rem 0 0;
  color: var(--text-muted);
  font-size: 0.96rem;
}

.birthday-easter-egg__headline {
  margin: 0.85rem 0 0;
  color: var(--primary-text);
  font-family: var(--font-display);
  font-size: clamp(1.05rem, 2vw, 1.45rem);
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
  width: 48px;
  height: 48px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--control-radius);
  cursor: pointer;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--elevation-1);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.scroll-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-3);
}

.scroll-btn:active {
  transform: scale(0.96);
}

.scroll-top {
  background: var(--primary-solid);
  color: var(--on-primary);
  border-color: transparent;
}

.scroll-bottom {
  background: var(--bg-surface);
  color: var(--text-secondary);
  border-color: var(--border-subtle);
}

/* 開發模式調試資訊 */
.scroll-debug-info {
  position: fixed;
  top: 100px;
  right: 20px;
  background: var(--surface-strong);
  color: var(--text-inverse);
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
    margin-top: 0.2rem;
  }
  .birthday-easter-egg__card {
    padding: 1.45rem 1rem 1.15rem;
    border-radius: var(--radius-xl);
    gap: 0.85rem;
  }
  .birthday-easter-egg__headline {
    line-height: 1.2;
  }
  .birthday-easter-egg__copy {
    padding-right: 1.8rem;
  }
}

@media (max-width: 480px) {
  .scroll-btn { width: 40px; height: 40px; font-size: 1rem; }
  .persistent-audio-controls {
    grid-template-columns: 1fr;
  }

  .persistent-video-bar {
    grid-template-columns: 1fr;
  }

  .persistent-video-thumb,
  .persistent-video-main,
  .persistent-video-controls {
    grid-column: 1;
    grid-row: auto;
  }

  .persistent-video-thumb {
    max-width: 180px;
  }

  .persistent-video-volume input[type='range'] {
    width: 56px;
  }
}
</style>

<!-- 全域暗黑模式樣式 -->
<style>
/* ============================================================
   全域細修層（非 scoped）
   原本這裡有兩百多行 :global(.dark) 規則 —— 非 scoped 的 <style>
   不會編譯 :global()，那些選擇器原樣輸出後被瀏覽器丟棄，從未生效。
   深色模式改由 variables.css 的 token 單一來源負責。
   ============================================================ */

/* 卡片：靜止只留髮絲陰影，hover 才真的浮起來 */
.stat-card,
.subscription-card,
.food-card,
.video-card,
.image-card {
  box-shadow: var(--elevation-1);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.stat-card:hover,
.subscription-card:hover,
.food-card:hover,
.video-card:hover,
.image-card:hover {
  box-shadow: var(--elevation-2);
}

.scroll-btn {
  box-shadow: var(--elevation-1) !important;
}

.scroll-btn:hover {
  box-shadow: var(--elevation-3) !important;
}

/* 表單控件的共同底：頁面自己的樣式仍然優先，這裡只補沒寫到的部分 */
input:not([type='checkbox']):not([type='radio']):not([type='range']),
select,
textarea {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--control-radius);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

input:not([type='checkbox']):not([type='radio']):not([type='range']):focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ring);
}

::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

/* 語意狀態標籤：淡染底 + 同色字，深淺色都由 token 推導 */
.status-badge.not-cached,
.status-badge.blob-missing {
  background: var(--danger-light);
  color: var(--danger-text);
}

.status-badge.blob-exists {
  background: var(--info-light);
  color: var(--info-text);
}
</style>
