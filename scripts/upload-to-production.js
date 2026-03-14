// 直接上傳到生產環境 Netlify Blobs
import { readFile, stat } from 'fs/promises'

// 格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function uploadToProduction() {
  console.log('🚀 上傳影片到生產環境 Netlify Blobs...\n')
  
  // 檢查環境變數
  const siteId = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_AUTH_TOKEN
  
  if (!siteId || !token) {
    console.error('❌ 缺少必要的環境變數:')
    console.log('   NETLIFY_SITE_ID:', siteId ? '✅' : '❌')
    console.log('   NETLIFY_AUTH_TOKEN:', token ? '✅' : '❌')
    console.log('')
    console.log('🔧 請設置環境變數:')
    console.log('   set NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f')
    console.log('   set NETLIFY_AUTH_TOKEN=your_token_here')
    console.log('')
    console.log('📋 或使用 netlify CLI:')
    console.log('   netlify env:set NETLIFY_SITE_ID 970c7bab-2d0c-46b4-941f-1f7131995a0f')
    return
  }
  
  try {
    // 使用環境變數創建 store
    const { getStore } = await import('@netlify/blobs')
    const store = getStore({
      name: 'videos',
      siteID: siteId,
      token: token
    })
    
    // 影片檔案對應
    const videos = {
      '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4': {
        localPath: './public/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
        displayName: '鋒兄的傳奇人生'
      },
      'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4': {
        localPath: './public/videos/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4',
        displayName: '鋒兄進化Show🔥'
      }
    }
    
    let successCount = 0
    let totalCount = Object.keys(videos).length
    
    for (const [blobKey, videoInfo] of Object.entries(videos)) {
      try {
        console.log(`📹 處理影片: ${videoInfo.displayName}`)
        console.log(`   本地路徑: ${videoInfo.localPath}`)
        console.log(`   Blob Key: ${blobKey}`)
        
        // 檢查檔案是否存在
        try {
          const fileStats = await stat(videoInfo.localPath)
          console.log(`   檔案大小: ${formatFileSize(fileStats.size)}`)
        } catch (error) {
          console.error(`❌ 檔案不存在: ${videoInfo.localPath}`)
          console.log(`   請確保影片檔案已放置在正確位置\n`)
          continue
        }
        
        // 讀取本地影片檔案
        console.log(`   📤 開始上傳到生產環境...`)
        const videoBuffer = await readFile(videoInfo.localPath)
        
        // 驗證 MP4 格式
        const ftypCheck = videoBuffer.slice(4, 8).toString('utf8')
        console.log(`   🎬 MP4 驗證: "${ftypCheck}" ${ftypCheck === 'ftyp' ? '✅' : '❌'}`)
        
        // 轉換為 Uint8Array 確保二進制數據
        const binaryData = new Uint8Array(videoBuffer)
        
        // 上傳到生產環境 Netlify Blobs
        await store.set(blobKey, binaryData, {
          metadata: {
            contentType: 'video/mp4',
            displayName: videoInfo.displayName,
            uploadedAt: new Date().toISOString(),
            fileSize: binaryData.length,
            environment: 'production',
            encoding: 'binary'
          }
        })
        
        console.log(`   ✅ 上傳成功！`)
        successCount++
        
        // 驗證上傳
        const uploadedBlob = await store.get(blobKey, { type: 'arrayBuffer' })
        if (uploadedBlob) {
          console.log(`   ✓ 驗證通過，檔案已存在於生產環境 Netlify Blobs`)
          console.log(`   📏 上傳後大小: ${uploadedBlob.byteLength || uploadedBlob.length} bytes`)
        }
        
      } catch (error) {
        console.error(`   ❌ 上傳失敗: ${error.message}`)
      }
      
      console.log('') // 空行分隔
    }
    
    console.log('📊 上傳結果統計:')
    console.log(`   成功: ${successCount}/${totalCount}`)
    console.log(`   失敗: ${totalCount - successCount}/${totalCount}`)
    
    if (successCount === totalCount) {
      console.log('\n🎉 所有影片上傳完成！')
      console.log('💡 現在可以在生產網站上查看影片了')
      console.log('🔗 測試 URL:')
      console.log('   https://nuxtkiro20251215.netlify.app/api/blobs/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4')
      console.log('   https://nuxtkiro20251215.netlify.app/api/blobs/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4')
    } else {
      console.log('\n⚠️  部分影片上傳失敗，請檢查錯誤訊息並重試')
    }
    
  } catch (error) {
    console.error('💥 上傳過程發生嚴重錯誤:', error)
    console.log('\n🔧 故障排除建議:')
    console.log('1. 確保已安裝 @netlify/blobs 依賴')
    console.log('2. 確保 Netlify 專案已啟用 Blobs 功能')
    console.log('3. 確保有適當的 Netlify 權限')
    console.log('4. 檢查網路連接狀態')
    console.log('5. 確認 NETLIFY_SITE_ID 和 NETLIFY_AUTH_TOKEN 正確')
  }
}

// 執行上傳
uploadToProduction()