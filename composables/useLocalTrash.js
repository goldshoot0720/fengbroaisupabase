import { ref } from 'vue'

export const useLocalTrash = (storageKey, { limit = 100 } = {}) => {
  const items = ref([])

  const persist = () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(storageKey, JSON.stringify(items.value.slice(0, limit)))
  }

  const load = () => {
    if (typeof localStorage === 'undefined') return
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]')
      items.value = Array.isArray(parsed)
        ? parsed.filter((item) => item?.record && item?.deletedAt).slice(0, limit)
        : []
    } catch {
      items.value = []
    }
  }

  const moveToTrash = (records) => {
    const next = (Array.isArray(records) ? records : [records]).filter(Boolean)
    const existingIds = new Set(next.map((record) => record.id))
    items.value = [
      ...next.map((record) => ({ record: structuredClone(record), deletedAt: new Date().toISOString() })),
      ...items.value.filter((item) => !existingIds.has(item.record?.id)),
    ].slice(0, limit)
    persist()
  }

  const remove = (item) => {
    items.value = items.value.filter((candidate) => candidate !== item)
    persist()
  }

  const clear = () => {
    items.value = []
    if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey)
  }

  return { items, load, moveToTrash, remove, clear }
}
