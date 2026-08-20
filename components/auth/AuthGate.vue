<template>
  <main class="auth-shell">
    <section class="auth-panel" aria-labelledby="auth-title">
      <div class="auth-brand" aria-hidden="true">FA</div>
      <div>
        <h1 id="auth-title">登入鋒兄工作台</h1>
        <p>私人資料受到 Supabase Auth 與資料庫權限保護。請登入後繼續。</p>
      </div>

      <div v-if="!ready" class="auth-loading" role="status" aria-live="polite">
        <span class="auth-spinner" aria-hidden="true"></span>
        正在確認登入狀態
      </div>

      <form v-else class="auth-form" @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input v-model.trim="email" type="email" autocomplete="email" required placeholder="name@example.com">
        </label>
        <label>
          <span>密碼</span>
          <input v-model="password" type="password" autocomplete="current-password" required minlength="8" placeholder="至少 8 個字元">
        </label>
        <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? '登入中…' : '安全登入' }}
        </button>
      </form>

      <p class="auth-note">沒有公開展示資料；未登入時不會向資料庫載入訂閱、帳號、銀行或私人內容。</p>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

const email = ref('')
const password = ref('')
const { ready, loading, error, signIn } = useAuth()
const submit = async () => {
  const result = await signIn(email.value, password.value)
  if (result.success && typeof window !== 'undefined') window.location.reload()
}
</script>

<style scoped>
.auth-shell { min-height: 100vh; display: grid; place-items: center; padding: clamp(1rem, 4vw, 3rem); background: var(--bg-canvas); }
.auth-panel { width: min(100%, 440px); display: flex; flex-direction: column; gap: var(--spacing-lg); padding: clamp(1.5rem, 5vw, 2.5rem); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--bg-surface); box-shadow: var(--elevation-2); }
.auth-brand { width: 52px; height: 52px; display: grid; place-items: center; border-radius: var(--radius-md); color: var(--text-inverse); background: var(--primary); font-family: var(--font-display); font-weight: 800; }
h1 { margin: 0 0 var(--spacing-xs); color: var(--text-primary); font-size: var(--text-3xl); }
p { margin: 0; color: var(--text-secondary); line-height: 1.6; }
.auth-form, .auth-form label { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.auth-form { gap: var(--spacing-md); }
.auth-form label span { color: var(--text-primary); font-size: var(--text-sm); font-weight: 700; }
input { min-height: 48px; padding: 0 var(--spacing-md); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--text-primary); background: var(--bg-elevated); }
button { min-height: 48px; border: 0; border-radius: var(--radius-sm); color: var(--text-inverse); background: var(--primary); cursor: pointer; font-weight: 800; }
button:hover:not(:disabled) { background: var(--primary-hover); }
button:disabled { cursor: wait; opacity: .65; }
.auth-error { padding: var(--spacing-sm); border-radius: var(--radius-sm); color: var(--danger); background: var(--danger-light); font-size: var(--text-sm); }
.auth-note { padding-top: var(--spacing-md); border-top: 1px solid var(--border-subtle); font-size: var(--text-xs); }
.auth-loading { display: flex; align-items: center; gap: var(--spacing-sm); color: var(--text-secondary); }
.auth-spinner { width: 18px; height: 18px; border: 2px solid var(--border-strong); border-top-color: var(--primary); border-radius: 50%; animation: auth-spin .8s linear infinite; }
@keyframes auth-spin { to { transform: rotate(360deg); } }
</style>
