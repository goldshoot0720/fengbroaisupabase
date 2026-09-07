// netlify/functions/resend-expiry-cron-morning.js
// Resend 到期信排程：每日 Asia/Taipei 05:27（21:27 UTC（前一日））檢查一次。
// 排程設定在 netlify.toml；實作與另外兩個時段共用 utils/resendExpiryCron.js。
//
// 三個時段共用 Supabase 的 resend_notify_log 去重表（也和瀏覽器開站時的
// useExpiryEmailNotifications 共用），所以同一筆訂閱／食品的同一個到期日只會
// 寄一次；某個時段寄送失敗時不寫入 log，留給下一個時段重試。

import { createResendExpiryCronHandler } from '../../utils/resendExpiryCron.js'

export default createResendExpiryCronHandler('morning')
