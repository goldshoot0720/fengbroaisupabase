<template>
  <PageContainer>
    <div class="gallery-page">
      <!-- ══ Instagram 式頂欄 ══ -->
      <header class="ig-topbar">
        <div class="ig-brand">
          <span class="ig-logo" aria-hidden="true">
            <span class="ig-logo-dot"></span>
          </span>
          <h1 class="ig-wordmark">鋒兄圖片</h1>
        </div>
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋圖片名稱..."
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <div class="ig-tools">
          <button class="ig-icon-btn ig-icon-btn--primary" title="新增圖片" @click="openInlineAdd">＋</button>
          <button v-if="images.length > 0" @click="exportImagesZip" class="ig-icon-btn" title="匯出 ZIP">📤</button>
          <button @click="$refs.zipFileInput.click()" class="ig-icon-btn" title="匯入 ZIP">📥</button>
          <input
            ref="zipFileInput"
            type="file"
            accept=".zip"
            style="display:none"
            @change="handleImportZipWithProgress"
          >
        </div>
      </header>

      <!-- ══ 限時動態式分類列 ══ -->
      <div v-if="categoryStories.length > 1" class="story-rail" role="tablist" aria-label="圖片分類">
        <button
          v-for="story in categoryStories"
          :key="story.value"
          type="button"
          role="tab"
          class="story"
          :class="{ active: activeCategory === story.value }"
          :aria-selected="activeCategory === story.value"
          @click="activeCategory = story.value"
        >
          <span class="story-ring">
            <span class="story-thumb">
              <img v-if="story.cover" :src="resolveMediaUrl(story.cover)" :alt="story.label" loading="lazy" />
              <span v-else class="story-initial">{{ story.label.slice(0, 1) }}</span>
            </span>
          </span>
          <span class="story-label">{{ story.label }}</span>
          <span class="story-count">{{ story.count }}</span>
        </button>
      </div>

      <!-- 匯入 / 上傳進度 -->
      <div
        v-if="importProgress.active || importProgress.completed"
        class="import-progress-card"
        :class="{
          'is-complete': importProgress.completed && !importProgress.error,
          'is-error': importProgress.error
        }"
      >
        <div class="import-progress-head">
          <div>
            <p class="import-progress-label">圖片匯入進度</p>
            <p class="import-progress-stage">{{ importProgress.stage }}</p>
          </div>
          <span class="import-progress-percent">{{ importProgress.percent }}%</span>
        </div>
        <div class="import-progress-bar">
          <div class="import-progress-fill" :style="{ width: `${importProgress.percent}%` }"></div>
        </div>
        <div class="import-progress-meta">
          <span>{{ importProgress.message }}</span>
          <span v-if="importProgress.total > 0">{{ importProgress.current }} / {{ importProgress.total }}</span>
        </div>
      </div>

      <div
        v-if="uploadStatus.active || uploadStatus.completed"
        class="import-progress-card upload-progress-card"
        :class="{
          'is-complete': uploadStatus.completed && !uploadStatus.error,
          'is-error': uploadStatus.error
        }"
      >
        <div class="import-progress-head">
          <div>
            <p class="import-progress-label">圖片上傳進度</p>
            <p class="import-progress-stage">{{ uploadStatus.stage }}</p>
          </div>
          <span class="import-progress-percent">{{ uploadStatus.percent }}%</span>
        </div>
        <div class="import-progress-bar">
          <div class="import-progress-fill" :style="{ width: `${uploadStatus.percent}%` }"></div>
        </div>
        <div class="import-progress-meta">
          <span>{{ uploadStatus.message }}</span>
          <span v-if="uploadStatus.total > 0">{{ uploadStatus.current }} / {{ uploadStatus.total }}</span>
        </div>
      </div>

      <!-- ══ 個人檔案式統計列 ══ -->
      <div class="ig-profile-bar">
        <div class="ig-stats">
          <span class="ig-stat"><strong>{{ images.length }}</strong> 張圖片</span>
          <span class="ig-stat"><strong>{{ categoryStories.length - 1 }}</strong> 個分類</span>
          <span class="ig-stat"><strong>{{ filteredImages.length }}</strong> 顯示中</span>
          <span v-if="selectedIds.size > 0" class="ig-stat selected-count">已選 {{ selectedIds.size }} 項</span>
          <span v-if="imageSizeLoading" class="size-loading">讀取大小中...</span>
        </div>
        <div class="ig-profile-tools">
          <div class="view-switcher" role="group" aria-label="圖片顯示模式">
            <button
              v-for="option in viewOptions"
              :key="option.value"
              type="button"
              class="view-chip"
              :class="{ active: viewMode === option.value }"
              :title="option.label"
              @click="viewMode = option.value"
            >
              <span class="view-chip-icon" aria-hidden="true">{{ option.icon }}</span>
              <span class="view-chip-text">{{ option.label }}</span>
            </button>
          </div>
          <label class="sort-control">
            <span>排序</span>
            <select v-model="sortMode" class="sort-select">
              <option value="created-desc">最新在前</option>
              <option value="size-desc">檔案大小：大到小</option>
            </select>
          </label>
          <button v-if="!batchMode && filteredImages.length > 0" @click="enterBatchMode" class="btn-batch-mode">選取</button>
          <template v-if="batchMode">
            <label class="select-all-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" />
              <span>全選</span>
            </label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <!-- 載入中 -->
      <div v-if="loading && images.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>載入資料中...</p>
      </div>

      <!-- 圖片列表 -->
      <div v-if="isAddingInline || filteredImages.length > 0 || !loading" class="images-container" :class="[`images-container--${viewMode}`]">

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="image-card card-editing image-card--editor">
          <div class="image-header">
            <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="圖片名稱 *" style="flex:1" />
            <div class="image-actions">
              <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
              <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
            </div>
          </div>
          <div class="inline-add-form">
            <div class="inline-field-row">
              <label>上傳圖片</label>
              <label class="btn-inline-upload" :class="{ disabled: addUploading }">
                {{ addUploading ? '上傳中...' : '選擇圖片' }}
                <input type="file" accept="image/*" multiple style="display:none" :disabled="addUploading" @change="handleAddImageUpload" />
              </label>
              <span v-if="addSelectedFiles.length > 0" class="inline-file-name">
                已選 {{ addSelectedFiles.length }} 張
                <button type="button" class="btn-inline-remove" @click="clearAddSelectedFiles">✕</button>
              </span>
              <span v-else-if="addForm.file" class="inline-file-name">📎
                <button type="button" class="btn-inline-remove" @click="addForm.file = ''">✕</button>
              </span>
            </div>
            <div v-if="addSelectedFiles.length > 0" class="inline-selected-files">
              <article
                v-for="(item, index) in addSelectedPreviews"
                :key="item.key"
                class="selected-file-card"
              >
                <div class="selected-file-thumb">
                  <img :src="item.previewUrl" :alt="item.file.name" class="selected-file-img" />
                </div>
                <div class="selected-file-meta">
                  <span class="selected-file-name" :title="item.file.name">{{ item.file.name }}</span>
                  <span class="selected-file-size">{{ formatBytes(item.file.size) }}</span>
                </div>
                <button
                  type="button"
                  class="btn-inline-remove selected-file-remove"
                  title="移除此圖"
                  @click="removeAddSelectedFile(index)"
                >
                  ✕
                </button>
              </article>
            </div>
            <div v-else-if="addForm.file" class="inline-img-preview-wrap">
              <img :src="resolveMediaUrl(addForm.file)" class="inline-img-preview" alt="預覽" />
            </div>
            <div class="inline-field-row">
              <label>或輸入URL</label>
              <input v-model="addForm.file" type="text" class="inline-input" placeholder="https://..." :disabled="addSelectedFiles.length > 0" />
            </div>
            <div class="inline-field-row">
              <label>分類</label>
              <input v-model="addForm.category" type="text" class="inline-input" placeholder="分類" />
            </div>
            <div class="inline-field-row">
              <label>備註</label>
              <input v-model="addForm.note" type="text" class="inline-input" placeholder="備註" />
            </div>
            <div class="inline-field-row">
              <label>類型</label>
              <input v-model="addForm.filetype" type="text" class="inline-input" placeholder="jpg, png..." />
            </div>
          </div>
        </div>

        <div v-if="filteredImages.length === 0 && !isAddingInline" class="empty-state">
          <span class="empty-icon" aria-hidden="true">🖼</span>
          <p>沒有找到相關圖片</p>
        </div>

        <div
          v-for="image in filteredImages"
          :key="image.id"
          class="image-card"
          :class="[
            { 'card-editing': editingId === image.id, 'is-selected': selectedIds.has(image.id) },
            imageCardModeClass(image.id)
          ]"
        >

          <!-- 行內編輯模式 -->
          <template v-if="editingId === image.id">
            <div class="image-header">
              <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="圖片名稱 *" style="flex:1" />
              <div class="image-actions">
                <button class="btn-icon save" @click="saveInlineEdit" :disabled="editUploading" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
              </div>
            </div>
            <div class="inline-add-form">
              <div v-if="editForm.file" class="inline-img-preview-wrap">
                <img :src="resolveMediaUrl(editForm.file)" class="inline-img-preview" alt="預覽" />
              </div>
              <div class="inline-field-row">
                <label>上傳圖片</label>
                <label class="btn-inline-upload" :class="{ disabled: editUploading }">
                  {{ editUploading ? '上傳中...' : '選擇圖片' }}
                  <input type="file" accept="image/*" style="display:none" :disabled="editUploading" @change="handleEditImageUpload" />
                </label>
                <button v-if="editForm.file" type="button" class="btn-inline-remove" @click="editForm.file = ''" title="移除圖片">✕</button>
              </div>
              <div class="inline-field-row">
                <label>或輸入URL</label>
                <input v-model="editForm.file" type="text" class="inline-input" placeholder="https://..." />
              </div>
              <div class="inline-field-row">
                <label>分類</label>
                <input v-model="editForm.category" type="text" class="inline-input" placeholder="分類" />
              </div>
              <div class="inline-field-row">
                <label>備註</label>
                <input v-model="editForm.note" type="text" class="inline-input" placeholder="備註" />
              </div>
              <div class="inline-field-row">
                <label>類型</label>
                <input v-model="editForm.filetype" type="text" class="inline-input" placeholder="jpg, png..." />
              </div>
            </div>
          </template>

          <!-- ══ 方格模式：Instagram 相片牆 ══ -->
          <template v-else-if="viewMode === 'grid'">
            <div class="tile" @click="batchMode ? toggleSelect(image.id) : openLightbox(image)">
              <img
                v-if="image.file"
                :src="resolveMediaUrl(image.file)"
                :alt="image.name || '圖片'"
                class="tile-img"
                loading="lazy"
              />
              <div v-else class="tile-empty"><span>🖼</span></div>
              <input
                v-if="batchMode"
                type="checkbox"
                class="tile-check"
                :checked="selectedIds.has(image.id)"
                @click.stop="toggleSelect(image.id)"
              />
              <div class="tile-overlay">
                <p class="tile-name">{{ image.name || '無名稱' }}</p>
                <p class="tile-sub">
                  <span v-if="image.category">#{{ image.category }}</span>
                  <span>{{ formatImageSize(image) }}</span>
                </p>
                <div class="tile-tools" @click.stop>
                  <button class="btn-icon" title="編輯" @click="openInlineEdit(image)">✏️</button>
                  <button class="btn-icon delete" title="刪除" @click="confirmDelete(image)">🗑️</button>
                </div>
              </div>
              <span v-if="image.filetype" class="tile-type">{{ image.filetype }}</span>
            </div>
          </template>

          <!-- ══ 貼文模式：Instagram Feed ══ -->
          <template v-else-if="viewMode === 'feed'">
            <header class="post-head">
              <span class="post-avatar" aria-hidden="true">鋒</span>
              <div class="post-identity">
                <strong class="post-author">鋒兄</strong>
                <span class="post-place">{{ image.category ? '#' + image.category : '未分類' }}</span>
              </div>
              <input
                v-if="batchMode"
                type="checkbox"
                class="post-check"
                :checked="selectedIds.has(image.id)"
                @click.stop="toggleSelect(image.id)"
              />
              <div class="image-actions">
                <button class="btn-icon" @click="openInlineEdit(image)" title="行內編輯">✏️</button>
                <button class="btn-icon delete" @click="confirmDelete(image)" title="刪除">🗑️</button>
              </div>
            </header>

            <div class="post-media" @click="image.file && openLightbox(image)">
              <img
                v-if="image.file"
                :src="resolveMediaUrl(image.file)"
                :alt="image.name || '圖片'"
                class="post-img"
                loading="lazy"
              />
              <div v-else class="tile-empty post-empty"><span>🖼</span></div>
            </div>

            <div class="post-actions">
              <button class="post-action" title="放大檢視" :disabled="!image.file" @click="openLightbox(image)">🔍</button>
              <button class="post-action" title="下載" :disabled="!image.file" @click="downloadImage(image)">⬇️</button>
              <button class="post-action" title="複製網址" :disabled="!image.file" @click="copyImageUrl(image)">🔗</button>
              <span class="post-spacer"></span>
              <span v-if="image.filetype" class="file-type-badge">{{ image.filetype }}</span>
              <span class="post-size">{{ formatImageSize(image) }}</span>
            </div>

            <div class="post-caption">
              <p class="post-title"><strong>鋒兄</strong> {{ image.name || '無名稱' }}</p>
              <p v-if="image.note" class="post-note">{{ image.note }}</p>
              <div v-if="hasExtra(image)" class="post-extra">
                <span v-if="image.ref" class="extra-item"><span class="extra-label">參考</span>{{ image.ref }}</span>
                <span v-if="image.hash" class="extra-item"><span class="extra-label">Hash</span><span class="hash-value">{{ image.hash }}</span></span>
                <span v-if="image.cover" class="extra-item"><span class="extra-label">封面</span>{{ image.cover }}</span>
              </div>
            </div>
          </template>

          <!-- ══ 列表模式 ══ -->
          <template v-else>
            <input
              v-if="batchMode"
              type="checkbox"
              class="row-check"
              :checked="selectedIds.has(image.id)"
              @click.stop="toggleSelect(image.id)"
            />
            <div class="row-thumb" @click="image.file && openLightbox(image)">
              <img v-if="image.file" :src="resolveMediaUrl(image.file)" :alt="image.name || '圖片'" loading="lazy" />
              <span v-else class="row-thumb-empty">🖼</span>
            </div>
            <div class="row-copy">
              <h3 class="image-name">{{ image.name || '無名稱' }}</h3>
              <div class="row-meta">
                <span v-if="image.category" class="category-badge">{{ image.category }}</span>
                <span v-if="image.filetype" class="file-type-badge">{{ image.filetype }}</span>
                <span class="row-size">{{ formatImageSize(image) }}</span>
              </div>
              <p v-if="image.note" class="row-note">{{ image.note }}</p>
            </div>
            <div class="image-actions">
              <button class="btn-icon" :disabled="!image.file" @click="downloadImage(image)" title="下載">⬇️</button>
              <button class="btn-icon" @click="openInlineEdit(image)" title="行內編輯">✏️</button>
              <button class="btn-icon delete" @click="confirmDelete(image)" title="刪除">🗑️</button>
            </div>
          </template>

        </div>
      </div>

      <!-- 編輯/新增 Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ isEditing ? '編輯圖片' : '新增圖片' }}</h3>
            <button class="btn-close" @click="closeModal">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label>名稱 <span class="required">*</span></label>
              <input v-model="formData.name" type="text" class="form-input" placeholder="請輸入圖片名稱">
            </div>

            <div class="form-group">
              <label>上傳圖片</label>
              <div class="upload-area">
                <input
                  ref="imageFileInput"
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.imageFileInput.click()"
                  class="btn-upload"
                  :disabled="imageUploading"
                >
                  {{ imageUploading ? '上傳中...' : '選擇圖片' }}
                </button>
                <span v-if="imageUploadProgress > 0" class="upload-progress">{{ imageUploadProgress }}%</span>
              </div>
              <div v-if="formData.file" class="image-preview">
                <img :src="resolveMediaUrl(formData.file)" alt="預覽" class="preview-image" />
                <button type="button" @click="removeImage" class="btn-remove">移除</button>
              </div>
            </div>

            <div class="form-group">
              <label>檔案路徑</label>
              <input v-model="formData.file" type="text" class="form-input" placeholder="自動上傳或手動輸入 URL">
            </div>

            <div class="form-group">
              <label>檔案類型</label>
              <input v-model="formData.filetype" type="text" class="form-input" placeholder="例: jpg, png, webp">
            </div>

            <div class="form-group">
              <label>分類</label>
              <input v-model="formData.category" type="text" class="form-input" placeholder="請輸入分類">
            </div>

            <div class="form-group">
              <label>備註</label>
              <textarea v-model="formData.note" class="form-textarea" rows="4" placeholder="請輸入備註說明..."></textarea>
            </div>

            <div class="form-section">
              <h4 @click="toggleSection('extra')" class="section-toggle">
                🔧 進階設定 {{ showSection.extra ? '▼' : '▶' }}
              </h4>
              <div v-if="showSection.extra" class="section-content">
                <div class="form-group">
                  <label>參考來源</label>
                  <input v-model="formData.ref" type="text" class="form-input" placeholder="參考來源或連結">
                </div>
                <div class="form-group">
                  <label>Hash 值</label>
                  <input v-model="formData.hash" type="text" class="form-input" placeholder="檔案 Hash 值">
                </div>
                <div class="form-group">
                  <label>封面圖片上傳</label>
                  <div class="upload-area">
                    <input
                      ref="coverFileInput"
                      type="file"
                      accept="image/*"
                      @change="handleCoverUpload"
                      style="display: none"
                    />
                    <button
                      type="button"
                      @click="$refs.coverFileInput.click()"
                      class="btn-upload"
                      :disabled="coverUploading"
                    >
                      {{ coverUploading ? '上傳中...' : '選擇封面' }}
                    </button>
                  </div>
                  <div v-if="formData.cover" class="image-preview">
                    <img :src="resolveMediaUrl(formData.cover)" alt="封面預覽" class="preview-image" />
                    <button type="button" @click="removeCover" class="btn-remove">移除</button>
                  </div>
                  <input v-model="formData.cover" type="text" class="form-input" placeholder="或輸入封面 URL">
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">取消</button>
            <button class="btn-submit" @click="handleSubmit" :disabled="loading">
              {{ loading ? '處理中...' : '確認儲存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 燈箱預覽 -->
      <div
        v-if="lightboxOpen"
        class="lightbox-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="圖片預覽"
        @click.self="closeLightbox"
      >
        <button type="button" class="lightbox-close" title="關閉" aria-label="關閉預覽" @click="closeLightbox">✕</button>
        <button
          type="button"
          class="lightbox-nav lightbox-prev"
          title="上一張"
          aria-label="上一張"
          :disabled="!canGoPrevious"
          @click="previousLightboxImage"
        >
          ‹
        </button>
        <div class="lightbox-content">
          <div class="lightbox-stage">
            <img
              v-if="currentLightboxImage?.file"
              :src="resolveMediaUrl(currentLightboxImage.file)"
              :alt="currentLightboxImage.name || '圖片預覽'"
              class="lightbox-image"
            />
          </div>
          <aside class="lightbox-side">
            <header class="lightbox-side-head">
              <span class="post-avatar" aria-hidden="true">鋒</span>
              <div class="post-identity">
                <strong class="post-author">鋒兄</strong>
                <span class="post-place">{{ currentLightboxImage?.category ? '#' + currentLightboxImage.category : '未分類' }}</span>
              </div>
            </header>
            <div class="lightbox-meta">
              <h3>{{ currentLightboxImage?.name || '無名稱' }}</h3>
              <p v-if="currentLightboxImage?.note" class="lightbox-note">{{ currentLightboxImage.note }}</p>
              <dl class="lightbox-facts">
                <div v-if="currentLightboxImage?.filetype"><dt>類型</dt><dd>{{ currentLightboxImage.filetype }}</dd></div>
                <div v-if="currentLightboxImage"><dt>大小</dt><dd>{{ formatImageSize(currentLightboxImage) }}</dd></div>
                <div v-if="currentLightboxImage?.ref"><dt>參考</dt><dd>{{ currentLightboxImage.ref }}</dd></div>
                <div v-if="currentLightboxImage?.hash"><dt>Hash</dt><dd class="hash-value">{{ currentLightboxImage.hash }}</dd></div>
              </dl>
              <p class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ lightboxImages.length }}</p>
            </div>
            <div class="lightbox-actions">
              <button type="button" class="btn-lightbox" @click="downloadLightboxImage">下載</button>
              <button type="button" class="btn-lightbox" @click="copyLightboxUrl">複製網址</button>
            </div>
          </aside>
        </div>
        <button
          type="button"
          class="lightbox-nav lightbox-next"
          title="下一張"
          aria-label="下一張"
          :disabled="!canGoNext"
          @click="nextLightboxImage"
        >
          ›
        </button>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import PageContainer from '../layout/PageContainer.vue'
import { useImages } from '../../composables/useImages'
import { useStorage } from '../../composables/useStorage'
import { resolveSupabaseBucket } from '../../composables/useSettings'
import { getSupabaseBrowserClient } from '../../composables/useSupabaseBrowserClient'
import { useSelectionSet } from '../../composables/useSelectionSet'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'

const {
  images,
  loading,
  FIELDS,
  loadImages,
  addImage,
  updateImage,
  deleteImage,
  importImages
} = useImages()

// 狀態
const showModal = ref(false)
const isEditing = ref(false)
const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-gallery-search-history', searchQuery)
const viewMode = ref('grid')
const activeCategory = ref('all')
const sortMode = ref('created-desc')
const imageSizeMap = ref({})
const imageSizeLoading = ref(false)
const showSection = reactive({
  extra: false
})

const createImportProgressState = () => ({
  active: false,
  completed: false,
  error: false,
  stage: '準備匯入',
  message: '',
  current: 0,
  total: 0,
  percent: 0
})
const importProgress = reactive(createImportProgressState())
const resetImportProgress = () => Object.assign(importProgress, createImportProgressState())
const startImportProgress = (stage, message = '', total = 0) => {
  Object.assign(importProgress, {
    active: true,
    completed: false,
    error: false,
    stage,
    message,
    current: 0,
    total,
    percent: total > 0 ? 0 : 8
  })
}
const updateImportProgress = ({ stage, message, current, total }) => {
  if (stage !== undefined) importProgress.stage = stage
  if (message !== undefined) importProgress.message = message
  if (total !== undefined) importProgress.total = total
  if (current !== undefined) importProgress.current = current

  if (importProgress.total > 0) {
    importProgress.percent = Math.min(100, Math.max(0, Math.round((importProgress.current / importProgress.total) * 100)))
  }
}
const finishImportProgress = ({ message, error = false }) => {
  Object.assign(importProgress, {
    active: false,
    completed: true,
    error,
    message,
    percent: error ? importProgress.percent || 0 : 100
  })
}
const createUploadStatusState = () => ({
  active: false,
  completed: false,
  error: false,
  stage: '準備上傳',
  message: '',
  current: 0,
  total: 0,
  percent: 0
})
const uploadStatus = reactive(createUploadStatusState())
const startUploadStatus = ({ total = 1, stage = '準備上傳', message = '' } = {}) => {
  Object.assign(uploadStatus, {
    active: true,
    completed: false,
    error: false,
    stage,
    message,
    current: 0,
    total,
    percent: 0
  })
}
const updateUploadStatus = ({ stage, message, current, total, percent }) => {
  if (stage !== undefined) uploadStatus.stage = stage
  if (message !== undefined) uploadStatus.message = message
  if (current !== undefined) uploadStatus.current = current
  if (total !== undefined) uploadStatus.total = total
  if (percent !== undefined) {
    uploadStatus.percent = Math.min(100, Math.max(0, Math.round(percent)))
  } else if (uploadStatus.total > 0) {
    uploadStatus.percent = Math.min(99, Math.max(0, Math.round((uploadStatus.current / uploadStatus.total) * 100)))
  }
}
const finishUploadStatus = ({ message, error = false }) => {
  Object.assign(uploadStatus, {
    active: false,
    completed: true,
    error,
    message,
    percent: error ? uploadStatus.percent || 0 : 100
  })
}
const viewOptions = [
  { value: 'grid', label: '方格', icon: '▦' },
  { value: 'feed', label: '貼文', icon: '▤' },
  { value: 'list', label: '列表', icon: '☰' }
]

// 燈箱狀態
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const lightboxImages = computed(() =>
  filteredImages.value.filter((image) => Boolean(image?.file))
)

const currentLightboxImage = computed(() => lightboxImages.value[lightboxIndex.value] || null)
const canGoPrevious = computed(() => lightboxIndex.value > 0)
const canGoNext = computed(() => lightboxIndex.value < lightboxImages.value.length - 1)

const openLightbox = (image) => {
  if (!image?.file) return
  const index = lightboxImages.value.findIndex((item) => item.id === image.id)
  if (index < 0) return
  lightboxIndex.value = index
  lightboxOpen.value = true
  if (import.meta.client) document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxOpen.value = false
  if (import.meta.client) document.body.style.overflow = ''
}

const previousLightboxImage = () => {
  if (canGoPrevious.value) lightboxIndex.value -= 1
}

const nextLightboxImage = () => {
  if (canGoNext.value) lightboxIndex.value += 1
}

const downloadLightboxImage = () => {
  const image = currentLightboxImage.value
  if (!image?.file) return
  const link = document.createElement('a')
  link.href = resolveMediaUrl(image.file)
  link.download = image.name || 'image'
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const copyLightboxUrl = async () => {
  const image = currentLightboxImage.value
  if (!image?.file) return
  try {
    const url = resolveMediaUrl(image.file)
    const fullUrl = /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
    await navigator.clipboard.writeText(fullUrl)
    alert('圖片網址已複製到剪貼簿！')
  } catch (err) {
    console.error('複製失敗:', err)
    alert('複製失敗，請手動複製網址')
  }
}

const handleLightboxKeydown = (event) => {
  if (!lightboxOpen.value) return
  if (event.key === 'Escape') closeLightbox()
  else if (event.key === 'ArrowLeft') previousLightboxImage()
  else if (event.key === 'ArrowRight') nextLightboxImage()
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return
  if (count === images.value.length) {
    const input = prompt(`即將刪除全部 ${count} 筆！\n\n請輸入 DELETE image 確認：`)
    if (input !== 'DELETE image') { alert('輸入不正確，已取消'); return }
  } else { if (!confirm(`確定要刪除選中的 ${count} 筆嗎？`)) return }
  let ok = 0
  for (const id of [...selectedIds.value]) { const r = await deleteImage(id); if (r.success) ok++ }
  exitBatchMode()
  alert(`已刪除 ${ok} 筆`)
}

// 上傳狀態
const imageFileInput = ref(null)
const coverFileInput = ref(null)
const {
  uploading: imageUploading,
  uploadProgress: imageUploadProgress,
  uploadFile: uploadImageFile,
  getPublicUrl
} = useStorage()
const coverUploading = ref(false)
const coverUploadProgress = ref(0)

const getBucketName = () => resolveSupabaseBucket()

const formatBytes = (bytes = 0) => {
  const amount = Number(bytes)
  if (!Number.isFinite(amount) || amount <= 0) return '未記錄'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = amount
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[unitIndex]}`
}

const extractStoragePath = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    const marker = '/storage/v1/object/public/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return trimmed
    const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    const slashIndex = objectPath.indexOf('/')
    if (slashIndex === -1) return trimmed
    return objectPath.slice(slashIndex + 1)
  } catch {
    return trimmed.replace(/^\/+/, '')
  }
}

const getStorageObjectSize = (item) => {
  const size = item?.metadata?.size ?? item?.size ?? 0
  return Number.isFinite(Number(size)) ? Number(size) : 0
}

const listStorageSizesRecursive = async (client, bucketName, prefix = '') => {
  const { data, error } = await client.storage.from(bucketName).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' }
  })
  if (error) throw error

  const entries = {}
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) {
      Object.assign(entries, await listStorageSizesRecursive(client, bucketName, path))
      continue
    }
    entries[path] = getStorageObjectSize(item)
  }
  return entries
}

const refreshImageSizes = async () => {
  const client = getSupabaseBrowserClient()
  if (!client) return

  imageSizeLoading.value = true
  try {
    imageSizeMap.value = await listStorageSizesRecursive(client, getBucketName())
  } catch (error) {
    console.warn('讀取圖片檔案大小失敗:', error)
  } finally {
    imageSizeLoading.value = false
  }
}

const getImageSizeBytes = (image) => {
  const recordedSize = Number(image?.size || image?.filesize || image?.file_size || 0)
  if (Number.isFinite(recordedSize) && recordedSize > 0) return recordedSize
  return imageSizeMap.value[extractStoragePath(image?.file)] || 0
}

const formatImageSize = (image) => formatBytes(getImageSizeBytes(image))

// 表單資料
const formData = reactive({
  id: null,
  name: '',
  file: '',
  filetype: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  cover: ''
})

// 初始化
onMounted(async () => {
  await loadImages()
  await refreshImageSizes()
  if (import.meta.client) {
    window.addEventListener('keydown', handleLightboxKeydown)
  }
})

onUnmounted(() => {
  revokeAddSelectedPreviewUrls()
  if (import.meta.client) {
    window.removeEventListener('keydown', handleLightboxKeydown)
    document.body.style.overflow = ''
  }
})

// 搜尋過濾
const filteredImages = computed(() => {
  let result = images.value

  if (activeCategory.value !== 'all') {
    result = activeCategory.value === '__uncategorized__'
      ? result.filter((image) => !image.category)
      : result.filter((image) => image.category === activeCategory.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(image =>
      (image.name && image.name.toLowerCase().includes(query)) ||
      (image.category && image.category.toLowerCase().includes(query))
    )
  }

  if (sortMode.value === 'size-desc') {
    return [...result].sort((a, b) => {
      const sizeDiff = getImageSizeBytes(b) - getImageSizeBytes(a)
      if (sizeDiff !== 0) return sizeDiff
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
  }

  return result
})

/** Instagram 限時動態式分類：以該分類第一張有圖的當封面 */
const categoryStories = computed(() => {
  const groups = new Map()
  let uncategorized = []
  images.value.forEach((image) => {
    if (image.category) {
      if (!groups.has(image.category)) groups.set(image.category, [])
      groups.get(image.category).push(image)
    } else {
      uncategorized.push(image)
    }
  })
  const stories = [{
    value: 'all',
    label: '全部',
    count: images.value.length,
    cover: images.value.find((image) => image.file)?.file || ''
  }]
  Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .forEach(([label, items]) => {
      stories.push({
        value: label,
        label,
        count: items.length,
        cover: items.find((image) => image.file)?.file || ''
      })
    })
  if (uncategorized.length > 0) {
    stories.push({
      value: '__uncategorized__',
      label: '未分類',
      count: uncategorized.length,
      cover: uncategorized.find((image) => image.file)?.file || ''
    })
  }
  return stories
})

/** 貼文／列表列直接下載單張圖片 */
const downloadImage = (image) => {
  if (!image?.file) return
  const link = document.createElement('a')
  link.href = resolveMediaUrl(image.file)
  link.download = image.name || 'image'
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** 複製單張圖片網址 */
const copyImageUrl = async (image) => {
  if (!image?.file) return
  try {
    const url = resolveMediaUrl(image.file)
    const fullUrl = /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
    await navigator.clipboard.writeText(fullUrl)
    alert('圖片網址已複製到剪貼簿！')
  } catch (err) {
    console.error('複製失敗:', err)
    alert('複製失敗，請手動複製網址')
  }
}

const {
  isSelectionMode: batchMode,
  selectedIds,
  isAllSelected,
  enterSelectionMode: enterBatchMode,
  exitSelectionMode: exitBatchMode,
  toggleSelect,
  toggleSelectAll
} = useSelectionSet(filteredImages)

const imageCardModeClass = () => `image-card--${viewMode.value}`

const resolveMediaUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value
  return getPublicUrl(value) || value
}

// 檢查是否有額外資訊
const hasExtra = (image) => {
  return image.ref || image.hash || image.cover
}

// 切換區塊顯示
const toggleSection = (section) => {
  showSection[section] = !showSection[section]
}

// 行內新增
const isAddingInline = ref(false)
const addForm = reactive({ name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
const addUploading = ref(false)
const addSelectedFiles = ref([])
const addSelectedPreviewUrls = ref([])

const revokeAddSelectedPreviewUrls = () => {
  for (const url of addSelectedPreviewUrls.value) {
    if (url) URL.revokeObjectURL(url)
  }
  addSelectedPreviewUrls.value = []
}

const setAddSelectedFiles = (files = []) => {
  revokeAddSelectedPreviewUrls()
  addSelectedFiles.value = files
  addSelectedPreviewUrls.value = files.map((file) => {
    try {
      return URL.createObjectURL(file)
    } catch {
      return ''
    }
  })
}

const addSelectedPreviews = computed(() =>
  addSelectedFiles.value.map((file, index) => ({
    file,
    previewUrl: addSelectedPreviewUrls.value[index] || '',
    key: `${file.name}-${file.size}-${file.lastModified || index}`
  }))
)

const removeAddSelectedFile = (index) => {
  const nextFiles = [...addSelectedFiles.value]
  const nextUrls = [...addSelectedPreviewUrls.value]
  const [removedUrl] = nextUrls.splice(index, 1)
  nextFiles.splice(index, 1)
  if (removedUrl) URL.revokeObjectURL(removedUrl)
  addSelectedFiles.value = nextFiles
  addSelectedPreviewUrls.value = nextUrls
  if (nextFiles.length === 1) {
    if (!addForm.name) addForm.name = getFileBaseName(nextFiles[0].name)
    if (!addForm.filetype) addForm.filetype = getFileExtension(nextFiles[0].name)
  } else if (nextFiles.length === 0) {
    addForm.name = ''
    addForm.filetype = ''
  }
}

// 行內編輯
const editingId = ref(null)
const editForm = reactive({ name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
const editUploading = ref(false)

const openInlineEdit = (image) => {
  editingId.value = image.id
  Object.assign(editForm, { name: image.name || '', file: image.file || '', filetype: image.filetype || '', note: image.note || '', ref: image.ref || '', category: image.category || '', hash: image.hash || '', cover: image.cover || '' })
}
const cancelInlineEdit = () => { editingId.value = null }

const handleEditImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  editUploading.value = true
  startUploadStatus({ total: 1, stage: 'Edit image upload', message: `${file.name} ready` })
  try {
    const result = await uploadGalleryFileWithStatus(file, 'gallery', 1, 1, 'Edit image upload')
    editForm.file = result.url
    if (!editForm.name) editForm.name = file.name.replace(/\.[^.]+$/, '')
    if (!editForm.filetype) editForm.filetype = file.name.split('.').pop() || ''
    finishUploadStatus({ message: `${file.name} uploaded` })
  } catch (e) {
    finishUploadStatus({ message: e.message, error: true })
    alert('上傳失敗: ' + e.message)
  } finally {
    editUploading.value = false
    event.target.value = ''
  }
}

const saveInlineEdit = async () => {
  if (!editForm.name) { alert('請輸入圖片名稱'); return }
  try {
    const result = await updateImage(editingId.value, { ...editForm })
    if (result.success) {
      editingId.value = null
      await loadImages()
      await refreshImageSizes()
    }
    else { alert('儲存失敗: ' + result.error) }
  } catch (e) { alert('儲存失敗: ' + e.message) }
}

const getFileBaseName = (fileName = '') => fileName.replace(/\.[^.]+$/, '')
const getFileExtension = (fileName = '') => fileName.split('.').pop() || ''
const uploadGalleryFileWithStatus = async (file, folder, index = 1, total = 1, stage = 'Image upload') => {
  const fileName = file?.name || 'image'
  updateUploadStatus({
    stage,
    message: `${fileName} uploading`,
    current: Math.max(0, index - 1),
    total,
    percent: total > 1 ? ((index - 1) / total) * 100 : 8
  })

  const result = await uploadImageFile(file, folder)
  if (!result.success) {
    throw new Error(`${fileName}: ${result.error}`)
  }

  updateUploadStatus({
    stage,
    message: `${fileName} uploaded`,
    current: index,
    total,
    percent: (index / total) * 100
  })

  return result
}

const resetAddForm = () => {
  Object.assign(addForm, { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
  setAddSelectedFiles([])
}

const openInlineAdd = () => {
  resetAddForm()
  isAddingInline.value = true
}
const cancelInlineAdd = () => {
  resetAddForm()
  isAddingInline.value = false
}

const clearAddSelectedFiles = () => {
  setAddSelectedFiles([])
}

const handleAddImageUpload = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  setAddSelectedFiles(files)
  addForm.file = ''
  if (files.length === 1) {
    if (!addForm.name) addForm.name = getFileBaseName(files[0].name)
    if (!addForm.filetype) addForm.filetype = getFileExtension(files[0].name)
  } else if (!addForm.filetype) {
    addForm.filetype = ''
  }
  event.target.value = ''
}

const saveInlineAdd = async () => {
  if (addSelectedFiles.value.length > 0) {
    addUploading.value = true
    const totalFiles = addSelectedFiles.value.length
    startUploadStatus({
      total: totalFiles,
      stage: totalFiles > 1 ? 'Multiple image upload' : 'Single image upload',
      message: `${totalFiles} file${totalFiles > 1 ? 's' : ''} ready`
    })
    try {
      const records = []
      for (const [index, file] of addSelectedFiles.value.entries()) {
        const result = await uploadGalleryFileWithStatus(
          file,
          'gallery',
          index + 1,
          totalFiles,
          totalFiles > 1 ? 'Multiple image upload' : 'Single image upload'
        )
        records.push({
          name: addSelectedFiles.value.length === 1 && addForm.name ? addForm.name : getFileBaseName(file.name),
          file: result.url,
          filetype: addForm.filetype || getFileExtension(file.name),
          note: addForm.note,
          ref: addForm.ref,
          category: addForm.category,
          hash: addForm.hash,
          cover: addForm.cover
        })
      }

      updateUploadStatus({
        stage: 'Saving image records',
        message: 'Saving uploaded image records',
        current: totalFiles,
        total: totalFiles,
        percent: 95
      })
      const result = await importImages(records)
      if (result.success) {
        finishUploadStatus({ message: `${result.count} image${result.count > 1 ? 's' : ''} uploaded` })
        resetAddForm()
        isAddingInline.value = false
        await loadImages()
        await refreshImageSizes()
      } else {
        finishUploadStatus({ message: result.error, error: true })
        alert('新增失敗: ' + result.error)
      }
    } catch (e) {
      finishUploadStatus({ message: e.message, error: true })
      alert('批次上傳失敗: ' + e.message)
    } finally {
      addUploading.value = false
    }
    return
  }

  if (!addForm.name) { alert('請輸入圖片名稱'); return }
  try {
    const result = await addImage({ ...addForm })
    if (result.success) {
      resetAddForm()
      isAddingInline.value = false
      await loadImages()
      await refreshImageSizes()
    }
    else { alert('新增失敗: ' + result.error) }
  } catch (e) { alert('新增失敗: ' + e.message) }
}

// 開啟新增 Modal
const openAddModal = () => {
  isEditing.value = false
  resetForm()
  showModal.value = true
}

// 開啟編輯 Modal
const editImage = (image) => {
  isEditing.value = true
  Object.assign(formData, image)
  showModal.value = true
}

// 重置表單
const resetForm = () => {
  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })
  formData.id = null
  showSection.extra = false
}

// 關閉 Modal
const closeModal = () => {
  showModal.value = false
  resetForm()
}

// 圖片上傳處理
const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  startUploadStatus({ total: 1, stage: 'Single image upload', message: `${file.name} ready` })
  try {
    const result = await uploadGalleryFileWithStatus(file, 'gallery', 1, 1, 'Single image upload')
    if (result.success) {
      formData.file = result.url
      // 名稱預設為上傳檔案名稱（去除副檔名）
      if (!formData.name) {
        formData.name = file.name.replace(/\.[^.]+$/, '')
      }
      // 自動偵測檔案類型
      const ext = file.name.split('.').pop()
      if (ext) formData.filetype = ext
      finishUploadStatus({ message: `${file.name} uploaded` })
      alert('圖片上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    finishUploadStatus({ message: error.message, error: true })
    alert('上傳失敗: ' + error.message)
  } finally {
    event.target.value = ''
  }
}

// 移除已上傳圖片
const removeImage = () => {
  formData.file = ''
  formData.filetype = ''
  if (imageFileInput.value) {
    imageFileInput.value.value = ''
  }
}

// 封面圖片上傳處理
const handleCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  startUploadStatus({ total: 1, stage: 'Cover image upload', message: `${file.name} ready` })
  try {
    const result = await uploadGalleryFileWithStatus(file, 'gallery-covers', 1, 1, 'Cover image upload')
    if (result.success) {
      formData.cover = result.url
      finishUploadStatus({ message: `${file.name} uploaded` })
      alert('封面上傳成功！')
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Cover upload error:', error)
    finishUploadStatus({ message: error.message, error: true })
    alert('封面上傳失敗: ' + error.message)
  } finally {
    coverUploading.value = false
    event.target.value = ''
  }
}

// 移除封面
const removeCover = () => {
  formData.cover = ''
  if (coverFileInput.value) {
    coverFileInput.value.value = ''
  }
}

// 提交表單
const handleSubmit = async () => {
  if (!formData.name) {
    alert('請輸入圖片名稱')
    return
  }

  let result
  if (isEditing.value) {
    result = await updateImage(formData.id, formData)
  } else {
    result = await addImage(formData)
  }

  if (result.success) {
    closeModal()
    await loadImages()
    await refreshImageSizes()
  } else {
    alert('儲存失敗: ' + result.error)
  }
}

// 確認刪除
const confirmDelete = async (image) => {
  if (confirm(`確定要刪除這張圖片嗎？\n名稱: ${image.name || '(無名稱)'}`)) {
    await deleteImage(image.id)
  }
}

// ZIP 匯出
const exportImagesZip = async () => {
  if (images.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  try {
    startImportProgress('匯出 ZIP', '正在打包圖片檔案...', images.value.length)
    const { exportRecordsAsMediaZip } = await import('../../utils/zipMediaBundle')
    const stats = await exportRecordsAsMediaZip({
      records: images.value,
      jsonFileName: 'images.json',
      downloadName: 'supabase-images.zip',
      mediaMap: {
        file: { folder: 'images', fallbackExt: 'jpg' },
        cover: { folder: 'covers', fallbackExt: 'jpg' }
      },
      resolveUrl: resolveMediaUrl,
      onProgress: ({ stage, current, total, percent, stats: packStats }) => {
        if (stage === 'media') {
          updateImportProgress({
            stage: '打包圖片',
            message: `已處理 ${current || 0}/${total || images.value.length} 張（成功 ${packStats?.ok || 0}，失敗 ${packStats?.fail || 0}）`,
            current: current || 0,
            total: total || images.value.length
          })
        } else if (stage === 'compress') {
          updateImportProgress({
            stage: '壓縮 ZIP',
            message: `壓縮中 ${percent || 0}%`,
            current: images.value.length,
            total: images.value.length
          })
        }
      }
    })
    finishImportProgress({
      message: `匯出完成：媒體成功 ${stats.ok}，失敗 ${stats.fail}，略過 ${stats.skipped}`
    })
    alert(`匯出成功！\n媒體成功 ${stats.ok}，失敗 ${stats.fail}，略過 ${stats.skipped}`)
  } catch (error) {
    console.error('Error exporting ZIP:', error)
    finishImportProgress({ message: error.message || '匯出失敗', error: true })
    alert('匯出失敗：' + error.message)
  }
}

const zipFileInput = ref(null)

// ZIP Import — 相容 supabase-images.zip (images.json) 及 appwrite-image.zip (image.csv + images/)
const handleImportZip = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // 偵測格式：Appwrite (image.csv) vs Supabase (images.json)
    const csvFile = zip.file('image.csv')
    const jsonFile = zip.file('images.json')

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：image.csv + images/ 資料夾 =====
      console.log('偵測到 Appwrite image.zip 格式')
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseImageCsv(cleanText)

      if (parsed.length === 0) {
        alert('CSV 檔案無有效資料')
        return
      }

      const confirmMsg = `ℹ️ 偵測到 Appwrite image.zip 格式\n\n共 ${parsed.length} 筆圖片\n系統將自動上傳圖片至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      const { uploadFile: uploadToStorage } = useStorage()
      let uploadOk = 0
      let uploadFail = 0

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        // 移除 Appwrite 系統欄位
        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        // 上傳圖片檔案
        const localPath = mapped.file
        if (localPath && localPath.startsWith('images/')) {
          const zipEntry = zip.file(localPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = localPath.split('/').pop() || `image_${i}.jpg`
              const fileObj = new window.File([blob], fileName, {
                type: blob.type || `image/${mapped.filetype || 'jpeg'}`
              })
              const uploadResult = await uploadToStorage(fileObj, 'gallery')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                uploadOk++
              } else {
                console.warn(`上傳圖片失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                uploadFail++
              }
            } catch (err) {
              console.warn(`上傳圖片失敗 (${mapped.name}):`, err)
              mapped.file = ''
              uploadFail++
            }
          } else {
            console.warn(`ZIP 中找不到檔案: ${localPath}`)
            mapped.file = ''
          }
        }

        records.push(mapped)
      }

      if (uploadFail > 0) {
        console.warn(`圖片上傳: ${uploadOk} 成功, ${uploadFail} 失敗`)
      }

    } else if (jsonFile) {
      // ===== Supabase 格式：images.json（可含 images/、covers/ 媒體）=====
      const jsonText = await jsonFile.async('text')
      const jsonData = JSON.parse(jsonText)

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        alert('JSON 檔案格式錯誤或無資料')
        return
      }

      records = jsonData.map(record => {
        const { id, created_at, updated_at, ...rest } = record
        return rest
      })

      if (!confirm(`確定要匯入 ${records.length} 筆圖片資料嗎？\n若 ZIP 內含圖片檔，會自動上傳至 Storage。`)) return

      const { reuploadLocalMediaFromZip } = await import('../../utils/zipMediaBundle')
      const { uploadFile: uploadToStorage } = useStorage()
      const reuploaded = await reuploadLocalMediaFromZip({
        zip,
        records,
        mediaMap: {
          file: { prefixes: ['images/', 'media/'], storageFolder: 'gallery', mimeFallback: 'image/jpeg', filetypeField: 'filetype' },
          cover: { prefixes: ['covers/'], storageFolder: 'gallery-covers', mimeFallback: 'image/jpeg' }
        },
        uploadFile: uploadToStorage
      })
      records = reuploaded.records
    } else {
      alert('ZIP 檔案中找不到 images.json 或 image.csv')
      return
    }

    const result = await importImages(records)
    if (result.success) {
      alert(`✅ ${result.message}！共 ${result.count} 筆資料`)
      await loadImages()
      await refreshImageSizes()
    } else {
      alert('匯入失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Error importing ZIP:', error)
    alert('匯入失敗：' + error.message)
  }

  e.target.value = ''
}

// 解析 image.csv（Appwrite 格式）
const handleImportZipWithProgress = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    resetImportProgress()
    startImportProgress('讀取 ZIP', `正在讀取 ${file.name}`, 1)

    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)
    updateImportProgress({ current: 1, message: `${file.name} 讀取完成` })

    const csvFile = zip.file('image.csv')
    const jsonFile = zip.file('images.json')
    let records = []

    if (csvFile) {
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseImageCsv(cleanText)

      if (parsed.length === 0) {
        finishImportProgress({ message: 'CSV 檔案無有效資料', error: true })
        alert('CSV 檔案無有效資料')
        return
      }

      const confirmMsg = `偵測到 Appwrite image.zip 格式\n\n共 ${parsed.length} 筆圖片\n系統將自動上傳圖片至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) {
        resetImportProgress()
        return
      }

      const { uploadFile: uploadToStorage } = useStorage()
      let uploadOk = 0
      let uploadFail = 0
      startImportProgress('上傳圖片', '準備上傳 ZIP 內圖片', parsed.length)

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        updateImportProgress({
          current: i,
          message: `處理中：${row.name || `第 ${i + 1} 筆`}`
        })

        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        const localPath = mapped.file
        if (localPath && localPath.startsWith('images/')) {
          const zipEntry = zip.file(localPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = localPath.split('/').pop() || `image_${i}.jpg`
              const fileObj = new window.File([blob], fileName, {
                type: blob.type || `image/${mapped.filetype || 'jpeg'}`
              })
              const uploadResult = await uploadToStorage(fileObj, 'gallery')
              if (uploadResult.success) {
                mapped.file = uploadResult.path || uploadResult.url
                uploadOk++
              } else {
                console.warn(`圖片上傳失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                uploadFail++
              }
            } catch (err) {
              console.warn(`圖片上傳失敗 (${mapped.name}):`, err)
              mapped.file = ''
              uploadFail++
            }
          } else {
            console.warn(`ZIP 中找不到檔案: ${localPath}`)
            mapped.file = ''
            uploadFail++
          }
        }

        records.push(mapped)
        updateImportProgress({
          current: i + 1,
          message: `已整理 ${i + 1} / ${parsed.length} 筆圖片`
        })
      }

      if (uploadFail > 0) {
        console.warn(`圖片上傳結果: ${uploadOk} 成功, ${uploadFail} 失敗`)
      }
    } else if (jsonFile) {
      const jsonText = await jsonFile.async('text')
      const jsonData = JSON.parse(jsonText)

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        finishImportProgress({ message: 'JSON 檔案格式錯誤或無資料', error: true })
        alert('JSON 檔案格式錯誤或無資料')
        return
      }

      records = jsonData.map(record => {
        const { id, created_at, updated_at, ...rest } = record
        return rest
      })

      if (!confirm(`確定要匯入 ${records.length} 筆圖片資料嗎？\n若 ZIP 內含圖片檔，會自動上傳至 Storage。`)) {
        resetImportProgress()
        return
      }

      startImportProgress('上傳媒體', `準備上傳 ZIP 內圖片（${records.length} 筆）`, records.length)
      const { reuploadLocalMediaFromZip } = await import('../../utils/zipMediaBundle')
      const { uploadFile: uploadToStorage } = useStorage()
      const reuploaded = await reuploadLocalMediaFromZip({
        zip,
        records,
        mediaMap: {
          file: { prefixes: ['images/', 'media/'], storageFolder: 'gallery', mimeFallback: 'image/jpeg', filetypeField: 'filetype' },
          cover: { prefixes: ['covers/'], storageFolder: 'gallery-covers', mimeFallback: 'image/jpeg' }
        },
        uploadFile: uploadToStorage,
        onProgress: ({ current, total, stats }) => {
          updateImportProgress({
            current,
            total,
            message: `上傳媒體 ${current}/${total}（成功 ${stats.ok}，失敗 ${stats.fail}）`
          })
        }
      })
      records = reuploaded.records
      updateImportProgress({ current: records.length, message: `媒體處理完成，準備寫入資料庫` })
    } else {
      finishImportProgress({ message: 'ZIP 檔案中找不到 images.json 或 image.csv', error: true })
      alert('ZIP 檔案中找不到 images.json 或 image.csv')
      return
    }

    startImportProgress('寫入資料庫', `正在匯入 ${records.length} 筆圖片資料`, records.length)
    const result = await importImages(records)

    if (result.success) {
      updateImportProgress({ current: records.length, message: `已匯入 ${result.count} 筆圖片資料` })
      finishImportProgress({ message: `匯入完成，共 ${result.count} 筆圖片` })
      alert(`圖片匯入成功，共 ${result.count} 筆`)
      await loadImages()
      await refreshImageSizes()
    } else {
      finishImportProgress({ message: '圖片資料匯入失敗', error: true })
      alert('匯入失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Error importing ZIP:', error)
    finishImportProgress({ message: error.message || '匯入失敗', error: true })
    alert('匯入失敗：' + error.message)
  }

  e.target.value = ''
}

const parseImageCsv = (text) => {
  const parseRow = (line) => {
    const cells = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) { cells.push(current.trim()); current = '' }
      else current += char
    }
    cells.push(current.trim())
    return cells
  }
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const cells = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
}

// SEO
useHead({
  title: '鋒兄圖片 - 鋒兄AI Supabase',
  meta: [
    { name: 'description', content: '圖片管理系統' }
  ]
})
</script>

<style scoped>
/* ============================================================
   鋒兄圖片 — Instagram 風格
   · 限時動態式分類環、方格相片牆、貼文流、深色燈箱
   · IG 漸層（琥珀→洋紅→紫）只用在「身分」與「主要動作」上
   ============================================================ */
.gallery-page {
  --ig-bg: var(--bg-canvas);
  --ig-surface: var(--bg-surface);
  --ig-inset: var(--bg-muted);
  --ig-line: var(--border-subtle);
  --ig-text: var(--text-primary);
  --ig-text-2: var(--text-secondary);
  --ig-text-3: var(--text-muted);
  --ig-blue: #0095f6;
  --ig-blue-hover: #1877f2;
  --ig-red: #ed4956;
  --ig-gradient: linear-gradient(45deg, #f9ce34 0%, #ee2a7b 45%, #6228d7 100%);
  --ig-tile-gap: 4px;

  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  color: var(--ig-text);
  font-family: var(--font-body);
}

.dark .gallery-page {
  --ig-bg: #000;
  --ig-surface: #121212;
  --ig-inset: #1c1c1e;
  --ig-line: #2a2a2d;
  --ig-text: #f5f5f7;
  --ig-text-2: #b0b0b8;
  --ig-text-3: #7a7a83;
}

/* ══════════ 頂欄 ══════════ */
.ig-topbar {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  flex-wrap: wrap;
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--ig-line);
}

.ig-brand {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.ig-logo {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--ig-gradient);
  display: grid;
  place-items: center;
}

.ig-logo::after {
  content: '';
  width: 14px;
  height: 14px;
  border-radius: 5px;
  border: 2px solid #fff;
}

.ig-logo-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff;
}

.ig-wordmark {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  margin: 0;
  color: var(--ig-text);
}

.search-area {
  flex: 1 1 240px;
  min-width: 200px;
}

.search-area :deep(input) {
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--ig-inset);
  border: 1px solid transparent;
  color: var(--ig-text);
}

.search-area :deep(input:focus) {
  outline: none;
  border-color: var(--ig-line);
  background: var(--ig-surface);
}

.ig-tools {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.ig-icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--ig-line);
  background: var(--ig-surface);
  color: var(--ig-text-2);
  font-size: 1rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ig-icon-btn:hover {
  background: var(--ig-inset);
  color: var(--ig-text);
}

.ig-icon-btn--primary {
  background: var(--ig-blue);
  border-color: var(--ig-blue);
  color: #fff;
  font-size: 1.25rem;
  line-height: 1;
}

.ig-icon-btn--primary:hover {
  background: var(--ig-blue-hover);
  color: #fff;
}

/* ══════════ 限時動態分類列 ══════════ */
.story-rail {
  display: flex;
  gap: var(--sp-4);
  overflow-x: auto;
  padding: var(--sp-1) var(--sp-1) var(--sp-3);
  scrollbar-width: none;
}

.story-rail::-webkit-scrollbar {
  display: none;
}

.story {
  flex: 0 0 auto;
  width: 74px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.story-ring {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  padding: 2px;
  background: var(--ig-inset);
  transition: transform var(--transition-fast);
}

.story.active .story-ring {
  background: var(--ig-gradient);
}

.story:hover .story-ring {
  transform: scale(1.05);
}

.story-thumb {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--ig-surface);
  border: 2px solid var(--ig-surface);
}

.story-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.story-initial {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--ig-text-2);
}

.story-label {
  font-size: var(--text-xs);
  color: var(--ig-text);
  max-width: 74px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story.active .story-label {
  font-weight: 600;
}

.story-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ig-text-3);
}

/* ══════════ 個人檔案統計列 ══════════ */
.ig-profile-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: var(--sp-3) 0;
  border-top: 1px solid var(--ig-line);
  border-bottom: 1px solid var(--ig-line);
}

.ig-stats {
  display: flex;
  gap: var(--sp-5);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--ig-text-2);
}

.ig-stat strong {
  color: var(--ig-text);
  font-weight: 600;
}

.selected-count {
  color: var(--ig-blue);
}

.size-loading {
  font-size: var(--text-xs);
  color: var(--ig-text-3);
}

.ig-profile-tools {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.view-switcher {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--ig-inset);
}

.view-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  height: 28px;
  padding: 0 var(--sp-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ig-text-3);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-chip:hover {
  color: var(--ig-text);
}

.view-chip.active {
  background: var(--ig-surface);
  color: var(--ig-text);
  font-weight: 600;
  box-shadow: var(--elevation-1);
}

.view-chip-icon {
  font-size: 0.75rem;
}

.sort-control {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--ig-text-3);
}

.sort-select {
  height: 30px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
  background: var(--ig-surface);
  color: var(--ig-text);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-batch-mode,
.btn-cancel-batch {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
  background: var(--ig-surface);
  color: var(--ig-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-batch-mode:hover,
.btn-cancel-batch:hover {
  background: var(--ig-inset);
  color: var(--ig-text);
}

.select-all-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--ig-text-2);
  cursor: pointer;
}

.select-all-label input,
.tile-check,
.post-check,
.row-check {
  accent-color: var(--ig-blue);
  cursor: pointer;
}

.btn-batch-delete {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: none;
  background: var(--ig-red);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ══════════ 進度卡 ══════════ */
.import-progress-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--ig-line);
  background: var(--ig-surface);
}

.import-progress-card.is-complete {
  border-color: color-mix(in oklab, var(--success) 45%, transparent);
}

.import-progress-card.is-error {
  border-color: color-mix(in oklab, var(--ig-red) 55%, transparent);
}

.import-progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.import-progress-label {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ig-text);
}

.import-progress-stage {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--ig-text-3);
}

.import-progress-percent {
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--ig-blue);
}

.import-progress-bar {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--ig-inset);
  overflow: hidden;
}

.import-progress-fill {
  height: 100%;
  background: var(--ig-gradient);
  transition: width var(--transition-normal);
}

.import-progress-meta {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
  font-size: var(--text-xs);
  color: var(--ig-text-3);
}

/* ══════════ 狀態 ══════════ */
.loading-state,
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-16) var(--sp-4);
  color: var(--ig-text-3);
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.45;
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid var(--ig-inset);
  border-top-color: var(--ig-blue);
  animation: igSpin 0.8s linear infinite;
}

@keyframes igSpin {
  to { transform: rotate(360deg); }
}

/* ══════════ 容器版型 ══════════ */
.images-container {
  display: grid;
}

.images-container--grid {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--ig-tile-gap);
}

.images-container--feed {
  grid-template-columns: minmax(0, 560px);
  justify-content: center;
  gap: var(--sp-6);
}

.images-container--list {
  grid-template-columns: 1fr;
  gap: var(--sp-2);
}

.image-card {
  min-width: 0;
}

.image-card.is-selected {
  outline: 2px solid var(--ig-blue);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* ══════════ 方格模式 ══════════ */
.tile {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--ig-inset);
  cursor: pointer;
}

.images-container--grid .image-card:first-child .tile,
.images-container--grid .image-card:last-child .tile {
  border-radius: 0;
}

.tile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform var(--duration-slow) var(--ease-out-expo);
}

.tile:hover .tile-img {
  transform: scale(1.04);
}

.tile-empty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 1.75rem;
  opacity: 0.35;
  background: var(--ig-inset);
}

.tile-check {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 18px;
  height: 18px;
  z-index: 2;
}

.tile-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  padding: var(--sp-3);
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.1) 60%, rgba(0, 0, 0, 0));
  color: #fff;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.tile:hover .tile-overlay,
.tile:focus-within .tile-overlay {
  opacity: 1;
}

.tile-name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-sub {
  display: flex;
  gap: var(--sp-2);
  margin: 0;
  font-size: var(--text-2xs);
  opacity: 0.85;
}

.tile-tools {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.tile-type {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  padding: 2px 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

/* ══════════ 貼文模式 ══════════ */
.images-container--feed .image-card {
  border: 1px solid var(--ig-line);
  border-radius: var(--radius-lg);
  background: var(--ig-surface);
  overflow: hidden;
}

.post-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
}

.post-avatar {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--ig-gradient);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-sm);
}

.post-identity {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.post-author {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ig-text);
}

.post-place {
  font-size: var(--text-2xs);
  color: var(--ig-text-3);
}

.post-media {
  background: #000;
  cursor: zoom-in;
  max-height: 620px;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.post-img {
  width: 100%;
  max-height: 620px;
  object-fit: contain;
  display: block;
}

.post-empty {
  aspect-ratio: 4 / 3;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4) 0;
}

.post-action {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ig-text);
  font-size: 1rem;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.post-action:hover:not(:disabled) {
  background: var(--ig-inset);
  transform: scale(1.06);
}

.post-action:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.post-spacer {
  flex: 1;
}

.post-size {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--ig-text-3);
}

.post-caption {
  padding: var(--sp-2) var(--sp-4) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.post-title {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--ig-text);
}

.post-title strong {
  font-weight: 600;
  margin-right: var(--sp-2);
}

.post-note {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.55;
  color: var(--ig-text-2);
  white-space: pre-wrap;
}

.post-extra {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: var(--sp-2);
  border-top: 1px solid var(--ig-line);
}

.extra-item {
  display: flex;
  gap: var(--sp-2);
  font-size: var(--text-2xs);
  color: var(--ig-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.extra-label {
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ig-text-3);
}

.hash-value {
  font-family: var(--font-mono);
}

/* ══════════ 列表模式 ══════════ */
.images-container--list .image-card:not(.card-editing) {
  display: grid;
  grid-template-columns: auto 84px 1fr auto;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--ig-line);
  border-radius: var(--radius-md);
  background: var(--ig-surface);
  transition: background var(--transition-fast);
}

.images-container--list .image-card:not(.card-editing):hover {
  background: var(--ig-inset);
}

.row-thumb {
  width: 84px;
  height: 60px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--ig-inset);
  display: grid;
  place-items: center;
  cursor: zoom-in;
}

.row-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.row-thumb-empty {
  opacity: 0.4;
}

.row-copy {
  min-width: 0;
}

.image-name {
  margin: 0 0 2px;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--ig-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.row-size {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--ig-text-3);
}

.row-note {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--ig-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-badge {
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--ig-blue) 14%, transparent);
  color: var(--ig-blue);
}

.file-type-badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--ig-inset);
  color: var(--ig-text-2);
}

.image-actions {
  display: flex;
  gap: 2px;
}

.btn-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.images-container--feed .btn-icon,
.images-container--list .btn-icon,
.image-card--editor .btn-icon {
  background: transparent;
  color: var(--ig-text-2);
}

.btn-icon:hover:not(:disabled) {
  background: var(--ig-inset);
  color: var(--ig-text);
}

.tile-tools .btn-icon:hover {
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
}

.btn-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-icon.delete:hover {
  color: var(--ig-red);
}

.btn-icon.save:hover {
  color: var(--ig-blue);
}

/* ══════════ 行內編輯 ══════════ */
.image-card.card-editing {
  grid-column: 1 / -1;
  border: 1px solid var(--ig-line);
  border-radius: var(--radius-lg);
  background: var(--ig-surface);
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.image-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.inline-add-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.inline-field-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.inline-field-row > label {
  flex: 0 0 84px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ig-text-3);
}

.inline-input {
  flex: 1;
  min-width: 160px;
  height: 34px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
  background: var(--ig-inset);
  color: var(--ig-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.inline-input:focus {
  outline: none;
  border-color: var(--ig-blue);
  background: var(--ig-surface);
}

.inline-name {
  font-size: var(--text-md);
  font-weight: 600;
}

.btn-inline-upload {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--ig-line);
  color: var(--ig-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-inline-upload:hover {
  border-color: var(--ig-blue);
  color: var(--ig-blue);
}

.btn-inline-upload.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inline-file-name {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--text-xs);
  color: var(--ig-text-2);
}

.btn-inline-remove {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: var(--ig-inset);
  color: var(--ig-text-2);
  font-size: 0.6875rem;
  cursor: pointer;
}

.btn-inline-remove:hover {
  background: var(--ig-red);
  color: #fff;
}

.inline-selected-files {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--sp-2);
}

.selected-file-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
  background: var(--ig-inset);
}

.selected-file-thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  flex: 0 0 auto;
}

.selected-file-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-file-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.selected-file-name {
  font-size: var(--text-xs);
  color: var(--ig-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-file-size {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ig-text-3);
}

.selected-file-remove {
  margin-left: auto;
}

.inline-img-preview-wrap {
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--ig-inset);
  max-height: 320px;
  display: grid;
  place-items: center;
}

.inline-img-preview {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}

/* ══════════ Modal ══════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-4);
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(3px);
}

.modal-content {
  width: min(560px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: var(--ig-surface);
  border: 1px solid var(--ig-line);
  box-shadow: var(--elevation-3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4);
  border-bottom: 1px solid var(--ig-line);
}

.modal-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--ig-text);
}

.btn-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ig-text-2);
  font-size: 1rem;
  cursor: pointer;
}

.btn-close:hover {
  background: var(--ig-inset);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4);
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.form-group label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ig-text-3);
}

.required {
  color: var(--ig-red);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
  background: var(--ig-inset);
  color: var(--ig-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--ig-blue);
  background: var(--ig-surface);
}

.form-textarea {
  resize: vertical;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.btn-upload {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--ig-line);
  background: transparent;
  color: var(--ig-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-upload:hover:not(:disabled) {
  border-color: var(--ig-blue);
  color: var(--ig-blue);
}

.btn-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-progress {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--ig-blue);
}

.image-preview {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.preview-image {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
}

.btn-remove {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
  background: transparent;
  color: var(--ig-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-remove:hover {
  color: var(--ig-red);
  border-color: var(--ig-red);
}

.form-section {
  border-top: 1px solid var(--ig-line);
  padding-top: var(--sp-3);
}

.section-toggle {
  margin: 0 0 var(--sp-3);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ig-text-2);
  cursor: pointer;
  user-select: none;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-4);
  border-top: 1px solid var(--ig-line);
}

.btn-cancel {
  height: 34px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--ig-line);
  background: transparent;
  color: var(--ig-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--ig-inset);
  color: var(--ig-text);
}

.btn-submit {
  height: 34px;
  padding: 0 var(--sp-5);
  border-radius: var(--radius-sm);
  border: none;
  background: var(--ig-blue);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:hover:not(:disabled) {
  background: var(--ig-blue-hover);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ══════════ 燈箱 ══════════ */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-popover);
  display: grid;
  grid-template-columns: 56px 1fr 56px;
  align-items: center;
  background: rgba(0, 0, 0, 0.92);
  padding: var(--sp-4);
}

.lightbox-close {
  position: absolute;
  top: var(--sp-4);
  right: var(--sp-4);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.24);
}

.lightbox-nav {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  justify-self: center;
}

.lightbox-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.24);
}

.lightbox-nav:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.lightbox-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  max-height: 86vh;
  height: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #121212;
  border: 1px solid #2a2a2d;
}

.lightbox-stage {
  display: grid;
  place-items: center;
  background: #000;
  overflow: hidden;
}

.lightbox-image {
  max-width: 100%;
  max-height: 86vh;
  object-fit: contain;
  display: block;
}

.lightbox-side {
  display: flex;
  flex-direction: column;
  border-left: 1px solid #2a2a2d;
  color: #f5f5f7;
  overflow: hidden;
}

.lightbox-side-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid #2a2a2d;
}

.lightbox-side-head .post-author {
  color: #f5f5f7;
}

.lightbox-side-head .post-place {
  color: #8a8a93;
}

.lightbox-meta {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-4);
}

.lightbox-meta h3 {
  margin: 0 0 var(--sp-2);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
}

.lightbox-note {
  margin: 0 0 var(--sp-4);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: #b0b0b8;
  white-space: pre-wrap;
}

.lightbox-facts {
  margin: 0 0 var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.lightbox-facts > div {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: var(--sp-2);
  font-size: var(--text-xs);
}

.lightbox-facts dt {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7a7a83;
}

.lightbox-facts dd {
  margin: 0;
  color: #d8d8de;
  overflow-wrap: anywhere;
}

.lightbox-counter {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: #7a7a83;
}

.lightbox-actions {
  display: flex;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid #2a2a2d;
}

.btn-lightbox {
  flex: 1;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid #2a2a2d;
  background: #1c1c1e;
  color: #f5f5f7;
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-lightbox:hover {
  background: var(--ig-blue);
  border-color: var(--ig-blue);
}

/* ══════════ 響應式 ══════════ */
@media (max-width: 900px) {
  .lightbox-content {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .lightbox-side {
    border-left: none;
    border-top: 1px solid #2a2a2d;
    max-height: 40vh;
  }
}

@media (max-width: 768px) {
  .ig-topbar {
    gap: var(--sp-3);
  }

  .images-container--grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }

  .images-container--feed {
    grid-template-columns: minmax(0, 1fr);
  }

  .images-container--list .image-card:not(.card-editing) {
    grid-template-columns: auto 64px 1fr;
    grid-template-areas: none;
  }

  .images-container--list .image-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .row-thumb {
    width: 64px;
    height: 48px;
  }

  .tile-overlay {
    opacity: 1;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0) 55%);
  }

  .tile-tools {
    display: none;
  }

  .lightbox-overlay {
    grid-template-columns: 40px 1fr 40px;
    padding: var(--sp-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile-img,
  .story-ring,
  .post-action {
    transition: none;
  }

  .spinner {
    animation: none;
  }
}
</style>
