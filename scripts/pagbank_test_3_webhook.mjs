// Teste 3: Webhook autenticado do PagBank
// Envia 3 chamadas para /api/pagbank/webhook:
//   1) SEM header de assinatura → deve retornar 401
//   2) COM assinatura INVÁLIDA → deve retornar 401
//   3) COM assinatura CORRETA (SHA-256(token + '-' + rawBody)) → deve retornar 200 authenticated:true
import crypto from 'node:crypto'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('/app/.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const TOKEN = env.PAGBANK_WEBHOOK_TOKEN || env.PAGBANK_ACCESS_TOKEN
const URL = 'http://localhost:3000/api/pagbank/webhook'

// Payload realista simulando notificação de pagamento aprovado
const payload = {
  id: 'ORDE_TESTE_WEBHOOK_1',
  reference_id: 'barbearia-agend-1789069022486',
  status: 'PAID',
  charges: [
    {
      id: 'CHAR_TESTE_1',
      status: 'PAID',
      amount: { value: 100 },
      payment_method: { type: 'PIX' },
      paid_at: new Date().toISOString(),
    },
  ],
}
const rawBody = JSON.stringify(payload)

async function call(headers) {
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: rawBody })
  return { status: res.status, body: await res.text() }
}

console.log('=== TESTE 3.1: sem assinatura ===')
console.log(await call({}))

console.log('\n=== TESTE 3.2: assinatura INVÁLIDA (aaaaaa...) ===')
console.log(await call({ 'x-authenticity-token': 'a'.repeat(64) }))

console.log('\n=== TESTE 3.3: assinatura CORRETA ===')
const goodSig = crypto.createHash('sha256').update(TOKEN + '-' + rawBody).digest('hex')
console.log('   sig calculada =', goodSig.slice(0, 24) + '...')
console.log(await call({ 'x-authenticity-token': goodSig }))

console.log('\n=== TESTE 3.4: mesma assinatura, body DIFERENTE (replay attack) ===')
const differentBody = JSON.stringify({ ...payload, status: 'CANCELLED' })
const res4 = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-authenticity-token': goodSig }, body: differentBody })
console.log(`   status=${res4.status} body=${(await res4.text()).slice(0, 200)}`)

console.log('\n=== LOG DO WEBHOOK ===')
try { console.log(fs.readFileSync('/tmp/pagbank_webhook_hits.log', 'utf8')) } catch { console.log('(log vazio)') }
