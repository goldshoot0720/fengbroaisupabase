<template>
  <PageContainer>
    <div class="music-db-page">
      <!-- ══ Spotify 式歌單標頭 ══ -->
      <header class="sp-hero">
        <div class="sp-hero-art" aria-hidden="true">
          <img v-if="heroCover" :src="heroCover" alt="" class="sp-hero-img" />
          <span v-else class="sp-hero-note">♫</span>
        </div>
        <div class="sp-hero-copy">
          <p class="sp-hero-label">公開歌單</p>
          <h1 class="sp-hero-title">鋒兄音樂</h1>
          <p class="sp-hero-meta">
            <span class="sp-hero-owner"><span class="sp-owner-dot">鋒</span> 鋒兄</span>
            <span class="sp-dot">·</span>
            <span>{{ musics.length }} 首</span>
            <span class="sp-dot">·</span>
            <span>{{ groupedMusics.length }} 組</span>
            <span class="sp-dot">·</span>
            <span>{{ languageChips.length - 1 }} 種語言</span>
          </p>
        </div>
      </header>

      <!-- ══ 播放控制列 ══ -->
      <div class="sp-actions">
        <button
          class="sp-play-big"
          :title="isPlaying ? '暫停' : '播放全部'"
          :disabled="playableTracks.length === 0"
          @click="isPlaying ? togglePlay() : playAll()"
        >
          {{ isPlaying ? '❚❚' : '▶' }}
        </button>
        <button class="sp-ghost-btn" :class="{ active: shuffle }" title="隨機播放" @click="shuffle = !shuffle">🔀</button>
        <button class="sp-ghost-btn" :class="{ active: repeat }" title="循環播放" @click="repeat = !repeat">🔁</button>
        <button class="sp-ghost-btn" title="新增歌曲" @click="openInlineAdd">＋</button>
        <button class="sp-ghost-btn" title="匯出 ZIP" @click="exportToZIP">📤</button>
        <label class="sp-ghost-btn" title="匯入 ZIP">
          📥
          <input type="file" accept=".zip" @change="handleFileImport" style="display: none" />
        </label>
        <button
          class="sp-ghost-btn"
          :class="{ active: showLyricsPanel }"
          title="歌詞面板"
          @click="showLyricsPanel = !showLyricsPanel"
        >📝</button>
        <div class="sp-actions-spacer"></div>
        <div class="search-area">
          <RecentSearchInput
            v-model="searchQuery"
            placeholder="搜尋音樂名稱..."
            :terms="recentSearches"
            @submit="commitSearchHistory()"
            @apply="applyRecentSearch"
            @remove="removeRecentSearch"
            @clear="clearRecentSearches"
          />
        </div>
        <button v-if="!batchMode && filteredMusics.length > 0" @click="enterBatchMode" class="sp-text-btn">選取</button>
        <template v-if="batchMode">
          <label class="select-all-label"><input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" /><span>全選</span></label>
          <button @click="exitBatchMode" class="sp-text-btn">取消</button>
          <button v-if="selectedIds.size > 0" class="btn-batch-delete" @click="deleteSelected" :disabled="loading">刪除 ({{ selectedIds.size }})</button>
        </template>
      </div>

      <!-- 語言膠囊 -->
      <div v-if="languageChips.length > 1" class="sp-chips" role="tablist" aria-label="語言篩選">
        <button
          v-for="chip in languageChips"
          :key="chip.value"
          type="button"
          role="tab"
          class="sp-chip"
          :class="{ active: activeLanguage === chip.value }"
          :aria-selected="activeLanguage === chip.value"
          @click="activeLanguage = chip.value"
        >
          {{ chip.label }} <span class="sp-chip-count">{{ chip.count }}</span>
        </button>
      </div>

      <!-- 快取狀態列 -->
      <div class="cache-bar">
        <div class="cache-info">
          <span class="cache-icon">💾</span>
          <span>已快取 <strong>{{ cachedCount }}</strong> / {{ musicsWithFile.length }} 首音樂</span>
          <span v-if="totalCacheSize > 0" class="cache-size">({{ (totalCacheSize / 1024 / 1024).toFixed(1) }} MB)</span>
          <span class="cache-meter" aria-hidden="true">
            <span class="cache-meter-fill" :style="{ width: `${cachePercent}%` }"></span>
          </span>
        </div>
        <div class="cache-actions">
          <button
            v-if="cachedCount < musicsWithFile.length"
            @click="cacheAllMusics"
            class="btn-cache-all"
            :disabled="cachingMusicId !== null"
          >
            {{ cachingMusicId !== null ? '⏳ 快取中...' : '📥 全部快取' }}
          </button>
          <button
            v-if="cachedCount > 0"
            @click="clearAllMusicCache"
            class="btn-clear-cache"
          >
            🗑️ 清除快取
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading-state"><span class="sp-spinner" aria-hidden="true"></span> 載入中...</div>

      <div v-else-if="filteredMusics.length === 0 && !isAddingInline" class="empty-state">
        <span class="empty-icon" aria-hidden="true">🎧</span>
        <p v-if="searchQuery || activeLanguage !== 'all'">找不到符合的音樂記錄</p>
        <p v-else>尚無音樂記錄，點擊「＋」開始建立</p>
      </div>

      <div class="sp-body" :class="{ 'with-lyrics': showLyricsPanel }">
        <div v-if="isAddingInline || filteredMusics.length > 0" class="music-grid">

          <!-- 行內新增 -->
          <div v-if="isAddingInline" class="music-card card-editing">
            <div class="card-header">
              <input v-model="addForm.name" type="text" class="inline-input inline-name" placeholder="歌曲名稱 *" style="flex:1" />
              <div class="card-actions">
                <button class="btn-icon save" @click="saveInlineAdd" title="儲存">💾</button>
                <button class="btn-icon" @click="cancelInlineAdd" title="取消">✕</button>
              </div>
            </div>
            <div class="card-body inline-edit-content">
              <div class="inline-edit-form">
                <div class="inline-field-row">
                  <label>語言</label>
                  <div style="flex:1;display:flex;flex-direction:column;gap:0.3rem">
                    <select v-model="addLangSelect" @change="handleAddLangChange" class="inline-input">
                      <option value="">選擇語言</option>
                      <option value="中文">中文</option>
                      <option value="日語">日語</option>
                      <option value="英語">英語</option>
                      <option value="粵語">粵語</option>
                      <option value="韓語">韓語</option>
                      <option value="custom">自行輸入...</option>
                    </select>
                    <input v-if="addLangSelect === 'custom'" v-model="addForm.language" class="inline-input" placeholder="請輸入語言" />
                  </div>
                </div>
                <div class="inline-field-row"><label>分類</label><input v-model="addForm.category" type="text" class="inline-input" placeholder="分類" /></div>
                <div class="inline-field-row">
                  <label>上傳音檔</label>
                  <div style="flex:1">
                    <div class="inline-upload-row">
                      <label class="btn-inline-upload-music" :class="{ disabled: addAudioUploading }">
                        {{ addAudioUploading ? '上傳中...' : '🎵 選擇音檔' }}
                        <input type="file" accept="audio/*" multiple style="display:none" :disabled="addAudioUploading" @change="handleAddAudioUpload" />
                      </label>
                      <span v-if="addSelectedAudios.length > 0" class="inline-selected-summary">已選 {{ addSelectedAudios.length }} 首</span>
                      <button v-if="addSelectedAudios.length > 0" type="button" class="btn-inline-remove-sm" @click="clearAddSelectedAudios">✕</button>
                      <button v-else-if="addForm.file" type="button" class="btn-inline-remove-sm" @click="addForm.file = ''">✕</button>
                    </div>
                    <div v-if="addSelectedAudios.length > 0" class="inline-selected-files">
                      <span v-for="file in addSelectedAudios" :key="file.name + file.size" class="selected-file-chip">{{ file.name }}</span>
                    </div>
                    <input v-model="addForm.file" type="text" class="inline-input" placeholder="或輸入音檔 URL" style="margin-top:0.3rem" :disabled="addSelectedAudios.length > 0" />
                    <audio v-if="addSelectedAudios.length === 0 && addForm.file" controls :src="addForm.file" class="inline-audio-preview"></audio>
                  </div>
                </div>
                <div class="inline-field-row"><label>格式</label><input v-model="addForm.filetype" type="text" class="inline-input" placeholder="mp3, flac, wav..." /></div>
                <div class="inline-field-row">
                  <label>封面</label>
                  <div style="flex:1">
                    <div class="inline-upload-row">
                      <label class="btn-inline-upload-music" :class="{ disabled: addCoverUploading }">
                        {{ addCoverUploading ? '上傳中...' : '🖼️ 選擇封面' }}
                        <input type="file" accept="image/*" style="display:none" :disabled="addCoverUploading" @change="handleAddCoverUpload" />
                      </label>
                      <button v-if="addForm.cover" type="button" class="btn-inline-remove-sm" @click="addForm.cover = ''">✕</button>
                    </div>
                    <input v-model="addForm.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" style="margin-top:0.3rem" />
                    <img v-if="addForm.cover" :src="addForm.cover" alt="封面" class="inline-cover-preview" />
                  </div>
                </div>
                <div class="inline-field-row"><label>備註</label><input v-model="addForm.note" type="text" class="inline-input" placeholder="備註" /></div>
                <div class="inline-field-row"><label>歌詞</label><textarea v-model="addForm.lyrics" class="inline-input inline-textarea" rows="8" placeholder="歌詞"></textarea></div>
              </div>
            </div>
          </div>

          <!-- ══ Spotify 曲目表 ══ -->
          <div v-if="groupedMusics.length > 0" class="sp-tracklist">
            <div class="sp-track-head" aria-hidden="true">
              <span class="sp-col-index">#</span>
              <span class="sp-col-title">標題</span>
              <span class="sp-col-category">分類</span>
              <span class="sp-col-type">格式</span>
              <span class="sp-col-tools"></span>
            </div>

            <template v-for="(group, gi) in groupedMusics" :key="group.name + gi">
              <!-- 行內編輯：整列展開成表單 -->
              <div v-if="editingId === getActiveItem(group).id" class="music-card card-editing">
                <div class="card-header">
                  <input v-model="editForm.name" type="text" class="inline-input inline-name" placeholder="歌曲名稱">
                  <div class="card-actions">
                    <button class="btn-icon save" @click="saveInlineEdit" title="儲存">💾</button>
                    <button class="btn-icon" @click="cancelInlineEdit" title="取消">✕</button>
                  </div>
                </div>
                <div class="card-body inline-edit-content">
                  <div class="inline-edit-form">
                    <div class="inline-field-row">
                      <label>語言</label>
                      <div style="flex:1;display:flex;flex-direction:column;gap:0.3rem">
                        <select v-model="editLangSelect" @change="handleEditLangChange" class="inline-input">
                          <option value="">選擇語言</option>
                          <option value="中文">中文</option>
                          <option value="日語">日語</option>
                          <option value="英語">英語</option>
                          <option value="粵語">粵語</option>
                          <option value="韓語">韓語</option>
                          <option value="custom">自行輸入...</option>
                        </select>
                        <input v-if="editLangSelect === 'custom'" v-model="editForm.language" class="inline-input" placeholder="請輸入語言" />
                      </div>
                    </div>
                    <div class="inline-field-row">
                      <label>分類</label>
                      <input v-model="editForm.category" type="text" class="inline-input" placeholder="分類">
                    </div>
                    <div class="inline-field-row">
                      <label>音檔</label>
                      <div style="flex:1">
                        <div class="inline-upload-row">
                          <label class="btn-inline-upload-music" :class="{ disabled: editAudioUploading }">
                            {{ editAudioUploading ? '上傳中...' : '🎵 上傳音檔' }}
                            <input type="file" accept="audio/*" style="display:none" :disabled="editAudioUploading" @change="handleEditAudioUpload" />
                          </label>
                          <button v-if="editForm.file" type="button" class="btn-inline-remove-sm" @click="editForm.file = ''">✕</button>
                        </div>
                        <input v-model="editForm.file" type="text" class="inline-input" placeholder="或輸入音檔 URL" style="margin-top:0.3rem" />
                        <audio v-if="editForm.file" controls :src="editForm.file" class="inline-audio-preview"></audio>
                      </div>
                    </div>
                    <div class="inline-field-row">
                      <label>格式</label>
                      <input v-model="editForm.filetype" type="text" class="inline-input" placeholder="mp3, flac...">
                    </div>
                    <div class="inline-field-row">
                      <label>封面</label>
                      <div style="flex:1">
                        <div class="inline-upload-row">
                          <label class="btn-inline-upload-music" :class="{ disabled: editCoverUploading }">
                            {{ editCoverUploading ? '上傳中...' : '🖼️ 上傳封面' }}
                            <input type="file" accept="image/*" style="display:none" :disabled="editCoverUploading" @change="handleEditCoverUpload" />
                          </label>
                          <button v-if="editForm.cover" type="button" class="btn-inline-remove-sm" @click="editForm.cover = ''">✕</button>
                        </div>
                        <input v-model="editForm.cover" type="text" class="inline-input" placeholder="或輸入封面 URL" style="margin-top:0.3rem">
                        <img v-if="editForm.cover" :src="editForm.cover" alt="封面" class="inline-cover-preview" />
                      </div>
                    </div>
                    <div class="inline-field-row">
                      <label>備註</label>
                      <input v-model="editForm.note" type="text" class="inline-input" placeholder="備註">
                    </div>
                    <div class="inline-field-row">
                      <label>參考</label>
                      <input v-model="editForm.ref" type="text" class="inline-input" placeholder="參考">
                    </div>
                    <div class="inline-field-row">
                      <label>歌詞</label>
                      <textarea v-model="editForm.lyrics" class="inline-input inline-textarea" rows="8" placeholder="歌詞"></textarea>
                    </div>
                    <div class="inline-field-row">
                      <label>Hash</label>
                      <input v-model="editForm.hash" type="text" class="inline-input" placeholder="Hash">
                    </div>
                  </div>
                </div>
              </div>

              <!-- 曲目列 -->
              <div
                v-else
                class="sp-track"
                :class="{
                  'is-current': currentTrackId === getActiveItem(group).id,
                  'is-selected': group.items.some(m => selectedIds.has(m.id))
                }"
                @dblclick="playTrack(getActiveItem(group))"
              >
                <span class="sp-col-index">
                  <input
                    v-if="batchMode"
                    type="checkbox"
                    :checked="group.items.every(m => selectedIds.has(m.id))"
                    @change="toggleGroupSelect(group)"
                    class="card-checkbox"
                  />
                  <template v-else>
                    <span class="sp-index-num">{{ gi + 1 }}</span>
                    <button
                      class="sp-row-play"
                      :disabled="!getActiveItem(group).file"
                      :title="currentTrackId === getActiveItem(group).id && isPlaying ? '暫停' : '播放'"
                      @click.stop="currentTrackId === getActiveItem(group).id ? togglePlay() : playTrack(getActiveItem(group))"
                    >
                      {{ currentTrackId === getActiveItem(group).id && isPlaying ? '❚❚' : '▶' }}
                    </button>
                    <span v-if="currentTrackId === getActiveItem(group).id && isPlaying" class="sp-eq" aria-hidden="true">
                      <i></i><i></i><i></i>
                    </span>
                  </template>
                </span>

                <span class="sp-col-title">
                  <span class="sp-track-art">
                    <img v-if="getActiveItem(group).cover" :src="resolveMediaUrl(getActiveItem(group).cover)" :alt="group.name" loading="lazy" />
                    <span v-else class="sp-track-art-note">♪</span>
                  </span>
                  <span class="sp-track-copy">
                    <span class="sp-track-name">{{ group.name || '未命名' }}</span>
                    <span class="sp-track-sub">
                      <span v-if="getActiveItem(group).language" class="sp-lang">{{ getActiveItem(group).language }}</span>
                      <span v-if="getActiveItem(group).note" class="sp-note">{{ truncate(getActiveItem(group).note, 40) }}</span>
                      <span v-if="group.items.length > 1" class="sp-version-hint">{{ group.items.length }} 個語言版本</span>
                    </span>
                    <span v-if="group.items.length > 1" class="lang-chips">
                      <button
                        v-for="(item, idx) in group.items"
                        :key="item.id"
                        class="lang-chip"
                        :class="{ active: getActiveIndex(group) === idx }"
                        @click.stop="setActiveVersion(group.name, idx)"
                      >
                        {{ item.language || '未知' }}
                      </button>
                    </span>
                  </span>
                </span>

                <span class="sp-col-category">
                  <span v-if="getActiveItem(group).category" class="badge badge-category">{{ getActiveItem(group).category }}</span>
                  <span v-else class="sp-muted">—</span>
                </span>

                <span class="sp-col-type">
                  <span v-if="getActiveItem(group).filetype" class="badge badge-type">{{ getActiveItem(group).filetype.toUpperCase() }}</span>
                  <span v-else class="sp-muted">—</span>
                </span>

                <span class="sp-col-tools" @click.stop>
                  <button
                    v-if="getActiveItem(group).lyrics"
                    class="btn-icon"
                    title="歌詞"
                    @click="openLyricsFor(getActiveItem(group))"
                  >📝</button>
                  <button
                    v-if="getActiveItem(group).file && musicCache.has(getActiveItem(group).id)"
                    @click="uncacheMusic(getActiveItem(group).id)"
                    class="btn-icon btn-cached"
                    title="已快取 (點擊清除)"
                  >✅</button>
                  <button
                    v-else-if="getActiveItem(group).file"
                    @click="cacheMusicItem(getActiveItem(group))"
                    class="btn-icon"
                    :disabled="cachingMusicId === getActiveItem(group).id"
                    :title="cachingMusicId === getActiveItem(group).id ? '快取中...' : '快取音樂'"
                  >{{ cachingMusicId === getActiveItem(group).id ? '⏳' : '📥' }}</button>
                  <button @click="startInlineEdit(getActiveItem(group))" class="btn-icon" title="編輯">✎</button>
                  <button @click="deleteRecord(getActiveItem(group).id)" class="btn-icon delete" title="刪除">✕</button>
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- ══ 歌詞面板 ══ -->
        <aside v-if="showLyricsPanel" class="sp-lyrics-panel" aria-label="歌詞">
          <header class="sp-lyrics-head">
            <h2>歌詞</h2>
            <button class="btn-icon" title="關閉" @click="showLyricsPanel = false">✕</button>
          </header>
          <div v-if="currentTrack" class="sp-lyrics-track">
            <span class="sp-track-art">
              <img v-if="currentTrack.cover" :src="resolveMediaUrl(currentTrack.cover)" :alt="currentTrack.name" />
              <span v-else class="sp-track-art-note">♪</span>
            </span>
            <div>
              <strong>{{ currentTrack.name || '未命名' }}</strong>
              <span>{{ currentTrack.language || currentTrack.category || '鋒兄音樂' }}</span>
            </div>
          </div>
          <pre v-if="currentTrack && currentTrack.lyrics" class="lyrics-text">{{ currentTrack.lyrics }}</pre>
          <p v-else class="sp-lyrics-empty">這首歌還沒有歌詞。</p>
        </aside>
      </div>

      <!-- ══ Spotify 底部播放列 ══ -->
      <footer v-if="currentTrack" class="sp-player">
        <div class="sp-player-now">
          <span class="sp-player-art">
            <img v-if="currentTrack.cover" :src="resolveMediaUrl(currentTrack.cover)" :alt="currentTrack.name" />
            <span v-else class="sp-track-art-note">♪</span>
          </span>
          <span class="sp-player-copy">
            <strong>{{ currentTrack.name || '未命名' }}</strong>
            <span>{{ currentTrack.language || currentTrack.category || '鋒兄音樂' }}</span>
          </span>
          <button
            v-if="currentTrack.lyrics"
            class="btn-icon"
            title="歌詞"
            @click="showLyricsPanel = !showLyricsPanel"
          >📝</button>
        </div>

        <div class="sp-player-center">
          <div class="sp-transport">
            <button class="sp-t-btn" :class="{ active: shuffle }" title="隨機" @click="shuffle = !shuffle">🔀</button>
            <button class="sp-t-btn" title="上一首" :disabled="playableTracks.length < 2" @click="playPrevTrack">⏮</button>
            <button class="sp-t-btn sp-t-btn--play" :title="isPlaying ? '暫停' : '播放'" @click="togglePlay">
              {{ isPlaying ? '❚❚' : '▶' }}
            </button>
            <button class="sp-t-btn" title="下一首" :disabled="playableTracks.length < 2" @click="playNextTrack">⏭</button>
            <button class="sp-t-btn" :class="{ active: repeat }" title="循環" @click="repeat = !repeat">🔁</button>
          </div>
          <div class="sp-scrub">
            <span class="sp-time">{{ formatTime(playerCurrentTime) }}</span>
            <input
              class="sp-progress"
              type="range"
              min="0"
              :max="Math.max(playerDuration, 0.1)"
              step="0.1"
              :value="playerCurrentTime"
              :style="{ '--played': `${playedPercent}%` }"
              aria-label="播放進度"
              @input="seekTo($event.target.value)"
            />
            <span class="sp-time">{{ formatTime(playerDuration) }}</span>
          </div>
        </div>

        <div class="sp-player-right">
          <button class="sp-t-btn" :title="isMuted ? '取消靜音' : '靜音'" @click="toggleMute">
            {{ isMuted || volume === 0 ? '🔇' : volume < 0.45 ? '🔉' : '🔊' }}
          </button>
          <input
            class="sp-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="isMuted ? 0 : volume"
            aria-label="音量"
            @input="setVolume($event.target.value)"
          />
        </div>

        <audio
          ref="playerAudioRef"
          class="audio-player sp-audio"
          :src="currentTrack.file ? getAudioSrc(currentTrack) : ''"
          @play="onPlayerPlay"
          @pause="onPlayerPause"
          @timeupdate="onPlayerTimeUpdate"
          @loadedmetadata="onPlayerLoaded"
          @volumechange="onPlayerVolumeChange"
          @ended="onPlayerEnded"
        ></audio>
      </footer>

      <!-- 匯入進度 Overlay -->
      <div v-if="importProgress.active" class="import-overlay">
        <div class="import-modal">
          <div class="import-spinner"></div>
          <h3 class="import-title">{{ importProgress.title }}</h3>
          <p class="import-step">{{ importProgress.step }}</p>
          <div class="import-progress-bar">
            <div class="import-progress-fill" :style="{ width: importProgress.percent + '%' }"></div>
          </div>
          <p class="import-percent">{{ importProgress.current }} / {{ importProgress.total }}（{{ importProgress.percent }}%）</p>
          <p v-if="importProgress.itemName" class="import-item-name">{{ importProgress.itemName }}</p>
          <div v-if="importProgress.stats" class="import-stats">
            <span v-if="importProgress.stats.musicOk > 0" class="stat-tag stat-ok">🎵 {{ importProgress.stats.musicOk }}</span>
            <span v-if="importProgress.stats.lyricsOk > 0" class="stat-tag stat-ok">📝 {{ importProgress.stats.lyricsOk }}</span>
            <span v-if="importProgress.stats.coverOk > 0" class="stat-tag stat-ok">🖼️ {{ importProgress.stats.coverOk }}</span>
            <span v-if="importProgress.stats.fail > 0" class="stat-tag stat-fail">❌ {{ importProgress.stats.fail }}</span>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>{{ editingMusic ? '編輯音樂' : '新增音樂' }}</h2>
            <button @click="closeModal" class="btn-close">✕</button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveMusic">
              <div class="form-group">
                <label>名稱</label>
                <input v-model="formData.name" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>上傳音樂檔案</label>
                <div class="upload-area">
                  <input
                    ref="audioFileInput"
                    type="file"
                    accept="audio/*"
                    multiple
                    @change="handleAudioUpload"
                    style="display: none"
                  />
                  <button type="button" @click="$refs.audioFileInput.click()" class="btn-upload" :disabled="uploading">
                    {{ uploading ? '上傳中...' : '選擇檔案' }}
                  </button>
                  <span v-if="uploadProgress > 0" class="upload-progress">{{ uploadProgress }}%</span>
                </div>
                <div v-if="modalSelectedAudios.length > 0" class="inline-selected-files" style="margin-top:0.5rem">
                  <span v-for="file in modalSelectedAudios" :key="file.name + file.size" class="selected-file-chip">{{ file.name }}</span>
                </div>
                <div v-if="formData.file" class="file-preview">
                  <audio controls :src="formData.file" class="audio-preview"></audio>
                  <button type="button" @click="removeAudio" class="btn-remove">移除</button>
                </div>
              </div>
              <div class="form-group">
                <label>檔案路徑 (或自動上傳)</label>
                <input v-model="formData.file" type="text" class="form-input" placeholder="自動填入或手動輸入" :disabled="modalSelectedAudios.length > 0" />
              </div>
              <div class="form-group">
                <label>檔案格式</label>
                <input v-model="formData.filetype" type="text" class="form-input" placeholder="例如: mp3, flac, wav" />
              </div>
              <div class="form-group">
                <label>歌詞</label>
                <textarea v-model="formData.lyrics" class="form-textarea" rows="4" placeholder="輸入歌詞內容..."></textarea>
              </div>
              <div class="form-group">
                <label>語言</label>
                <select v-model="languageSelect" @change="handleLanguageChange" class="form-input">
                  <option value="">選擇語言</option>
                  <option value="中文">中文</option>
                  <option value="英語">英語</option>
                  <option value="日語">日語</option>
                  <option value="韓語">韓語</option>
                  <option value="粵語">粵語</option>
                  <option value="custom">自訂...</option>
                </select>
                <input
                  v-if="languageSelect === 'custom'"
                  v-model="formData.language"
                  type="text"
                  class="form-input"
                  placeholder="輸入自訂語言"
                  style="margin-top: 0.5rem"
                />
              </div>
              <div class="form-group">
                <label>備註</label>
                <input v-model="formData.note" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>參考</label>
                <input v-model="formData.ref" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>分類</label>
                <input v-model="formData.category" type="text" class="form-input" />
              </div>
              <div class="form-group">
                <label>Hash</label>
                <input v-model="formData.hash" type="text" class="form-input" />
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
                <input v-model="formData.cover" type="text" class="form-input" placeholder="或輸入封面 URL" />
              </div>
              <div class="modal-actions">
                <button type="button" @click="closeModal" class="btn-cancel">
                  取消
                </button>
                <button type="submit" class="btn-save">儲存</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, reactive, nextTick } from 'vue'
import { useHead } from '#app'
import PageContainer from '../layout/PageContainer.vue'
import { useMusicRecords } from '../../composables/useMusicRecords'
import { useStorage } from '../../composables/useStorage'
import { usePersistentAudioPlayer } from '../../composables/usePersistentAudioPlayer'
import { useRecentSearchHistory } from '../../composables/useRecentSearchHistory'
import RecentSearchInput from '../ui/RecentSearchInput.vue'
import { recordMediaTraffic } from '../../utils/mediaTraffic'

useHead({
  title: '鋒兄音樂 - 鋒兄AI Supabase'
})

const { musics, loading, FIELDS, loadMusics, addMusic, updateMusic, deleteMusic, importMusics } = useMusicRecords()
const { uploading, uploadProgress, uploadFile, getPublicUrl } = useStorage()

const resolveMediaUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value
  return getPublicUrl(value) || value
}
const {
  currentTrack: persistentTrack,
  pauseGlobal,
  snapshotFromElement,
  takeoverFromElement,
  restoreToElement,
  releaseLocalSession
} = usePersistentAudioPlayer()

// 行內編輯
const editingId = ref(null)
const editForm = reactive({})

// 語言選擇
const PRESET_LANGS = ['中文', '日語', '英語', '粵語', '韓語']
const addLangSelect = ref('')
const editLangSelect = ref('')

const handleAddLangChange = () => {
  if (addLangSelect.value !== 'custom') {
    addForm.value.language = addLangSelect.value
  } else {
    addForm.value.language = ''
  }
}

const handleEditLangChange = () => {
  if (editLangSelect.value !== 'custom') {
    editForm.language = editLangSelect.value
  } else {
    editForm.language = ''
  }
}

const startInlineEdit = (music) => {
  const lang = music.language || ''
  editLangSelect.value = PRESET_LANGS.includes(lang) ? lang : (lang ? 'custom' : '')
  Object.assign(editForm, {
    id: music.id,
    name: music.name || '',
    file: music.file || '',
    filetype: music.filetype || '',
    lyrics: music.lyrics || '',
    note: music.note || '',
    ref: music.ref || '',
    category: music.category || '',
    hash: music.hash || '',
    language: music.language || '',
    cover: music.cover || ''
  })
  editingId.value = music.id
}

const cancelInlineEdit = () => {
  editingId.value = null
}

const saveInlineEdit = async () => {
  if (!editForm.name) {
    alert('請輸入歌曲名稱')
    return
  }
  try {
    await updateMusic(editForm.id, { ...editForm })
    editingId.value = null
    await loadMusics()
  } catch (error) {
    console.error('Inline edit save error:', error)
    alert('儲存失敗: ' + error.message)
  }
}

const searchQuery = ref('')
const {
  recentSearches,
  commitSearchHistory,
  applyRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} = useRecentSearchHistory('fengbro-music-search-history', searchQuery)
const showModal = ref(false)
const editingMusic = ref(null)
const audioFileInput = ref(null)
const coverFileInput = ref(null)
const modalSelectedAudios = ref([])
const coverUploading = ref(false)
const languageSelect = ref('')
const formData = ref({
  name: '',
  file: '',
  filetype: '',
  lyrics: '',
  note: '',
  ref: '',
  category: '',
  hash: '',
  language: '',
  cover: ''
})

// Batch mode state
const batchMode = ref(false)
const selectedIds = ref(new Set())

const enterBatchMode = () => {
  batchMode.value = true
  selectedIds.value.clear()
}

const exitBatchMode = () => {
  batchMode.value = false
  selectedIds.value.clear()
}

const toggleSelect = (id) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

const isAllSelected = computed(() => {
  return filteredMusics.value.length > 0 &&
         filteredMusics.value.every(m => selectedIds.value.has(m.id))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value.clear()
  } else {
    filteredMusics.value.forEach(m => selectedIds.value.add(m.id))
  }
}

const deleteSelected = async () => {
  const count = selectedIds.value.size
  if (count === 0) return

  const isFullDelete = count === musics.value.length
  const confirmText = isFullDelete
    ? `確定要刪除全部 ${count} 個項目嗎？這將清空整個資料表！\n\n請輸入「DELETE music」確認：`
    : `確定要刪除選中的 ${count} 個項目嗎？`

  if (isFullDelete) {
    const userInput = prompt(confirmText)
    if (userInput !== 'DELETE music') {
      alert('確認文字不正確，已取消刪除')
      return
    }
  } else {
    if (!confirm(confirmText)) return
  }

  try {
    const idsToDelete = Array.from(selectedIds.value)
    for (const id of idsToDelete) {
      await deleteMusic(id)
    }
    await loadMusics()
    exitBatchMode()
    alert(`成功刪除 ${count} 個項目`)
  } catch (error) {
    console.error('Error deleting selected:', error)
    alert('批量刪除失敗: ' + error.message)
  }
}

const activeLanguage = ref('all')

const filteredMusics = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const lang = activeLanguage.value
  return musics.value.filter((music) => {
    if (query && !music.name?.toLowerCase().includes(query)) return false
    if (lang === 'all') return true
    if (lang === '__unknown__') return !music.language
    return music.language === lang
  })
})

/** Spotify 式語言膠囊 */
const languageChips = computed(() => {
  const counts = new Map()
  let unknown = 0
  musics.value.forEach((music) => {
    if (music.language) counts.set(music.language, (counts.get(music.language) || 0) + 1)
    else unknown += 1
  })
  const chips = [{ value: 'all', label: '全部', count: musics.value.length }]
  Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([label, count]) => chips.push({ value: label, label, count }))
  if (unknown > 0) chips.push({ value: '__unknown__', label: '未標語言', count: unknown })
  return chips
})

// 按歌曲名稱分組
const groupedMusics = computed(() => {
  const map = new Map()
  for (const music of filteredMusics.value) {
    const key = (music.name || '').trim().toLowerCase()
    if (!map.has(key)) {
      map.set(key, { name: music.name || '未命名', items: [] })
    }
    map.get(key).items.push(music)
  }
  return Array.from(map.values())
})

// 每個 group 目前選中的版本 index
const activeVersionMap = ref(new Map())

function getActiveIndex(group) {
  const key = (group.name || '').trim().toLowerCase()
  return activeVersionMap.value.get(key) || 0
}

function getActiveItem(group) {
  const idx = getActiveIndex(group)
  return group.items[idx] || group.items[0]
}

function setActiveVersion(groupName, idx) {
  const key = (groupName || '').trim().toLowerCase()
  activeVersionMap.value.set(key, idx)
  activeVersionMap.value = new Map(activeVersionMap.value) // trigger reactivity
}

function toggleGroupSelect(group) {
  const allSelected = group.items.every(m => selectedIds.value.has(m.id))
  if (allSelected) {
    group.items.forEach(m => selectedIds.value.delete(m.id))
  } else {
    group.items.forEach(m => selectedIds.value.add(m.id))
  }
}

// 匯入進度狀態
const importProgress = ref({
  active: false,
  title: '',
  step: '',
  current: 0,
  total: 0,
  percent: 0,
  itemName: '',
  stats: null
})

function updateImportProgress(fields) {
  Object.assign(importProgress.value, fields)
  if (fields.current !== undefined && importProgress.value.total > 0) {
    importProgress.value.percent = Math.round((fields.current / importProgress.value.total) * 100)
  }
}

function resetImportProgress() {
  importProgress.value = {
    active: false, title: '', step: '', current: 0, total: 0, percent: 0, itemName: '', stats: null
  }
}

// 音樂快取
const musicCache = ref(new Map()) // id -> { blobUrl, size }
const cachingMusicId = ref(null)
const totalCacheSize = ref(0)
const audioElementRefs = new Map()

const musicsWithFile = computed(() => musics.value.filter(m => m.file))
const cachedCount = computed(() => musicCache.value.size)
const cachePercent = computed(() => {
  const total = musicsWithFile.value.length
  if (!total) return 0
  return Math.min(100, Math.round((cachedCount.value / total) * 100))
})

/* ══════════ Spotify 式單一播放器 ══════════ */
const playerAudioRef = ref(null)
const currentTrackId = ref(null)
const isPlaying = ref(false)
const playerCurrentTime = ref(0)
const playerDuration = ref(0)
const volume = ref(1)
const isMuted = ref(false)
const shuffle = ref(false)
const repeat = ref(false)
const showLyricsPanel = ref(false)

/** 目前歌單（每組取選中的語言版本，且必須有音檔） */
const playableTracks = computed(() =>
  groupedMusics.value.map((group) => getActiveItem(group)).filter((music) => music && music.file)
)

const currentTrack = computed(() =>
  musics.value.find((music) => music.id === currentTrackId.value) || null
)

const playedPercent = computed(() => {
  if (!playerDuration.value) return 0
  return Math.min(100, (playerCurrentTime.value / playerDuration.value) * 100)
})

const heroCover = computed(() => {
  const withCover = musics.value.find((music) => music.cover)
  return withCover ? resolveMediaUrl(withCover.cover) : ''
})

function formatTime(seconds) {
  const total = Number(seconds)
  if (!Number.isFinite(total) || total < 0) return '0:00'
  const mins = Math.floor(total / 60)
  const secs = Math.floor(total % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

async function playTrack(music) {
  if (!music?.file) return
  if (currentTrackId.value !== music.id) {
    currentTrackId.value = music.id
    playerCurrentTime.value = 0
    playerDuration.value = 0
    await nextTick()
  }
  const element = playerAudioRef.value
  if (!element) return
  try {
    element.volume = isMuted.value ? 0 : volume.value
    await element.play()
  } catch (err) {
    console.error('播放失敗:', err)
  }
}

function playAll() {
  const first = playableTracks.value[0]
  if (first) playTrack(first)
}

async function togglePlay() {
  const element = playerAudioRef.value
  if (!element) {
    playAll()
    return
  }
  if (element.paused) {
    try { await element.play() } catch (err) { console.error('播放失敗:', err) }
  } else {
    element.pause()
  }
}

function pickNextIndex(step) {
  const list = playableTracks.value
  if (list.length === 0) return -1
  const index = list.findIndex((music) => music.id === currentTrackId.value)
  if (shuffle.value && list.length > 1) {
    let next = index
    while (next === index) next = Math.floor(Math.random() * list.length)
    return next
  }
  if (index < 0) return 0
  return (index + step + list.length) % list.length
}

function playNextTrack() {
  const next = pickNextIndex(1)
  if (next >= 0) playTrack(playableTracks.value[next])
}

function playPrevTrack() {
  const prev = pickNextIndex(-1)
  if (prev >= 0) playTrack(playableTracks.value[prev])
}

function seekTo(value) {
  const element = playerAudioRef.value
  const time = Number(value)
  if (!element || !Number.isFinite(time)) return
  element.currentTime = time
  playerCurrentTime.value = time
}

function setVolume(value) {
  const next = Math.min(1, Math.max(0, Number(value) || 0))
  volume.value = next
  isMuted.value = next === 0
  if (playerAudioRef.value) {
    playerAudioRef.value.volume = next
    playerAudioRef.value.muted = next === 0
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (playerAudioRef.value) {
    playerAudioRef.value.muted = isMuted.value
    if (!isMuted.value && volume.value === 0) {
      volume.value = 0.6
      playerAudioRef.value.volume = 0.6
    }
  }
}

/** 從曲目列開啟歌詞面板（載入該曲但不自動播放） */
function openLyricsFor(music) {
  if (!music) return
  if (music.file) currentTrackId.value = music.id
  else expandedLyrics.value = new Set([...expandedLyrics.value, music.id])
  showLyricsPanel.value = true
}

async function onPlayerPlay(event) {
  isPlaying.value = true
  const music = currentTrack.value
  if (!music) return
  if (!persistentTrack.value || persistentTrack.value.id !== music.id) {
    pauseGlobal()
  }
  await restoreToElement(event.target, getTrackMeta(music))
  snapshotFromElement(event.target, getTrackMeta(music), { playing: true })
}

function onPlayerPause(event) {
  isPlaying.value = false
  const music = currentTrack.value
  if (!music) return
  if (!persistentTrack.value || persistentTrack.value.id !== music.id) return
  snapshotFromElement(event.target, getTrackMeta(music), { playing: false })
}

function onPlayerTimeUpdate(event) {
  playerCurrentTime.value = event.target.currentTime || 0
  const music = currentTrack.value
  if (!music) return
  if (!persistentTrack.value || persistentTrack.value.id !== music.id) return
  snapshotFromElement(event.target, getTrackMeta(music), { playing: !event.target.paused })
}

function onPlayerLoaded(event) {
  playerDuration.value = event.target.duration || 0
  event.target.volume = isMuted.value ? 0 : volume.value
}

function onPlayerVolumeChange(event) {
  volume.value = event.target.volume
  isMuted.value = event.target.muted || event.target.volume === 0
}

function onPlayerEnded() {
  if (repeat.value) {
    const element = playerAudioRef.value
    if (element) {
      element.currentTime = 0
      element.play().catch(() => {})
      return
    }
  }
  if (playableTracks.value.length > 1) {
    playNextTrack()
  } else {
    isPlaying.value = false
  }
}

function getAudioSrc(music) {
  const cached = musicCache.value.get(music.id)
  if (cached) return cached.blobUrl
  return resolveMediaUrl(music.file)
}

function setAudioElementRef(id, element) {
  if (element) {
    audioElementRefs.set(id, element)
  } else {
    audioElementRefs.delete(id)
  }
}

function getTrackMeta(music) {
  return {
    id: music.id,
    name: music.name || '未命名音樂',
    src: getAudioSrc(music),
    cover: resolveMediaUrl(music.cover || ''),
    meta: music.language || music.category || ''
  }
}

async function cacheMusicItem(music) {
  if (!music.file || musicCache.value.has(music.id)) return
  cachingMusicId.value = music.id
  try {
    const response = await fetch(resolveMediaUrl(music.file))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    recordMediaTraffic({ bytes: blob.size, category: 'music', action: 'playback' })
    const blobUrl = URL.createObjectURL(blob)
    musicCache.value.set(music.id, { blobUrl, size: blob.size, name: music.name })
    totalCacheSize.value += blob.size
    musicCache.value = new Map(musicCache.value)
    console.log(`✅ 快取成功: ${music.name} (${(blob.size / 1024 / 1024).toFixed(1)} MB)`)
  } catch (err) {
    console.error(`快取失敗: ${music.name}`, err)
    alert(`快取失敗: ${err.message}`)
  } finally {
    cachingMusicId.value = null
  }
}

function uncacheMusic(musicId) {
  const cached = musicCache.value.get(musicId)
  if (cached) {
    URL.revokeObjectURL(cached.blobUrl)
    totalCacheSize.value -= cached.size
    musicCache.value.delete(musicId)
    musicCache.value = new Map(musicCache.value)
  }
}

async function cacheAllMusics() {
  const uncached = musicsWithFile.value.filter(m => !musicCache.value.has(m.id))
  if (uncached.length === 0) { alert('所有音樂已快取'); return }
  if (!confirm(`確定要快取 ${uncached.length} 首音樂？`)) return
  for (const music of uncached) {
    await cacheMusicItem(music)
  }
  alert(`快取完成！共 ${musicCache.value.size} 首 (${(totalCacheSize.value / 1024 / 1024).toFixed(1)} MB)`)
}

function clearAllMusicCache() {
  if (!confirm('確定要清除所有音樂快取？')) return
  for (const [, cached] of musicCache.value) {
    URL.revokeObjectURL(cached.blobUrl)
  }
  musicCache.value = new Map()
  totalCacheSize.value = 0
}

const pauseOthers = (event) => {
  document.querySelectorAll('.audio-player').forEach(audio => {
    if (audio !== event.target) audio.pause()
  })
}

const handleTrackPlay = async (event, music) => {
  const element = event.target
  pauseOthers(event)

  if (!persistentTrack.value || persistentTrack.value.id !== music.id) {
    pauseGlobal()
  }

  await restoreToElement(element, getTrackMeta(music))
  snapshotFromElement(element, getTrackMeta(music), { playing: true })
}

const handleTrackPause = (event, music) => {
  // Only sync pause for the active session — ignore pauseOthers side-effects
  // and never open the floating bar from a non-active track.
  if (!persistentTrack.value || persistentTrack.value.id !== music.id) return
  snapshotFromElement(event.target, getTrackMeta(music), { playing: false })
}

const handleTrackProgress = (event, music) => {
  // Avoid loadedmetadata / unrelated tracks setting a floating session.
  if (!persistentTrack.value || persistentTrack.value.id !== music.id) return
  snapshotFromElement(event.target, getTrackMeta(music), { playing: !event.target.paused })
}

// 歌詞展開/收合
const expandedLyrics = ref(new Set())
const toggleLyrics = (id) => {
  const s = new Set(expandedLyrics.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedLyrics.value = s
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// 行內新增
const isAddingInline = ref(false)
const addForm = ref({ name: '', file: '', filetype: '', lyrics: '', note: '', ref: '', category: '', hash: '', language: '', cover: '' })
const addSelectedAudios = ref([])
const getFileBaseName = (fileName = '') => fileName.replace(/\.[^.]+$/, '')
const getFileExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || ''
const resetInlineAddForm = () => {
  addForm.value = { name: '', file: '', filetype: '', lyrics: '', note: '', ref: '', category: '', hash: '', language: '', cover: '' }
  addSelectedAudios.value = []
  addLangSelect.value = ''
}
const openInlineAdd = () => {
  resetInlineAddForm()
  isAddingInline.value = true
}
const cancelInlineAdd = () => {
  resetInlineAddForm()
  isAddingInline.value = false
}
const clearAddSelectedAudios = () => {
  addSelectedAudios.value = []
}
const saveInlineAdd = async () => {
  if (addSelectedAudios.value.length > 0) {
    addAudioUploading.value = true
    try {
      const records = []
      for (const file of addSelectedAudios.value) {
        const result = await uploadFile(file, 'music')
        if (!result.success) throw new Error(`${file.name}: ${result.error}`)
        records.push({
          name: addSelectedAudios.value.length === 1 && addForm.value.name ? addForm.value.name : getFileBaseName(file.name),
          file: result.url,
          filetype: addForm.value.filetype || getFileExtension(file.name),
          lyrics: addForm.value.lyrics,
          note: addForm.value.note,
          ref: addForm.value.ref,
          category: addForm.value.category,
          hash: addForm.value.hash,
          language: addForm.value.language,
          cover: addForm.value.cover
        })
      }
      const result = await importMusics(records)
      if (!result.success) throw new Error(result.error || '匯入失敗')
      resetInlineAddForm()
      isAddingInline.value = false
      await loadMusics()
    } catch(e) {
      alert('批次上傳失敗: ' + e.message)
    } finally {
      addAudioUploading.value = false
    }
    return
  }

  if (!addForm.value.name) { alert('請輸入歌曲名稱'); return }
  try { await addMusic(addForm.value); resetInlineAddForm(); isAddingInline.value = false; await loadMusics() } catch(e) { alert('新增失敗: ' + e.message) }
}

// 行內新增上傳狀態
const addAudioUploading = ref(false)
const addCoverUploading = ref(false)

const handleAddAudioUpload = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  addSelectedAudios.value = files
  addForm.value.file = ''
  if (files.length === 1) {
    const file = files[0]
    if (!addForm.value.filetype) addForm.value.filetype = getFileExtension(file.name)
    if (!addForm.value.name) addForm.value.name = getFileBaseName(file.name)
  }
  if (event.target) event.target.value = ''
}

const handleAddCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  addCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'music-covers')
    if (result.success) {
      addForm.value.cover = result.url
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('封面上傳失敗: ' + err.message)
  } finally {
    addCoverUploading.value = false
    if (event.target) event.target.value = ''
  }
}

// 行內編輯上傳狀態
const editAudioUploading = ref(false)
const editCoverUploading = ref(false)

const handleEditAudioUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  editAudioUploading.value = true
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const result = await uploadFile(file, 'music')
    if (result.success) {
      editForm.file = result.url
      if (!editForm.filetype) editForm.filetype = ext
    } else {
      alert('音檔上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('音檔上傳失敗: ' + err.message)
  } finally {
    editAudioUploading.value = false
    if (event.target) event.target.value = ''
  }
}

const handleEditCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  editCoverUploading.value = true
  try {
    const result = await uploadFile(file, 'music-covers')
    if (result.success) {
      editForm.cover = result.url
    } else {
      alert('封面上傳失敗: ' + result.error)
    }
  } catch (err) {
    alert('封面上傳失敗: ' + err.message)
  } finally {
    editCoverUploading.value = false
    if (event.target) event.target.value = ''
  }
}

const openAddModal = () => {
  editingMusic.value = null
  formData.value = { name: '', file: '', filetype: '', lyrics: '', note: '', ref: '', category: '', hash: '', language: '', cover: '' }
  modalSelectedAudios.value = []
  showModal.value = true
}

const openEditModal = (music) => {
  editingMusic.value = music
  formData.value = {
    name: music.name || '',
    file: music.file || '',
    filetype: music.filetype || '',
    lyrics: music.lyrics || '',
    note: music.note || '',
    ref: music.ref || '',
    category: music.category || '',
    hash: music.hash || '',
    language: music.language || '',
    cover: music.cover || ''
  }
  // Set language select
  const predefinedLanguages = ['中文', '英語', '日語', '韓語', '粵語']
  if (predefinedLanguages.includes(music.language)) {
    languageSelect.value = music.language
  } else if (music.language) {
    languageSelect.value = 'custom'
  } else {
    languageSelect.value = ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingMusic.value = null
  languageSelect.value = ''
  modalSelectedAudios.value = []
}

// Audio upload handler
const handleAudioUpload = (event) => {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return
  modalSelectedAudios.value = files
  formData.value.file = ''
  if (files.length === 1) {
    const file = files[0]
    formData.value.filetype = getFileExtension(file.name)
    if (!formData.value.name) {
      formData.value.name = getFileBaseName(file.name)
    }
  }
}

// Remove audio
const removeAudio = () => {
  formData.value.file = ''
  formData.value.filetype = ''
  modalSelectedAudios.value = []
  if (audioFileInput.value) {
    audioFileInput.value.value = ''
  }
}

// Cover upload handler
const handleCoverUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  coverUploading.value = true
  try {
    const result = await uploadFile(file, 'music-covers')
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

// Remove cover
const removeCover = () => {
  formData.value.cover = ''
  if (coverFileInput.value) {
    coverFileInput.value.value = ''
  }
}

// Language change handler
const handleLanguageChange = () => {
  if (languageSelect.value !== 'custom') {
    formData.value.language = languageSelect.value
  }
}

const saveMusic = async () => {
  try {
    if (!editingMusic.value && modalSelectedAudios.value.length > 0) {
      const records = []
      for (const file of modalSelectedAudios.value) {
        const result = await uploadFile(file, 'music')
        if (!result.success) throw new Error(`${file.name}: ${result.error}`)
        records.push({
          name: modalSelectedAudios.value.length === 1 && formData.value.name ? formData.value.name : getFileBaseName(file.name),
          file: result.url,
          filetype: formData.value.filetype || getFileExtension(file.name),
          lyrics: formData.value.lyrics,
          note: formData.value.note,
          ref: formData.value.ref,
          category: formData.value.category,
          hash: formData.value.hash,
          language: formData.value.language,
          cover: formData.value.cover
        })
      }
      const result = await importMusics(records)
      if (!result.success) throw new Error(result.error || '匯入失敗')
    } else if (editingMusic.value) {
      await updateMusic(editingMusic.value.id, formData.value)
    } else {
      await addMusic(formData.value)
    }
    closeModal()
    await loadMusics()
  } catch (error) {
    console.error('Error saving music:', error)
    alert('儲存失敗: ' + error.message)
  }
}

const deleteRecord = async (id) => {
  if (!confirm('確定要刪除此音樂記錄嗎？')) return
  try {
    await deleteMusic(id)
    await loadMusics()
  } catch (error) {
    console.error('Error deleting music:', error)
    alert('刪除失敗: ' + error.message)
  }
}

const exportToZIP = async () => {
  if (musics.value.length === 0) {
    alert('沒有資料可以匯出')
    return
  }

  try {
    updateImportProgress({
      active: true,
      title: '📦 匯出 ZIP 中...',
      step: '打包音樂檔案',
      current: 0,
      total: musics.value.length,
      stats: null,
      itemName: ''
    })
    const { exportRecordsAsMediaZip } = await import('../../utils/zipMediaBundle')
    const stats = await exportRecordsAsMediaZip({
      records: musics.value,
      jsonFileName: 'music.json',
      downloadName: 'supabase-music.zip',
      mediaMap: {
        file: { folder: 'music', fallbackExt: 'mp3' },
        cover: { folder: 'covers', fallbackExt: 'jpg' }
      },
      resolveUrl: resolveMediaUrl,
      onProgress: ({ stage, current, total, percent, stats: packStats }) => {
        if (stage === 'media') {
          updateImportProgress({
            step: '打包音樂檔案',
            current: current || 0,
            total: total || musics.value.length,
            itemName: `成功 ${packStats?.ok || 0} / 失敗 ${packStats?.fail || 0}`
          })
        } else {
          updateImportProgress({
            step: '壓縮 ZIP',
            current: musics.value.length,
            total: musics.value.length,
            itemName: `${percent || 0}%`
          })
        }
      }
    })
    resetImportProgress()
    alert(`匯出成功！\n媒體成功 ${stats.ok}，失敗 ${stats.fail}，略過 ${stats.skipped}`)
  } catch (error) {
    resetImportProgress()
    console.error('Error exporting ZIP:', error)
    alert('匯出失敗：' + error.message)
  }
}

// CSV Parser
const parseMusicCsv = (text) => {
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

// ZIP Import — 相容 supabase (music.json) 及 appwrite-music.zip (music.csv + music/ + lyrics/ + covers/)
const handleFileImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    updateImportProgress({ active: true, title: '📦 正在解壓 ZIP...', step: '讀取檔案中', current: 0, total: 1, stats: null, itemName: file.name })

    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(file)

    // 偵測格式：Appwrite (music.csv) vs Supabase (music.json)
    const csvFile = zip.file('music.csv')
    const jsonFile = zip.file('music.json')

    let records = []

    if (csvFile) {
      // ===== Appwrite 格式：music.csv + music/ + lyrics/ + covers/ =====
      updateImportProgress({ step: '解析 CSV...', itemName: 'music.csv' })
      const csvText = await csvFile.async('text')
      const cleanText = csvText.replace(/^\uFEFF/, '')
      const parsed = parseMusicCsv(cleanText)

      if (parsed.length === 0) {
        resetImportProgress()
        alert('CSV 檔案無有效資料')
        return
      }

      resetImportProgress()
      const confirmMsg = `ℹ️ 偵測到 Appwrite music.zip 格式\n\n共 ${parsed.length} 筆音樂\n系統將自動上傳音樂檔案、封面至 Supabase Storage，並讀取歌詞\n\n確定匯入？`
      if (!confirm(confirmMsg)) return

      updateImportProgress({
        active: true,
        title: '🎵 匯入音樂中...',
        step: '準備上傳',
        current: 0,
        total: parsed.length,
        stats: { musicOk: 0, lyricsOk: 0, coverOk: 0, fail: 0 },
        itemName: ''
      })

      const { uploadFile: uploadToStorage } = useStorage()
      const stats = { musicOk: 0, lyricsOk: 0, coverOk: 0, fail: 0 }

      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        const mapped = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('$')) continue
          mapped[key] = value
        }

        const itemLabel = mapped.name || `第 ${i + 1} 筆`
        updateImportProgress({ current: i + 1, itemName: itemLabel })

        // 上傳音樂檔案 (music/ 資料夾)
        const musicPath = mapped.file
        if (musicPath && musicPath.startsWith('music/')) {
          updateImportProgress({ step: `🎵 上傳音樂 ${i + 1}/${parsed.length}` })
          const zipEntry = zip.file(musicPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = musicPath.split('/').pop() || `music_${i}.mp3`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'mp3'
              const mimeMap = { mp3: 'audio/mpeg', flac: 'audio/flac', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', wma: 'audio/x-ms-wma' }
              const fileObj = new window.File([blob], fileName, { type: mimeMap[ext] || `audio/${ext}` })
              const uploadResult = await uploadToStorage(fileObj, 'music')
              if (uploadResult.success) {
                mapped.file = uploadResult.url
                if (!mapped.filetype) mapped.filetype = ext
                stats.musicOk++
              } else {
                console.warn(`上傳音樂失敗 (${mapped.name}):`, uploadResult.error)
                mapped.file = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳音樂失敗 (${mapped.name}):`, err)
              mapped.file = ''
              stats.fail++
            }
          } else {
            mapped.file = ''
          }
        }

        // 讀取歌詞檔案 (lyrics/ 資料夾)
        const lyricsPath = mapped.lyrics
        if (lyricsPath && lyricsPath.startsWith('lyrics/')) {
          updateImportProgress({ step: `📝 讀取歌詞 ${i + 1}/${parsed.length}` })
          const zipEntry = zip.file(lyricsPath)
          if (zipEntry) {
            try {
              mapped.lyrics = await zipEntry.async('text')
              stats.lyricsOk++
            } catch (err) {
              console.warn(`讀取歌詞失敗 (${mapped.name}):`, err)
              mapped.lyrics = ''
            }
          } else {
            mapped.lyrics = ''
          }
        }

        // 上傳封面圖 (covers/ 資料夾)
        const coverPath = mapped.cover
        if (coverPath && coverPath.startsWith('covers/')) {
          updateImportProgress({ step: `🖼️ 上傳封面 ${i + 1}/${parsed.length}` })
          const zipEntry = zip.file(coverPath)
          if (zipEntry) {
            try {
              const blob = await zipEntry.async('blob')
              const fileName = coverPath.split('/').pop() || `cover_${i}.jpg`
              const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
              const fileObj = new window.File([blob], fileName, { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
              const uploadResult = await uploadToStorage(fileObj, 'music-covers')
              if (uploadResult.success) {
                mapped.cover = uploadResult.url
                stats.coverOk++
              } else {
                console.warn(`上傳封面失敗 (${mapped.name}):`, uploadResult.error)
                mapped.cover = ''
                stats.fail++
              }
            } catch (err) {
              console.warn(`上傳封面失敗 (${mapped.name}):`, err)
              mapped.cover = ''
              stats.fail++
            }
          } else {
            mapped.cover = ''
          }
        }

        updateImportProgress({ stats: { ...stats } })
        records.push(mapped)
      }

    } else if (jsonFile) {
      // ===== Supabase 格式：music.json（可含 music/、covers/ 媒體）=====
      updateImportProgress({ step: '解析 JSON...', itemName: 'music.json' })
      const jsonText = await jsonFile.async('text')
      const jsonData = JSON.parse(jsonText)

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        resetImportProgress()
        alert('JSON 檔案格式錯誤或無資料')
        return
      }

      records = jsonData.map(record => {
        const { id, created_at, updated_at, ...rest } = record
        return rest
      })

      resetImportProgress()
      if (!confirm(`確定要匯入 ${records.length} 筆音樂記錄嗎？\n若 ZIP 內含音檔/封面，會自動上傳。`)) return

      updateImportProgress({
        active: true,
        title: '🎵 匯入音樂中...',
        step: '上傳媒體',
        current: 0,
        total: records.length,
        stats: null,
        itemName: ''
      })
      const { reuploadLocalMediaFromZip } = await import('../../utils/zipMediaBundle')
      const { uploadFile: uploadToStorage } = useStorage()
      const reuploaded = await reuploadLocalMediaFromZip({
        zip,
        records,
        mediaMap: {
          file: { prefixes: ['music/', 'media/'], storageFolder: 'music', mimeFallback: 'audio/mpeg', filetypeField: 'filetype' },
          cover: { prefixes: ['covers/'], storageFolder: 'music-covers', mimeFallback: 'image/jpeg' }
        },
        uploadFile: uploadToStorage,
        onProgress: ({ current, total, stats }) => {
          updateImportProgress({
            current,
            total,
            step: '上傳媒體',
            itemName: `成功 ${stats.ok} / 失敗 ${stats.fail}`
          })
        }
      })
      records = reuploaded.records
      updateImportProgress({ step: '寫入資料庫', current: records.length, total: records.length })

    } else {
      resetImportProgress()
      alert('ZIP 檔案中找不到 music.csv 或 music.json')
      return
    }

    // 匯入記錄到資料庫
    if (records.length > 0) {
      updateImportProgress({ step: '💾 寫入資料庫...', current: importProgress.value.total, percent: 99 })
      const result = await importMusics(records)
      resetImportProgress()
      if (result.success) {
        await loadMusics()
        alert(`✅ ${result.message}！共 ${result.count} 筆資料`)
      } else {
        alert('匯入失敗: ' + result.error)
      }
    } else {
      resetImportProgress()
    }
  } catch (error) {
    resetImportProgress()
    console.error('Error importing ZIP:', error)
    alert('匯入失敗：' + error.message)
  } finally {
    event.target.value = ''
  }
}

onMounted(() => {
  loadMusics()
})

onBeforeUnmount(async () => {
  const element = playerAudioRef.value
  const activeMusic = currentTrack.value
  if (element && activeMusic && !element.paused && !element.ended) {
    await takeoverFromElement(element, getTrackMeta(activeMusic))
    return
  }
  // Not actively playing: drop local session so the bar does not pop up after leave.
  releaseLocalSession()
})
</script>

<style scoped>
/* ============================================================
   鋒兄音樂 — Spotify 風格
   · 漸層歌單標頭、綠色大播放鍵、曲目表、底部播放列、歌詞面板
   ============================================================ */
.music-db-page {
  --sp-green: #1db954;
  --sp-green-hi: #1ed760;
  --sp-bg: #121212;
  --sp-bg-2: #181818;
  --sp-bg-3: #242424;
  --sp-bg-4: #2a2a2a;
  --sp-line: rgba(255, 255, 255, 0.09);
  --sp-text: #ffffff;
  --sp-text-2: #b3b3b3;
  --sp-text-3: #7d7d7d;
  --sp-danger: #f15e6c;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: 0 0 var(--sp-4);
  border-radius: var(--radius-lg);
  overflow: clip; /* clip 不建立捲動容器，底部播放列的 sticky 才有效 */
  background: var(--sp-bg);
  color: var(--sp-text);
  font-family: var(--font-body);
}

/* ══════════ 歌單標頭 ══════════ */
.sp-hero {
  display: flex;
  align-items: flex-end;
  gap: var(--sp-5);
  padding: var(--sp-8) var(--sp-6) var(--sp-5);
  background: linear-gradient(180deg, #2f6b45 0%, #23472f 40%, var(--sp-bg) 100%);
}

.sp-hero-art {
  flex: 0 0 auto;
  width: 168px;
  height: 168px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #3d3d3d, #1a1a1a);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.55);
}

.sp-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sp-hero-note {
  font-size: 3.5rem;
  color: var(--sp-text-3);
}

.sp-hero-copy {
  min-width: 0;
  padding-bottom: var(--sp-2);
}

.sp-hero-label {
  margin: 0 0 var(--sp-2);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--sp-text-2);
}

.sp-hero-title {
  margin: 0 0 var(--sp-3);
  font-family: var(--font-display);
  font-size: clamp(2rem, 1.2rem + 3vw, 3.75rem);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
}

.sp-hero-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  margin: 0;
  font-size: var(--text-sm);
  color: var(--sp-text-2);
}

.sp-hero-owner {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-weight: 600;
  color: var(--sp-text);
}

.sp-owner-dot {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--sp-green);
  color: #06120b;
  font-family: var(--font-display);
  font-size: 0.6875rem;
  font-weight: 700;
}

.sp-dot {
  color: var(--sp-text-3);
}

/* ══════════ 播放控制列 ══════════ */
.sp-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  padding: 0 var(--sp-6);
}

.sp-play-big {
  width: 54px;
  height: 54px;
  border: none;
  border-radius: 50%;
  background: var(--sp-green);
  color: #06120b;
  font-size: 1.25rem;
  padding-left: 3px;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
  transition: transform var(--transition-fast), background var(--transition-fast);
}

.sp-play-big:hover:not(:disabled) {
  transform: scale(1.06);
  background: var(--sp-green-hi);
}

.sp-play-big:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sp-ghost-btn {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--sp-text-2);
  font-size: 1rem;
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.sp-ghost-btn:hover {
  color: var(--sp-text);
  background: rgba(255, 255, 255, 0.08);
}

.sp-ghost-btn.active {
  color: var(--sp-green);
}

.sp-actions-spacer {
  flex: 1;
}

.search-area {
  flex: 0 1 260px;
  min-width: 180px;
}

.search-area :deep(input) {
  height: 34px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  background: var(--sp-bg-3);
  color: var(--sp-text);
  font-size: var(--text-sm);
}

.search-area :deep(input::placeholder) {
  color: var(--sp-text-3);
}

.search-area :deep(input:focus) {
  outline: none;
  border-color: var(--sp-text-2);
  background: var(--sp-bg-4);
}

.sp-text-btn {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--sp-line);
  background: transparent;
  color: var(--sp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.sp-text-btn:hover {
  color: var(--sp-text);
  border-color: var(--sp-text-2);
}

.select-all-label {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--sp-text-2);
  cursor: pointer;
}

.select-all-label input,
.card-checkbox {
  accent-color: var(--sp-green);
  cursor: pointer;
}

.btn-batch-delete {
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid color-mix(in oklab, var(--sp-danger) 50%, transparent);
  background: transparent;
  color: var(--sp-danger);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-batch-delete:hover:not(:disabled) {
  background: var(--sp-danger);
  color: #fff;
}

.btn-batch-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ══════════ 語言膠囊 ══════════ */
.sp-chips {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
  padding: 0 var(--sp-6) var(--sp-1);
  scrollbar-width: none;
}

.sp-chips::-webkit-scrollbar {
  display: none;
}

.sp-chip {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 var(--sp-4);
  border: none;
  border-radius: var(--radius-full);
  background: var(--sp-bg-3);
  color: var(--sp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sp-chip:hover {
  background: var(--sp-bg-4);
  color: var(--sp-text);
}

.sp-chip.active {
  background: var(--sp-text);
  color: #121212;
  font-weight: 600;
}

.sp-chip-count {
  font-family: var(--font-mono);
  font-size: 10px;
  opacity: 0.7;
}

/* ══════════ 快取列 ══════════ */
.cache-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  flex-wrap: wrap;
  margin: 0 var(--sp-6);
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--radius-md);
  background: var(--sp-bg-2);
  border: 1px solid var(--sp-line);
}

.cache-info {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  color: var(--sp-text-2);
}

.cache-info strong {
  color: var(--sp-green);
  font-family: var(--font-mono);
}

.cache-size {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--sp-text-3);
}

.cache-meter {
  display: block;
  width: 110px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--sp-bg-4);
  overflow: hidden;
}

.cache-meter-fill {
  display: block;
  height: 100%;
  background: var(--sp-green);
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
  border: 1px solid var(--sp-line);
  background: transparent;
  color: var(--sp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-cache-all:hover:not(:disabled) {
  border-color: var(--sp-green);
  color: var(--sp-green);
}

.btn-clear-cache:hover {
  border-color: var(--sp-danger);
  color: var(--sp-danger);
}

.btn-cache-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ══════════ 狀態 ══════════ */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-16) var(--sp-4);
  color: var(--sp-text-3);
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

.sp-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--sp-bg-4);
  border-top-color: var(--sp-green);
  animation: spSpin 0.8s linear infinite;
}

@keyframes spSpin {
  to { transform: rotate(360deg); }
}

/* ══════════ 主體 ══════════ */
.sp-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sp-4);
  padding: 0 var(--sp-6);
}

.sp-body.with-lyrics {
  grid-template-columns: minmax(0, 1fr) 320px;
}

.music-grid {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

/* ══════════ 曲目表 ══════════ */
.sp-tracklist {
  display: flex;
  flex-direction: column;
}

.sp-track-head,
.sp-track {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 140px 88px 168px;
  gap: var(--sp-3);
  align-items: center;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-xs);
}

.sp-track-head {
  border-bottom: 1px solid var(--sp-line);
  padding-bottom: var(--sp-2);
  margin-bottom: var(--sp-2);
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sp-text-3);
}

.sp-track {
  min-height: 58px;
  cursor: default;
  transition: background var(--transition-fast);
}

.sp-track:hover {
  background: rgba(255, 255, 255, 0.06);
}

.sp-track.is-current .sp-track-name {
  color: var(--sp-green);
}

.sp-track.is-selected {
  background: rgba(29, 185, 84, 0.12);
}

.sp-col-index {
  position: relative;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--sp-text-3);
}

.sp-index-num {
  transition: opacity var(--transition-fast);
}

.sp-track:hover .sp-index-num,
.sp-track.is-current .sp-index-num {
  opacity: 0;
}

.sp-row-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--sp-text);
  font-size: 0.8125rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.sp-track:hover .sp-row-play {
  opacity: 1;
}

.sp-row-play:disabled {
  cursor: not-allowed;
  color: var(--sp-text-3);
}

.sp-eq {
  position: absolute;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  pointer-events: none;
}

.sp-track:hover .sp-eq {
  opacity: 0;
}

.sp-eq i {
  width: 2px;
  background: var(--sp-green);
  animation: spEq 0.9s ease-in-out infinite;
}

.sp-eq i:nth-child(1) { height: 6px; animation-delay: 0s; }
.sp-eq i:nth-child(2) { height: 12px; animation-delay: 0.18s; }
.sp-eq i:nth-child(3) { height: 8px; animation-delay: 0.36s; }

@keyframes spEq {
  0%, 100% { transform: scaleY(0.45); }
  50% { transform: scaleY(1); }
}

.sp-col-title {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}

.sp-track-art {
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--sp-bg-3);
}

.sp-track-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sp-track-art-note {
  color: var(--sp-text-3);
  font-size: 1rem;
}

.sp-track-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sp-track-name {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--sp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-track-sub {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--text-xs);
  color: var(--sp-text-2);
  overflow: hidden;
  white-space: nowrap;
}

.sp-note {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--sp-text-3);
}

.sp-version-hint {
  color: var(--sp-text-3);
}

.lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.lang-chip {
  height: 20px;
  padding: 0 var(--sp-2);
  border: 1px solid var(--sp-line);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--sp-text-3);
  font-size: 10px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.lang-chip:hover {
  color: var(--sp-text);
  border-color: var(--sp-text-2);
}

.lang-chip.active {
  background: var(--sp-green);
  border-color: var(--sp-green);
  color: #06120b;
  font-weight: 600;
}

.sp-col-category,
.sp-col-type {
  min-width: 0;
  font-size: var(--text-xs);
}

.badge {
  display: inline-block;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-2xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-category {
  background: rgba(29, 185, 84, 0.16);
  color: var(--sp-green);
}

.badge-type {
  font-family: var(--font-mono);
  background: var(--sp-bg-3);
  color: var(--sp-text-2);
}

.sp-muted {
  color: var(--sp-text-3);
}

.sp-col-tools {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.sp-track:hover .sp-col-tools,
.sp-track.is-current .sp-col-tools {
  opacity: 1;
}

.btn-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--sp-text-2);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-icon:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--sp-text);
}

.btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-icon.delete:hover {
  color: var(--sp-danger);
}

.btn-icon.save:hover {
  color: var(--sp-green);
}

.btn-cached {
  color: var(--sp-green);
}

/* ══════════ 歌詞面板 ══════════ */
.sp-lyrics-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #1f3d2b, var(--sp-bg-2) 55%);
  border: 1px solid var(--sp-line);
  max-height: 70vh;
  overflow-y: auto;
}

.sp-lyrics-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sp-lyrics-head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
}

.sp-lyrics-track {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding-bottom: var(--sp-3);
  border-bottom: 1px solid var(--sp-line);
}

.sp-lyrics-track div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sp-lyrics-track strong {
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-lyrics-track span {
  font-size: var(--text-2xs);
  color: var(--sp-text-2);
}

.lyrics-text {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-md);
  line-height: 2;
  font-weight: 600;
  color: var(--sp-text-2);
  white-space: pre-wrap;
  word-break: break-word;
}

.sp-lyrics-empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--sp-text-3);
}

/* ══════════ 底部播放列 ══════════ */
.sp-player {
  position: sticky;
  bottom: 0;
  z-index: var(--z-sticky);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-4);
  margin-top: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  background: #000;
  border-top: 1px solid var(--sp-line);
}

.sp-player-now {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}

.sp-player-art {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--sp-bg-3);
}

.sp-player-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sp-player-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sp-player-copy strong {
  font-size: var(--text-sm);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-player-copy span {
  font-size: var(--text-2xs);
  color: var(--sp-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-player-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.sp-transport {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.sp-t-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--sp-text-2);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color var(--transition-fast), transform var(--transition-fast);
}

.sp-t-btn:hover:not(:disabled) {
  color: var(--sp-text);
  transform: scale(1.08);
}

.sp-t-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.sp-t-btn.active {
  color: var(--sp-green);
}

.sp-t-btn--play {
  width: 36px;
  height: 36px;
  background: var(--sp-text);
  color: #000;
  font-size: 0.8125rem;
}

.sp-t-btn--play:hover {
  background: #fff;
  transform: scale(1.06);
}

.sp-scrub {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  max-width: 560px;
}

.sp-time {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  color: var(--sp-text-3);
  min-width: 34px;
  text-align: center;
}

.sp-progress {
  flex: 1;
  height: 4px;
  appearance: none;
  border-radius: var(--radius-full);
  background: linear-gradient(
    90deg,
    var(--sp-text) 0%,
    var(--sp-text) var(--played, 0%),
    rgba(255, 255, 255, 0.24) var(--played, 0%),
    rgba(255, 255, 255, 0.24) 100%
  );
  cursor: pointer;
}

.sp-progress::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--sp-text);
  border: none;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.sp-scrub:hover .sp-progress {
  background: linear-gradient(
    90deg,
    var(--sp-green) 0%,
    var(--sp-green) var(--played, 0%),
    rgba(255, 255, 255, 0.24) var(--played, 0%),
    rgba(255, 255, 255, 0.24) 100%
  );
}

.sp-scrub:hover .sp-progress::-webkit-slider-thumb {
  opacity: 1;
}

.sp-progress::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--sp-text);
  border: none;
}

.sp-player-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
}

.sp-volume {
  width: 96px;
  height: 4px;
  accent-color: var(--sp-green);
  cursor: pointer;
}

.sp-audio {
  display: none;
}

/* ══════════ 行內編輯 ══════════ */
.music-card.card-editing {
  border: 1px solid var(--sp-line);
  border-left: 4px solid var(--sp-green);
  border-radius: var(--radius-md);
  background: var(--sp-bg-2);
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: var(--sp-2) 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.card-actions {
  display: flex;
  gap: 2px;
}

.inline-edit-content {
  max-height: 520px;
  overflow-y: auto;
}

.inline-edit-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.inline-field-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.inline-field-row > label {
  flex: 0 0 72px;
  padding-top: 8px;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--sp-text-3);
}

.inline-input {
  width: 100%;
  min-height: 34px;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--sp-line);
  background: var(--sp-bg-3);
  color: var(--sp-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.inline-input:focus {
  outline: none;
  border-color: var(--sp-green);
  box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.2);
}

.inline-name {
  flex: 1;
  font-size: var(--text-md);
  font-weight: 600;
}

.inline-textarea {
  resize: vertical;
  line-height: 1.6;
}

.inline-upload-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.btn-inline-upload-music {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px dashed var(--sp-line);
  color: var(--sp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-inline-upload-music:hover {
  border-color: var(--sp-green);
  color: var(--sp-green);
}

.btn-inline-upload-music.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inline-selected-summary {
  font-size: var(--text-xs);
  color: var(--sp-text-2);
}

.btn-inline-remove-sm {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--sp-bg-4);
  color: var(--sp-text-2);
  font-size: 0.6875rem;
  cursor: pointer;
}

.btn-inline-remove-sm:hover {
  background: var(--sp-danger);
  color: #fff;
}

.inline-selected-files {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: var(--sp-2);
}

.selected-file-chip {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--sp-bg-4);
  color: var(--sp-text-2);
}

.inline-audio-preview,
.audio-preview {
  width: 100%;
  margin-top: var(--sp-2);
  filter: invert(0.9) hue-rotate(180deg);
}

.inline-cover-preview,
.preview-image {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  margin-top: var(--sp-2);
  border: 1px solid var(--sp-line);
}

/* ══════════ 匯入 Overlay ══════════ */
.import-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(3px);
}

.import-modal {
  width: min(420px, 90vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-6);
  border-radius: var(--radius-lg);
  background: var(--sp-bg-2);
  border: 1px solid var(--sp-line);
  color: var(--sp-text);
  text-align: center;
}

.import-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid var(--sp-bg-4);
  border-top-color: var(--sp-green);
  animation: spSpin 0.8s linear infinite;
}

.import-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.import-step,
.import-percent,
.import-item-name {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--sp-text-2);
}

.import-item-name {
  color: var(--sp-text-3);
  overflow-wrap: anywhere;
}

.import-progress-bar {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--sp-bg-4);
  overflow: hidden;
}

.import-progress-fill {
  height: 100%;
  background: var(--sp-green);
  transition: width var(--transition-normal);
}

.import-stats {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  justify-content: center;
}

.stat-tag {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.stat-ok {
  background: rgba(29, 185, 84, 0.16);
  color: var(--sp-green);
}

.stat-fail {
  background: rgba(241, 94, 108, 0.16);
  color: var(--sp-danger);
}

/* ══════════ Modal ══════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: var(--sp-4);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(3px);
}

.modal-content {
  width: min(600px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background: var(--sp-bg-2);
  border: 1px solid var(--sp-line);
  color: var(--sp-text);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-5);
  border-bottom: 1px solid var(--sp-line);
}

.modal-header h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
}

.btn-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--sp-text-2);
  font-size: 0.9375rem;
  cursor: pointer;
}

.btn-close:hover {
  background: var(--sp-bg-4);
  color: var(--sp-text);
}

.modal-body {
  padding: var(--sp-5);
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.form-group label {
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--sp-text-3);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--sp-line);
  background: var(--sp-bg-3);
  color: var(--sp-text);
  font-family: inherit;
  font-size: var(--text-sm);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--sp-green);
  box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.2);
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
  border-radius: var(--radius-full);
  border: 1px dashed var(--sp-line);
  background: transparent;
  color: var(--sp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-upload:hover:not(:disabled) {
  border-color: var(--sp-green);
  color: var(--sp-green);
}

.btn-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-progress {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--sp-green);
}

.file-preview,
.cover-preview {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.btn-remove {
  height: 30px;
  padding: 0 var(--sp-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--sp-line);
  background: transparent;
  color: var(--sp-text-2);
  font-size: var(--text-xs);
  cursor: pointer;
}

.btn-remove:hover {
  color: var(--sp-danger);
  border-color: var(--sp-danger);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding-top: var(--sp-2);
  border-top: 1px solid var(--sp-line);
}

.btn-cancel {
  height: 36px;
  padding: 0 var(--sp-4);
  border-radius: var(--radius-full);
  border: 1px solid var(--sp-line);
  background: transparent;
  color: var(--sp-text-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.btn-cancel:hover {
  color: var(--sp-text);
  border-color: var(--sp-text-2);
}

.btn-save {
  height: 36px;
  padding: 0 var(--sp-5);
  border-radius: var(--radius-full);
  border: none;
  background: var(--sp-green);
  color: #06120b;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
}

.btn-save:hover {
  background: var(--sp-green-hi);
}

/* ══════════ 響應式 ══════════ */
@media (max-width: 1100px) {
  .sp-body.with-lyrics {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .sp-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: var(--sp-5) var(--sp-4) var(--sp-4);
  }

  .sp-hero-art {
    width: 128px;
    height: 128px;
  }

  .sp-actions,
  .sp-chips,
  .sp-body {
    padding-left: var(--sp-4);
    padding-right: var(--sp-4);
  }

  .cache-bar {
    margin: 0 var(--sp-4);
  }

  .sp-track-head {
    display: none;
  }

  .sp-track {
    grid-template-columns: 36px minmax(0, 1fr) auto;
    row-gap: var(--sp-2);
  }

  .sp-col-category,
  .sp-col-type {
    grid-column: 2 / -1;
  }

  .sp-col-tools {
    opacity: 1;
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .sp-player {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-4);
  }

  .sp-player-right {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sp-eq i,
  .sp-spinner,
  .import-spinner {
    animation: none;
  }

  .sp-play-big:hover,
  .sp-t-btn:hover {
    transform: none;
  }
}
</style>
