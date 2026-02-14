// 修復 Netlify Blobs 編碼問題
import { readFile } from 'fs/promises'

async function fixBlobEncoding() {
  console.log('🔧 修復 Netlify Blobs 編碼問題...\n')
  
  try {
    const { getStore } = await import('@netlify/blobs')
    const store = getStore('videos')
    
    const videos = [
      {
        blobKey: '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
        localPath: './public/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
        displayName: '鋒兄的傳奇人生'
      },
      {
        blobKey: 'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4',
        localPath: './public/videos/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4',
        displayName: '鋒兄進化Show🔥'
      }
    ]
    
    for (const video of videos) {
      console.log(`🎬 修復影片: ${video.displayName}`)
      console.log(`   Blob Key: ${video.blobKey}`)
      
      try {
        // 先刪除現有的 blob
        console.log('   🗑️  刪除現有 blob...')
        await store.delete(video.blobKey)
        
        // 讀取本地文件為 Buffer
        console.log('   📖 讀取本地文件...')
        const videoBuffer = await readFile(video.localPath)
        console.log(`   📏 文件大小: ${videoBuffer.length} bytes`)
        console.log(`   📊 Buffer 類型: ${videoBuffer.constructor.name}`)
        
        // 驗證這是一個有效的 MP4 文件
        const ftypCheck = videoBuffer.slice(4, 8).toString('utf8')
        console.log(`   🎬 MP4 驗證: "${ftypCheck}" ${ftypCheck === 'ftyp' ? '✅' : '❌'}`)
        
        if (ftypCheck !== 'ftyp') {
          console.log('   ❌ 警告: 文件可能不是有效的 MP4 格式')
        }
        
        // 重新上傳，確保使用正確的二進制格式
        console.log('   📤 重新上傳 (二進制模式)...')
        
        // 使用 Uint8Array 確保二進制數據
        const binaryData = new Uint8Array(videoBuffer)
        
        await store.set(video.blobKey, binaryData, {
          metadata: {
            contentType: 'video/mp4',
            displayName: video.displayName,
            uploadedAt: new Date().toISOString(),
            fileSize: binaryData.length,
            encoding: 'binary',
            fixed: true
          }
        })
        
        console.log('   ✅ 重新上傳成功')
        
        // 驗證上傳結果
        console.log('   🔍 驗證上傳結果...')
        const uploadedBlob = await store.get(video.blobKey, { type: 'arrayBuffer' })
        
        if (uploadedBlob) {
          console.log(`   📊 上傳後類型: ${typeof uploadedBlob}`)
          console.log(`   📏 上傳後大小: ${uploadedBlob.byteLength || uploadedBlob.length} bytes`)
          
          if (uploadedBlob instanceof ArrayBuffer) {
            const view = new Uint8Array(uploadedBlob.slice(4, 8))
            const ftypVerify = new TextDecoder().decode(view)
            console.log(`   🎬 上傳後 MP4 驗證: "${ftypVerify}" ${ftypVerify === 'ftyp' ? '✅' : '❌'}`)
          }
        } else {
          console.log('   ❌ 驗證失敗: 無法獲取上傳的 blob')
        }
        
      } catch (error) {
        console.error(`   ❌ 修復失敗: ${error.message}`)
      }
      
      console.log('')
    }
    
    console.log('🎉 修復完成！請測試影片播放功能。')
    
  } catch (error) {
    console.error('❌ 修復過程失敗:', error.message)
  }
}

fixBlobEncoding()