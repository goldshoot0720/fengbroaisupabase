export default defineEventHandler(async (event) => {
  try {
    const supabase = useSupabaseClient()
    
    // 測試各個表格
    const tables = ['subscriptions', 'foods', 'banks', 'common_accounts', 'articles']
    const results = []
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        results.push({
          table,
          status: error ? 'error' : 'success',
          error: error?.message || null,
          hasData: data && data.length > 0
        })
      } catch (err: any) {
        results.push({
          table,
          status: 'error',
          error: err.message,
          hasData: false
        })
      }
    }
    
    return {
      success: true,
      tables: results,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `表格測試失敗: ${error.message}`
    })
  }
})