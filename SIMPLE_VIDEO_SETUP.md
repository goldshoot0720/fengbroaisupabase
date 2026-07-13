# 簡化影片設置方案

## 🎯 目標

由於 Netlify Blobs 需要特殊的環境配置，我們提供一個更簡單的方案：直接使用 `public/videos/` 目錄。

## 📁 設置步驟

### 1. 創建影片目錄

```bash
mkdir public\videos
```

### 2. 放置影片檔案

將以下影片檔案放入 `public/videos/` 目錄：

- `19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4` (鋒兄的傳奇人生)
- `clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4` (鋒兄進化Show🔥)

### 3. 修改應用程式配置

影片將通過以下 URL 直接訪問：
- `/videos/19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4`
- `/videos/clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4`

## ✅ 優點

- **簡單易用**：無需複雜的 Netlify Blobs 配置
- **立即可用**：放置檔案後立即可以播放
- **本地測試**：在本地開發環境中也能正常工作
- **無依賴**：不需要額外的套件或配置

## ⚠️ 注意事項

- 影片檔案會被包含在部署包中
- 較大的影片檔案可能會增加部署時間
- 沒有 Netlify Blobs 的進階快取功能

## 🚀 使用方法

1. **放置影片檔案**到 `public/videos/` 目錄
2. **提交並部署**到 Netlify
3. **訪問網站**，影片將自動載入

## 🔄 從 Netlify Blobs 遷移

如果之後想要使用 Netlify Blobs，可以：

1. 在 Netlify 環境中運行上傳腳本
2. 修改應用程式使用 Blobs URL
3. 從 public 目錄中移除影片檔案

這個方案提供了最大的兼容性和最少的配置需求。