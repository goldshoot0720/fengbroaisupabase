export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const apiKey = String(body?.apiKey || '').trim()
  const from = String(body?.from || '').trim()
  const to = String(body?.to || '').trim()
  const subject = String(body?.subject || '').trim()
  const text = String(body?.text || '').trim()
  const html = String(body?.html || '').trim()
  const idempotencyKey = String(body?.idempotencyKey || '').trim()

  if (!apiKey || !from || !to || !subject || (!text && !html)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required Resend email fields'
    })
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: text || undefined,
      html: html || undefined
    })
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: data?.message || 'Resend email failed',
      data
    })
  }

  return {
    success: true,
    id: data?.id || null
  }
})
