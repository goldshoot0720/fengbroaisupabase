import { createClient } from '@supabase/supabase-js'
import { getSupabaseCredentials } from './useSettings'

const SUPABASE_CLIENT_CACHE_KEY = '__feng_supabase_browser_clients__'

const getClientCache = () => {
  if (!globalThis[SUPABASE_CLIENT_CACHE_KEY]) {
    globalThis[SUPABASE_CLIENT_CACHE_KEY] = new Map()
  }
  return globalThis[SUPABASE_CLIENT_CACHE_KEY]
}

export const getSupabaseBrowserConfig = () => {
  const creds = getSupabaseCredentials()
  const config = useRuntimeConfig()
  const url = creds?.url || config.public.supabaseUrl
  const key = creds?.key || config.public.supabaseAnonKey
  const source = creds ? 'localStorage' : '.env'

  if (!url || !key) {
    return { url: '', key: '', source, credKey: '' }
  }

  return {
    url,
    key,
    source,
    credKey: `${url}:${key.slice(0, 20)}`
  }
}

export const getSupabaseBrowserClient = () => {
  if (typeof window === 'undefined') return null

  const { url, key, credKey } = getSupabaseBrowserConfig()
  if (!url || !key || !credKey) return null

  const cache = getClientCache()
  if (!cache.has(credKey)) {
    cache.set(credKey, createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }))
  }

  return cache.get(credKey)
}
