import { createClient } from '@supabase/supabase-js'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// Resend 通知設定的雲端讀寫（密碼鎖保護）。
// 行為對應 fengbroaiappwrite 的 /api/notification-settings：
// - GET   讀取設定（API key 遮蔽，不含明文）
// - POST  verify：驗證通知密碼，成功才回完整設定（含明文 key）
// - PUT   儲存設定（首次需設密碼；之後需驗證原密碼，可一併換密碼）
//
// Supabase 連線資訊由前端 body 提供（與 resend.post.ts 相同模式），
// 密碼以 scrypt hash 存放（scrypt:<N>:<saltHex>:<hashHex>）。

const TABLE = 'resendsettings'
const ROW_KEY = 'main'
const MAX_SLOTS = 21

const HASH_PREFIX = 'scrypt:'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 16

function hashNotificationPassword(password) {
  const salt = randomBytes(SALT_LENGTH)
  const derived = scryptSync(String(password), salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return `${HASH_PREFIX}${SCRYPT_N}:${salt.toString('hex')}:${derived.toString('hex')}`
}

function verifyNotificationPassword(password, storedHash) {
  if (!storedHash || !password) return false
  const [prefix, nPart, saltHex, hashHex] = String(storedHash).split(':')
  if (prefix !== HASH_PREFIX || !nPart || !saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  if (!salt.length || expected.length === 0) return false
  try {
    const derived = scryptSync(String(password), salt, KEY_LENGTH, {
      N: Number(nPart) || SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

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

function getClient(body) {
  const url = String(body?.supabaseUrl || '').trim()
  const key = String(body?.supabaseKey || '').trim()
  if (!url || !key) {
    throw createError({ statusCode: 400, statusMessage: '缺少 Supabase 連線資訊（supabaseUrl / supabaseKey）' })
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function readRow(client) {
  const { data, error } = await client.from(TABLE).select('*').eq('rowkey', ROW_KEY).limit(1)
  if (error) throw error
  return data?.[0] || null
}

async function ensureRow(client) {
  const existing = await readRow(client)
  if (existing) return existing
  const { data, error } = await client.from(TABLE).insert([{ rowkey: ROW_KEY }]).select().single()
  if (error) throw error
  return data
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const body = await readBody(event).catch(() => ({}))

  try {
    if (method === 'GET') {
      // GET 不支援 body：連線資訊走 query（與 test-supabase 等 route 一致）。
      const query = getQuery(event)
      const url = String(query.supabaseUrl || '').trim()
      const key = String(query.supabaseKey || '').trim()
      if (!url || !key) {
        throw createError({ statusCode: 400, statusMessage: '缺少 Supabase 連線資訊（supabaseUrl / supabaseKey）' })
      }
      const client = createClient(url, key, { auth: { persistSession: false } })
      const row = await ensureRow(client)
      return toPublicPayload(row)
    }

    if (method === 'POST') {
      // verify：驗證密碼後回傳完整設定
      const client = getClient(body)
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
      const client = getClient(body)
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
