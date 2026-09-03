import { computed } from 'vue'

const pages = [
  { id: 'home', name: '首頁', iconName: 'home', title: '鋒兄首頁', subtitle: '查看今天最需要處理的事項。' },
  { id: 'dashboard', name: '儀表', iconName: 'dashboard', title: '鋒兄儀表', subtitle: '快速查看費用、到期項目與資料狀態。' },
  {
    id: 'daily', name: '日常管理', iconName: 'daily', title: '日常管理', subtitle: '管理訂閱、食品與例行事項。',
    children: [
      { id: 'subscription', page: 'subscription', name: '訂閱', title: '鋒兄訂閱', subtitle: '管理付款、續訂與到期日。' },
      { id: 'trial-purchase', page: 'trial-purchase', name: '試用/首購', title: '鋒兄試用/首購', subtitle: '依服務展開帳號、試用與首購狀態。' },
      { id: 'reinstall', page: 'reinstall', name: '重灌', title: '鋒兄重灌', subtitle: '整理 Windows／Mac 重灌軟體、序號與訂閱費用。' },
      { id: 'food', page: 'food', name: '食品', title: '鋒兄食品', subtitle: '管理食品與庫存期限。' },
      { id: 'routine', page: 'routine', name: '例行', title: '鋒兄例行', subtitle: '管理固定流程與最近執行日期。' },
    ]
  },
  {
    id: 'content', name: '內容中心', iconName: 'content', title: '內容中心', subtitle: '集中管理筆記、文件與媒體。',
    children: [
      { id: 'note', page: 'note', name: '筆記', title: '鋒兄筆記', subtitle: '整理筆記與附件。' },
      { id: 'document', page: 'document', name: '文件', title: '鋒兄文件', subtitle: '管理結構化文件。' },
      { id: 'gallery', page: 'gallery', name: '圖片', title: '鋒兄圖片', subtitle: '管理圖片素材。' },
      { id: 'video', page: 'video', name: '影片', title: '鋒兄影片', subtitle: '管理影片與封面。' },
      { id: 'music', page: 'music', name: '音樂', title: '鋒兄音樂', subtitle: '管理歌曲、歌詞與封面。' },
      { id: 'podcast', page: 'podcast', name: '播客', title: '鋒兄播客', subtitle: '管理播客音檔。' },
    ]
  },
  {
    id: 'finance', name: '財務與帳號', iconName: 'finance', title: '財務與帳號', subtitle: '管理銀行紀錄與常用帳號。',
    children: [
      { id: 'bank', page: 'bank', name: '銀行', title: '鋒兄銀行', subtitle: '管理銀行與電子票證紀錄。' },
      { id: 'common', page: 'common', name: '常用帳號', title: '鋒兄常用', subtitle: '管理常用帳號與備註。' },
    ]
  },
  {
    id: 'tools',
    name: '工具',
    iconName: 'tools',
    title: '鋒兄工具',
    subtitle: '整合比價、YouTube、金融、新聞、圖片語音、格式轉換、影片合併與影音轉檔。',
    children: [
      { id: 'tools:biggo', tool: 'biggo', name: '比價' },
      { id: 'tools:manual', tool: 'manual', name: '手動紀錄' },
      { id: 'tools:phone', tool: 'phone', name: '手機比價' },
      { id: 'tools:tube', tool: 'tube', name: '鋒兄 Tube' },
      { id: 'tools:finance', tool: 'finance', name: '金融' },
      { id: 'tools:news', tool: 'news', name: '新聞' },
      { id: 'tools:image-voice', tool: 'image-voice', name: '圖片語音成片' },
      { id: 'tools:image-convert', tool: 'image-convert', name: '圖片格式轉換' },
      { id: 'tools:video-merge', tool: 'video-merge', name: '影片合併' },
      { id: 'tools:yt-bili-dl', tool: 'yt-bili-dl', name: 'YT / B站轉檔' }
    ]
  },
  {
    id: 'settings',
    name: '設定',
    iconName: 'settings',
    title: '設定與關於',
    subtitle: '管理來源設定與系統說明。',
    children: [
      {
        id: 'settings',
        page: 'settings',
        name: '鋒兄設定',
        title: '鋒兄設定',
        subtitle: '管理來源、匯入匯出與儲存設定。'
      },
      {
        id: 'about',
        page: 'about',
        name: '鋒兄關於',
        title: '鋒兄關於',
        subtitle: '查看系統說明與目前工作區資訊。'
      }
    ]
  }
]

/** Product page ids accepted by `/?page=` (not child ids like `note:notes`). */
export const isAppPageId = (pageId) => {
  if (!pageId || typeof pageId !== 'string') return false
  for (const page of pages) {
    if (page.id === pageId) return true
    if (page.children?.some((child) => child.page === pageId)) return true
  }
  return false
}

/** Resolve top-level or nested child page config by id / child.page */
const findPageConfig = (pageId) => {
  for (const page of pages) {
    if (page.children?.length) {
      // Prefer leaf title when pageId matches a child (e.g. note → 鋒兄筆記,
      // not parent 鋒兄筆記/文件). Parent id often equals the default child's page.
      const child = page.children.find(
        (item) => item.id === pageId || item.page === pageId
      )
      if (child) {
        return {
          ...page,
          title: child.title || child.name || page.title,
          titleHint: child.titleHint || '',
          subtitle: child.subtitle || child.menuHint || page.subtitle,
          glyph: child.glyph || page.glyph
        }
      }
    }
    if (page.id === pageId) return page
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
  const currentPage = useState('feng-current-page', () => 'home')
  const sidebarOpen = useState('feng-sidebar-open', () => false)
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
