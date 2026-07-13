const maskSecret = (value?: string) => {
  const secret = String(value || '').trim()
  if (!secret) return ''
  if (secret.length <= 8) return '****'
  return `${secret.slice(0, 4)}****${secret.slice(-4)}`
}

export default defineEventHandler(() => {
  const config = useRuntimeConfig()

  const entries = [
    {
      key: 'RESEND_API_KEY',
      label: 'Resend API Key',
      value: config.RESEND_API_KEY || process.env.RESEND_API_KEY,
      description: 'Email 通知寄信用 API Key。'
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      label: 'Supabase Service Role Key',
      value: config.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      description: 'Netlify 排程推播讀取 push_subscriptions 與訂閱資料使用。'
    },
    {
      key: 'NETLIFY_AUTH_TOKEN',
      label: 'Netlify Auth Token',
      value: config.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_AUTH_TOKEN,
      description: 'Netlify API 與部署管理使用。'
    },
    {
      key: 'VAPID_EMAIL',
      label: 'VAPID Email',
      value: config.VAPID_EMAIL || process.env.VAPID_EMAIL,
      description: 'Web Push VAPID 聯絡信箱，例如 mailto:admin@example.com。'
    },
    {
      key: 'NUXT_PUBLIC_VAPID_PUBLIC_KEY',
      label: 'VAPID Public Key',
      value: config.public?.vapidPublicKey || process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY,
      description: '瀏覽器訂閱 Web Push 使用的公開金鑰。'
    },
    {
      key: 'VAPID_PRIVATE_KEY',
      label: 'VAPID Private Key',
      value: config.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY,
      description: 'Netlify 排程實際寄出 Web Push 使用的私密金鑰。'
    }
  ]

  return {
    variables: entries.map((entry) => ({
      key: entry.key,
      label: entry.label,
      description: entry.description,
      configured: Boolean(String(entry.value || '').trim()),
      maskedValue: maskSecret(entry.value)
    }))
  }
})
