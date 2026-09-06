// netlify/functions/landtop-history-cron.js
// Weekly snapshot for every 鋒兄工具／手機比價 keyword a user has ever
// looked up, so landtop_history keeps growing even if nobody opens the
// page that week. Mirrors send-push-cron.js's scheduled-function shape.

import { createClient } from '@supabase/supabase-js'
import { compareLandtopAndJyes, buildLandtopSnapshotSeries, LandtopLookupError } from '../../utils/landtopLookup.js'

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const HISTORY_INTERVAL_DAYS = 7
const TABLE = 'landtop_history'

const missingEnv = () => REQUIRED_ENV.filter((key) => !process.env[key])

export default async () => {
  const missing = missingEnv()
  if (missing.length > 0) {
    console.error('[landtop-history-cron] Missing env:', missing.join(', '))
    return new Response(`Missing env: ${missing.join(', ')}`, { status: 500 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Tracked keywords = whatever anyone has already searched (recorded by
  // useLandtopHistory.recordLandtopSnapshot on the client). No table means
  // nobody has used the tool yet, which is a normal, non-error state.
  const { data: rows, error: listError } = await supabase
    .from(TABLE)
    .select('keyword_key, keyword')
    .order('updated_at', { ascending: false })

  if (listError) {
    if (listError.code === '42P01' || listError.code === 'PGRST205') {
      return new Response('landtop_history table not created yet', { status: 200 })
    }
    console.error('[landtop-history-cron] Query landtop_history failed:', listError.message)
    return new Response('Query landtop_history failed', { status: 500 })
  }

  const seen = new Set()
  const tracked = []
  for (const row of rows || []) {
    const key = row.keyword_key
    if (!key || seen.has(key)) continue
    seen.add(key)
    tracked.push({ keywordKey: key, keyword: row.keyword || key })
  }

  if (tracked.length === 0) {
    return new Response('No tracked keywords', { status: 200 })
  }

  let created = 0
  let updated = 0
  let failed = 0

  for (const item of tracked) {
    try {
      const result = await compareLandtopAndJyes(item.keyword)
      const series = buildLandtopSnapshotSeries(result.comparison)
      const now = new Date()

      const { data: existing, error: existingError } = await supabase
        .from(TABLE)
        .select('id, snapshot_date')
        .eq('keyword_key', item.keywordKey)
        .order('snapshot_date', { ascending: false })
        .limit(1)
      if (existingError) throw existingError

      const last = existing?.[0]
      const withinInterval = Boolean(
        last?.snapshot_date &&
        (now.getTime() - new Date(last.snapshot_date).getTime()) / (1000 * 60 * 60 * 24) < HISTORY_INTERVAL_DAYS
      )

      const payload = {
        keyword_key: item.keywordKey,
        keyword: item.keyword,
        brand_label: result.brandLabel || null,
        product_name: result.productName || null,
        snapshot_date: now.toISOString(),
        series,
        updated_at: now.toISOString()
      }

      if (withinInterval && last?.id) {
        const { error: updateError } = await supabase.from(TABLE).update(payload).eq('id', last.id)
        if (updateError) throw updateError
        updated++
      } else {
        const { error: insertError } = await supabase.from(TABLE).insert([payload])
        if (insertError) throw insertError
        created++
      }
    } catch (err) {
      failed++
      const message = err instanceof LandtopLookupError ? err.statusMessage : err?.message
      console.error(`[landtop-history-cron] "${item.keyword}" failed:`, message)
    }
  }

  return new Response(
    JSON.stringify({ tracked: tracked.length, created, updated, failed }),
    { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } }
  )
}

// 01:00 UTC Monday = Asia/Taipei 09:00 Monday
export const config = {
  schedule: '0 1 * * 1'
}
