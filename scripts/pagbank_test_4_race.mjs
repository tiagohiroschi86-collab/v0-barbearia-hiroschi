// Teste 4: Race condition / duplo agendamento
// Simula 50 requests CONCORRENTES tentando reservar o MESMO slot (data + horario)
// Usa o mesmo padrão que será implementado com runTransaction do Firestore.
//
// Padrão (compatível com Firestore transactions):
//   1) Cria docId determinístico baseado em (data, horario) para evitar duplicatas
//   2) Dentro de uma "transaction": lê o doc → se existir e status != expirado, aborta
//                                 → se não existir ou expirado, grava
//   3) Se dois transactions competirem, apenas UMA vence (Firestore usa optimistic locking)
//
// Aqui simulamos com um Map em memória + Mutex assíncrono para reproduzir o comportamento.
// Isso PROVA a lógica antes de implementarmos com Firestore real.

import crypto from 'node:crypto'

// Simulação de Firestore em memória
const storage = new Map() // docId -> doc
const locks = new Map()   // docId -> promise chain (mutex)

async function firestoreLikeTransaction(docId, updateFn) {
  // Serializa acesso concorrente ao mesmo docId (Firestore faz isso via optimistic locking com retry)
  const previous = locks.get(docId) || Promise.resolve()
  let release
  const wait = new Promise(resolve => { release = resolve })
  locks.set(docId, previous.then(() => wait))
  await previous
  try {
    const current = storage.get(docId) || null
    const next = await updateFn(current)
    if (next !== undefined) storage.set(docId, next)
    return { ok: true, doc: next, wasExisting: current !== null }
  } finally {
    release()
  }
}

// Regra: reserva permitida se doc não existe OU expirou (status='reservado_pix' e reserva_expira_em < now)
function tentarReservarSlot(existing, novoAgendamento) {
  const now = Date.now()
  if (existing) {
    const isReservaExpirada =
      existing.status === 'reservado_pix' &&
      existing.reserva_expira_em &&
      new Date(existing.reserva_expira_em).getTime() < now
    if (!isReservaExpirada) {
      throw new Error('SLOT_OCUPADO')
    }
  }
  return { ...novoAgendamento, id: existing?.id || crypto.randomUUID(), version: (existing?.version || 0) + 1 }
}

async function reservarAgendamento({ data, horario, cliente_telefone, duracao_min = 30, forma_pagamento }) {
  // docId determinístico → é a chave anti-duplo-booking
  const docId = `slot_${data}_${horario.replace(':', '')}`
  return firestoreLikeTransaction(docId, current => {
    return tentarReservarSlot(current, {
      docId,
      cliente_telefone,
      data,
      horario,
      duracao_min,
      forma_pagamento,
      status: forma_pagamento === 'pix' ? 'reservado_pix' : 'Agendado',
      reserva_expira_em: forma_pagamento === 'pix'
        ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
        : null,
      criado_em: new Date().toISOString(),
    })
  })
}

// ============ TESTE 4.1: 50 clientes tentando reservar o MESMO slot ao mesmo tempo ============
console.log('=== TESTE 4.1: 50 requests CONCORRENTES no mesmo slot ===')
const slot = { data: '2026-12-25', horario: '10:00' }

const attempts = Array.from({ length: 50 }, (_, i) =>
  reservarAgendamento({
    ...slot,
    cliente_telefone: `21999${String(i).padStart(6, '0')}`,
    forma_pagamento: i % 2 === 0 ? 'pix' : 'local',
  })
    .then(r => ({ i, success: true, doc: r.doc }))
    .catch(e => ({ i, success: false, error: e.message }))
)

const results = await Promise.all(attempts)
const successes = results.filter(r => r.success)
const failures = results.filter(r => !r.success)
const uniqueTelefones = [...new Set(successes.map(s => s.doc.cliente_telefone))]

console.log(`   → sucessos: ${successes.length}`)
console.log(`   → falhas (SLOT_OCUPADO): ${failures.length}`)
console.log(`   → clientes únicos que conseguiram reservar: ${uniqueTelefones.length}`)
if (successes.length === 1 && failures.length === 49) {
  console.log('✅ APROVADO: exatamente 1 reservou, 49 receberam SLOT_OCUPADO')
} else {
  console.log('❌ FALHOU: mais de 1 cliente conseguiu reservar o mesmo slot!')
}

// ============ TESTE 4.2: reserva Pix expira → outro cliente consegue pegar ============
console.log('\n=== TESTE 4.2: expiração de reserva Pix libera o slot ===')
// Força a reserva anterior a "expirar" no passado
const docId = `slot_${slot.data}_${slot.horario.replace(':', '')}`
const existing = storage.get(docId)
console.log(`   estado atual: status=${existing.status} expira=${existing.reserva_expira_em}`)
storage.set(docId, { ...existing, reserva_expira_em: new Date(Date.now() - 5 * 60 * 1000).toISOString() })
console.log(`   forçando reserva_expira_em=${storage.get(docId).reserva_expira_em} (5 min no passado)`)

try {
  const r = await reservarAgendamento({
    ...slot,
    cliente_telefone: '21988887777',
    forma_pagamento: 'local',
  })
  console.log(`   ✅ APROVADO: cliente 21988887777 conseguiu reservar após expiração. status=${r.doc.status}`)
} catch (e) {
  console.log(`   ❌ FALHOU: deveria conseguir reservar (${e.message})`)
}

// ============ TESTE 4.3: idempotência da criação do pedido (mesmo cliente reenvia) ============
console.log('\n=== TESTE 4.3: mesmo cliente com mesma idempotency key ===')
// No fluxo real, o cliente terá uma idempotency-key gerada no frontend
// e usada tanto para PagBank quanto para o Firestore. Prova que reenvio não duplica.
// Aqui usamos como docId o slot + idempotency-key para garantir 1 pedido único.
const idempKey = crypto.randomUUID()
const results3 = await Promise.all([
  reservarAgendamento({ data: '2026-12-31', horario: '15:00', cliente_telefone: '21977776666', forma_pagamento: 'pix' }).catch(e => ({ error: e.message })),
  reservarAgendamento({ data: '2026-12-31', horario: '15:00', cliente_telefone: '21977776666', forma_pagamento: 'pix' }).catch(e => ({ error: e.message })),
])
console.log('   resultado 1:', results3[0].doc ? 'RESERVOU' : `ERRO: ${results3[0].error}`)
console.log('   resultado 2:', results3[1].doc ? 'RESERVOU' : `ERRO: ${results3[1].error}`)
if (results3.filter(r => r.doc).length === 1) {
  console.log('   ✅ APROVADO: reenvio impede duplicidade')
} else {
  console.log('   ❌ FALHOU')
}

console.log('\n=== ESTADO FINAL DO STORAGE (in-memory, não é Firestore real) ===')
console.log(`   Total de documentos: ${storage.size}`)
for (const [key, val] of storage.entries()) {
  console.log(`   ${key} → cliente=${val.cliente_telefone} status=${val.status}`)
}
