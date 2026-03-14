import { ref } from 'vue'

export const useMusic = () => {
  const musicList = ref([
    {
      blobKey: '鋒兄的傳奇人生.mp3',
      title: '鋒兄的傳奇人生',
      artist: '鋒兄',
      duration: '03:45',
      fileSize: 0,
      uploadedAt: '',
      blobExists: false,
      loading: false,
      error: false
    },
    {
      blobKey: '鋒兄進化Show🔥.mp3',
      title: '鋒兄進化Show🔥',
      artist: '鋒兄',
      duration: '04:10',
      fileSize: 0,
      uploadedAt: '',
      blobExists: false,
      loading: false,
      error: false
    }
  ])

  const statusMessage = ref('')
  const statusMessageType = ref('info')
  const checking = ref(false)

  const getMusicUrl = (blobKey) => {
    return `/api/blobs/music/${blobKey}`
  }

  const checkBlobsStatus = async () => {
    if (checking.value) return
    checking.value = true
    statusMessage.value = '正在檢查 Netlify Blobs 狀態...'
    statusMessageType.value = 'info'

    try {
      let existing = 0

      for (const track of musicList.value) {
        try {
          const response = await fetch(`/api/blobs/music/${track.blobKey}`, { method: 'HEAD' })
          track.blobExists = response.ok
          track.error = !response.ok
          if (response.ok) {
            existing += 1
          }
        } catch (error) {
          track.blobExists = false
          track.error = true
        }
      }

      const total = musicList.value.length

      if (existing === total && total > 0) {
        statusMessage.value = `所有音樂 (${existing}/${total}) 都已上傳到 Netlify Blobs`
        statusMessageType.value = 'success'
      } else if (existing > 0) {
        statusMessage.value = `部分音樂 (${existing}/${total}) 存在於 Netlify Blobs`
        statusMessageType.value = 'info'
      } else if (total === 0) {
        statusMessage.value = '目前尚未設定任何音樂曲目'
        statusMessageType.value = 'info'
      } else {
        statusMessage.value = '沒有音樂上傳到 Netlify Blobs，請先上傳'
        statusMessageType.value = 'error'
      }
    } catch (error) {
      statusMessage.value = `檢查失敗: ${error.message}`
      statusMessageType.value = 'error'
    } finally {
      checking.value = false
    }
  }

  return {
    musicList,
    statusMessage,
    statusMessageType,
    checking,
    getMusicUrl,
    checkBlobsStatus
  }
}
