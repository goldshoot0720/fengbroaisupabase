# 個人訂閱管理系統 - 完整設定指南

## 🎯 系統概述

這是一個基於 Nuxt 4 和 Supabase 的個人訂閱管理系統，幫助你追蹤和管理所有的訂閱服務（如 Netflix、Spotify、Adobe 等）。

## 📋 功能特色

- ✅ 響應式設計（電腦、平板、手機）
- ✅ 用戶認證（Email 註冊/登入）
- ✅ 訂閱服務管理（新增、編輯、刪除）
- ✅ 費用追蹤和統計
- ✅ 到期日期提醒
- ✅ 安全的資料隔離

## 🚀 快速開始

### 1. 環境需求

- Node.js 18+ 
- npm 或 yarn
- Supabase 帳號

### 2. 專案設定

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 3. Supabase 設定

#### 3.1 創建 Supabase 專案
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 創建新專案
3. 等待專案初始化完成

#### 3.2 取得 API 金鑰
1. 前往 **Settings** → **API**
2. 複製以下資訊：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`

#### 3.3 設定環境變數
更新 `.env` 文件：

```env
# Supabase 配置
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_KEY=your-anon-key-here
```

#### 3.4 設定資料庫

在 Supabase **SQL Editor** 中執行以下腳本：

```sql
-- 配合現有 subscription 表格結構的更新腳本
-- 添加 user_id 欄位到現有表格（如果不存在）
ALTER TABLE public.subscription 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 設定 RLS (Row Level Security)
ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscription;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscription;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscription;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.subscription;

-- 創建新的 RLS 政策
CREATE POLICY "Users can view own subscriptions" ON public.subscription
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.subscription
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscription
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.subscription
  FOR DELETE USING (auth.uid() = user_id);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_subscription_user_id ON public.subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_name ON public.subscription(name);
CREATE INDEX IF NOT EXISTS idx_subscription_nextdate ON public.subscription(nextdate);
CREATE INDEX IF NOT EXISTS idx_subscription_created_at ON public.subscription(created_at);
```

## 📊 資料庫結構

### subscription 表格

| 欄位名稱 | 資料型別 | 說明 |
|---------|---------|------|
| id | UUID | 主鍵，自動生成 |
| created_at | TIMESTAMPTZ | 創建時間 |
| name | TEXT | 服務名稱（如 Netflix） |
| site | TEXT | 官方網站 |
| account | TEXT | 帳號/Email |
| price | BIGINT | 月費（以分為單位） |
| nextdate | DATE | 下次扣款日期 |
| note | TEXT | 備註 |
| user_id | UUID | 用戶 ID（外鍵） |

## 🔧 使用方法

### 1. 註冊/登入
1. 訪問 `http://localhost:3000`
2. 點擊 **個人訂閱管理**
3. 使用 Email 註冊新帳號或登入

### 2. 新增訂閱
1. 填寫服務資訊：
   - **服務名稱**：Netflix、Spotify 等
   - **官方網站**：服務的官方網址
   - **帳號**：你的登入帳號
   - **月費**：每月費用（NT$）
   - **下次扣款日期**：下次收費日期
   - **備註**：額外說明

2. 點擊 **新增訂閱**

### 3. 管理訂閱
- **編輯**：點擊 ✏️ 圖示修改訂閱資訊
- **刪除**：點擊 🗑️ 圖示刪除訂閱
- **查看統計**：右上角顯示總服務數和月總費用

## 🎨 響應式設計

### 電腦版 (> 768px)
- 左側固定選單
- 右側內容展示

### 手機版 (≤ 768px)
- 上方選單按鈕
- 滑出式側邊選單
- 下方內容展示

### 平板版
- **橫向**：比照電腦版
- **直向**：比照手機版

## 🔒 安全性

- **Row Level Security (RLS)**：用戶只能存取自己的資料
- **認證保護**：所有操作都需要登入
- **資料隔離**：每個用戶的訂閱資料完全分離

## 🛠️ 開發

### 專案結構
```
├── app/
│   └── app.vue              # 主應用程式
├── components/              # Vue 組件
├── public/                  # 靜態資源
├── .env                     # 環境變數
├── nuxt.config.ts          # Nuxt 配置
└── package.json            # 專案依賴
```

### 建置部署
```bash
# 建置生產版本
npm run build

# 預覽生產版本
npm run preview

# 生成靜態網站
npm run generate
```

## 🐛 故障排除

### 常見問題

1. **Supabase 連接失敗**
   - 檢查 `.env` 文件中的 URL 和 API 金鑰
   - 確認 Supabase 專案狀態正常

2. **無法新增訂閱**
   - 確認已執行資料庫 SQL 腳本
   - 檢查 RLS 政策是否正確設定

3. **登入失敗**
   - 檢查 Supabase Authentication 設定
   - 確認 Email 確認功能已啟用

### 除錯技巧

1. 開啟瀏覽器開發者工具查看錯誤
2. 檢查 Supabase Dashboard 的 Logs
3. 使用 `console.log` 除錯 JavaScript

## 📞 支援

如果遇到問題，請檢查：
1. 環境變數設定
2. 資料庫表格和政策
3. Supabase 專案狀態
4. 瀏覽器控制台錯誤訊息

## 🎉 完成！

現在你可以開始管理你的所有訂閱服務了！再也不用擔心忘記取消不需要的訂閱。