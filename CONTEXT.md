# Project Context

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
| Toast + native | `useNotifications` | 3-day subscription window |
| SW periodic sync | `public/custom-sw.js` | self-contained; keep constants aligned with helpers |
| Netlify cron Web Push | `netlify/functions/send-push-cron.js` | imports helpers; 3-day window |
| Resend email | `useExpiryEmailNotifications` | subscription = 2 days before; food = 8 days before |
| Web Push subscribe | `usePushNotification` | writes `push_subscriptions` |
| In-app toast UI | `useToast` + `ToastContainer` | generic UI, not expiry-specific |
