// 手動配置上傳影片到 Netlify Blobs 的腳本
import { readFile, stat } from 'fs/promises'

// 格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function uploadVideosManual() {
  console.log('🚀 手動上傳影片到 Netlify Blobs...\n')
  
  try {
    // 嘗試導入 @netlify/blobs
    const { getStore } = await import('@netlify/blobs')
    
    // 手動配置 Netlify Blobs（需要用戶提供）
    const siteID = process.env.NETLIFY_SITE_ID
    const token = process.env.NETLIFY_AUTH_TOKEN
    
    if (!siteID || !token) {
      console.error('❌ 缺少必要的環境變數')
      console.log('\n🔧 請設置以下環境變數:')
      console.log('1. NETLIFY_SITE_ID - 您的 Netlify 網站 ID')
      console.log('2. NETLIFY_AUTH_TOKEN - 您的 Netlify 個人存取權杖')
      console.log('\n📋 獲取方式:')
      console.log('1. 網站 ID: 在 Netlify 控制台 > Site settings > General > Site details')
      console.log('2. 存取權杖: 在 Netlify 控制台 > User settings > Applications > Personal access tokens')
      console.log('\n💡 設置方式:')
      console.log('Windows PowerShell:')
      console.log('$env:NETLIFY_SITE_ID="your-site-id"')
      console.log('$env:NETLIFY_AUTH_TOKEN="your-token"')
      console.log('\nWindows CMD:')
      console.log('set NETLIFY_SITE_ID=your-site-id')
      console.log('set NETLIFY_AUTH_TOKEN=your-token')
      return
    }
    
    // 獲取 Netlify Blobs store（手動配置）
    const store = getStore({
      name: 'videos',
      siteID: siteID,
      token: token
    })
    
    // 影片檔案對應 - 使用 public/videos 目錄
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
        console.log(`   📤 開始上傳...`)
        const videoBuffer = await readFile(videoInfo.localPath)
        
        // 上傳到 Netlify Blobs
        await store.set(blobKey, videoBuffer, {
          metadata: {
            contentType: 'video/mp4',
            displayName: videoInfo.displayName,
            uploadedAt: new Date().toISOString(),
            fileSize: videoBuffer.length
          }
        })
        
        console.log(`   ✅ 上傳成功！`)
        successCount++
        
        // 驗證上傳
        const uploadedBlob = await store.get(blobKey)
        if (uploadedBlob) {
          console.log(`   ✓ 驗證通過，檔案已存在於 Netlify Blobs`)
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
      console.log('💡 現在可以在網站上查看影片了')
      console.log('🗑️  可以考慮從 public/videos 目錄中刪除影片檔案以減少倉庫大小')
    } else {
      console.log('\n⚠️  部分影片上傳失敗，請檢查錯誤訊息並重試')
    }
    
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('💥 @netlify/blobs 套件未安裝')
      console.log('\n🔧 請先安裝必要的依賴:')
      console.log('1. 安裝 @netlify/blobs: npm install @netlify/blobs')
    } else {
      console.error('💥 上傳過程發生嚴重錯誤:', error)
      console.log('\n🔧 故障排除建議:')
      console.log('1. 確保 Netlify 專案已啟用 Blobs 功能')
      console.log('2. 確保環境變數設置正確')
      console.log('3. 確保有適當的 Netlify 權限')
      console.log('4. 檢查網路連接狀態')
    }
  }
}

// 執行上傳
uploadVideosManual()