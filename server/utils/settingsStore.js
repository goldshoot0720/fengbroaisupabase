// server/utils/settingsStore.js
// 共用給 server/api/settings/* 與 server/api/notifications/* 的兩件事：
//   1. 通知密碼的 scrypt hash／驗證（單一份實作，兩個路由共用同一組密碼）
//   2. 依前端帳號設定或 runtimeConfig 建立 Supabase client
//
// 通知密碼實際存在 resendsettings.password_hash；Google 雲端硬碟設定
// （googledrivesettings）不另存密碼，直接沿用同一個 hash 驗證。

import { createClient } from '@supabase/supabase-js'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export const RESEND_SETTINGS_TABLE = 'resendsettings'
export const SETTINGS_ROW_KEY = 'main'

const HASH_PREFIX = 'scrypt'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 16

export function hashNotificationPassword(password) {
  const salt = randomBytes(SALT_LENGTH)
  const derived = scryptSync(String(password), salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return `${HASH_PREFIX}:${SCRYPT_N}:${salt.toString('hex')}:${derived.toString('hex')}`
}

export function verifyNotificationPassword(password, storedHash) {
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

/**
 * Supabase client for settings routes. Prefers the account the browser is
 * currently on (supabaseUrl / supabaseKey in the query or body); falls back to
 * runtimeConfig. Never mixes the two — a half-filled account setting would
 * otherwise read one project and write another.
 */
export function getSettingsClient(event, credentials) {
  let url = String(credentials?.supabaseUrl || '').trim()
  let key = String(credentials?.supabaseKey || '').trim()
  if (!url && !key) {
    const config = useRuntimeConfig(event)
    const defaults = [config.public, config]
      .map((source) => ({
        url: String(source?.supabaseUrl || '').trim(),
        key: String(source?.supabaseAnonKey || '').trim(),
      }))
      .find((source) => source.url && source.key)
    url = defaults?.url || ''
    key = defaults?.key || ''
  }
  if (!url || !key) {
    throw createError({ statusCode: 400, statusMessage: '缺少 Supabase 連線資訊（supabaseUrl / supabaseKey）' })
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

/** Reads one `rowkey = 'main'` settings row, creating it if the table is empty. */
export async function ensureSettingsRow(client, table, rowKey = SETTINGS_ROW_KEY) {
  const { data, error } = await client.from(table).select('*').eq('rowkey', rowKey).limit(1)
  if (error) throw error
  if (data?.[0]) return data[0]

  const inserted = await client.from(table).insert([{ rowkey: rowKey }]).select().single()
  if (inserted.error) throw inserted.error
  return inserted.data
}

/**
 * The notification password guarding both Resend and Google Drive settings.
 * Throws 400 when no password has been set yet, 401 when it does not match.
 */
export async function assertNotificationPassword(client, password) {
  const row = await ensureSettingsRow(client, RESEND_SETTINGS_TABLE)
  const storedHash = row?.password_hash || ''
  if (!storedHash) {
    throw createError({
      statusCode: 400,
      statusMessage: '尚未設定通知密碼，請先在鋒兄設定 → Resend Email 通知建立密碼。',
    })
  }
  if (!verifyNotificationPassword(password, storedHash)) {
    throw createError({ statusCode: 401, statusMessage: '通知密碼不正確' })
  }
  return row
}

/**
 * Google 的 web client ID 以固定字尾結束、browser API key 以 "AIza" 開頭，
 * 只遮中間就能一眼認出是哪一組，又不用把整串放上畫面。
 */
export function maskCredential(value) {
  if (!value) return ''
  const text = String(value)
  if (text.length <= 10) return '••••••••'
  return `${text.slice(0, 6)}••••••••${text.slice(-6)}`
}
