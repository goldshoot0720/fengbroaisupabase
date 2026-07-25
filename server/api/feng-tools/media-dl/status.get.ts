import { getToolStatus } from '../../../utils/ytDlpMedia'

export default defineEventHandler(async () => {
  const status = await getToolStatus()
  return {
    ...status,
    reference: 'https://github.com/huang1988pioneer/YoutubeBilibiliMP4MP3Converter',
    supported: {
      sites: ['YouTube', 'Bilibili'],
      formats: ['mp3', 'mp4'],
      mp4Quality: ['1080p', '4k'],
      maxUrls: 7
    }
  }
})
