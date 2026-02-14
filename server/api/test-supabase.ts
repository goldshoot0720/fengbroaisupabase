export default defineEventHandler(async (event) => {
  try {
    const supabase = useSupabaseClient()
    
    // 測試基本連接
    const { data, error } = await supabase
      .from('subscriptions')
      .select('count')
      .limit(1)
    
    if (error) {
      throw error
    }
    
    return {
      success: true,
      message: 'Supabase 連接成功',
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Supabase 連接失敗: ${error.message}`
    })
  }
})