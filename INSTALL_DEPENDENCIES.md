# 依賴安裝指南

## 🚨 當前問題

遇到 `@netlify/blobs` 套件未安裝的錯誤。

## 🔧 解決方案

### 方案 1：使用 CMD（推薦）

1. **開啟 CMD**（而非 PowerShell）
2. **切換到專案目錄**：
   ```cmd
   cd D:\mycode\nuxtkiro20251215
   ```
3. **安裝依賴**：
   ```cmd
   npm install @netlify/blobs
   ```

### 方案 2：修改 PowerShell 執行策略

1. **以管理員身份開啟 PowerShell**
2. **設置執行策略**：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. **安裝依賴**：
   ```powershell
   npm install @netlify/blobs
   ```

### 方案 3：使用 Yarn

1. **安裝 Yarn**（如果尚未安裝）：
   ```cmd
   npm install -g yarn
   ```
2. **使用 Yarn 安裝依賴**：
   ```cmd
   yarn add @netlify/blobs
   ```

## 📋 替代方案（如果無法安裝）

### 選項 1：手動上傳到 Netlify Blobs

1. 登入 [Netlify 控制台](https://app.netlify.com/)
2. 選擇您的專案
3. 前往 **Blobs** 頁面
4. 手動上傳影片檔案：
   - `19700121-1829-693fee512bec81918cbfd484c6a5ba8f_enx4rsS0.mp4`
   - `clideo-editor-92eb6755d77b4603a482c25764865a58_7sLjgTgc.mp4`

### 選項 2：使用 public 目錄

1. **創建 public/videos 目錄**：
   ```cmd
   mkdir public\videos
   ```
2. **將影片檔案放入 public/videos/**
3. **修改 app.vue 中的影片 URL**：
   ```javascript
   // 將
   const blobUrl = `/.netlify/blobs/${videoFiles[videoKey]}`
   // 改為
   const blobUrl = `/videos/${videoFiles[videoKey]}`
   ```

### 選項 3：在 Netlify 環境中運行

1. **提交代碼到 Git**
2. **部署到 Netlify**
3. **在 Netlify 函數中運行上傳腳本**

## ✅ 驗證安裝

安裝完成後，運行以下命令驗證：

```bash
npm run test-blobs
```

如果看到 "🎉 Netlify Blobs 連接測試成功！"，表示安裝成功。

## 🚀 後續步驟

1. **放置影片檔案**：
   - 將影片檔案放在 `videos/` 目錄中
   - 保持原始檔名

2. **上傳影片**：
   ```bash
   npm run upload-videos
   ```

3. **檢查狀態**：
   ```bash
   npm run check-blobs
   ```

## 📞 需要幫助？

如果仍然遇到問題，請提供：
1. 使用的作業系統版本
2. Node.js 版本（`node --version`）
3. npm 版本（`npm --version`）
4. 完整的錯誤訊息

我們會根據具體情況提供進一步的協助。