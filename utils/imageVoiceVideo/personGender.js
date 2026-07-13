/**
 * Client-side single-person gender detection for auto voice selection.
 * Uses @vladmandic/face-api (TinyFaceDetector + ageGenderNet).
 * Models load from /face-api-models. Default voice is male when inconclusive.
 */

export const DEFAULT_VOICE_GENDER = 'male'

/** Served from /public/face-api-models (tiny face + age/gender only) */
const MODEL_URL = '/face-api-models'
const MIN_GENDER_PROB = 0.55

let loadPromise = null

async function ensureFaceApi() {
  if (typeof window === 'undefined') {
    throw new Error('face detection is browser-only')
  }
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    // Prefer browser ESM build (package main points at Node which needs tfjs-node)
    const faceapi = await import('@vladmandic/face-api/dist/face-api.esm.js')
    // Prefer WebGL; fall back silently if unavailable
    try {
      if (faceapi.tf?.setBackend) {
        await faceapi.tf.setBackend('webgl')
        await faceapi.tf.ready()
      }
    } catch {
      try {
        if (faceapi.tf?.setBackend) {
          await faceapi.tf.setBackend('cpu')
          await faceapi.tf.ready()
        }
      } catch {
        /* use library default */
      }
    }
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
    ])
    return faceapi
  })().catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}

/**
 * Detect gender when the image shows exactly one face.
 *
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imageEl
 * @returns {Promise<{
 *   gender: 'male'|'female'|null,
 *   faceCount: number,
 *   probability: number|null,
 *   reason: 'single'|'none'|'multiple'|'low_confidence'|'error'|'no_image',
 *   message: string
 * }>}
 */
export async function detectSinglePersonGender(imageEl) {
  if (!imageEl || !imageEl.width || !imageEl.height) {
    return {
      gender: null,
      faceCount: 0,
      probability: null,
      reason: 'no_image',
      message: '尚無圖片，使用預設男聲'
    }
  }

  try {
    const faceapi = await ensureFaceApi()
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.45
    })
    const results = await faceapi
      .detectAllFaces(imageEl, options)
      .withAgeAndGender()

    if (!results.length) {
      return {
        gender: null,
        faceCount: 0,
        probability: null,
        reason: 'none',
        message: '未偵測到人臉，使用預設男聲'
      }
    }

    if (results.length > 1) {
      return {
        gender: null,
        faceCount: results.length,
        probability: null,
        reason: 'multiple',
        message: `偵測到 ${results.length} 張人臉，使用預設男聲`
      }
    }

    const face = results[0]
    const raw = String(face.gender || '').toLowerCase()
    const probability = Number(face.genderProbability) || 0
    const gender = raw === 'male' || raw === 'female' ? raw : null

    if (!gender || probability < MIN_GENDER_PROB) {
      return {
        gender: null,
        faceCount: 1,
        probability,
        reason: 'low_confidence',
        message: '單一人物性別不確定，使用預設男聲'
      }
    }

    return {
      gender,
      faceCount: 1,
      probability,
      reason: 'single',
      message:
        gender === 'male'
          ? '偵測到單一男性人物，自動使用男聲'
          : '偵測到單一女性人物，自動使用女聲'
    }
  } catch (err) {
    console.warn('[personGender] detect failed:', err)
    return {
      gender: null,
      faceCount: -1,
      probability: null,
      reason: 'error',
      message: '人臉偵測失敗，使用預設男聲'
    }
  }
}

/**
 * Resolve effective TTS gender for a track.
 * @param {'auto'|'male'|'female'|string} trackGender
 * @param {'male'|'female'|null|undefined} detectedGender
 * @returns {'male'|'female'}
 */
export function resolveTrackGender(trackGender, detectedGender) {
  if (trackGender === 'male' || trackGender === 'female') return trackGender
  if (trackGender === 'auto') {
    return detectedGender === 'female' ? 'female' : DEFAULT_VOICE_GENDER
  }
  // Legacy / unknown → default male
  return DEFAULT_VOICE_GENDER
}

/**
 * Resolve per-line gender (script prefix wins over track).
 * @param {{gender: string|null}} line
 * @param {{gender?: string}} track
 * @param {'male'|'female'|null|undefined} detectedGender
 */
export function resolveLineGender(line, track, detectedGender) {
  if (line?.gender === 'male' || line?.gender === 'female') return line.gender
  return resolveTrackGender(track?.gender, detectedGender)
}
