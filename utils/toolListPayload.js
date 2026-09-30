// toollistsync.payload（JSONB）的讀取正規化。
// 早期 useCloudListSync 把 JSON.stringify 後的字串寫進 JSONB，讀回來是字串；
// 這裡把陣列與舊的字串格式都解成陣列，其他情況回 null（視為沒有資料）。
export const parseCloudPayload = (payload) => {
  if (Array.isArray(payload)) return payload
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload || '[]')
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}
