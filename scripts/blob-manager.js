// Netlify Blobs 管理工具
import { readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'

// 格式化檔案大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 已知的影片配置
const knownVideos = [
  {
    blobKey: '19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4',
    displayName: '鋒兄的傳奇人生',
    localPath: './public/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4'
  },
  {
    blobKey: 'clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4',
    displayName: '鋒兄進化Show🔥',
    localPath: './public/videos/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4'
  }
]

class BlobManager {
  constructor() {
    this.store = null
  }

  async init() {
    try {
      const { getStore } = await import('@netlify/blobs')
      this.store = getStore('videos')
      return true
    } catch (error) {
      console.error('❌ 無法初始化 Netlify Blobs:', error.message)
      return false
    }
  }

  async listAll() {
    console.log('🔍 探索 Netlify Blobs 存儲...\n')
    
    if (!this.store) {
      console.error('❌ Blob store 未初始化')
      return
    }

    try {
      // 嘗試使用 list() 方法
      const blobs = await this.store.list()
      
      if (blobs && blobs.length > 0) {
        console.log(`✅ 找到 ${blobs.length} 個對象:\n`)
        
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
        return blobs
      } else {
        console.log('📭 Blob 存儲為空')
        return []
      }
    } catch (error) {
      console.log('⚠️  無法使用 list() 方法，嘗試檢查已知影片...\n')
      return await this.checkKnownVideos()
    }
  }

  async checkKnownVideos() {
    let foundVideos = []
    
    for (const video of knownVideos) {
      try {
        console.log(`🔍 檢查: ${video.displayName}`)
        console.log(`   Blob Key: ${video.blobKey}`)
        
        const exists = await this.store.get(video.blobKey, { type: 'stream' })
        
        if (exists) {
          console.log(`   ✅ 存在於 Netlify Blobs`)
          
          try {
            const metadata = await this.store.getMetadata(video.blobKey)
            if (metadata) {
              console.log(`   📊 元數據:`)
              for (const [key, value] of Object.entries(metadata)) {
                console.log(`      ${key}: ${value}`)
              }
            }
            foundVideos.push({ ...video, exists: true, metadata })
          } catch (metaError) {
            console.log(`   ⚠️  無法獲取元數據`)
            foundVideos.push({ ...video, exists: true })
          }
        } else {
          console.log(`   ❌ 不存在於 Netlify Blobs`)
          foundVideos.push({ ...video, exists: false })
        }
      } catch (error) {
        console.log(`   ❌ 檢查失敗: ${error.message}`)
        foundVideos.push({ ...video, exists: false, error: error.message })
      }
      console.log('')
    }
    
    const existingCount = foundVideos.filter(v => v.exists).length
    console.log(`📊 統計: ${existingCount}/${knownVideos.length} 個影片存在於 Netlify Blobs`)
    
    return foundVideos
  }

  async downloadVideo(blobKey, outputPath) {
    console.log(`📥 下載影片: ${blobKey}`)
    
    try {
      const videoData = await this.store.get(blobKey)
      
      if (videoData) {
        await writeFile(outputPath, videoData)
        console.log(`✅ 下載成功: ${outputPath}`)
        return true
      } else {
        console.log(`❌ 影片不存在: ${blobKey}`)
        return false
      }
    } catch (error) {
      console.error(`❌ 下載失敗: ${error.message}`)
      return false
    }
  }

  async uploadVideo(blobKey, localPath, displayName) {
    console.log(`📤 上傳影片: ${displayName}`)
    console.log(`   本地路徑: ${localPath}`)
    console.log(`   Blob Key: ${blobKey}`)
    
    try {
      // 檢查本地檔案
      const fileStats = await stat(localPath)
      console.log(`   檔案大小: ${formatFileSize(fileStats.size)}`)
      
      // 讀取檔案
      const videoBuffer = await readFile(localPath)
      
      // 上傳到 Netlify Blobs
      await this.store.set(blobKey, videoBuffer, {
        metadata: {
          contentType: 'video/mp4',
          displayName: displayName,
          uploadedAt: new Date().toISOString(),
          fileSize: videoBuffer.length
        }
      })
      
      console.log(`   ✅ 上傳成功！`)
      
      // 驗證上傳
      const uploaded = await this.store.get(blobKey, { type: 'stream' })
      if (uploaded) {
        console.log(`   ✓ 驗證通過`)
      }
      
      return true
    } catch (error) {
      console.error(`   ❌ 上傳失敗: ${error.message}`)
      return false
    }
  }

  async deleteVideo(blobKey) {
    console.log(`🗑️  刪除影片: ${blobKey}`)
    
    try {
      await this.store.delete(blobKey)
      console.log(`✅ 刪除成功`)
      return true
    } catch (error) {
      console.error(`❌ 刪除失敗: ${error.message}`)
      return false
    }
  }

  async generateReport() {
    console.log('📊 生成 Netlify Blobs 報告...\n')
    
    const videos = await this.checkKnownVideos()
    
    const report = {
      timestamp: new Date().toISOString(),
      totalVideos: knownVideos.length,
      existingVideos: videos.filter(v => v.exists).length,
      missingVideos: videos.filter(v => !v.exists).length,
      videos: videos
    }
    
    console.log('📋 報告摘要:')
    console.log(`   總影片數: ${report.totalVideos}`)
    console.log(`   存在於 Blobs: ${report.existingVideos}`)
    console.log(`   缺失: ${report.missingVideos}`)
    
    // 保存報告
    await writeFile('blob-report.json', JSON.stringify(report, null, 2))
    console.log('\n💾 報告已保存到: blob-report.json')
    
    return report
  }
}

// 主函數
async function main() {
  const command = process.argv[2] || 'list'
  
  console.log('🎬 Netlify Blobs 管理工具')
  console.log('========================\n')
  
  const manager = new BlobManager()
  const initialized = await manager.init()
  
  if (!initialized) {
    console.log('\n🔧 請在 Netlify 環境中運行:')
    console.log('netlify dev --command "node scripts/blob-manager.js [command]"')
    return
  }
  
  switch (command) {
    case 'list':
      await manager.listAll()
      break
      
    case 'check':
      await manager.checkKnownVideos()
      break
      
    case 'report':
      await manager.generateReport()
      break
      
    case 'download':
      const blobKey = process.argv[3]
      const outputPath = process.argv[4] || `./downloads/${blobKey}`
      if (blobKey) {
        await manager.downloadVideo(blobKey, outputPath)
      } else {
        console.log('❌ 請提供 blob key: node scripts/blob-manager.js download <blobKey> [outputPath]')
      }
      break
      
    default:
      console.log('📖 可用命令:')
      console.log('  list    - 列出所有 blob 對象')
      console.log('  check   - 檢查已知影片狀態')
      console.log('  report  - 生成詳細報告')
      console.log('  download <blobKey> [path] - 下載指定影片')
      console.log('')
      console.log('🔧 使用方式:')
      console.log('netlify dev --command "node scripts/blob-manager.js <command>"')
  }
}

main().catch(console.error)