import { ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'

const initSupabase = () => {
  return getSupabaseBrowserClient()
}

export const useImages = () => {
  const images = ref([])
  const loading = ref(false)
  const error = ref(null)

  const TABLE = 'image'
  const FIELDS = ['name', 'file', 'filetype', 'note', 'ref', 'category', 'hash', 'cover']
  const FIELD_LIMITS = {
    name: 100,
    file: 150,
    filetype: 20,
    note: 100,
    ref: 100,
    category: 100,
    hash: 300,
    cover: 150
  }

  const extractStoragePath = (value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    if (!trimmed) return ''

    try {
      const url = new URL(trimmed)
      const marker = '/storage/v1/object/public/'
      const markerIndex = url.pathname.indexOf(marker)
      if (markerIndex === -1) return trimmed
      const objectPath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
      const slashIndex = objectPath.indexOf('/')
      if (slashIndex === -1) return trimmed
      return objectPath.slice(slashIndex + 1)
    } catch {
      return trimmed
    }
  }

  const normalizeField = (field, value) => {
    if (value === undefined || value === null) return null

    let normalized = typeof value === 'string' ? value.trim() : value
    if (!normalized && normalized !== 0) return null

    if (field === 'file' || field === 'cover') {
      normalized = extractStoragePath(normalized)
    }

    const limit = FIELD_LIMITS[field]
    if (typeof normalized === 'string' && limit && normalized.length > limit) {
      normalized = normalized.slice(0, limit)
    }

    return normalized
  }

  const buildPayload = (item) => {
    const payload = {}
    FIELDS.forEach((field) => {
      const normalized = normalizeField(field, item[field])
      if (field === 'name') payload[field] = normalized || ''
      else if (normalized !== null && normalized !== '') payload[field] = normalized
    })
    return payload
  }

  const loadImages = async () => {
    const client = initSupabase()
    if (!client) return
    try {
      loading.value = true
      error.value = null
      const { data, error: fetchError } = await client
        .from(TABLE).select('*').order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      images.value = data || []
    } catch (e) {
      console.error('Error loading images:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const addImage = async (item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = buildPayload(item)
      const { data, error: err } = await client.from(TABLE).insert([payload]).select()
      if (err) throw err
      if (data) images.value.unshift(data[0])
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const updateImage = async (id, item) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const payload = buildPayload(item)
      const { data, error: err } = await client.from(TABLE).update(payload).eq('id', id).select()
      if (err) throw err
      if (data) {
        const idx = images.value.findIndex(a => a.id === id)
        if (idx !== -1) images.value[idx] = data[0]
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const deleteImage = async (id) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No client' }
    try {
      loading.value = true
      const { error: err } = await client.from(TABLE).delete().eq('id', id)
      if (err) throw err
      images.value = images.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  const importImages = async (rows) => {
    const client = initSupabase()
    if (!client) return { success: false, error: '無法連接資料庫' }
    try {
      loading.value = true
      const payload = rows
        .map(buildPayload)
        .filter(r => r.name)
      if (payload.length === 0) return { success: false, error: '無有效資料' }
      const { data, error: err } = await client.from(TABLE).insert(payload).select()
      if (err) throw err
      images.value.push(...data)
      return { success: true, count: data.length, message: '匯入成功' }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return { images, loading, error, FIELDS, loadImages, addImage, updateImage, deleteImage, importImages }
}
