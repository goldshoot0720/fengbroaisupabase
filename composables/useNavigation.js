// composables/useNavigation.js
// 導航管理 - 頁面切換和側邊欄控制
import { ref, computed } from 'vue'

// 共享狀態
const currentPage = ref('home')
const sidebarOpen = ref(false)

// 頁面配置
const pages = [
  { id: 'home', name: '鋒兄首頁', icon: '🏠', title: '🏠 鋒兄首頁', subtitle: '歡迎來到鋒兄管理系統' },
  { id: 'dashboard', name: '鋒兄儀表', icon: '📊', title: '📊 鋒兄儀表', subtitle: '總覽系統數據與統計資訊' },
  { id: 'subscription', name: '鋒兄訂閱', icon: '💳', title: '💳 鋒兄訂閱', subtitle: '管理訂閱服務與費用追蹤' },
  { id: 'food', name: '鋒兄食品', icon: '🛒', title: '🛒 鋒兄食品', subtitle: '管理食品項目與庫存記錄' },
  { id: 'note', name: '鋒兄筆記', icon: '📝', title: '📝 鋒兄筆記', subtitle: '記錄與管理個人筆記內容' },
  { id: 'common', name: '鋒兄常用', icon: '⭐', title: '⭐ 鋒兄常用', subtitle: '快速存取常用功能與連結' },
  { id: 'gallery', name: '鋒兄圖片', icon: '🖼️', title: '🖼️ 鋒兄圖片', subtitle: '瀏覽與管理圖片庫' },
  { id: 'video', name: '鋒兄影片', icon: '🎥', title: '🎥 鋒兄影片', subtitle: '瀏覽與管理影片內容' },
  { id: 'music', name: '鋒兄音樂', icon: '🎵', title: '🎵 鋒兄音樂', subtitle: '播放與管理音樂收藏' },
  { id: 'document', name: '鋒兄文件', icon: '📄', title: '📄 鋒兄文件', subtitle: '管理與查閱文件資料' },
  { id: 'podcast', name: '鋒兄播客', icon: '🎙️', title: '🎙️ 鋒兄播客', subtitle: '收聽與管理播客節目' },
  { id: 'bank', name: '鋒兄銀行', icon: '💰', title: '💰 鋒兄銀行', subtitle: '查看銀行帳戶與財務統計' },
  { id: 'routine', name: '鋒兄例行', icon: '📅', title: '📅 鋒兄例行', subtitle: '管理日常例行事務排程' },
  { id: 'settings', name: '鋒兄設定', icon: '⚙️', title: '⚙️ 鋒兄設定', subtitle: '設定個人資料與資料庫連線資訊' },
  { id: 'about', name: '鋒兄關於', icon: 'ℹ️', title: 'ℹ️ 鋒兄關於', subtitle: '關於鋒兄管理系統資訊' }
]

export const useNavigation = () => {
  // 當前頁面配置
  const currentPageConfig = computed(() => {
    return pages.find(p => p.id === currentPage.value) || pages[0]
  })

  // 頁面標題
  const pageTitle = computed(() => currentPageConfig.value.title)
  const pageSubtitle = computed(() => currentPageConfig.value.subtitle || '鋒兄AI')

  // 設置當前頁面
  const setCurrentPage = (pageId) => {
    currentPage.value = pageId
    
    // 手機版自動關閉側邊欄
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      sidebarOpen.value = false
    }
    
    // 更新頁面標題
    if (typeof document !== 'undefined') {
      const config = pages.find(p => p.id === pageId)
      if (config) {
        document.title = `${config.name} - 鋒兄AI Supabase`
      }
    }
  }

  // 切換側邊欄
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  // 關閉側邊欄
  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  // 響應式處理
  const handleResize = () => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      sidebarOpen.value = false
    }
  }

  return {
    currentPage,
    sidebarOpen,
    pages,
    currentPageConfig,
    pageTitle,
    pageSubtitle,
    setCurrentPage,
    toggleSidebar,
    closeSidebar,
    handleResize
  }
}
