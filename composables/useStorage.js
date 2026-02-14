import { ref } from 'vue'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseCredentials, getSupabaseBucket } from './useSettings'

// 取得 bucket 名稱：localStorage 帳號 → .env → 預設 'uploads'
const getBucket = () => {
  const fromSettings = getSupabaseBucket()
  if (fromSettings) return fromSettings
  try {
    const config = useRuntimeConfig()
    return config.public.supabaseBucket || 'uploads'
  } catch {
    return 'uploads'
  }
}

let supabase = null
let currentCredentials = null

const initSupabase = () => {
  if (typeof window === 'undefined') return null
  const creds = getSupabaseCredentials()
  const config = useRuntimeConfig()
  const url = creds?.url || config.public.supabaseUrl
  const key = creds?.key || config.public.supabaseAnonKey
  const credKey = `${url}:${key?.slice(0, 20)}`
  if (supabase && currentCredentials !== credKey) supabase = null
  if (!supabase) {
    supabase = createClient(url, key)
    currentCredentials = credKey
  }
  return supabase
}

export const useStorage = () => {
  const uploading = ref(false)
  const uploadProgress = ref(0)

  /**
   * Upload file to Supabase Storage
   * @param {File} file - The file to upload
   * @param {string} folder - Folder name inside bucket (e.g. 'food', 'article')
   * @param {string} customPath - Optional full custom path (overrides folder + auto name)
   * @returns {Promise<{success: boolean, url?: string, path?: string, error?: string}>}
   */
  const uploadFile = async (file, folder = 'general', customPath = null) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No Supabase client' }

    try {
      uploading.value = true
      uploadProgress.value = 0

      // Generate unique file path: folder/timestamp_filename
      const timestamp = Date.now()
      // Sanitize filename: only keep ASCII letters, digits, dash, underscore, dot
      // Supabase Storage rejects non-ASCII characters (CJK, emoji, etc.)
      const safeName = file.name
        .replace(/[^a-zA-Z0-9._\-]/g, '_')   // non-ASCII-safe → _
        .replace(/_{2,}/g, '_')               // collapse __
        .replace(/^_|_$/g, '')                // trim leading/trailing _
        || 'file'
      const filePath = customPath || `${folder}/${timestamp}_${safeName}`

      const bucketName = getBucket()
      console.log('[useStorage] bucket =', bucketName)
      const probe = await client.storage.from(bucketName).list('')
      if (probe.error) {
        throw new Error(`Bucket "${bucketName}" not found`)
      }
      // Upload file
      const { data, error } = await client.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      uploadProgress.value = 100

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      }
    } catch (e) {
      const bucketName = getBucket()
      const msg = e?.message?.includes('Bucket')
        ? `Bucket "${bucketName}" not found。請在 Supabase 建立此 bucket，或到設定頁設定正確的 SUPABASE_BUCKET。`
        : e.message
      console.error('Upload error:', e)
      return { success: false, error: msg }
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} path - File path in bucket (e.g. 'food/123_photo.jpg')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const deleteFile = async (path) => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No Supabase client' }

    try {
      const { error } = await client.storage
        .from(getBucket())
        .remove([path])

      if (error) throw error

      return { success: true }
    } catch (e) {
      console.error('Delete error:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Get public URL for a file
   * @param {string} path - File path in bucket
   * @returns {string|null}
   */
  const getPublicUrl = (path) => {
    const client = initSupabase()
    if (!client) return null

    const { data } = client.storage
      .from(getBucket())
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * List files in a bucket folder
   * @param {string} folder - Folder path to list (defaults to root)
   * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
   */
  const listFiles = async (folder = '') => {
    const client = initSupabase()
    if (!client) return { success: false, error: 'No Supabase client' }

    try {
      const { data, error } = await client.storage
        .from(getBucket())
        .list(folder)

      if (error) throw error

      return { success: true, files: data }
    } catch (e) {
      console.error('List files error:', e)
      return { success: false, error: e.message }
    }
  }

  return {
    getBucket,
    uploading,
    uploadProgress,
    uploadFile,
    deleteFile,
    getPublicUrl,
    listFiles
  }
}
