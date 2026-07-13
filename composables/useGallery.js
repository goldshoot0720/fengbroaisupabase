// composables/useGallery.js
// 圖片庫瀏覽邏輯：從 Supabase `image` 表載入，支援搜尋、檢視模式與燈箱
import { ref, computed } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'
import { useStorage } from './useStorage'

export const useGallery = () => {
  const galleryImages = ref([])
  const loading = ref(false)
  const error = ref(null)
  const searchQuery = ref('')
  const viewMode = ref('grid')
  const lightboxOpen = ref(false)
  const currentImageIndex = ref(0)

  const { getPublicUrl } = useStorage()

  const resolveUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value
    }
    return getPublicUrl(value) || value
  }

  const normalizeImage = (row) => {
    const name = row?.name || '未命名圖片'
    const file = row?.file || ''
    const url = resolveUrl(file)
    return {
      id: row?.id,
      name,
      displayName: name,
      file,
      url,
      category: row?.category || '',
      note: row?.note || '',
      filetype: row?.filetype || '',
      cover: row?.cover || '',
      ref: row?.ref || '',
      hash: row?.hash || '',
      created_at: row?.created_at || null
    }
  }

  const filteredImages = computed(() => {
    let filtered = galleryImages.value
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter((img) =>
        (img.name && img.name.toLowerCase().includes(query)) ||
        (img.displayName && img.displayName.toLowerCase().includes(query)) ||
        (img.category && img.category.toLowerCase().includes(query)) ||
        (img.note && img.note.toLowerCase().includes(query))
      )
    }
    return filtered
  })

  const currentLightboxImage = computed(() => {
    return filteredImages.value[currentImageIndex.value] || {}
  })

  const loadGalleryImages = async () => {
    const client = getSupabaseBrowserClient()
    if (!client) {
      error.value = '尚未設定 Supabase 連線'
      galleryImages.value = []
      return { success: false, error: error.value }
    }

    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await client
        .from('image')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      galleryImages.value = (data || []).map(normalizeImage)
      return { success: true, count: galleryImages.value.length }
    } catch (e) {
      console.error('[useGallery] 載入圖片失敗:', e)
      error.value = e?.message || '載入圖片失敗'
      galleryImages.value = []
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  const openLightbox = (index) => {
    if (index < 0 || index >= filteredImages.value.length) return
    currentImageIndex.value = index
    lightboxOpen.value = true
    if (import.meta.client) document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    lightboxOpen.value = false
    if (import.meta.client) document.body.style.overflow = ''
  }

  const nextImage = () => {
    if (currentImageIndex.value < filteredImages.value.length - 1) {
      currentImageIndex.value++
    }
  }

  const previousImage = () => {
    if (currentImageIndex.value > 0) {
      currentImageIndex.value--
    }
  }

  const handleImageError = (event) => {
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWclueJh+eEoeazleWKoOi8iDwvdGV4dD48L3N2Zz4='
  }

  const downloadImage = (image) => {
    if (!image?.url) return
    const link = document.createElement('a')
    link.href = image.url
    link.download = image.name || 'image'
    link.target = '_blank'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyImageUrl = async (image) => {
    try {
      const url = image?.url || ''
      const fullUrl = /^https?:\/\//i.test(url)
        ? url
        : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
      await navigator.clipboard.writeText(fullUrl)
      return { success: true }
    } catch (err) {
      console.error('複製失敗:', err)
      return { success: false, error: err?.message || '複製失敗' }
    }
  }

  return {
    galleryImages,
    loading,
    error,
    searchQuery,
    viewMode,
    lightboxOpen,
    currentImageIndex,
    filteredImages,
    currentLightboxImage,
    loadGalleryImages,
    clearSearch,
    openLightbox,
    closeLightbox,
    nextImage,
    previousImage,
    handleImageError,
    downloadImage,
    copyImageUrl,
    resolveUrl
  }
}
