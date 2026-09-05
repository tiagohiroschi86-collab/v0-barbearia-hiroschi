"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"

export default function BarbeariaDashboard() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [caixa, setCaixa] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!db) {
      setCarregando(false)
      return
    }

    const qAgendamentos = query(collection(db, "appointments"), orderBy("data", "asc"))
    const unsubAgendamentos = onSnapshot(
      qAgendamentos,
      (snapshot) => {
        setAgendamentos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      },
      (err) => console.log("Erro agendamentos:", err),
    )

    const qClientes = query(collection(db, "clients"), orderBy("nome", "asc"))
    const unsubClientes = onSnapshot(
      qClientes,
      (snapshot) => {
        setClientes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      },
      (err) => console.log("Erro clientes:", err),
    )

    const qCaixa = query(collection(db, "financial"), orderBy("data", "desc"))
    const unsubCaixa = onSnapshot(
      qCaixa,
      (snapshot) => {
        setCaixa(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        setCarregando(false)
      },
      (err) => {
        console.log("Erro caixa:", err)
        setCarregando(false)
      },
    )

    return () => {
      unsubAgendamentos()
      unsubClientes()
      unsubCaixa()
    }
  }, [])

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 font-bold text-gray-700">
        Carregando dados reais da Barbearia Hiroschi...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900">
      <header className="mb-6 flex items-center justify-between rounded-lg bg-black p-4 text-white">
        <h1 className="text-2xl font-bold">Barbearia Hiroschi</h1>
        <span className="rounded bg-green-500 px-3 py-1 text-sm font-semibold text-black">Sistema Conectado</span>
      </header>

      <section className="mb-6 rounded-lg bg-white p-5 shadow">
        <h2 className="mb-3 border-b pb-2 text-xl font-semibold">Agenda de Hoje ({agendamentos.length})</h2>
        {agendamentos.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum agendamento encontrado.</p>
        ) : (
          <div className="space-y-3">
            {agendamentos.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="text-lg font-bold">{item.horario || "Horário não informado"}</span>
                  <span> - {item.clienteNome || item.nome || "Cliente"}</span>
                </div>
                <span className="rounded bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
                  {item.servico || "Corte"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg bg-white p-5 shadow">
        <h2 className="mb-3 border-b pb-2 text-xl font-semibold">Clientes Cadastrados ({clientes.length})</h2>
        {clientes.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum cliente cadastrado.</p>
        ) : (
          <ul className="divide-y">
            {clientes.map((cliente) => (
              <li key={cliente.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{cliente.nome}</span>
                <span className="text-sm text-gray-500">{cliente.telefone || cliente.email || ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow">
        <h2 className="mb-3 border-b pb-2 text-xl font-semibold">Controle de Caixa / Financeiro</h2>
        {caixa.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma movimentação registrada no caixa.</p>
        ) : (
          <div className="space-y-2">
            {caixa.map((mov) => (
              <div key={mov.id} className="flex items-center justify-between border-b pb-2">
                <span>{mov.descricao || "Lançamento"}</span>
                <span className={mov.tipo === "saida" ? "font-bold text-red-600" : "font-bold text-green-600"}>
                  {mov.tipo === "saida" ? "-" : "+"} R$ {mov.valor}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
