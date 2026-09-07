# Appwrite 與 Supabase 功能差異盤點

查核日：2026-07-31。比較基準是 Appwrite 專案 `main` 的 commit
[`278f457`](https://github.com/goldshoot0720/fengbroaiappwrite/tree/278f45781e53a22fc6bf48657d24278b44c1f527)。

## 結論

核心的資料管理（訂閱、試用／首購、重灌、額度、食物、銀行、常用帳號、文件、影音、音樂、Podcast）以及轉檔、金融、新聞與通知，皆可在目前 Supabase 專案的 `components/pages/`、`composables/` 與 `server/api/` 中找到對應實作。2026-09-03 已補上 Appwrite `docs/INDEX.md` 的「鋒兄試用/首購」與「鋒兄重灌」，並對齊重灌訂閱週期／費用欄位與 CSV 匯入匯出；同批補上「鋒兄額度」（`quota` 表、`useQuotas`、`QuotaPage.vue`、CSV 匯入匯出）。

下列三項在 2026-07-31 盤點時是缺口：Appwrite 版有明確元件，本專案全文搜尋 `components/`、`app/`、
`composables/`、`pages/` 後找不到相應入口或內容。**三項都已在 [`AboutPage.vue`](../../components/pages/AboutPage.vue)
的「鋒兄事業與服務資訊」分頁補上**（`aboutPanels` = 執行長／貓咪家族／水電大亨／影音與自動簽到服務），
不另開獨立頁面 —— 它們是展示內容，併進關於頁比新增四個導覽項合理。

| 原缺口 | Appwrite 證據 | 本專案現況 |
| --- | --- | --- |
| 水電大亨（Plumber Tycoon）互動模組 | [`PlumberTycoon.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/278f45781e53a22fc6bf48657d24278b44c1f527/components/modules/PlumberTycoon.tsx) 為獨立 module。 | 關於頁「水電大亨」分頁：`businessUnits` 十三個事業體與事業版圖說明。 |
| 執行長簡介 | [`CEOProfile.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/278f45781e53a22fc6bf48657d24278b44c1f527/components/modules/CEOProfile.tsx) 提供 CEO 身分、持股比例與公司介紹視圖。 | 關於頁「執行長」分頁：職稱、37% 以上持股與願景說明；照片沿用本站既有的 `fengbro-home-person.webp`。 |
| 貓咪家族展示 | [`CatShowcase.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/278f45781e53a22fc6bf48657d24278b44c1f527/components/modules/CatShowcase.tsx) 展示兩隻貓的圖片、特徵與小知識。 | 關於頁「貓咪家族」分頁：喵布布／喵白白的照片、特徵與標籤。 |

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

## 已補上的缺口（2026-09-07）

- **Resend 到期信的伺服器端排程**：Appwrite 版在 [`vercel.json`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/main/vercel.json) 用三個 cron 每日呼叫 `/api/resend-expiry-notify`，不需要有人開網站就會寄到期信。Supabase 版先前只有瀏覽器開站時的 `useExpiryEmailNotifications`，`utils/resendExpiryCron.js` 與 `supabase-resend-log-table.sql` 已寫好但沒有任何排程進入點（註解指向尚不存在的 `netlify/functions/resend-expiry-cron-*.js`）。現已補上：
  - `netlify/functions/resend-expiry-cron-{morning,noon,evening}.js`：三個薄包裝，共用 `utils/resendExpiryCron.js` 的 `createResendExpiryCronHandler()`。
  - `netlify.toml` 排程 `27 21 / 27 3 / 27 9 * * *`（UTC）＝ Asia/Taipei 05:27 / 11:27 / 17:27，對齊 Appwrite 的三次檢查節奏。
  - 去重與 Appwrite 不同且更嚴謹：Appwrite 靠 Resend 的 `Idempotency-Key`（每日一組），本專案再加上 Supabase `resend_notify_log`，瀏覽器與三個時段共用同一份「已寄送」狀態；寄送失敗不寫 log，下一個時段自動重試。
  - 一併對齊訂閱選取條件：兩條路徑都用 `iscontinue !== false`（NULL 視為續訂中），避免瀏覽器與 cron 選到不同項目而讓共用去重表失效。
  - 需要的 Netlify 環境變數：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`；收件設定沿用 `resendsettings` 表（`from_email` / `slots_json`）。

- **Google 雲端硬碟連接設定**：2026-07-31 的盤點漏了這一項。Appwrite 版有 [`lib/googleDrive.ts`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/main/lib/googleDrive.ts)、[`GoogleDriveConnectionSettings.tsx`](https://github.com/goldshoot0720/fengbroaiappwrite/blob/main/components/modules/GoogleDriveConnectionSettings.tsx) 與 `/api/google-drive-settings`，備份可直接上傳／取回 Google 雲端硬碟；Supabase 版全庫只有 `DocumentPage.vue` 的「鋒兄雲端硬碟」字樣（那是 Drive 風格外觀，對應 Appwrite 的 `DriveSkins.tsx`），沒有任何真的連到 Google 的程式碼，備份只能存到本機下載資料夾。現已補上：
  - `googledrive-setup.sql`：新表 `googledrivesettings`（`rowkey` / `client_id` / `api_key`），同步加入 `setup-all-tables.sql` 與鋒兄設定的資料表檢查清單。
  - `server/api/settings/google-drive.ts`：GET 回遮蔽值、POST 驗證後回明文、PUT 儲存。與 Appwrite 的四位數 PIN 不同，這裡沿用既有的**通知密碼**（`resendsettings.password_hash`），使用者不必再記第二組密碼。
  - `server/utils/settingsStore.js`：scrypt 雜湊／驗證與 Supabase client 建立抽成共用，`resend-settings.ts` 一併改用，消掉原本重複的兩套 crypto。
  - `utils/googleDrive.js` + `composables/useGoogleDrive.js`：GIS token client、Picker、上傳／下載，備份目錄 `OAuth／fengbroaisupabase`（Appwrite 版是 `OAuth／fengbroaiappwrite`，兩個 app 各自一個子資料夾）。
  - `components/pages/MenuBackupSettings.vue`：新增「Google 雲端硬碟」卡片與可收合的連接設定；`exportMenuBundle` 加上 `{ download: false }` 選項，上傳雲端時不再重複下載本機副本。

- **貓咪照片改存本站**：關於頁的兩張貓咪照片原本外連
  `raw.githubusercontent.com/goldshoot0720/fengbroaiappwrite/main/public/cats2.25fimage{1,2}.png`。
  來源 repo 的 `public/` 之後清空了，那兩個網址現在是 **404**，「貓咪家族」分頁等於顯示兩張破圖。
  已從盤點所依據的 commit `278f457` 取回原圖，壓成 `public/fengbro-cat-bubu.webp`、
  `public/fengbro-cat-baibai.webp`（各約 60 KB，原本是 2 MB PNG）並改為本機路徑，`<img>` 加上
  `loading="lazy"`。展示內容不該綁在另一個 repo 的分支狀態上。

## 範圍與判定方式

本文件判定「未實作」的標準是：Appwrite `main` 有可執行、使用者可見的獨立元件／路由，而目前 Supabase 程式碼沒有可辨識的對應頁面或入口。上表三項當時確實沒有對應入口，之後以關於頁分頁補齊；它們是展示內容，本來就不是資料遷移或日常工作流程的阻礙。
