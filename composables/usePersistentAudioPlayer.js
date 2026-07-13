import { ref } from 'vue'

const currentTrack = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)

let audio = null
let activeElement = null

const isUsableElement = (element) => {
  return Boolean(element && element.isConnected && typeof element.play === 'function')
}

const getPlaybackElement = () => {
  if (isUsableElement(activeElement)) return activeElement
  activeElement = null
  return ensureAudio()
}

const ensureAudio = () => {
  if (!import.meta.client) return null
  if (audio) return audio

  audio = new Audio()
  audio.preload = 'auto'

  audio.addEventListener('play', () => {
    isPlaying.value = true
  })

  audio.addEventListener('pause', () => {
    isPlaying.value = false
  })

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime || 0
  })

  audio.addEventListener('loadedmetadata', () => {
    duration.value = Number.isFinite(audio.duration) ? audio.duration : 0
  })

  audio.addEventListener('volumechange', () => {
    volume.value = audio.volume
  })

  audio.addEventListener('ended', () => {
    isPlaying.value = false
  })

  return audio
}

const snapshotFromElement = (element, track, options = {}) => {
  if (!element || !track) return

  activeElement = element

  currentTrack.value = {
    id: track.id,
    name: track.name || '未命名音樂',
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
  if (!instance || !currentTrack.value?.src) return
  if (!instance.src && instance === audio) {
    instance.src = currentTrack.value.src
  }
  try {
    await instance.play()
  } catch (error) {
    console.warn('Persistent audio resume failed:', error)
  }
}

const stopGlobal = () => {
  const instance = ensureAudio()
  if (!instance) return
  if (isUsableElement(activeElement)) {
    activeElement.pause()
    activeElement.currentTime = 0
  }
  instance.pause()
  instance.removeAttribute('src')
  instance.load()
  activeElement = null
  currentTrack.value = null
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
  const hiddenAudio = ensureAudio()
  if (hiddenAudio && hiddenAudio !== instance) {
    hiddenAudio.volume = normalized
  }
  volume.value = normalized
}

const takeoverFromElement = async (element, track) => {
  if (!element || !track?.src) return

  const instance = ensureAudio()
  if (!instance) return

  snapshotFromElement(element, track, { playing: true })

  if (instance.src !== track.src) {
    instance.src = track.src
  }

  instance.currentTime = element.currentTime || 0
  instance.volume = element.volume ?? volume.value

  try {
    await instance.play()
    activeElement = null
  } catch (error) {
    console.warn('Persistent audio takeover failed:', error)
  }
}

const restoreToElement = async (element, track) => {
  if (!element || !track) return false
  if (!currentTrack.value || currentTrack.value.id !== track.id) return false

  const instance = ensureAudio()
  if (!instance) return false

  activeElement = element
  element.currentTime = currentTime.value || 0
  element.volume = volume.value

  const shouldPlay = isPlaying.value
  instance.pause()

  if (shouldPlay) {
    try {
      await element.play()
    } catch (error) {
      console.warn('Restoring local audio playback failed:', error)
    }
  }

  return true
}

export const usePersistentAudioPlayer = () => {
  ensureAudio()

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    snapshotFromElement,
    pauseGlobal,
    resumeGlobal,
    stopGlobal,
    seekGlobal,
    setGlobalVolume,
    takeoverFromElement,
    restoreToElement
  }
}
