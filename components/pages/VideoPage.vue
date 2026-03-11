<template>
  <div class="video-manager-container">
    <h1 class="page-brand-title">鋒兄影片庫</h1>

    <!-- 影片管理資訊 -->
    <div class="video-info">
      <h3>📹 影片雲端管理</h3>
      <p>使用 Supabase Storage 儲存影片，支援本地快取離線播放</p>
      <div class="video-stats">
        <div class="stat-item">
          <span class="stat-label">影片數量:</span>
          <span class="stat-value">{{ videoList.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">快取大小:</span>
          <span class="stat-value">{{ formatCacheSize(totalCacheSize) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已快取：</span>
          <span class="stat-value">{{ cachedVideos.length }}/{{ videoList.length }}</span>
        </div>
      </div>
    </div>

    <!-- 上傳指南 -->
    <div class="upload-guide" v-if="storageStatusChecked && videoList.some(v => v.exists === false)">
      <h3>📤 影片上傳指南</h3>
      <p>部分影片尚未上傳到 Supabase Storage，請依照以下步驟：</p>
      <ol>
        <li>前往 Supabase Dashboard → Storage → <code>videos</code> bucket</li>
        <li>上傳影片檔案（確認 bucket 設為 public）</li>
        <li>點擊 "🔄 檢查 Storage 狀態" 確認上傳狀態</li>
      </ol>
    </div>

    <!-- 快取管理控制 -->
    <div class="cache-controls">
      <h3>🗂️ 快取管理</h3>
      <div class="control-buttons">
        <button
          @click="checkStorageStatus"
          class="cache-btn refresh"
        >
          🔄 檢查 Storage 狀態
        </button>
        <button
          @click="preloadAllVideos"
          class="cache-btn preload"
          :disabled="isPreloading"
        >
          {{ isPreloading ? '載入中...' : '📥 預載所有影片' }}
        </button>
        <button
          @click="clearAllCache"
          class="cache-btn clear"
        >
          🗑️ 清除所有快取
        </button>
        <button
          @click="checkCacheStatus"
          class="cache-btn refresh"
        >
          🔄 更新快取狀態
        </button>
      </div>
      <div v-if="cacheMessage" class="cache-message" :class="cacheMessageType">
        {{ cacheMessage }}
      </div>
    </div>

    <!-- 影片列表 -->
    <div class="video-list">
      <h3>🎬 影片清單</h3>
      <div class="videos-grid">
        <div
          v-for="video in videoList"
          :key="video.storageKey"
          class="video-card"
        >
          <div class="video-header">
            <h4>{{ video.displayName }}</h4>
            <div class="video-status">
              <span v-if="video.exists === true" class="status-badge blob-exists">已上傳</span>
              <span v-else-if="video.exists === false" class="status-badge blob-missing">未上傳</span>
              <span v-else class="status-badge blob-checking">檢查中</span>
              <span v-if="video.cached" class="status-badge cached">已快取</span>
              <span v-else class="status-badge not-cached">未快取</span>
            </div>
          </div>

          <div class="video-player-container">
            <!-- 延遲載入預覽 -->
            <div
              v-if="!video.loaded && !video.loading && !video.error"
              class="video-lazy-preview"
              @click="loadVideo(video.storageKey)"
            >
              <div class="lazy-preview-content">
                <div class="preview-poster" v-if="video.poster">
                  <img :src="video.poster" :alt="video.displayName" class="poster-image">
                </div>
                <div class="preview-overlay">
                  <div class="play-button">
                    <div class="play-icon">▶️</div>
                  </div>
                  <div class="preview-info">
                    <h4>{{ video.displayName }}</h4>
                    <p class="preview-size">{{ formatFileSize(video.fileSize) }}</p>
                    <p class="preview-hint">點擊載入影片</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 影片播放器 -->
            <video
              v-if="video.loaded"
              :ref="'video-' + video.storageKey"
              class="video-player"
              controls
              preload="metadata"
              :poster="video.poster"
              @loadstart="onVideoLoadStart(video.storageKey)"
              @loadeddata="onVideoLoaded(video.storageKey)"
              @error="onVideoError(video.storageKey, $event)"
            >
              <source :src="getVideoUrl(video.storageKey)" type="video/mp4">
              您的瀏覽器不支援影片播放。
            </video>

            <!-- 載入中覆蓋層 -->
            <div v-if="video.loading" class="video-loading-overlay">
              <div class="loading-spinner"></div>
              <p>正在從 Supabase Storage 載入影片...</p>
              <div class="loading-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: video.loadProgress + '%' }"></div>
                </div>
                <span class="progress-text">{{ video.loadProgress }}%</span>
              </div>
            </div>

            <!-- 錯誤覆蓋層 -->
            <div v-if="video.error" class="video-error-overlay">
              <div class="error-icon">⚠️</div>
              <div class="error-content">
                <h4>影片載入失敗</h4>
                <p class="error-message">{{ getErrorMessage(video.errorType) }}</p>
                <div class="error-details" v-if="video.errorDetails">
                  <p><strong>錯誤詳情:</strong> {{ video.errorDetails }}</p>
                  <p><strong>影片檔案:</strong> {{ video.storageKey }}</p>
                  <p><strong>狀態:</strong> {{ video.exists ? '已上傳' : '未上傳' }}</p>
                </div>
                <div class="error-actions">
                  <button
                    @click="retryVideo(video.storageKey)"
                    class="retry-btn primary"
                  >
                    🔄 重新載入
                  </button>
                  <button
                    @click="checkSingleStatus(video.storageKey)"
                    class="retry-btn secondary"
                  >
                    🔍 檢查狀態
                  </button>
                  <button
                    v-if="video.exists === false"
                    @click="showUploadInstructions(video.storageKey)"
                    class="retry-btn info"
                  >
                    📤 查看上傳說明
                  </button>
                </div>
              </div>
            </div>

            <!-- 狀態提示 -->
            <div v-if="video.statusInfo" class="blob-status-notification" :class="video.statusInfo.type">
              <div class="status-icon">
                {{ video.statusInfo.type === 'success' ? '✅' : video.statusInfo.type === 'warning' ? '⚠️' : video.statusInfo.type === 'error' ? '❌' : 'ℹ️' }}
              </div>
              <div class="status-message">
                <p>{{ video.statusInfo.message }}</p>
                <small v-if="video.statusInfo.details">{{ video.statusInfo.details }}</small>
              </div>
              <button @click="clearStatusInfo(video.storageKey)" class="status-close">✕</button>
            </div>
          </div>

          <div class="video-info-panel">
            <div class="video-details">
              <div class="detail-row">
                <span class="detail-label">檔案名稱:</span>
                <span class="detail-value">{{ video.storageKey }}</span>
              </div>
              <div class="detail-row" v-if="video.fileSize">
                <span class="detail-label">檔案大小:</span>
                <span class="detail-value">{{ formatFileSize(video.fileSize) }}</span>
              </div>
              <div class="detail-row" v-if="video.uploadedAt">
                <span class="detail-label">上傳時間:</span>
                <span class="detail-value">{{ formatDate(video.uploadedAt) }}</span>
              </div>
            </div>

            <div class="video-actions">
              <button
                v-if="!video.cached"
                @click="cacheVideo(video.storageKey)"
                class="action-btn cache"
                :disabled="video.caching"
              >
                {{ video.caching ? '快取中...' : '📥 快取影片' }}
              </button>
              <button
                v-if="video.cached"
                @click="clearVideoCache(video.storageKey)"
                class="action-btn clear-cache"
              >
                🗑️ 清除此快取
              </button>
              <button
                @click="downloadVideo(video.storageKey, video.displayName)"
                class="action-btn download"
              >
                💾 下載影片
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 技術說明 -->
    <div class="tech-info">
      <h3>💡 技術說明</h3>
      <div class="tech-features">
        <div class="feature-item">
          <div class="feature-icon">📦</div>
          <div class="feature-content">
            <h4>本地快取</h4>
            <p>影片可以快取到本地，實現離線播放功能</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⚡</div>
          <div class="feature-content">
            <h4>延遲載入</h4>
            <p>影片採用延遲載入技術，點擊時才從 Supabase Storage 載入，節省頻寬</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🔒</div>
          <div class="feature-content">
            <h4>安全存儲</h4>
            <p>所有影片存儲在 Supabase Storage 雲端，透過 HTTPS 安全傳輸</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🛠️</div>
          <div class="feature-content">
            <h4>智能錯誤處理</h4>
            <p>自動檢測儲存狀態，提供詳細錯誤信息和解決方案</p>
          </div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📱</div>
          <div class="feature-content">
            <h4>響應式設計</h4>
            <p>支援各種螢幕尺寸，在手機和平板上也能流暢觀看</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useVideos } from '../../composables/useVideos'
import { useFormatters } from '../../composables/useFormatters'

const {
  videoList,
  cachedVideos,
  totalCacheSize,
  isPreloading,
  storageStatusChecked,
  cacheMessage,
  cacheMessageType,
  getVideoUrl,
  onVideoLoadStart,
  onVideoLoaded,
  onVideoError,
  retryVideo,
  cacheVideo,
  clearVideoCache,
  preloadAllVideos,
  clearAllCache,
  checkCacheStatus,
  checkStorageStatus,
  downloadVideo,
  loadVideo,
  checkSingleStatus,
  showUploadInstructions,
  clearStatusInfo,
  getErrorMessage
} = useVideos()

const { formatFileSize, formatCacheSize, formatDate } = useFormatters()

// 組件掛載時檢查 Storage 狀態
onMounted(() => {
  checkStorageStatus()
})

// 暴露方法給父組件
defineExpose({
  videoList,
  cachedVideos,
  checkStorageStatus
})
</script>


<style scoped>
/* 影片管理樣式 */
.video-manager-container {
  animation: fadeIn 0.3s ease-in;
}

.video-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  text-align: center;
}

.video-info h3 {
  margin-bottom: 1rem;
  font-size: 1.8rem;
}

.video-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
}

.upload-guide {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.upload-guide h3 {
  color: #856404;
  margin-bottom: 1rem;
}

.upload-guide p {
  color: #856404;
  margin-bottom: 1rem;
}

.upload-guide ol {
  color: #856404;
  padding-left: 1.5rem;
}

.upload-guide li {
  margin-bottom: 0.5rem;
}

.upload-guide code {
  background: #f8f9fa;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e83e8c;
}

.cache-controls {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.cache-controls h3 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.control-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.cache-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.cache-btn.preload {
  background: #3498db;
  color: white;
}

.cache-btn.preload:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-2px);
}

.cache-btn.clear {
  background: #e74c3c;
  color: white;
}

.cache-btn.clear:hover {
  background: #c0392b;
  transform: translateY(-2px);
}

.cache-btn.refresh {
  background: #95a5a6;
  color: white;
}

.cache-btn.refresh:hover {
  background: #7f8c8d;
  transform: translateY(-2px);
}

.cache-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.cache-message {
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-weight: 500;
}

.cache-message.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.cache-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.cache-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.video-list {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.video-list h3 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.videos-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

.video-card {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.video-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.video-header {
  padding: 1.5rem;
  background: white;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.video-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.video-status {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-badge.cached {
  background: #d4edda;
  color: #155724;
}

.status-badge.not-cached {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.blob-exists {
  background: #d1ecf1;
  color: #0c5460;
}

.status-badge.blob-missing {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.blob-checking {
  background: #fff3cd;
  color: #856404;
}

.video-player-container {
  position: relative;
  padding: 1.5rem;
}

.video-player {
  width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 延遲載入預覽 */
.video-lazy-preview {
  position: relative;
  width: 100%;
  height: 300px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.video-lazy-preview:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.lazy-preview-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-poster {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: relative;
  z-index: 2;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.play-button {
  margin-bottom: 1rem;
}

.play-icon {
  font-size: 3rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
  transition: all 0.3s ease;
}

.video-lazy-preview:hover .play-icon {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
}

.preview-info h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.preview-size {
  margin: 0 0 0.5rem 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.preview-hint {
  margin: 0;
  opacity: 0.7;
  font-size: 0.8rem;
}

.video-loading-overlay,
.video-error-overlay {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  right: 1.5rem;
  bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  backdrop-filter: blur(5px);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 載入進度條 */
.loading-progress {
  width: 100%;
  margin-top: 1rem;
  text-align: center;
}

.progress-bar {
  width: 200px;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin: 0 auto 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}

.retry-btn:hover {
  background: #2980b9;
}

/* 錯誤內容樣式 */
.error-content {
  text-align: center;
}

.error-content h4 {
  margin: 0 0 1rem 0;
  color: #e74c3c;
  font-size: 1.2rem;
}

.error-message {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #666;
}

.error-details {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
  text-align: left;
  font-size: 0.9rem;
}

.error-details p {
  margin: 0 0 0.5rem 0;
}

.error-details p:last-child {
  margin-bottom: 0;
}

.error-actions {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.retry-btn.primary {
  background: #3498db;
  color: white;
}

.retry-btn.primary:hover {
  background: #2980b9;
}

.retry-btn.secondary {
  background: #95a5a6;
  color: white;
}

.retry-btn.secondary:hover {
  background: #7f8c8d;
}

.retry-btn.info {
  background: #f39c12;
  color: white;
}

.retry-btn.info:hover {
  background: #e67e22;
}

/* 狀態通知 */
.blob-status-notification {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  z-index: 10;
  animation: slideInDown 0.3s ease;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.blob-status-notification.success {
  border-left: 4px solid #27ae60;
}

.blob-status-notification.warning {
  border-left: 4px solid #f39c12;
}

.blob-status-notification.error {
  border-left: 4px solid #e74c3c;
}

.blob-status-notification.info {
  border-left: 4px solid #3498db;
}

.status-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.status-message {
  flex: 1;
  min-width: 0;
}

.status-message p {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: #2c3e50;
}

.status-message small {
  color: #666;
  font-size: 0.85rem;
  white-space: pre-line;
}

.status-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  color: #999;
  font-size: 1rem;
  flex-shrink: 0;
}

.status-close:hover {
  color: #666;
}

.video-info-panel {
  padding: 1.5rem;
  background: white;
  border-top: 1px solid #e1e8ed;
}

.video-details {
  margin-bottom: 1.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: #666;
  min-width: 80px;
}

.detail-value {
  color: #2c3e50;
  word-break: break-all;
  text-align: right;
}

.video-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  flex: 1;
  min-width: 120px;
}

.action-btn.cache {
  background: #3498db;
  color: white;
}

.action-btn.cache:hover:not(:disabled) {
  background: #2980b9;
}

.action-btn.clear-cache {
  background: #e74c3c;
  color: white;
}

.action-btn.clear-cache:hover {
  background: #c0392b;
}

.action-btn.download {
  background: #27ae60;
  color: white;
}

.action-btn.download:hover {
  background: #229954;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tech-info {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.tech-info h3 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.tech-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.feature-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.feature-content h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.feature-content p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ===== 響應式設計優化 ===== */

@media (min-width: 1200px) {
  .video-manager-container {
    max-width: 1400px;
    margin: 0 auto;
  }
  .videos-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2.5rem;
  }
  .video-card {
    padding: 0;
  }
  .video-info-panel {
    padding: 2rem;
  }
  .page-brand-title {
    font-size: 2rem;
  }
  .tech-features {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .video-manager-container {
    max-width: 1000px;
    margin: 0 auto;
  }
  .videos-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem;
  }
  .video-info-panel {
    padding: 1.8rem;
  }
  .control-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  .page-brand-title {
    font-size: 1.8rem;
  }
  .tech-features {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 769px) and (max-width: 1199px) and (orientation: landscape) {
  .videos-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .video-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }
  .video-player-container {
    grid-column: 1;
  }
  .video-info-panel {
    grid-column: 2;
    border-left: 1px solid #e1e8ed;
  }
}

@media (min-width: 769px) and (max-width: 1199px) and (orientation: portrait) {
  .videos-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .video-card {
    max-width: 700px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .videos-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .video-stats {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  .control-buttons {
    flex-direction: column;
    gap: 1rem;
  }
  .cache-btn {
    width: 100%;
    padding: 1rem;
  }
  .video-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  .video-status {
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }
  .detail-value {
    text-align: left;
    word-break: break-all;
  }
  .video-actions {
    flex-direction: column;
    gap: 0.8rem;
  }
  .action-btn {
    min-width: auto;
    padding: 0.8rem;
  }
  .tech-features {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }
  .page-brand-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) and (orientation: portrait) {
  .video-info,
  .cache-controls,
  .video-list,
  .tech-info {
    padding: 1.2rem;
    margin-bottom: 1.5rem;
  }
  .video-player-container {
    padding: 1rem;
  }
  .video-info-panel {
    padding: 1.2rem;
  }
  .video-stats {
    gap: 0.8rem;
  }
  .stat-item {
    padding: 0.8rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
  }
  .cache-btn {
    padding: 0.8rem 1rem;
    font-size: 0.9rem;
  }
  .page-brand-title {
    font-size: 1.4rem;
  }
  .video-header h4 {
    font-size: 1.1rem;
  }
  .status-badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
  }
  .action-btn {
    padding: 0.6rem;
    font-size: 0.85rem;
  }
  .feature-item {
    padding: 0.8rem;
  }
  .feature-icon {
    font-size: 1.8rem;
  }
}

@media (max-width: 915px) and (max-height: 480px) and (orientation: landscape) {
  .video-info,
  .cache-controls,
  .video-list,
  .tech-info {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .video-player-container {
    padding: 0.8rem;
  }
  .video-info-panel {
    padding: 1rem;
  }
  .video-stats {
    flex-direction: row;
    justify-content: space-around;
    gap: 1rem;
  }
  .control-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
  }
  .video-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .detail-row {
    flex-direction: row;
    justify-content: space-between;
  }
  .video-actions {
    flex-direction: row;
    gap: 0.6rem;
  }
  .page-brand-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 375px) and (orientation: portrait) {
  .video-info,
  .cache-controls,
  .video-list,
  .tech-info {
    padding: 1rem;
    margin-bottom: 1.2rem;
  }
  .video-player-container {
    padding: 0.8rem;
  }
  .video-info-panel {
    padding: 1rem;
  }
  .video-stats {
    gap: 0.6rem;
  }
  .stat-item {
    padding: 0.6rem;
    font-size: 0.9rem;
  }
  .cache-btn {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }
  .page-brand-title {
    font-size: 1.3rem;
  }
  .video-header h4 {
    font-size: 1rem;
  }
  .status-badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
  }
  .detail-row {
    gap: 0.2rem;
  }
  .detail-label {
    font-size: 0.85rem;
  }
  .detail-value {
    font-size: 0.85rem;
  }
  .action-btn {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
  .feature-item {
    padding: 0.6rem;
    gap: 0.8rem;
  }
  .feature-icon {
    font-size: 1.6rem;
  }
  .feature-content h4 {
    font-size: 0.95rem;
  }
  .feature-content p {
    font-size: 0.85rem;
  }
}

@media (max-width: 667px) and (max-height: 375px) and (orientation: landscape) {
  .video-info,
  .cache-controls,
  .video-list,
  .tech-info {
    padding: 0.8rem;
    margin-bottom: 0.8rem;
  }
  .video-player-container {
    padding: 0.6rem;
  }
  .video-info-panel {
    padding: 0.8rem;
  }
  .video-stats {
    flex-direction: row;
    gap: 0.8rem;
  }
  .control-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
  .cache-btn {
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }
  .page-brand-title {
    font-size: 1.1rem;
  }
  .tech-features {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
  }
}

@media (max-width: 320px) {
  .video-info,
  .cache-controls,
  .video-list,
  .tech-info {
    padding: 0.8rem;
    margin-bottom: 1rem;
  }
  .video-player-container {
    padding: 0.6rem;
  }
  .video-info-panel {
    padding: 0.8rem;
  }
  .video-stats {
    gap: 0.5rem;
  }
  .stat-item {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
  .cache-btn {
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
  }
  .page-brand-title {
    font-size: 1.1rem;
  }
  .video-header h4 {
    font-size: 0.9rem;
  }
  .status-badge {
    font-size: 0.65rem;
    padding: 0.1rem 0.4rem;
  }
  .action-btn {
    padding: 0.4rem;
    font-size: 0.75rem;
  }
  .feature-item {
    padding: 0.5rem;
    gap: 0.6rem;
  }
  .feature-icon {
    font-size: 1.4rem;
  }
}
</style>
