# 🚀 Netlify 音樂上傳指南

## 📋 前置準備

### 1. 獲取 Netlify 認證令牌

#### 方法一：使用 Netlify CLI（推薦）

1. **安裝 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **登入 Netlify**
   ```bash
   netlify login
   ```
   這會打開瀏覽器進行授權

3. **鏈接到你的站點**
   ```bash
   netlify link
   ```
   選擇 `nuxtkiro20251215` 站點

4. **使用 Netlify CLI 上傳**
   ```bash
   netlify env:set NETLIFY_SITE_ID 970c7bab-2d0c-46b4-941f-1f7131995a0f
   npm run upload-music
   ```

#### 方法二：手動獲取令牌

1. **訪問 Netlify 控制台**
   - 前往：https://app.netlify.com/user/applications

2. **創建個人訪問令牌**
   - 點擊「New access token」
   - 輸入描述：「Music Upload Token」
   - 點擊「Generate token」
   - **複製令牌**（只會顯示一次！）

3. **更新 .env 文件**
   ```bash
   NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
   NETLIFY_AUTH_TOKEN=你複製的令牌
   ```

### 2. 站點信息

- **站點名稱**: nuxtkiro20251215
- **站點 ID**: 970c7bab-2d0c-46b4-941f-1f7131995a0f
- **Blobs Store**: music
- **項目 URL**: https://app.netlify.com/projects/nuxtkiro20251215

## 🎵 上傳音樂

### 使用 Netlify CLI（推薦）

```bash
# 1. 確保已登入
netlify status

# 2. 設置環境變數（如果需要）
netlify env:set NETLIFY_SITE_ID 970c7bab-2d0c-46b4-941f-1f7131995a0f

# 3. 執行上傳
npm run upload-music
```

### 使用環境變數

```bash
# Windows (CMD)
set NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
set NETLIFY_AUTH_TOKEN=你的令牌
npm run upload-music

# Windows (PowerShell)
$env:NETLIFY_SITE_ID="970c7bab-2d0c-46b4-941f-1f7131995a0f"
$env:NETLIFY_AUTH_TOKEN="你的令牌"
npm run upload-music

# Linux/Mac
export NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
export NETLIFY_AUTH_TOKEN=你的令牌
npm run upload-music
```

### 使用批次文件

```bash
# Windows
upload-music.bat
```

## 📊 上傳進度

上傳 48 首音樂文件預計需要：
- **時間**: 3-5 分鐘（取決於網速）
- **總大小**: 約 200-500 MB
- **文件數**: 48 個 MP3 文件

### 上傳過程中會顯示：

```
🚀 上傳音樂到 Netlify Blobs (music store)...

🎵 發現 48 個音樂檔案：

🎶 處理音樂檔案:
   本地路徑: D:\mycode\nuxtkiro20251215\public\music\鋒兄的傳奇人生\鋒兄的傳奇人生.mp3
   Blob Key: 鋒兄的傳奇人生/鋒兄的傳奇人生.mp3
   檔案大小: 3.45 MB
   ✅ 上傳成功！

...

📊 上傳結果統計:
   成功: 48/48
   失敗: 0/48

🎉 所有音樂檔案上傳完成！
```

## ✅ 驗證上傳

### 1. 檢查 Netlify Blobs

訪問：https://app.netlify.com/projects/nuxtkiro20251215/blobs/site:music

你應該看到 48 個音樂文件

### 2. 使用測試腳本

```bash
npm run test-blobs
```

### 3. 使用測試頁面

打開 `test-music.html` 在瀏覽器中測試播放

### 4. 訪問應用

```bash
npm run dev
```

訪問 http://localhost:3000，點擊「音樂庫」

## 🔧 故障排除

### 錯誤：缺少環境變數

```
❌ 缺少必要的環境變數:
   NETLIFY_SITE_ID: ❌
   NETLIFY_AUTH_TOKEN: ❌
```

**解決方案**：
1. 確認 .env 文件中有正確的值
2. 或使用 Netlify CLI
3. 或在命令行中設置環境變數

### 錯誤：認證失敗

```
❌ 上傳失敗: Unauthorized
```

**解決方案**：
1. 檢查 NETLIFY_AUTH_TOKEN 是否正確
2. 重新生成新的訪問令牌
3. 確認令牌有 Blobs 寫入權限

### 錯誤：找不到文件

```
📭 在 public/music 資料夾中找不到任何 .mp3 檔案
```

**解決方案**：
1. 確認音樂文件在 `public/music` 目錄
2. 確認文件格式為 .mp3
3. 檢查目錄結構是否正確

### 錯誤：網絡超時

```
❌ 上傳失敗: Network timeout
```

**解決方案**：
1. 檢查網絡連接
2. 重試上傳
3. 分批上傳（修改腳本）

## 📝 上傳後的步驟

### 1. 更新應用配置

確認 `components/MusicManager.vue` 中的音樂配置正確

### 2. 部署應用

```bash
# 構建應用
npm run build

# 部署到 Netlify
netlify deploy --prod
```

### 3. 測試生產環境

訪問：https://nuxtkiro20251215.netlify.app

點擊「音樂庫」測試播放

## 🎉 完成！

音樂已成功上傳到 Netlify Blobs，現在可以：

- ✅ 在應用中播放音樂
- ✅ 使用智能快取功能
- ✅ 離線播放已快取的音樂
- ✅ 享受 48 首不同版本的音樂

## 📚 相關資源

- [Netlify Blobs 文檔](https://docs.netlify.com/blobs/overview/)
- [Netlify CLI 文檔](https://docs.netlify.com/cli/get-started/)
- [音樂設置指南](MUSIC_SETUP_GUIDE.md)
- [快速啟動指南](MUSIC_QUICK_START.md)

---

**需要幫助？** 查看其他文檔或聯繫開發團隊。
