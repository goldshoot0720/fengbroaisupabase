# 通知與 Google Drive 上線

## 本機驗證（2026-09-07）

乾淨依賴副本的 `npm run build` 已完成，包含前端、SSR、Service Worker 與 Netlify Nitro 輸出。仍有大型 chunk、混合靜態／動態匯入及 Browserslist 資料過期警告。

目前工作區與乾淨依賴副本的 `npm run test:unit` 均通過 147 項測試。涵蓋 Resend 設定／排程、Google Drive 設定 API／模擬上傳下載、推播註冊與 Auth lock 回歸；Google 授權、正式資料庫政策及真實投遞仍需下列上線驗收。

## 資料庫

在目前網站使用的 Supabase 專案 SQL Editor 依序執行：

1. `supabase-push-table.sql`：Web Push 資料表與裝置註冊 RPC。
2. `supabase-resend-log-table.sql`：瀏覽器與排程共用寄送紀錄及存取政策。
3. `googledrive-setup.sql`：Google 瀏覽器憑證設定列。

上述檔案可重複執行。`setup-all-tables.sql` 的資料表定義不取代這些功能的政策與 RPC 設定。

## Netlify

站台：`fengbroaisupabase.netlify.app`，來源 repository：`goldshoot0720/fengbroaisupabase`。

- 建置命令：`npm run build`；輸出：`dist`；Node：24。
- 設定 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。
- Web Push 另需 `NUXT_PUBLIC_VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_EMAIL`。
- Resend 排程讀取 `resendsettings` 中已上傳的寄件人與收件組合；只填本機表單不會提供排程憑證。
- 三個到期信排程由 `netlify.toml` 定義，台北 05:27、11:27、17:27。正式部署會啟用排程，須先完成資料庫與收件組合設定。

執行 `npm run test:unit` 與 `npm run build`，通過後從 Netlify 發佈正式版本。

## Google Drive

在自己的 Google Cloud 專案啟用 Drive API 與 Picker API，建立 Web OAuth Client 與 Browser API Key，設定網站來源與對應 API key 限制。在「選單備份／還原」儲存憑證，使用既有通知密碼解鎖。首次連線仍需要使用者在 Google 授權視窗選擇帳號並同意。

## 驗收

- 「資料表狀態」檢查 `push_subscriptions`、`resend_notify_log`、`googledrivesettings`。
- Web Push 重新訂閱應成功寫入；重新整理後檢查通知狀態。
- Resend「檢查雲端」與密碼解鎖下載成功。
- 查看排程日誌確認無缺表／缺憑證錯誤。寄送測試會真的寄信，先核對收件人。
- Google Drive 完成授權後上傳測試備份，再用 Picker 選回下載；匯入會修改本機目前專案資料，先保存備份。

寄送紀錄與 Resend idempotency key 降低重複寄信，但無法承諾跨不同批次、部分收件人失敗或長時間故障的絕對 exactly-once 投遞。
