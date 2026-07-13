// 測試生產環境 Netlify Blobs 訪問
async function testProductionBlobs() {
  console.log('🔍 測試生產環境 Netlify Blobs 訪問...\n')
  
  const testUrls = [
    'https://nuxtkiro20251215.netlify.app/api/blobs/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
    'https://nuxtkiro20251215.netlify.app/api/blobs/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4'
  ]
  
  for (const url of testUrls) {
    console.log(`📹 測試 URL: ${url}`)
    
    try {
      // 測試 HEAD 請求
      console.log('   🔍 HEAD 請求...')
      const headResponse = await fetch(url, { method: 'HEAD' })
      console.log(`   📊 狀態: ${headResponse.status} ${headResponse.statusText}`)
      console.log(`   📏 Content-Length: ${headResponse.headers.get('content-length') || '未設置'}`)
      console.log(`   🎬 Content-Type: ${headResponse.headers.get('content-type') || '未設置'}`)
      console.log(`   🔄 Cache-Control: ${headResponse.headers.get('cache-control') || '未設置'}`)
      
      if (headResponse.ok) {
        // 測試獲取前 100 字節
        console.log('   📥 測試前 100 字節...')
        const partialResponse = await fetch(url, {
          headers: { 'Range': 'bytes=0-99' }
        })
        
        if (partialResponse.ok) {
          const buffer = await partialResponse.arrayBuffer()
          console.log(`   📏 實際獲取: ${buffer.byteLength} 字節`)
          
          // 檢查 MP4 文件頭
          const view = new Uint8Array(buffer)
          if (view.length >= 8) {
            const ftypCheck = new TextDecoder().decode(view.slice(4, 8))
            console.log(`   🎬 MP4 標識: "${ftypCheck}" ${ftypCheck === 'ftyp' ? '✅' : '❌'}`)
            
            // 顯示文件頭
            const header = Array.from(view.slice(0, Math.min(12, view.length)))
              .map(b => b.toString(16).padStart(2, '0')).join(' ')
            console.log(`   🔍 文件頭: ${header}`)
          }
        } else {
          console.log(`   ❌ 部分請求失敗: ${partialResponse.status}`)
        }
      }
      
    } catch (error) {
      console.log(`   ❌ 測試失敗: ${error.message}`)
    }
    
    console.log('')
  }
}

// 檢查是否在瀏覽器環境中
if (typeof fetch !== 'undefined') {
  testProductionBlobs().catch(console.error)
} else {
  console.log('❌ 此腳本需要在支持 fetch API 的環境中運行')
  console.log('🔧 請在瀏覽器控制台中運行此腳本')
}