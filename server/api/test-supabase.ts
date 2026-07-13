import { createClient } from '@supabase/supabase-js'

// Health check against the real primary table used by the app.
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

    const { error } = await supabase
      .from('subscription')
      .select('id', { count: 'exact', head: true })

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Supabase 連接成功',
      table: 'subscription',
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: `Supabase 連接失敗: ${error?.message || error}`
    })
  }
})
