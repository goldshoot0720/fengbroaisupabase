// composables/useTheme.js
// 主題管理 - 暗黑模式和主題色彩
import { ref, computed, onMounted } from 'vue'

// 共享狀態
const isDarkMode = ref(false)
const primaryColor = ref('#3b82f6')

export const useTheme = () => {
  // 初始化主題
  const initTheme = () => {
    if (typeof window === 'undefined') return
    
    const savedDarkMode = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    isDarkMode.value = savedDarkMode === 'true' || (!savedDarkMode && prefersDark)
    applyTheme()
  }

  // 切換暗黑模式
  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
    applyTheme()
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', isDarkMode.value.toString())
    }
  }

  // 套用主題
  const applyTheme = () => {
    if (typeof document === 'undefined') return
    
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // CSS 變數
  const cssVariables = computed(() => ({
    '--primary-color': primaryColor.value,
    '--primary-hover': adjustColor(primaryColor.value, -20),
    '--primary-light': adjustColor(primaryColor.value, 40),
  }))

  // 調整顏色亮度
  const adjustColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, Math.max(0, (num >> 16) + amt))
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt))
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt))
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
  }

  return {
    isDarkMode,
    primaryColor,
    cssVariables,
    initTheme,
    toggleDarkMode,
    applyTheme
  }
}
