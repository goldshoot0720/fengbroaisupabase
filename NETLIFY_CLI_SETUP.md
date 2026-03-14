# Netlify CLI 設置指南

## ✅ 安裝狀態

Netlify CLI 已成功安裝！但由於 PowerShell 執行策略限制，需要額外配置。

## 🔧 解決 PowerShell 執行策略問題

### 方案 1：使用 CMD（推薦）

1. **開啟命令提示字元 (CMD)**
   - 按 `Win + R`
   - 輸入 `cmd`
   - 按 Enter

2. **切換到專案目錄**
   ```cmd
   cd D:\mycode\nuxtkiro20251215
   ```

3. **驗證 Netlify CLI**
   ```cmd
   netlify --version
   ```

### 方案 2：修改 PowerShell 執行策略

1. **以管理員身份開啟 PowerShell**
   - 右鍵點擊 PowerShell
   - 選擇「以系統管理員身分執行」

2. **設置執行策略**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **重新開啟 PowerShell**（非管理員模式）

4. **驗證安裝**
   ```powershell
   netlify --version
   ```

## 🚀 Netlify 配置步驟

### 步驟 1：登入 Netlify

```bash
netlify login
```

這會開啟瀏覽器，請登入您的 Netlify 帳戶並授權。

### 步驟 2：連結專案

```bash
netlify link
```

選擇您的 Netlify 網站或創建新網站。

### 步驟 3：啟用 Blobs 功能

1. 前往 [Netlify 控制台](https://app.netlify.com/)
2. 選擇您的網站
3. 前往 **Site settings** > **Environment variables**
4. 確保 Blobs 功能已啟用

### 步驟 4：測試 Blobs 連接

```bash
node scripts/test-blobs-connection.js
```

### 步驟 5：上傳影片

```bash
node scripts/upload-videos.js
```

## 📋 故障排除

### 問題 1：netlify 命令無法識別

**解決方案**：
- 重新啟動終端機
- 確保使用 CMD 而非 PowerShell
- 檢查 PATH 環境變數

### 問題 2：權限錯誤

**解決方案**：
- 確保已正確登入：`netlify login`
- 檢查網站權限設定
- 確認 Blobs 功能已啟用

### 問題 3：上傳失敗

**解決方案**：
- 檢查網路連接
- 確認影片檔案存在於 `public/videos/`
- 檢查檔案大小限制

## 🎯 成功指標

當看到以下訊息時，表示配置成功：

1. **CLI 版本顯示**：`netlify --version` 顯示版本號
2. **登入成功**：`netlify status` 顯示已連結的網站
3. **Blobs 測試通過**：測試腳本顯示「連接測試成功」
4. **影片上傳成功**：上傳腳本顯示「所有影片上傳完成」

## 📞 需要幫助？

如果遇到問題，請提供：
1. 使用的終端機類型（CMD/PowerShell）
2. 完整的錯誤訊息
3. `netlify status` 的輸出結果

我們會根據具體情況提供進一步協助。