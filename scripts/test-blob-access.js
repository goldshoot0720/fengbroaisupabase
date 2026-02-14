// 測試 Netlify Blobs 訪問
async function testBlobAccess() {
  console.log('🔍 測試 Netlify Blobs 訪問...\n')
  
  const testVideos = [
    '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
    'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4'
  ]
  
  for (const blobKey of testVideos) {
    console.log(`📹 測試影片: ${blobKey}`)
    
    try {
      // 測試直接 blob 訪問
      const blobUrl = `/api/blobs/${blobKey}`
      console.log(`   🔗 URL: ${blobUrl}`)
      
      const response = await fetch(`http://localhost:8888${blobUrl}`, {
        method: 'HEAD'
      })
      
      if (response.ok) {
        console.log(`   ✅ 訪問成功 (${response.status})`)
        console.log(`   📏 Content-Type: ${response.headers.get('content-type')}`)
        console.log(`   📦 Content-Length: ${response.headers.get('content-length')}`)
      } else {
        console.log(`   ❌ 訪問失敗 (${response.status})`)
        const text = await response.text()
        console.log(`   📄 錯誤: ${text}`)
      }
    } catch (error) {
      console.log(`   ❌ 請求失敗: ${error.message}`)
    }
    
    console.log('')
  }
}

// 檢查是否在 Netlify Dev 環境中運行
if (typeof fetch === 'undefined') {
  console.log('❌ 此腳本需要在 Netlify Dev 環境中運行')
  console.log('🔧 請使用: netlify dev --command "node scripts/test-blob-access.js"')
} else {
  testBlobAccess().catch(console.error)
}