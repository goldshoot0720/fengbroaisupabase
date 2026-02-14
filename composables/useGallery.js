// composables/useGallery.js
// 圖片庫邏輯 - 未來將整合 Supabase Storage
import { ref, computed } from 'vue'

export const useGallery = () => {
  const galleryImages = ref([])
  const searchQuery = ref('')
  const viewMode = ref('grid')
  const lightboxOpen = ref(false)
  const currentImageIndex = ref(0)

  const filteredImages = computed(() => {
    let filtered = galleryImages.value
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(img =>
        img.name.toLowerCase().includes(query) ||
        img.displayName.toLowerCase().includes(query)
      )
    }
    return filtered
  })

  const currentLightboxImage = computed(() => {
    return filteredImages.value[currentImageIndex.value] || {}
  })

  // TODO: 整合 Supabase Storage 載入圖片
  const loadGalleryImages = () => {
    galleryImages.value = []
  }

  const clearSearch = () => {
    searchQuery.value = ''
  }

  const openLightbox = (index) => {
    currentImageIndex.value = index
    lightboxOpen.value = true
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    lightboxOpen.value = false
    document.body.style.overflow = 'auto'
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
    const link = document.createElement('a')
    link.href = image.url
    link.download = image.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyImageUrl = async (image) => {
    try {
      const fullUrl = window.location.origin + image.url
      await navigator.clipboard.writeText(fullUrl)
      alert('圖片網址已複製到剪貼簿！')
    } catch (err) {
      console.error('複製失敗:', err)
      alert('複製失敗，請手動複製網址')
    }
  }

  return {
    galleryImages,
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
    copyImageUrl
  }
}
