"use client"

import { useState, useEffect } from "react"
import { db, firebaseConfigured, firebaseError } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"

export default function BarbeariaDashboard() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [caixa, setCaixa] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroDados, setErroDados] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    const cancelamentos: (() => void)[] = []

    if (!firebaseConfigured || !db) {
      setErroDados(
        firebaseError
          ? "O Firebase não pôde ser inicializado. Exibindo dados vazios até a conexão ser corrigida."
          : "O Firebase ainda não está configurado. Exibindo dados vazios até a conexão ser habilitada.",
      )
      setCarregando(false)
      return () => {
        cancelado = true
      }
    }

    const firestore = db
    const ouvirColecao = (
      nome: string,
      ordenarPor: string,
      onData: (dados: any[]) => void,
    ) => {
      try {
        const consulta = query(
          collection(firestore, nome),
          orderBy(ordenarPor, nome === "financial" ? "desc" : "asc"),
        )
        const cancelar = onSnapshot(
          consulta,
          (snapshot) => {
            if (!cancelado) onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
          },
          (error) => {
            console.error(`[v0] Erro ao carregar ${nome}:`, error)
            if (!cancelado) {
              setErroDados("Não foi possível carregar alguns dados. Verifique as regras e índices do Firestore.")
              onData([])
            }
          },
        )
        cancelamentos.push(cancelar)
      } catch (error) {
        console.error(`[v0] Falha ao configurar ${nome}:`, error)
        setErroDados("Não foi possível conectar aos dados agora. A página continua disponível em modo vazio.")
        onData([])
      }
    }

    try {
      ouvirColecao("appointments", "data", setAgendamentos)
      ouvirColecao("clients", "nome", setClientes)
      ouvirColecao("financial", "data", (dados) => {
        setCaixa(dados)
        setCarregando(false)
      })
    } catch (error) {
      console.error("[v0] Falha inesperada ao iniciar dados:", error)
      setErroDados("Os dados estão temporariamente indisponíveis.")
      setCarregando(false)
    }

    const fallbackTimer = window.setTimeout(() => {
      if (!cancelado) setCarregando(false)
    }, 4000)

    return () => {
      cancelado = true
      window.clearTimeout(fallbackTimer)
      cancelamentos.forEach((cancelar) => cancelar())
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
      {erroDados && (
        <div
          role="status"
          className="mx-auto mb-4 max-w-5xl rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <strong>Modo offline:</strong> {erroDados} Nenhum dado fictício foi criado.
        </div>
      )}
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
