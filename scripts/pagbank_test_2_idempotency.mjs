// Teste 2: idempotência com body idêntico
// Espera-se retornar o MESMO order.id
import crypto from 'node:crypto'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('/app/.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const BASE = env.PAGBANK_BASE_URL
const TOKEN = env.PAGBANK_ACCESS_TOKEN
const APP = env.APP_BASE_URL

const idemp = crypto.randomUUID()
const ref = `barbearia-idemp-${Date.now()}`
const exp = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '-03:00')

const body = {
  reference_id: ref,
  customer: { name: 'Cliente Teste Idemp', email: 'idemp@teste.com', tax_id: '12345678909', phones: [{ country: '55', area: '21', number: '979012977', type: 'MOBILE' }] },
  items: [{ reference_id: 'agend-1', name: 'Corte de Cabelo', quantity: 1, unit_amount: 100 }],
  qr_codes: [{ amount: { value: 100 }, expiration_date: exp }],
  notification_urls: [`${APP}/api/pagbank/webhook`],
}
const bodyStr = JSON.stringify(body)

async function post() {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${TOKEN}`, 'x-idempotency-key': idemp },
    body: bodyStr,
  })
  return { status: res.status, text: await res.text() }
}

console.log('=== Teste idempotência: 2 POST com MESMA key + MESMO body ===')
console.log('idempotency-key =', idemp)
const r1 = await post()
console.log('\n📥 POST #1 status:', r1.status)
const j1 = JSON.parse(r1.text)
console.log('   order.id =', j1.id)
console.log('   qr_code.id =', j1.qr_codes?.[0]?.id)

const r2 = await post()
console.log('\n📥 POST #2 status:', r2.status)
try {
  const j2 = JSON.parse(r2.text)
  console.log('   order.id =', j2.id)
  console.log('   qr_code.id =', j2.qr_codes?.[0]?.id)
  if (j1.id === j2.id && j1.qr_codes?.[0]?.id === j2.qr_codes?.[0]?.id) {
    console.log('\n✅ IDEMPOTÊNCIA OK — mesmo order.id e qr_code.id retornado')
  } else {
    console.log('\n⚠️ IDEMPOTÊNCIA — order.id diferente')
  }
} catch {
  console.log('   body =', r2.text.slice(0, 400))
}
