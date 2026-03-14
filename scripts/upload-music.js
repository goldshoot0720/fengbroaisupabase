import { readFile, stat, readdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

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

  const siteId = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_AUTH_TOKEN

  if (!siteId || !token) {
    console.error('❌ 缺少必要的環境變數:')
    console.log('   NETLIFY_SITE_ID:', siteId ? '✅' : '❌')
    console.log('   NETLIFY_AUTH_TOKEN:', token ? '✅' : '❌')
    console.log('')
    console.log('🔧 請設置環境變數後重新執行本命令，例如：')
    console.log('   set NETLIFY_SITE_ID=你的SiteID')
    console.log('   set NETLIFY_AUTH_TOKEN=your_token_here')
    console.log('')
    console.log('📋 也可以使用 Netlify CLI 在雲端環境中執行：')
    console.log('   netlify env:set NETLIFY_SITE_ID <site_id>')
    console.log('   netlify env:set NETLIFY_AUTH_TOKEN <token>')
    return
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
    const store = getStore({
      name: 'music',
      siteID: siteId,
      token: token
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
    } else {
      console.log('\n⚠️  部分音樂上傳失敗，請檢查錯誤訊息並重試')
    }
  } catch (error) {
    console.error('💥 上傳音樂過程發生錯誤:', error)
  }
}

uploadMusic()
