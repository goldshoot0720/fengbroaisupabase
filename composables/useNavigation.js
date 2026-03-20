import { ref, computed } from 'vue'

const currentPage = ref('home')
const sidebarOpen = ref(false)

const pages = [
  { id: 'home', name: '首頁', icon: '01', title: '控制首頁', subtitle: '用編輯式視角快速進入所有資料入口' },
  { id: 'dashboard', name: '總覽', icon: '02', title: '資訊總覽', subtitle: '集中查看訂閱、食品與日常資料的關鍵狀態' },
  { id: 'subscription', name: '訂閱管理', icon: '03', title: '訂閱管理', subtitle: '追蹤付款節點、平台成本與續訂節奏' },
  { id: 'food', name: '食品管理', icon: '04', title: '食品管理', subtitle: '掌握庫存、保存期限與補貨優先順序' },
  { id: 'note', name: '筆記', icon: '05', title: '筆記系統', subtitle: '記錄碎片想法與日常維運資訊' },
  { id: 'common', name: '常用帳號', icon: '06', title: '常用帳號', subtitle: '整理常用登入資訊與共享入口' },
  { id: 'gallery', name: '圖庫', icon: '07', title: '圖像資料', subtitle: '管理視覺素材與收藏內容' },
  { id: 'video', name: '影片資料', icon: '08', title: '影片資料庫', subtitle: '統整影片檔案與來源資訊' },
  { id: 'music', name: '音樂資料', icon: '09', title: '音樂資料庫', subtitle: '整理曲目、播放來源與音訊內容' },
  { id: 'document', name: '文件', icon: '10', title: '文件中心', subtitle: '管理結構化文件與工作紀錄' },
  { id: 'podcast', name: 'Podcast', icon: '11', title: 'Podcast 管理', subtitle: '收整節目、連結與音訊筆記' },
  { id: 'bank', name: '銀行資訊', icon: '12', title: '銀行資訊', subtitle: '查看帳務資料與金融備忘錄' },
  { id: 'routine', name: '例行流程', icon: '13', title: '例行流程', subtitle: '追蹤固定任務與週期性工作' },
  { id: 'settings', name: '設定', icon: '14', title: '系統設定', subtitle: '調整資料來源、帳號與介面偏好' },
  { id: 'about', name: '關於', icon: '15', title: '關於系統', subtitle: '了解這套管理平台的架構與定位' }
]

export const useNavigation = () => {
  const currentPageConfig = computed(() => {
    return pages.find((page) => page.id === currentPage.value) || pages[0]
  })

  const pageTitle = computed(() => currentPageConfig.value.title)
  const pageSubtitle = computed(() => currentPageConfig.value.subtitle || '科技編輯式管理平台')

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
