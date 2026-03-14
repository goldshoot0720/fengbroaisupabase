// composables/useToast.js
// Toast 通知管理
import { ref, reactive } from 'vue'

// 共享狀態
const toasts = ref([])
let toastId = 0

export const useToast = () => {
  // 添加 Toast
  const addToast = (options) => {
    const id = ++toastId
    const toast = {
      id,
      message: options.message || '',
      variant: options.variant || 'info',
      duration: options.duration ?? 3000,
      closable: options.closable ?? true
    }
    
    toasts.value.push(toast)
    
    // 自動移除
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }
    
    return id
  }

  // 移除 Toast
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  // 清除所有 Toast
  const clearToasts = () => {
    toasts.value = []
  }

  // 快捷方法
  const info = (message, options = {}) => {
    return addToast({ ...options, message, variant: 'info' })
  }

  const success = (message, options = {}) => {
    return addToast({ ...options, message, variant: 'success' })
  }

  const warning = (message, options = {}) => {
    return addToast({ ...options, message, variant: 'warning' })
  }

  const error = (message, options = {}) => {
    return addToast({ ...options, message, variant: 'error' })
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    info,
    success,
    warning,
    error
  }
}
