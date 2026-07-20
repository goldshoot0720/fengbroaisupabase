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
