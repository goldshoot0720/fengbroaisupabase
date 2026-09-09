/**
 * 鋒兄 Tube channel defaults & helpers.
 * Synced with fengbroaiappwrite: product no longer ships a long default channel list.
 */

export type FengTubeChannel = {
  id: string
  label: string
  handle: string
  url: string
}

/** Handles previously shipped as defaults; stripped from saved channel lists on load. */
export const REMOVED_FENG_TUBE_HANDLES = new Set([
  'libertas1984',
  'sunlao',
  'blackwhite_raven',
  'informant510',
  'ma-siku',
  'monsterise',
  'tankman2020',
  'tengumedia',
])

/** Empty product default — users add channels themselves. */
export const FENG_TUBE_CHANNELS: FengTubeChannel[] = []

export const FENG_TUBE_ACTIVE_TOOL_KEY = 'feng-tools-active-tool'

export function getFengTubeHandleFromUrl(url: string) {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname)
    return pathname.match(/^\/@([^/]+)/)?.[1].toLowerCase() || ''
  } catch {
    return ''
  }
}

/** Drop channels that were removed from the product default list. */
export function stripRemovedFengTubeChannels(channels: FengTubeChannel[]) {
  return channels.filter((channel) => {
    const handle = (channel.handle || '').replace(/^@/, '').toLowerCase()
    const fromUrl = getFengTubeHandleFromUrl(channel.url)
    return !REMOVED_FENG_TUBE_HANDLES.has(handle) && !REMOVED_FENG_TUBE_HANDLES.has(fromUrl)
  })
}

/** 超過三個月（以 90 天計）沒有新影片，就視為停更頻道並提示使用者。 */
export const FENG_TUBE_STALE_DAYS = 90

/** 頻道清單在 localStorage 的鍵值；首頁提醒與工具頁共用同一份。 */
export const FENG_TUBE_CHANNELS_STORAGE_KEY = 'fengbro-tools-tube-channels'

export type FengTubeFreshness = {
  /** 最新一部影片的發布時間；抓不到任何影片時為空字串。 */
  latestPublished: string
  /** 距離最新影片的天數；無影片時為 null。 */
  daysSinceLatest: number | null
  /** 是否超過 FENG_TUBE_STALE_DAYS 沒有更新。 */
  isStale: boolean
}

/** 由影片發布時間清單算出頻道的更新狀態（純函式，方便測試）。 */
export function getFengTubeFreshness(
  publishedList: string[],
  now: number = Date.now(),
): FengTubeFreshness {
  let latestTime = 0
  let latestPublished = ''

  for (const published of publishedList || []) {
    const time = new Date(published).getTime()
    if (!Number.isFinite(time) || time <= latestTime) continue
    latestTime = time
    latestPublished = published
  }

  if (!latestPublished) {
    return { latestPublished: '', daysSinceLatest: null, isStale: false }
  }

  const daysSinceLatest = Math.max(0, Math.floor((now - latestTime) / (24 * 60 * 60 * 1000)))
  return {
    latestPublished,
    daysSinceLatest,
    isStale: daysSinceLatest > FENG_TUBE_STALE_DAYS,
  }
}
