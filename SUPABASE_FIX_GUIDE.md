# 🔧 Supabase 配置修復指南

## ❌ 問題描述

遇到錯誤：
```
500 Server Error
Your project's URL and Key are required to create a Supabase client! 
Check your Supabase project's API settings to find these values 
https://supabase.com/dashboard/project/_/settings/api
```

## ✅ 解決方案

### 1. 修正環境變數名稱

**問題**: `.env` 文件中使用了錯誤的變數名稱
```bash
# ❌ 錯誤
SUPABASE_KEY=your_key_here

# ✅ 正確
SUPABASE_ANON_KEY=your_key_here
```

**修復**: 將 `SUPABASE_KEY` 改為 `SUPABASE_ANON_KEY`

### 2. 更新 Nuxt 配置

在 `nuxt.config.ts` 中添加 Supabase 配置：

```typescript
// Supabase 配置
supabase: {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_ANON_KEY,
  redirectOptions: {
    login: '/login',
    callback: '/confirm',
    exclude: ['/*'],
  }
},
```

### 3. 創建資料庫類型文件

創建 `app/types/database.types.ts` 文件定義資料庫結構，避免類型警告。

### 4. 驗證配置

創建測試 API 端點和測試頁面來驗證 Supabase 連接：

- `server/api/test-supabase.ts` - 基本連接測試
- `server/api/test-tables.ts` - 表格查詢測試  
- `test-supabase-connection.html` - 前端測試頁面

## 🎯 當前配置

### 環境變數 (.env)
```bash
SUPABASE_URL=https://busgjgbvlrlbyolsubcj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NETLIFY_SITE_ID=970c7bab-2d0c-46b4-941f-1f7131995a0f
NETLIFY_AUTH_TOKEN=nfp_3ZT1mAumYTM9dQZC3MudUfzV9FmpVhhYa533
```

### 支援的資料表
- `subscriptions` - 訂閱管理
- `foods` - 食物管理
- `banks` - 銀行帳戶
- `common_accounts` - 通用帳戶
- `articles` - 文章筆記

## 🧪 測試方法

### 1. 開發環境測試
```bash
npm run dev
```
訪問：http://localhost:3000

### 2. API 端點測試
- GET `/api/test-supabase` - 基本連接測試
- GET `/api/test-tables` - 表格查詢測試

### 3. 前端測試頁面
訪問：`test-supabase-connection.html`

## 🔍 故障排除

### 常見問題

1. **環境變數未載入**
   - 重新啟動開發服務器
   - 檢查 `.env` 文件位置和格式

2. **Supabase URL 或 Key 錯誤**
   - 訪問 [Supabase Dashboard](https://supabase.com/dashboard)
   - 檢查項目設定 > API 設定
   - 確認 URL 和 anon key 正確

3. **資料庫表格不存在**
   - 檢查 Supabase 資料庫中是否已創建相應表格
   - 確認表格名稱和結構正確

### 檢查清單

- [ ] `.env` 文件中的變數名稱正確
- [ ] `nuxt.config.ts` 中的 Supabase 配置正確
- [ ] `app/types/database.types.ts` 文件存在
- [ ] 開發服務器重新啟動
- [ ] 測試 API 端點正常回應
- [ ] 前端測試頁面顯示成功狀態

## 🎉 修復完成

修復後應該看到：
- ✅ 無 Supabase 配置警告
- ✅ API 端點正常回應
- ✅ 資料庫連接成功
- ✅ 表格查詢正常

## 📚 相關文檔

- [Nuxt Supabase 模組](https://supabase.nuxtjs.org/)
- [Supabase 文檔](https://supabase.com/docs)
- [環境變數配置](https://nuxt.com/docs/guide/directory-structure/env)

---

**修復時間**: 2026-01-30
**狀態**: ✅ 已完成
**測試**: ✅ 通過