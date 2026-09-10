// Rotas Pix + Webhook do PagBank Sandbox
// - POST /api/pagbank/pix/create   → cria agendamento reservado + ordem Pix + retorna QR
// - GET  /api/pagbank/pix/status   → consulta status do pagamento (polling fallback)
// - POST /api/pagbank/webhook      → recebe notificação autenticada, confirma agendamento
// - POST /api/pagbank/pix/cancel   → cancela reserva Pix (usuário clicou cancelar OU timer expirou)
// - GET  /api/pagbank/health       → sanity check (dev)

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import fs from 'node:fs'
import {
  reservarAgendamentoAtomico,
  confirmarPagamentoPix,
  cancelarReserva,
  assinaturaWebhookOK,
  IdempotencyExisting,
} from '../../../lib/pagbank-utils.js'
import { db } from '../../../lib/firebase-server.js'
import { doc, getDoc } from 'firebase/firestore'

// ================= Helpers =================
const WEBHOOK_LOG_FILE = '/tmp/pagbank_webhook_hits.log'
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try { fs.appendFileSync(WEBHOOK_LOG_FILE, line) } catch {}
  console.log('[pagbank]', msg)
}

function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

async function readEnvNeeded() {
  const base = process.env.PAGBANK_BASE_URL
  const token = process.env.PAGBANK_ACCESS_TOKEN
  const webhookToken = process.env.PAGBANK_WEBHOOK_TOKEN || process.env.PAGBANK_ACCESS_TOKEN
  const appBase = process.env.APP_BASE_URL
  return { base, token, webhookToken, appBase }
}

// ============ POST /api/pagbank/pix/create ============
async function handlePixCreate(request) {
  const { base, token, appBase } = await readEnvNeeded()
  if (!base || !token) return json({ error: 'PAGBANK_ENV_MISSING' }, 500)

  let body
  try { body = await request.json() } catch { return json({ error: 'BAD_JSON' }, 400) }

  const {
    cliente_nome,
    cliente_apelido,
    cliente_telefone,
    data,           // YYYY-MM-DD
    horario,        // HH:MM
    servico,        // "Corte + Barba"
    preco_total,    // reais, ex: 45
    duracao_total,  // minutos
    idempotency_key: clientIdemp, // opcional; se ausente, geramos
    email,          // opcional
  } = body || {}

  if (!cliente_telefone || !data || !horario || !servico || preco_total === undefined) {
    return json({ error: 'CAMPOS_OBRIGATORIOS_FALTANDO' }, 400)
  }

  const idempotency_key = clientIdemp || crypto.randomUUID()
  const valorCentavos = Math.max(1, Math.round(Number(preco_total) * 100))

  // Reserva Pix expira em 10 min
  const now = Date.now()
  const expDate = new Date(now + 10 * 60 * 1000)
  const isoWithOffset = expDate.toISOString().replace(/\.\d{3}Z$/, '-03:00')

  // 1) Reserva slot no Firestore ANTES de chamar PagBank (para pegar a "corrida" o mais cedo)
  //    A ordem PagBank só é criada depois que o slot está garantidamente locked.
  //    Se PagBank falhar, cancelamos o slot.
  let reservado
  try {
    reservado = await reservarAgendamentoAtomico({
      cliente_nome, cliente_apelido, cliente_telefone,
      data, horario, servico,
      preco_total: Number(preco_total),
      duracao_total: Number(duracao_total || 30),
      forma_pagamento: 'pix',
      reserva_ttl_ms: 10 * 60 * 1000,
      pagbank_order_id: null, // será preenchido depois via update
      pix_qr_text: null,
      pix_qr_png_url: null,
      idempotency_key,
    })
  } catch (e) {
    if (e instanceof IdempotencyExisting) {
      return json({ error: 'IDEMPOTENCY_ALREADY_PROCESSED', agendamento_id: e.agendamentoId }, 409)
    }
    if (e.message === 'SLOT_OCUPADO') return json({ error: 'SLOT_OCUPADO' }, 409)
    log(`ERRO reservarAtomico: ${e.message}`)
    return json({ error: 'ERRO_INTERNO_RESERVA', detail: e.message }, 500)
  }

  // 2) Cria ordem no PagBank Sandbox
  const referenceId = `barbearia-${reservado.agendamentoId}`
  const payload = {
    reference_id: referenceId,
    customer: {
      name: cliente_nome || 'Cliente',
      email: email || 'cliente@barbearia.local',
      tax_id: '12345678909', // sandbox aceita
      phones: [{
        country: '55',
        area: (cliente_telefone.replace(/\D/g, '').slice(-11).slice(0, 2)) || '21',
        number: cliente_telefone.replace(/\D/g, '').slice(-9) || '999999999',
        type: 'MOBILE',
      }],
    },
    items: [{
      reference_id: `agend-${reservado.agendamentoId}`,
      name: `Barbearia Hiroschi - ${servico}`.slice(0, 100),
      quantity: 1,
      unit_amount: valorCentavos,
    }],
    qr_codes: [{ amount: { value: valorCentavos }, expiration_date: isoWithOffset }],
    notification_urls: [`${appBase}/api/pagbank/webhook`],
  }

  const orderRes = await fetch(`${base}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'x-idempotency-key': idempotency_key,
    },
    body: JSON.stringify(payload),
  })
  const orderText = await orderRes.text()
  let orderJson
  try { orderJson = JSON.parse(orderText) } catch { orderJson = null }

  if (!orderRes.ok || !orderJson || !orderJson.qr_codes?.[0]) {
    // rollback: cancela a reserva pra liberar o slot
    await cancelarReserva({ agendamentoId: reservado.agendamentoId, motivo: 'pagbank_falhou' })
    log(`ERRO PagBank ${orderRes.status}: ${orderText.slice(0, 400)}`)
    return json({ error: 'PAGBANK_FALHOU', pagbank_status: orderRes.status, pagbank_body: orderText.slice(0, 400) }, 502)
  }

  const orderId = orderJson.id
  const qr = orderJson.qr_codes[0]
  const pngLink = qr.links?.find(l => l.rel === 'QRCODE.PNG')?.href
  const pixText = qr.text

  // 3) Atualiza agendamento com dados do PagBank
  const { updateDoc } = await import('firebase/firestore')
  await updateDoc(doc(db, 'agendamentos', reservado.agendamentoId), {
    pagbank_order_id: orderId,
    pagbank_qr_id: qr.id,
    pix_qr_text: pixText,
    pix_qr_png_url: pngLink,
  })

  log(`✅ Pix criado agendamento=${reservado.agendamentoId} order=${orderId} slots=${reservado.slots.join(',')}`)

  return json({
    ok: true,
    agendamento_id: reservado.agendamentoId,
    order_id: orderId,
    qr_code_text: pixText,
    qr_code_png_url: pngLink,
    reserva_expira_em: reservado.reservaExpiraEm,
    valor_centavos: valorCentavos,
    idempotency_key,
  })
}

// ============ GET /api/pagbank/pix/status?agendamento_id=... ============
async function handlePixStatus(request) {
  const url = new URL(request.url)
  const agendamentoId = url.searchParams.get('agendamento_id')
  if (!agendamentoId) return json({ error: 'agendamento_id_obrigatorio' }, 400)

  const agSnap = await getDoc(doc(db, 'agendamentos', agendamentoId))
  if (!agSnap.exists()) return json({ error: 'AGENDAMENTO_NAO_ENCONTRADO' }, 404)
  const ag = agSnap.data()

  // Se reserva expirada, cancela e reporta
  const now = Date.now()
  if (ag.status === 'reservado_pix' && ag.reserva_expira_em && new Date(ag.reserva_expira_em).getTime() < now) {
    await cancelarReserva({ agendamentoId, motivo: 'expirado' })
    return json({ status: 'Cancelado', reason: 'EXPIRADO', agendamento_id: agendamentoId })
  }

  // Se ainda reservado e temos order_id, faz um poll no PagBank
  if (ag.status === 'reservado_pix' && ag.pagbank_order_id) {
    const { base, token } = await readEnvNeeded()
    try {
      const r = await fetch(`${base}/orders/${ag.pagbank_order_id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (r.ok) {
        const j = await r.json()
        const charge = (j.charges || []).find(c => c.status === 'PAID') || j.charges?.[0]
        if (charge?.status === 'PAID') {
          await confirmarPagamentoPix({
            pagbank_order_id: ag.pagbank_order_id,
            paid_at_iso: charge.paid_at,
            charge_id: charge.id,
          })
          return json({ status: 'Confirmado', via: 'polling', agendamento_id: agendamentoId })
        }
      }
    } catch (e) {
      log(`polling erro: ${e.message}`)
    }
  }

  return json({
    status: ag.status,
    agendamento_id: agendamentoId,
    reserva_expira_em: ag.reserva_expira_em || null,
    forma_pagamento: ag.forma_pagamento || null,
  })
}

// ============ POST /api/pagbank/pix/cancel { agendamento_id } ============
async function handlePixCancel(request) {
  let body
  try { body = await request.json() } catch { return json({ error: 'BAD_JSON' }, 400) }
  const agendamentoId = body?.agendamento_id
  if (!agendamentoId) return json({ error: 'agendamento_id_obrigatorio' }, 400)
  await cancelarReserva({ agendamentoId, motivo: body?.motivo || 'user_cancel' })
  return json({ ok: true, agendamento_id: agendamentoId })
}

// ============ POST /api/pagbank/webhook ============
async function handleWebhook(request) {
  const rawBody = await request.text()
  const receivedSig = request.headers.get('x-authenticity-token') || ''
  const { webhookToken } = await readEnvNeeded()
  if (!webhookToken) return json({ error: 'webhook_token_not_configured' }, 500)

  if (!assinaturaWebhookOK(rawBody, receivedSig, webhookToken)) {
    log(`❌ Webhook assinatura invalida sig=${receivedSig.slice(0, 12)}...`)
    return json({ error: 'invalid_signature' }, 401)
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch { return json({ error: 'invalid_json' }, 400) }

  const orderId = payload.id
  const charge = (payload.charges || []).find(c => c.status === 'PAID') || (payload.charges || [])[0]
  const chargeStatus = charge?.status

  log(`Webhook authenticated. order=${orderId} charge=${chargeStatus}`)

  if (chargeStatus === 'PAID') {
    const r = await confirmarPagamentoPix({
      pagbank_order_id: orderId,
      paid_at_iso: charge.paid_at,
      charge_id: charge.id,
    })
    return json({ received: true, authenticated: true, ...r })
  }

  return json({ received: true, authenticated: true, order_id: orderId, charge_status: chargeStatus, note: 'no_action' })
}

// ============ GET /api/pagbank/health ============
async function handleHealth() {
  const { base, token, appBase } = await readEnvNeeded()
  return json({
    ok: true,
    env_ready: !!(base && token),
    base_url_set: !!base,
    token_set: !!token,
    app_base_url: appBase || null,
  })
}

// ============ POST /api/pagbank/clube/create ============
async function handleClubeCreate(request) {
  const { base, token, appBase } = await readEnvNeeded()
  if (!base || !token) return json({ error: 'PAGBANK_ENV_MISSING' }, 500)
  let body
  try { body = await request.json() } catch { return json({ error: 'BAD_JSON' }, 400) }
  const { solicitacao_id, cliente_nome, cliente_telefone, plano, valor_reais } = body || {}
  if (!solicitacao_id || !plano || !valor_reais) return json({ error: 'CAMPOS_OBRIGATORIOS_FALTANDO' }, 400)
  const valorCentavos = Math.max(1, Math.round(Number(valor_reais) * 100))
  const idempotency_key = crypto.randomUUID()
  const isoExpira = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '-03:00')
  const referenceId = `barbearia-clube-${solicitacao_id}`
  const payload = {
    reference_id: referenceId,
    customer: {
      name: cliente_nome || 'Cliente Clube',
      email: 'cliente@barbearia.local',
      tax_id: '12345678909',
      phones: [{ country: '55', area: (cliente_telefone || '').slice(0, 2) || '21', number: (cliente_telefone || '').slice(-9) || '999999999', type: 'MOBILE' }],
    },
    items: [{ reference_id: `clube-${plano}`, name: `Clube Hiroschi - ${plano}`.slice(0, 100), quantity: 1, unit_amount: valorCentavos }],
    qr_codes: [{ amount: { value: valorCentavos }, expiration_date: isoExpira }],
    notification_urls: [`${appBase}/api/pagbank/webhook`],
  }
  const r = await fetch(`${base}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}`, 'x-idempotency-key': idempotency_key },
    body: JSON.stringify(payload),
  })
  const t = await r.text()
  let j
  try { j = JSON.parse(t) } catch { j = null }
  if (!r.ok || !j || !j.qr_codes?.[0]) {
    return json({ error: 'PAGBANK_FALHOU', pagbank_status: r.status, pagbank_body: t.slice(0, 300) }, 502)
  }
  const qr = j.qr_codes[0]
  const png = qr.links?.find(l => l.rel === 'QRCODE.PNG')?.href
  // Atualiza solicitação com dados do Pix (setDoc merge — cria se não existir)
  const { setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'solicitacoes_clube', solicitacao_id), {
    pagbank_order_id: j.id,
    pix_qr_text: qr.text,
    pix_qr_png_url: png,
    reserva_expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }, { merge: true })
  return json({
    ok: true,
    solicitacao_id,
    order_id: j.id,
    qr_code_text: qr.text,
    qr_code_png_url: png,
    valor_centavos: valorCentavos,
    reserva_expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
}

// ============ GET /api/pagbank/clube/status?solicitacao_id=... ============
async function handleClubeStatus(request) {
  const url = new URL(request.url)
  const solicitacaoId = url.searchParams.get('solicitacao_id')
  if (!solicitacaoId) return json({ error: 'solicitacao_id_obrigatorio' }, 400)
  const snap = await getDoc(doc(db, 'solicitacoes_clube', solicitacaoId))
  if (!snap.exists()) return json({ error: 'NAO_ENCONTRADO' }, 404)
  const sol = snap.data()
  // Se ainda aguardando_pagamento e tem order_id, faz poll no PagBank
  if (sol.status === 'aguardando_pagamento' && sol.pagbank_order_id) {
    const { base, token } = await readEnvNeeded()
    try {
      const r = await fetch(`${base}/orders/${sol.pagbank_order_id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (r.ok) {
        const j = await r.json()
        const charge = (j.charges || []).find(c => c.status === 'PAID') || j.charges?.[0]
        if (charge?.status === 'PAID') {
          const { updateDoc } = await import('firebase/firestore')
          await updateDoc(doc(db, 'solicitacoes_clube', solicitacaoId), {
            status: 'aguardando_confirmacao',
            paid_at: charge.paid_at || new Date().toISOString(),
            pagbank_charge_id: charge.id,
          })
          return json({ status: 'aguardando_confirmacao', solicitacao_id: solicitacaoId })
        }
      }
    } catch {}
  }
  return json({ status: sol.status, solicitacao_id: solicitacaoId })
}

// ================= Router =================
function route(context) {
  return context?.params?.path
    ? Promise.resolve(context.params)
    : Promise.resolve({ path: [] })
}

export async function POST(request, context) {
  const p = await context.params
  const path = Array.isArray(p.path) ? p.path.join('/') : (p.path || '')
  if (path === 'pagbank/webhook')    return handleWebhook(request)
  if (path === 'pagbank/pix/create') return handlePixCreate(request)
  if (path === 'pagbank/pix/cancel') return handlePixCancel(request)
  if (path === 'pagbank/clube/create') return handleClubeCreate(request)
  return json({ error: 'unknown_route', route: path }, 404)
}

export async function GET(request, context) {
  const p = await context.params
  const path = Array.isArray(p.path) ? p.path.join('/') : (p.path || '')
  if (path === 'pagbank/health')     return handleHealth()
  if (path === 'pagbank/pix/status') return handlePixStatus(request)
  if (path === 'pagbank/clube/status') return handleClubeStatus(request)
  return json({ error: 'unknown_route', route: path }, 404)
}
