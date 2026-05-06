import { FENG_TUBE_CHANNELS } from '../../../utils/fengTubeChannels'

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0 Safari/537.36',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8'
}

const CACHE_TTL_MS = 15 * 60 * 1000
const NEW_VIDEO_WINDOW_DAYS = 3
const MAX_VIDEOS_PER_CHANNEL = 10

type TubeVideo = {
  id: string
  title: string
  url: string
  published: string
  updated: string
  thumbnail: string
  isNew: boolean
}

type TubeChannelResult = {
  id: string
  label: string
  handle: string
  url: string
  channelId: string | null
  videos: TubeVideo[]
  downfallIndexUpdate: {
    hasUpdate: boolean
    value: number | null
    title: string
    videoUrl: string
  }
  error: string
}

type TubeResponse = {
  fetchedAt: string
  newWindowDays: number
  channels: TubeChannelResult[]
  newVideos: Array<TubeVideo & { channelId: string, channelLabel: string, channelUrl: string }>
}

let tubeCache: { expiresAt: number, data: TubeResponse } | null = null

const decodeEntities = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')

const fetchText = async (url: string) => {
  const response = await fetch(url, { headers: DEFAULT_HEADERS })
  if (!response.ok) {
    throw new Error(`抓取失敗：${response.status}`)
  }

  return await response.text()
}

const extractTag = (xml: string, tagName: string) => {
  const escapedTag = tagName.replace(':', '\\:')
  return decodeEntities(xml.match(new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'))?.[1]?.trim() || '')
}

const extractLink = (entry: string) => decodeEntities(entry.match(/<link[^>]+href="([^"]+)"/i)?.[1]?.trim() || '')

const isWithinNewWindow = (published: string) => {
  const date = new Date(published)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= NEW_VIDEO_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

const parseFeed = (xml: string): TubeVideo[] => {
  return xml
    .split(/<entry>/i)
    .slice(1)
    .map((chunk) => {
      const entry = chunk.split(/<\/entry>/i)[0] || ''
      const id = extractTag(entry, 'yt:videoId')
      const published = extractTag(entry, 'published')

      return {
        id,
        title: extractTag(entry, 'title') || '未命名影片',
        url: extractLink(entry) || (id ? `https://www.youtube.com/watch?v=${id}` : ''),
        published,
        updated: extractTag(entry, 'updated'),
        thumbnail: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '',
        isNew: isWithinNewWindow(published)
      }
    })
    .filter(video => video.id && video.url)
    .slice(0, MAX_VIDEOS_PER_CHANNEL)
}

const createDownfallIndexUpdate = (channelId: string, videos: TubeVideo[]) => {
  if (channelId !== 'henren778') {
    return {
      hasUpdate: false,
      value: null,
      title: '',
      videoUrl: ''
    }
  }

  const indexValuePattern = '[\\d０-９]+(?:[\\.．][\\d０-９]+)?'
  const indexTitlePattern = new RegExp(`倒台指[數数][^\\d０-９]{0,12}(${indexValuePattern})`, 'i')
  const matchedVideo = videos.find(video => indexTitlePattern.test(video.title))
  const rawValue = matchedVideo?.title.match(indexTitlePattern)?.[1] || ''
  const value = rawValue
    ? Number(rawValue
      .replace(/[０-９]/g, char => String(char.charCodeAt(0) - 0xFF10))
      .replace(/．/g, '.'))
    : null

  return {
    hasUpdate: Boolean(matchedVideo),
    value: Number.isFinite(value) ? value : null,
    title: matchedVideo?.title || '',
    videoUrl: matchedVideo?.url || ''
  }
}

const extractChannelId = (html: string) => {
  return html.match(/<meta itemprop="channelId" content="([^"]+)"/i)?.[1] ||
    html.match(/"browseId":"(UC[^"]+)"/i)?.[1] ||
    html.match(/"channelId":"(UC[^"]+)"/i)?.[1] ||
    null
}

const fetchChannelVideos = async (channel: typeof FENG_TUBE_CHANNELS[number]): Promise<TubeChannelResult> => {
  try {
    const channelHtml = await fetchText(channel.url)
    const channelId = extractChannelId(channelHtml)

    if (!channelId) {
      throw new Error('找不到頻道 ID')
    }

    const feedXml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`)

    const videos = parseFeed(feedXml)

    return {
      ...channel,
      channelId,
      videos,
      downfallIndexUpdate: createDownfallIndexUpdate(channel.id, videos),
      error: ''
    }
  } catch (error: any) {
    return {
      ...channel,
      channelId: null,
      videos: [],
      downfallIndexUpdate: createDownfallIndexUpdate(channel.id, []),
      error: error?.message || '抓取頻道失敗'
    }
  }
}

export default defineEventHandler(async () => {
  const now = Date.now()
  if (tubeCache && tubeCache.expiresAt > now) return tubeCache.data

  const channels = await Promise.all(FENG_TUBE_CHANNELS.map(fetchChannelVideos))
  const newVideos = channels.flatMap(channel =>
    channel.videos
      .filter(video => video.isNew)
      .map(video => ({
        ...video,
        channelId: channel.id,
        channelLabel: channel.label,
        channelUrl: channel.url
      }))
  )

  const data = {
    fetchedAt: new Date().toISOString(),
    newWindowDays: NEW_VIDEO_WINDOW_DAYS,
    channels,
    newVideos
  }

  tubeCache = {
    expiresAt: now + CACHE_TTL_MS,
    data
  }

  return data
})
