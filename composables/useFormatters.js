// composables/useFormatters.js
// 共用的格式化函數

export const useFormatters = () => {
  // 格式化檔案大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化快取大小
  const formatCacheSize = (bytes) => {
    return formatFileSize(bytes)
  }

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 取得日期樣式類別（訂閱用）
  const getDateClass = (dateString) => {
    if (!dateString) return ''
    
    const today = new Date()
    const targetDate = new Date(dateString)
    const diffTime = targetDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'date-overdue'
    if (diffDays <= 7) return 'date-soon'
    return 'date-normal'
  }

  // 取得食物狀態樣式類別
  const getFoodStatusClass = (todate) => {
    if (!todate) return ''
    
    const today = new Date()
    const expiry = new Date(todate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'food-expired'
    if (diffDays <= 3) return 'food-critical'
    if (diffDays <= 7) return 'food-warning'
    return 'food-normal'
  }

  // 取得到期日樣式類別
  const getExpiryClass = (todate) => {
    if (!todate) return ''
    
    const today = new Date()
    const expiry = new Date(todate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'date-overdue'
    if (diffDays <= 3) return 'date-critical'
    if (diffDays <= 7) return 'date-soon'
    return 'date-normal'
  }

  return {
    formatFileSize,
    formatCacheSize,
    formatDate,
    getDateClass,
    getFoodStatusClass,
    getExpiryClass
  }
}
