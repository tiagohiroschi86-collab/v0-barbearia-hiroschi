// Helpers para o fluxo Pix + Firestore transactions (anti race-condition)
import { db } from './firebase-server.js'
import {
  doc,
  collection,
  runTransaction,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import crypto from 'node:crypto'

// Gera lista de slots de 15 min que uma reserva ocupa a partir do horário e duração
// Ex.: "10:00" + 45 min → ["10:00","10:15","10:30"]
export function slotsCobertos(horarioHHMM, duracaoMin) {
  const [h, m] = horarioHHMM.split(':').map(Number)
  const totalMinIni = h * 60 + m
  const slots = []
  const passos = Math.max(1, Math.ceil(duracaoMin / 15))
  for (let i = 0; i < passos; i++) {
    const t = totalMinIni + i * 15
    const hh = String(Math.floor(t / 60)).padStart(2, '0')
    const mm = String(t % 60).padStart(2, '0')
    slots.push(`${hh}:${mm}`)
  }
  return slots
}

function slotLockId(data, horario) {
  return `${data}_${horario.replace(':', '')}`
}

// Reserva atômica: cria docs em slot_locks (novo, aditivo) + agendamento (existente)
// Se qualquer slot estiver ativamente ocupado, aborta. Se estiver com reserva Pix expirada, libera.
export async function reservarAgendamentoAtomico({
  cliente_nome,
  cliente_apelido,
  cliente_telefone,
  data,
  horario,
  servico,
  preco_total,
  duracao_total,
  forma_pagamento,          // 'local' | 'pix'
  reserva_ttl_ms,           // p/ Pix: 10 min. Local: null
  pagbank_order_id,         // p/ Pix
  pix_qr_text,
  pix_qr_png_url,
  idempotency_key,          // usada pelo client, evita duplicado no Firestore
}) {
  const now = Date.now()
  const agendamentoId = crypto.randomUUID()
  const isPix = forma_pagamento === 'pix'
  const reservaExpiraEm = isPix ? new Date(now + (reserva_ttl_ms || 10 * 60 * 1000)).toISOString() : null
  const status = isPix ? 'reservado_pix' : 'Agendado'

  const slots = slotsCobertos(horario, duracao_total || 30)
  const lockRefs = slots.map(s => doc(db, 'slot_locks', slotLockId(data, s)))
  const agendamentoRef = doc(db, 'agendamentos', agendamentoId)
  const idempRef = doc(db, 'agendamento_idempotency', idempotency_key)

  // Uma vez que Firestore Web SDK's runTransaction can only tx.get() individual docs
  // (não queries), esta abordagem com docs determinísticos em slot_locks garante atomicidade.
  await runTransaction(db, async tx => {
    // 1) idempotência: se essa key já foi usada, retorna o agendamento existente sem duplicar
    const idempSnap = await tx.get(idempRef)
    if (idempSnap.exists()) {
      const prev = idempSnap.data()
      // não faz nada aqui; caller detectará via retorno abaixo
      throw new IdempotencyExisting(prev.agendamento_id)
    }

    // 2) verifica todos os slot_locks
    const snaps = []
    for (const ref of lockRefs) {
      const s = await tx.get(ref)
      snaps.push(s)
    }
    for (const s of snaps) {
      if (!s.exists()) continue
      const lock = s.data()
      const isPixExpirada =
        lock.status === 'reservado_pix' &&
        lock.reserva_expira_em &&
        new Date(lock.reserva_expira_em).getTime() < now
      if (!isPixExpirada) {
        throw new Error('SLOT_OCUPADO')
      }
    }

    // 3) grava o agendamento (COMPATÍVEL com estrutura existente: mantém todos os campos originais)
    tx.set(agendamentoRef, {
      cliente_nome,
      cliente_apelido,
      cliente_telefone,
      data,
      horario,
      servico,
      preco_total,
      duracao_total,
      criado_em: new Date().toISOString(),
      // ---- Campos NOVOS aditivos (opcionais, não quebram docs antigos):
      forma_pagamento,
      status,
      ...(isPix && { reserva_expira_em: reservaExpiraEm }),
      ...(pagbank_order_id && { pagbank_order_id }),
      ...(pix_qr_text && { pix_qr_text }),
      ...(pix_qr_png_url && { pix_qr_png_url }),
      idempotency_key,
    })

    // 4) grava/atualiza slot_locks (coleção NOVA, não afeta dados antigos)
    for (let i = 0; i < lockRefs.length; i++) {
      tx.set(lockRefs[i], {
        data,
        horario: slots[i],
        agendamento_id: agendamentoId,
        cliente_telefone,
        status,
        ...(isPix && { reserva_expira_em: reservaExpiraEm }),
        atualizado_em: new Date().toISOString(),
      })
    }

    // 5) idempotência record
    tx.set(idempRef, {
      idempotency_key,
      agendamento_id: agendamentoId,
      criado_em: new Date().toISOString(),
    })
  })

  return { agendamentoId, status, reservaExpiraEm, slots }
}

class IdempotencyExisting extends Error {
  constructor(agendamentoId) {
    super('IDEMPOTENCY_ALREADY_PROCESSED')
    this.agendamentoId = agendamentoId
  }
}

// Confirma pagamento Pix (chamado pelo webhook e pelo polling)
// Idempotente: se agendamento já Confirmado, retorna { ok:true, alreadyConfirmed:true }
export async function confirmarPagamentoPix({ pagbank_order_id, paid_at_iso, charge_id }) {
  // 1) localiza agendamento pelo order_id
  const q = query(collection(db, 'agendamentos'), where('pagbank_order_id', '==', pagbank_order_id))
  const snap = await getDocs(q)
  if (snap.empty) return { ok: false, reason: 'AGENDAMENTO_NAO_ENCONTRADO' }
  const agendamentoDoc = snap.docs[0]
  const agendamentoId = agendamentoDoc.id
  const data = agendamentoDoc.data()

  if (data.status === 'Confirmado' && data.webhook_processed_at) {
    return { ok: true, alreadyConfirmed: true, agendamentoId }
  }

  const agendamentoRef = doc(db, 'agendamentos', agendamentoId)
  const slots = slotsCobertos(data.horario, data.duracao_total || 30)
  const lockRefs = slots.map(s => doc(db, 'slot_locks', slotLockId(data.data, s)))

  // idempotência forte via id da movimentação = order_id (docId determinístico)
  const movimentacaoId = `pix_${pagbank_order_id}`
  const movimentacaoRef = doc(db, 'caixa_movimentacoes', movimentacaoId)

  await runTransaction(db, async tx => {
    const agSnap = await tx.get(agendamentoRef)
    if (!agSnap.exists()) throw new Error('AGENDAMENTO_SUMIU')
    if (agSnap.data().status === 'Confirmado') return

    // ATUALIZA agendamento
    tx.update(agendamentoRef, {
      status: 'Confirmado',
      forma_pagamento: 'pix',
      webhook_processed_at: new Date().toISOString(),
      paid_at: paid_at_iso || new Date().toISOString(),
      pagbank_charge_id: charge_id || null,
    })

    // ATUALIZA slot_locks para status confirmed (sem expiração)
    for (const ref of lockRefs) {
      tx.set(ref, {
        data: data.data,
        horario: ref.id.split('_')[1].replace(/(\d{2})(\d{2})/, '$1:$2'),
        agendamento_id: agendamentoId,
        cliente_telefone: data.cliente_telefone,
        status: 'Confirmado',
        reserva_expira_em: null,
        atualizado_em: new Date().toISOString(),
      }, { merge: true })
    }

    // Cria movimentação em caixa (com docId = pix_<order_id> → 100% idempotente)
    tx.set(movimentacaoRef, {
      tipo: 'entrada',
      descricao: `Pix ${data.servico} - ${data.cliente_nome}`,
      valor: data.preco_total,
      data: data.data,
      forma_pagamento: 'pix',
      agendamento_id: agendamentoId,
      pagbank_order_id,
      pagbank_charge_id: charge_id || null,
      criado_em: new Date().toISOString(),
    }, { merge: true })
  })

  return { ok: true, alreadyConfirmed: false, agendamentoId }
}

// Cancela agendamento + libera slots (usado se cliente clicar cancelar Pix no timer, ou se
// o "expirador" identificar reserva_pix expirada durante consulta)
export async function cancelarReserva({ agendamentoId, motivo }) {
  const agendamentoRef = doc(db, 'agendamentos', agendamentoId)
  await runTransaction(db, async tx => {
    const agSnap = await tx.get(agendamentoRef)
    if (!agSnap.exists()) return
    const data = agSnap.data()
    if (data.status !== 'reservado_pix') return // só cancela reservas Pix ativas

    const slots = slotsCobertos(data.horario, data.duracao_total || 30)
    const lockRefs = slots.map(s => doc(db, 'slot_locks', slotLockId(data.data, s)))

    tx.update(agendamentoRef, {
      status: 'Cancelado',
      cancelado_em: new Date().toISOString(),
      cancel_motivo: motivo || 'expirado',
    })
    for (const ref of lockRefs) {
      tx.delete(ref)
    }
  })
}

export function assinaturaWebhookOK(rawBody, receivedSig, token) {
  const expected = crypto.createHash('sha256').update(token + '-' + rawBody).digest('hex')
  if (!receivedSig || receivedSig.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expected))
  } catch {
    return false
  }
}

export { IdempotencyExisting }
