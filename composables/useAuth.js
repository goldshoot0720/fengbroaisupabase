import { computed, ref } from 'vue'
import { getSupabaseBrowserClient } from './useSupabaseBrowserClient'

const session = ref(null)
const ready = ref(false)
const loading = ref(false)
const error = ref('')
let authSubscription = null
let initialized = false

const friendlyAuthError = (value) => {
  const message = String(value?.message || value || '')
  if (/invalid login credentials/i.test(message)) return 'Email 或密碼不正確。'
  if (/email not confirmed/i.test(message)) return '請先完成 Email 驗證，再重新登入。'
  if (/rate limit/i.test(message)) return '嘗試次數過多，請稍候再試。'
  return message || '驗證服務暫時無法使用，請稍候再試。'
}

export const useAuth = () => {
  const initializeAuth = async () => {
    if (initialized) return session.value
    initialized = true
    const client = getSupabaseBrowserClient()
    if (!client) {
      ready.value = true
      error.value = '尚未設定 Supabase URL 與 anon key。'
      return null
    }

    try {
      const { data, error: sessionError } = await client.auth.getSession()
      if (sessionError) throw sessionError
      session.value = data.session
      const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
        session.value = nextSession
        ready.value = true
      })
      authSubscription = listener.subscription
    } catch (authError) {
      error.value = friendlyAuthError(authError)
    } finally {
      ready.value = true
    }
    return session.value
  }

  const signIn = async (email, password) => {
    const client = getSupabaseBrowserClient()
    if (!client) return { success: false, error: '尚未設定 Supabase 連線。' }
    loading.value = true
    error.value = ''
    try {
      const { data, error: signInError } = await client.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      session.value = data.session
      return { success: true }
    } catch (authError) {
      error.value = friendlyAuthError(authError)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  const signOut = async () => {
    const client = getSupabaseBrowserClient()
    if (client) await client.auth.signOut()
    session.value = null
  }

  const disposeAuth = () => {
    authSubscription?.unsubscribe?.()
    authSubscription = null
    initialized = false
  }

  return {
    session,
    user: computed(() => session.value?.user || null),
    ready,
    loading,
    error,
    initializeAuth,
    signIn,
    signOut,
    disposeAuth,
  }
}
