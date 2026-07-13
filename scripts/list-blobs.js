// 列出 Netlify Blobs 中的所有對象
async function listBlobs() {
  console.log('🔍 探索 Netlify Blobs 存儲...\n')
  
  try {
    // 嘗試導入 @netlify/blobs
    const { getStore } = await import('@netlify/blobs')
    
    // 獲取 Netlify Blobs store
    const store = getStore('videos')
    
    console.log('📋 正在列出所有 blob 對象...')
    
    // 嘗試列出所有 blobs
    try {
      const blobs = await store.list()
      
      if (blobs && blobs.length > 0) {
        console.log(`\n✅ 找到 ${blobs.length} 個對象:\n`)
        
        for (const blob of blobs) {
          console.log(`📄 ${blob.key}`)
          if (blob.metadata) {
            console.log(`   📊 元數據:`)
            for (const [key, value] of Object.entries(blob.metadata)) {
              console.log(`      ${key}: ${value}`)
            }
          }
          console.log(`   📅 最後修改: ${blob.lastModified || '未知'}`)
          console.log(`   📏 大小: ${blob.size ? formatFileSize(blob.size) : '未知'}`)
          console.log('')
        }
      } else {
        console.log('\n📭 Blob 存儲為空')
        console.log('💡 提示: 運行 npm run upload-videos 來上傳影片')
      }
      
    } catch (listError) {
      console.log('⚠️  無法使用 list() 方法，嘗試直接檢查已知的影片...\n')
      
      // 已知的影片列表
      const knownVideos = [
        '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
        'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4'
      ]
      
      let foundCount = 0
      
      for (const videoKey of knownVideos) {
        try {
          console.log(`🔍 檢查: ${videoKey}`)
          const blob = await store.get(videoKey, { type: 'stream' })
          
          if (blob) {
            console.log(`   ✅ 存在`)
            foundCount++
            
            // 嘗試獲取元數據
            try {
              const metadata = await store.getMetadata(videoKey)
              if (metadata) {
                console.log(`   📊 元數據:`)
                for (const [key, value] of Object.entries(metadata)) {
                  console.log(`      ${key}: ${value}`)
                }
              }
            } catch (metaError) {
              console.log(`   ⚠️  無法獲取元數據`)
            }
          } else {
            console.log(`   ❌ 不存在`)
          }
        } catch (error) {
          console.log(`   ❌ 檢查失敗: ${error.message}`)
        }
        console.log('')
      }
      
      console.log(`📊 統計: 找到 ${foundCount}/${knownVideos.length} 個影片`)
    }
    
  } catch (error) {
    console.error('❌ 探索 Netlify Blobs 失敗:', error.message)
    
    if (error.message.includes('MissingBlobsEnvironmentError')) {
      console.log('\n🔧 需要在 Netlify 環境中運行:')
      console.log('netlify dev --command "node scripts/list-blobs.js"')
    }
  }
}

// 格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 執行探索
listBlobs()