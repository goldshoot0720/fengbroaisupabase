# 響應式訂閱管理系統

基於 Nuxt 4 和 Supabase 的個人訂閱服務管理應用程式。

## 功能特色

- 🎨 **響應式設計**：自動適應桌面、平板、手機
- 📱 **多裝置支援**：電腦版左側選單，手機版上方選單
- 💾 **Supabase 後端**：雲端資料庫儲存
- ✨ **完整 CRUD**：新增、讀取、更新、刪除訂閱
- 💰 **費用統計**：自動計算月總費用
- 📅 **到期提醒**：視覺化顯示扣款日期

## 技術棧

- **前端**：Nuxt 4, Vue 3, TypeScript
- **後端**：Supabase (PostgreSQL)
- **樣式**：原生 CSS (響應式設計)
- **部署**：支援 Vercel, Netlify 等平台

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設置環境變數

複製 `.env.example` 為 `.env` 並填入你的 Supabase 配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件：
```env
SUPABASE_URL=你的_supabase_項目_url
SUPABASE_ANON_KEY=你的_supabase_匿名_key
```

### 3. 設置資料庫

在 Supabase 中執行 `simple-subscription-setup.sql` 文件來創建資料表。

### 4. 啟動開發服務器

```bash
npm run dev
```

訪問 `http://localhost:3000` 查看應用程式。

## 資料庫結構

```sql
create table public.subscription (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  name text null,
  site text null,
  account text null,
  price bigint null,
  nextdate date null,
  note text null,
  constraint subscription_pkey primary key (id)
);
```

## 測試文件

- `test-simple.html` - 基本連接測試
- `test-subscription-crud.html` - 完整 CRUD 操作測試

## 響應式佈局

- **桌面版** (>768px)：左側選單 + 右側內容
- **平板橫向**：同桌面版
- **平板直向** + **手機版** (≤768px)：上方漢堡選單 + 滑出式側邊欄

## 部署

### Vercel

```bash
npm run build
```

### Netlify

```bash
npm run generate
```

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License
