# Netlify Blobs 影片管理設置指南

## 📋 概述

本專案使用 Netlify Blobs 來存儲和提供影片內容，以減少流量消耗並提供更好的快取機制。

## 🚀 設置步驟

### 1. 安裝依賴

```bash
npm install @netlify/blobs
```

### 2. 準備影片檔案

影片檔案已放置在 `public/videos/` 目錄中：

- `public/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4` - 鋒兄的傳奇人生
- `public/videos/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4` - 鋒兄進化Show🔥

### 3. 上傳影片到 Netlify Blobs

#### 3.1 影片檔案位置
影片檔案已放置在 public/videos/ 目錄中：
- `public/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4` - 鋒兄的傳奇人生
- `public/videos/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4` - 鋒兄進化Show🔥

#### 3.2 執行上傳
```bash
npm run upload-videos
```

#### 3.3 檢查上傳狀態
```bash
npm run check-blobs
```

### 4. 部署到 Netlify

確保你的專案已連接到 Netlify，並且啟用了 Blobs 功能。

## 📁 檔案結構

```
├── netlify/
│   └── functions/
│       └── blob-proxy.js          # Blobs 代理函數
├── scripts/
│   └── upload-videos.js           # 影片上傳腳本
├── public/
│   └── videos/                    # 影片檔案目錄
│       ├── 19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4
│       └── clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4
├── netlify.toml                   # Netlify 配置
└── NETLIFY_BLOBS_SETUP.md        # 本文件
```

## 🎬 影片對應

| 顯示名稱 | Blob Key | 本地檔案 |
|---------|----------|----------|
| 鋒兄的傳奇人生 | `19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4` | `videos/legend.mp4` |
| 鋒兄進化Show🔥 | `clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4` | `videos/evolution.mp4` |

## 🔧 功能特色

### 智能快取
- 影片優先快取至本地暫存
- 減少重複載入的網路流量
- 支援手動清除快取

### 按需載入
- 影片不會自動載入
- 用戶點擊後才開始載入
- 顯示載入狀態和進度

### 快取管理
- 顯示快取大小統計
- 支援單個影片快取清除
- 支援全部快取清除
- 支援預載所有影片

## 🌐 API 端點

- `/.netlify/blobs/{blobKey}` - 獲取影片內容
- 自動設置適當的 Cache-Control 標頭
- 支援 CORS 跨域請求

## 📊 快取策略

- **影片檔案**: 1年快取 (`max-age=31536000`)
- **Blob 內容**: 1天快取 (`max-age=86400`)
- **本地快取**: 瀏覽器 IndexedDB 存儲

## 🔒 安全性

- 所有影片通過 Netlify Blobs 安全存儲
- 支援 HTTPS 加密傳輸
- 可配置存取權限控制

## 📱 響應式支援

- 自動適應不同螢幕尺寸
- 手機版優化的播放器介面
- 觸控友善的控制按鈕

## 🛠️ 故障排除

### 影片無法載入
1. 檢查 Netlify Blobs 是否已啟用
2. 確認影片已正確上傳
3. 檢查網路連接狀態

### 快取問題
1. 嘗試清除瀏覽器快取
2. 使用「清除所有快取」功能
3. 重新載入頁面

## 📈 效能優化

- 使用 `preload="metadata"` 減少初始載入
- 實施漸進式載入策略
- 智能快取管理減少頻寬使用