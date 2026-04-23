import { ref, computed } from 'vue'

const currentPage = ref('home')
const sidebarOpen = ref(false)

const pages = [
  { id: 'home', name: '首頁', icon: '01', title: '鋒兄首頁', subtitle: '整理所有資料入口與目前工作區焦點。' },
  { id: 'dashboard', name: '總覽', icon: '02', title: '總覽儀表板', subtitle: '快速查看各資料區塊的目前狀態與重點摘要。' },
  { id: 'subscription', name: '訂閱管理', icon: '03', title: '訂閱管理', subtitle: '整理站點、價格、帳號與續訂日期。' },
  { id: 'food', name: '鋒兄食品', menuHint: '＋商品庫存', icon: '04', title: '鋒兄食品', titleHint: '（＋商品庫存）', subtitle: '記錄品項、價格、商店與日期資訊。' },
  { id: 'note', name: '筆記', icon: '05', title: '鋒兄筆記', subtitle: '整理靈感、會議紀錄、讀書筆記與附件。' },
  { id: 'common', name: '常用帳號', icon: '07', title: '常用帳號', subtitle: '集中整理常用帳號、備註與附加資訊。' },
  { id: 'gallery', name: '圖庫', icon: '08', title: '圖片庫', subtitle: '管理圖片素材與封面檔案。' },
  { id: 'video', name: '影片資料', icon: '09', title: '影片資料庫', subtitle: '管理影片檔、封面、分類與參考資料。' },
  { id: 'music', name: '音樂資料', icon: '10', title: '音樂資料庫', subtitle: '整理音樂作品、封面、歌詞與音檔。' },
  { id: 'document', name: '文件', icon: '11', title: '文件中心', subtitle: '管理結構化文件與工作紀錄。' },
  { id: 'podcast', name: 'Podcast', icon: '12', title: 'Podcast 管理', subtitle: '整理播客音檔、封面與備註。' },
  { id: 'bank', name: '銀行資訊', icon: '13', title: '銀行資訊', subtitle: '整理存款、提款、轉帳與卡片資訊。' },
  { id: 'routine', name: '例行流程', icon: '14', title: '例行流程', subtitle: '記錄固定流程、連結與最近執行日期。' },
  { id: 'tools', name: '鋒兄工具', icon: '06', title: '鋒兄工具', subtitle: '整合 BigGo 與手機通路比價工具。' },
  { id: 'settings', name: '設定', icon: '15', title: '系統設定', subtitle: '管理來源、匯入匯出與儲存設定。' },
  { id: 'about', name: '關於', icon: '16', title: '關於系統', subtitle: '查看系統說明與目前工作區資訊。' }
]

export const useNavigation = () => {
  const currentPageConfig = computed(() => {
    return pages.find(page => page.id === currentPage.value) || pages[0]
  })

  const pageTitle = computed(() => currentPageConfig.value.title)
  const pageTitleHint = computed(() => currentPageConfig.value.titleHint || '')
  const pageSubtitle = computed(() => currentPageConfig.value.subtitle || '在這裡整理你的工作資料。')

  const setCurrentPage = (pageId) => {
    currentPage.value = pageId

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      sidebarOpen.value = false
    }

    if (typeof document !== 'undefined') {
      const config = pages.find(page => page.id === pageId)
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
    pageTitleHint,
    pageSubtitle,
    setCurrentPage,
    toggleSidebar,
    closeSidebar,
    handleResize
  }
}
