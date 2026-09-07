# Project Context

## Product shell

The live app is the Nuxt 4 shell in `app/app.vue`: sidebar + header, `useNavigation.currentPage`, and `components/pages/*`. It is not a Vue Router multi-page app. `app.vue` has no `<NuxtPage />`. Root `pages/index.vue` only registers `/`. `/about` redirects to `/?page=about` (`routeRules`); `app.vue` also treats path `/about` as the product About page. `isAppPageId` + `app.vue` apply a valid `?page=` query (also used by the header account switcher).

Column source of truth for new tables is the `tables` array in `components/pages/SettingsPage.vue` (UUID `id` via `gen_random_uuid()`). Older setup scripts (`setup-all-tables.sql`, `*-setup.sql`) may still use `BIGSERIAL`. Composables treat `id` as opaque; both key types work. `app/types/database.types.ts` follows the Settings columns.

## Modules and tables

| UI | Page | Owner composable | Table |
|----|------|------------------|-------|
| 鋒兄筆記 | `NotePage.vue` | `useArticles` | `article` |
| 鋒兄銀行 | `BankPage.vue` | `useBanks` + `useBankWorkflow` | `bank` |
| 鋒兄常用 | `CommonPage.vue` | `useCommonAccounts` | `commonaccount` |
| 鋒兄文件 | `DocumentPage.vue` | `useDocuments` | `commondocument` |
| 鋒兄食品 | `FoodPage.vue` | `useFoods` | `food` |
| 鋒兄圖片 | `GalleryPage.vue` | `useImages` / `useGallery` | `image` |
| 鋒兄音樂 | `MusicDBPage.vue` | `useMusicRecords` | `music` |
| 鋒兄播客 | `PodcastPage.vue` | `usePodcasts` | `podcast` |
| 鋒兄例行 | `RoutinePage.vue` | `useRoutines` | `routine` |
| 鋒兄訂閱 | `SubscriptionPage.vue` | `useSubscriptions` | `subscription` |
| 鋒兄試用/首購 | `TrialPurchasePage.vue` | `useTrialPurchases` | `trialpurchase` |
| 鋒兄額度 | `QuotaPage.vue` | `useQuotas` | `quota` |
| 鋒兄購物清單 | `ShoppingPage.vue` | `useShoppingList` | `shoppinglist` |
| 鋒兄重灌 | `ReinstallPage.vue` | `useReinstalls` | `reinstall`（含訂閱週期／費用與 CSV） |
| 鋒兄影片 | `VideoDBPage.vue` | `useVideoRecords` | `video` |
| Web Push | Settings / SW | `usePushNotification` | `push_subscriptions` |

鋒兄工具 (`FengToolsPage.vue`) is client/server-only (BigGo, 手動紀錄, 手機比價, Tube, 金融, 新聞, 圖片語音成片, 格式轉換, 影片合併, YT/B 站轉檔). Unlike the [Appwrite sibling project](https://github.com/goldshoot0720/fengbroaiappwrite), which gives each personal list its own collection (`manualprice`, `tubechannel`, `financeinstrument2`, ...), most 鋒兄工具 personal lists here (手動比價商品、鋒兄tube 頻道、金融預設／自訂標的) share one generic table `toollistsync` (`sync_key` row + JSONB `payload`) via `useCloudListSync` — cloud is source of truth once loaded, localStorage is the offline cache. A missing table or offline state keeps local data editable; it never blocks the UI.

手機比價 is the one 鋒兄工具 area with its own dedicated table, `landtop_history` (`composables/useLandtopHistory.js`), mirroring the Appwrite project's `landtophistory` collection. Every lookup in `FengToolsPage.vue` writes a snapshot (`recordLandtopSnapshot`, fire-and-forget) so history survives across devices/browsers instead of living only in `localStorage`. `netlify/functions/landtop-history-cron.js` also re-queries every previously-searched keyword each Monday, so history keeps accumulating even when nobody opens the page that week. Both the on-demand `server/api/feng-tools/landtop.post.ts` route and the cron scrape through the same shared `utils/landtopLookup.js` module, so on-demand lookups and cron snapshots score/parse candidates identically.

鋒兄設定的「選單備份／還原」由 `components/pages/MenuBackupSettings.vue` 與 `utils/menuBackup/` 負責：一鍵匯出／匯入各選單 CSV，或連同圖片、影片、音樂、播客、文件、筆記 ZIP。匯入時相同鍵更新、其餘新增。清單頁的全選刪除走 `useSelectionSet` + `BulkSelectionControls`；搜尋列 Enter 與「提交」走同一條 `RecentSearchInput` 路徑。

同一張卡片還有 **Google 雲端硬碟**：`utils/googleDrive.js`（Google Identity Services token client + Picker，兩支 script 動態載入，scope 只要 `drive.file`）把備份上傳到使用者雲端硬碟的 `OAuth／fengbroaisupabase` 資料夾，或用 Picker 挑一個備份下載回來直接餵給 `importMenuBundle`。走 Drive 這條路徑時 `exportMenuBundle(..., { download: false })`，不會再重複下載一份到本機。憑證（OAuth Client ID／Browser API Key）存在 `googledrivesettings` 表（`googledrive-setup.sql`），讀寫走 `server/api/settings/google-drive.ts`：GET 回遮蔽值、POST／PUT 需通過**通知密碼**驗證 —— 沿用 `resendsettings.password_hash`，不另開第二組密碼。`composables/useGoogleDrive.js` 是雲端設定與 localStorage 快取之間的黏合層（雲端是來源，本機是快取；表還沒建或離線時仍可只用本機憑證操作）。scrypt 密碼雜湊與 Supabase client 建立集中在 `server/utils/settingsStore.js`，`resend-settings.ts` 與 `google-drive.ts` 共用。這對應 Appwrite 版的 `lib/googleDrive.ts` + `GoogleDriveConnectionSettings.tsx` + `/api/google-drive-settings`。

鋒兄關於 (`AboutPage.vue`) 除了版本與站況，最後一段「鋒兄事業與服務資訊」以 `aboutPanels` 分頁承接 Appwrite 版的展示模組：執行長（`CEOProfile.tsx`）、貓咪家族（`CatShowcase.tsx`）、水電大亨（`PlumberTycoon.tsx`），以及影音／自動簽到服務清單。這些是純展示內容，刻意併進關於頁而不另開導覽項 —— 見 `docs/research/appwrite-feature-gap-2026-07-31.md`。貓咪照片存在本站 `public/fengbro-cat-{bubu,baibai}.webp`：來源 repo 的 `public/` 已清空，原本的 `raw.githubusercontent.com` 外連現在是 404。

## Supabase accounts & Storage bucket

Multi-account settings store friendly names like `goldshoot0720` / `abuhg17`. **Default Storage bucket comes from Netlify env `SUPABASE_BUCKET`** (or `NUXT_PUBLIC_SUPABASE_BUCKET`). Resolution: explicit settings `bucket` field → env default → `friendlyName` (legacy) → `uploads`. See `resolveSupabaseBucket` in `composables/useSettings.js`.

Browser data clients are shared by `useSupabaseBrowserClient`. Account switching uses project URL + API key; the app has no Supabase Auth sign-in flow. Keep session persistence, token auto-refresh, and URL session detection disabled on this data client so it does not contend for cross-tab Auth locks.

## Bank workflow module

`useBankWorkflow` owns the bank page workflow rules: transaction modal state, batch selection, batch deposit setting/adjustment, previews, validation, and selected deletion.

`BankPage.vue` should stay focused on layout, inline add/edit forms, CSV import/export, and wiring the workflow into the page.

Shared selection state should go through `useSelectionSet` before adding new page-local batch-selection code.

## Notification module

`useNotifications` owns client-side notification bootstrap:

- in-app toast + native / Service Worker subscription expiry alerts (once per local day)
- writing Supabase credentials into IndexedDB for the Service Worker
- Periodic Background Sync registration
- Web Push subscription via `usePushNotification`
- Resend expiry emails via `useExpiryEmailNotifications`

Call `bootstrapNotifications()` once from `app/app.vue` after subscription data is loaded. Do not re-trigger Resend expiry checks from individual pages (`HomePage` / `DashboardPage`).

Shared pure helpers live in `utils/notificationHelpers.js` (date math, day text, payload copy, storage keys, window constants). Prefer these over duplicating day/text logic in composables or cron.

Master on/off switch: `notificationsEnabled`（shared module-level ref in `useNotifications`）, toggled in Settings（鋒兄設定 → 通知開關與自我檢測）. `initNotificationPreference()` loads the saved localStorage flag (`feng-notifications-enabled`) on app boot; `setNotificationsEnabled(bool)` persists it, mirrors it into the same IndexedDB store the Service Worker reads (`fengbroai-sw` / key `notifications-enabled`), and immediately (un)registers periodic sync + Web Push so the change takes effect without a reload. When off, `bootstrapNotifications()` short-circuits and `public/custom-sw.js` skips both `push` and `periodicsync` handling; a missing/undefined flag defaults to enabled for backward compatibility.

Resend 到期信有兩個觸發來源，共用同一張 Supabase 去重表 `resend_notify_log`（`supabase-resend-log-table.sql`）：瀏覽器開站時的 `useExpiryEmailNotifications`，以及每日三次的 Netlify 排程 `netlify/functions/resend-expiry-cron-{morning,noon,evening}.js`（Asia/Taipei 05:27 / 11:27 / 17:27，實作共用 `utils/resendExpiryCron.js`）。已記錄的訂閱／食品與到期日會跳過；寄送失敗不寫 log，留給下一時段重試。這不保證部分收件人失敗或跨批次競爭時絕不重複寄送。訂閱的選取條件兩邊一致（`iscontinue !== false`，NULL 視為續訂中）。`resend_notify_log` 不存在或讀寫失敗時，瀏覽器端退回 localStorage（`feng-resend-expiry-notification-log`）。

Resend expiry emails are **window-based, not exact-day**: `useExpiryEmailNotifications.runExpiryEmailNotifications()` sends when `0 <= daysUntil(dueDate) <= threshold` (subscription 2 days, food 8 days) AND that item/due-date pair isn't already logged in `feng-resend-expiry-notification-log` (localStorage). Because it's a window (not `=== threshold`), a missed day (app not opened) still self-heals the next time the app opens — as long as the due date hasn't passed. `checkExpiryEmailStatus()` is a read-only variant that reports, per subscription/food currently inside the window, whether it's already been sent; Settings (鋒兄設定 → Resend Email 通知 → 今日到期信寄送狀態) surfaces this with a 「補寄」 button that re-runs `runExpiryEmailNotifications({ force: true })` for anything still pending.

| Channel | Entry | Notes |
|---------|-------|--------|
| Toast + native | `useNotifications` | 3-day subscription window; **>3 items → one grouped summary** (names + dates) instead of N stacked toasts |
| SW periodic sync | `public/custom-sw.js` | self-contained; keep constants aligned with helpers; same group threshold; honors the shared on/off flag |
| Netlify cron Web Push | `netlify/functions/send-push-cron.js` | imports helpers; 3-day window; groups when >3 due; stale endpoints (after a local unsubscribe) self-clean on next 404/410 |
| Resend email | `useExpiryEmailNotifications` | subscription = 2 days before; food = 8 days before; window-based catch-up, see above |
| Resend email cron | `netlify/functions/resend-expiry-cron-*.js` | 3x daily (Taipei 05:27 / 11:27 / 17:27); shares `utils/resendExpiryCron.js` + `resend_notify_log` with the browser; service-role key |
| Web Push subscribe | `usePushNotification` | calls `register_push_subscription` to write one device; table + RPC setup is `supabase-push-table.sql`, also shown in Settings table setup |
| In-app toast UI | `useToast` + `ToastContainer` | generic UI, not expiry-specific |
| Self-check | `useNotifications.runNotificationSelfCheck` | Settings page diagnostics + optional probes |
| Master switch | `useNotifications.notificationsEnabled` / `setNotificationsEnabled` | Settings page toggle; localStorage + IndexedDB backed |
| Resend send-status check | `useExpiryEmailNotifications.checkExpiryEmailStatus` | Settings page "今日到期信寄送狀態" panel; read-only, plus a 補寄 action |
