// EXPERIMENTO ISOLADO PagBank Sandbox — não toca no app, não toca no Firestore
// Roda com: node /app/scripts/pagbank_sandbox_test.mjs
// Depende apenas de: PAGBANK_BASE_URL, PAGBANK_ACCESS_TOKEN, APP_BASE_URL (em /app/.env)

import crypto from 'node:crypto'
import fs from 'node:fs'

// Load /app/.env manualmente (sem dep externa)
function loadEnv() {
  const envPath = '/app/.env'
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnv()

const BASE = process.env.PAGBANK_BASE_URL
const TOKEN = process.env.PAGBANK_ACCESS_TOKEN
const APP = process.env.APP_BASE_URL

function checkEnv() {
  const missing = []
  if (!BASE) missing.push('PAGBANK_BASE_URL')
  if (!TOKEN) missing.push('PAGBANK_ACCESS_TOKEN')
  if (!APP) missing.push('APP_BASE_URL')
  if (missing.length) {
    console.error('❌ Variáveis ausentes em /app/.env:', missing.join(', '))
    process.exit(2)
  }
  console.log('✅ ENV loaded:')
  console.log('   PAGBANK_BASE_URL =', BASE)
  console.log('   PAGBANK_ACCESS_TOKEN = <REDACTED, length=' + TOKEN.length + '>')
  console.log('   APP_BASE_URL =', APP)
}

async function createPixOrder() {
  const idempotencyKey = crypto.randomUUID()
  const referenceId = `barbearia-test-${Date.now()}`
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '-03:00')

  const body = {
    reference_id: referenceId,
    customer: {
      name: 'Cliente Teste Sandbox',
      email: 'teste@exemplo.com',
      tax_id: '12345678909',
      phones: [{ country: '55', area: '21', number: '979012977', type: 'MOBILE' }],
    },
    items: [
      {
        reference_id: 'agend-servico-corte',
        name: 'Agendamento Barbearia Hiroschi - Corte',
        quantity: 1,
        unit_amount: 100, // R$ 1,00 em centavos (só teste)
      },
    ],
    qr_codes: [
      {
        amount: { value: 100 }, // R$ 1,00
        expiration_date: expiresAt,
      },
    ],
    notification_urls: [`${APP}/api/pagbank/webhook`],
  }

  console.log('\n📤 POST /orders → payload:')
  console.log(JSON.stringify(body, null, 2))

  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      'x-idempotency-key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })

  const status = res.status
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = null }

  console.log(`\n📥 Response status: ${status}`)
  console.log('📥 Response body:')
  console.log(text.slice(0, 3000))

  return { status, json, referenceId, idempotencyKey }
}

async function getOrder(orderId) {
  console.log(`\n📤 GET /orders/${orderId}`)
  const res = await fetch(`${BASE}/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  })
  const text = await res.text()
  console.log(`📥 Status: ${res.status}`)
  console.log(text.slice(0, 2000))
  return { status: res.status, body: text }
}

function testIdempotency(sameKey) {
  console.log('\n🔒 Teste de idempotência: reenviando com mesma x-idempotency-key...')
  return sameKey
}

async function main() {
  console.log('=== PagBank Sandbox — Experimento Isolado ===\n')
  checkEnv()

  const created = await createPixOrder()

  if (created.status >= 200 && created.status < 300 && created.json) {
    const orderId = created.json.id
    const qrArr = created.json.qr_codes || []
    const qr = qrArr[0]
    console.log('\n✅ ORDER CRIADA')
    console.log('   order.id =', orderId)
    console.log('   qr_code.id =', qr?.id)
    console.log('   qr_code.text (copia-e-cola) =', qr?.text?.slice(0, 80), '...')
    console.log('   qr_code.amount.value =', qr?.amount?.value, '(centavos)')
    console.log('   qr_code.expiration_date =', qr?.expiration_date)
    const png = qr?.links?.find(l => l.media === 'image/png')
    console.log('   qr_code PNG href =', png?.href)

    // Consulta idempotente
    await getOrder(orderId)

    // Segundo POST com MESMA idempotency-key → deve retornar mesmo order.id, sem duplicar
    console.log('\n🔁 Segundo POST com mesma x-idempotency-key:')
    const second = await createPixOrder2(created.idempotencyKey, created.referenceId)
    if (second?.id === orderId) {
      console.log('✅ IDEMPOTÊNCIA OK — mesmo order.id retornado')
    } else {
      console.log('⚠️ IDEMPOTÊNCIA — order.id diferente ou não retornado (verificar comportamento sandbox)')
    }
  } else {
    console.log('\n❌ Order NÃO criada. Analisar erro acima.')
  }
}

async function createPixOrder2(idempotencyKey, referenceId) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '-03:00')
  const body = {
    reference_id: referenceId,
    customer: { name: 'Cliente Teste Sandbox', email: 'teste@exemplo.com', tax_id: '12345678909', phones: [{ country: '55', area: '21', number: '979012977', type: 'MOBILE' }] },
    items: [{ reference_id: 'agend-servico-corte', name: 'Agendamento Barbearia Hiroschi - Corte', quantity: 1, unit_amount: 100 }],
    qr_codes: [{ amount: { value: 100 }, expiration_date: expiresAt }],
    notification_urls: [`${APP}/api/pagbank/webhook`],
  }
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${TOKEN}`, 'x-idempotency-key': idempotencyKey },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  console.log('   status =', res.status)
  console.log('   body =', text.slice(0, 800))
  try { return JSON.parse(text) } catch { return null }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
