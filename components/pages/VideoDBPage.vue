<template>
  <PageContainer>
    <div
      class="video-page"
      :class="{ 'is-watching': Boolean(watchingVideo) }"
    >
      <!-- ══ 觀看主舞台：YouTube 播放結構 × Netflix 影廳質感 × Bilibili 資訊列 ══ -->
      <section
        v-if="watchingVideo"
        class="watch-stage"
        :class="{ 'watch-stage--theater': theaterMode }"
        aria-label="影片播放"
      >
        <header class="watch-toolbar">
          <button type="button" class="watch-back-btn" @click="exitWatchStage()">
            <span aria-hidden="true">‹</span> 返回影片庫
          </button>
          <p class="watch-hotkeys" title="空白/K 播放暫停 · ←→ 上一支/下一支 · Shift+←→ 快轉 · ↑↓ 音量 · M 靜音 · F 全螢幕 · T 劇場 · P/N 上一/下一 · Esc 返回">
            空白 播放 · ←→ 上一/下一 · F 全螢幕 · Esc 返回
          </p>
          <button
            type="button"
            class="watch-theater-btn"
            :aria-pressed="theaterMode"
            @click="theaterMode = !theaterMode"
          >
            {{ theaterMode ? '退出劇場' : '劇場模式' }}
          </button>
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
                <span class="watch-loading-dot"></span> 影片準備中…
              </div>

              <button
                v-else-if="!watchIsPlaying"
                type="button"
                class="watch-center-play"
                aria-label="播放"
                @click="toggleWatchPlayback"
              >
                ▶
              </button>

              <button
                type="button"
                class="watch-skip-edge watch-skip-edge--prev"
                :disabled="!prevRelatedVideo"
                aria-label="上一支"
                title="上一支 (←)"
                @click.stop="playPrevRelated"
              >
                ‹
              </button>
              <button
                type="button"
                class="watch-skip-edge watch-skip-edge--next"
                :disabled="!nextRelatedVideo"
                aria-label="下一支"
                title="下一支 (→)"
                @click.stop="playNextRelated"
              >
                ›
              </button>

              <div class="watch-chrome" @click.stop>
                <div class="watch-progress-block">
                  <input
                    class="watch-progress"
                    type="range"
                    min="0"
                    :max="Math.max(watchDuration, 0.1)"
                    step="0.1"
                    :value="watchCurrentTime"
                    :style="{ '--played': `${watchProgressPercent}%` }"
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
                      :disabled="!prevRelatedVideo"
                      aria-label="上一支"
                      title="上一支 (←)"
                      @click="playPrevRelated"
                    >
                      ⏮
                    </button>
                    <button
                      type="button"
                      class="watch-ctrl-btn watch-ctrl-btn--play"
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
                      title="下一支 (→)"
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
              <div class="watch-avatar" aria-hidden="true">鋒</div>
              <div class="watch-info-copy">
                <h1 class="watch-title">{{ watchingVideo.name || '未命名' }}</h1>
                <div class="watch-channel-row">
                  <span class="watch-channel">鋒兄頻道</span>
                  <span class="watch-dot">·</span>
                  <span class="bilibili-stats watch-stats">
                    <span>{{ watchingVideo.filetype ? watchingVideo.filetype.toUpperCase() : 'VIDEO' }}</span>
                    <span>{{ watchingVideo.category || '未分類' }}</span>
                    <span>{{ formatWatchTime(watchDuration) }}</span>
                  </span>
                </div>
                <div class="watch-meta-row">
                  <span v-if="watchingVideo.category" class="category-chip">{{ watchingVideo.category }}</span>
                  <span v-if="watchingVideo.filetype" class="filetype-chip">{{ watchingVideo.filetype.toUpperCase() }}</span>
                  <a v-if="watchingVideo.ref" class="meta-ref" :href="watchingVideo.ref" target="_blank" rel="noopener" :title="watchingVideo.ref">🔗 參考</a>
                  <span v-if="videoCache.has(watchingVideo.id)" class="cache-chip">已快取</span>
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
                  {{ downloadingVideoId === watchingVideo.id ? '下載中…' : '⬇ 下載' }}
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
                  {{ cachingVideoId === watchingVideo.id ? '快取中…' : '📥 快取' }}
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

          <aside v-if="!theaterMode" class="watch-related" aria-label="接下來播放">
            <h2 class="watch-related-title">接下來播放 <span class="watch-related-count">{{ relatedVideos.length }}</span></h2>
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
                <span class="watch-related-channel">鋒兄頻道</span>
                <span>{{ item.category || '未分類' }}</span>
              </div>
            </button>
          </aside>
        </div>
      </section>

      <template v-else>
      <!-- ══ Netflix 主打橫幅 ══ -->
      <section v-if="heroVideo && videoLayoutMode === 'rail'" class="hero-billboard">
        <div class="hero-backdrop">
          <img
            v-if="heroVideo.cover"
            :src="resolveMediaUrl(heroVideo.cover)"
            :alt="heroVideo.name || '主打影片'"
            class="hero-backdrop-img"
          />
          <video
            v-else-if="heroVideo.file && canRenderVideoThumbnail(heroVideo)"
            :src="getThumbnailVideoSrc(heroVideo)"
            class="hero-backdrop-img"
            preload="metadata"
            muted
            playsinline
            @loadedmetadata="seekThumbnailFrame"
          ></video>
          <div v-else class="hero-backdrop-fallback" aria-hidden="true">🎬</div>
          <div class="hero-scrim" aria-hidden="true"></div>
        </div>
        <div class="hero-copy">
          <p class="hero-eyebrow"><span class="hero-mark">鋒</span> 鋒兄影院 · 主打</p>
          <h2 class="hero-title">{{ heroVideo.name || '未命名' }}</h2>
          <div class="hero-meta">
            <span v-if="heroVideo.category" class="hero-badge">{{ heroVideo.category }}</span>
            <span v-if="heroVideo.filetype" class="hero-badge hero-badge--ghost">{{ heroVideo.filetype.toUpperCase() }}</span>
            <span v-if="videoCache.has(heroVideo.id)" class="hero-badge hero-badge--ok">已快取</span>
            <span class="hero-badge hero-badge--ghost">共 {{ videosWithFile.length }} 部可播放</span>
          </div>
          <p v-if="heroVideo.note" class="hero-desc">{{ truncateText(heroVideo.note, 130) }}</p>
          <div class="hero-actions">
            <button type="button" class="hero-btn hero-btn--play" :disabled="!heroVideo.file" @click="handlePlay(heroVideo)">
              ▶ 播放
            </button>
            <button type="button" class="hero-btn" @click="openEditModal(heroVideo)">
              ⓘ 詳細資訊
            </button>
            <button
              v-if="heroVideo.file && !videoCache.has(heroVideo.id)"
              type="button"
              class="hero-btn hero-btn--ghost"
              :disabled="cachingVideoId === heroVideo.id"
              @click="cacheVideo(heroVideo)"
            >
              {{ cachingVideoId === heroVideo.id ? '快取中…' : '📥 快取' }}
            </button>
          </div>
        </div>
      </section>

      <h1 v-else class="page-title">鋒兄影院</h1>

      <!-- Actions Bar -->
      <div class="actions-bar">
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋影片名稱..."
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <div class="csv-actions">
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

      <!-- YouTube 式分類膠囊列 -->
      <div v-if="categoryChips.length > 1" class="chip-rail" role="tablist" aria-label="影片分類">
        <button
          v-for="chip in categoryChips"
          :key="chip.value"
          type="button"
          role="tab"
          class="chip"
          :class="{ active: activeCategory === chip.value }"
          :aria-selected="activeCategory === chip.value"
          @click="activeCategory = chip.value"
        >
          {{ chip.label }}<span class="chip-count">{{ chip.count }}</span>
        </button>
      </div>

      <!-- 摘要列 -->
      <div class="summary-bar">
        <div class="summary-left">
          <button @click="openInlineAdd" class="btn-add-icon" title="新增">+</button>
          <button v-if="!batchMode && filteredVideos.length > 0" @click="enterBatchMode" class="btn-batch-mode">批量選擇</button>
          <template v-if="batchMode">
            <label class="select-all-label"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /><span>全選</span></label>
            <button @click="exitBatchMode" class="btn-cancel-batch">取消</button>
          </template>
          <span class="summary-count">共 {{ videos.length }} 個項目</span>
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
              @click="setVideoLayoutMode(option.value)"
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
          <span class="cache-meter" aria-hidden="true">
            <span class="cache-meter-fill" :style="{ width: `${cachePercent}%` }"></span>
          </span>
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
      <div v-if="loading" class="loading">
        <span class="loading-spinner" aria-hidden="true"></span> 載入中...
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredVideos.length === 0 && !isAddingInline" class="empty-state">
        <span class="empty-icon" aria-hidden="true">🎬</span>
        <p v-if="searchQuery || activeCategory !== 'all'">找不到符合的影片</p>
        <p v-else>尚無影片記錄，點擊「新增」開始</p>
      </div>

      <!-- ══ 劇院模式：Netflix 橫向片列 ══ -->
      <div v-if="videoLayoutMode === 'rail' && !isAddingInline && filteredVideos.length > 0" class="rail-stack">
        <section v-for="rail in videoRails" :key="rail.key" class="rail">
          <header class="rail-head">
            <h3 class="rail-title">{{ rail.title }}</h3>
            <span class="rail-count">{{ rail.items.length }} 部</span>
          </header>
          <div class="rail-track">
            <article
              v-for="video in rail.items"
              :key="rail.key + '-' + video.id"
              class="poster-card"
              :class="{ 'is-selected': selectedIds.has(video.id), 'is-playing': playingVideoId === video.id }"
              @click="batchMode ? toggleSelection(video.id) : handlePlay(video)"
              @mouseenter="warmThumbnail(video)"
            >
              <div class="poster-thumb">
                <input v-if="batchMode" type="checkbox" :checked="selectedIds.has(video.id)" @click.stop="toggleSelection(video.id)" class="batch-checkbox" />
                <img v-if="video.cover" :src="resolveMediaUrl(video.cover)" :alt="video.name" class="thumbnail-img" loading="lazy" />
                <video
                  v-else-if="video.file && canRenderVideoThumbnail(video)"
                  :src="getThumbnailVideoSrc(video)"
                  preload="metadata"
                  class="thumbnail-video"
                  muted
                  playsinline
                  @loadedmetadata="seekThumbnailFrame"
                ></video>
                <div v-else class="thumbnail-placeholder"><span class="placeholder-icon">🎬</span></div>
                <span v-if="video.filetype" class="filetype-tag">{{ video.filetype.toUpperCase() }}</span>
                <span v-if="videoCache.has(video.id)" class="poster-cached" title="已快取">●</span>
                <div class="poster-hover">
                  <span class="play-btn">{{ resolvingVideoIds.has(video.id) ? '…' : '▶' }}</span>
                  <div v-if="!batchMode" class="poster-tools" @click.stop>
                    <button class="action-btn edit-btn" title="編輯" @click="openEditModal(video)">✏️</button>
                    <button
                      v-if="video.file"
                      class="action-btn download-btn"
                      :disabled="downloadingVideoId === video.id"
                      title="下載"
                      @click="downloadVideo(video)"
                    >{{ downloadingVideoId === video.id ? '⏬' : '⬇️' }}</button>
                    <button
                      v-if="video.file && videoCache.has(video.id)"
                      class="action-btn cached-btn"
                      title="已快取 (點擊清除)"
                      @click="uncacheVideo(video.id)"
                    >✅</button>
                    <button
                      v-else-if="video.file"
                      class="action-btn cache-btn"
                      :disabled="cachingVideoId === video.id"
                      title="快取影片"
                      @click="cacheVideo(video)"
                    >{{ cachingVideoId === video.id ? '⏳' : '📥' }}</button>
                    <button class="action-btn delete-btn" title="刪除" @click="handleDelete(video)">🗑️</button>
                  </div>
                </div>
              </div>
              <div class="poster-copy">
                <h4 class="poster-title">{{ video.name || '未命名' }}</h4>
                <p class="poster-sub">
                  <span>{{ video.category || '未分類' }}</span>
                  <span v-if="video.note" class="poster-note">{{ truncateText(video.note, 34) }}</span>
                </p>
              </div>
            </article>
          </div>
        </section>
      </div>

      <!-- ══ 網格／列表模式：YouTube 卡片 × Bilibili 資訊列 ══ -->
      <div
        v-if="(videoLayoutMode !== 'rail' && filteredVideos.length > 0) || isAddingInline"
        class="video-grid"
        :class="[`video-grid--${videoLayoutMode === 'rail' ? 'card' : videoLayoutMode}`]"
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
          v-for="video in (videoLayoutMode === 'rail' ? [] : filteredVideos)"
          :key="video.id"
          class="video-card"
          :class="[
            { 'is-selected': selectedIds.has(video.id), 'is-playing': playingVideoId === video.id },
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

          <!-- 顯示模式（點擊進觀看主舞台） -->
          <template v-else>
            <div class="thumbnail-wrapper" @click="handlePlay(video)" @mouseenter="warmThumbnail(video)">
              <input v-if="batchMode" type="checkbox" :checked="selectedIds.has(video.id)" @click.stop="toggleSelection(video.id)" class="batch-checkbox" />
              <template v-if="video.cover">
                <img :src="resolveMediaUrl(video.cover)" :alt="video.name" class="thumbnail-img" loading="lazy" />
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
              <span v-if="videoCache.has(video.id)" class="cached-tag" title="已快取">已快取</span>
            </div>

            <!-- 影片資訊區（Bilibili 式頭像 + 統計） -->
            <div class="video-meta">
              <div class="bilibili-avatar" aria-hidden="true">鋒</div>
              <div class="video-copy">
                <h3 class="video-title">{{ video.name || '未命名' }}</h3>
                <div class="bilibili-stats">
                  <span>鋒兄頻道</span>
                  <span>{{ video.filetype ? video.filetype.toUpperCase() : 'VIDEO' }}</span>
                  <span>{{ video.category || '未分類' }}</span>
                </div>
                <div v-if="video.category || video.ref" class="meta-row">
                  <span v-if="video.category" class="category-chip">{{ video.category }}</span>
                  <a v-if="video.ref" class="meta-ref" :href="video.ref" target="_blank" rel="noopener" :title="video.ref" @click.stop>🔗 參考</a>
                </div>
                <p v-if="video.note" class="video-desc">{{ truncateText(video.note, 80) }}</p>
              </div>
            </div>

            <!-- 操作列 -->
            <div v-if="!batchMode" class="card-actions-bar">
              <button @click.stop="startInlineEdit(video)" class="action-btn edit-btn" title="編輯">✏️</button>
              <button @click.stop="handleDelete(video)" class="action-btn delete-btn" title="刪除">🗑️</button>
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
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useVideoRecords } from '../../composables/useVideoRecords'
import { useStorage } from '../../composables/useStorage'
import { usePersistentVideoPlayer } from '../../composables/usePersistentVideoPlayer'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'
import { recordMediaTraffic } from '../../utils/mediaTraffic'

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
const VIDEO_LAYOUT_MODE_KEY = 'feng-video-layout-mode'
/** 劇院（Netflix 橫向片列）／網格（YouTube 卡片）／列表 */
const videoLayoutMode = ref('rail')
const activeCategory = ref('all')
const layoutOptions = [
  { value: 'rail', label: '劇院' },
  { value: 'card', label: '網格' },
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
let watchControlsHideTimer = null
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
  // Vue 切換 :key 時會先 ref(null) 再綁新節點；若直接清掉會把新 video 的 ref 洗掉，
  // 自動連播／切換後播放鈕失效、狀態錯亂。
  if (element) {
    activeVideoElement.value = element
    return
  }
  queueMicrotask(() => {
    const current = activeVideoElement.value
    if (!current || !current.isConnected) {
      activeVideoElement.value = null
    }
  })
}

function isActiveWatchElement(element, video = null) {
  // 已卸載的舊 <video> 事件必須忽略，否則自動連播切換會改寫播放狀態
  if (!element?.isConnected) return false
  if (video?.id != null && playingVideoId.value !== video.id) return false
  const active = activeVideoElement.value
  // 允許 active 尚未綁定完成時接受剛掛載的 element
  if (active && active !== element) return false
  return true
}

async function tryStartWatchPlayback(element = activeVideoElement.value) {
  if (!element || !element.isConnected) {
    watchIsPlaying.value = false
    watchControlsVisible.value = true
    return false
  }
  try {
    if (element.ended) {
      element.currentTime = 0
    }
    await element.play()
    syncWatchUiFromElement(element)
    return true
  } catch (error) {
    // 瀏覽器封鎖無手勢自動播放時，務必顯示中央播放鈕與控制列
    console.warn('Watch autoplay blocked or failed:', error)
    watchIsPlaying.value = false
    watchControlsVisible.value = true
    clearWatchControlsHideTimer()
    return false
  }
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
    recordMediaTraffic({ bytes: blob.size, category: 'video', action: 'download' })
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
  if (!element || !isActiveWatchElement(element)) return
  watchIsPlaying.value = !element.paused && !element.ended
  watchCurrentTime.value = element.currentTime || 0
  watchDuration.value = Number.isFinite(element.duration) ? element.duration : 0
  watchVolume.value = element.volume ?? 1
  watchIsMuted.value = Boolean(element.muted)
  watchPlaybackRate.value = element.playbackRate || 1
  if (!element.muted && element.volume > 0) {
    watchLastVolume = element.volume
  }
  // 暫停／結束時強制露出控制列與中央播放鈕，避免自動連播切換後「按鈕消失」
  if (element.paused || element.ended) {
    watchControlsVisible.value = true
    clearWatchControlsHideTimer()
  }
}

async function handlePlay(video) {
  if (!video?.file || batchMode.value) return
  try {
    if (!persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) {
      pausePersistentVideo()
    }
    // Enter watch stage immediately so the shell is visible while multipart resolves.
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

    // src 就緒後主動 play：僅靠 autoplay 在切換／blob src 更新時不可靠
    await nextTick()
    let element = activeVideoElement.value
    if (!element || !element.isConnected) {
      await nextTick()
      element = activeVideoElement.value
    }
    if (element && playingVideoId.value === video.id) {
      // Vue 已綁 :src；若尚未套上則補上（multipart resolve 後常見）
      if (src && !element.currentSrc && !element.getAttribute('src')) {
        element.src = src
      }
      await tryStartWatchPlayback(element)
      syncWatchUiFromElement(element)
    }
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
  if (!element || !video || !isActiveWatchElement(element, video)) return
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
  const element = event?.target
  if (!element || !isActiveWatchElement(element, video)) return
  syncWatchUiFromElement(element)
  watchControlsVisible.value = true
  clearWatchControlsHideTimer()
  if (!video || !persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) return
  snapshotPersistentVideo(element, getPersistentVideoMeta(video), { playing: false })
}

function handleWatchProgress(event, video) {
  const element = event?.target
  if (!element || !isActiveWatchElement(element, video)) return
  syncWatchUiFromElement(element)
  if (!video || !persistentVideoTrack.value || persistentVideoTrack.value.id !== video.id) return
  snapshotPersistentVideo(element, getPersistentVideoMeta(video), {
    playing: !element.paused
  })
}

function syncWatchVolumeFromElement(event) {
  const element = event?.target || activeVideoElement.value
  if (!element || !isActiveWatchElement(element, watchingVideo.value)) return
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
  // 連播切換後若仍暫停（autoplay 沒觸發或被擋），補一次 play；失敗則露出播放鈕
  if (element.paused && !element.ended && playingVideoId.value === video.id) {
    await tryStartWatchPlayback(element)
  }
  syncWatchUiFromElement(element)
  snapshotPersistentVideo(element, getPersistentVideoMeta(video), {
    playing: !element.paused
  })
  if (element.paused || element.ended) {
    watchControlsVisible.value = true
    clearWatchControlsHideTimer()
  } else {
    revealWatchControls()
  }
}

async function toggleWatchPlayback() {
  const element = activeVideoElement.value
  if (!element || !element.isConnected) {
    // 切換後 ref 偶發未綁定：再等一幀
    await nextTick()
  }
  const el = activeVideoElement.value
  if (!el || !el.isConnected) {
    watchIsPlaying.value = false
    watchControlsVisible.value = true
    return
  }
  try {
    if (el.paused || el.ended) {
      await tryStartWatchPlayback(el)
    } else {
      el.pause()
      syncWatchUiFromElement(el)
    }
  } catch (error) {
    console.warn('Watch playback toggle failed:', error)
    watchIsPlaying.value = false
    watchControlsVisible.value = true
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

async function playNextRelated() {
  const next = nextRelatedVideo.value
  if (!next) return
  await handlePlay(next)
}

async function playPrevRelated() {
  const prev = prevRelatedVideo.value
  if (!prev) return
  await handlePlay(prev)
}

async function handleWatchEnded() {
  watchIsPlaying.value = false
  watchControlsVisible.value = true
  clearWatchControlsHideTimer()
  // 播完直接連播下一支，不再倒數 5 秒
  if (nextRelatedVideo.value) {
    await playNextRelated()
    return
  }
  // 無下一支時保留中央播放鈕（可重播）
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
    // Shift+→ 快轉 5 秒；單純 → 下一支
    if (event.shiftKey) {
      seekWatchVideo((activeVideoElement.value?.currentTime || 0) + 5)
    } else {
      playNextRelated()
    }
    return
  }
  if (key === 'ArrowLeft') {
    event.preventDefault()
    // Shift+← 倒轉 5 秒；單純 ← 上一支
    if (event.shiftKey) {
      seekWatchVideo((activeVideoElement.value?.currentTime || 0) - 5)
    } else {
      playPrevRelated()
    }
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
    return
  }
  if (lower === 'p') {
    event.preventDefault()
    playPrevRelated()
  }
}

async function exitWatchStage({ continuePlaying = true } = {}) {
  const element = activeVideoElement.value
  const video = watchingVideo.value
  theaterMode.value = false
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
  const query = searchQuery.value.trim().toLowerCase()
  const category = activeCategory.value
  return videos.value.filter((video) => {
    if (query && !video.name?.toLowerCase().includes(query)) return false
    if (category === 'all') return true
    if (category === '__uncategorized__') return !video.category
    return video.category === category
  })
})

/** YouTube 式分類膠囊：全部 + 依分類統計 */
const categoryChips = computed(() => {
  const counts = new Map()
  let uncategorized = 0
  videos.value.forEach((video) => {
    if (video.category) {
      counts.set(video.category, (counts.get(video.category) || 0) + 1)
    } else {
      uncategorized += 1
    }
  })
  const chips = [{ value: 'all', label: '全部', count: videos.value.length }]
  Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([label, count]) => chips.push({ value: label, label, count }))
  if (uncategorized > 0) {
    chips.push({ value: '__uncategorized__', label: '未分類', count: uncategorized })
  }
  return chips
})

/** Netflix 主打橫幅：優先挑有封面且可播放的第一部 */
const heroVideo = computed(() => {
  const pool = filteredVideos.value
  if (pool.length === 0) return null
  return (
    pool.find((video) => video.cover && video.file) ||
    pool.find((video) => video.file) ||
    pool[0]
  )
})

/** Netflix 橫向片列：最新加入 + 依分類分列 */
const videoRails = computed(() => {
  const pool = filteredVideos.value
  if (pool.length === 0) return []
  const rails = []
  if (pool.length > 4) {
    rails.push({ key: 'latest', title: '最新加入', items: pool.slice(0, 14) })
  }
  const groups = new Map()
  pool.forEach((video) => {
    const key = video.category || '未分類'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(video)
  })
  Array.from(groups.entries())
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .forEach(([title, items]) => {
      rails.push({ key: `cat-${title}`, title, items })
    })
  return rails
})

const cachePercent = computed(() => {
  const total = videosWithFile.value.length
  if (!total) return 0
  return Math.min(100, Math.round((cachedCount.value / total) * 100))
})

const watchProgressPercent = computed(() => {
  if (!watchDuration.value) return 0
  return Math.min(100, (watchCurrentTime.value / watchDuration.value) * 100)
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

/** 目前篩選結果中可播放的清單順序，供上一支／下一支／連播使用 */
const playlistVideos = computed(() => filteredVideos.value.filter((video) => video.file))

const currentPlaylistIndex = computed(() => {
  const current = watchingVideo.value
  if (!current) return -1
  return playlistVideos.value.findIndex((video) => video.id === current.id)
})

const nextRelatedVideo = computed(() => {
  const idx = currentPlaylistIndex.value
  if (idx < 0) return null
  return playlistVideos.value[idx + 1] || null
})

const prevRelatedVideo = computed(() => {
  const idx = currentPlaylistIndex.value
  if (idx <= 0) return null
  return playlistVideos.value[idx - 1] || null
})

function getVideoLayoutClass() {
  if (videoLayoutMode.value === 'list') return 'video-card--list'
  return 'video-card--card'
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

function setVideoLayoutMode(mode) {
  if (!layoutOptions.some((option) => option.value === mode)) return
  videoLayoutMode.value = mode
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(VIDEO_LAYOUT_MODE_KEY, mode)
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
      const savedMode = localStorage.getItem(VIDEO_LAYOUT_MODE_KEY)
      if (layoutOptions.some((option) => option.value === savedMode)) {
        videoLayoutMode.value = savedMode
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
/* ============================================================
   鋒兄影院 — YouTube × Bilibili × Netflix 融合介面
   · Netflix：黑幕影廳、主打橫幅、橫向片列、海報懸停放大
   · YouTube：播放主舞台 + 右側「接下來播放」、分類膠囊、網格卡
   · Bilibili：UP 主頭像、資訊統計列、粉藍雙色點綴
   ============================================================ */
.video-page {
  --vp-bg: #0a0a0e;
  --vp-surface: #15151c;
  --vp-surface-2: #1e1e28;
  --vp-surface-3: #262633;
  --vp-line: #2c2c39;
  --vp-line-soft: rgba(255, 255, 255, 0.08);
  --vp-text: #f3f3f6;
  --vp-text-2: #a9a9b8;
  --vp-text-3: #71717f;
  --vp-red: #e50914;
  --vp-red-hi: #ff3b45;
  --vp-pink: #fb7299;
  --vp-blue: #23ade5;
  --vp-ok: #3ecf8e;
  --vp-radius: 14px;

  position: relative;
  background: radial-gradient(120% 90% at 50% 0%, #16161f 0%, var(--vp-bg) 62%);
  color: var(--vp-text);
  border: 1px solid var(--vp-line);
  border-radius: var(--vp-radius);
  padding: var(--sp-5);
  font-family: var(--font-body);
  overflow: hidden;
}

.video-page.is-watching {
  padding: 0;
  background: #000;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.page-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  letter-spacing: var(--tracking-tight);
  color: var(--vp-text);
  margin: 0 0 var(--sp-4);
}

/* ══════════ Netflix 主打橫幅 ══════════ */
.hero-billboard {
  position: relative;
  margin: calc(var(--sp-5) * -1) calc(var(--sp-5) * -1) var(--sp-5);
  min-height: 340px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  isolation: isolate;
}

.hero-backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
}

.hero-backdrop-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  filter: saturate(1.05);
}

.hero-backdrop-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 5rem;
  background: linear-gradient(135deg, #1d1d29, #0d0d14);
}

.hero-scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(8, 8, 12, 0.95) 0%, rgba(8, 8, 12, 0.72) 42%, rgba(8, 8, 12, 0.15) 100%),
    linear-gradient(0deg, var(--vp-bg) 0%, rgba(10, 10, 14, 0) 55%);
}

.hero-copy {
  position: relative;
  padding: var(--sp-8) var(--sp-6) var(--sp-6);
  max-width: 640px;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--vp-text-2);
  margin: 0 0 var(--sp-3);
}

.hero-mark {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: var(--vp-red);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.8125rem;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 1.1rem + 2.4vw, 3rem);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin: 0 0 var(--sp-3);
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.6);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}

.hero-badge {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: var(--radius-xs);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: var(--vp-text);
}

.hero-badge--ghost {
  background: transparent;
  color: var(--vp-text-2);
}

.hero-badge--ok {
  background: color-mix(in oklab, var(--vp-ok) 22%, transparent);
  border-color: color-mix(in oklab, var(--vp-ok) 45%, transparent);
  color: var(--vp-ok);
}

.hero-desc {
  font-size: var(--text-md);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.82);
  margin: 0 0 var(--sp-5);
  max-width: 52ch;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.hero-btn {
  height: var(--control-h-lg);
  padding: 0 var(--sp-6);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(60, 60, 72, 0.75);
  backdrop-filter: blur(6px);
  color: var(--vp-text);
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.hero-btn:hover:not(:disabled) {
  background: rgba(90, 90, 106, 0.9);
  transform: translateY(-1px);
}

.hero-btn--play {
  background: #fff;
  border-color: #fff;
  color: #0a0a0e;
}

.hero-btn--play:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.82);
}

.hero-btn--ghost {
  background: transparent;
}

.hero-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ══════════ 操作列 / 搜尋 ══════════ */
.actions-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin-bottom: var(--sp-4);
}

.search-area {
  flex: 1 1 260px;
  min-width: 220px;
}

.search-area :deep(input) {
  background: var(--vp-surface-2);
  border: 1px solid var(--vp-line);
  color: var(--vp-text);
  border-radius: var(--radius-full);
  height: var(--control-h);
}

.search-area :deep(input::placeholder) {
  color: var(--vp-text-3);
}

.search-area :deep(input:focus) {
  outline: none;
  border-color: var(--vp-blue);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--vp-blue) 25%, transparent);
}

.csv-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.btn-export,
.btn-import {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: var(--control-h);
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--vp-line);
  background: var(--vp-surface-2);
  color: var(--vp-text-2);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-export:hover,
.btn-import:hover {
  background: var(--vp-surface-3);
  color: var(--vp-text);
  border-color: var(--vp-line-soft);
}

/* ══════════ YouTube 分類膠囊 ══════════ */
.chip-rail {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
  padding-bottom: var(--sp-2);
  margin-bottom: var(--sp-4);
  scrollbar-width: none;
}

.chip-rail::-webkit-scrollbar {
  display: none;
}

.chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  height: 32px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  background: var(--vp-surface-2);
  color: var(--vp-text-2);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.chip:hover {
  background: var(--vp-surface-3);
  color: var(--vp-text);
}

.chip.active {
  background: var(--vp-text);
  color: #0a0a0e;
  font-weight: 600;
}

.chip-count {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  opacity: 0.65;
}

/* ══════════ 摘要列 ══════════ */
.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: var(--sp-3) 0;
  border-top: 1px solid var(--vp-line);
  border-bottom: 1px solid var(--vp-line);
  margin-bottom: var(--sp-4);
}

.summary-left,
.summary-right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.summary-count,
.selected-count {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--vp-text-3);
}

.selected-count {
  color: var(--vp-pink);
}

.btn-add-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  border: none;
  background: var(--vp-red);
  color: #fff;
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.btn-add-icon:hover {
  background: var(--vp-red-hi);
  transform: scale(1.06);
}

.btn-batch-mode,
.btn-cancel-batch {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--vp-line);
  background: transparent;
  color: var(--vp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-batch-mode:hover,
.btn-cancel-batch:hover {
  background: var(--vp-surface-2);
  color: var(--vp-text);
}

.select-all-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--vp-text-2);
  cursor: pointer;
}

.select-all-label input {
  accent-color: var(--vp-pink);
}

.btn-batch-delete {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid color-mix(in oklab, var(--vp-red) 55%, transparent);
  background: color-mix(in oklab, var(--vp-red) 18%, transparent);
  color: #ff8b91;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-batch-delete:hover:not(:disabled) {
  background: var(--vp-red);
  color: #fff;
}

.layout-switcher {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: var(--radius-full);
  background: var(--vp-surface-2);
  border: 1px solid var(--vp-line);
}

.layout-switch-btn {
  height: 26px;
  padding: 0 var(--sp-3);
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--vp-text-3);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.layout-switch-btn:hover {
  color: var(--vp-text);
}

.layout-switch-btn.active {
  background: var(--vp-red);
  color: #fff;
  font-weight: 600;
}

/* ══════════ 快取列 ══════════ */
.cache-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--radius-md);
  background: var(--vp-surface);
  border: 1px solid var(--vp-line);
  margin-bottom: var(--sp-5);
}

.cache-info {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--vp-text-2);
}

.cache-info strong {
  color: var(--vp-ok);
  font-family: var(--font-mono);
}

.cache-size {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--vp-text-3);
}

.cache-meter {
  display: block;
  width: 120px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--vp-surface-3);
  overflow: hidden;
}

.cache-meter-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--vp-ok), var(--vp-blue));
  transition: width var(--transition-normal);
}

.cache-actions {
  display: flex;
  gap: var(--sp-2);
}

.btn-cache-all,
.btn-clear-cache {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--vp-line);
  background: var(--vp-surface-2);
  color: var(--vp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-cache-all:hover:not(:disabled) {
  border-color: var(--vp-ok);
  color: var(--vp-ok);
}

.btn-clear-cache:hover {
  border-color: var(--vp-red);
  color: #ff8b91;
}

.btn-cache-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ══════════ 狀態 ══════════ */
.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-16) var(--sp-4);
  color: var(--vp-text-3);
  font-size: var(--text-md);
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--vp-line);
  border-top-color: var(--vp-red);
  animation: vpSpin 0.8s linear infinite;
}

@keyframes vpSpin {
  to { transform: rotate(360deg); }
}

/* ══════════ Netflix 橫向片列 ══════════ */
.rail-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sp-8);
}

.rail-head {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  margin-bottom: var(--sp-3);
}

.rail-title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: var(--tracking-tight);
  color: var(--vp-text);
  margin: 0;
}

.rail-count {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--vp-text-3);
}

.rail-track {
  display: flex;
  gap: var(--sp-3);
  overflow-x: auto;
  padding: var(--sp-2) var(--sp-1) var(--sp-5);
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: var(--vp-surface-3) transparent;
}

.rail-track::-webkit-scrollbar {
  height: 6px;
}

.rail-track::-webkit-scrollbar-thumb {
  background: var(--vp-surface-3);
  border-radius: var(--radius-full);
}

.poster-card {
  flex: 0 0 232px;
  scroll-snap-align: start;
  cursor: pointer;
  transition: transform var(--duration-normal) var(--ease-out-expo);
}

.poster-card:hover {
  transform: scale(1.055);
  z-index: 2;
}

.poster-card.is-selected {
  outline: 2px solid var(--vp-pink);
  outline-offset: 3px;
  border-radius: var(--radius-md);
}

.poster-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--vp-surface-2);
  border: 1px solid var(--vp-line);
}

.poster-card.is-playing .poster-thumb {
  border-color: var(--vp-red);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--vp-red) 45%, transparent);
}

.poster-thumb .thumbnail-img,
.poster-thumb .thumbnail-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-cached {
  position: absolute;
  top: 6px;
  left: 6px;
  color: var(--vp-ok);
  font-size: 0.75rem;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}

.poster-hover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.15));
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.poster-card:hover .poster-hover {
  opacity: 1;
}

.poster-tools {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 4px;
}

.poster-copy {
  padding: var(--sp-2) 2px 0;
}

.poster-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--vp-text);
  margin: 0 0 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poster-sub {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  font-size: var(--text-2xs);
  color: var(--vp-text-3);
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
}

.poster-note {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ══════════ YouTube 網格 / 列表 ══════════ */
.video-grid {
  display: grid;
  gap: var(--sp-5) var(--sp-4);
}

.video-grid--card {
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
}

.video-grid--list {
  grid-template-columns: 1fr;
  gap: var(--sp-3);
}

.video-card {
  position: relative;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.video-card.is-selected {
  outline: 2px solid var(--vp-pink);
  outline-offset: 4px;
}

.video-card--card .thumbnail-wrapper {
  aspect-ratio: 16 / 9;
}

.video-card--card:hover .video-title {
  color: #fff;
}

.video-card--list {
  display: grid;
  grid-template-columns: 240px 1fr auto;
  align-items: start;
  gap: var(--sp-4);
  padding: var(--sp-3);
  background: var(--vp-surface);
  border: 1px solid var(--vp-line);
}

.video-card--list:hover {
  background: var(--vp-surface-2);
}

.video-card--list .thumbnail-wrapper {
  aspect-ratio: 16 / 9;
}

.video-card--list .card-actions-bar {
  padding: 0;
  border: none;
  background: transparent;
}

.video-card--editor {
  grid-column: 1 / -1;
  background: var(--vp-surface);
  border: 1px solid var(--vp-line);
  padding: var(--sp-4);
}

.thumbnail-wrapper {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--vp-surface-2);
  border: 1px solid var(--vp-line);
  cursor: pointer;
}

.thumbnail-img,
.thumbnail-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  min-height: 130px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #1b1b26, #101017);
}

.placeholder-icon {
  font-size: 2rem;
  opacity: 0.4;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.thumbnail-wrapper:hover .play-overlay {
  opacity: 1;
}

.play-btn {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--vp-red);
  color: #fff;
  font-size: 1.125rem;
  padding-left: 3px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.play-overlay--loading .play-btn {
  background: var(--vp-surface-3);
}

.filetype-tag,
.cached-tag {
  position: absolute;
  bottom: 6px;
  right: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
}

.cached-tag {
  right: auto;
  left: 6px;
  background: color-mix(in oklab, var(--vp-ok) 88%, black);
  color: #08120d;
  font-weight: 600;
}

.batch-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  width: 18px;
  height: 18px;
  accent-color: var(--vp-pink);
  cursor: pointer;
}

/* Bilibili 資訊列 */
.video-meta {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-3) 2px 0;
}

.bilibili-avatar,
.watch-avatar {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vp-pink), var(--vp-blue));
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-sm);
}

.watch-avatar {
  width: 44px;
  height: 44px;
  font-size: var(--text-lg);
}

.video-copy {
  min-width: 0;
  flex: 1;
}

.video-title {
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  line-height: 1.32;
  color: var(--vp-text);
  margin: 0 0 var(--sp-1);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color var(--transition-fast);
}

.bilibili-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--vp-text-3);
}

.bilibili-stats span + span::before {
  content: '·';
  margin-right: var(--sp-2);
  color: var(--vp-line);
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}

.category-chip {
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--vp-pink) 18%, transparent);
  color: var(--vp-pink);
  border: 1px solid color-mix(in oklab, var(--vp-pink) 32%, transparent);
}

.filetype-chip {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--vp-surface-3);
  color: var(--vp-text-2);
}

.cache-chip {
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--vp-ok) 18%, transparent);
  color: var(--vp-ok);
}

.meta-ref {
  font-size: var(--text-2xs);
  color: var(--vp-blue);
  text-decoration: none;
}

.meta-ref:hover {
  text-decoration: underline;
}

.video-desc {
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--vp-text-3);
  margin: var(--sp-2) 0 0;
}

.card-actions-bar {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-2) 0 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.video-card:hover .card-actions-bar,
.video-card--list .card-actions-bar {
  opacity: 1;
}

.action-btn {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--vp-line);
  background: var(--vp-surface-2);
  color: var(--vp-text-2);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--vp-surface-3);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.delete-btn:hover:not(:disabled) {
  border-color: var(--vp-red);
}

.cached-btn {
  border-color: color-mix(in oklab, var(--vp-ok) 45%, transparent);
}

/* ══════════ 行內編輯表單 ══════════ */
.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.video-card--list .inline-edit-form,
.video-card--card .inline-edit-form {
  grid-column: 1 / -1;
  background: var(--vp-surface);
  border: 1px solid var(--vp-line);
  border-radius: var(--radius-md);
  padding: var(--sp-4);
}

.inline-form-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.inline-form-group label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--vp-text-3);
}

.inline-input,
.inline-textarea {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--vp-line);
  background: var(--vp-surface-2);
  color: var(--vp-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.inline-input:focus,
.inline-textarea:focus {
  outline: none;
  border-color: var(--vp-blue);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--vp-blue) 22%, transparent);
}

.inline-textarea {
  resize: vertical;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.btn-upload {
  height: var(--control-h-sm);
  padding: 0 var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--vp-line);
  background: transparent;
  color: var(--vp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-upload:hover:not(:disabled) {
  border-color: var(--vp-blue);
  color: var(--vp-blue);
}

.btn-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selected-file-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-2);
  border-radius: var(--radius-sm);
  background: var(--vp-surface-2);
}

.selected-file-summary {
  font-size: var(--text-xs);
  color: var(--vp-text-2);
}

.selected-file-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}

.selected-file-chip {
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--vp-surface-3);
  color: var(--vp-text-2);
}

.btn-remove-sm {
  align-self: flex-start;
  height: 24px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-xs);
  border: 1px solid var(--vp-line);
  background: transparent;
  color: var(--vp-text-3);
  font-size: var(--text-2xs);
  cursor: pointer;
}

.btn-remove-sm:hover {
  color: #ff8b91;
  border-color: var(--vp-red);
}

.upload-progress-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.upload-progress-head {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-2xs);
  color: var(--vp-text-3);
}

.upload-progress {
  font-family: var(--font-mono);
  color: var(--vp-blue);
}

.upload-progress-bar {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--vp-surface-3);
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--vp-blue), var(--vp-pink));
  transition: width var(--transition-normal);
}

.inline-video-preview,
.video-preview {
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #000;
}

.card-video,
.preview-video {
  width: 100%;
  display: block;
  max-height: 240px;
}

.inline-cover-preview,
.cover-preview {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.preview-cover-img,
.preview-image {
  width: 96px;
  height: 54px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  border: 1px solid var(--vp-line);
}

.inline-edit-actions {
  display: flex;
  gap: var(--sp-2);
}

.btn-save,
.btn-submit {
  height: var(--control-h-sm);
  padding: 0 var(--sp-4);
  border-radius: var(--radius-sm);
  border: none;
  background: var(--vp-red);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover:not(:disabled),
.btn-submit:hover {
  background: var(--vp-red-hi);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel-inline,
.btn-cancel,
.btn-remove {
  height: var(--control-h-sm);
  padding: 0 var(--sp-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--vp-line);
  background: transparent;
  color: var(--vp-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-cancel-inline:hover,
.btn-cancel:hover,
.btn-remove:hover {
  background: var(--vp-surface-2);
  color: var(--vp-text);
}

/* ══════════ 觀看主舞台 ══════════ */
.watch-stage {
  display: flex;
  flex-direction: column;
  min-height: 70vh;
  background: #000;
  border-radius: var(--vp-radius);
  overflow: hidden;
}

.watch-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--vp-line);
  background: linear-gradient(180deg, #14141b, #0c0c11);
}

.watch-back-btn {
  height: var(--control-h-sm);
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--vp-line);
  background: var(--vp-surface-2);
  color: var(--vp-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.watch-back-btn:hover {
  background: var(--vp-red);
  border-color: var(--vp-red);
  color: #fff;
}

.watch-hotkeys {
  flex: 1;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--vp-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watch-theater-btn {
  height: var(--control-h-sm);
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--vp-line);
  background: transparent;
  color: var(--vp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.watch-theater-btn:hover,
.watch-theater-btn[aria-pressed='true'] {
  background: var(--vp-surface-2);
  color: var(--vp-text);
}

.watch-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: var(--sp-5);
  padding: var(--sp-5);
  align-items: start;
}

.watch-stage--theater .watch-layout {
  grid-template-columns: minmax(0, 1fr);
  padding: 0 0 var(--sp-5);
}

.watch-primary {
  min-width: 0;
}

.watch-player-shell {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--vp-line);
}

.watch-stage--theater .watch-player-shell {
  border-radius: 0;
  border-left: none;
  border-right: none;
  max-height: 78vh;
}

.watch-player-shell.is-fullscreen {
  border-radius: 0;
  aspect-ratio: auto;
  height: 100vh;
}

.watch-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  cursor: pointer;
}

.watch-player-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  color: var(--vp-text-2);
  font-size: var(--text-sm);
  background: rgba(0, 0, 0, 0.6);
}

.watch-loading-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--vp-line);
  border-top-color: var(--vp-red);
  animation: vpSpin 0.8s linear infinite;
}

.watch-center-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: none;
  background: rgba(229, 9, 20, 0.92);
  color: #fff;
  font-size: 1.75rem;
  padding-left: 5px;
  cursor: pointer;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.watch-center-play:hover {
  transform: translate(-50%, -50%) scale(1.08);
  background: var(--vp-red-hi);
}

.watch-skip-edge {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 68px;
  border: none;
  border-radius: var(--radius-sm);
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast), background var(--transition-fast);
}

.watch-player-shell:hover .watch-skip-edge:not(:disabled) {
  opacity: 1;
}

.watch-skip-edge:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.72);
}

.watch-skip-edge:disabled {
  cursor: not-allowed;
}

.watch-skip-edge--prev { left: var(--sp-3); }
.watch-skip-edge--next { right: var(--sp-3); }

.watch-chrome {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--sp-6) var(--sp-4) var(--sp-3);
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.92), rgba(0, 0, 0, 0));
  opacity: 0;
  transform: translateY(6px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  pointer-events: none;
}

.watch-player-shell.is-controls-visible .watch-chrome {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.watch-progress-block {
  margin-bottom: var(--sp-2);
}

.watch-progress {
  width: 100%;
  height: 4px;
  appearance: none;
  border-radius: var(--radius-full);
  background: linear-gradient(
    90deg,
    var(--vp-red) 0%,
    var(--vp-red) var(--played, 0%),
    rgba(255, 255, 255, 0.28) var(--played, 0%),
    rgba(255, 255, 255, 0.28) 100%
  );
  cursor: pointer;
}

.watch-progress::-webkit-slider-thumb {
  appearance: none;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--vp-red);
  border: none;
  box-shadow: 0 0 0 4px rgba(229, 9, 20, 0.25);
}

.watch-progress::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--vp-red);
  border: none;
}

.watch-chrome-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.watch-chrome-left,
.watch-chrome-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.watch-ctrl-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 var(--sp-2);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.watch-ctrl-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.16);
}

.watch-ctrl-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.watch-ctrl-btn--play {
  background: var(--vp-red);
}

.watch-ctrl-btn--play:hover {
  background: var(--vp-red-hi);
}

.watch-ctrl-btn--compact {
  min-width: 28px;
  height: 28px;
}

.watch-time {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.86);
  margin-left: var(--sp-2);
}

.watch-time-sep {
  opacity: 0.45;
  margin: 0 2px;
}

.watch-volume {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.watch-volume input[type='range'] {
  width: 78px;
  height: 4px;
  accent-color: var(--vp-red);
  cursor: pointer;
}

.watch-speed select {
  height: 28px;
  padding: 0 var(--sp-2);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  cursor: pointer;
}

.watch-info {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-5) 0 0;
  flex-wrap: wrap;
}

.watch-stage--theater .watch-info {
  padding: var(--sp-5) var(--sp-5) 0;
}

.watch-info-copy {
  flex: 1;
  min-width: 240px;
}

.watch-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  line-height: 1.25;
  color: var(--vp-text);
  margin: 0 0 var(--sp-2);
}

.watch-channel-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--vp-text-2);
  margin-bottom: var(--sp-3);
}

.watch-channel {
  font-weight: 600;
  color: var(--vp-text);
}

.watch-dot {
  color: var(--vp-line);
}

.watch-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}

.watch-desc {
  margin: var(--sp-3) 0 0;
  padding: var(--sp-3);
  border-radius: var(--radius-sm);
  background: var(--vp-surface);
  border: 1px solid var(--vp-line);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--vp-text-2);
  white-space: pre-wrap;
}

.watch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
  align-content: flex-start;
}

.watch-action-btn {
  height: var(--control-h);
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: none;
  background: var(--vp-surface-3);
  color: var(--vp-text);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.watch-action-btn:hover:not(:disabled) {
  background: #333343;
}

.watch-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.watch-action-btn--muted {
  background: transparent;
  border: 1px solid var(--vp-line);
  color: var(--vp-text-2);
}

.watch-action-btn--danger {
  background: color-mix(in oklab, var(--vp-red) 20%, transparent);
  color: #ff8b91;
}

.watch-action-btn--danger:hover {
  background: var(--vp-red);
  color: #fff;
}

/* 右側「接下來播放」 */
.watch-related {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding-right: var(--sp-1);
  scrollbar-width: thin;
  scrollbar-color: var(--vp-surface-3) transparent;
}

.watch-related::-webkit-scrollbar {
  width: 6px;
}

.watch-related::-webkit-scrollbar-thumb {
  background: var(--vp-surface-3);
  border-radius: var(--radius-full);
}

.watch-related-title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--vp-text);
  margin: 0 0 var(--sp-1);
}

.watch-related-count {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--vp-text-3);
}

.watch-related-empty {
  font-size: var(--text-sm);
  color: var(--vp-text-3);
  margin: 0;
}

.watch-related-item {
  display: grid;
  grid-template-columns: 152px 1fr;
  gap: var(--sp-3);
  padding: var(--sp-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.watch-related-item:hover {
  background: var(--vp-surface);
}

.watch-related-item.is-active {
  background: var(--vp-surface-2);
  border-color: color-mix(in oklab, var(--vp-red) 55%, transparent);
}

.watch-related-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-xs);
  overflow: hidden;
  background: var(--vp-surface-2);
}

.watch-related-thumb img,
.watch-related-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.watch-related-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--vp-text-3);
}

.watch-related-type {
  position: absolute;
  right: 4px;
  bottom: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
}

.watch-related-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.watch-related-copy strong {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--vp-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.watch-related-copy span {
  font-size: var(--text-2xs);
  color: var(--vp-text-3);
}

.watch-related-channel {
  color: var(--vp-text-2) !important;
}

/* ══════════ Modal ══════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-4);
  background: rgba(4, 4, 8, 0.78);
  backdrop-filter: blur(4px);
}

.modal-content {
  width: min(620px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--vp-surface);
  border: 1px solid var(--vp-line);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  color: var(--vp-text);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--vp-line);
}

.modal-header h2 {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--vp-text-2);
  font-size: 1.375rem;
  line-height: 1;
  cursor: pointer;
}

.btn-close:hover {
  background: var(--vp-surface-2);
  color: var(--vp-text);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-5);
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
  color: var(--vp-text-3);
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--vp-line);
  background: var(--vp-surface-2);
  color: var(--vp-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--vp-blue);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--vp-blue) 22%, transparent);
}

.form-group textarea {
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--vp-line);
}

/* ══════════ 響應式 ══════════ */
@media (max-width: 1100px) {
  .watch-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .watch-related {
    max-height: none;
  }
}

@media (max-width: 768px) {
  .video-page {
    padding: var(--sp-4);
    border-radius: var(--radius-md);
  }

  .hero-billboard {
    margin: calc(var(--sp-4) * -1) calc(var(--sp-4) * -1) var(--sp-4);
    min-height: 260px;
  }

  .hero-copy {
    padding: var(--sp-6) var(--sp-4) var(--sp-4);
  }

  .video-grid--card {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .video-card--list {
    grid-template-columns: 1fr;
  }

  .poster-card {
    flex-basis: 180px;
  }

  .watch-layout {
    padding: var(--sp-3);
    gap: var(--sp-4);
  }

  .watch-related-item {
    grid-template-columns: 120px 1fr;
  }

  .watch-hotkeys {
    display: none;
  }

  .card-actions-bar {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .poster-card,
  .hero-btn,
  .action-btn {
    transition: none;
  }

  .poster-card:hover {
    transform: none;
  }

  .loading-spinner,
  .watch-loading-dot {
    animation: none;
  }
}
</style>
