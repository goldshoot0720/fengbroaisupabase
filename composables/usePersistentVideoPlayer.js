import { ref } from 'vue'

const currentVideo = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)

let video = null

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
  const instance = ensureVideo()
  if (!instance) return
  instance.pause()
}

const resumeGlobal = async () => {
  const instance = ensureVideo()
  if (!instance || !currentVideo.value?.src) return
  try {
    await instance.play()
  } catch (error) {
    console.warn('Persistent video resume failed:', error)
  }
}

const stopGlobal = () => {
  const instance = ensureVideo()
  if (!instance) return
  instance.pause()
  instance.removeAttribute('src')
  instance.load()
  currentVideo.value = null
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
}

const seekGlobal = (time) => {
  const instance = ensureVideo()
  if (!instance) return
  instance.currentTime = Number(time) || 0
  currentTime.value = instance.currentTime
}

const setGlobalVolume = (nextVolume) => {
  const instance = ensureVideo()
  if (!instance) return
  const normalized = Math.min(1, Math.max(0, Number(nextVolume) || 0))
  instance.volume = normalized
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
  } catch (error) {
    console.warn('Persistent video takeover failed:', error)
  }
}

const restoreToElement = async (element, track) => {
  if (!element || !track) return false
  if (!currentVideo.value || currentVideo.value.id !== track.id) return false

  const instance = ensureVideo()
  if (!instance) return false

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

export const usePersistentVideoPlayer = () => {
  ensureVideo()

  return {
    currentVideo,
    isPlaying,
    currentTime,
    duration,
    volume,
    getSnapshot,
    pauseGlobal,
    resumeGlobal,
    stopGlobal,
    seekGlobal,
    setGlobalVolume,
    takeoverFromElement,
    restoreToElement
  }
}
