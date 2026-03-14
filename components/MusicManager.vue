<template>
  <div class="music-manager">
    <div class="music-info">
      <h3>🎵 音樂庫系統</h3>
      <p>使用 Netlify Blobs 優化音樂載入，支援多語言版本</p>
    </div>

    <!-- 三級選擇器 -->
    <div class="selector-container">
      <!-- 第一層：選擇歌曲系列 -->
      <div class="selector-group">
        <label class="selector-label">步驟 1: 選擇歌曲系列</label>
        <select v-model="selectedCategory" class="selector" @change="onCategoryChange">
          <option value="">請選擇歌曲系列</option>
          <option value="鋒兄進化Show🔥">鋒兄進化Show🔥</option>
          <option value="鋒兄進化 Show！🔥進行曲">鋒兄進化 Show！🔥進行曲</option>
          <option value="鋒兄的傳奇人生">鋒兄的傳奇人生</option>
          <option value="塗哥水電王子爆紅">塗哥水電王子爆紅</option>
          <option value="最瞎結婚理由">最瞎結婚理由</option>
        </select>
      </div>

      <!-- 第二層：選擇語言 -->
      <div class="selector-group" v-if="selectedCategory">
        <label class="selector-label">步驟 2: 選擇語言</label>
        <select v-model="selectedLanguage" class="selector" @change="onLanguageChange">
          <option value="">請選擇語言</option>
          <option value="中文">中文</option>
          <option value="英語">英語</option>
          <option value="日語">日語</option>
          <option value="粤語">粤語</option>
          <option value="韓語">韓語</option>
        </select>
      </div>

      <!-- 第三層：選擇演唱者 (僅中文時顯示) -->
      <div class="selector-group" v-if="selectedLanguage === '中文'">
        <label class="selector-label">步驟 3: 選擇演唱者</label>
        <select v-model="selectedVersion" class="selector" @change="onVersionChange">
          <option value="">請選擇演唱者</option>
          <option value="原始音樂">原始音樂</option>
          <option value="Pekora">Pekora</option>
          <option value="Donald Trump">Donald Trump</option>
          <option value="Rose">Rose</option>
          <option value="Hatsune Miku">Hatsune Miku</option>
          <option value="Sidhu">Sidhu</option>
          <option value="SpongeBob SquarePants">SpongeBob SquarePants</option>
          <option value="Freddie Mercury">Freddie Mercury</option>
        </select>
      </div>
    </div>

    <!-- 播放器區域 -->
    <div v-if="currentTrack" class="player-section">
      <div class="now-playing">
        <h3>🎶 正在播放</h3>
        <div class="track-details">
          <div class="detail-item">
            <span class="detail-label">歌曲系列:</span>
            <span class="detail-value">{{ selectedCategory }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">語言:</span>
            <span class="detail-value">{{ selectedLanguage }}</span>
          </div>
          <div class="detail-item" v-if="selectedVersion">
            <span class="detail-label">演唱者:</span>
            <span class="detail-value">{{ selectedVersion }}</span>
          </div>
        </div>
      </div>

      <div class="audio-container">
        <div 
          v-if="audioLoadingStatus[currentTrack.blobKey]" 
          class="loading-status"
          :class="audioLoadingStatus[currentTrack.blobKey].type"
        >
          <span class="status-icon">{{ audioLoadingStatus[currentTrack.blobKey].icon }}</span>
          <span class="status-text">{{ audioLoadingStatus[currentTrack.blobKey].message }}</span>
          <span v-if="audioLoadingStatus[currentTrack.blobKey].progress" class="status-progress">
            {{ audioLoadingStatus[currentTrack.blobKey].progress }}%
          </span>
        </div>
        
        <audio 
          :key="currentTrack.blobKey"
          ref="mainAudioPlayer"
          class="audio-player main-player"
          controls
          preload="metadata"
          @play="onAudioPlay(currentTrack.blobKey)"
          @loadstart="onAudioLoadStart(currentTrack.blobKey)"
          @progress="onAudioProgress(currentTrack.blobKey, $event)"
          @canplay="onAudioCanPlay(currentTrack.blobKey)"
          @loadeddata="onAudioLoaded(currentTrack.blobKey)"
          @playing="onAudioPlaying(currentTrack.blobKey)"
          @waiting="onAudioWaiting(currentTrack.blobKey)"
          @error="onAudioError(currentTrack.blobKey, $event)"
        >
          <source :src="getMusicUrl(currentTrack.blobKey)" type="audio/mpeg">
          您的瀏覽器不支援音樂播放。
        </audio>

        <!-- 歌詞控制按鈕 -->
        <div class="lyrics-controls">
          <button @click="toggleLyrics" class="lyrics-btn">
            {{ showLyrics ? '👁️ 隱藏歌詞' : '🎵 顯示歌詞' }}
          </button>
        </div>
      </div>

      <!-- 歌詞顯示區域 -->
      <div v-if="showLyrics" class="lyrics-section">
        <div class="lyrics-header">
          <h4>🎶 歌詞</h4>
        </div>
        <div class="lyrics-content">
          <pre v-if="currentLyrics">{{ currentLyrics }}</pre>
          <p v-else class="lyrics-loading">正在載入歌詞...</p>
        </div>
      </div>
    </div>

    <!-- 快取管理控制台 -->
    <div class="cache-controls">
      <div class="cache-stats">
        <div class="stat-item">
          <span class="stat-label">快取大小:</span>
          <span class="stat-value">{{ formatFileSize(cacheSize) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已快取音樂:</span>
          <span class="stat-value">{{ cachedMusic.length }}/{{ totalMusicCount }}</span>
        </div>
      </div>
      
      <div class="cache-actions">
        <button 
          @click="preloadAllMusic" 
          :disabled="loading"
          class="cache-btn primary"
        >
          {{ loading ? '載入中...' : '預載所有音樂' }}
        </button>
        <button 
          @click="clearAllCache" 
          :disabled="cacheSize === 0"
          class="cache-btn secondary"
        >
          清除所有快取
        </button>
      </div>
    </div>

    <!-- 音樂分類列表 -->
    <div class="music-categories">
      <div 
        v-for="category in musicCategories" 
        :key="category.name"
        class="category-card"
      >
        <div class="category-header">
          <h4>{{ category.name }}</h4>
          <span class="track-count">{{ category.tracks.length }} 首</span>
        </div>

        <div class="tracks-list">
          <div 
            v-for="track in category.tracks" 
            :key="track.blobKey"
            class="track-item"
          >
            <div class="track-info">
              <div class="track-name">{{ track.displayName }}</div>
              <div class="track-meta">
                <span v-if="track.fileSize" class="file-size">
                  {{ formatFileSize(track.fileSize) }}
                </span>
                <span :class="['cache-status', isMusicCached(track.blobKey) ? 'cached' : 'not-cached']">
                  {{ isMusicCached(track.blobKey) ? '✅ 已快取' : '❌ 未快取' }}
                </span>
              </div>
            </div>

            <div class="track-actions">
              <button 
                v-if="!isMusicCached(track.blobKey)"
                @click="preloadMusic(track.blobKey)"
                :disabled="loadingMusic.has(track.blobKey)"
                class="action-btn cache"
                title="預載音樂"
              >
                {{ loadingMusic.has(track.blobKey) ? '⏳' : '📥' }}
              </button>
              <button 
                v-if="isMusicCached(track.blobKey)"
                @click="clearMusicCache(track.blobKey)"
                class="action-btn clear"
                title="清除快取"
              >
                🗑️
              </button>
            </div>

            <div class="audio-container">
              <!-- 載入狀態提示 -->
              <div 
                v-if="audioLoadingStatus[track.blobKey]" 
                class="loading-status"
                :class="audioLoadingStatus[track.blobKey].type"
              >
                <span class="status-icon">{{ audioLoadingStatus[track.blobKey].icon }}</span>
                <span class="status-text">{{ audioLoadingStatus[track.blobKey].message }}</span>
                <span v-if="audioLoadingStatus[track.blobKey].progress" class="status-progress">
                  {{ audioLoadingStatus[track.blobKey].progress }}%
                </span>
              </div>
              
              <audio 
                :ref="el => setAudioRef(track.blobKey, el)"
                class="audio-player"
                controls
                preload="none"
                @play="onAudioPlay(track.blobKey)"
                @loadstart="onAudioLoadStart(track.blobKey)"
                @progress="onAudioProgress(track.blobKey, $event)"
                @canplay="onAudioCanPlay(track.blobKey)"
                @loadeddata="onAudioLoaded(track.blobKey)"
                @playing="onAudioPlaying(track.blobKey)"
                @waiting="onAudioWaiting(track.blobKey)"
                @error="onAudioError(track.blobKey, $event)"
              >
                <source :src="getMusicUrl(track.blobKey)" type="audio/mpeg">
                您的瀏覽器不支援音樂播放。
              </audio>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用說明 -->
    <div class="usage-guide">
      <h3>📋 使用說明</h3>
      <ul>
        <li><strong>智能快取:</strong> 音樂會自動快取到本地，減少重複載入</li>
        <li><strong>按需載入:</strong> 點擊播放按鈕才開始載入音樂內容</li>
        <li><strong>預載功能:</strong> 可以預先載入音樂到快取中</li>
        <li><strong>快取管理:</strong> 支援單個或全部音樂的快取清除</li>
        <li><strong>離線播放:</strong> 已快取的音樂可以離線播放</li>
        <li><strong>多語言版本:</strong> 支援多種語言和演唱者版本</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

// 響應式數據
const loading = ref(false)
const loadingMusic = reactive(new Set())
const cachedMusic = ref([])
const cacheSize = ref(0)
const audioRefs = reactive(new Map())
const audioLoadingStatus = reactive({})

// 選擇器狀態
const selectedCategory = ref('')
const selectedLanguage = ref('')
const selectedVersion = ref('')
const currentTrack = ref(null)
const showLyrics = ref(false)
const currentLyrics = ref('')

// 音樂分類配置
const musicCategories = ref([
  {
    name: '鋒兄的傳奇人生',
    tracks: [
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生.mp3', displayName: '原版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生 (Rose).mp3', displayName: 'Rose 版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(Donald Trump).mp3', displayName: 'Donald Trump 版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(Freddie Mercury).mp3', displayName: 'Freddie Mercury 版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(Hatsune Miku).mp3', displayName: 'Hatsune Miku 版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(Pekora).mp3', displayName: 'Pekora 版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(Sidhu).mp3', displayName: 'Sidhu 版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(SpongeBob SquarePants).mp3', displayName: 'SpongeBob 版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(日文).mp3', displayName: '日文版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(粵語).mp3', displayName: '粵語版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(英文).mp3', displayName: '英文版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(韓文).mp3', displayName: '韓文版', fileSize: null }
    ]
  },
  {
    name: '鋒兄進化Show🔥',
    tracks: [
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥.mp3', displayName: '原版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(Rose).mp3', displayName: 'Rose 版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(Donald Trump).mp3', displayName: 'Donald Trump 版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(Freddie Mercury).mp3', displayName: 'Freddie Mercury 版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(Hatsune Miku).mp3', displayName: 'Hatsune Miku 版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(Pekora).mp3', displayName: 'Pekora 版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(Sidhu).mp3', displayName: 'Sidhu 版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(SpongeBob SquarePants).mp3', displayName: 'SpongeBob 版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(日語).mp3', displayName: '日語版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(粵語).mp3', displayName: '粵語版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(英語).mp3', displayName: '英語版', fileSize: null },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(韓語).mp3', displayName: '韓語版', fileSize: null }
    ]
  },
  {
    name: '塗哥水電王子爆紅',
    tracks: [
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅.mp3', displayName: '原版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(Rose).mp3', displayName: 'Rose 版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(Donald Trump).mp3', displayName: 'Donald Trump 版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(Freddie Mercury).mp3', displayName: 'Freddie Mercury 版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(Hatsune Miku).mp3', displayName: 'Hatsune Miku 版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(Pekora).mp3', displayName: 'Pekora 版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(Sidhu).mp3', displayName: 'Sidhu 版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(SpongeBob SquarePants).mp3', displayName: 'SpongeBob 版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(日語).mp3', displayName: '日語版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(粵語).mp3', displayName: '粵語版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(英語).mp3', displayName: '英語版', fileSize: null },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(韓語).mp3', displayName: '韓語版', fileSize: null }
    ]
  },
  {
    name: '最瞎結婚理由',
    tracks: [
      { blobKey: '最瞎結婚理由/最瞎結婚理由.mp3', displayName: '原版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由(Rose).mp3', displayName: 'Rose 版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由(Donald Trump).mp3', displayName: 'Donald Trump 版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由(Freddie Mercury).mp3', displayName: 'Freddie Mercury 版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由(Hatsune Miku).mp3', displayName: 'Hatsune Miku 版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由(Pekora).mp3', displayName: 'Pekora 版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由(Sidhu).mp3', displayName: 'Sidhu 版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由(SpongeBob SquarePants).mp3', displayName: 'SpongeBob 版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由 (日語).mp3', displayName: '日語版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由 (粵語).mp3', displayName: '粵語版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由 (英語).mp3', displayName: '英語版', fileSize: null },
      { blobKey: '最瞎結婚理由/最瞎結婚理由 (韓語).mp3', displayName: '韓語版', fileSize: null }
    ]
  },
  {
    name: '鋒兄進化 Show！🔥進行曲',
    tracks: [
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲.mp3', displayName: '原始音樂', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲 (Rose).mp3', displayName: 'Rose 版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲 (Donald Trump).mp3', displayName: 'Donald Trump 版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲 (Freddie Mercury).mp3', displayName: 'Freddie Mercury 版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲 (Hatsune Miku).mp3', displayName: 'Hatsune Miku 版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲 (Pekora).mp3', displayName: 'Pekora 版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲 (Sidhu).mp3', displayName: 'Sidhu 版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲(SpongeBob SquarePants).mp3', displayName: 'SpongeBob 版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲(日語).mp3', displayName: '日語版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲(粵語).mp3', displayName: '粤語版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲(英語).mp3', displayName: '英語版', fileSize: null },
      { blobKey: '鋒兄進化 Show！🔥進行曲/鋒兄進化 Show！🔥進行曲(韓語).mp3', displayName: '韓語版', fileSize: null }
    ]
  }
])

// 計算總音樂數量
const totalMusicCount = computed(() => {
  return musicCategories.value.reduce((total, category) => total + category.tracks.length, 0)
})

// 選擇器處理函數
const onCategoryChange = () => {
  selectedLanguage.value = ''
  selectedVersion.value = ''
  currentTrack.value = null
}

const onLanguageChange = () => {
  selectedVersion.value = ''
  updateCurrentTrack()
}

const onVersionChange = () => {
  updateCurrentTrack()
}

const updateCurrentTrack = () => {
  if (!selectedCategory.value || !selectedLanguage.value) {
    currentTrack.value = null
    return
  }

  // 找到對應的音樂分類
  const category = musicCategories.value.find(c => c.name === selectedCategory.value)
  if (!category) {
    console.log('找不到分類:', selectedCategory.value)
    return
  }

  let track = null

  if (selectedLanguage.value === '中文') {
    // 中文需要選擇演唱者
    if (!selectedVersion.value) {
      currentTrack.value = null
      return
    }
    // 查找中文版本
    track = category.tracks.find(t => {
      // 匹配原始音樂或原版
      if (selectedVersion.value === '原始音樂') {
        return t.displayName === '原始音樂' || t.displayName === '原版'
      }
      // 匹配演唱者版本
      return t.displayName === selectedVersion.value || t.displayName === `${selectedVersion.value} 版`
    })
  } else {
    // 其他語言直接找到對應版本
    const possibleNames = []
    
    if (selectedLanguage.value === '英語') {
      possibleNames.push('英語版', '英文版')
    } else if (selectedLanguage.value === '日語') {
      possibleNames.push('日語版', '日文版')
    } else if (selectedLanguage.value === '粤語') {
      possibleNames.push('粤語版', '粵語版')
    } else if (selectedLanguage.value === '韓語') {
      possibleNames.push('韓語版', '韓文版')
    }
    
    track = category.tracks.find(t => possibleNames.includes(t.displayName))
  }

  if (track) {
    console.log('找到音軌:', track)
    currentTrack.value = track
  } else {
    console.log('找不到匹配的音軌, 嘗試:', selectedLanguage.value, selectedVersion.value)
    console.log('可用音軌:', category.tracks.map(t => t.displayName))
    currentTrack.value = null
  }
}

// 主播放器 ref
const mainAudioPlayer = ref(null)

// 載入歌詞
const loadLyrics = async () => {
  if (!currentTrack.value || !selectedCategory.value) {
    currentLyrics.value = ''
    return
  }

  try {
    // 構建歌詞檔案路徑
    let lyricsFile = ''
    const categoryName = selectedCategory.value
    
    if (selectedLanguage.value === '中文') {
      // 中文版本使用主檔案
      lyricsFile = `${categoryName}/${categoryName}.txt`
    } else {
      // 其他語言版本
      const langMap = {
        '英語': '英語',
        '日語': '日語',
        '粤語': '粵語',
        '韓語': '韓語'
      }
      const langName = langMap[selectedLanguage.value]
      if (langName) {
        lyricsFile = `${categoryName}/${categoryName} ${langName}.txt`
      }
    }

    if (lyricsFile) {
      const response = await fetch(`/music/${encodeURIComponent(lyricsFile)}`)
      if (response.ok) {
        currentLyrics.value = await response.text()
      } else {
        currentLyrics.value = '歌詞檔案不存在'
      }
    }
  } catch (error) {
    console.error('載入歌詞失敗:', error)
    currentLyrics.value = '無法載入歌詞'
  }
}

// 切換歌詞顯示
const toggleLyrics = () => {
  showLyrics.value = !showLyrics.value
  if (showLyrics.value && !currentLyrics.value) {
    loadLyrics()
  }
}

// 監聴音軌變化
watch(currentTrack, async (newTrack, oldTrack) => {
  if (newTrack) {
    console.log('音軌變化:', newTrack.displayName, newTrack.blobKey)
    // 等待 DOM 更新
    await nextTick()
    // 強制重新載入音訊
    if (mainAudioPlayer.value) {
      mainAudioPlayer.value.load()
      console.log('已載入新音軌')
    }
    // 載入歌詞
    if (showLyrics.value) {
      await loadLyrics()
    }
  }
})

// IndexedDB 快取管理
let db = null

// 初始化 IndexedDB
const initDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MusicCache', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('music')) {
        const store = db.createObjectStore('music', { keyPath: 'blobKey' })
        store.createIndex('displayName', 'displayName', { unique: false })
      }
    }
  })
}

// 格式化檔案大小
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 獲取音樂 URL
const getMusicUrl = (blobKey) => {
  // 優先使用快取的 blob URL
  const cached = cachedMusic.value.find(m => m.blobKey === blobKey)
  if (cached && cached.blobUrl) {
    return cached.blobUrl
  }
  
  // 本地開發模式：直接使用 public 資料夾中的檔案
  if (process.dev || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `/music/${encodeURIComponent(blobKey)}`
  }
  
  // 生產環境：回退到 Netlify Blobs URL
  return `/api/blobs/music/${encodeURIComponent(blobKey)}`
}

// 檢查音樂是否已快取
const isMusicCached = (blobKey) => {
  return cachedMusic.value.some(m => m.blobKey === blobKey)
}

// 設置音樂元素引用
const setAudioRef = (blobKey, el) => {
  if (el) {
    audioRefs.set(blobKey, el)
  }
}

// 從快取載入音樂
const loadMusicFromCache = async (blobKey) => {
  if (!db) return null
  
  try {
    const transaction = db.transaction(['music'], 'readonly')
    const store = transaction.objectStore('music')
    const request = store.get(blobKey)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result
        if (result && result.blob) {
          const blobUrl = URL.createObjectURL(result.blob)
          resolve({ ...result, blobUrl })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('載入快取失敗:', error)
    return null
  }
}

// 儲存音樂到快取
const saveMusicToCache = async (blobKey, blob, metadata = {}) => {
  if (!db) return false
  
  try {
    const transaction = db.transaction(['music'], 'readwrite')
    const store = transaction.objectStore('music')
    
    const musicData = {
      blobKey,
      blob,
      metadata: {
        ...metadata,
        cachedAt: new Date().toISOString(),
        size: blob.size
      }
    }
    
    const request = store.put(musicData)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('儲存快取失敗:', error)
    return false
  }
}

// 預載音樂
const preloadMusic = async (blobKey) => {
  if (isMusicCached(blobKey) || loadingMusic.has(blobKey)) return
  
  loadingMusic.add(blobKey)
  
  try {
    // 從 Netlify Blobs 獲取音樂
    const response = await fetch(`/api/blobs/music/${encodeURIComponent(blobKey)}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    // 找到對應的音樂信息
    let displayName = blobKey
    for (const category of musicCategories.value) {
      const track = category.tracks.find(t => t.blobKey === blobKey)
      if (track) {
        displayName = track.displayName
        break
      }
    }
    
    // 儲存到快取
    await saveMusicToCache(blobKey, blob, { displayName })
    
    // 更新快取列表
    cachedMusic.value.push({
      blobKey,
      blobUrl,
      size: blob.size,
      cachedAt: new Date()
    })
    
    // 更新音樂元素的 src
    const audioEl = audioRefs.get(blobKey)
    if (audioEl) {
      audioEl.src = blobUrl
    }
    
    updateCacheSize()
    
  } catch (error) {
    console.error(`預載音樂失敗 (${blobKey}):`, error)
    alert(`預載音樂失敗: ${error.message}`)
  } finally {
    loadingMusic.delete(blobKey)
  }
}

// 預載所有音樂
const preloadAllMusic = async () => {
  loading.value = true
  
  try {
    const allTracks = musicCategories.value.flatMap(category => category.tracks)
    const promises = allTracks
      .filter(track => !isMusicCached(track.blobKey))
      .map(track => preloadMusic(track.blobKey))
    
    await Promise.all(promises)
    alert('所有音樂預載完成！')
  } catch (error) {
    console.error('預載所有音樂失敗:', error)
    alert('預載過程中發生錯誤')
  } finally {
    loading.value = false
  }
}

// 清除單個音樂快取
const clearMusicCache = async (blobKey) => {
  if (!db) return
  
  try {
    const transaction = db.transaction(['music'], 'readwrite')
    const store = transaction.objectStore('music')
    await store.delete(blobKey)
    
    // 清理 blob URL
    const cached = cachedMusic.value.find(m => m.blobKey === blobKey)
    if (cached && cached.blobUrl) {
      URL.revokeObjectURL(cached.blobUrl)
    }
    
    // 從快取列表移除
    cachedMusic.value = cachedMusic.value.filter(m => m.blobKey !== blobKey)
    
    // 重置音樂元素的 src
    const audioEl = audioRefs.get(blobKey)
    if (audioEl) {
      audioEl.src = `/api/blobs/music/${encodeURIComponent(blobKey)}`
    }
    
    updateCacheSize()
    
  } catch (error) {
    console.error('清除快取失敗:', error)
  }
}

// 清除所有快取
const clearAllCache = async () => {
  if (!confirm('確定要清除所有音樂快取嗎？')) return
  
  if (!db) return
  
  try {
    const transaction = db.transaction(['music'], 'readwrite')
    const store = transaction.objectStore('music')
    await store.clear()
    
    // 清理所有 blob URLs
    cachedMusic.value.forEach(cached => {
      if (cached.blobUrl) {
        URL.revokeObjectURL(cached.blobUrl)
      }
    })
    
    cachedMusic.value = []
    
    // 重置所有音樂元素的 src
    musicCategories.value.forEach(category => {
      category.tracks.forEach(track => {
        const audioEl = audioRefs.get(track.blobKey)
        if (audioEl) {
          audioEl.src = `/api/blobs/music/${encodeURIComponent(track.blobKey)}`
        }
      })
    })
    
    updateCacheSize()
    alert('所有快取已清除')
    
  } catch (error) {
    console.error('清除所有快取失敗:', error)
    alert('清除快取失敗')
  }
}

// 更新快取大小統計
const updateCacheSize = () => {
  cacheSize.value = cachedMusic.value.reduce((total, music) => total + (music.size || 0), 0)
}

// 載入已存在的快取
const loadExistingCache = async () => {
  if (!db) return
  
  try {
    const transaction = db.transaction(['music'], 'readonly')
    const store = transaction.objectStore('music')
    const request = store.getAll()
    
    request.onsuccess = () => {
      const results = request.result
      cachedMusic.value = results.map(result => ({
        blobKey: result.blobKey,
        blobUrl: URL.createObjectURL(result.blob),
        size: result.blob.size,
        cachedAt: new Date(result.metadata.cachedAt)
      }))
      
      updateCacheSize()
    }
  } catch (error) {
    console.error('載入現有快取失敗:', error)
  }
}

// 音樂事件處理
const onAudioPlay = (blobKey) => {
  console.log(`用戶點擊播放: ${blobKey}`)
  audioLoadingStatus[blobKey] = {
    type: 'info',
    icon: '🔄',
    message: '準備播放...',
    progress: null
  }
}

const onAudioLoadStart = (blobKey) => {
  console.log(`音樂開始載入: ${blobKey}`)
  audioLoadingStatus[blobKey] = {
    type: 'info',
    icon: '📥',
    message: '開始下載音樂...',
    progress: 0
  }
}

const onAudioProgress = (blobKey, event) => {
  const audio = event.target
  if (audio.buffered.length > 0) {
    const bufferedEnd = audio.buffered.end(audio.buffered.length - 1)
    const duration = audio.duration
    if (duration > 0) {
      const progress = Math.round((bufferedEnd / duration) * 100)
      audioLoadingStatus[blobKey] = {
        type: 'info',
        icon: '⏬',
        message: '下載中...',
        progress: progress
      }
    }
  }
}

const onAudioCanPlay = (blobKey) => {
  console.log(`音樂可以播放: ${blobKey}`)
  audioLoadingStatus[blobKey] = {
    type: 'success',
    icon: '✅',
    message: '下載完成，準備播放',
    progress: 100
  }
  
  // 2秒後自動隱藏狀態
  setTimeout(() => {
    if (audioLoadingStatus[blobKey]?.type === 'success') {
      delete audioLoadingStatus[blobKey]
    }
  }, 2000)
}

const onAudioLoaded = (blobKey) => {
  console.log(`音樂載入完成: ${blobKey}`)
}

const onAudioPlaying = (blobKey) => {
  console.log(`音樂正在播放: ${blobKey}`)
  // 播放時清除狀態提示
  delete audioLoadingStatus[blobKey]
}

const onAudioWaiting = (blobKey) => {
  console.log(`音樂緩衝中: ${blobKey}`)
  audioLoadingStatus[blobKey] = {
    type: 'warning',
    icon: '⏳',
    message: '緩衝中...',
    progress: null
  }
}

const onAudioError = (blobKey, event) => {
  console.error(`音樂載入錯誤 (${blobKey}):`, event)
  const audio = event.target
  let errorMessage = '載入失敗'
  
  if (audio.error) {
    switch (audio.error.code) {
      case 1:
        errorMessage = '載入被中止'
        break
      case 2:
        errorMessage = '網路錯誤'
        break
      case 3:
        errorMessage = '解碼錯誤'
        break
      case 4:
        errorMessage = '不支援的格式'
        break
    }
  }
  
  audioLoadingStatus[blobKey] = {
    type: 'error',
    icon: '❌',
    message: errorMessage,
    progress: null
  }
}

// 組件掛載
onMounted(async () => {
  try {
    await initDB()
    await loadExistingCache()
  } catch (error) {
    console.error('初始化失敗:', error)
  }
})

// 組件卸載時清理
onUnmounted(() => {
  // 清理所有 blob URLs
  cachedMusic.value.forEach(cached => {
    if (cached.blobUrl) {
      URL.revokeObjectURL(cached.blobUrl)
    }
  })
  
  if (db) {
    db.close()
  }
})
</script>

<style scoped>
.music-manager {
  max-width: 1200px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-in;
}

.music-info {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.music-info h3 {
  margin-bottom: 1rem;
  font-size: 1.8rem;
}

/* 選擇器樣式 */
.selector-container {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.selector-group {
  margin-bottom: 1.5rem;
}

.selector-group:last-child {
  margin-bottom: 0;
}

.selector-label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.selector {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e0c3fc;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.selector:hover {
  border-color: #f093fb;
}

.selector:focus {
  outline: none;
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.2);
}

/* 播放器區域 */
.player-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.now-playing {
  margin-bottom: 1.5rem;
}

.now-playing h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.track-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.detail-value {
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 600;
}

.main-player {
  width: 100%;
  margin-top: 1rem;
}

/* 歌詞控制 */
.lyrics-controls {
  margin-top: 1rem;
  text-align: center;
}

.lyrics-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.lyrics-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.lyrics-btn:active {
  transform: translateY(0);
}

/* 歌詞區域 */
.lyrics-section {
  margin-top: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e0c3fc;
}

.lyrics-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
  color: white;
}

.lyrics-header h4 {
  margin: 0;
  font-size: 1.2rem;
}

.lyrics-content {
  padding: 1.5rem;
  max-height: 500px;
  overflow-y: auto;
}

.lyrics-content pre {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 1rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #2c3e50;
}

.lyrics-loading {
  text-align: center;
  color: #666;
  font-style: italic;
}

.cache-controls {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.cache-stats {
  display: flex;
  gap: 2rem;
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
  color: #666;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
}

.cache-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
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

.cache-btn.primary {
  background: #f093fb;
  color: white;
}

.cache-btn.primary:hover:not(:disabled) {
  background: #e082ea;
  transform: translateY(-2px);
}

.cache-btn.secondary {
  background: #95a5a6;
  color: white;
}

.cache-btn.secondary:hover:not(:disabled) {
  background: #7f8c8d;
  transform: translateY(-2px);
}

.cache-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.music-categories {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
}

.category-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  overflow: hidden;
}

.category-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-header h4 {
  margin: 0;
  font-size: 1.3rem;
}

.track-count {
  background: rgba(255,255,255,0.3);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
}

.tracks-list {
  padding: 1rem;
}

.track-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: transform 0.2s;
}

.track-item:last-child {
  margin-bottom: 0;
}

.track-item:hover {
  transform: translateX(5px);
}

.track-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.track-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.track-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.9rem;
}

.file-size {
  color: #666;
}

.cache-status.cached {
  color: #27ae60;
  font-weight: 600;
}

.cache-status.not-cached {
  color: #e74c3c;
  font-weight: 600;
}

.track-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.action-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1.2rem;
}

.action-btn:hover {
  background: #f8f9fa;
  transform: scale(1.1);
}

.action-btn.cache {
  border-color: #f093fb;
  color: #f093fb;
}

.action-btn.clear {
  border-color: #e74c3c;
  color: #e74c3c;
}

.audio-container {
  position: relative;
}

.loading-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  animation: slideIn 0.3s ease-out;
}

.loading-status.info {
  background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.loading-status.success {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
  border: 1px solid #c3e6cb;
}

.loading-status.warning {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  color: #856404;
  border: 1px solid #ffeaa7;
}

.loading-status.error {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status-icon {
  font-size: 1.2rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-text {
  flex: 1;
}

.status-progress {
  font-weight: bold;
  font-size: 1rem;
  min-width: 45px;
  text-align: right;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.audio-player {
  width: 100%;
  border-radius: 8px;
}

.usage-guide {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.usage-guide h3 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.usage-guide ul {
  list-style: none;
  padding: 0;
}

.usage-guide li {
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
  color: #555;
  line-height: 1.6;
}

.usage-guide li:last-child {
  border-bottom: none;
}

.usage-guide strong {
  color: #2c3e50;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .cache-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .cache-stats {
    justify-content: space-around;
  }
  
  .cache-actions {
    justify-content: center;
  }
  
  .category-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  
  .track-info {
    flex-direction: column;
    align-items: flex-start;
  }
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
</style>
