/** Minimum acceptable video bitrate (bits/sec) — 1 Mbps */
export const MIN_VIDEO_BITRATE_BPS = 1_024_000

/** Target video bitrate for MediaRecorder — 2.5 Mbps */
export const VIDEO_BITRATE_BPS = 2_500_000

/** Audio bitrate (bits/sec) */
export const AUDIO_BITRATE_BPS = 128_000

/** Export frame rate (must be ≥ 24) */
export const VIDEO_FPS = 30

/** Worker paint interval (ms) for ≥ VIDEO_FPS redraws per second */
export const FRAME_INTERVAL_MS = Math.floor(1000 / VIDEO_FPS)

export function mediaRecorderBitrateOptions() {
  return {
    videoBitsPerSecond: Math.max(VIDEO_BITRATE_BPS, MIN_VIDEO_BITRATE_BPS),
    audioBitsPerSecond: AUDIO_BITRATE_BPS
  }
}
