// 測試 Netlify Blobs 連接
async function testConnection() {
  console.log('🔌 測試 Netlify Blobs 連接...\n')
  
  try {
    // 嘗試導入 @netlify/blobs
    const { getStore } = await import('@netlify/blobs')
    
    // 獲取 Netlify Blobs store
    const store = getStore('videos')
    
    // 測試寫入一個小檔案
    const testKey = 'test-connection.txt'
    const testContent = `Netlify Blobs 連接測試\n時間: ${new Date().toISOString()}`
    
    console.log('📝 寫入測試檔案...')
    await store.set(testKey, testContent, {
      metadata: {
        contentType: 'text/plain',
        testFile: true
      }
    })
    console.log('✅ 寫入成功')
    
    // 測試讀取
    console.log('📖 讀取測試檔案...')
    const retrievedContent = await store.get(testKey)
    
    if (retrievedContent) {
      console.log('✅ 讀取成功')
      console.log(`📄 內容: ${retrievedContent}`)
    } else {
      console.log('❌ 讀取失敗')
    }
    
    // 清理測試檔案
    console.log('🧹 清理測試檔案...')
    await store.delete(testKey)
    console.log('✅ 清理完成')
    
    console.log('\n🎉 Netlify Blobs 連接測試成功！')
    console.log('💡 現在可以安全地上傳影片檔案了')
    
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('❌ @netlify/blobs 套件未安裝')
      console.log('\n🔧 請先安裝必要的依賴:')
      console.log('1. 安裝 @netlify/blobs: npm install @netlify/blobs')
      console.log('2. 如果遇到 PowerShell 執行策略問題，請嘗試:')
      console.log('   - 使用 CMD 而非 PowerShell')
      console.log('   - 或設置執行策略: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser')
      console.log('   - 或使用 yarn: yarn add @netlify/blobs')
      console.log('\n📋 替代方案:')
      console.log('1. 在 Netlify 控制台手動上傳影片到 Blobs')
      console.log('2. 或在部署後的 Netlify 環境中運行上傳腳本')
    } else {
      console.error('❌ Netlify Blobs 連接測試失敗:', error.message)
      
      if (error.message.includes('MissingBlobsEnvironmentError')) {
        console.log('\n🔧 Netlify Blobs 環境配置問題:')
        console.log('1. 本地開發需要 Netlify CLI 環境')
        console.log('2. 請按照以下步驟配置:')
        console.log('')
        console.log('   步驟 1: 安裝 Netlify CLI')
        console.log('   npm install -g netlify-cli')
        console.log('')
        console.log('   步驟 2: 登入 Netlify')
        console.log('   netlify login')
        console.log('')
        console.log('   步驟 3: 連結專案')
        console.log('   netlify link')
        console.log('')
        console.log('   步驟 4: 在 Netlify 環境中運行')
        console.log('   netlify dev')
        console.log('')
        console.log('📋 替代方案:')
        console.log('1. 直接在 Netlify 部署後的環境中上傳影片')
        console.log('2. 使用 Netlify 控制台手動上傳到 Blobs')
        console.log('3. 將影片放在 public/videos/ 目錄中')
      } else {
        console.log('\n🔧 故障排除建議:')
        console.log('1. 確保 Netlify 專案已啟用 Blobs 功能')
        console.log('2. 確保在 Netlify 環境中運行或已正確配置本地環境')
        console.log('3. 檢查 Netlify CLI 是否已登入: netlify login')
        console.log('4. 檢查專案是否已連結到 Netlify: netlify link')
      }
    }
  }
}

// 執行測試
testConnection()