# 🔑 獲取 Netlify 認證令牌

## 快速步驟

### 1. 訪問 Netlify 個人訪問令牌頁面

打開瀏覽器，訪問：
```
https://app.netlify.com/user/applications
```

### 2. 創建新的訪問令牌

1. 點擊「**New access token**」按鈕
2. 在「Token description」輸入：`Music Upload Token`
3. 點擊「**Generate token**」
4. **立即複製令牌**（只會顯示一次！）

### 3. 設置環境變數

#### 方法 A：更新 .env 文件（推薦）

編輯項目根目錄的 `.env` 文件，添加：

```bash
NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
NETLIFY_AUTH_TOKEN=你剛才複製的令牌
```

#### 方法 B：使用命令行（臨時）

**Windows PowerShell:**
```powershell
$env:NETLIFY_SITE_ID="970c7bab-2d0c-46b4-941f-1f7131995a0f"
$env:NETLIFY_AUTH_TOKEN="你剛才複製的令牌"
npm run upload-music
```

**Windows CMD:**
```cmd
set NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
set NETLIFY_AUTH_TOKEN=你剛才複製的令牌
npm run upload-music
```

### 4. 執行上傳

```bash
npm run upload-music
```

## 📋 完整示例

### 步驟 1: 獲取令牌
訪問：https://app.netlify.com/user/applications

### 步驟 2: 創建令牌
- 描述：`Music Upload Token`
- 點擊「Generate token」
- 複製令牌（例如：`nfp_abc123xyz...`）

### 步驟 3: 設置環境變數

編輯 `.env` 文件：
```bash
SUPABASE_URL=https://busgjgbvlrlbyolsubcj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Netlify 配置
NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
NETLIFY_AUTH_TOKEN=nfp_abc123xyz...你的令牌
```

### 步驟 4: 上傳音樂

```bash
npm run upload-music
```

## ✅ 驗證

上傳成功後，訪問：
```
https://app.netlify.com/projects/nuxtkiro20251215/blobs/site:music
```

你應該看到 48 個音樂文件！

## 🔒 安全提示

1. **不要分享你的令牌**
2. **不要提交 .env 文件到 Git**（已在 .gitignore 中）
3. **定期更換令牌**
4. **不再使用時刪除令牌**

## 🆘 遇到問題？

### 令牌無效
- 確認令牌完整複製
- 檢查是否有多餘的空格
- 重新生成新令牌

### 權限錯誤
- 確認令牌有 Blobs 寫入權限
- 確認站點 ID 正確

### 環境變數未生效
- 重啟終端
- 確認 .env 文件在項目根目錄
- 檢查文件編碼（UTF-8）

---

**準備好了嗎？** 獲取令牌後立即上傳音樂！🎵
