// 測試音樂 API 路徑的 Node.js 腳本
import fetch from 'node-fetch';

// 音樂分類配置
const musicCategories = [
  {
    name: '鋒兄的傳奇人生',
    tracks: [
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生.mp3', displayName: '原版' },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生 (Rose).mp3', displayName: 'Rose 版' },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生(Donald Trump).mp3', displayName: 'Donald Trump 版' }
    ]
  },
  {
    name: '鋒兄進化Show🔥',
    tracks: [
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥.mp3', displayName: '原版' },
      { blobKey: '鋒兄進化Show🔥/鋒兄進化Show🔥(Rose).mp3', displayName: 'Rose 版' }
    ]
  },
  {
    name: '塗哥水電王子爆紅',
    tracks: [
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅.mp3', displayName: '原版' },
      { blobKey: '塗哥水電王子爆紅/塗哥水電王子爆紅(Rose).mp3', displayName: 'Rose 版' }
    ]
  },
  {
    name: '最瞎結婚理由',
    tracks: [
      { blobKey: '最瞎結婚理由/最瞎結婚理由.mp3', displayName: '原版' },
      { blobKey: '最瞎結婚理由/最瞎結婚理由 (日語).mp3', displayName: '日語版' },
      { blobKey: '最瞎結婚理由/最瞎結婚理由 (粵語).mp3', displayName: '粵語版' }
    ]
  }
];

const BASE_URL = 'http://localhost:3001';

async function testMusicPaths() {
  console.log('🎵 開始測試音樂庫檔案路徑...\n');
  
  let totalTracks = 0;
  let successTracks = 0;
  let errorTracks = 0;
  const errors = [];

  for (const category of musicCategories) {
    console.log(`📁 測試分類: ${category.name}`);
    console.log('─'.repeat(50));

    for (const track of category.tracks) {
      totalTracks++;
      const apiUrl = `${BASE_URL}/api/blobs/music/${encodeURIComponent(track.blobKey)}`;
      
      try {
        console.log(`🎵 測試: ${track.displayName}`);
        console.log(`   blobKey: ${track.blobKey}`);
        console.log(`   API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl, { method: 'HEAD' });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          
          console.log(`   ✅ 成功 (${response.status})`);
          if (contentType) console.log(`   📄 類型: ${contentType}`);
          if (contentLength) console.log(`   📏 大小: ${formatFileSize(parseInt(contentLength))}`);
          
          successTracks++;
        } else {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`   ❌ 失敗: ${error.message}`);
        errorTracks++;
        errors.push({
          category: category.name,
          track: track.displayName,
          blobKey: track.blobKey,
          error: error.message
        });
      }
      
      console.log('');
    }
    
    console.log('');
  }

  // 顯示摘要
  console.log('📊 測試摘要');
  console.log('═'.repeat(50));
  console.log(`總音樂數: ${totalTracks}`);
  console.log(`成功: ${successTracks}`);
  console.log(`失敗: ${errorTracks}`);
  console.log(`成功率: ${Math.round((successTracks / totalTracks) * 100)}%`);

  if (errors.length > 0) {
    console.log('\n❌ 錯誤詳情:');
    console.log('─'.repeat(50));
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.category} - ${error.track}`);
      console.log(`   blobKey: ${error.blobKey}`);
      console.log(`   錯誤: ${error.error}`);
      console.log('');
    });
  }

  if (successTracks === totalTracks) {
    console.log('🎉 所有音樂路徑測試通過！');
  } else {
    console.log('⚠️  部分音樂路徑測試失敗，請檢查上述錯誤');
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 執行測試
testMusicPaths().catch(console.error);