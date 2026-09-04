"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { Eye, EyeOff, Trash2, Calendar, Clock, DollarSign, UserCheck, Phone, RefreshCw } from "lucide-react"

// Configuração de Conexão Nativam ao Supabase (Recuperação de Dados)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface ClienteClube {
  id: string
  nome: string
  plano: "Bronze" | "Prata" | "Ouro"
  status: "Ativo" | "Pendente"
  inicio: string
  proximaCobranca: string
}

interface TransacaoCaixa {
  id: string
  data: string
  descricao: string
  valor: number
  tipo: "Entrada" | "Saída"
  categoria: string
}

interface Agendamento {
  id: string
  clienteNome: string
  clienteTelefone: string
  servico: string
  data: string
  horario: string
  status: "Confirmado" | "Cancelado"
}

export default function BarbeariaApp() {
  const WHATSAPP_PROPRIETARIO = "5521979012977"
  const HORAS_ANTECEDENCIA_MINIMA = 3

  // Estados dos Dados Reais
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [membrosClube, setMembrosClube] = useState<ClienteClube[]>([])
  const [transacoes, setTransacoes] = useState<TransacaoCaixa[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros do Caixa (Inicia cobrindo desde a última terça-feira)
  const [dataFiltroInicio, setDataFiltroInicio] = useState<string>("")
  const [dataFiltroFim, setDataFiltroFim] = useState<string>("")

  // Form Agendamento
  const [novoNome, setNovoNome] = useState("")
  const [novoTelefone, setNovoTelefone] = useState("")
  const [novoServico, setNovoServico] = useState("Corte")
  const [novaData, setNovaData] = useState("")
  const [novoHorario, setNovoHorario] = useState("")

  // ==========================================
  // RECUPERAÇÃO DE DADOS DO BANCO (DESDE TERÇA)
  // ==========================================
  const carregarDadosDoBanco = async () => {
    setCarregando(true)
    try {
      // 1. Busca Agendamentos Reais
      const { data: dataAgendamentos } = await supabase
        .from("agendamentos")
        .select("*")
        .order("data", { ascending: true })
      if (dataAgendamentos) setAgendamentos(dataAgendamentos)

      // 2. Busca Membros do Clube
      const { data: dataClube } = await supabase
        .from("clube_membros")
        .select("*")
      if (dataClube) setMembrosClube(dataClube)

      // 3. Busca Transações do Caixa
      const { data: dataCaixa } = await supabase
        .from("transacoes_caixa")
        .select("*")
        .order("data", { ascending: false })
      if (dataCaixa) setTransacoes(dataCaixa)
    } catch (error) {
      console.error("Erro ao carregar dados do Supabase:", error)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDadosDoBanco()
  }, [])

  // Validação das 3 Horas
  const validarHorarioAntecedencia = (dataSelec: string, horaSelec: string): boolean => {
    if (!dataSelec || !horaSelec) return false
    const agora = new Date()
    const [ano, mes, dia] = dataSelec.split("-").map(Number)
    const [horas, minutos] = horaSelec.split(":").map(Number)
    const dataAgendamento = new Date(ano, mes - 1, dia, horas, minutos)
    const diferencaHoras = (dataAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60)
    return diferencaHoras >= HORAS_ANTECEDENCIA_MINIMA
  }

  // Salvar Novo Agendamento no Banco
  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validarHorarioAntecedencia(novaData, novoHorario)) {
      alert(`Agendamentos para o mesmo dia exigem no mínimo ${HORAS_ANTECEDENCIA_MINIMA} horas de antecedência.`)
      return
    }

    const novoObj = {
      clienteNome: novoNome,
      clienteTelefone: novoTelefone,
      servico: novoServico,
      data: novaData,
      horario: novoHorario,
      status: "Confirmado"
    }

    const { data, error } = await supabase.from("agendamentos").insert([novoObj]).select()

    if (!error && data) {
      setAgendamentos([...agendamentos, data[0]])
      const mensagem = encodeURIComponent(`Olá! Confirmando agendamento na Barbearia Hiroschi.\nNome: ${novoNome}\nData: ${novaData} às ${novoHorario}`)
      window.open(`https://wa.me/${WHATSAPP_PROPRIETARIO}?text=${mensagem}`, "_blank")
      setNovoNome("")
      setNovoTelefone("")
      setNovaData("")
      setNovoHorario("")
    } else {
      alert("Erro ao salvar no banco de dados. Tente novamente.")
    }
  }

  // Excluir do Clube com atualização no Banco
  const handleRemoverMembroClube = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este membro do Clube Hiroschi?")) {
      await supabase.from("clube_membros").delete().eq("id", id)
      setMembrosClube(membrosClube.filter(m => m.id !== id))
    }
  }

  // Filtros de Caixa
  const transacoesFiltradas = transacoes.filter(t => {
    if (!dataFiltroInicio && !dataFiltroFim) return true
    if (dataFiltroInicio && t.data < dataFiltroInicio) return false
    if (dataFiltroFim && t.data > dataFiltroFim) return false
    return true
  })

  const totalEntradas = transacoesFiltradas.filter(t => t.tipo === "Entrada").reduce((a, b) => a + b.valor, 0)
  const totalSaidas = transacoesFiltradas.filter(t => t.tipo === "Saída").reduce((a, b) => a + b.valor, 0)

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4 max-w-4xl mx-auto font-sans">
      <header className="border-b border-neutral-800 pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-amber-500">BARBEARIA HIROSCHI</h1>
          <p className="text-xs text-neutral-400">Painel de Gestão e Agenda</p>
        </div>
        <button 
          onClick={carregarDadosDoBanco} 
          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-sm"
        >
          <RefreshCw size={16} className={carregando ? "animate-spin" : ""} /> Atualizar Dados
        </button>
      </header>

      {/* AGENDA RECUPERADA DA SEMANA (TERÇA A HOJE/AMANHÃ) */}
      <section className="bg-neutral-800 p-5 rounded-xl mb-8 border border-neutral-700">
        <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
          <Calendar size={20} /> Agenda de Clientes Registrados
        </h2>
        {agendamentos.length === 0 ? (
          <p className="text-sm text-neutral-400">Buscando ou nenhum agendamento encontrado no banco...</p>
        ) : (
          <div className="space-y-2">
            {agendamentos.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-neutral-900 p-3 rounded-lg border-l-4 border-amber-500">
                <div>
                  <p className="font-bold">{item.clienteNome} <span className="text-xs font-normal text-neutral-400">({item.clienteTelefone})</span></p>
                  <p className="text-xs text-neutral-300">{item.servico} — {item.data} às {item.horario}</p>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-medium">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NOVO AGENDAMENTO */}
      <section className="bg-neutral-800 p-5 rounded-xl mb-8 border border-neutral-700">
        <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
          <Clock size={20} /> Novo Agendamento (Mín. 3 horas)
        </h2>
        <form onSubmit={handleAgendar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Nome do Cliente" required value={novoNome} onChange={e => setNovoNome(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded p-2.5 text-sm" />
          <input type="tel" placeholder="Telefone" required value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded p-2.5 text-sm" />
          <select value={novoServico} onChange={e => setNovoServico(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded p-2.5 text-sm">
            <option value="Corte">Corte - R$ 45,00</option>
            <option value="Barba">Barba - R$ 35,00</option>
            <option value="Combo Corte + Barba">Combo Corte + Barba - R$ 70,00</option>
          </select>
          <input type="date" required value={novaData} onChange={e => setNovaData(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded p-2.5 text-sm" />
          <input type="time" required value={novoHorario} onChange={e => setNovoHorario(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded p-2.5 text-sm md:col-span-2" />
          <button type="submit" className="md:col-span-2 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg">Confirmar Agendamento</button>
        </form>
      </section>

      {/* CLUBE COM BOTÃO DE EXCLUIR */}
      <section className="bg-neutral-800 p-5 rounded-xl mb-8 border border-neutral-700">
        <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
          <UserCheck size={20} /> Clube Hiroschi
        </h2>
        {membrosClube.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum membro ativo encontrado.</p>
        ) : (
          <div className="space-y-3">
            {membrosClube.map(membro => (
              <div key={membro.id} className="flex justify-between items-center bg-neutral-900 p-3 rounded-lg">
                <div>
                  <p className="font-medium text-white">{membro.nome}</p>
                  <p className="text-xs text-neutral-400">Plano: {membro.plano} | Status: {membro.status}</p>
                </div>
                <button onClick={() => handleRemoverMembroClube(membro.id)} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CAIXA COM FILTRO DE DATAS */}
      <section className="bg-neutral-800 p-5 rounded-xl border border-neutral-700">
        <h2 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
          <DollarSign size={20} /> Relatório do Caixa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Filtrar de (Ex: Terça-feira)</label>
            <input type="date" value={dataFiltroInicio} onChange={e => setDataFiltroInicio(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">Até (Ex: Hoje/Amanhã)</label>
            <input type="date" value={dataFiltroFim} onChange={e => setDataFiltroFim(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-neutral-900 p-3 rounded-lg"><p className="text-xs text-neutral-400">Entradas</p><p className="text-emerald-400 font-bold">R$ {totalEntradas.toFixed(2)}</p></div>
          <div className="bg-neutral-900 p-3 rounded-lg"><p className="text-xs text-neutral-400">Saídas</p><p className="text-red-400 font-bold">R$ {totalSaidas.toFixed(2)}</p></div>
          <div className="bg-neutral-900 p-3 rounded-lg"><p className="text-xs text-neutral-400">Saldo Total</p><p className="text-amber-400 font-bold">R$ {(totalEntradas - totalSaidas).toFixed(2)}</p></div>
        </div>
      </section>
    </div>
  )
}
