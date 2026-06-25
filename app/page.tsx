"use client"

import { useState, useEffect } from "react"

interface ClienteClube {
  id: string
  nome: string
  plano: "Bronze" | "Prata" | "Ouro" | "Diamante"
  status: "Ativo" | "Suspenso"
  inicio: string
  proximaCobranca: string
}

interface BannerFoto {
  id: string
  url: string
  titulo: string
  ordem: number
}

export default function BarbeariaHiroschi() {
  const [estaLogado, setEstaLogado] = useState(false)
  const [whatsapp, setWhatsapp] = useState("")
  const [telaAtual, setTelaAtual] = useState<"inicial" | "agendamento" | "meus_agendamentos" | "clube" | "produtos" | "painel">("inicial")
  
  const [fotosBanners] = useState<BannerFoto[]>([
    { id: "1", url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500", titulo: "Taper Fade Americano", ordem: 1 },
    { id: "2", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500", titulo: "Barba Alinhada", ordem: 2 }
  ])
  const [fotoAtualIndex, setFotoAtualIndex] = useState(0)

  const [usuarioClube] = useState<ClienteClube | null>({
    id: "user_1",
    nome: "Tiago Antônio",
    plano: "Diamante",
    status: "Ativo",
    inicio: "24/06/2026",
    proximaCobranca: "24/07/2026"
  })

  const [diaSelecionado, setDiaSelecionado] = useState("")
  const [erroAgendamento, setErroAgendamento] = useState("")
  const [caixaDoDia] = useState({ pix: 320, cartao: 410, dinheiro: 180, total: 910 })
  const [atendimentosClubeContador] = useState<string[]>(["João (Diamante)", "Carlos (Prata)"])

  useEffect(() => {
    if (fotosBanners.length === 0 || !estaLogado) return
    const interval = setInterval(() => {
      setFotoAtualIndex((prevIndex) => (prevIndex + 1) % fotosBanners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [fotosBanners, estaLogado])

  const lidarComLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (whatsapp.trim().length >= 8) {
      setEstaLogado(true)
    }
  }

  const lidarComSelecaoDeDia = (dia: string) => {
    setDiaSelecionado(dia)
    setErroAgendamento("")
    if (usuarioClube && usuarioClube.status === "Ativo") {
      if (dia === "Sexta" || dia === "Sábado") {
        setErroAgendamento("Clientes do Clube Hiroschi realizam seus agendamentos de terça a quinta-feira.")
      }
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center p-4">
      {!estaLogado && (
        <div className="w-full max-w-md flex flex-col items-center justify-center min-h-[80vh] space-y-6">
          <div className="w-full bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl text-center space-y-6">
            <h1 className="text-2xl font-extrabold uppercase text-amber-500">Barbearia Hiroschi</h1>
            <form onSubmit={lidarComLogin} className="space-y-4">
              <input 
                type="tel" placeholder="Seu WhatsApp" value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full p-4 bg-neutral-950 border border-neutral-800 rounded-xl"
                required
              />
              <button type="submit" className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl uppercase">Acessar Sistema</button>
            </form>
            <button onClick={() => { setEstaLogado(true); setTelaAtual("painel"); }} className="text-xs text-neutral-500 underline">Acesso do Proprietário</button>
          </div>
        </div>
      )}

      {estaLogado && telaAtual === "inicial" && (
        <div className="w-full max-w-md flex flex-col items-center space-y-6 pt-6">
          <h1 className="text-xl font-bold">Olá, bem-vindo de volta!</h1>
          <div className="w-full flex flex-col space-y-3">
            <button onClick={() => setTelaAtual("agendamento")} className="p-4 bg-neutral-900 rounded-xl border border-neutral-800">Novo Agendamento</button>
            <button onClick={() => setTelaAtual("clube")} className="p-4 bg-blue-600 rounded-xl">Clube do Hiroschi</button>
            <button onClick={() => setTelaAtual("painel")} className="p-4 bg-neutral-900 rounded-xl border border-neutral-800">Painel Administrativo</button>
            <button onClick={() => { setEstaLogado(false); setTelaAtual("inicial"); }} className="text-neutral-600 underline text-xs">Sair da Conta</button>
          </div>
        </div>
      )}

      {/* Telas adicionais seguem a mesma lógica estrutural */}
      {estaLogado && telaAtual === "painel" && (
        <div className="w-full max-w-md space-y-4">
          <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">← Voltar</button>
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <h2 className="font-bold mb-4">Caixa do Dia: R$ {caixaDoDia.total}</h2>
            <ul className="space-y-2">
              {atendimentosClubeContador.map((nome, i) => <li key={i} className="text-sm border-b border-neutral-800 pb-2">{nome}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
