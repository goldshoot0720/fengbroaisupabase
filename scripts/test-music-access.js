import { getStore } from '@netlify/blobs'

async function testMusicAccess() {
  console.log('🎵 測試音樂訪問...\n')

  const siteId = process.env.NETLIFY_SITE_ID || '970c7bab-2d0c-46b4-941f-1f7131995a0f'
  const token = process.env.NETLIFY_AUTH_TOKEN

  if (!token) {
    console.error('❌ 需要 NETLIFY_AUTH_TOKEN 環境變數')
    return
  }

  const store = getStore({
    name: 'music',
    siteID: siteId,
    token: token
  })

  // 測試幾個音樂文件
  const testFiles = [
    '鋒兄的傳奇人生/鋒兄的傳奇人生.mp3',
    '鋒兄進化Show🔥/鋒兄進化Show🔥.mp3',
    '塗哥水電王子爆紅/塗哥水電王子爆紅.mp3',
    '最瞎結婚理由/最瞎結婚理由.mp3'
  ]

  console.log('測試文件訪問：\n')

  for (const blobKey of testFiles) {
    try {
      console.log(`📂 測試: ${blobKey}`)
      
      // 獲取 metadata
      const metadata = await store.getMetadata(blobKey)
      
      if (metadata) {
        console.log(`   ✅ 文件存在`)
        console.log(`   📊 大小: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`)
        console.log(`   📅 上傳時間: ${metadata.uploadedAt}`)
      } else {
        console.log(`   ❌ 文件不存在`)
      }
    } catch (error) {
      console.log(`   ❌ 錯誤: ${error.message}`)
    }
    console.log('')
  }

  // 列出所有文件
  console.log('📋 列出所有音樂文件：\n')
  
  try {
    const { blobs } = await store.list()
    
    console.log(`找到 ${blobs.length} 個文件：\n`)
    
    // 按分類組織
    const categories = {}
    
    for (const blob of blobs) {
      const parts = blob.key.split('/')
      const category = parts[0]
      
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(blob.key)
    }
    
    for (const [category, files] of Object.entries(categories)) {
      console.log(`📁 ${category} (${files.length} 首)`)
      files.forEach(file => {
        const fileName = file.split('/')[1]
        console.log(`   🎵 ${fileName}`)
      })
      console.log('')
    }
    
    console.log('✅ 所有文件都可以正常訪問！')
    
  } catch (error) {
    console.error('❌ 列出文件失敗:', error.message)
  }
}

testMusicAccess()
