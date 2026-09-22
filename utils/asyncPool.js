// utils/asyncPool.js
// 批次寫入 Supabase 時用的並行工具：一次送出多個請求，而不是一筆等一筆。

export const DEFAULT_WRITE_CONCURRENCY = 6

// 以固定並行數執行 worker(item, index)，回傳與輸入同順序的結果。
export const mapWithConcurrency = async (items, worker, concurrency = DEFAULT_WRITE_CONCURRENCY) => {
  const list = Array.from(items || [])
  const results = new Array(list.length)
  let cursor = 0
  const limit = Math.max(1, Math.min(concurrency, list.length))
  const runners = Array.from({ length: limit }, async () => {
    while (cursor < list.length) {
      const index = cursor++
      results[index] = await worker(list[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

// 依 key 分組：同一組內「依序」執行（例如同一鍵先新增、後更新不會互相踩到），
// 不同組之間並行。適合 CSV 匯入「相同鍵更新、其餘新增」。
export const runGroupedConcurrently = async (
  items,
  keyFn,
  worker,
  concurrency = DEFAULT_WRITE_CONCURRENCY
) => {
  const groups = new Map()
  for (const item of items || []) {
    const key = keyFn(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  await mapWithConcurrency([...groups.entries()], async ([key, group]) => {
    for (const item of group) await worker(item, key)
  }, concurrency)
}
