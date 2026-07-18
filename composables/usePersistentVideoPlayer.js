import { ref, computed } from 'vue'

const currentVideo = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
/** True while a page-local <video> owns playback (hide floating bar). */
const isLocalBound = ref(false)

let video = null
let activeElement = null

const isUsableElement = (element) => {
  return Boolean(element && element.isConnected && typeof element.play === 'function')
}

const getPlaybackElement = () => {
  if (isUsableElement(activeElement)) return activeElement
  activeElement = null
  isLocalBound.value = false
  return ensureVideo()
}

const ensureVideo = () => {
  if (!import.meta.client) return null
  if (video) return video

  video = document.createElement('video')
  video.preload = 'auto'
  video.playsInline = true

  video.addEventListener('play', () => {
    isPlaying.value = true
  })

  video.addEventListener('pause', () => {
    isPlaying.value = false
  })

  video.addEventListener('timeupdate', () => {
    currentTime.value = video.currentTime || 0
  })

  video.addEventListener('loadedmetadata', () => {
    duration.value = Number.isFinite(video.duration) ? video.duration : 0
  })

  video.addEventListener('volumechange', () => {
    volume.value = video.volume
  })

  video.addEventListener('ended', () => {
    isPlaying.value = false
  })

  return video
}

const getSnapshot = (element, track, options = {}) => {
  if (!element || !track) return

  activeElement = element
  isLocalBound.value = true

  currentVideo.value = {
    id: track.id,
    name: track.name || '未命名影片',
    src: track.src || '',
    cover: track.cover || '',
    meta: track.meta || ''
  }

  currentTime.value = element.currentTime || 0
  duration.value = Number.isFinite(element.duration) ? element.duration : 0
  volume.value = element.volume ?? 1

  if (typeof options.playing === 'boolean') {
    isPlaying.value = options.playing
  }
}

const pauseGlobal = () => {
  const instance = getPlaybackElement()
  if (!instance) return
  instance.pause()
}

const resumeGlobal = async () => {
  const instance = getPlaybackElement()
  if (!instance || !currentVideo.value?.src) return
  if (!instance.src && instance === video) {
    instance.src = currentVideo.value.src
  }
  try {
    await instance.play()
  } catch (error) {
    console.warn('Persistent video resume failed:', error)
  }
}

const stopGlobal = () => {
  const instance = ensureVideo()
  if (!instance) return
  if (isUsableElement(activeElement)) {
    activeElement.pause()
    activeElement.currentTime = 0
  }
  instance.pause()
  instance.removeAttribute('src')
  instance.load()
  activeElement = null
  isLocalBound.value = false
  currentVideo.value = null
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
}

/**
 * Leave a page without handing off playback (not playing / already paused).
 * Clears local session so the floating bar does not appear for no reason.
 */
const releaseLocalSession = () => {
  if (!isLocalBound.value) return
  activeElement = null
  isLocalBound.value = false
  currentVideo.value = null
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
}

const seekGlobal = (time) => {
  const instance = getPlaybackElement()
  if (!instance) return
  instance.currentTime = Number(time) || 0
  currentTime.value = instance.currentTime
}

const setGlobalVolume = (nextVolume) => {
  const normalized = Math.min(1, Math.max(0, Number(nextVolume) || 0))
  const instance = getPlaybackElement()
  if (instance) {
    instance.volume = normalized
  }
  const hiddenVideo = ensureVideo()
  if (hiddenVideo && hiddenVideo !== instance) {
    hiddenVideo.volume = normalized
  }
  volume.value = normalized
}

const takeoverFromElement = async (element, track) => {
  if (!element || !track?.src) return
  const instance = ensureVideo()
  if (!instance) return

  getSnapshot(element, track, { playing: true })

  if (instance.src !== track.src) {
    instance.src = track.src
  }

  instance.currentTime = element.currentTime || 0
  instance.volume = element.volume ?? volume.value

  try {
    await instance.play()
    activeElement = null
    isLocalBound.value = false
  } catch (error) {
    console.warn('Persistent video takeover failed:', error)
  }
}

const restoreToElement = async (element, track) => {
  if (!element || !track) return false
  if (!currentVideo.value || currentVideo.value.id !== track.id) return false

  const instance = ensureVideo()
  if (!instance) return false

  activeElement = element
  isLocalBound.value = true
  element.currentTime = currentTime.value || 0
  element.volume = volume.value

  const shouldPlay = isPlaying.value
  instance.pause()

  if (shouldPlay) {
    try {
      await element.play()
    } catch (error) {
      console.warn('Restoring local video playback failed:', error)
    }
  }

  return true
}

/** Floating bar only when global video owns the session (not page-local controls). */
const showPersistentPlayer = computed(
  () => Boolean(currentVideo.value) && !isLocalBound.value
)

export const usePersistentVideoPlayer = () => {
  ensureVideo()

  return {
    currentVideo,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLocalBound,
    showPersistentPlayer,
    getSnapshot,
    pauseGlobal,
    resumeGlobal,
    stopGlobal,
    releaseLocalSession,
    seekGlobal,
    setGlobalVolume,
    takeoverFromElement,
    restoreToElement
  }
}
