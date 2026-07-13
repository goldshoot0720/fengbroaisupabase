// composables/useScroll.js
// 滾動管理 - 滾動按鈕和滾動行為
import { ref } from 'vue'

export const useScroll = (containerSelector = '.page-content') => {
  const showScrollButtons = ref(false)
  const showTopButton = ref(false)
  const showBottomButton = ref(false)
  const scrollProgress = ref(0)

  // 滾動到頂部
  const scrollToTop = () => {
    const container = document.querySelector(containerSelector)
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 滾動到底部
  const scrollToBottom = () => {
    const container = document.querySelector(containerSelector)
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  // 處理滾動事件
  const handleScroll = () => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const hasScroll = scrollHeight > clientHeight + 10

    // 計算滾動進度
    scrollProgress.value = hasScroll 
      ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
      : 0

    // 顯示按鈕邏輯
    showTopButton.value = hasScroll && scrollTop > 50
    showBottomButton.value = hasScroll && (scrollHeight - scrollTop - clientHeight) > 50
    showScrollButtons.value = hasScroll
  }

  // 設置滾動監聽
  const setupScrollListener = () => {
    if (typeof window === 'undefined') return

    const container = document.querySelector(containerSelector)
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      setTimeout(handleScroll, 100)
    }
  }

  // 移除滾動監聽
  const removeScrollListener = () => {
    if (typeof window === 'undefined') return

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
