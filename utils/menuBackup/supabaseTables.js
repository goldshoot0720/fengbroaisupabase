import { getSupabaseBrowserClient } from '../../composables/useSupabaseBrowserClient.js'

const PAGE_SIZE = 1000

export function requireClient() {
  const client = getSupabaseBrowserClient()
  if (!client) throw new Error('尚未連線 Supabase')
  return client
}

export async function fetchAllRows(table) {
  const client = requireClient()
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

export async function upsertByKey({
  table,
  existing,
  rows,
  keyOfExisting,
  keyOfRow,
  toDb,
  onRow,
}) {
  const index = new Map((existing || []).map((item) => [keyOfExisting(item), item.id]))
  let ok = 0
  let fail = 0
  const client = requireClient()
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    onRow?.(i + 1, rows.length, String(row.name || row.title || i + 1))
    try {
      const key = keyOfRow(row)
      const existingId = index.get(key)
      const payload = toDb(row)
      if (existingId) {
        const { error } = await client.from(table).update(payload).eq('id', existingId)
        if (error) throw error
      } else {
        const { data, error } = await client.from(table).insert([payload]).select('id').single()
        if (error) throw error
        if (data?.id) index.set(key, data.id)
      }
      ok += 1
    } catch {
      fail += 1
    }
  }
  return { ok, fail }
}

export async function upsertToolList(syncKey, payload) {
  const client = requireClient()
  const list = Array.isArray(payload)
    ? payload
    : (typeof payload === 'string' ? JSON.parse(payload || '[]') : [])
  const { data, error } = await client
    .from('toollistsync')
    .select('sync_key')
    .eq('sync_key', syncKey)
    .limit(1)
  if (error) throw error
  if (data?.[0]) {
    const { error: updateError } = await client
      .from('toollistsync')
      .update({ payload: list, updated_at: new Date().toISOString() })
      .eq('sync_key', syncKey)
    if (updateError) throw updateError
  } else {
    const { error: insertError } = await client
      .from('toollistsync')
      .insert([{ sync_key: syncKey, payload: list }])
    if (insertError) throw insertError
  }
}

export function byName(item) {
  return String(item?.name || '').trim().toLocaleLowerCase('zh-Hant')
}
