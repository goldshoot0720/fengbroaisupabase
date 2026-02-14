# 🎵 音樂上傳說明

## 🚀 快速上傳（3 步驟）

### 步驟 1: 獲取 Netlify 認證令牌

1. 訪問：**https://app.netlify.com/user/applications**
2. 點擊「**New access token**」
3. 描述輸入：`Music Upload Token`
4. 點擊「**Generate token**」
5. **複製令牌**（只顯示一次！）

### 步驟 2: 設置環境變數

編輯項目根目錄的 `.env` 文件，添加：

```bash
NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
NETLIFY_AUTH_TOKEN=你剛才複製的令牌
```

### 步驟 3: 執行上傳

```bash
npm run upload-music
```

## 🎯 使用嚮導（推薦新手）

運行設置嚮導，它會引導你完成所有步驟：

```bash
setup-and-upload-music.bat
```

嚮導會：
- ✅ 檢查環境變數
- ✅ 掃描音樂文件
- ✅ 執行上傳
- ✅ 提供詳細提示

## 📊 上傳詳情

### 音樂文件統計
- **總數**: 48 個 MP3 文件
- **分類**: 4 個（鋒兄的傳奇人生、鋒兄進化Show🔥、塗哥水電王子爆紅、最瞎結婚理由）
- **大小**: 約 200-500 MB
- **時間**: 3-5 分鐘

### 上傳過程

```
🚀 上傳音樂到 Netlify Blobs (music store)...

🎵 發現 48 個音樂檔案：

🎶 處理音樂檔案:
   本地路徑: D:\mycode\nuxtkiro20251215\public\music\鋒兄的傳奇人生\鋒兄的傳奇人生.mp3
   Blob Key: 鋒兄的傳奇人生/鋒兄的傳奇人生.mp3
   檔案大小: 3.45 MB
   ✅ 上傳成功！

... (重複 48 次)

📊 上傳結果統計:
   成功: 48/48
   失敗: 0/48

🎉 所有音樂檔案上傳完成！
```

## ✅ 驗證上傳

### 方法 1: Netlify 控制台

訪問：**https://app.netlify.com/projects/nuxtkiro20251215/blobs/site:music**

你應該看到 48 個音樂文件

### 方法 2: 測試腳本

```bash
npm run test-blobs
```

### 方法 3: 測試頁面

在瀏覽器中打開 `test-music.html`

### 方法 4: 應用測試

```bash
npm run dev
```

訪問 http://localhost:3000，點擊「音樂庫」

## 🔧 故障排除

### 問題 1: 缺少環境變數

```
❌ 缺少必要的環境變數:
   NETLIFY_SITE_ID: ❌
   NETLIFY_AUTH_TOKEN: ❌
```

**解決方案**：
1. 確認 `.env` 文件存在
2. 確認文件中有正確的值
3. 重啟終端

### 問題 2: 認證失敗

```
❌ 上傳失敗: Unauthorized
```

**解決方案**：
1. 檢查令牌是否正確
2. 重新生成新令牌
3. 確認令牌沒有過期

### 問題 3: 找不到文件

```
📭 在 public/music 資料夾中找不到任何 .mp3 檔案
```

**解決方案**：
1. 確認音樂文件在 `public/music` 目錄
2. 確認文件格式為 `.mp3`
3. 檢查目錄結構

### 問題 4: 網絡錯誤

```
❌ 上傳失敗: Network timeout
```

**解決方案**：
1. 檢查網絡連接
2. 重試上傳
3. 使用更穩定的網絡

## 📚 相關文件

### 設置指南
- [GET_NETLIFY_TOKEN.md](GET_NETLIFY_TOKEN.md) - 獲取令牌詳細步驟
- [NETLIFY_UPLOAD_GUIDE.md](NETLIFY_UPLOAD_GUIDE.md) - 完整上傳指南

### 使用文檔
- [MUSIC_QUICK_START.md](MUSIC_QUICK_START.md) - 快速啟動
- [MUSIC_SETUP_GUIDE.md](MUSIC_SETUP_GUIDE.md) - 設置指南
- [MUSIC_LIBRARY_README.md](MUSIC_LIBRARY_README.md) - 系統說明

### 工具腳本
- `setup-and-upload-music.bat` - 設置嚮導
- `upload-music.bat` - 簡單上傳
- `scripts/upload-music.js` - 上傳腳本

## 🎉 上傳後

### 1. 啟動應用

```bash
npm run dev
```

### 2. 訪問音樂庫

打開 http://localhost:3000，點擊側邊欄的「🎵 音樂庫」

### 3. 享受音樂

- 播放 48 首不同版本的音樂
- 使用智能快取功能
- 切換不同語言版本
- 選擇不同演唱者版本

### 4. 部署到生產環境

```bash
npm run build
netlify deploy --prod
```

訪問：https://nuxtkiro20251215.netlify.app

## 💡 提示

### 預載音樂

在音樂庫頁面點擊「預載所有音樂」，將所有音樂快取到本地

### 離線播放

已快取的音樂可以在沒有網絡的情況下播放

### 清除快取

如果遇到播放問題，使用「清除所有快取」功能

## 🆘 需要幫助？

1. 查看 [GET_NETLIFY_TOKEN.md](GET_NETLIFY_TOKEN.md)
2. 運行 `setup-and-upload-music.bat` 嚮導
3. 查看其他文檔文件
4. 檢查 Netlify 控制台

---

**準備好了嗎？** 開始上傳你的音樂吧！🎵✨

## 📋 檢查清單

上傳前確認：
- [ ] 已獲取 Netlify 認證令牌
- [ ] 已更新 .env 文件
- [ ] 音樂文件在 public/music 目錄
- [ ] 網絡連接正常

上傳後確認：
- [ ] 在 Netlify 控制台看到 48 個文件
- [ ] 測試頁面可以播放音樂
- [ ] 應用中音樂庫正常工作
- [ ] 快取功能正常

全部完成！🎊
