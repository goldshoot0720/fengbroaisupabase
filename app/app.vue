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
    <VoiceInputPanel
      :current-page="currentPage"
      :pages="pages"
      @navigate="setCurrentPage"
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
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
import FengToolsPage from '../components/pages/FengToolsPage.vue'
import CommonPage from '../components/pages/CommonPage.vue'
import BankPage from '../components/pages/BankPage.vue'
import SettingsPage from '../components/pages/SettingsPage.vue'
import HomePage from '../components/pages/HomePage.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import ToastContainer from '../components/ui/ToastContainer.vue'
import VoiceInputPanel from '../components/ui/VoiceInputPanel.vue'

// 使用 composables
import { useSubscriptions } from '../composables/useSubscriptions'
import { useFoods } from '../composables/useFoods'
import { useTheme } from '../composables/useTheme'
import { useNavigation } from '../composables/useNavigation'
import { useScroll } from '../composables/useScroll'
import { useToast } from '../composables/useToast'
import { getSupabaseCredentials } from '../composables/useSettings'
import { useNotifications } from '../composables/useNotifications'
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
  toggleSidebar, 
  closeSidebar, 
  handleResize 
} = useNavigation()
const { warning: toastWarning } = useToast()
const { bootstrapNotifications } = useNotifications()
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
const TOOL_KEYS = ['biggo', 'manual', 'phone', 'tube', 'finance', 'news', 'image-voice']
const readStoredTool = () => {
  if (typeof localStorage === 'undefined') return 'biggo'
  const saved = localStorage.getItem(TOOL_STORAGE_KEY)
  return TOOL_KEYS.includes(saved) ? saved : 'biggo'
}
const activeTool = ref(readStoredTool())
const handleSidebarNavigate = (pageId) => {
  if (typeof pageId === 'string' && pageId.startsWith('tools:')) {
    const tool = pageId.split(':')[1]
    if (TOOL_KEYS.includes(tool)) {
      activeTool.value = tool
      setCurrentPage('tools')
      return
    }
  }

  // 鋒兄筆記/文件 子選單：note:notes → note，note:document → document
  if (typeof pageId === 'string' && pageId.startsWith('note:')) {
    const section = pageId.slice('note:'.length)
    if (section === 'document') {
      setCurrentPage('document')
      return
    }
    setCurrentPage('note')
    return
  }

  // 鋒兄音樂/播客 子選單：music:tracks → music，music:podcast → podcast
  if (typeof pageId === 'string' && pageId.startsWith('music:')) {
    const section = pageId.slice('music:'.length)
    if (section === 'podcast') {
      setCurrentPage('podcast')
      return
    }
    setCurrentPage('music')
    return
  }

  // 鋒兄設定/關於 子選單：settings:config → settings，settings:about → about
  if (typeof pageId === 'string' && pageId.startsWith('settings:')) {
    const section = pageId.slice('settings:'.length)
    if (section === 'about') {
      setCurrentPage('about')
      return
    }
    setCurrentPage('settings')
    return
  }

  setCurrentPage(pageId)
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
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--accent) 14%, transparent), transparent 24%),
    radial-gradient(circle at right 12%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 26%),
    var(--bg-primary);
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
  background: color-mix(in oklab, oklch(0.12 0.03 248) 52%, transparent);
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
    border-radius: 22px;
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
    border-radius: 16px;
    font-size: 1rem;
    border: 1px solid var(--border-color);
    background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: var(--elevation-2);
  }

  .persistent-audio-bar,
  .persistent-video-bar {
    left: max(0.55rem, env(safe-area-inset-left, 0px));
    right: max(0.55rem, env(safe-area-inset-right, 0px));
    transform: none;
    width: auto;
    border-radius: 18px;
    border: 1px solid var(--border-color);
    background: color-mix(in oklab, var(--bg-secondary) 94%, transparent);
    backdrop-filter: blur(18px) saturate(1.1);
    -webkit-backdrop-filter: blur(18px) saturate(1.1);
    box-shadow: 0 14px 36px color-mix(in oklab, oklch(0.16 0.03 248) 22%, transparent);
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
    border-radius: 14px;
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
    border-radius: 20px;
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
  background: oklch(0.12 0.02 248);
  aspect-ratio: 16 / 9;
}

.persistent-video-preview {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background: #000;
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
  color: var(--text-inverse);
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
  color: var(--danger);
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
  border-radius: 30px;
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
  width: 100%;
  padding: 1.45rem 1.6rem 1.35rem;
  border: 1px solid color-mix(in oklab, var(--warning) 28%, var(--border-color));
  border-radius: 30px;
  background:
    linear-gradient(145deg, color-mix(in oklab, var(--bg-secondary) 92%, white), rgba(255, 247, 237, 0.94)),
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.24), transparent 42%);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
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
  font-size: clamp(1.55rem, 3vw, 2.4rem);
  line-height: 1.08;
}

.birthday-easter-egg__lead,
.birthday-easter-egg__note {
  margin: 0.55rem 0 0;
  color: #6b7280;
  font-size: 0.96rem;
}

.birthday-easter-egg__headline {
  margin: 0.85rem 0 0;
  color: #dc2626;
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
  border: 1px solid color-mix(in oklab, var(--primary) 28%, var(--border-color));
  border-radius: 16px;
  cursor: pointer;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.scroll-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px color-mix(in oklab, oklch(0.18 0.03 248) 18%, transparent);
}

.scroll-btn:active {
  transform: scale(0.96);
}

.scroll-top {
  background: color-mix(in oklab, var(--primary) 88%, black 8%);
  color: white;
}

.scroll-bottom {
  background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
  color: var(--text-primary);
  border-color: var(--border-color);
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
    margin-top: 0.2rem;
  }
  .birthday-easter-egg__card {
    padding: 1.45rem 1rem 1.15rem;
    border-radius: 26px;
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
