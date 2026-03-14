// 檢查 Netlify Blobs 中的影片狀態

// 格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
function formatDate(dateString) {
  return new Date(dateString).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

async function checkBlobs() {
  console.log('🔍 檢查 Netlify Blobs 中的影片狀態...\n')
  
  try {
    // 嘗試導入 @netlify/blobs
    const { getStore } = await import('@netlify/blobs')
    
    // 獲取 Netlify Blobs store
    const store = getStore('videos')
    
    // 預期的影片列表 - 使用原始檔名
    const expectedVideos = {
      '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4': '鋒兄的傳奇人生',
      'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4': '鋒兄進化Show🔥'
    }
    
    let foundCount = 0
    let totalSize = 0
    
    console.log('📋 影片檢查結果:')
    console.log('=' .repeat(80))
    
    for (const [blobKey, displayName] of Object.entries(expectedVideos)) {
      try {
        console.log(`\n🎬 ${displayName}`)
        console.log(`   Blob Key: ${blobKey}`)
        
        // 檢查 blob 是否存在
        const blob = await store.get(blobKey)
        
        if (blob) {
          foundCount++
          
          // 獲取 blob 資訊
          const metadata = await store.getMetadata(blobKey)
          const blobSize = blob.size || (blob instanceof ArrayBuffer ? blob.byteLength : 0)
          totalSize += blobSize
          
          console.log(`   ✅ 狀態: 已存在`)
          console.log(`   📏 大小: ${formatFileSize(blobSize)}`)
          
          if (metadata) {
            if (metadata.uploadedAt) {
              console.log(`   📅 上傳時間: ${formatDate(metadata.uploadedAt)}`)
            }
            if (metadata.contentType) {
              console.log(`   🎞️  內容類型: ${metadata.contentType}`)
            }
          }
          
          // 生成訪問 URL
          const accessUrl = `/.netlify/blobs/${blobKey}`
          console.log(`   🔗 訪問 URL: ${accessUrl}`)
          
        } else {
          console.log(`   ❌ 狀態: 不存在`)
          console.log(`   💡 提示: 請運行 'npm run upload-videos' 上傳此影片`)
        }
        
      } catch (error) {
        console.log(`   ❌ 狀態: 檢查失敗`)
        console.log(`   🚨 錯誤: ${error.message}`)
      }
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('📊 統計資訊:')
    console.log(`   找到影片: ${foundCount}/${Object.keys(expectedVideos).length}`)
    console.log(`   總大小: ${formatFileSize(totalSize)}`)
    
    if (foundCount === Object.keys(expectedVideos).length) {
      console.log('\n🎉 所有影片都已成功上傳到 Netlify Blobs！')
      console.log('💡 現在可以在網站上正常播放影片了')
    } else {
      console.log('\n⚠️  部分影片尚未上傳，請執行以下步驟:')
      console.log('1. 將影片檔案放置在 videos/ 目錄中')
      console.log('2. 運行 npm run upload-videos 上傳影片')
      console.log('3. 重新運行此檢查腳本確認狀態')
    }
    
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('💥 @netlify/blobs 套件未安裝')
      console.log('\n🔧 請先安裝必要的依賴:')
      console.log('1. 安裝 @netlify/blobs: npm install @netlify/blobs')
      console.log('2. 如果遇到 PowerShell 執行策略問題，請嘗試:')
      console.log('   - 使用 CMD 而非 PowerShell')
      console.log('   - 或設置執行策略: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser')
      console.log('   - 或使用 yarn: yarn add @netlify/blobs')
    } else {
      console.error('💥 檢查過程發生錯誤:', error)
      console.log('\n🔧 可能的原因:')
      console.log('1. Netlify Blobs 功能未啟用')
      console.log('2. 沒有適當的 Netlify 權限')
      console.log('3. 網路連接問題')
      console.log('4. @netlify/blobs 依賴未正確安裝')
    }
  }
}

// 執行檢查
checkBlobs()