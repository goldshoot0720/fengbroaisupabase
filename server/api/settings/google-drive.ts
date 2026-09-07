import {
  assertNotificationPassword,
  ensureSettingsRow,
  getSettingsClient,
  maskCredential,
} from '../../utils/settingsStore.js'

// Google 雲端硬碟連接設定的雲端讀寫（googledrivesettings 表）。
// 行為對應 fengbroaiappwrite 的 /api/google-drive-settings，但密碼不另外開一組：
// 沿用 resendsettings 的「通知密碼」，見 server/utils/settingsStore.js。
//
// - GET   讀取設定（client_id / api_key 遮蔽，不需密碼）
// - POST  verify：驗證通知密碼，成功才回明文
// - PUT   儲存設定（需通過通知密碼驗證）
//
// 存的是 Google 的瀏覽器端憑證，本來就會出現在前端；真正的防護是 Google Cloud
// Console 的 JavaScript 來源 / HTTP 參照網址限制。這裡遮蔽只是避免整串顯示在畫面上。

const TABLE = 'googledrivesettings'

function toPublicPayload(row: any, includeSecrets = false) {
  const clientId = row?.client_id || ''
  const apiKey = row?.api_key || ''
  return {
    configured: Boolean(clientId && apiKey),
    clientId: includeSecrets ? clientId : maskCredential(clientId),
    apiKey: includeSecrets ? apiKey : maskCredential(apiKey),
    hasClientId: Boolean(clientId),
    hasApiKey: Boolean(apiKey),
    updatedAt: row?.updated_at || null,
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method
  const body: any = await readBody(event).catch(() => ({}))

  try {
    if (method === 'GET') {
      // GET 不支援 body：連線資訊走 query。
      const client = getSettingsClient(event, getQuery(event))
      const row = await ensureSettingsRow(client, TABLE)
      return toPublicPayload(row)
    }

    if (method === 'POST') {
      const client = getSettingsClient(event, body)
      await assertNotificationPassword(client, String(body.password || ''))
      const row = await ensureSettingsRow(client, TABLE)
      return toPublicPayload(row, true)
    }

    if (method === 'PUT') {
      const client = getSettingsClient(event, body)
      await assertNotificationPassword(client, String(body.password || ''))

      const clientId = String(body.clientId || '').trim()
      const apiKey = String(body.apiKey || '').trim()

      // 遮蔽值是 GET 回傳給畫面的顯示形式，不該被當成真值寫回去。
      if (clientId.includes('•') || apiKey.includes('•')) {
        throw createError({
          statusCode: 400,
          statusMessage: '欄位仍是遮蔽值，請先「解鎖顯示」載入明文，或重新貼上完整憑證。',
        })
      }

      const data = {
        client_id: clientId,
        api_key: apiKey,
        updated_at: new Date().toISOString(),
      }
      await ensureSettingsRow(client, TABLE)
      const { error } = await client.from(TABLE).update(data).eq('rowkey', 'main')
      if (error) throw error

      return { success: true, ...toPublicPayload({ ...data }, true) }
    }

    throw createError({ statusCode: 405, statusMessage: `Method ${method} not allowed` })
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('google-drive settings error:', error)
    throw createError({ statusCode: 500, statusMessage: error?.message || '操作失敗' })
  }
})
