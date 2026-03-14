// 診斷 Netlify Blobs 內容
async function diagnoseBlobs() {
  console.log('🔍 診斷 Netlify Blobs 內容...\n')
  
  try {
    const { getStore } = await import('@netlify/blobs')
    const store = getStore('videos')
    
    const testVideos = [
      '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
      'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4'
    ]
    
    for (const blobKey of testVideos) {
      console.log(`📹 診斷影片: ${blobKey}`)
      
      try {
        // 獲取 blob 內容
        const blob = await store.get(blobKey)
        
        if (blob) {
          console.log(`   ✅ Blob 存在`)
          
          // 檢查 blob 類型
          console.log(`   📊 Blob 類型: ${typeof blob}`)
          console.log(`   📊 Blob 構造函數: ${blob.constructor.name}`)
          
          // 如果是 ArrayBuffer 或 Uint8Array，檢查大小
          if (blob instanceof ArrayBuffer) {
            console.log(`   📏 ArrayBuffer 大小: ${blob.byteLength} bytes`)
            
            // 檢查前幾個字節（MP4 文件頭）
            const view = new Uint8Array(blob.slice(0, 12))
            const header = Array.from(view).map(b => b.toString(16).padStart(2, '0')).join(' ')
            console.log(`   🔍 文件頭 (前12字節): ${header}`)
            
            // MP4 文件應該在第4-7字節包含 "ftyp"
            const ftypCheck = new TextDecoder().decode(blob.slice(4, 8))
            console.log(`   🎬 MP4 標識: "${ftypCheck}" ${ftypCheck === 'ftyp' ? '✅' : '❌'}`)
            
          } else if (blob instanceof Uint8Array) {
            console.log(`   📏 Uint8Array 大小: ${blob.length} bytes`)
            
            // 檢查前幾個字節
            const header = Array.from(blob.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join(' ')
            console.log(`   🔍 文件頭 (前12字節): ${header}`)
            
            // MP4 文件檢查
            const ftypCheck = new TextDecoder().decode(blob.slice(4, 8))
            console.log(`   🎬 MP4 標識: "${ftypCheck}" ${ftypCheck === 'ftyp' ? '✅' : '❌'}`)
            
          } else if (typeof blob === 'string') {
            console.log(`   📏 字符串長度: ${blob.length}`)
            console.log(`   📄 前100字符: ${blob.substring(0, 100)}`)
            console.log(`   ❌ 警告: Blob 是字符串，不是二進制數據！`)
            
          } else {
            console.log(`   📊 Blob 內容: ${blob}`)
          }
          
          // 嘗試獲取元數據
          try {
            const metadata = await store.getMetadata(blobKey)
            if (metadata) {
              console.log(`   📋 元數據:`)
              for (const [key, value] of Object.entries(metadata)) {
                console.log(`      ${key}: ${value}`)
              }
            }
          } catch (metaError) {
            console.log(`   ⚠️  無法獲取元數據: ${metaError.message}`)
          }
          
        } else {
          console.log(`   ❌ Blob 不存在`)
        }
        
      } catch (error) {
        console.log(`   ❌ 診斷失敗: ${error.message}`)
      }
      
      console.log('')
    }
    
    // 測試本地文件作為對比
    console.log('📁 對比本地文件...')
    
    try {
      const fs = await import('fs/promises')
      const localFile = './public/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4'
      
      const stats = await fs.stat(localFile)
      console.log(`   📏 本地文件大小: ${stats.size} bytes`)
      
      const buffer = await fs.readFile(localFile)
      console.log(`   📊 Buffer 類型: ${buffer.constructor.name}`)
      console.log(`   📏 Buffer 大小: ${buffer.length} bytes`)
      
      // 檢查文件頭
      const header = Array.from(buffer.slice(0, 12)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      console.log(`   🔍 本地文件頭: ${header}`)
      
      const ftypCheck = buffer.slice(4, 8).toString('utf8')
      console.log(`   🎬 本地 MP4 標識: "${ftypCheck}" ${ftypCheck === 'ftyp' ? '✅' : '❌'}`)
      
    } catch (fileError) {
      console.log(`   ⚠️  無法讀取本地文件: ${fileError.message}`)
    }
    
  } catch (error) {
    console.error('❌ 診斷失敗:', error.message)
  }
}

diagnoseBlobs()