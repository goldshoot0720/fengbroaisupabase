// composables/useTheme.js
// Theme management — dark mode via documentElement class + design tokens (variables.css).
// Do not reintroduce runtime hex primary overrides; tokens own --primary.
import { ref } from 'vue'

// Shared state
const isDarkMode = ref(false)

export const useTheme = () => {
  const initTheme = () => {
    if (typeof window === 'undefined') return

    const savedDarkMode = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    isDarkMode.value = savedDarkMode === 'true' || (!savedDarkMode && prefersDark)
    applyTheme()
  }

  const toggleDarkMode = () => {
    isDarkMode.value = !isDarkMode.value
    applyTheme()

    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', isDarkMode.value.toString())
    }
  }

  const applyTheme = () => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    root.dataset.theme = isDarkMode.value ? 'dark' : 'light'
    root.classList.toggle('dark', isDarkMode.value)
  }

  return {
    isDarkMode,
    initTheme,
    toggleDarkMode,
    applyTheme
  }
}
