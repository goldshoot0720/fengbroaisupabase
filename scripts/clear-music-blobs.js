import { getStore } from '@netlify/blobs'

async function clearMusicBlobs() {
  console.log('🗑️  清除音樂 Blobs...\n')

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

  try {
    const { blobs } = await store.list()
    
    console.log(`找到 ${blobs.length} 個文件需要刪除\n`)
    
    let deletedCount = 0
    
    for (const blob of blobs) {
      try {
        await store.delete(blob.key)
        console.log(`✅ 已刪除: ${decodeURIComponent(blob.key)}`)
        deletedCount++
      } catch (error) {
        console.log(`❌ 刪除失敗: ${blob.key} - ${error.message}`)
      }
    }
    
    console.log(`\n📊 刪除統計:`)
    console.log(`   成功: ${deletedCount}/${blobs.length}`)
    console.log(`   失敗: ${blobs.length - deletedCount}/${blobs.length}`)
    
    if (deletedCount === blobs.length) {
      console.log('\n✅ 所有文件已清除！')
    }
    
  } catch (error) {
    console.error('❌ 清除失敗:', error.message)
  }
}

clearMusicBlobs()
