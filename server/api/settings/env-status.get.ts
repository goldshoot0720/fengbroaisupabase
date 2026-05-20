const maskSecret = (value?: string) => {
  const secret = String(value || '').trim()
  if (!secret) return ''
  if (secret.length <= 8) return '••••'
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`
}

export default defineEventHandler(() => {
  const config = useRuntimeConfig()

  const entries = [
    {
      key: 'RESEND_API_KEY',
      label: 'Resend API Key',
      value: config.RESEND_API_KEY || process.env.RESEND_API_KEY,
      description: '寄送 Email 使用的伺服器端金鑰'
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      label: 'Supabase Service Role Key',
      value: config.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      description: '伺服器端管理 Supabase 的高權限金鑰'
    },
    {
      key: 'NETLIFY_AUTH_TOKEN',
      label: 'Netlify Auth Token',
      value: config.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_AUTH_TOKEN,
      description: 'Netlify Blobs / 部署 API 使用'
    },
    {
      key: 'VAPID_PRIVATE_KEY',
      label: 'VAPID Private Key',
      value: config.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY,
      description: 'Web Push 推播私鑰'
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
