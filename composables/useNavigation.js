import { ref, computed } from 'vue'

const currentPage = ref('home')
const sidebarOpen = ref(false)

const pages = [
  { id: 'home', name: '鋒兄首頁', icon: '01', title: '鋒兄首頁', subtitle: '整理所有資料入口與目前工作區焦點。' },
  { id: 'dashboard', name: '鋒兄儀表', icon: '02', title: '鋒兄儀表', subtitle: '快速查看各資料區塊的目前狀態與重點摘要。' },
  { id: 'subscription', name: '鋒兄訂閱', icon: '03', title: '鋒兄訂閱', subtitle: '整理站點、價格、帳號與續訂日期。' },
  { id: 'food', name: '鋒兄食品', menuHint: '（＋商品庫存）', icon: '04', title: '鋒兄食品', titleHint: '（＋商品庫存）', subtitle: '記錄品項、價格、商店與日期資訊。' },
  {
    id: 'note',
    name: '鋒兄筆記/文件',
    icon: '05',
    title: '鋒兄筆記/文件',
    subtitle: '整理靈感、會議紀錄、讀書筆記與結構化文件。',
    children: [
      {
        id: 'note:notes',
        page: 'note',
        name: '鋒兄筆記',
        menuHint: '靈感與紀錄',
        title: '鋒兄筆記',
        subtitle: '整理靈感、會議紀錄、讀書筆記與附件。'
      },
      {
        id: 'note:document',
        page: 'document',
        name: '鋒兄文件',
        menuHint: '結構化文件',
        title: '鋒兄文件',
        subtitle: '管理結構化文件與工作紀錄。'
      }
    ]
  },
  { id: 'common', name: '鋒兄常用', icon: '07', title: '鋒兄常用', subtitle: '集中整理常用帳號、備註與附加資訊。' },
  { id: 'gallery', name: '鋒兄圖片', icon: '08', title: '鋒兄圖片', subtitle: '管理圖片素材與封面檔案。' },
  { id: 'video', name: '鋒兄影片', icon: '09', title: '鋒兄影片', subtitle: '管理影片檔、封面、分類與參考資料。' },
  {
    id: 'music',
    name: '鋒兄音樂/播客',
    icon: '10',
    title: '鋒兄音樂/播客',
    subtitle: '整理音樂作品、播客音檔、封面與歌詞。',
    children: [
      {
        id: 'music:tracks',
        page: 'music',
        name: '鋒兄音樂',
        menuHint: '作品與歌詞',
        title: '鋒兄音樂',
        subtitle: '整理音樂作品、封面、歌詞與音檔。'
      },
      {
        id: 'music:podcast',
        page: 'podcast',
        name: '鋒兄播客',
        menuHint: '節目與音檔',
        title: '鋒兄播客',
        subtitle: '整理播客音檔、封面與備註。'
      }
    ]
  },
  { id: 'bank', name: '鋒兄銀行', menuHint: '( +電子票證)', icon: '13', title: '鋒兄銀行 (+電子票證)', subtitle: '整理存款、提款、轉帳與卡片資訊。' },
  { id: 'routine', name: '鋒兄例行', icon: '14', title: '鋒兄例行', subtitle: '記錄固定流程、連結與最近執行日期。' },
  {
    id: 'tools',
    name: '鋒兄工具',
    menuHint: '（＋比價）',
    icon: '06',
    title: '鋒兄工具',
    subtitle: '整合比價、YouTube、金融、新聞與圖片語音成片工具。',
    children: [
      { id: 'tools:biggo', tool: 'biggo', name: '鋒兄比價', menuHint: 'BigGo' },
      { id: 'tools:manual', tool: 'manual', name: '手動紀錄', menuHint: '自訂價錢' },
      { id: 'tools:phone', tool: 'phone', name: '手機比價', menuHint: '通路價格' },
      { id: 'tools:tube', tool: 'tube', name: '鋒兄Tube', menuHint: 'YouTube' },
      { id: 'tools:finance', tool: 'finance', name: '鋒兄金融', menuHint: 'CNBC 報價' },
      { id: 'tools:news', tool: 'news', name: '鋒兄新聞', menuHint: '鎖定網站焦點' },
      { id: 'tools:image-voice', tool: 'image-voice', name: '圖片語音成片', menuHint: '圖片+語音=影片 · 預設男聲' }
    ]
  },
  { id: 'settings', name: '鋒兄設定', icon: '15', title: '鋒兄設定', subtitle: '管理來源、匯入匯出與儲存設定。' },
  { id: 'about', name: '鋒兄關於', icon: '16', title: '鋒兄關於', subtitle: '查看系統說明與目前工作區資訊。' }
]

/** Resolve top-level or nested child page config by id / child.page */
const findPageConfig = (pageId) => {
  for (const page of pages) {
    if (page.id === pageId) return page
    if (!page.children?.length) continue
    const child = page.children.find(
      (item) => item.id === pageId || item.page === pageId
    )
    if (child) {
      return {
        ...page,
        title: child.title || child.name || page.title,
        titleHint: child.titleHint || '',
        subtitle: child.subtitle || child.menuHint || page.subtitle
      }
    }
  }
  return pages[0]
}

/** Whether a parent menu should show as active for the current page */
export const isNavParentActive = (page, currentPageId, activeTool = '') => {
  if (!page) return false
  if (page.id === currentPageId) return true
  if (!page.children?.length) return false
  if (page.id === 'tools' && currentPageId === 'tools') return true
  return page.children.some(
    (child) =>
      child.page === currentPageId ||
      child.id === currentPageId ||
      (page.id === 'tools' && currentPageId === 'tools' && child.tool === activeTool)
  )
}

/** Whether a parent should expand its children in the mobile drawer */
export const isNavParentExpanded = (page, currentPageId) => {
  if (!page?.children?.length) return false
  if (page.id === 'tools') return true
  if (page.id === currentPageId) return true
  return page.children.some(
    (child) => child.page === currentPageId || child.id === currentPageId
  )
}

/** Whether a child menu item is the active leaf */
export const isNavChildActive = (page, child, currentPageId, activeTool = '') => {
  if (!child) return false
  if (child.tool) {
    return currentPageId === page?.id && activeTool === child.tool
  }
  if (child.page) return currentPageId === child.page
  return currentPageId === child.id
}

export const useNavigation = () => {
  const currentPageConfig = computed(() => findPageConfig(currentPage.value))

  const pageTitle = computed(() => currentPageConfig.value.title)
  const pageTitleHint = computed(() => currentPageConfig.value.titleHint || '')
  const pageSubtitle = computed(() => currentPageConfig.value.subtitle || '在這裡整理你的工作資料。')

  const setCurrentPage = (pageId) => {
    currentPage.value = pageId

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      sidebarOpen.value = false
    }

    if (typeof document !== 'undefined') {
      const config = findPageConfig(pageId)
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
