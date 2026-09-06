import { compareLandtopAndJyes, LandtopLookupError } from '~~/utils/landtopLookup.js'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ keyword?: string }>(event)
  const keyword = String(body?.keyword || '').trim()

  if (!keyword) {
    throw createError({ statusCode: 400, statusMessage: '請輸入要查詢的型號。' })
  }

  try {
    return await compareLandtopAndJyes(keyword)
  } catch (error) {
    if (error instanceof LandtopLookupError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.statusMessage })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : '手機比價查詢失敗。'
    })
  }
})
