// 鋒兄金融標的 ↔ public.financeinstrument（每檔一列）。
// 對應 Appwrite 版的 financeinstrument2 collection。原本寫在程式裡的 34 檔預設標的
// 已由 financeinstrument-setup.sql 搬進這張表（slug 保留舊 id，例如 kospi）。
//
// 這裡只放資料列轉換與 Supabase 讀寫（client 由呼叫端傳入），
// composables/useFinanceInstrumentSync.js（畫面）與 utils/menuBackup（CSV 備份）共用。

import {
  getCustomFinanceInstrumentKey,
  normalizeCustomFinanceInstrument,
} from './fengbroFinanceCustom.ts'
import { isMissingTableError } from './managementRecords.js'
import { parseCloudPayload } from './toolListPayload.js'

export const FINANCE_INSTRUMENT_TABLE = 'financeinstrument'
/** 改用獨立表之前，自訂標的存在 toollistsync 的這一列（首次載入時搬過來）。 */
export const LEGACY_FINANCE_SYNC_KEY = 'finance-custom-instruments'

export const isFinanceInstrumentTableMissing = (err) =>
  isMissingTableError(err, FINANCE_INSTRUMENT_TABLE)

const jsonList = (value) => (Array.isArray(value) ? value : parseCloudPayload(value) || [])
const numberOrUndefined = (value) => (value == null || value === '' ? undefined : Number(value))

/** 資料列 → 畫面用的標的（region 欄位對應 group）。 */
export function financeInstrumentFromDbRow(row) {
  if (!row) return null
  return normalizeCustomFinanceInstrument({
    name: row.name,
    symbol: row.symbol,
    provider: row.provider,
    group: row.region,
    imageUrls: jsonList(row.imageurls),
    slug: row.slug,
    sourceUrl: row.sourceurl,
    historySymbol: row.historysymbol,
    alertThreshold: numberOrUndefined(row.alertthreshold),
    localLabel: row.locallabel,
    periodLabel: row.periodlabel,
    referenceLevels: jsonList(row.referencelevels),
    youtubeUrl: row.youtubeurl,
    youtubeLabel: row.youtubelabel,
    youtubeLinks: jsonList(row.youtubelinks),
    bilibiliUrl: row.bilibiliurl,
    relatedLinks: jsonList(row.relatedlinks),
    featured: row.featured === true,
    subtitle: row.subtitle,
  })
}

/** 標的 → 寫入用資料列；每個欄位都寫（清空的欄位寫 null），sortorder 保留畫面上的順序。 */
export function financeInstrumentToDbRow(instrument, sortorder = 0) {
  const normalized = normalizeCustomFinanceInstrument(instrument || {})
  if (!normalized) return null
  return {
    name: normalized.name,
    symbol: normalized.symbol,
    provider: normalized.provider,
    region: normalized.group,
    imageurls: normalized.imageUrls || [],
    sortorder,
    slug: normalized.slug ?? null,
    sourceurl: normalized.sourceUrl ?? null,
    historysymbol: normalized.historySymbol ?? null,
    alertthreshold: normalized.alertThreshold ?? null,
    locallabel: normalized.localLabel ?? null,
    periodlabel: normalized.periodLabel ?? null,
    referencelevels: normalized.referenceLevels || [],
    youtubeurl: normalized.youtubeUrl ?? null,
    youtubelabel: normalized.youtubeLabel ?? null,
    youtubelinks: normalized.youtubeLinks || [],
    bilibiliurl: normalized.bilibiliUrl ?? null,
    relatedlinks: normalized.relatedLinks || [],
    featured: normalized.featured === true,
    subtitle: normalized.subtitle ?? null,
  }
}

const rowKey = (row) => getCustomFinanceInstrumentKey({ provider: row.provider, symbol: String(row.symbol || '') })

/**
 * 算出把資料表變成 `list` 需要的寫入：
 * - upserts：清單內每一檔（同 provider|symbol 只留最後一筆，避免 upsert 同鍵兩次）
 * - deleteIds：資料表裡有、清單裡已經沒有的列
 */
export function planFinanceInstrumentSync(existingRows, list) {
  const byKey = new Map()
  for (const item of Array.isArray(list) ? list : []) {
    const row = financeInstrumentToDbRow(item)
    if (!row) continue
    const key = rowKey(row)
    if (byKey.has(key)) byKey.delete(key)
    byKey.set(key, row)
  }
  const upserts = [...byKey.values()].map((row, index) => ({ ...row, sortorder: index }))
  const keep = new Set(byKey.keys())
  const deleteIds = (Array.isArray(existingRows) ? existingRows : [])
    .filter((row) => row?.id != null && !keep.has(rowKey(row)))
    .map((row) => row.id)
  return { upserts, deleteIds }
}

export async function fetchFinanceInstrumentRows(client) {
  const { data, error } = await client
    .from(FINANCE_INSTRUMENT_TABLE)
    .select('*')
    .order('sortorder', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * 讓資料表內容等於 `list`，回傳寫入後的資料列（下次比對用）。
 * 只刪除 existingRows 裡已知的列，不會誤刪其他裝置剛新增、這裡還沒讀到的標的。
 */
export async function saveFinanceInstrumentList(client, list, existingRows = []) {
  const { upserts, deleteIds } = planFinanceInstrumentSync(existingRows, list)
  let saved = []
  if (upserts.length) {
    const now = new Date().toISOString()
    const { data, error } = await client
      .from(FINANCE_INSTRUMENT_TABLE)
      .upsert(upserts.map((row) => ({ ...row, updated_at: now })), { onConflict: 'provider,symbol' })
      .select()
    if (error) throw error
    saved = data || []
  }
  if (deleteIds.length) {
    const { error } = await client.from(FINANCE_INSTRUMENT_TABLE).delete().in('id', deleteIds)
    if (error) throw error
  }
  return saved.sort((a, b) => (a.sortorder ?? 0) - (b.sortorder ?? 0))
}

/** 讀 toollistsync 裡的舊清單（表不存在或沒資料時回 []）。 */
export async function readLegacyFinanceList(client) {
  try {
    const { data, error } = await client
      .from('toollistsync')
      .select('payload')
      .eq('sync_key', LEGACY_FINANCE_SYNC_KEY)
      .limit(1)
    if (error) throw error
    return parseCloudPayload(data?.[0]?.payload) || []
  } catch {
    return []
  }
}

/** financeinstrument 表還沒建時的退路：照舊寫 toollistsync，資料不會只剩本機。 */
export async function writeLegacyFinanceList(client, list) {
  const payload = Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : []
  const { data, error } = await client
    .from('toollistsync')
    .select('sync_key')
    .eq('sync_key', LEGACY_FINANCE_SYNC_KEY)
    .limit(1)
  if (error) throw error
  const query = data?.[0]
    ? client
      .from('toollistsync')
      .update({ payload, updated_at: new Date().toISOString() })
      .eq('sync_key', LEGACY_FINANCE_SYNC_KEY)
    : client.from('toollistsync').insert([{ sync_key: LEGACY_FINANCE_SYNC_KEY, payload }])
  const { error: writeError } = await query
  if (writeError) throw writeError
}
