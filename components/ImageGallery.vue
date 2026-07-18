<template>
  <div class="image-gallery-container">
    <div class="gallery-toolbar">
      <div class="search-box">
        <span class="icon" aria-hidden="true">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜尋圖片名稱或分類..."
        />
        <button v-if="searchQuery" type="button" class="btn-clear" @click="clearSearch">清除</button>
      </div>
      <div class="view-switcher" role="group" aria-label="檢視模式">
        <button
          type="button"
          class="view-chip"
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = 'grid'"
        >
          網格
        </button>
        <button
          type="button"
          class="view-chip"
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >
          列表
        </button>
      </div>
    </div>

    <div v-if="loading && galleryImages.length === 0" class="state-box">
      <div class="spinner"></div>
      <p>載入圖片中...</p>
    </div>

    <div v-else-if="error" class="state-box error">
      <p>{{ error }}</p>
      <button type="button" class="btn-retry" @click="loadGalleryImages">重試</button>
    </div>

    <div v-else-if="filteredImages.length === 0" class="state-box">
      <div class="placeholder-icon">🖼️</div>
      <h2>尚無圖片</h2>
      <p>請到「鋒兄圖片」頁面新增，或確認 Supabase `image` 資料表已建立。</p>
    </div>

    <div v-else class="gallery-grid" :class="`gallery-grid--${viewMode}`">
      <article
        v-for="(image, index) in filteredImages"
        :key="image.id || image.url || index"
        class="gallery-card"
        @click="openLightbox(index)"
      >
        <div class="thumb-wrap">
          <img
            :src="image.url"
            :alt="image.displayName"
            class="thumb"
            loading="lazy"
            @error="handleImageError"
          />
        </div>
        <div class="card-body">
          <h3>{{ image.displayName }}</h3>
          <p v-if="image.category" class="category">{{ image.category }}</p>
          <p v-if="image.note" class="note">{{ image.note }}</p>
        </div>
      </article>
    </div>

    <div
      v-if="lightboxOpen"
      class="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      @click.self="closeLightbox"
    >
      <button type="button" class="lightbox-close" @click="closeLightbox">✕</button>
      <button
        type="button"
        class="lightbox-nav"
        :disabled="currentImageIndex <= 0"
        @click="previousImage"
      >
        ‹
      </button>
      <div class="lightbox-content">
        <img
          :src="currentLightboxImage.url"
          :alt="currentLightboxImage.displayName || '預覽'"
          class="lightbox-image"
          @error="handleImageError"
        />
        <div class="lightbox-meta">
          <h3>{{ currentLightboxImage.displayName || '無名稱' }}</h3>
          <p>{{ currentImageIndex + 1 }} / {{ filteredImages.length }}</p>
        </div>
        <div class="lightbox-actions">
          <button type="button" @click="downloadImage(currentLightboxImage)">下載</button>
          <button type="button" @click="onCopyUrl(currentLightboxImage)">複製網址</button>
        </div>
      </div>
      <button
        type="button"
        class="lightbox-nav"
        :disabled="currentImageIndex >= filteredImages.length - 1"
        @click="nextImage"
      >
        ›
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useGallery } from '../composables/useGallery'

const {
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
  copyImageUrl
} = useGallery()

const onCopyUrl = async (image) => {
  const result = await copyImageUrl(image)
  if (result.success) alert('圖片網址已複製到剪貼簿！')
  else alert('複製失敗，請手動複製網址')
}

const onKeydown = (event) => {
  if (!lightboxOpen.value) return
  if (event.key === 'Escape') closeLightbox()
  else if (event.key === 'ArrowLeft') previousImage()
  else if (event.key === 'ArrowRight') nextImage()
}

onMounted(async () => {
  await loadGalleryImages()
  if (import.meta.client) window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.image-gallery-container {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.gallery-toolbar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
}

.search-box .icon {
  position: absolute;
  left: 0.75rem;
  opacity: 0.6;
}

.search-input {
  width: 100%;
  padding: 0.7rem 4.5rem 0.7rem 2.4rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 10px;
  background: var(--bg-secondary, #fff);
  color: var(--text-primary, #222);
}

.btn-clear {
  position: absolute;
  right: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-secondary, #666);
  cursor: pointer;
}

.view-switcher {
  display: inline-flex;
  gap: 0.35rem;
  padding: 0.3rem;
  border-radius: 999px;
  border: 1px solid var(--border-color, #ddd);
}

.view-chip {
  border: none;
  background: transparent;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
  color: var(--text-secondary, #666);
}

.view-chip.active {
  background: #334155;
  color: #fff;
}

.state-box {
  text-align: center;
  padding: 3rem 1.5rem;
  border-radius: 16px;
  background: var(--bg-secondary, #fff);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.state-box.error {
  color: #b91c1c;
}

.placeholder-icon {
  font-size: 3.5rem;
  opacity: 0.7;
}

.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 0.75rem;
  border: 3px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-retry {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: #667eea;
  color: #fff;
  cursor: pointer;
}

.gallery-grid {
  display: grid;
  gap: 1rem;
}

.gallery-grid--grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.gallery-grid--list {
  grid-template-columns: 1fr;
}

.gallery-card {
  background: var(--bg-secondary, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gallery-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.gallery-grid--list .gallery-card {
  display: grid;
  grid-template-columns: 160px 1fr;
}

.thumb-wrap {
  background:
    linear-gradient(45deg, color-mix(in oklab, var(--border-color, #e2e8f0) 55%, transparent) 25%, transparent 25%),
    linear-gradient(-45deg, color-mix(in oklab, var(--border-color, #e2e8f0) 55%, transparent) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, color-mix(in oklab, var(--border-color, #e2e8f0) 55%, transparent) 75%),
    linear-gradient(-45deg, transparent 75%, color-mix(in oklab, var(--border-color, #e2e8f0) 55%, transparent) 75%);
  background-size: 14px 14px;
  background-position: 0 0, 0 7px, 7px -7px, -7px 0;
  background-color: color-mix(in oklab, var(--bg-primary, #0f172a) 88%, var(--bg-secondary, #fff) 12%);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery-grid--list .thumb-wrap {
  aspect-ratio: auto;
  min-height: 140px;
}

.thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.card-body {
  padding: 0.85rem 1rem 1rem;
}

.card-body h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary, #1f2937);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: #667eea;
  font-weight: 600;
}

.note {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.88);
}

.lightbox-content {
  max-width: min(92vw, 1000px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}

.lightbox-image {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 12px;
}

.lightbox-meta {
  color: #f8fafc;
  text-align: center;
}

.lightbox-meta h3 {
  margin: 0;
}

.lightbox-meta p {
  margin: 0.25rem 0 0;
  color: #cbd5e1;
}

.lightbox-actions {
  display: flex;
  gap: 0.5rem;
}

.lightbox-actions button,
.lightbox-close,
.lightbox-nav {
  border: 1px solid rgba(248, 250, 252, 0.25);
  background: rgba(248, 250, 252, 0.12);
  color: #fff;
  border-radius: 999px;
  cursor: pointer;
}

.lightbox-actions button {
  padding: 0.45rem 0.95rem;
  font-weight: 600;
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
}

.lightbox-nav {
  width: 46px;
  height: 46px;
  font-size: 1.7rem;
  flex-shrink: 0;
}

.lightbox-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .gallery-grid--list .gallery-card {
    grid-template-columns: 1fr;
  }
}
</style>
