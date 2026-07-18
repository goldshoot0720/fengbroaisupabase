// composables/useScroll.js
// 滾動管理 - 右下角回到頂端 / 跳到底端
import { ref } from 'vue'

const getScrollMetrics = (containerSelector) => {
  const container =
    typeof document !== 'undefined'
      ? document.querySelector(containerSelector)
      : null

  // 若指定容器真的可捲動，優先用容器；否則用視窗（目前 layout 是 document 捲動）
  if (container && container.scrollHeight > container.clientHeight + 10) {
    return {
      target: 'container',
      el: container,
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight
    }
  }

  const doc = document.documentElement
  const body = document.body
  const scrollTop =
    window.pageYOffset || doc.scrollTop || body.scrollTop || 0
  const scrollHeight = Math.max(
    body.scrollHeight,
    doc.scrollHeight,
    body.offsetHeight,
    doc.offsetHeight
  )
  const clientHeight = window.innerHeight || doc.clientHeight

  return {
    target: 'window',
    el: null,
    scrollTop,
    scrollHeight,
    clientHeight
  }
}

export const useScroll = (containerSelector = '.page-content') => {
  const showScrollButtons = ref(false)
  const showTopButton = ref(false)
  const showBottomButton = ref(false)
  const scrollProgress = ref(0)

  const scrollToTop = () => {
    const metrics = getScrollMetrics(containerSelector)
    if (metrics.target === 'container' && metrics.el) {
      metrics.el.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToBottom = () => {
    const metrics = getScrollMetrics(containerSelector)
    if (metrics.target === 'container' && metrics.el) {
      metrics.el.scrollTo({
        top: metrics.el.scrollHeight,
        behavior: 'smooth'
      })
    }
    const bottom = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    )
    window.scrollTo({ top: bottom, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } =
      getScrollMetrics(containerSelector)
    const hasScroll = scrollHeight > clientHeight + 40

    scrollProgress.value = hasScroll
      ? Math.round((scrollTop / Math.max(scrollHeight - clientHeight, 1)) * 100)
      : 0

    // 頁面可捲動時右下角同時顯示上下箭頭
    showScrollButtons.value = hasScroll
    showTopButton.value = hasScroll
    showBottomButton.value = hasScroll
  }

  const setupScrollListener = () => {
    if (typeof window === 'undefined') return

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    const container = document.querySelector(containerSelector)
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
    }

    // 內容載入後再量一次高度
    setTimeout(handleScroll, 100)
    setTimeout(handleScroll, 500)
    setTimeout(handleScroll, 1200)
  }

  const removeScrollListener = () => {
    if (typeof window === 'undefined') return

    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', handleScroll)

    const container = document.querySelector(containerSelector)
    if (container) {
      container.removeEventListener('scroll', handleScroll)
    }
  }

  return {
    showScrollButtons,
    showTopButton,
    showBottomButton,
    scrollProgress,
    scrollToTop,
    scrollToBottom,
    handleScroll,
    setupScrollListener,
    removeScrollListener
  }
}
