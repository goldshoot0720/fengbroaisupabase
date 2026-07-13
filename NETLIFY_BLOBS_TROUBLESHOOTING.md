# Netlify Blobs 載入失敗故障排除指南

## 🔍 問題診斷

### 常見錯誤 1: CORS 錯誤（同源政策）

**錯誤訊息：**
```
已封鎖跨來源請求: 同源政策不允許讀取 file:///api/blobs/music/... 的遠端資源。
（原因: CORS 請求未使用 http 通訊協定）
```

**原因：**
- 直接雙擊打開 HTML 文件（使用 `file://` 協議）
- 瀏覽器的同源政策阻止 `file://` 訪問 `http://` 資源

**解決方案：**
✅ **正確方式：** 通過開發服務器訪問
```
http://localhost:3000/test-music-loading.html
```

❌ **錯誤方式：** 直接打開文件
```
file:///D:/mycode/nuxtkiro20251215/test-music-loading.html
```

---

## 📋 測試步驟

### 1. 確保開發服務器正在運行

```bash
npm run dev
```

服務器應該在 `http://localhost:3000` 運行

### 2. 通過瀏覽器訪問測試頁面

在瀏覽器地址欄輸入：
```
http://localhost:3000/test-music-loading.html
```

### 3. 運行測試

點擊各個測試按鈕：
- ✅ 測試 API 連接
- ✅ 測試音頻載入
- ✅ 測試 Fetch 詳情
- ✅ 檢查網路狀態

---

## 🎵 音樂庫訪問方式

### 正確的訪問方式

1. **通過 Nuxt 頁面訪問：**
   ```
   http://localhost:3000/
   ```
   然後導航到音樂頁面

2. **通過測試頁面訪問：**
   ```
   http://localhost:3000/test-music-loading.html
   ```

3. **直接 API 測試：**
   ```
   http://localhost:3000/api/blobs/music/鋒兄的傳奇人生/鋒兄的傳奇人生.mp3
   ```

---

## 🔧 常見問題解決

### 問題 1: 音樂載入中但無法播放

**可能原因：**
- 網路速度慢，音樂文件較大
- Netlify Blobs 連接延遲

**解決方案：**
- 等待更長時間（音樂文件通常 3-5 MB）
- 檢查網路連接
- 使用預載功能提前載入音樂

### 問題 2: 部分音樂可以播放，部分不能

**可能原因：**
- 某些音樂文件未正確上傳到 Netlify Blobs
- 文件路徑編碼問題

**解決方案：**
1. 檢查 Netlify Blobs 控制台確認文件存在
2. 重新上傳失敗的音樂文件：
   ```bash
   npm run upload-music
   ```

### 問題 3: 所有音樂都無法載入

**可能原因：**
- Netlify 認證令牌無效或過期
- 環境變數配置錯誤
- 開發服務器未運行

**解決方案：**
1. 檢查 `.env` 文件配置：
   ```env
   NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
   NETLIFY_AUTH_TOKEN=nfp_3ZT1mAumYTM9dQZC3MudUfzV9FmpVhhYa533
   ```

2. 重啟開發服務器：
   ```bash
   npm run dev
   ```

3. 驗證 Netlify 令牌是否有效：
   - 訪問 https://app.netlify.com/user/applications
   - 檢查令牌狀態

---

## 📊 服務器日誌檢查

### 正常的日誌輸出

```
Music blob request: {
  rawPath: '%E9%8B%92%E5%85%84%E7%9A%84%E5%82%B3%E5%A5%87%E4%BA%BA%E7%94%9F/...',
  decodedKey: '鋒兄的傳奇人生/鋒兄的傳奇人生.mp3',
  timestamp: '2026-01-30T...'
}
Music blob found (stream)
```

### 錯誤的日誌輸出

```
Music blob not found: 鋒兄的傳奇人生/鋒兄的傳奇人生.mp3
Error fetching music blob: ...
```

如果看到錯誤日誌，說明：
- 音樂文件未上傳到 Netlify Blobs
- 文件路徑不正確
- Netlify 認證問題

---

## 🚀 快速修復命令

### 重新上傳所有音樂

```bash
# Windows
upload-music.bat

# 或使用 npm
npm run upload-music
```

### 清除並重新上傳

```bash
# 清除現有音樂
node scripts/clear-music-blobs.js

# 重新上傳
node scripts/upload-music.js
```

### 測試 Netlify Blobs 連接

```bash
node scripts/test-music-access.js
```

---

## 📱 瀏覽器兼容性

### 支援的瀏覽器

- ✅ Chrome/Edge (推薦)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE 11 (不支援)

### 必需的瀏覽器功能

- HTML5 Audio API
- Fetch API
- IndexedDB (用於快取)
- Blob API

---

## 💡 最佳實踐

### 1. 使用預載功能

在 MusicManager 組件中：
- 點擊「預載所有音樂」按鈕
- 音樂會快取到本地 IndexedDB
- 後續播放速度更快

### 2. 檢查快取狀態

- 查看「已快取音樂」數量
- 綠色 ✅ 表示已快取
- 紅色 ❌ 表示未快取

### 3. 定期清理快取

如果遇到問題：
- 點擊「清除所有快取」
- 重新預載音樂
- 刷新頁面

---

## 🔗 相關資源

- [Netlify Blobs 文檔](https://docs.netlify.com/blobs/overview/)
- [音樂庫實現指南](./MUSIC_LIBRARY_IMPLEMENTATION.md)
- [上傳指南](./NETLIFY_UPLOAD_GUIDE.md)
- [快速開始](./MUSIC_QUICK_START.md)

---

## 📞 需要幫助？

如果問題仍未解決：

1. 檢查瀏覽器控制台錯誤訊息
2. 查看服務器日誌輸出
3. 運行診斷工具：`http://localhost:3000/test-music-loading.html`
4. 檢查 Netlify Blobs 控制台：https://app.netlify.com/projects/nuxtkiro20251215/blobs

---

**最後更新：** 2026-01-30
**版本：** 1.0.0
