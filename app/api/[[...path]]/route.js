// Rota Next.js catch-all para POC dos endpoints PagBank
// Escopo desta etapa: SOMENTE webhook mínimo que valida assinatura.
// NÃO grava em Firestore. NÃO altera agendamentos. Apenas prova a lógica de segurança.
// Depois, no fluxo real, esta rota será estendida com transação Firestore.

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import fs from 'node:fs'

// Log em memória apenas para inspeção do teste (não persistente, não é banco)
const WEBHOOK_LOG_FILE = '/tmp/pagbank_webhook_hits.log'

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try { fs.appendFileSync(WEBHOOK_LOG_FILE, line) } catch {}
  console.log('[pagbank-webhook]', msg)
}

async function handleWebhook(request) {
  const startedAt = Date.now()
  const rawBody = await request.text() // MUITO importante: usar o raw body exato para assinatura

  const receivedSig = request.headers.get('x-authenticity-token') || ''
  const token = process.env.PAGBANK_WEBHOOK_TOKEN || process.env.PAGBANK_ACCESS_TOKEN

  if (!token) {
    log('❌ PAGBANK_WEBHOOK_TOKEN ausente em process.env')
    return NextResponse.json({ error: 'webhook_token_not_configured' }, { status: 500 })
  }

  // PagBank documenta: assinatura = SHA-256(token + '-' + rawBody)
  const expectedSig = crypto
    .createHash('sha256')
    .update(token + '-' + rawBody)
    .digest('hex')

  const signatureValid =
    receivedSig.length === expectedSig.length &&
    crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))

  log(`Received x-authenticity-token=${receivedSig.slice(0, 12)}... expected=${expectedSig.slice(0, 12)}... valid=${signatureValid}`)

  if (!signatureValid) {
    log('❌ Assinatura inválida — rejeitando webhook')
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch {
    log('❌ Body não é JSON válido')
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Identifica pagamento confirmado
  const charge = payload.charges?.[0] || payload
  const chargeStatus = charge?.status
  const orderId = payload.id
  const referenceId = payload.reference_id

  log(`✅ Webhook autenticado. order.id=${orderId} reference_id=${referenceId} charge.status=${chargeStatus} took=${Date.now() - startedAt}ms`)

  // Nesta etapa: NÃO gravamos em Firestore. Apenas confirmamos que a validação passou.
  // No fluxo real, aqui será feito: runTransaction em agendamentos → status='Confirmado'
  // + criar movimentação em caixa_movimentacoes (idempotente por order.id).

  return NextResponse.json({
    received: true,
    authenticated: true,
    order_id: orderId,
    reference_id: referenceId,
    charge_status: chargeStatus,
    note: 'POC only: Firestore write NOT performed in this step.',
  })
}

export async function POST(request, context) {
  const { path } = await context.params
  const route = Array.isArray(path) ? path.join('/') : (path || '')

  if (route === 'pagbank/webhook') {
    return handleWebhook(request)
  }
  return NextResponse.json({ error: 'unknown_route', route }, { status: 404 })
}

export async function GET(request, context) {
  const { path } = await context.params
  const route = Array.isArray(path) ? path.join('/') : (path || '')

  if (route === 'pagbank/health') {
    const hasToken = !!(process.env.PAGBANK_ACCESS_TOKEN)
    const hasBase = !!(process.env.PAGBANK_BASE_URL)
    return NextResponse.json({
      ok: true,
      env_ready: hasToken && hasBase,
      base_url_set: hasBase,
      token_set: hasToken,
      app_base_url: process.env.APP_BASE_URL || null,
    })
  }
  return NextResponse.json({ error: 'unknown_route', route }, { status: 404 })
}
