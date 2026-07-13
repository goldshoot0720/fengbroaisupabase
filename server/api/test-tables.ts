import { createClient } from '@supabase/supabase-js'

// Probe the actual tables used by fengbroaisupabase pages/composables.
const TABLES = [
  'subscription',
  'food',
  'article',
  'commonaccount',
  'image',
  'video',
  'music',
  'commondocument',
  'podcast',
  'bank',
  'routine',
  'push_subscriptions'
] as const

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig(event)
    const url = config.supabaseUrl || process.env.SUPABASE_URL
    const key = config.supabaseAnonKey || process.env.SUPABASE_ANON_KEY

    if (!url || !key) {
      throw createError({
        statusCode: 500,
        statusMessage: '缺少 SUPABASE_URL 或 SUPABASE_ANON_KEY'
      })
    }

    const supabase = createClient(url, key)
    const results = []

    for (const table of TABLES) {
      try {
        const { error, count } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })

        results.push({
          table,
          status: error ? 'error' : 'success',
          error: error?.message || null,
          count: typeof count === 'number' ? count : null
        })
      } catch (err: any) {
        results.push({
          table,
          status: 'error',
          error: err?.message || String(err),
          count: null
        })
      }
    }

    const ok = results.filter((item) => item.status === 'success').length
    return {
      success: ok > 0,
      summary: {
        total: results.length,
        ok,
        failed: results.length - ok
      },
      tables: results,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `表格測試失敗: ${error?.message || error}`
    })
  }
})
