<template>
  <PageContainer>
    <div
      class="video-page"
      :class="[
        `mode-${videoDisplayMode}`,
        { 'is-watching': Boolean(watchingVideo) }
      ]"
    >
      <!-- ── Watch Stage（YouTube / Bilibili 雙模式主舞台）── -->
      <section
        v-if="watchingVideo"
        class="watch-stage"
        :class="[
          `watch-stage--${videoDisplayMode}`,
          { 'watch-stage--theater': theaterMode }
        ]"
        aria-label="影片播放"
      >
        <header class="watch-toolbar">
          <button type="button" class="watch-back-btn" @click="exitWatchStage()">
            ← 返回影片庫
          </button>
          <div class="view-switcher" role="group" aria-label="播放版型">
            <button
              type="button"
              class="view-switch-btn"
              :class="{ active: videoDisplayMode === 'youtube' }"
              @click="setVideoDisplayMode('youtube')"
            >
              YouTube
            </button>
            <button
              type="button"
              class="view-switch-btn"
              :class="{ active: videoDisplayMode === 'bilibili' }"
              @click="setVideoDisplayMode('bilibili')"
            >
              Bilibili
            </button>
          </div>
          <button
            type="button"
            class="watch-theater-btn"
            :aria-pressed="theaterMode"
            @click="theaterMode = !theaterMode"
          >
            {{ theaterMode ? '退出劇場' : '劇場模式' }}
          </button>
          <p class="watch-hotkeys" title="空白/K 播放暫停 · ←→ 快轉 · ↑↓ 音量 · M 靜音 · F 全螢幕 · T 劇場 · N 下一支 · Esc 返回">
            快捷鍵：空白 播放 · F 全螢幕 · N 下一支 · Esc 返回
          </p>
        </header>

        <div class="watch-layout">
          <div class="watch-primary">
            <div
              ref="watchPlayerShellRef"
              class="watch-player-shell"
              :class="{
                'is-controls-visible': watchControlsVisible || !watchIsPlaying,
                'is-fullscreen': watchIsFullscreen
              }"
              @mousemove="revealWatchControls"
              @mouseleave="scheduleHideWatchControls"
              @pointerdown="revealWatchControls"
            >
              <video
                :key="watchingVideo.id"
                :ref="setActiveVideoRef"
                :src="getVideoSrc(watchingVideo)"
                autoplay
                playsinline
                class="watch-player"
                @click="toggleWatchPlayback"
                @dblclick="toggleWatchFullscreen"
                @play="handleWatchPlay($event, watchingVideo)"
                @pause="handleWatchPause($event, watchingVideo)"
                @timeupdate="handleWatchProgress($event, watchingVideo)"
                @loadedmetadata="handleWatchLoaded($event, watchingVideo)"
                @volumechange="syncWatchVolumeFromElement"
                @ended="handleWatchEnded"
                @error="handleInlineVideoError($event, watchingVideo)"
              ></video>

              <div
                v-if="resolvingVideoIds.has(watchingVideo.id) || !getVideoSrc(watchingVideo)"
                class="watch-player-loading"
                role="status"
              >
                影片準備中…
              </div>

              <button
                v-else-if="!watchIsPlaying && !watchUpNextActive"
                type="button"
                class="watch-center-play"
                aria-label="播放"
                @click="toggleWatchPlayback"
              >
                ▶
              </button>

              <!-- 播完倒數連播 -->
              <div
                v-if="watchUpNextActive && nextRelatedVideo"
                class="watch-upnext"
                role="dialog"
                aria-label="即將播放下一支"
                @click.stop
              >
                <p class="watch-upnext-kicker">接下來</p>
                <strong class="watch-upnext-title">{{ nextRelatedVideo.name || '未命名' }}</strong>
                <p class="watch-upnext-count">
                  <span class="watch-upnext-num">{{ watchUpNextSeconds }}</span> 秒後自動播放
                </p>
                <div class="watch-upnext-actions">
                  <button type="button" class="watch-upnext-btn watch-upnext-btn--primary" @click="confirmWatchUpNext">
                    立即播放
                  </button>
                  <button type="button" class="watch-upnext-btn" @click="cancelWatchUpNext">
                    取消
                  </button>
                </div>
                <div class="watch-upnext-bar" aria-hidden="true">
                  <div
                    class="watch-upnext-bar-fill"
                    :style="{ transform: `scaleX(${watchUpNextProgress})` }"
                  ></div>
                </div>
              </div>

              <div class="watch-chrome" @click.stop>
                <div class="watch-progress-block">
                  <input
                    class="watch-progress"
                    type="range"
                    min="0"
                    :max="Math.max(watchDuration, 0.1)"
                    step="0.1"
                    :value="watchCurrentTime"
                    :aria-valuetext="`${formatWatchTime(watchCurrentTime)} / ${formatWatchTime(watchDuration)}`"
                    aria-label="播放進度"
                    @input="seekWatchVideo($event.target.value)"
                  />
                </div>

                <div class="watch-chrome-row">
                  <div class="watch-chrome-left">
                    <button
                      type="button"
                      class="watch-ctrl-btn"
                      :aria-label="watchIsPlaying ? '暫停' : '播放'"
                      @click="toggleWatchPlayback"
                    >
                      {{ watchIsPlaying ? '❚❚' : '▶' }}
                    </button>
                    <button
                      type="button"
                      class="watch-ctrl-btn"
                      :disabled="!nextRelatedVideo"
                      aria-label="下一支"
                      title="下一支"
                      @click="playNextRelated"
                    >
                      ⏭
                    </button>
                    <span class="watch-time">
                      {{ formatWatchTime(watchCurrentTime) }}
                      <span class="watch-time-sep">/</span>
                      {{ formatWatchTime(watchDuration) }}
                    </span>
                  </div>

                  <div class="watch-chrome-right">
                    <label class="watch-volume" title="音量">
                      <button
                        type="button"
                        class="watch-ctrl-btn watch-ctrl-btn--compact"
                        :aria-label="watchIsMuted || watchVolume === 0 ? '取消靜音' : '靜音'"
                        @click="toggleWatchMute"
                      >
                        {{ watchIsMuted || watchVolume === 0 ? '🔇' : watchVolume < 0.45 ? '🔉' : '🔊' }}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        :value="watchIsMuted ? 0 : watchVolume"
                        aria-label="音量"
                        @input="setWatchVolume($event.target.value)"
                      />
                    </label>

                    <label class="watch-speed">
                      <span class="sr-only">播放速度</span>
                      <select
                        :value="watchPlaybackRate"
                        aria-label="播放速度"
                        @change="setWatchPlaybackRate($event.target.value)"
                      >
                        <option v-for="rate in watchSpeedOptions" :key="rate" :value="rate">
                          {{ rate }}x
                        </option>
                      </select>
                    </label>

                    <button
                      type="button"
                      class="watch-ctrl-btn"
                      :aria-pressed="theaterMode"
                      :title="theaterMode ? '退出劇場' : '劇場模式'"
                      @click="theaterMode = !theaterMode"
                    >
                      {{ theaterMode ? '▦' : '▭' }}
                    </button>
                    <button
                      type="button"
                      class="watch-ctrl-btn"
                      :aria-label="watchIsFullscreen ? '退出全螢幕' : '全螢幕'"
                      :title="watchIsFullscreen ? '退出全螢幕 (F)' : '全螢幕 (F)'"
                      @click="toggleWatchFullscreen"
                    >
                      {{ watchIsFullscreen ? '⤓' : '⤢' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="watch-info">
              <div v-if="videoDisplayMode === 'bilibili'" class="watch-avatar" aria-hidden="true">鋒</div>
              <div class="watch-info-copy">
                <h1 class="watch-title">{{ watchingVideo.name || '未命名' }}</h1>
                <div class="watch-meta-row">
                  <span v-if="watchingVideo.category" class="category-chip">{{ watchingVideo.category }}</span>
                  <span v-if="watchingVideo.filetype" class="filetype-chip">{{ watchingVideo.filetype.toUpperCase() }}</span>
                  <span v-if="watchingVideo.ref" class="meta-ref" :title="watchingVideo.ref">🔗 參考</span>
                  <span v-if="videoCache.has(watchingVideo.id)" class="cache-chip">已快取</span>
                </div>
                <div v-if="videoDisplayMode === 'bilibili'" class="bilibili-stats watch-stats">
                  <span>{{ watchingVideo.filetype ? watchingVideo.filetype.toUpperCase() : 'VIDEO' }}</span>
                  <span>{{ watchingVideo.category || '鋒兄頻道' }}</span>
                </div>
                <p v-if="watchingVideo.note" class="watch-desc">{{ watchingVideo.note }}</p>
              </div>
              <div class="watch-actions">
                <button
                  type="button"
                  class="watch-action-btn"
                  :disabled="downloadingVideoId === watchingVideo.id"
                  @click="downloadVideo(watchingVideo)"
                >
                  {{ downloadingVideoId === watchingVideo.id ? '下載中…' : '下載' }}
                </button>
                <button
                  v-if="videoCache.has(watchingVideo.id)"
                  type="button"
                  class="watch-action-btn watch-action-btn--muted"
                  @click="uncacheVideo(watchingVideo.id)"
                >
                  清除快取
                </button>
                <button
                  v-else
                  type="button"
                  class="watch-action-btn"
                  :disabled="cachingVideoId === watchingVideo.id"
                  @click="cacheVideo(watchingVideo)"
                >
                  {{ cachingVideoId === watchingVideo.id ? '快取中…' : '快取' }}
                </button>
                <button type="button" class="watch-action-btn watch-action-btn--muted" @click="editFromWatch(watchingVideo)">
                  編輯
                </button>
                <button type="button" class="watch-action-btn watch-action-btn--danger" @click="stopWatchAndClose()">
                  關閉
                </button>
              </div>
            </div>
          </div>

          <aside v-if="!theaterMode" class="watch-related" :aria-label="videoDisplayMode === 'bilibili' ? '相關推薦' : '接下來'">
            <h2 class="watch-related-title">
              {{ videoDisplayMode === 'bilibili' ? '相關推薦' : '接下來' }}
            </h2>
            <p v-if="relatedVideos.length === 0" class="watch-related-empty">沒有其他可播放影片</p>
            <button
              v-for="item in relatedVideos"
              :key="item.id"
              type="button"
              class="watch-related-item"
              :class="{ 'is-active': playingVideoId === item.id }"
              @click="handlePlay(item)"
              @mouseenter="warmThumbnail(item)"
            >
              <div class="watch-related-thumb">
                <img
                  v-if="item.cover"
                  :src="resolveMediaUrl(item.cover)"
                  :alt="item.name || '影片封面'"
                  loading="lazy"
                />
                <video
                  v-else-if="item.file && canRenderVideoThumbnail(item)"
                  :src="getThumbnailVideoSrc(item)"
                  preload="metadata"
                  muted
                  playsinline
                  @loadedmetadata="seekThumbnailFrame"
                ></video>
                <span v-else class="watch-related-placeholder">▶</span>
                <span v-if="item.filetype" class="watch-related-type">{{ item.filetype.toUpperCase() }}</span>
              </div>
              <div class="watch-related-copy">
                <strong>{{ item.name || '未命名' }}</strong>
                <span>{{ item.category || '未分類' }}</span>
              </div>
            </button>
          </aside>
        </div>
      </section>

      <template v-else>
      <h1 class="page-title">鋒兄影片</h1>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <div class="search-area">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋影片名稱..."
            class="search-input"
            @keyup.enter="commitSearchHistory()"
            @blur="commitSearchHistory()"
          />
          <RecentSearchChips
            :terms="recentSearches"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <div class="csv-actions">
          <div class="view-switcher" role="group" aria-label="影片顯示風格">
            <button
              type="button"
              class="view-switch-btn"
              :class="{ active: videoDisplayMode === 'youtube' }"
              @click="setVideoDisplayMode('youtube')"
            >
              YouTube
            </button>
            <button
              type="button"
              class="view-switch-btn"
              :class="{ active: videoDisplayMode === 'bilibili' }"
              @click="setVideoDisplayMode('bilibili')"
            >
              Bilibili
            </button>
          </div>
          <button @click="exportZip" class="btn-export" title="匯出 ZIP">
            <span>📤</span> 匯出 ZIP
          </button>
          <label class="btn-import" title="匯入 ZIP">
            <span>📥</span> 匯入 ZIP
            <input
              type="file"
              accept=".zip"
              @change="handleImport"
              style="display: none"
            />
          </label>
        </div>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button v-if="!batchMode && filteredVideos.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <button @click="openInlineAdd" class="btn-add-icon" title="新增">+</button>
          <template v-if="batchMode">
            <label class="select-all-label"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /><span>全選</span></label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span>共 {{ videos.length }} 個項目</span>
          <span v-if="selectedIds.size > 0" class="selected-count">已選 {{ selectedIds.size }} 項</span>
        </div>
        <div class="summary-right">
          <div v-if="isAddingInline || filteredVideos.length > 0" class="layout-switcher" role="tablist" aria-label="影片版型切換">
            <button
              v-for="option in layoutOptions"
              :key="option.value"
              type="button"
              class="layout-switch-btn"
              :class="{ active: videoLayoutMode === option.value }"
              @click="videoLayoutMode = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除選中 ({{ selectedIds.size }})</button>
        </div>
      </div>

      <!-- 快取狀態列 -->
      <div class="cache-bar">
        <div class="cache-info">
          <span class="cache-icon">💾</span>
          <span>已快取 <strong>{{ cachedCount }}</strong> / {{ videosWithFile.length }} 部影片</span>
          <span v-if="totalCacheSize > 0" class="cache-size">({{ (totalCacheSize / 1024 / 1024).toFixed(1) }} MB)</span>
        </div>
        <div class="cache-actions">
          <button
            v-if="cachedCount < videosWithFile.length"
            @click="cacheAllVideos"
            class="btn-cache-all"
            :disabled="cachingVideoId !== null"
          >
            {{ cachingVideoId !== null ? '⏳ 快取中...' : '📥 全部快取' }}
          </button>
          <button
            v-if="cachedCount > 0"
            @click="clearAllCache"
            class="btn-clear-cache"
          >
            🗑️ 清除快取
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading">載入中...</div>

      <!-- Empty State -->
      <div v-else-if="filteredVideos.length === 0 && !isAddingInline" class="empty-state">
        <p v-if="searchQuery">找不到符合的影片</p>
        <p v-else>尚無影片記錄，點擊「新增」開始</p>
      </div>

      <!-- Video Grid -->
      <div
        v-if="isAddingInline || filteredVideos.length > 0"
        class="video-grid"
        :class="[`video-grid--${videoDisplayMode}`, `video-grid--${videoLayoutMode}`]"
      >

        <!-- 行內新增卡片 -->
        <div v-if="isAddingInline" class="video-card video-card--editor">
          <div class="inline-edit-form">
            <div class="inline-form-group"><label>名稱 *</label><input v-model="addNewForm.name" type="text" class="inline-input" placeholder="影片名稱" /></div>
            <div class="inline-form-group"><label>分類</label><input v-model="addNewForm.category" type="text" class="inline-input" placeholder="分類" /></div>
            <div class="inline-form-group">
              <label>上傳影片</label>
              <div class="upload-area">
                <input ref="addVideoInput" type="file" accept="video/*" multiple @change="handleAddVideoUpload" style="display:none" />
                <button type="button" @click="$refs.addVideoInput.click()" class="btn-upload" :disabled="addVideoUploading">
                  {{ addVideoUploading ? '上傳中...' : '選擇影片' }}
                </button>
              </div>
              <div v-if="addSelectedVideos.length > 0" class="selected-file-list">
                <span class="selected-file-summary">已選 {{ addSelectedVideos.length }} 部影片</span>
                <div class="selected-file-chips">
                  <span v-for="file in addSelectedVideos" :key="file.name + file.size" class="selected-file-chip">{{ file.name }}</span>
                </div>
                <button type="button" @click="clearAddSelectedVideos" class="btn-remove-sm">清除已選</button>
              </div>
              <div v-if="addVideoUploading" class="upload-progress-block">
                <div class="upload-progress-head">
                  <span>{{ addVideoUploadStatus }}</span>
                  <span class="upload-progress">{{ addVideoUploadProgress }}%</span>
                </div>
                <div class="upload-progress-bar">
                  <div class="upload-progress-fill" :style="{ width: `${addVideoUploadProgress}%` }"></div>
                </div>
              </div>
              <div v-if="getAddVideoPreviewSrc()" class="inline-video-preview">
                <video :src="getAddVideoPreviewSrc()" controls preload="metadata" class="card-video"></video>
              </div>
            </div>
            <div class="inline-form-group"><label>或輸入影片URL</label><input v-model="addNewForm.file" type="text" class="inline-input" placeholder="影片 URL" :disabled="addSelectedVideos.length > 0" /></div>
            <div class="inline-form-group"><label>檔案類型</label><input v-model="addNewForm.filetype" type="text" class="inline-input" placeholder="mp4, mov..." /></div>
            <div class="inline-form-group">
              <label>封面上傳</label>
              <div class="upload-area">
                <input ref="addCoverInput" type="file" accept="image/*" @change="handleAddCoverUpload" style="display:none" />
                <button type="button" @click="$refs.addCoverInput.click()" class="btn-upload" :disabled="addCoverUploading">
                  {{ addCoverUploading ? '上傳中...' : '選擇封面' }}
                </button>
              </div>
              <div v-if="addNewForm.cover" class="inline-cover-preview">
                <img :src="addNewForm.cover" alt="封面預覽" class="preview-cover-img" />
                <button type="button" @click="addNewForm.cover = ''" class="btn-remove-sm">移除</button>
              </div>
              <input v-model="addNewForm.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" style="margin-top:0.25rem" />
            </div>
            <div class="inline-form-group"><label>備註</label><textarea v-model="addNewForm.note" class="inline-textarea" rows="2" placeholder="備註"></textarea></div>
            <div class="inline-edit-actions">
              <button @click="saveInlineAdd" class="btn-save" :disabled="loading">儲存</button>
              <button @click="cancelInlineAdd" class="btn-cancel-inline">取消</button>
            </div>
          </div>
        </div>
        <div
          v-for="video in filteredVideos"
          :key="video.id"
          class="video-card"
          :class="[
            {
              'is-selected': selectedIds.has(video.id),
              'video-card--bilibili': videoDisplayMode === 'bilibili'
            },
            getVideoLayoutClass(video.id)
          ]"
          @click="batchMode && toggleSelection(video.id)"
        >
          <!-- 行內編輯模式 -->
          <template v-if="inlineEditId === video.id">
            <div class="inline-edit-form">
              <div class="inline-form-group">
                <label>名稱 *</label>
                <input v-model="inlineEditData.name" type="text" class="inline-input" placeholder="影片名稱" />
              </div>
              <div class="inline-form-group">
                <label>分類</label>
                <input v-model="inlineEditData.category" type="text" class="inline-input" placeholder="分類" />
              </div>
              <div class="inline-form-group">
                <label>備註</label>
                <textarea v-model="inlineEditData.note" class="inline-textarea" rows="2" placeholder="備註"></textarea>
              </div>
              <div class="inline-form-group">
                <label>上傳影片</label>
                <div class="upload-area">
                  <input
                    ref="inlineVideoInput"
                    type="file"
                    accept="video/*"
                    @change="handleInlineVideoUpload"
                    style="display: none"
                  />
                  <button type="button" @click="$refs.inlineVideoInput.click()" class="btn-upload" :disabled="inlineVideoUploading">
                    {{ inlineVideoUploading ? '上傳中...' : '選擇影片' }}
                  </button>
                </div>
                <div v-if="inlineVideoUploading" class="upload-progress-block">
                  <div class="upload-progress-head">
                    <span>影片上傳進度</span>
                    <span class="upload-progress">{{ activeVideoUploadProgress }}%</span>
                  </div>
                  <div class="upload-progress-bar">
                    <div class="upload-progress-fill" :style="{ width: `${activeVideoUploadProgress}%` }"></div>
                  </div>
                </div>
                <div v-if="getInlineVideoPreviewSrc()" class="inline-video-preview">
                  <video :src="getInlineVideoPreviewSrc()" controls preload="metadata" class="card-video"></video>
                </div>
              </div>
              <div class="inline-form-group">
                <label>檔案路徑</label>
                <input v-model="inlineEditData.file" type="text" class="inline-input" placeholder="URL" />
              </div>
              <div class="inline-form-group">
                <label>檔案類型</label>
                <input v-model="inlineEditData.filetype" type="text" class="inline-input" placeholder="mp4, avi..." />
              </div>
              <div class="inline-form-group">
                <label>參考</label>
                <input v-model="inlineEditData.ref" type="text" class="inline-input" placeholder="參考連結" />
              </div>
              <div class="inline-form-group">
                <label>雜湊值</label>
                <input v-model="inlineEditData.hash" type="text" class="inline-input" placeholder="Hash" />
              </div>
              <div class="inline-form-group">
                <label>封面上傳</label>
                <div class="upload-area">
                  <input
                    ref="inlineCoverInput"
                    type="file"
                    accept="image/*"
                    @change="handleInlineCoverUpload"
                    style="display: none"
                  />
                  <button type="button" @click="$refs.inlineCoverInput.click()" class="btn-upload" :disabled="inlineCoverUploading">
                    {{ inlineCoverUploading ? '上傳中...' : '選擇封面' }}
                  </button>
                </div>
                <div v-if="inlineEditData.cover" class="inline-cover-preview">
                  <img :src="inlineEditData.cover" alt="封面預覽" class="preview-cover-img" />
                  <button type="button" @click="inlineEditData.cover = ''" class="btn-remove-sm">移除</button>
                </div>
                <input v-model="inlineEditData.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" />
              </div>
              <div class="inline-edit-actions">
                <button @click="saveInlineEdit" class="btn-save" :disabled="loading">儲存</button>
                <button @click="cancelInlineEdit" class="btn-cancel-inline">取消</button>
              </div>
            </div>
          </template>

          <!-- YouTube/Bilibili 風格顯示模式（點擊進觀看主舞台） -->
          <template v-else>
            <div class="thumbnail-wrapper" @click="handlePlay(video)" @mouseenter="warmThumbnail(video)">
              <input v-if="batchMode" type="checkbox" :checked="selectedIds.has(video.id)" @click.stop="toggleSelection(video.id)" class="batch-checkbox" />
              <template v-if="video.cover">
                <img :src="resolveMediaUrl(video.cover)" :alt="video.name" class="thumbnail-img" />
              </template>
              <template v-else-if="video.file && canRenderVideoThumbnail(video)">
                <video
                  :src="getThumbnailVideoSrc(video)"
                  preload="metadata"
                  class="thumbnail-video"
                  muted
                  playsinline
                  @loadedmetadata="seekThumbnailFrame"
                ></video>
              </template>
              <div v-else class="thumbnail-placeholder">
                <span class="placeholder-icon">🎬</span>
              </div>
              <div
                v-if="video.file"
                class="play-overlay"
                :class="{ 'play-overlay--loading': resolvingVideoIds.has(video.id) }"
              >
                <span class="play-btn">{{ resolvingVideoIds.has(video.id) ? '...' : '▶' }}</span>
              </div>
              <span v-if="video.filetype" class="filetype-tag">{{ video.filetype.toUpperCase() }}</span>
            </div>

            <!-- 影片資訊區 -->
            <div class="video-meta">
              <div v-if="videoDisplayMode === 'bilibili'" class="bilibili-avatar">鋒</div>
              <div class="video-copy">
                <h3 class="video-title">{{ video.name || '未命名' }}</h3>
                <div class="meta-row">
                  <span v-if="video.category" class="category-chip">{{ video.category }}</span>
                  <span v-if="video.ref" class="meta-ref" :title="video.ref">🔗 參考</span>
                </div>
                <p v-if="video.note" class="video-desc">{{ truncateText(video.note, videoDisplayMode === 'bilibili' ? 56 : 80) }}</p>
                <div v-if="videoDisplayMode === 'bilibili'" class="bilibili-stats">
                  <span>{{ video.filetype ? video.filetype.toUpperCase() : 'VIDEO' }}</span>
                  <span>{{ video.category || '鋒兄頻道' }}</span>
                </div>
              </div>
            </div>

            <!-- 操作列 -->
            <div v-if="!batchMode" class="card-actions-bar">
              <button @click="startInlineEdit(video)" class="action-btn edit-btn" title="編輯">✏️</button>
              <button @click="handleDelete(video)" class="action-btn delete-btn" title="刪除">🗑️</button>
              <template v-if="video.file">
                <button @click.stop="downloadVideo(video)" class="action-btn download-btn" :disabled="downloadingVideoId === video.id" :title="downloadingVideoId === video.id ? '下載中...' : '下載影片'">{{ downloadingVideoId === video.id ? '⏬' : '⬇️' }}</button>
                <button v-if="videoCache.has(video.id)" @click.stop="uncacheVideo(video.id)" class="action-btn cached-btn" title="已快取 (點擊清除)">✅</button>
                <button v-else @click.stop="cacheVideo(video)" class="action-btn cache-btn" :disabled="cachingVideoId === video.id" :title="cachingVideoId === video.id ? '快取中...' : '快取影片'">{{ cachingVideoId === video.id ? '⏳' : '📥' }}</button>
              </template>
            </div>
          </template>
        </div>
      </div>
      </template>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>{{ isEditing ? '編輯影片' : '新增影片' }}</h2>
            <button @click="closeModal" class="btn-close">&times;</button>
          </div>

          <form @submit.prevent="handleSubmit" class="modal-body">
            <div class="form-group">
              <label for="name">名稱 *</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                placeholder="輸入影片名稱"
              />
            </div>

            <div class="form-group">
              <label>上傳影片</label>
              <div class="upload-area">
                <input
                  ref="videoFileInput"
                  type="file"
                  accept="video/*"
                  @change="handleVideoUpload"
                  style="display: none"
                />
                <button
                  type="button"
                  @click="$refs.videoFileInput.click()"
                  class="btn-upload"
                  :disabled="videoUploading"
                >
                  {{ videoUploading ? '上傳中...' : '選擇影片' }}
                </button>
                <span v-if="videoUploading" class="upload-progress">{{ activeVideoUploadProgress }}%</span>
              </div>
              <div v-if="videoUploading" class="upload-progress-block">
                <div class="upload-progress-head">
                  <span>影片上傳進度</span>
                  <span class="upload-progress">{{ activeVideoUploadProgress }}%</span>
                </div>
                <div class="upload-progress-bar">
                  <div class="upload-progress-fill" :style="{ width: `${activeVideoUploadProgress}%` }"></div>
                </div>
              </div>
              <div v-if="getFormVideoPreviewSrc()" class="video-preview">
                <video :src="getFormVideoPreviewSrc()" controls class="preview-video"></video>
                <button type="button" @click="removeVideo" class="btn-remove">移除</button>
              </div>
            </div>

            <div class="form-group">
              <label for="file">檔案路徑</label>
              <input
                id="file"
                v-model="formData.file"
                type="text"
                placeholder="自動上傳或手動輸入 URL"
              />
            </div>

            <div class="form-group">
              <label for="filetype">檔案類型</label>
              <input
                id="filetype"
                v-model="formData.filetype"
                type="text"
                placeholder="例: mp4, avi, mov"
              />
            </div>

            <div class="form-group">
              <label for="category">分類</label>
              <input
                id="category"
                v-model="formData.category"
                type="text"
                placeholder="影片分類"
              />
            </div>

            <div class="form-group">
              <label for="ref">參考</label>
              <input
                id="ref"
                v-model="formData.ref"
                type="text"
                placeholder="參考連結或資訊"
              />
            </div>

            <div class="form-group">
              <label for="hash">雜湊值</label>
              <input
                id="hash"
                v-model="formData.hash"
                type="text"
                placeholder="檔案雜湊值"
              />
            </div>

            <div class="form-group">
              <label>封面上傳</label>
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
              <div v-if="formData.cover" class="cover-preview">
                <img :src="formData.cover" alt="封面預覽" class="preview-image" />
                <button type="button" @click="removeCover" class="btn-remove">移除</button>
              </div>
              <input
                id="cover"
                v-model="formData.cover"
                type="text"
                placeholder="或輸入封面 URL"
              />
            </div>

            <div class="form-group">
              <label for="note">備註</label>
              <textarea
                id="note"
                v-model="formData.note"
                rows="4"
                placeholder="輸入備註說明"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModal" class="btn-cancel">
                取消
              </button>
              <button type="submit" class="btn-submit">
                {{ isEditing ? '更新' : '新增' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useVideoRecords } from '../../composables/useVideoRecords'
import { useStorage } from '../../composables/useStorage'
import { usePersistentVideoPlayer } from '../../composables/usePersistentVideoPlayer'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchChips from '../ui/RecentSearchChips.vue'

useHead({
  title: '鋒兄影片 - 鋒兄AI Supabase'
})

const {
  videos,
  loading,
  FIELDS,
  loadVideos,
  addVideo,
  updateVideo,
  deleteVideo,
  importVideos
} = useVideoRecords()

// Search
const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-video-search-history', searchQuery)
const VIDEO_DISPLAY_MODE_KEY = 'feng-video-display-mode'
const videoDisplayMode = ref('youtube')
const videoLayoutMode = ref('card')
const layoutOptions = [
  { value: 'card', label: '卡片' },
  { value: 'list', label: '列表' }
]

// Batch mode state
const batchMode = ref(false)
const selectedIds = ref(new Set())

// Upload state
const videoFileInput = ref(null)
const coverFileInput = ref(null)
const {
  uploading: videoUploading,
  uploadProgress: videoUploadProgress,
  uploadFile,
  getPublicUrl,
  isMultipartManifestUrl,
  resolveMultipartFile,
  resolveMultipartPreviewFile
} = useStorage()

const resolveMediaUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value
  if (isMultipartManifestUrl?.(value)) return value
  return getPublicUrl(value) || value
}
const {
  currentVideo: persistentVideoTrack,
  getSnapshot: snapshotPersistentVideo,
  takeoverFromElement: takeoverPersistentVideo,
  restoreToElement: restorePersistentVideo,
  pauseGlobal: pausePersistentVideo,
  releaseLocalSession: releasePersistentVideoLocal,
  stopGlobal: stopPersistentVideo
} = usePersistentVideoPlayer()
const coverUploading = ref(false)
const activeVideoUploadProgress = computed(() => {
  if (videoUploadProgress.value > 0) return videoUploadProgress.value
  if (videoUploading.value || inlineVideoUploading.value || addVideoUploading.value) return 5
  return 0
})

// Modal state
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

// Form data
const formData = ref({
  name: '',
  file: '',
  filetype: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  cover: ''
})

// Video player state (Watch Stage)
const playingVideoId = ref(null)
const activeVideoElement = ref(null)
const theaterMode = ref(false)
const watchPlayerShellRef = ref(null)
const watchIsPlaying = ref(false)
const watchCurrentTime = ref(0)
const watchDuration = ref(0)
const watchVolume = ref(1)
const watchIsMuted = ref(false)
const watchPlaybackRate = ref(1)
const watchIsFullscreen = ref(false)
const watchControlsVisible = ref(true)
const watchSpeedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const WATCH_UPNEXT_SECONDS = 5
const watchUpNextActive = ref(false)
const watchUpNextSeconds = ref(WATCH_UPNEXT_SECONDS)
const watchUpNextProgress = ref(1)
let watchControlsHideTimer = null
let watchUpNextTimer = null
let watchUpNextStartedAt = 0
let watchLastVolume = 1

const watchingVideo = computed(() => {
  if (!playingVideoId.value) return null
  return videos.value.find((video) => video.id === playingVideoId.value) || null
})

// Video caching state
const videoCache = ref(new Map()) // id -> { blobUrl, size, fileRef }
const resolvedVideoSources = ref(new Map()) // id -> { blobUrl, size, fileRef }
const thumbnailVideoSources = ref(new Map()) // id -> blob url for multipart thumbnail
const resolvingVideoIds = ref(new Set())
const resolvingThumbnailIds = ref(new Set())
const resolvingVideoPromises = new Map()
const resolvingThumbnailPromises = new Map()
const cachingVideoId = ref(null)
const downloadingVideoId = ref(null)
const totalCacheSize = ref(0)
const formVideoPreviewSrc = ref('')
const addVideoPreviewSrc = ref('')
const inlineVideoPreviewSrc = ref('')
const VIDEO_CACHE_DB_NAME = 'FengVideoCache'
const VIDEO_CACHE_STORE_NAME = 'videos'
let videoCacheDbPromise = null

function updateTotalCacheSize() {
  let total = 0
  for (const [, cached] of videoCache.value) {
    total += cached?.size || 0
  }
  totalCacheSize.value = total
}

function getVideoCacheKey(videoId) {
  return String(videoId)
}

async function initVideoCacheDb() {
  if (typeof window === 'undefined' || !window.indexedDB) return null
  if (!videoCacheDbPromise) {
    videoCacheDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(VIDEO_CACHE_DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(VIDEO_CACHE_STORE_NAME)) {
          db.createObjectStore(VIDEO_CACHE_STORE_NAME, { keyPath: 'cacheKey' })
        }
      }
    }).catch((error) => {
      videoCacheDbPromise = null
      throw error
    })
  }
  return await videoCacheDbPromise
}

async function readPersistedVideoCache(videoId) {
  const db = await initVideoCacheDb()
  if (!db) return null

  return await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readonly')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .get(getVideoCacheKey(videoId))

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

async function persistVideoCache(video, blob) {
  const db = await initVideoCacheDb()
  if (!db) return

  const record = {
    cacheKey: getVideoCacheKey(video.id),
    videoId: video.id,
    fileRef: video.file,
    name: video.name || '',
    size: blob.size,
    cachedAt: new Date().toISOString(),
    blob
  }

  await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readwrite')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .put(record)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function deletePersistedVideoCache(videoId) {
  const db = await initVideoCacheDb()
  if (!db) return

  await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readwrite')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .delete(getVideoCacheKey(videoId))

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearPersistedVideoCache() {
  const db = await initVideoCacheDb()
  if (!db) return

  await new Promise((resolve, reject) => {
    const request = db.transaction([VIDEO_CACHE_STORE_NAME], 'readwrite')
      .objectStore(VIDEO_CACHE_STORE_NAME)
      .clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function hydratePersistedVideoCache() {
  const currentIds = new Set(videos.value.map(video => String(video.id)))
  const nextCache = new Map()

  for (const [videoId, cached] of videoCache.value) {
    if (!currentIds.has(String(videoId))) {
      revokeIfBlobUrl(cached?.blobUrl)
      continue
    }
    nextCache.set(videoId, cached)
  }

  for (const video of videos.value) {
    if (!video?.file || nextCache.has(video.id)) continue

    try {
      const record = await readPersistedVideoCache(video.id)
      if (!record) continue

      if (!record.blob || record.fileRef !== video.file) {
        await deletePersistedVideoCache(video.id)
        continue
      }

      const blobUrl = URL.createObjectURL(record.blob)
      nextCache.set(video.id, {
        blobUrl,
        size: record.size || record.blob.size,
        name: record.name || video.name,
        fileRef: record.fileRef
      })
    } catch (error) {
      console.error(`載入持久化快取失敗 (${video.name || video.id}):`, error)
    }
  }

  videoCache.value = nextCache
  updateTotalCacheSize()
}

function revokeIfBlobUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function getMemoryCachedVideo(video) {
  if (!video?.id) return null
  const cached = videoCache.value.get(video.id)
  if (!cached) return null
  if (cached.fileRef && cached.fileRef !== video.file) return null
  return cached
}

function setPreviewSrc(targetRef, nextUrl) {
  if (targetRef.value && targetRef.value !== nextUrl) {
    revokeIfBlobUrl(targetRef.value)
  }
  targetRef.value = nextUrl || ''
}

function isMultipartVideo(file) {
  return isMultipartManifestUrl(file)
}

function canRenderVideoThumbnail(video) {
  if (!video?.file) return false
  if (!isMultipartVideo(video.file)) return true
  return thumbnailVideoSources.value.has(video.id)
}

async function ensureThumbnailVideoSource(video) {
  if (!video?.file || !isMultipartVideo(video.file)) return video?.file || ''

  const existing = thumbnailVideoSources.value.get(video.id)
  if (existing) return existing
  if (resolvingThumbnailPromises.has(video.id)) {
    return await resolvingThumbnailPromises.get(video.id)
  }

  resolvingThumbnailIds.value.add(video.id)
  resolvingThumbnailIds.value = new Set(resolvingThumbnailIds.value)

  const promise = (async () => {
    try {
      const { blob } = await resolveMultipartPreviewFile(video.file)
      const blobUrl = URL.createObjectURL(blob)
      thumbnailVideoSources.value.set(video.id, blobUrl)
      thumbnailVideoSources.value = new Map(thumbnailVideoSources.value)
      return blobUrl
    } finally {
      resolvingThumbnailIds.value.delete(video.id)
      resolvingThumbnailIds.value = new Set(resolvingThumbnailIds.value)
      resolvingThumbnailPromises.delete(video.id)
    }
  })()

  resolvingThumbnailPromises.set(video.id, promise)
  return await promise
}

function getThumbnailVideoSrc(video) {
  if (!video?.file) return ''
  if (!isMultipartVideo(video.file)) return video.file

  return thumbnailVideoSources.value.get(video.id) || ''
}

function warmThumbnail(video) {
  if (!video?.file || video.cover || !isMultipartVideo(video.file)) return
  if (thumbnailVideoSources.value.has(video.id) || resolvingThumbnailIds.value.has(video.id)) return
  ensureThumbnailVideoSource(video).catch((error) => {
    console.error('縮圖載入失敗:', error)
  })
}

function seekThumbnailFrame(event) {
  const videoEl = event.target
  if (!videoEl || videoEl.dataset.thumbnailSeeked === '1') return

  const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : 0
  const targetTime = duration > 1 ? 1 : 0

  if (targetTime <= 0) {
    videoEl.dataset.thumbnailSeeked = '1'
    return
  }

  videoEl.dataset.thumbnailSeeked = '1'
  try {
    videoEl.currentTime = targetTime
  } catch {
    // Ignore seek failures on partial/short videos.
  }
}

async function ensureResolvedVideoSource(video) {
  if (!video?.file) return ''

  const cached = getMemoryCachedVideo(video)
  if (cached?.blobUrl) return cached.blobUrl

  const existing = resolvedVideoSources.value.get(video.id)
  if (existing?.blobUrl && existing.fileRef === video.file) return existing.blobUrl
  if (existing?.blobUrl) {
    revokeIfBlobUrl(existing.blobUrl)
    resolvedVideoSources.value.delete(video.id)
    resolvedVideoSources.value = new Map(resolvedVideoSources.value)
  }

  if (resolvingVideoPromises.has(video.id)) {
    return await resolvingVideoPromises.get(video.id)
  }

  resolvingVideoIds.value.add(video.id)
  resolvingVideoIds.value = new Set(resolvingVideoIds.value)

  const promise = (async () => {
    try {
      const blob = await getVideoBlobForDownload(video)
      const blobUrl = URL.createObjectURL(blob)
      resolvedVideoSources.value.set(video.id, { blobUrl, size: blob.size, fileRef: video.file })
      resolvedVideoSources.value = new Map(resolvedVideoSources.value)
      return blobUrl
    } finally {
      resolvingVideoIds.value.delete(video.id)
      resolvingVideoIds.value = new Set(resolvingVideoIds.value)
      resolvingVideoPromises.delete(video.id)
    }
  })()

  resolvingVideoPromises.set(video.id, promise)
  return await promise
}

function getVideoSrc(video) {
  const cached = getMemoryCachedVideo(video)
  if (cached) return cached.blobUrl
  const resolved = resolvedVideoSources.value.get(video.id)
  if (resolved?.blobUrl && resolved.fileRef === video.file) return resolved.blobUrl
  if (resolvingVideoIds.value.has(video.id)) return ''
  if (isMultipartVideo(video.file)) {
    return ''
  }
  return resolveMediaUrl(video.file)
}

function setActiveVideoRef(element) {
  activeVideoElement.value = element || null
}

function getPersistentVideoMeta(video) {
  return {
    id: video.id,
    name: video.name || '未命名影片',
    src: getVideoSrc(video),
    cover: resolveMediaUrl(video.cover || ''),
    meta: video.category || video.filetype || ''
  }
}

async function getVideoBlobForDownload(video) {
  const cachedRecord = await readPersistedVideoCache(video.id)
  if (cachedRecord?.blob && cachedRecord.fileRef === video.file) {
    return cachedRecord.blob
  }

  if (isMultipartVideo(video.file)) {
    return (await resolveMultipartFile(video.file)).blob
  }

  const response = await fetch(resolveMediaUrl(video.file))
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.blob()
}

function buildDownloadFilename(video) {
  const safeBaseName = (video.name || 'feng-video')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')

  const ext = (video.filetype || '').trim().replace(/^\./, '').toLowerCase()
  if (ext) return `${safeBaseName}.${ext}`

  try {
    const url = new URL(video.file, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const pathname = url.pathname || ''
    const detectedExt = pathname.split('.').pop()
    if (detectedExt && detectedExt !== pathname) {
      return `${safeBaseName}.${detectedExt.toLowerCase()}`
    }
  } catch {
    // Ignore invalid URLs and fall back to mp4.
  }

  return `${safeBaseName}.mp4`
}

async function downloadVideo(video) {
  if (!video?.file || downloadingVideoId.value === video.id) return

  downloadingVideoId.value = video.id
  try {
    const blob = await getVideoBlobForDownload(video)
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = buildDownloadFilename(video)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('下載失敗:', error)
    alert('下載失敗: ' + error.message)
  } finally {
    downloadingVideoId.value = null
  }
}

function formatWatchTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function clearWatchControlsHideTimer() {
  if (watchControlsHideTimer) {
    clearTimeout(watchControlsHideTimer)
    watchControlsHideTimer = null
  }
}

function revealWatchControls() {
  watchControlsVisible.value = true
  scheduleHideWatchControls()
}

function scheduleHideWatchControls() {
  clearWatchControlsHideTimer()
  if (!watchIsPlaying.value) {
    watchControlsVisible.value = true
    return
  }
  watchControlsHideTimer = setTimeout(() => {
    watchControlsVisible.value = false
  }, 2400)
}

function syncWatchUiFromElement(element) {
  if (!element) return
  watchIsPlaying.value = !element.paused && !element.ended
  watchCurrentTime.value = element.currentTime || 0
  watchDuration.value = Number.isFinite(element.duration) ? element.duration : 0
  watchVolume.value = element.volume ?? 1
  watchIsMuted.value = Boolean(element.muted)
  watchPlaybackRate.value = element.playbackRate || 1
  if (!element.muted && element.volume > 0) {
    watchLastVolume = element.volume
  }
}

async function handlePlay(video) {
  if (!video?.file || batchMode.value) return
  try {
    if (!persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) {
      pausePersistentVideo()
    }
    // Enter watch stage immediately so the shell is visible while multipart resolves.
    cancelWatchUpNext()
    playingVideoId.value = video.id
    theaterMode.value = false
    watchControlsVisible.value = true
    watchCurrentTime.value = 0
    watchDuration.value = 0
    watchIsPlaying.value = false
    if (import.meta.client) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    const src = await ensureResolvedVideoSource(video)
    if (!src) {
      throw new Error('影片仍在準備中，請稍後再試')
    }
    // If user switched to another video while resolving, ignore late result.
    if (playingVideoId.value !== video.id) return
  } catch (error) {
    console.error('影片載入失敗:', error)
    if (playingVideoId.value === video?.id) {
      playingVideoId.value = null
    }
    alert('影片載入失敗: ' + error.message)
  }
}

function handleWatchPlay(event, video) {
  const element = event?.target
  if (!element || !video) return
  activeVideoElement.value = element
  if (!persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) {
    pausePersistentVideo()
  }
  element.playbackRate = watchPlaybackRate.value || 1
  syncWatchUiFromElement(element)
  snapshotPersistentVideo(element, getPersistentVideoMeta(video), { playing: true })
  scheduleHideWatchControls()
}

function handleWatchPause(event, video) {
  if (!event?.target) return
  syncWatchUiFromElement(event.target)
  watchControlsVisible.value = true
  clearWatchControlsHideTimer()
  if (!persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) return
  snapshotPersistentVideo(event.target, getPersistentVideoMeta(video), { playing: false })
}

function handleWatchProgress(event, video) {
  if (!event?.target) return
  syncWatchUiFromElement(event.target)
  if (!persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) return
  snapshotPersistentVideo(event.target, getPersistentVideoMeta(video), {
    playing: !event.target.paused
  })
}

function syncWatchVolumeFromElement(event) {
  const element = event?.target || activeVideoElement.value
  if (!element) return
  syncWatchUiFromElement(element)
  const video = watchingVideo.value
  if (!video || !persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) return
  snapshotPersistentVideo(element, getPersistentVideoMeta(video), {
    playing: !element.paused
  })
}

async function handleWatchLoaded(event, video) {
  const element = event?.target
  if (!element || !video || playingVideoId.value !== video.id) return
  activeVideoElement.value = element
  element.volume = watchVolume.value
  element.muted = watchIsMuted.value
  element.playbackRate = watchPlaybackRate.value || 1
  await restorePersistentVideo(element, getPersistentVideoMeta(video))
  syncWatchUiFromElement(element)
  snapshotPersistentVideo(element, getPersistentVideoMeta(video), {
    playing: !element.paused
  })
  revealWatchControls()
}

async function toggleWatchPlayback() {
  const element = activeVideoElement.value
  if (!element) return
  try {
    if (element.paused || element.ended) {
      await element.play()
    } else {
      element.pause()
    }
  } catch (error) {
    console.warn('Watch playback toggle failed:', error)
  }
  revealWatchControls()
}

function seekWatchVideo(time) {
  const element = activeVideoElement.value
  if (!element) return
  const next = Number(time)
  if (!Number.isFinite(next)) return
  element.currentTime = Math.min(Math.max(next, 0), element.duration || next)
  watchCurrentTime.value = element.currentTime
  const video = watchingVideo.value
  if (video) {
    snapshotPersistentVideo(element, getPersistentVideoMeta(video), {
      playing: !element.paused
    })
  }
  revealWatchControls()
}

function setWatchVolume(value) {
  const element = activeVideoElement.value
  const normalized = Math.min(1, Math.max(0, Number(value) || 0))
  watchVolume.value = normalized
  watchIsMuted.value = normalized === 0
  if (normalized > 0) watchLastVolume = normalized
  if (element) {
    element.volume = normalized
    element.muted = normalized === 0
  }
  revealWatchControls()
}

function toggleWatchMute() {
  const element = activeVideoElement.value
  if (!element) {
    watchIsMuted.value = !watchIsMuted.value
    return
  }
  if (element.muted || element.volume === 0) {
    const restore = watchLastVolume > 0 ? watchLastVolume : 1
    element.muted = false
    element.volume = restore
    watchIsMuted.value = false
    watchVolume.value = restore
  } else {
    watchLastVolume = element.volume || watchLastVolume || 1
    element.muted = true
    watchIsMuted.value = true
  }
  syncWatchUiFromElement(element)
  revealWatchControls()
}

function setWatchPlaybackRate(rate) {
  const next = Number(rate) || 1
  watchPlaybackRate.value = next
  const element = activeVideoElement.value
  if (element) element.playbackRate = next
  revealWatchControls()
}

async function toggleWatchFullscreen() {
  if (!import.meta.client) return
  const shell = watchPlayerShellRef.value
  if (!shell) return

  try {
    if (document.fullscreenElement === shell) {
      await document.exitFullscreen()
    } else if (shell.requestFullscreen) {
      await shell.requestFullscreen()
    }
  } catch (error) {
    console.warn('Fullscreen toggle failed:', error)
  }
  revealWatchControls()
}

function handleFullscreenChange() {
  if (!import.meta.client) return
  watchIsFullscreen.value = document.fullscreenElement === watchPlayerShellRef.value
}

function clearWatchUpNextTimer() {
  if (watchUpNextTimer) {
    clearInterval(watchUpNextTimer)
    watchUpNextTimer = null
  }
}

function cancelWatchUpNext() {
  clearWatchUpNextTimer()
  watchUpNextActive.value = false
  watchUpNextSeconds.value = WATCH_UPNEXT_SECONDS
  watchUpNextProgress.value = 1
  watchControlsVisible.value = true
}

async function confirmWatchUpNext() {
  const next = nextRelatedVideo.value
  cancelWatchUpNext()
  if (next) await handlePlay(next)
}

function startWatchUpNextCountdown() {
  if (!nextRelatedVideo.value) return
  clearWatchUpNextTimer()
  watchUpNextActive.value = true
  watchUpNextSeconds.value = WATCH_UPNEXT_SECONDS
  watchUpNextProgress.value = 1
  watchUpNextStartedAt = Date.now()
  watchControlsVisible.value = true
  clearWatchControlsHideTimer()

  watchUpNextTimer = setInterval(() => {
    const elapsed = (Date.now() - watchUpNextStartedAt) / 1000
    const remaining = Math.max(0, WATCH_UPNEXT_SECONDS - elapsed)
    watchUpNextSeconds.value = Math.ceil(remaining)
    watchUpNextProgress.value = Math.max(0, remaining / WATCH_UPNEXT_SECONDS)
    if (remaining <= 0) {
      clearWatchUpNextTimer()
      confirmWatchUpNext()
    }
  }, 100)
}

async function playNextRelated() {
  const next = nextRelatedVideo.value
  if (!next) return
  cancelWatchUpNext()
  await handlePlay(next)
}

async function handleWatchEnded() {
  watchIsPlaying.value = false
  watchControlsVisible.value = true
  clearWatchControlsHideTimer()
  if (nextRelatedVideo.value) {
    startWatchUpNextCountdown()
    return
  }
  cancelWatchUpNext()
}

function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

function handleWatchKeydown(event) {
  if (!watchingVideo.value) return
  if (isTypingTarget(event.target)) return

  const key = event.key
  const lower = key.toLowerCase()

  // Up-next overlay has priority over normal player shortcuts.
  if (watchUpNextActive.value) {
    if (key === 'Escape') {
      event.preventDefault()
      cancelWatchUpNext()
      return
    }
    if (key === 'Enter' || lower === 'n' || key === ' ' || lower === 'k') {
      event.preventDefault()
      confirmWatchUpNext()
      return
    }
  }

  if (key === ' ' || lower === 'k') {
    event.preventDefault()
    toggleWatchPlayback()
    return
  }
  if (lower === 'f') {
    event.preventDefault()
    toggleWatchFullscreen()
    return
  }
  if (lower === 't') {
    event.preventDefault()
    theaterMode.value = !theaterMode.value
    return
  }
  if (lower === 'm') {
    event.preventDefault()
    toggleWatchMute()
    return
  }
  if (key === 'ArrowRight') {
    event.preventDefault()
    seekWatchVideo((activeVideoElement.value?.currentTime || 0) + 5)
    return
  }
  if (key === 'ArrowLeft') {
    event.preventDefault()
    seekWatchVideo((activeVideoElement.value?.currentTime || 0) - 5)
    return
  }
  if (key === 'ArrowUp') {
    event.preventDefault()
    setWatchVolume(Math.min(1, (watchIsMuted.value ? 0 : watchVolume.value) + 0.05))
    return
  }
  if (key === 'ArrowDown') {
    event.preventDefault()
    setWatchVolume(Math.max(0, (watchIsMuted.value ? 0 : watchVolume.value) - 0.05))
    return
  }
  if (key === 'Escape' && !watchIsFullscreen.value) {
    // Leave watch stage only when not in browser fullscreen
    // (fullscreen Escape is handled by the browser first).
    event.preventDefault()
    exitWatchStage()
    return
  }
  if (lower === 'n') {
    event.preventDefault()
    playNextRelated()
  }
}

async function exitWatchStage({ continuePlaying = true } = {}) {
  const element = activeVideoElement.value
  const video = watchingVideo.value
  theaterMode.value = false
  cancelWatchUpNext()
  clearWatchControlsHideTimer()

  if (import.meta.client && document.fullscreenElement === watchPlayerShellRef.value) {
    try {
      await document.exitFullscreen()
    } catch {
      // ignore
    }
  }

  if (continuePlaying && element && video && !element.paused && getVideoSrc(video)) {
    await takeoverPersistentVideo(element, getPersistentVideoMeta(video))
  } else if (element && video && !element.paused) {
    element.pause()
    releasePersistentVideoLocal()
  } else {
    releasePersistentVideoLocal()
  }

  playingVideoId.value = null
  activeVideoElement.value = null
  watchIsPlaying.value = false
  watchCurrentTime.value = 0
  watchDuration.value = 0
  watchIsFullscreen.value = false
  watchControlsVisible.value = true
}

async function stopWatchAndClose() {
  const element = activeVideoElement.value
  if (element) {
    element.pause()
    element.currentTime = 0
  }
  if (import.meta.client && document.fullscreenElement === watchPlayerShellRef.value) {
    try {
      await document.exitFullscreen()
    } catch {
      // ignore
    }
  }
  stopPersistentVideo()
  theaterMode.value = false
  cancelWatchUpNext()
  clearWatchControlsHideTimer()
  playingVideoId.value = null
  activeVideoElement.value = null
  watchIsPlaying.value = false
  watchCurrentTime.value = 0
  watchDuration.value = 0
  watchIsFullscreen.value = false
  watchControlsVisible.value = true
}

async function editFromWatch(video) {
  await exitWatchStage({ continuePlaying: true })
  startInlineEdit(video)
}

async function handleInlineVideoError(event, video) {
  if (!video?.file || playingVideoId.value !== video.id) return

  const videoEl = event?.target
  const errorCode = videoEl?.error?.code || 'unknown'
  console.warn(`Video playback error (${video.name || video.id}, code ${errorCode}). Retrying with resolved source.`)

  try {
    const src = await ensureResolvedVideoSource(video)
    if (!src || !videoEl) return
    if (videoEl.src !== src) {
      videoEl.src = src
      videoEl.load()
    }
    await videoEl.play().catch(() => {})
  } catch (error) {
    console.error('影片載入失敗:', error)
  }
}

async function cacheVideo(video) {
  if (!video.file || videoCache.value.has(video.id)) return
  cachingVideoId.value = video.id
  try {
    const blob = await getVideoBlobForDownload(video)
    const blobUrl = URL.createObjectURL(blob)
    await persistVideoCache(video, blob)
    videoCache.value.set(video.id, { blobUrl, size: blob.size, name: video.name, fileRef: video.file })
    // Force reactivity
    videoCache.value = new Map(videoCache.value)
    updateTotalCacheSize()
    console.log(`✅ 快取成功: ${video.name} (${(blob.size / 1024 / 1024).toFixed(1)} MB)`)
  } catch (err) {
    console.error(`快取失敗: ${video.name}`, err)
    alert(`快取失敗: ${err.message}`)
  } finally {
    cachingVideoId.value = null
  }
}

async function uncacheVideo(videoId) {
  const cached = videoCache.value.get(videoId)
  if (cached) {
    URL.revokeObjectURL(cached.blobUrl)
    videoCache.value.delete(videoId)
    videoCache.value = new Map(videoCache.value)
    updateTotalCacheSize()
  }
  try {
    await deletePersistedVideoCache(videoId)
  } catch (error) {
    console.error(`刪除持久化快取失敗 (${videoId}):`, error)
  }
}

async function cacheAllVideos() {
  const uncached = filteredVideos.value.filter(v => v.file && !videoCache.value.has(v.id))
  if (uncached.length === 0) { alert('所有影片已快取'); return }
  if (!confirm(`確定要快取 ${uncached.length} 部影片？`)) return
  for (const video of uncached) {
    await cacheVideo(video)
  }
  alert(`快取完成！共 ${videoCache.value.size} 部影片 (${(totalCacheSize.value / 1024 / 1024).toFixed(1)} MB)`)
}

async function clearAllCache() {
  if (!confirm('確定要清除所有影片快取？')) return
  for (const [, cached] of videoCache.value) {
    URL.revokeObjectURL(cached.blobUrl)
  }
  videoCache.value = new Map()
  updateTotalCacheSize()
  try {
    await clearPersistedVideoCache()
  } catch (error) {
    console.error('清除持久化快取失敗:', error)
  }
}

function getInlineVideoPreviewSrc() {
  if (!inlineEditData.value.file) return ''
  if (inlineVideoPreviewSrc.value) return inlineVideoPreviewSrc.value
  return isMultipartVideo(inlineEditData.value.file) ? '' : inlineEditData.value.file
}

function getAddVideoPreviewSrc() {
  if (!addNewForm.value.file) return ''
  if (addVideoPreviewSrc.value) return addVideoPreviewSrc.value
  return isMultipartVideo(addNewForm.value.file) ? '' : addNewForm.value.file
}

function getFormVideoPreviewSrc() {
  if (!formData.value.file) return ''
  if (formVideoPreviewSrc.value) return formVideoPreviewSrc.value
  return isMultipartVideo(formData.value.file) ? '' : formData.value.file
}

// Inline editing state
const inlineEditId = ref(null)
const inlineEditData = ref({})
const inlineVideoInput = ref(null)
const inlineCoverInput = ref(null)
const inlineVideoUploading = ref(false)
const inlineCoverUploading = ref(false)

function startInlineEdit(video) {
  setPreviewSrc(inlineVideoPreviewSrc, '')
  inlineEditId.value = video.id
  inlineEditData.value = {
    name: video.name || '',
    file: video.file || '',
    filetype: video.filetype || '',
    note: video.note || '',
    ref: video.ref || '',
    category: video.category || '',
    hash: video.hash || '',
    cover: video.cover || ''
  }
}

function cancelInlineEdit() {
  setPreviewSrc(inlineVideoPreviewSrc, '')
  inlineEditId.value = null
  inlineEditData.value = {}
}

async function saveInlineEdit() {
  if (!inlineEditData.value.name) {
    alert('請輸入影片名稱')
    return
  }
  try {
    const result = await updateVideo(inlineEditId.value, inlineEditData.value)
    if (!result.success) throw new Error(result.error || '更新失敗')

    await loadVideos()
    setPreviewSrc(inlineVideoPreviewSrc, '')
    inlineEditId.value = null
    inlineEditData.value = {}
  } catch (error) {
    console.error('更新失敗:', error)
    alert('更新失敗: ' + error.message)
  }
}

async function handleInlineVideoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  inlineVideoUploading.value = true
  try {
    const result = await uploadFile(file, 'video')
    if (result.success) {
      inlineEditData.value.file = result.url
      setPreviewSrc(inlineVideoPreviewSrc, result.previewUrl || result.url)
      if (!inlineEditData.value.name) {
        inlineEditData.value.name = file.name.replace(/\.[^.]+$/, '')
      }
      const ext = file.name.split('.').pop()
      if (ext) inlineEditData.value.filetype = ext
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    alert('上傳失敗: ' + error.message)
  } finally {
    inlineVideoUploading.value = false
  }
}

async function handleInlineCoverUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  inlineCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'video-covers')
    if (result.success) {
      inlineEditData.value.cover = result.url
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (error) {
    alert('封面上傳失敗: ' + error.message)
  } finally {
    inlineCoverUploading.value = false
  }
}

// Computed
const filteredVideos = computed(() => {
  if (!searchQuery.value.trim()) {
    return videos.value
  }
  const query = searchQuery.value.toLowerCase()
  return videos.value.filter((video) =>
    video.name?.toLowerCase().includes(query)
  )
})

const relatedVideos = computed(() => {
  const current = watchingVideo.value
  if (!current) return []
  const pool = filteredVideos.value.filter((video) => video.id !== current.id && video.file)
  const sameCategory = pool.filter(
    (video) => current.category && video.category && video.category === current.category
  )
  const rest = pool.filter(
    (video) => !current.category || !video.category || video.category !== current.category
  )
  return [...sameCategory, ...rest]
})

const nextRelatedVideo = computed(() => relatedVideos.value[0] || null)

function getVideoLayoutClass(videoId) {
  if (videoLayoutMode.value === 'card') return 'video-card--card'
  return 'video-card--list'
}

const isAllSelected = computed(() => {
  return filteredVideos.value.length > 0 && filteredVideos.value.every(v => selectedIds.value.has(v.id))
})

const videosWithFile = computed(() => videos.value.filter(v => v.file))
const cachedCount = computed(() => videoCache.value.size)

// Batch mode methods
function enterBatchMode() {
  batchMode.value = true
  selectedIds.value = new Set()
}

function exitBatchMode() {
  batchMode.value = false
  selectedIds.value = new Set()
}

function toggleSelection(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredVideos.value.map(v => v.id))
  }
}

async function deleteSelected() {
  if (selectedIds.value.size === 0) return

  const count = selectedIds.value.size
  const isFullDelete = count === videos.value.length

  const confirmText = isFullDelete
    ? `確定要刪除全部 ${count} 個影片嗎？\n\n⚠️ 這將刪除所有影片！請在下方輸入 "DELETE videodb" 確認：`
    : `確定要刪除選中的 ${count} 個影片嗎？`

  if (isFullDelete) {
    const userInput = prompt(confirmText)
    if (userInput !== 'DELETE videodb') {
      alert('刪除已取消')
      return
    }
  } else {
    if (!confirm(confirmText)) return
  }

  try {
    const cachedDeletePromises = Array.from(selectedIds.value).map(id => uncacheVideo(id))
    await Promise.all(cachedDeletePromises)
    const deletePromises = Array.from(selectedIds.value).map(id => deleteVideo(id))
    await Promise.all(deletePromises)
    alert(`成功刪除 ${count} 個影片`)
    await loadVideos()
    exitBatchMode()
  } catch (error) {
    console.error('批量刪除失敗:', error)
    alert('批量刪除失敗: ' + error.message)
  }
}

// Methods
function truncateText(text, maxLength) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function setVideoDisplayMode(mode) {
  if (!['youtube', 'bilibili'].includes(mode)) return
  videoDisplayMode.value = mode
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(VIDEO_DISPLAY_MODE_KEY, mode)
  }
}

// 行內新增
const isAddingInline = ref(false)
const addNewForm = ref({ name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' })
const addVideoInput = ref(null)
const addCoverInput = ref(null)
const addVideoUploading = ref(false)
const addCoverUploading = ref(false)
const addSelectedVideos = ref([])
const addVideoUploadIndex = ref(0)
const addVideoUploadTotal = ref(0)
const addVideoUploadFileName = ref('')

const addVideoUploadProgress = computed(() => {
  if (!addVideoUploading.value || addVideoUploadTotal.value === 0) return 0
  const currentProgress = Math.max(videoUploadProgress.value || 0, 5)
  const completed = Math.max(addVideoUploadIndex.value - 1, 0)
  const progress = ((completed + (currentProgress / 100)) / addVideoUploadTotal.value) * 100
  return Math.min(100, Math.max(1, Math.round(progress)))
})

const addVideoUploadStatus = computed(() => {
  if (!addVideoUploadTotal.value) return '影片上傳進度'
  const fileName = addVideoUploadFileName.value ? `：${addVideoUploadFileName.value}` : ''
  return `上傳第 ${addVideoUploadIndex.value}/${addVideoUploadTotal.value} 部${fileName}`
})

const getFileBaseName = (fileName = '') => fileName.replace(/\.[^.]+$/, '')
const getFileExtension = (fileName = '') => fileName.split('.').pop() || ''

const resetInlineAddForm = () => {
  addNewForm.value = { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' }
  addSelectedVideos.value = []
}

const openInlineAdd = () => {
  resetInlineAddForm()
  setPreviewSrc(addVideoPreviewSrc, '')
  isAddingInline.value = true
}
const cancelInlineAdd = () => {
  resetInlineAddForm()
  setPreviewSrc(addVideoPreviewSrc, '')
  isAddingInline.value = false
}

const clearAddSelectedVideos = () => {
  addSelectedVideos.value = []
  setPreviewSrc(addVideoPreviewSrc, '')
}

const saveInlineAdd = async () => {
  if (addSelectedVideos.value.length > 0) {
    addVideoUploading.value = true
    addVideoUploadTotal.value = addSelectedVideos.value.length
    addVideoUploadIndex.value = 0
    addVideoUploadFileName.value = ''
    try {
      const records = []
      for (const [index, file] of addSelectedVideos.value.entries()) {
        addVideoUploadIndex.value = index + 1
        addVideoUploadFileName.value = file.name
        const result = await uploadFile(file, 'video')
        if (!result.success) {
          throw new Error(`${file.name}: ${result.error}`)
        }
        records.push({
          name: addSelectedVideos.value.length === 1 && addNewForm.value.name ? addNewForm.value.name : getFileBaseName(file.name),
          file: result.url,
          filetype: addNewForm.value.filetype || getFileExtension(file.name),
          note: addNewForm.value.note,
          ref: addNewForm.value.ref,
          category: addNewForm.value.category,
          hash: addNewForm.value.hash,
          cover: addNewForm.value.cover
        })
      }

      const result = await importVideos(records)
      if (!result.success) {
        throw new Error(result.error || '匯入失敗')
      }
      resetInlineAddForm()
      setPreviewSrc(addVideoPreviewSrc, '')
      isAddingInline.value = false
      await loadVideos()
    } catch (e) {
      alert('批次上傳失敗: ' + e.message)
    } finally {
      addVideoUploading.value = false
      addVideoUploadTotal.value = 0
      addVideoUploadIndex.value = 0
      addVideoUploadFileName.value = ''
    }
    return
  }

  if (!addNewForm.value.name) { alert('請輸入影片名稱'); return }
  try {
    const result = await addVideo(addNewForm.value)
    if (!result.success) throw new Error(result.error || '新增失敗')

    resetInlineAddForm()
    setPreviewSrc(addVideoPreviewSrc, '')
    isAddingInline.value = false
    await loadVideos()
  } catch(e) {
    alert('新增失敗: ' + e.message)
  }
}

async function handleAddVideoUpload(event) {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  addSelectedVideos.value = files
  addNewForm.value.file = ''
  if (files.length === 1) {
    const file = files[0]
    if (!addNewForm.value.name) addNewForm.value.name = getFileBaseName(file.name)
    const ext = getFileExtension(file.name)
    if (ext && !addNewForm.value.filetype) addNewForm.value.filetype = ext
    setPreviewSrc(addVideoPreviewSrc, URL.createObjectURL(file))
  } else {
    setPreviewSrc(addVideoPreviewSrc, '')
  }
  event.target.value = ''
}

async function handleAddCoverUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  addCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'video-covers')
    if (result.success) { addNewForm.value.cover = result.url }
    else { alert('封面上傳失敗: ' + result.error) }
  } catch (e) { alert('封面上傳失敗: ' + e.message) } finally { addCoverUploading.value = false }
}

function openAddModal() {
  isEditing.value = false
  editingId.value = null
  formData.value = { name: '', file: '', filetype: '', note: '', ref: '', category: '', hash: '', cover: '' }
  setPreviewSrc(formVideoPreviewSrc, '')
  showModal.value = true
}

function openEditModal(video) {
  isEditing.value = true
  editingId.value = video.id
  formData.value = {
    name: video.name || '',
    file: video.file || '',
    filetype: video.filetype || '',
    note: video.note || '',
    ref: video.ref || '',
    category: video.category || '',
    hash: video.hash || '',
    cover: video.cover || ''
  }
  setPreviewSrc(formVideoPreviewSrc, '')
  showModal.value = true
}

function closeModal() {
  setPreviewSrc(formVideoPreviewSrc, '')
  showModal.value = false
  isEditing.value = false
  editingId.value = null
}

// 影片上傳處理
async function handleVideoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const result = await uploadFile(file, 'video')
    if (result.success) {
      formData.value.file = result.url
      setPreviewSrc(formVideoPreviewSrc, result.previewUrl || result.url)
      if (!formData.value.name) {
        formData.value.name = file.name.replace(/\.[^.]+$/, '')
      }
      const ext = file.name.split('.').pop()
      if (ext) formData.value.filetype = ext
      alert('影片上傳成功！')
    } else {
      alert('上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('上傳失敗: ' + error.message)
  }
}

// 移除影片
function removeVideo() {
  setPreviewSrc(formVideoPreviewSrc, '')
  formData.value.file = ''
  formData.value.filetype = ''
  if (videoFileInput.value) {
    videoFileInput.value.value = ''
  }
}

// 封面上傳處理
async function handleCoverUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  try {
    const result = await uploadFile(file, 'video-covers')
    if (result.success) {
      formData.value.cover = result.url
      alert('封面上傳成功！')
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (error) {
    console.error('Cover upload error:', error)
    alert('封面上傳失敗: ' + error.message)
  } finally {
    coverUploading.value = false
  }
}

// 移除封面
function removeCover() {
  formData.value.cover = ''
  if (coverFileInput.value) {
    coverFileInput.value.value = ''
  }
}

async function handleSubmit() {
  if (!formData.value.name) {
    alert('請輸入影片名稱')
    return
  }

  try {
    if (isEditing.value) {
      const result = await updateVideo(editingId.value, formData.value)
      if (!result.success) throw new Error(result.error || '更新失敗')
      alert('影片已更新')
    } else {
      const result = await addVideo(formData.value)
      if (!result.success) throw new Error(result.error || '新增失敗')
      alert('影片已新增')
    }
    closeModal()
    await loadVideos()
  } catch (error) {
    console.error('操作失敗:', error)
    alert('操作失敗: ' + error.message)
  }
}

async function handleDelete(video) {
  if (!confirm(`確定要刪除影片「${video.name}」嗎？`)) {
    return
  }
  try {
    await uncacheVideo(video.id)
    await deleteVideo(video.id)
    alert('影片已刪除')
    await loadVideos()
  } catch (error) {
    console.error('刪除失敗:', error)
    alert('刪除失敗: ' + error.message)
  }
}

// ZIP Export
async function exportZip() {
  if (videos.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  if (!confirm(`確定匯出 ${videos.value.length} 筆影片？\n會一併下載媒體檔，檔案可能很大，請耐心等候。`)) return

  try {
    const { exportRecordsAsMediaZip } = await import('../../utils/zipMediaBundle')
    const stats = await exportRecordsAsMediaZip({
      records: videos.value,
      jsonFileName: 'videos.json',
      downloadName: 'supabase-videos.zip',
      mediaMap: {
        file: { folder: 'videos', fallbackExt: 'mp4' },
        cover: { folder: 'covers', fallbackExt: 'jpg' }
      },
      resolveUrl: resolveMediaUrl,
      fetchBlob: async ({ raw, resolved, field }) => {
        if (field === 'file' && isMultipartVideo(raw)) {
          return (await resolveMultipartFile(raw)).blob
        }
        const url = resolved || resolveMediaUrl(raw)
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.blob()
      }
    })
    alert(`匯出成功！\n媒體成功 ${stats.ok}，失敗 ${stats.fail}，略過 ${stats.skipped}`)
  } catch (error) {
    console.error('Error exporting ZIP:', error)
    alert('匯出失敗：' + error.message)
  }
}

// CSV Parser
function parseCsv(text) {
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

// ZIP Import (相容 Appwrite 結構: video.csv + videos/ + covers/)
async function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // 偵測格式：Appwrite (video.csv) vs Supabase (videos.json)
    const csvFile = zip.file('video.csv')
    const jsonFile = zip.file('videos.json')

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：video.csv + videos/ 資料夾 + covers/ 資料夾 =====
      console.log('偵測到 Appwrite video.zip 格式')
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseCsv(cleanText)

      if (parsed.length === 0) {
        alert('CSV 檔案無有效資料')
        return
      }

      const confirmMsg = `ℹ️ 偵測到 Appwrite video.zip 格式\n\n共 ${parsed.length} 筆影片\n系統將自動上傳影片與封面至 Supabase Storage\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      const { uploadFile: uploadToStorage } = useStorage()
      let videoUploadOk = 0, videoUploadFail = 0
      let coverUploadOk = 0, coverUploadFail = 0

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        // 移除 Appwrite 系統欄位 ($id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId)
        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        // 上傳影片檔案 (videos/ 資料夾)
        const videoPath = mapped.file
        if (videoPath && videoPath.startsWith('videos/')) {
          const zipEntry = zip.file(videoPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = videoPath.split('/').pop() || `video_${i}.mp4`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4'
              const mimeMap = { mp4: 'video/mp4', avi: 'video/x-msvideo', mov: 'video/quicktime', mkv: 'video/x-matroska', webm: 'video/webm', wmv: 'video/x-ms-wmv' }
              const fileObj = new window.File([blob], fileName, {
                type: mimeMap[ext] || `video/${ext}`
              })
              const uploadResult = await uploadToStorage(fileObj, 'video')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                videoUploadOk++
              } else {
                console.warn(`上傳影片失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                videoUploadFail++
              }
            } catch (err) {
              console.warn(`上傳影片失敗 (${mapped.name}):`, err)
              mapped.file = ''
              videoUploadFail++
            }
          } else {
            console.warn(`ZIP 中找不到影片檔案: ${videoPath}`)
            mapped.file = ''
          }
        }

        // 上傳封面圖 (covers/ 資料夾)
        const coverPath = mapped.cover
        if (coverPath && coverPath.startsWith('covers/')) {
          const zipEntry = zip.file(coverPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = coverPath.split('/').pop() || `cover_${i}.jpg`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
              const fileObj = new window.File([blob], fileName, {
                type: `image/${ext === 'jpg' ? 'jpeg' : ext}`
              })
              const uploadResult = await uploadToStorage(fileObj, 'video-covers')
              if (uploadResult.success) {
                mapped.cover = uploadResult.url
                coverUploadOk++
              } else {
                console.warn(`上傳封面失敗 (${mapped.name}):`, uploadResult.error)
                mapped.cover = ''
                coverUploadFail++
              }
            } catch (err) {
              console.warn(`上傳封面失敗 (${mapped.name}):`, err)
              mapped.cover = ''
              coverUploadFail++
            }
          } else {
            console.warn(`ZIP 中找不到封面檔案: ${coverPath}`)
            mapped.cover = ''
          }
        }

        records.push(mapped)
        console.log(`匯入進度: ${i + 1}/${parsed.length}`)
      }

      if (videoUploadFail > 0 || coverUploadFail > 0) {
        console.warn(`影片上傳: ${videoUploadOk} 成功, ${videoUploadFail} 失敗 | 封面上傳: ${coverUploadOk} 成功, ${coverUploadFail} 失敗`)
      }

    } else if (jsonFile) {
      // ===== Supabase 格式：videos.json（可含 videos/、covers/ 媒體）=====
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

      if (!confirm(`確定要匯入 ${records.length} 筆影片記錄嗎？\n若 ZIP 內含影片/封面，會自動上傳。`)) return

      const { reuploadLocalMediaFromZip } = await import('../../utils/zipMediaBundle')
      const reuploaded = await reuploadLocalMediaFromZip({
        zip,
        records,
        mediaMap: {
          file: { prefixes: ['videos/', 'media/'], storageFolder: 'video', mimeFallback: 'video/mp4', filetypeField: 'filetype' },
          cover: { prefixes: ['covers/'], storageFolder: 'video-covers', mimeFallback: 'image/jpeg' }
        },
        uploadFile
      })
      records = reuploaded.records

    } else {
      alert('ZIP 檔案中找不到 video.csv 或 videos.json')
      return
    }

    // 匯入記錄到資料庫
    if (records.length > 0) {
      const result = await importVideos(records)
      if (!result.success) throw new Error(result.error || '匯入失敗')

      alert(result.message || `成功匯入 ${records.length} 筆影片資料`)
      await loadVideos()
    }
  } catch (error) {
    console.error('匯入失敗:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    event.target.value = ''
  }
}

// Lifecycle
onMounted(() => {
  ;(async () => {
    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem(VIDEO_DISPLAY_MODE_KEY)
      if (savedMode === 'youtube' || savedMode === 'bilibili') {
        videoDisplayMode.value = savedMode
      }
    }
    await loadVideos()
    await hydratePersistedVideoCache()
  })()

  if (import.meta.client) {
    window.addEventListener('keydown', handleWatchKeydown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  }
})

watch(videos, async () => {
  await hydratePersistedVideoCache()
})

onBeforeUnmount(() => {
  clearWatchControlsHideTimer()
  cancelWatchUpNext()

  if (import.meta.client) {
    window.removeEventListener('keydown', handleWatchKeydown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    if (document.fullscreenElement === watchPlayerShellRef.value) {
      document.exitFullscreen().catch(() => {})
    }
  }

  if (activeVideoElement.value && playingVideoId.value) {
    const activeVideo = videos.value.find((video) => video.id === playingVideoId.value)
    if (activeVideo && activeVideoElement.value && !activeVideoElement.value.paused) {
      takeoverPersistentVideo(activeVideoElement.value, getPersistentVideoMeta(activeVideo))
    } else {
      releasePersistentVideoLocal()
    }
  }

  for (const [, cached] of videoCache.value) {
    URL.revokeObjectURL(cached.blobUrl)
  }
  for (const [, resolved] of resolvedVideoSources.value) {
    URL.revokeObjectURL(resolved.blobUrl)
  }
  for (const [, thumbnailSrc] of thumbnailVideoSources.value) {
    URL.revokeObjectURL(thumbnailSrc)
  }
  setPreviewSrc(formVideoPreviewSrc, '')
  setPreviewSrc(addVideoPreviewSrc, '')
  setPreviewSrc(inlineVideoPreviewSrc, '')
})
</script>

<style scoped>
.video-page {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 2rem;
}

/* ── Actions Bar ── */
.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-area {
  flex: 1 1 320px;
  min-width: 260px;
}

.search-input {
  width: 100%;
  min-width: 200px;
  padding: 0.6rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 20px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background: #f9fafb;
}

.search-input:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.15);
  background: white;
}

.csv-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-export,
.btn-import {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export:hover,
.btn-import:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.btn-import { cursor: pointer; }

.view-switcher {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.view-switch-btn {
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-switch-btn.active {
  background: white;
  color: #111827;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
}

/* ── Cache Bar ── */
.cache-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 12px;
  flex-wrap: wrap;
}

.cache-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #0369a1;
}

.cache-icon {
  font-size: 1.1rem;
}

.cache-size {
  color: #0284c7;
  font-weight: 500;
}

.cache-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-cache-all {
  padding: 0.35rem 0.85rem;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cache-all:hover:not(:disabled) {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  transform: translateY(-1px);
}

.btn-cache-all:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-clear-cache {
  padding: 0.35rem 0.85rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-cache:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fca5a5;
}

.loading,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #9ca3af;
  font-size: 1.1rem;
}

/* ── YouTube/Bilibili Grid ── */
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.video-grid--card {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.video-grid--list {
  grid-template-columns: 1fr;
}

.video-grid--hybrid {
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.video-grid--bilibili {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem 1.1rem;
}

@media (min-width: 1200px) {
  .video-grid--card,
  .video-grid--bilibili {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .video-grid--list {
    grid-template-columns: 1fr;
  }
}

/* ── Video Card ── */
.video-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.video-card--editor {
  grid-column: 1 / -1;
}

.video-card--card {
  min-height: 100%;
}

.video-grid--hybrid .video-card--card:nth-of-type(1),
.video-grid--hybrid .video-card--card:nth-of-type(2) {
  grid-column: span 6;
}

.video-grid--hybrid .video-card--list {
  grid-column: 1 / -1;
}

.video-card--list {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  align-items: stretch;
  width: 100%;
}

.video-card--bilibili {
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #fff7fb 100%);
  box-shadow: 0 10px 30px rgba(244, 114, 182, 0.10);
}

.video-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}

.video-card--list .thumbnail-wrapper,
.video-card--list .player-wrapper {
  height: 100%;
  min-height: 210px;
}

.video-card--list .video-meta,
.video-card--list .card-actions-bar {
  grid-column: 2;
}

.video-card--list .card-actions-bar {
  opacity: 1;
  transform: none;
  padding-top: 0;
}

.video-grid--list .video-card {
  border-radius: 14px;
}

.video-grid--list .video-card:hover {
  transform: none;
}

/* ── Thumbnail Area ── */
.thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: #0f0f0f;
  overflow: hidden;
  cursor: pointer;
}

.thumbnail-img,
.thumbnail-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.video-card:hover .thumbnail-img,
.video-card:hover .thumbnail-video {
  transform: scale(1.05);
}

.mode-bilibili .thumbnail-wrapper,
.mode-bilibili .player-wrapper {
  padding-top: 0;
  aspect-ratio: 9 / 16;
  min-height: 420px;
  max-height: 620px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #050505;
}

.mode-bilibili .thumbnail-img,
.mode-bilibili .thumbnail-video,
.mode-bilibili .active-player {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #050505;
}

.mode-bilibili .video-card:hover .thumbnail-img,
.mode-bilibili .video-card:hover .thumbnail-video {
  transform: none;
}

.thumbnail-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.placeholder-icon {
  font-size: 3rem;
  opacity: 0.6;
}

/* Play Overlay */
.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0);
  transition: all 0.25s ease;
  opacity: 0;
}

.video-card:hover .play-overlay {
  opacity: 1;
  background: rgba(0, 0, 0, 0.35);
}

.play-overlay--loading,
.video-card:hover .play-overlay--loading {
  opacity: 1;
  background: rgba(15, 23, 42, 0.48);
  cursor: wait;
}

.play-btn {
  width: 52px;
  height: 52px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  color: #0f0f0f;
  transform: scale(0.8);
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding-left: 4px;
}

.video-card:hover .play-btn {
  transform: scale(1);
}

.play-overlay--loading .play-btn {
  padding-left: 0;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
}

/* Filetype Tag */
.filetype-tag {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
}

/* Batch Checkbox */
.batch-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 20px;
  height: 20px;
  cursor: pointer;
  z-index: 2;
  accent-color: #ff6b6b;
}

/* ── Video Meta ── */
.video-meta {
  padding: 0.75rem 0.875rem 0.5rem;
}

.mode-bilibili .video-meta {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  padding: 0.9rem 0.95rem 0.7rem;
}

.video-copy {
  min-width: 0;
}

.bilibili-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fb7185 0%, #f472b6 100%);
  color: white;
  font-size: 0.95rem;
  font-weight: 800;
  box-shadow: 0 10px 18px rgba(244, 114, 182, 0.28);
}

.video-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f0f0f;
  margin: 0 0 0.4rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.category-chip {
  font-size: 0.75rem;
  color: #606060;
  background: #f2f2f2;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-weight: 500;
}

.meta-ref {
  font-size: 0.75rem;
  color: #065fd4;
  cursor: pointer;
}

.video-desc {
  font-size: 0.8rem;
  color: #606060;
  line-height: 1.4;
  margin: 0.25rem 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bilibili-stats {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-top: 0.45rem;
  color: #9ca3af;
  font-size: 0.73rem;
}

.bilibili-stats span {
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: #fdf2f8;
  color: #be185d;
}

/* ── Action Buttons (hover reveal) ── */
.card-actions-bar {
  display: flex;
  gap: 0.25rem;
  padding: 0 0.75rem 0.75rem;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.2s ease;
}

.mode-bilibili .card-actions-bar {
  opacity: 1;
  transform: none;
  padding: 0 0.9rem 0.95rem;
  gap: 0.4rem;
}

.mode-bilibili .action-btn {
  background: #fff;
}

.video-card:hover .card-actions-bar {
  opacity: 1;
  transform: translateY(0);
}

.action-btn {
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 0.3rem 0.65rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.edit-btn:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.delete-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

/* ── Selected Card ── */
.video-card.is-selected {
  box-shadow: 0 0 0 2px #ff6b6b;
  cursor: pointer;
}

/* ── Modal Styles ── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.2s ease-in;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #0f0f0f;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.75rem;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 0.6rem 1.25rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover { background: #e5e7eb; }

.btn-submit {
  padding: 0.6rem 1.25rem;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit:hover {
  background: #ee5a5a;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

/* ── Video/Cover Preview in Modal ── */
.video-preview,
.cover-preview {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-video {
  width: 100%;
  max-height: 200px;
  border-radius: 8px;
  background: #000;
}

.preview-image {
  max-width: 200px;
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
}

.btn-remove {
  padding: 0.3rem 0.75rem;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.btn-remove:hover {
  background: #dc2626;
  color: white;
}

.upload-progress {
  font-size: 0.85rem;
  color: #ff6b6b;
  font-weight: 600;
}

.upload-progress-block {
  margin-top: 0.5rem;
}

.upload-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
  color: #6b7280;
}

.upload-progress-head span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.upload-progress-bar {
  width: 100%;
  height: 8px;
  background: #fde2e2;
  border-radius: 999px;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #ff6b6b 0%, #ee5a24 100%);
  border-radius: 999px;
  transition: width 0.2s ease;
}

/* ── Summary Bar ── */
.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.summary-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.layout-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: color-mix(in oklab, var(--bg-secondary) 92%, transparent);
}

.layout-switch-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.84rem;
  font-weight: 700;
  transition: all var(--transition-fast);
}

.layout-switch-btn.active {
  background: var(--surface-strong);
  color: var(--text-inverse);
}

.selected-count {
  color: #ff6b6b;
  font-weight: 600;
}

.btn-add-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ff6b6b;
  background: white;
  color: #ff6b6b;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-add-icon:hover {
  background: #ff6b6b;
  color: white;
  transform: rotate(90deg);
}

.btn-batch-mode {
  padding: 0.4rem 0.75rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 18px;
  color: #6b7280;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-batch-mode:hover { background: #f3f4f6; }

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-cancel-batch {
  padding: 0.3rem 0.6rem;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 15px;
  color: #6b7280;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-cancel-batch:hover { background: #f3f4f6; }

.btn-batch-delete {
  padding: 0.4rem 0.75rem;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-batch-delete:hover {
  background: #ee5a5a;
  transform: translateY(-1px);
}

.btn-batch-delete:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Inline Edit Styles ── */
.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}

.inline-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.inline-form-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.inline-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.inline-input:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.inline-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box;
}

.inline-textarea:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.inline-video-preview {
  border-radius: 8px;
  overflow: hidden;
  margin-top: 0.25rem;
}

.card-video {
  width: 100%;
  display: block;
}

.inline-cover-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.preview-cover-img {
  width: 80px;
  height: 45px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.btn-remove-sm {
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove-sm:hover { background: #dc2626; color: white; }

.inline-edit-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-save {
  padding: 0.45rem 1rem;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  background: #ee5a5a;
  transform: translateY(-1px);
}

.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-cancel-inline {
  padding: 0.45rem 1rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 18px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-inline:hover { background: #e5e7eb; }

.upload-area {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-upload {
  padding: 0.35rem 0.7rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-upload:hover { background: #e5e7eb; }
.btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }

.selected-file-list {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.selected-file-summary {
  font-size: 0.8rem;
  color: #4b5563;
  font-weight: 600;
}

.selected-file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.selected-file-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #fff1f2;
  color: #be123c;
  font-size: 0.75rem;
  line-height: 1.3;
  word-break: break-all;
}

/* Active Player */
.player-wrapper {
  position: relative;
  width: 100%;
  background: #000;
}

.active-player {
  width: 100%;
  display: block;
  max-height: 300px;
}

.mode-bilibili .active-player {
  max-height: none;
}

.close-player-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.65);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 2;
}

.close-player-btn:hover {
  background: rgba(255, 107, 107, 0.9);
  transform: scale(1.1);
}

@media (max-width: 960px) {
  .video-grid--hybrid {
    grid-template-columns: 1fr;
  }

  .video-grid--hybrid .video-card--card,
  .video-grid--hybrid .video-card--list {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .summary-right,
  .csv-actions {
    width: 100%;
  }

  .layout-switcher {
    width: 100%;
    justify-content: space-between;
  }

  .layout-switch-btn {
    flex: 1;
  }

  .video-card--list {
    grid-template-columns: 1fr;
  }

  .video-card--list .video-meta,
  .video-card--list .card-actions-bar {
    grid-column: 1;
  }

  .mode-bilibili .thumbnail-wrapper,
  .mode-bilibili .player-wrapper {
    min-height: 320px;
    max-height: 520px;
  }
}

/* ── Watch Stage ── */
.watch-stage {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  animation: fadeIn 0.25s var(--ease-out-expo, ease-out);
}

.watch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
}

.watch-back-btn,
.watch-theater-btn {
  appearance: none;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.9rem;
  font: inherit;
  font-weight: 600;
  font-size: var(--text-sm, 0.875rem);
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

.watch-back-btn:hover,
.watch-theater-btn:hover {
  background: var(--bg-muted);
  border-color: var(--border-strong);
}

.watch-back-btn:focus-visible,
.watch-theater-btn:focus-visible,
.watch-action-btn:focus-visible,
.watch-related-item:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.watch-theater-btn {
  margin-left: auto;
}

.watch-theater-btn[aria-pressed='true'] {
  background: var(--primary-muted);
  border-color: color-mix(in oklab, var(--primary) 40%, transparent);
  color: var(--primary);
}

.watch-hotkeys {
  margin: 0;
  width: 100%;
  color: var(--text-muted);
  font-size: var(--text-xs);
  line-height: 1.4;
}

@media (min-width: 901px) {
  .watch-hotkeys {
    width: auto;
    margin-left: 0;
  }
}

.watch-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  gap: var(--spacing-lg);
  align-items: start;
}

.watch-stage--theater .watch-layout {
  grid-template-columns: 1fr;
}

.watch-primary {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.watch-player-shell {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: oklch(0.12 0.02 248);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--elevation-2);
  cursor: pointer;
  user-select: none;
}

.watch-player-shell.is-fullscreen {
  aspect-ratio: auto;
  width: 100%;
  height: 100%;
  max-height: none;
  min-height: 100%;
  border-radius: 0;
}

.watch-stage--bilibili .watch-player-shell:not(.is-fullscreen) {
  aspect-ratio: 16 / 9;
  min-height: clamp(280px, 48vw, 560px);
}

.watch-stage--theater .watch-player-shell:not(.is-fullscreen) {
  max-height: min(82vh, 920px);
  aspect-ratio: auto;
  min-height: min(56vh, 720px);
}

.watch-player {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #000;
}

.watch-player-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in oklab, oklch(0.12 0.02 248) 72%, transparent);
  color: var(--text-inverse);
  font-weight: 600;
  font-size: var(--text-sm, 0.875rem);
  pointer-events: none;
  z-index: 3;
}

.watch-center-play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 72px;
  height: 72px;
  border: none;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--primary) 88%, black 12%);
  color: var(--text-inverse);
  font-size: 1.5rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 2;
  box-shadow: var(--elevation-3);
  transition: transform var(--duration-fast) var(--ease-out-expo), opacity var(--duration-fast) var(--ease-out-expo);
}

.watch-center-play:hover {
  transform: scale(1.06);
}

.watch-center-play:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.watch-upnext {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 0.35rem;
  padding: 1.25rem 1.15rem 1.35rem;
  background:
    linear-gradient(
      180deg,
      color-mix(in oklab, oklch(0.12 0.02 248) 18%, transparent) 0%,
      color-mix(in oklab, oklch(0.10 0.02 248) 88%, transparent) 100%
    );
  color: var(--text-inverse);
  pointer-events: auto;
}

.watch-upnext-kicker {
  margin: 0;
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: color-mix(in oklab, white 72%, transparent);
}

.watch-upnext-title {
  font-size: clamp(1.05rem, 0.95rem + 0.5vw, 1.35rem);
  font-weight: 750;
  line-height: 1.3;
  max-width: 36rem;
  text-wrap: balance;
}

.watch-upnext-count {
  margin: 0.15rem 0 0.35rem;
  font-size: 0.9rem;
  color: color-mix(in oklab, white 82%, transparent);
}

.watch-upnext-num {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: white;
}

.watch-upnext-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}

.watch-upnext-btn {
  appearance: none;
  border: 1px solid color-mix(in oklab, white 24%, transparent);
  background: color-mix(in oklab, white 10%, transparent);
  color: white;
  border-radius: var(--radius-md);
  padding: 0.55rem 0.95rem;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color var(--duration-fast) ease;
}

.watch-upnext-btn:hover {
  background: color-mix(in oklab, white 18%, transparent);
}

.watch-upnext-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.watch-upnext-btn--primary {
  background: var(--primary);
  border-color: transparent;
}

.watch-upnext-btn--primary:hover {
  background: var(--primary-hover);
}

.watch-upnext-bar {
  width: min(100%, 28rem);
  height: 4px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, white 18%, transparent);
  overflow: hidden;
}

.watch-upnext-bar-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--primary), color-mix(in oklab, var(--primary) 60%, var(--accent)));
  transition: transform 100ms linear;
}

.watch-stage--bilibili .watch-upnext-bar-fill {
  background: linear-gradient(
    90deg,
    var(--primary),
    color-mix(in oklab, var(--primary) 55%, var(--accent) 45%)
  );
}

.watch-chrome {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  padding: 2.25rem 0.75rem 0.55rem;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in oklab, oklch(0.12 0.02 248) 55%, transparent) 42%,
    color-mix(in oklab, oklch(0.10 0.02 248) 92%, transparent) 100%
  );
  opacity: 0;
  transform: translateY(6px);
  pointer-events: none;
  transition:
    opacity var(--duration-fast) var(--ease-out-expo),
    transform var(--duration-fast) var(--ease-out-expo);
}

.watch-player-shell.is-controls-visible .watch-chrome,
.watch-player-shell:focus-within .watch-chrome {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.watch-progress-block {
  padding: 0 0.35rem 0.35rem;
}

.watch-progress {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 5px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, white 22%, transparent);
  outline: none;
  cursor: pointer;
}

.watch-stage--bilibili .watch-progress {
  height: 4px;
  background: color-mix(in oklab, white 18%, transparent);
}

.watch-progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.watch-stage--bilibili .watch-progress::-webkit-slider-thumb {
  background: color-mix(in oklab, var(--primary) 70%, var(--accent) 30%);
}

.watch-progress::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid white;
  cursor: pointer;
}

.watch-progress::-moz-range-track {
  height: 5px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, white 22%, transparent);
}

.watch-chrome-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0 0.15rem 0.15rem;
}

.watch-chrome-left,
.watch-chrome-right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.watch-chrome-right {
  margin-left: auto;
}

.watch-ctrl-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color var(--duration-fast) ease;
}

.watch-ctrl-btn:hover:not(:disabled) {
  background: color-mix(in oklab, white 14%, transparent);
}

.watch-ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.watch-ctrl-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.watch-ctrl-btn--compact {
  width: 32px;
}

.watch-time {
  color: color-mix(in oklab, white 92%, transparent);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  padding: 0 0.25rem;
  white-space: nowrap;
}

.watch-time-sep {
  opacity: 0.55;
  margin: 0 0.15rem;
}

.watch-volume {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: white;
}

.watch-volume input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 72px;
  height: 4px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, white 24%, transparent);
  outline: none;
  cursor: pointer;
}

.watch-volume input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.watch-volume input[type='range']::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.watch-speed select {
  appearance: none;
  border: 1px solid color-mix(in oklab, white 22%, transparent);
  background: color-mix(in oklab, oklch(0.18 0.02 248) 70%, transparent);
  color: white;
  border-radius: var(--radius-sm);
  padding: 0.3rem 0.45rem;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 650;
  cursor: pointer;
}

.watch-speed select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.watch-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-sm) var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.watch-stage--bilibili .watch-info {
  grid-template-columns: auto 1fr;
  grid-template-areas:
    'avatar copy'
    'actions actions';
}

.watch-stage--youtube .watch-avatar {
  display: none;
}

.watch-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, var(--primary), color-mix(in oklab, var(--primary) 55%, oklch(0.35 0.08 280)));
  color: var(--text-inverse);
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
  grid-area: avatar;
  align-self: start;
}

.watch-stage--bilibili .watch-info-copy {
  grid-area: copy;
}

.watch-stage--bilibili .watch-actions {
  grid-area: actions;
}

.watch-info-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.watch-title {
  margin: 0;
  font-family: var(--font-body, inherit);
  font-size: clamp(1.15rem, 1rem + 0.6vw, 1.5rem);
  font-weight: 700;
  line-height: 1.3;
  color: var(--text-primary);
  text-wrap: balance;
}

.watch-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.filetype-chip,
.cache-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.cache-chip {
  background: var(--success-light);
  color: var(--success);
}

.watch-stats {
  margin-top: 0.15rem;
}

.watch-desc {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: var(--text-sm, 0.875rem);
  line-height: 1.55;
  max-width: 75ch;
  white-space: pre-wrap;
  word-break: break-word;
}

.watch-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border-subtle);
  margin-top: 0.15rem;
}

.watch-action-btn {
  appearance: none;
  border: 1px solid var(--border-subtle);
  background: var(--primary);
  color: var(--text-inverse);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.85rem;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease, opacity 150ms ease;
}

.watch-action-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.watch-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.watch-action-btn--muted {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.watch-action-btn--muted:hover:not(:disabled) {
  background: var(--bg-inset);
}

.watch-action-btn--danger {
  background: var(--danger-light);
  color: var(--danger);
  border-color: transparent;
  margin-left: auto;
}

.watch-action-btn--danger:hover:not(:disabled) {
  background: color-mix(in oklab, var(--danger) 22%, transparent);
}

.watch-related {
  position: sticky;
  top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  max-height: calc(100vh - 5rem);
  overflow: auto;
  padding: var(--spacing-sm);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  min-width: 0;
}

.watch-stage--bilibili .watch-related {
  gap: 0.4rem;
  padding: 0.55rem;
}

.watch-related-title {
  margin: 0 0 0.15rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.watch-related-empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
  padding: 0.5rem 0.15rem;
}

.watch-related-item {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
  width: 100%;
  padding: 0.4rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease;
}

.watch-stage--bilibili .watch-related-item {
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 0.5rem;
  padding: 0.3rem;
}

.watch-related-item:hover {
  background: var(--bg-muted);
}

.watch-related-item.is-active {
  background: var(--primary-muted);
  border-color: color-mix(in oklab, var(--primary) 28%, transparent);
}

.watch-related-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: var(--bg-inset);
}

.watch-related-thumb img,
.watch-related-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.watch-related-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--text-muted);
  font-size: 1rem;
}

.watch-related-type {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: color-mix(in oklab, oklch(0.15 0.02 248) 72%, transparent);
  color: var(--text-inverse);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.watch-related-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-top: 0.1rem;
}

.watch-related-copy strong {
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.35;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.watch-stage--bilibili .watch-related-copy strong {
  -webkit-line-clamp: 2;
  font-size: 0.8125rem;
}

.watch-related-copy span {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.watch-stage--bilibili .watch-related-item:hover .watch-related-copy strong {
  color: var(--primary);
}

@media (max-width: 1100px) {
  .watch-layout {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  }
}

@media (max-width: 900px) {
  .watch-layout {
    grid-template-columns: 1fr;
  }

  .watch-related {
    position: static;
    max-height: none;
  }

  .watch-related-item {
    grid-template-columns: 132px minmax(0, 1fr);
  }

  .watch-theater-btn {
    margin-left: 0;
  }

  .watch-toolbar {
    gap: 0.5rem;
  }

  .watch-action-btn--danger {
    margin-left: 0;
  }
}

@media (max-width: 560px) {
  .watch-related-item {
    grid-template-columns: 108px minmax(0, 1fr);
  }

  .watch-info {
    padding: var(--spacing-sm);
  }

  .watch-player-shell {
    border-radius: var(--radius-sm);
  }

  .watch-volume input[type='range'] {
    width: 52px;
  }

  .watch-center-play {
    width: 60px;
    height: 60px;
    font-size: 1.25rem;
  }

  .watch-chrome {
    padding-top: 1.5rem;
  }

  .watch-time {
    font-size: 0.7rem;
  }
}

@media (max-width: 420px) {
  .watch-volume input[type='range'] {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .watch-stage {
    animation: none;
  }

  .watch-chrome,
  .watch-center-play {
    transition: none;
  }
}

:global(.dark) .watch-player-shell {
  box-shadow: var(--elevation-2);
}

:global(.dark) .watch-related-item:hover {
  background: var(--bg-muted);
}
</style>
