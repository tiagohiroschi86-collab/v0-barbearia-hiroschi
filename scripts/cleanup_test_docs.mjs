// Cleanup dos registros DE TESTE que criei durante a implementação
// Remove somente docs onde data = '2027-01-15' (data fictícia usada nos testes)
// ou onde cliente_nome começa com "Teste Impl" ou "Race "
import { db } from '/app/lib/firebase-server.js'
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore'

async function del(colName, cond) {
  const q = query(collection(db, colName), where(cond.field, '==', cond.value))
  const snap = await getDocs(q)
  console.log(`  ${colName} where ${cond.field}=${cond.value}: ${snap.size} docs`)
  for (const d of snap.docs) {
    await deleteDoc(doc(db, colName, d.id))
  }
  return snap.size
}

console.log('=== CLEANUP dos registros de teste (data=2027-01-15) ===')

// agendamentos + caixa_movimentacoes + agendamento_idempotency (via reserva do teste)
let total = 0
total += await del('agendamentos', { field: 'data', value: '2027-01-15' })
total += await del('caixa_movimentacoes', { field: 'data', value: '2027-01-15' })

// slot_locks - por prefixo do docId (não tem where prefixo, então itera)
const allLocks = await getDocs(collection(db, 'slot_locks'))
let lockDels = 0
for (const d of allLocks.docs) {
  if (d.id.startsWith('2027-01-15_')) {
    await deleteDoc(doc(db, 'slot_locks', d.id))
    lockDels++
  }
}
console.log(`  slot_locks 2027-01-15_*: ${lockDels} docs`)
total += lockDels

// agendamento_idempotency - tem que ler tudo e filtrar (docId é UUID, sem prefixo semântico)
// Não vou apagar todos idempotency indiscriminadamente. Deixarei os órfãos — não impactam dados existentes.

console.log(`\n✅ Cleanup finalizado. ${total} docs removidos.`)
console.log('   agendamento_idempotency: mantido (docs órfãos, não afetam dados reais)')
