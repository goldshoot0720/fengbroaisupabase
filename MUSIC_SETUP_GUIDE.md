# 🎵 音樂庫設置指南

## 📋 概述

本指南將幫助你將音樂文件上傳到 Netlify Blobs 並在音樂庫中展示。

## 🚀 快速開始

### 1. 準備音樂文件

將你的音樂文件（.mp3 格式）放置在 `public/music` 目錄下，可以按照以下結構組織：

```
public/music/
├── 鋒兄的傳奇人生/
│   ├── 鋒兄的傳奇人生.mp3
│   ├── 鋒兄的傳奇人生 (Rose).mp3
│   ├── 鋒兄的傳奇人生(Donald Trump).mp3
│   ├── 鋒兄的傳奇人生(Freddie Mercury).mp3
│   ├── 鋒兄的傳奇人生(Hatsune Miku).mp3
│   ├── 鋒兄的傳奇人生(日文).mp3
│   ├── 鋒兄的傳奇人生(粵語).mp3
│   ├── 鋒兄的傳奇人生(英文).mp3
│   └── 鋒兄的傳奇人生(韓文).mp3
├── 鋒兄進化Show🔥/
│   └── ...
└── 其他分類/
    └── ...
```

### 2. 設置環境變數

在項目根目錄的 `.env` 文件中設置以下環境變數：

```bash
NETLIFY_SITE_ID=你的站點ID
NETLIFY_AUTH_TOKEN=你的認證令牌
```

### 3. 上傳音樂到 Netlify Blobs

運行上傳腳本：

```bash
npm run upload-music
```

這個腳本會：
- 自動掃描 `public/music` 目錄下的所有 .mp3 文件
- 將文件上傳到 Netlify Blobs 的 `music` store
- 保留原始的目錄結構作為 blob key
- 設置正確的 metadata（content type, file size 等）

### 4. 更新音樂管理器配置

編輯 `components/MusicManager.vue`，在 `musicCategories` 中添加你的音樂分類：

```javascript
const musicCategories = ref([
  {
    name: '鋒兄的傳奇人生',
    tracks: [
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生.mp3', displayName: '原版', fileSize: null },
      { blobKey: '鋒兄的傳奇人生/鋒兄的傳奇人生 (Rose).mp3', displayName: 'Rose 版', fileSize: null },
      // 添加更多音樂...
    ]
  },
  {
    name: '你的新分類',
    tracks: [
      { blobKey: '你的新分類/歌曲1.mp3', displayName: '歌曲1', fileSize: null },
      // 添加更多音樂...
    ]
  }
])
```

## 🎯 功能特點

### 智能快取系統
- 使用 IndexedDB 本地快取音樂文件
- 減少重複載入，節省流量
- 支援離線播放已快取的音樂

### 多語言支援
- 支援同一首歌的多種語言版本
- 支援不同演唱者版本
- 清晰的版本標識

### 快取管理
- 單個音樂快取清除
- 批量預載所有音樂
- 快取大小統計
- 快取狀態顯示

## 📝 API 路由

音樂文件通過以下 API 路由訪問：

```
/api/blobs/music/{blobKey}
```

例如：
```
/api/blobs/music/鋒兄的傳奇人生/鋒兄的傳奇人生.mp3
```

## 🔧 技術細節

### Blob Proxy 函數

`netlify/functions/blob-proxy.js` 已經配置為支援音樂文件：

- 自動檢測 `music/` 前綴
- 從 `music` store 讀取文件
- 設置正確的 Content-Type (`audio/mpeg`)
- 支援 Range 請求（用於音頻流式播放）

### 支援的音頻格式

- MP3 (audio/mpeg) - 主要格式
- M4A (audio/mp4)
- WAV (audio/wav)

## 🎨 自定義樣式

音樂管理器使用漸變色主題：

```css
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
```

你可以在 `components/MusicManager.vue` 中修改顏色主題。

## 📊 管理工具

### 查看已上傳的音樂

```bash
npm run list-blobs
```

### 生成 Blob 報告

```bash
npm run blob-report
```

### 檢查 Blob 連接

```bash
npm run test-blobs
```

## 🐛 故障排除

### 音樂無法播放

1. 檢查 blob key 是否正確
2. 確認文件已成功上傳到 Netlify Blobs
3. 檢查瀏覽器控制台的錯誤訊息
4. 確認 API 路由配置正確

### 上傳失敗

1. 確認環境變數設置正確
2. 檢查 Netlify 認證令牌是否有效
3. 確認文件格式為 .mp3
4. 檢查文件大小是否超過限制

### 快取問題

1. 清除瀏覽器快取
2. 使用音樂管理器的「清除所有快取」功能
3. 檢查 IndexedDB 是否正常工作

## 📚 相關文件

- `components/MusicManager.vue` - 音樂管理器組件
- `components/pages/MusicPage.vue` - 音樂頁面
- `scripts/upload-music.js` - 音樂上傳腳本
- `netlify/functions/blob-proxy.js` - Blob 代理函數

## 🎉 完成！

現在你可以訪問音樂庫頁面，享受你的音樂收藏了！

音樂會自動快取到本地，提供流暢的播放體驗。
