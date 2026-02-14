import { readFile, stat, readdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function walkForMp3(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const subFiles = await walkForMp3(fullPath)
      files.push(...subFiles)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp3')) {
      files.push(fullPath)
    }
  }

  return files
}

async function uploadMusic() {
  console.log('🚀 上傳音樂到 Netlify Blobs (music store)...\n')

  // 檢查 Netlify CLI 是否已登入
  try {
    const status = execSync('netlify status', { encoding: 'utf-8' })
    if (!status.includes('Current project:')) {
      console.error('❌ Netlify CLI 未連接到項目')
      console.log('請先執行: netlify link')
      return
    }
    console.log('✅ Netlify CLI 已連接\n')
  } catch (error) {
    console.error('❌ Netlify CLI 未登入或未安裝')
    console.log('請先執行: netlify login')
    return
  }

  // 從 Netlify CLI 獲取站點 ID
  let siteId = process.env.NETLIFY_SITE_ID
  if (!siteId) {
    try {
      const status = execSync('netlify status', { encoding: 'utf-8' })
      const match = status.match(/Project Id:\s+([a-f0-9-]+)/)
      if (match) {
        siteId = match[1]
        console.log(`📋 使用站點 ID: ${siteId}\n`)
      }
    } catch (error) {
      console.error('❌ 無法獲取站點 ID')
      return
    }
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const baseDir = path.resolve(__dirname, '..', 'public', 'music')

  try {
    const mp3Files = await walkForMp3(baseDir)

    if (mp3Files.length === 0) {
      console.log('📭 在 public/music 資料夾中找不到任何 .mp3 檔案')
      return
    }

    console.log(`🎵 發現 ${mp3Files.length} 個音樂檔案：\n`)

    const { getStore } = await import('@netlify/blobs')
    
    // 使用 Netlify CLI 的憑證
    const store = getStore({
      name: 'music',
      siteID: siteId
    })

    let successCount = 0

    for (const fullPath of mp3Files) {
      const relativePath = path.relative(baseDir, fullPath)
      const blobKey = relativePath.replace(/\\/g, '/')

      console.log(`🎶 處理音樂檔案:`)
      console.log(`   本地路徑: ${fullPath}`)
      console.log(`   Blob Key: ${blobKey}`)

      try {
        const fileStats = await stat(fullPath)
        console.log(`   檔案大小: ${formatFileSize(fileStats.size)}`)

        const buffer = await readFile(fullPath)
        const binaryData = new Uint8Array(buffer)

        await store.set(blobKey, binaryData, {
          metadata: {
            contentType: 'audio/mpeg',
            fileSize: binaryData.length,
            uploadedAt: new Date().toISOString(),
            environment: 'production',
            encoding: 'binary'
          }
        })

        console.log('   ✅ 上傳成功！')
        successCount++
      } catch (error) {
        console.error(`   ❌ 上傳失敗: ${error.message}`)
      }

      console.log('')
    }

    console.log('📊 上傳結果統計:')
    console.log(`   成功: ${successCount}/${mp3Files.length}`)
    console.log(`   失敗: ${mp3Files.length - successCount}/${mp3Files.length}`)

    if (successCount === mp3Files.length) {
      console.log('\n🎉 所有音樂檔案上傳完成！')
      console.log('\n📍 查看已上傳的音樂:')
      console.log('   https://app.netlify.com/projects/nuxtkiro20251215/blobs/site:music')
    } else {
      console.log('\n⚠️  部分音樂上傳失敗，請檢查錯誤訊息並重試')
    }
  } catch (error) {
    console.error('💥 上傳音樂過程發生錯誤:', error)
    console.error('錯誤詳情:', error.stack)
  }
}

uploadMusic()
