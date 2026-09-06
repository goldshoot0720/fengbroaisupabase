# Appwrite 與 Supabase 功能差異盤點

查核日：2026-07-31。比較基準是 Appwrite 專案 `main` 的 commit
[`278f457`](https://github.com/goldshoot0720/fengbroaiappwrite/tree/278f45781e53a22fc6bf48657d24278b44c1f527)。

## 結論

核心的資料管理（訂閱、試用／首購、重灌、額度、食物、銀行、常用帳號、文件、影音、音樂、Podcast）以及轉檔、金融、新聞與通知，皆可在目前 Supabase 專案的 `components/pages/`、`composables/` 與 `server/api/` 中找到對應實作。2026-09-03 已補上 Appwrite `docs/INDEX.md` 的「鋒兄試用/首購」與「鋒兄重灌」，並對齊重灌訂閱週期／費用欄位與 CSV 匯入匯出；同批補上「鋒兄額度」（`quota` 表、`useQuotas`、`QuotaPage.vue`、CSV 匯入匯出）。

下列三項是 Appwrite 版有明確元件、但本專案以全文搜尋 `components/`、`app/`、`composables/`、`pages/` 後找不到相應入口或內容的功能；它們應視為尚未移植的展示／互動功能：

| 缺口 | Appwrite 證據 | Supabase 結果 | 建議優先度 |
| --- | --- | --- | --- |
| 水電大亨（Plumber Tycoon）互動模組 | [`PlumberTycoon.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/278f45781e53a22fc6bf48657d24278b44c1f527/components/modules/PlumberTycoon.tsx) 為獨立 module。 | 未找到 `Plumber`、`Tycoon` 或「水電大亨」相關頁面、元件或導航項。 | 低：獨立娛樂／品牌互動功能。 |
| 執行長簡介 | [`CEOProfile.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/278f45781e53a22fc6bf48657d24278b44c1f527/components/modules/CEOProfile.tsx) 提供 CEO 身分、持股比例與公司介紹視圖。 | 現有 [`AboutPage.vue`](../../components/pages/AboutPage.vue) 是技術與系統介紹；無 CEO 專頁內容。 | 低：品牌內容；若需要保留企業介紹，可併入 About。 |
| 貓咪家族展示 | [`CatShowcase.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/278f45781e53a22fc6bf48657d24278b44c1f527/components/modules/CatShowcase.tsx) 展示兩隻貓的圖片、特徵與小知識。 | 無 `CatShowcase`、貓咪資料或對應畫面。 | 低：純展示內容。 |

## 已排除的候選項

- 音樂歌詞不是缺口：現有 [`MusicDBPage.vue`](../../components/pages/MusicDBPage.vue) 已包含歌詞新增、編輯、展開顯示和 Appwrite ZIP 匯入相容處理。
- 手動價格追蹤不是缺口：現有 [`FengToolsPage.vue`](../../components/pages/FengToolsPage.vue) 已有商品、價格、日期、備註與刪除操作；Appwrite 的對應來源是 [`ManualPriceTracker.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/278f45781e53a22fc6bf48657d24278b44c1f527/components/modules/ManualPriceTracker.tsx)。
- 生日彩蛋與通知自檢不是缺口：Supabase 的 [`app.vue`](../../app/app.vue) 與 [`useNotifications.js`](../../composables/useNotifications.js) 都已有相應實作。

## 已補上的缺口（2026-09-06）

- **手機比價歷史持久化**：Appwrite 版的 [`landtophistory`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/main/app/api/_lib/landtopHistory.js) 是獨立 collection，並用 Vercel cron 每週一抓取歷史價格，跨裝置持久存在。之前 Supabase 版的手機比價（`FengToolsPage.vue` 的 `phoneCompareHistory`）只寫入瀏覽器 `localStorage`，沒有雲端表也沒有排程，換瀏覽器或清快取歷史就會消失。現已新增：
  - `landtop_history` 表（`landtop-history-setup.sql`、`setup-all-tables.sql`、鋒兄設定 `tables[]`），欄位依本專案「單一關鍵字→多來源、多容量比價」的資料結構調整，並非逐欄對齊 Appwrite 的1 9 個屬性。
  - `composables/useLandtopHistory.js`：`FengToolsPage.vue` 每次查詢後 fire-and-forget 寫入一筆快照，並在關鍵字變更時優先讀雲端歷史。
  - `netlify/functions/landtop-history-cron.js`（每週一 09:00 Taipei）：重新查詢每個曾被搜尋過的關鍵字，即使沒人開該週的頁面也會繼續累積歷史。
  - `utils/landtopLookup.js`：從原 `server/api/feng-tools/landtop.post.ts` 抽出的框架無關抓取邏輯，讓 API route 與週排 cron 共用同一套評分／解析規則。

## 範圍與判定方式

本文件判定「未實作」的標準是：Appwrite `main` 有可執行、使用者可見的獨立元件／路由，而目前 Supabase 程式碼沒有可辨識的對應頁面或入口。這不代表三項內容必須回補；它們並非資料遷移或日常工作流程的阻礙。
