import { ref, computed } from 'vue'

const currentPage = ref('home')
const sidebarOpen = ref(false)

const pages = [
  { id: 'home', name: '首頁', icon: '01', title: '回到首頁', subtitle: '快速切換工作區與重點資料入口。' },
  { id: 'dashboard', name: '總覽', icon: '02', title: '營運總覽', subtitle: '查看訂閱、食材與常用資料的整體概況。' },
  { id: 'subscription', name: '訂閱管理', icon: '03', title: '訂閱管理', subtitle: '整理站點、付款週期與續訂提醒。' },
  { id: 'food', name: '食品管理', icon: '04', title: '食品管理', subtitle: '記錄價格、份量與日常採買資訊。' },
  { id: 'note', name: '筆記', icon: '05', title: '鋒兄筆記', subtitle: '整理想法、分類、附件與匯入匯出。' },
  { id: 'tools', name: '鋒兄工具', icon: '06', title: '鋒兄工具', subtitle: '整合比價、通路查價與歷史價格快照。' },
  { id: 'common', name: '常用帳號', icon: '07', title: '常用帳號', subtitle: '集中查看常用登入與備註資訊。' },
  { id: 'gallery', name: '圖庫', icon: '08', title: '圖片庫', subtitle: '整理圖片素材與封面資源。' },
  { id: 'video', name: '影片資料', icon: '09', title: '影片資料庫', subtitle: '管理影片檔案、封面與播放內容。' },
  { id: 'music', name: '音樂資料', icon: '10', title: '音樂資料庫', subtitle: '整理音檔、歌詞與語言版本。' },
  { id: 'document', name: '文件', icon: '11', title: '文件中心', subtitle: '管理壓縮檔、附件與工作紀錄。' },
  { id: 'podcast', name: 'Podcast', icon: '12', title: 'Podcast 管理', subtitle: '整理節目、來源與音訊素材。' },
  { id: 'bank', name: '銀行資訊', icon: '13', title: '銀行資訊', subtitle: '管理帳戶、卡片與轉帳資訊。' },
  { id: 'routine', name: '例行流程', icon: '14', title: '例行流程', subtitle: '維護固定工作與追蹤時間點。' },
  { id: 'settings', name: '設定', icon: '15', title: '系統設定', subtitle: '管理資料來源、同步與工具設定。' },
  { id: 'about', name: '關於', icon: '16', title: '關於系統', subtitle: '查看系統定位與功能說明。' }
]

export const useNavigation = () => {
  const currentPageConfig = computed(() => {
    return pages.find((page) => page.id === currentPage.value) || pages[0]
  })

  const pageTitle = computed(() => currentPageConfig.value.title)
  const pageSubtitle = computed(() => currentPageConfig.value.subtitle || '在這裡整理你的工作資料。')

  const setCurrentPage = (pageId) => {
    currentPage.value = pageId

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      sidebarOpen.value = false
    }

    if (typeof document !== 'undefined') {
      const config = pages.find((page) => page.id === pageId)
      if (config) {
        document.title = `${config.title} - Feng AI Supabase`
      }
    }
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const closeSidebar = () => {
    sidebarOpen.value = false
  }

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
