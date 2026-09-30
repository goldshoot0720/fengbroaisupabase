import { getSettingsClient } from '../../utils/settingsStore.js'
import { runResendExpiryCronCheck } from '../../../utils/resendExpiryCron.js'

// 瀏覽器開站時的 Resend 到期信：收件組合從 resendsettings 表載入，
// API Key 只在伺服器端使用，不會回傳給瀏覽器。
// 選取／去重（resend_notify_log）／寄送與 Netlify 排程共用 runResendExpiryCronCheck，
// 所以兩條路徑挑出的項目與 idempotency key 完全一致。
//
// Supabase 連線優先使用前端帳號設定（body 的 supabaseUrl / supabaseKey）；
// 未指定時使用 runtimeConfig 的環境設定。
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const client = getSettingsClient(event, body)

  try {
    return {
      source: 'resendsettings',
      ...await runResendExpiryCronCheck({ supabase: client })
    }
  } catch (error) {
    console.error('resend-expiry error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Resend expiry check failed'
    })
  }
})
