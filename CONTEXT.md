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
| 鋒兄重灌 | `ReinstallPage.vue` | `useReinstalls` | `reinstall`（含訂閱週期／費用與 CSV） |
| 鋒兄影片 | `VideoDBPage.vue` | `useVideoRecords` | `video` |
| Web Push | Settings / SW | `usePushNotification` | `push_subscriptions` |

鋒兄工具 (`FengToolsPage.vue`) is client/server-only (BigGo, 手動紀錄, 手機比價, Tube, 金融, 新聞, 圖片語音成片, 格式轉換, 影片合併, YT/B 站轉檔). It has no dedicated Supabase table.

## Supabase accounts & Storage bucket

Multi-account settings store friendly names like `goldshoot0720` / `abuhg17`. **Default Storage bucket comes from Netlify env `SUPABASE_BUCKET`** (or `NUXT_PUBLIC_SUPABASE_BUCKET`). Resolution: explicit settings `bucket` field → env default → `friendlyName` (legacy) → `uploads`. See `resolveSupabaseBucket` in `composables/useSettings.js`.

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

| Channel | Entry | Notes |
|---------|-------|--------|
| Toast + native | `useNotifications` | 3-day subscription window; **>3 items → one grouped summary** (names + dates) instead of N stacked toasts |
| SW periodic sync | `public/custom-sw.js` | self-contained; keep constants aligned with helpers; same group threshold |
| Netlify cron Web Push | `netlify/functions/send-push-cron.js` | imports helpers; 3-day window; groups when >3 due |
| Resend email | `useExpiryEmailNotifications` | subscription = 2 days before; food = 8 days before |
| Web Push subscribe | `usePushNotification` | writes `push_subscriptions` |
| In-app toast UI | `useToast` + `ToastContainer` | generic UI, not expiry-specific |
| Self-check | `useNotifications.runNotificationSelfCheck` | Settings page diagnostics + optional probes |
