import {
  ensureSettingsRow,
  getSettingsClient,
  hashNotificationPassword,
  verifyNotificationPassword,
} from '../../utils/settingsStore.js'

// Resend 通知設定的雲端讀寫（密碼鎖保護）。
// 行為對應 fengbroaiappwrite 的 /api/notification-settings：
// - GET   讀取設定（API key 遮蔽，不含明文）
// - POST  verify：驗證通知密碼，成功才回完整設定（含明文 key）
// - PUT   儲存設定（首次需設密碼；之後需驗證原密碼，可一併換密碼）
//
// Supabase 連線優先使用前端帳號設定；未指定時使用 runtimeConfig 的環境設定。
// 密碼以 scrypt hash 存放（scrypt:<N>:<saltHex>:<hashHex>）。

const TABLE = 'resendsettings'
const ROW_KEY = 'main'
const MAX_SLOTS = 21

function parseSlots(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((slot) =>
        slot && typeof slot === 'object' &&
        typeof slot.apiKey === 'string' &&
        typeof slot.toEmail === 'string'
      )
      .slice(0, MAX_SLOTS)
  } catch {
    return []
  }
}

function maskSecret(value) {
  if (!value) return ''
  if (String(value).length <= 8) return '••••••••'
  return `${String(value).slice(0, 3)}••••••••${String(value).slice(-4)}`
}

function toPublicPayload(row, includeSecretKeys = false) {
  const slots = parseSlots(row?.slots_json)
  return {
    hasPassword: Boolean(row?.password_hash),
    fromEmail: row?.from_email || '',
    slots: slots.map((slot) => ({
      apiKey: includeSecretKeys ? slot.apiKey : maskSecret(slot.apiKey),
      toEmail: slot.toEmail,
    })),
  }
}

const ensureRow = (client) => ensureSettingsRow(client, TABLE, ROW_KEY)

export default defineEventHandler(async (event) => {
  const method = event.method
  const body = await readBody(event).catch(() => ({}))

  try {
    if (method === 'GET') {
      // GET 不支援 body：連線資訊走 query。
      const client = getSettingsClient(event, getQuery(event))
      const row = await ensureRow(client)
      return toPublicPayload(row)
    }

    if (method === 'POST') {
      // verify：驗證密碼後回傳完整設定
      const client = getSettingsClient(event, body)
      const row = await ensureRow(client)
      const password = String(body.password || '')
      const storedHash = row?.password_hash || ''

      if (!storedHash) {
        throw createError({ statusCode: 400, statusMessage: '尚未設定通知密碼，請先在設定頁建立密碼。' })
      }
      if (!verifyNotificationPassword(password, storedHash)) {
        throw createError({ statusCode: 401, statusMessage: '通知密碼不正確' })
      }
      return toPublicPayload(row, true)
    }

    if (method === 'PUT') {
      const client = getSettingsClient(event, body)
      const row = await ensureRow(client)
      const storedHash = row?.password_hash || ''
      const password = String(body.password || '')
      const newPassword = String(body.newPassword || '')

      if (!storedHash) {
        if (newPassword.length < 4) {
          throw createError({ statusCode: 400, statusMessage: '首次使用請設定至少 4 碼的通知密碼（之後顯示或變更 API Key 都需要）。' })
        }
      } else if (!verifyNotificationPassword(password, storedHash)) {
        throw createError({ statusCode: 401, statusMessage: '通知密碼不正確，無法儲存。' })
      }

      const fromEmail = String(body.fromEmail || '').trim()
      const rawSlots = Array.isArray(body.slots) ? body.slots : []
      const slots = rawSlots
        .map((slot) => ({
          apiKey: String(slot?.apiKey || '').trim(),
          toEmail: String(slot?.toEmail || '').trim(),
        }))
        .filter((slot) => slot.apiKey && slot.toEmail)
        .slice(0, MAX_SLOTS)

      const data = {
        from_email: fromEmail,
        slots_json: JSON.stringify(slots),
        updated_at: new Date().toISOString(),
      }
      if (storedHash) {
        if (newPassword) {
          if (newPassword.length < 4) {
            throw createError({ statusCode: 400, statusMessage: '新密碼至少 4 碼。' })
          }
          data.password_hash = hashNotificationPassword(newPassword)
        }
      } else {
        data.password_hash = hashNotificationPassword(newPassword)
      }

      const { error: updateError } = await client
        .from(TABLE)
        .update(data)
        .eq('rowkey', ROW_KEY)
      if (updateError) throw updateError

      return { success: true, ...toPublicPayload({ ...row, ...data }) }
    }

    throw createError({ statusCode: 405, statusMessage: `Method ${method} not allowed` })
  } catch (error) {
    if (error?.statusCode) throw error
    console.error('resend-settings error:', error)
    const message = error?.message || '操作失敗'
    throw createError({ statusCode: 500, statusMessage: message })
  }
})
