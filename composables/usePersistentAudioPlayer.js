import { ref } from 'vue'

const currentTrack = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)

let audio = null

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
  const instance = ensureAudio()
  if (!instance) return
  instance.pause()
}

const resumeGlobal = async () => {
  const instance = ensureAudio()
  if (!instance || !currentTrack.value?.src) return
  try {
    await instance.play()
  } catch (error) {
    console.warn('Persistent audio resume failed:', error)
  }
}

const stopGlobal = () => {
  const instance = ensureAudio()
  if (!instance) return
  instance.pause()
  instance.removeAttribute('src')
  instance.load()
  currentTrack.value = null
  currentTime.value = 0
  duration.value = 0
  isPlaying.value = false
}

const seekGlobal = (time) => {
  const instance = ensureAudio()
  if (!instance) return
  instance.currentTime = Number(time) || 0
  currentTime.value = instance.currentTime
}

const setGlobalVolume = (nextVolume) => {
  const instance = ensureAudio()
  if (!instance) return
  const normalized = Math.min(1, Math.max(0, Number(nextVolume) || 0))
  instance.volume = normalized
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
  } catch (error) {
    console.warn('Persistent audio takeover failed:', error)
  }
}

const restoreToElement = async (element, track) => {
  if (!element || !track) return false
  if (!currentTrack.value || currentTrack.value.id !== track.id) return false

  const instance = ensureAudio()
  if (!instance) return false

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
