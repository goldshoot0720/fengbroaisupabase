# 鋒兄 AI Supabase

基於 **Nuxt 4** 與 **Supabase** 的個人資訊管理系統，整合訂閱、食品、筆記、媒體、文件、銀行、工具與推播提醒。

線上示範：[fengbroaisupabase.netlify.app](https://fengbroaisupabase.netlify.app/)

## 功能特色

- **響應式介面**：桌面左側選單、手機滑出式側邊欄
- **多資料模組**：訂閱、食品、筆記、常用帳號、圖片、影片、音樂、文件、播客、銀行、例行事務
- **Supabase 後端**：PostgreSQL 資料表 + Storage 檔案
- **ZIP 匯入匯出**：圖片／音樂／影片／播客／文件／筆記／食品／例行可匯出 JSON（或 CSV）並一併打包媒體檔；匯入時自動回傳 Storage
- **鋒兄工具**：BigGo 比價、手機通路比價、YouTube、金融報價
- **PWA / Web Push**：可安裝、訂閱到期背景推播（需設定 VAPID）
- **Email 提醒**：可選 Resend 到期通知

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Nuxt 4、Vue 3、TypeScript |
| 後端 | Supabase（PostgreSQL + Storage） |
| 部署 | Netlify（含 Functions / Scheduled Functions） |
| 媒體 | Supabase Storage、Netlify Blobs（部分音樂代理） |

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境變數

```bash
cp .env.example .env
```

至少填入：

```env
SUPABASE_URL=你的_supabase_項目_url
SUPABASE_ANON_KEY=你的_supabase_匿名_key
SUPABASE_BUCKET=uploads
```

選用（推播 / Email / Blobs）：

```env
SUPABASE_SERVICE_ROLE_KEY=...
NUXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@yourdomain.com
RESEND_API_KEY=...
NETLIFY_SITE_ID=...
NETLIFY_AUTH_TOKEN=...
```

### 3. 資料庫

在 Supabase SQL Editor 依需求執行：

- `setup-all-tables.sql` 或各模組 `*-setup.sql`
- `simple-subscription-setup.sql`（訂閱）
- `supabase-push-table.sql`（Web Push 訂閱表）
- `image-setup.sql`、`music-setup.sql`、`video-setup.sql` 等

並建立 public Storage bucket（預設 `uploads`）。

### 4. 開發伺服器

```bash
npm run dev
```

開啟 `http://localhost:3000`。

## 主要頁面

| 頁面 | 說明 |
|------|------|
| 鋒兄首頁 / 儀表 | 入口與資料摘要、Storage 用量 |
| 訂閱 / 食品 | CRUD、到期提醒 |
| 筆記 / 常用 / 文件 | 分類、附件、ZIP |
| 圖片 / 影片 / 音樂 / 播客 | 媒體管理與播放 |
| 銀行 | 帳戶、批次存款調整、交易流程 |
| 工具 | 比價、Tube、金融 |
| 設定 / 關於 | 連線、資料表、Storage 掃描、版本 |

## 部署（Netlify）

1. 連接 GitHub 倉庫 `goldshoot0720/fengbroaisupabase`
2. Build command：`npm run build`（見 `netlify.toml`）
3. 設定與 `.env.example` 相同的環境變數
4. 推播定時任務：`send-push-cron` 已排程每日執行（需 VAPID + SERVICE_ROLE_KEY）

```bash
npm run build
# 或
netlify deploy --prod
```

## 常用指令

```bash
npm run dev
npm run build
npm run generate
npm run generate-vapid
npm run check-blobs
```

## 授權

MIT License
