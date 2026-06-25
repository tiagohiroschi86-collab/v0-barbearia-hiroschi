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
  const [telaAtual, setTelaAtual] = useState<"inicial" | "agendamento" | "meus_agendamentos" | "clube" | "produtos" | "painel">("inicial")
  
  const [fotosBanners, setFotosBanners] = useState<BannerFoto[]>([
    { id: "1", url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500", titulo: "Taper Fade Americano", ordem: 1 },
    { id: "2", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500", titulo: "Barba Alinhada", ordem: 2 }
  ])
  const [fotoAtualIndex, setFotoAtualIndex] = useState(0)

  const [usuarioClube, setUsuarioClube] = useState<ClienteClube | null>({
    id: "user_1",
    nome: "Tiago Antônio",
    plano: "Diamante",
    status: "Ativo",
    inicio: "24/06/2026",
    proximaCobranca: "24/07/2026"
  })

  const [diaSelecionado, setDiaSelecionado] = useState("")
  const [erroAgendamento, setErroAgendamento] = useState("")
  const [caixaDoDia, setCaixaDoDia] = useState({ pix: 320, cartao: 410, dinheiro: 180, total: 910 })
  const [atendimentosClubeContador, setAtendimentosClubeContador] = useState<string[]>(["João (Diamante)", "Carlos (Prata)"])

  useEffect(() => {
    if (fotosBanners.length === 0) return
    const interval = setInterval(() => {
      setFotoAtualIndex((prevIndex) => (prevIndex + 1) % fotosBanners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [fotosBanners])

  const lidarComSelecaoDeDia = (dia: string) => {
    setDiaSelecionado(dia)
    setErroAgendamento("")
    if (usuarioClube && usuarioClube.status === "Ativo") {
      if (dia === "Sexta" || dia === "Sábado") {
        setErroAgendamento("Clientes do Clube Hiroschi realizam seus agendamentos de terça a quinta-feira, conforme as regras do plano.")
        return
      }
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center p-4 selection:bg-amber-500">
      {telaAtual === "inicial" && (
        <div className="w-full max-w-md flex flex-col items-center space-y-6 text-center pt-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-24 h-24 bg-amber-500 rounded-full flex items-center justify-center font-bold text-black text-2xl tracking-wider shadow-lg shadow-amber-500/20">
              BARBER
            </div>
            <h1 className="text-2xl font-extrabold mt-4 tracking-tight">Bem-vindo à Barbearia Hiroschi</h1>
            <p className="text-neutral-400 text-sm">Seu próximo corte está a poucos cliques.</p>
          </div>

          {fotosBanners.length > 0 && (
            <div className="w-full relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 group">
              <div className="h-64 w-full relative flex items-center justify-center">
                <img src={fotosBanners[fotoAtualIndex].url} alt={fotosBanners[fotoAtualIndex].titulo} className="w-full h-full object-cover transition-all duration-700 ease-in-out" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 text-left">
                  <p className="text-lg font-bold text-white">{fotosBanners[fotoAtualIndex].titulo}</p>
                  <div className="flex text-amber-400 text-xs mt-1">★★★★★</div>
                </div>
              </div>
              <div className="absolute top-4 right-4 flex space-x-1.5 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                {fotosBanners.map((_, idx) => (
                  <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === fotoAtualIndex ? "bg-amber-500 scale-125" : "bg-neutral-500"}`} />
                ))}
              </div>
            </div>
          )}

          <div className="w-full flex flex-col space-y-3 pt-2">
            <button onClick={() => setTelaAtual("agendamento")} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-500/10">
              <span>📅</span> <span>Novo Agendamento</span>
            </button>
            <button onClick={() => setTelaAtual("meus_agendamentos")} className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-medium rounded-xl flex items-center justify-center space-x-2 transition">
              <span>📋</span> <span>Meus Agendamentos</span>
            </button>
            <button onClick={() => setTelaAtual("clube")} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-600/20">
              <span>💎</span> <span>Clube Hiroschi</span>
            </button>
            <button onClick={() => setTelaAtual("produtos")} className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 font-medium rounded-xl flex items-center justify-center space-x-2 transition">
              <span>🛒</span> <span>Produtos</span>
            </button>
            <button onClick={() => setTelaAtual("painel")} className="w-full py-2 text-xs text-neutral-600 hover:text-neutral-400 font-medium mt-4">
              ⚙️ Painel do Proprietário
            </button>
          </div>

          <div className="pt-4 flex items-center space-x-1 text-sm bg-neutral-900/50 px-4 py-2 rounded-full border border-neutral-900">
            <span className="text-amber-400">⭐</span>
            <span className="font-bold">Avaliação 4.9/5</span>
          </div>
        </div>
      )}{/* TELA DE AGENDAMENTO COM RESTRIÇÃO */}
      {telaAtual === "agendamento" && (
        <div className="w-full max-w-md flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">←</button>
            <h2 className="text-xl font-bold">Escolha o Dia</h2>
          </div>

          {usuarioClube && (
            <div className="bg-blue-950/40 border border-blue-900/60 p-3 rounded-xl text-xs flex items-center space-x-2 text-blue-300">
              <span>💎</span>
              <p>Você é membro <strong>Plano {usuarioClube.plano}</strong>. Seus dias são de Terça a Quinta.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 pt-2">
            {["Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((dia) => (
              <button
                key={dia}
                onClick={() => lidarComSelecaoDeDia(dia)}
                className={`w-full p-4 rounded-xl font-bold text-left border transition flex justify-between items-center ${
                  diaSelecionado === dia 
                    ? "bg-amber-500 text-black border-amber-500" 
                    : "bg-neutral-900 text-white border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <span>{dia}</span>
                {usuarioClube?.status === "Ativo" && (dia === "Sexta" || dia === "Sábado") ? (
                  <span className="text-xs font-normal text-red-400">Bloqueado para o Clube</span>
                ) : (
                  <span className="text-xs font-normal text-emerald-400">Disponível</span>
                )}
              </button>
            ))}
          </div>

          {erroAgendamento && (
            <div className="p-4 bg-red-950/80 border border-red-900 rounded-xl text-sm text-red-200 mt-2 font-medium leading-relaxed">
              ⚠️ {erroAgendamento}
            </div>
          )}
        </div>
      )}

      {/* TELA DO CLUBE HIROSCHI */}
      {telaAtual === "clube" && (
        <div className="w-full max-w-md flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">←</button>
            <h2 className="text-xl font-bold">Meu Clube</h2>
          </div>

          {usuarioClube ? (
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <div>
                  <p className="text-xs text-neutral-400">Nome do Membro</p>
                  <p className="text-lg font-bold">{usuarioClube.nome}</p>
                </div>
                <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-extrabold tracking-wider">
                  💎 {usuarioClube.plano}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-neutral-400">Início</p>
                  <p className="font-medium text-neutral-200">{usuarioClube.inicio}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Próxima Cobrança</p>
                  <p className="font-medium text-neutral-200">{usuarioClube.proximaCobranca}</p>
                </div>
              </div>
              <div className="pt-2">
                <div className="w-full py-2 bg-emerald-950/50 text-emerald-400 text-center rounded-xl border border-emerald-900 text-xs font-bold">
                  ● STATUS: MEMBRO ATIVO
                </div>
              </div>
            </div>
          ) : (
            <p className="text-neutral-400 text-center">Nenhum plano ativo encontrado.</p>
          )}
        </div>
      )}

      {/* VITRINE DE PRODUTOS */}
      {telaAtual === "produtos" && (
        <div className="w-full max-w-md flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">←</button>
            <h2 className="text-xl font-bold">Produtos</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 1, nome: "Pomada Modeladora Effect Matte", preco: "R$ 45,00", url: "https://images.unsplash.com/photo-1608248597481-496100c80836?w=400" },
              { id: 2, nome: "Óleo Premium Hidratante de Barba", preco: "R$ 39,90", url: "https://images.unsplash.com/photo-1626015713026-d8309df935f1?w=400" }
            ].map((prod) => (
              <div key={prod.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col space-y-2">
                <div className="w-full h-32 bg-neutral-950 rounded-lg overflow-hidden flex items-center justify-center p-2">
                  <img src={prod.url} alt={prod.nome} className="w-full h-full object-contain" />
                </div>
                <p className="text-xs font-bold text-neutral-200 line-clamp-2 h-8 leading-tight">{prod.nome}</p>
                <p className="text-sm font-extrabold text-amber-500">{prod.preco}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAINEL ADMINISTRADOR: CAIXA INTELIGENTE */}
      {telaAtual === "painel" && (
        <div className="w-full max-w-md flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">←</button>
            <h2 className="text-xl font-bold">Painel do Proprietário</h2>
          </div>

          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-3">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">💰 Caixa do Dia (Recebimentos)</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>💵 Dinheiro:</span> <span className="font-bold text-emerald-400">R$ {caixaDoDia.dinheiro}</span></div>
              <div className="flex justify-between"><span>📱 PIX:</span> <span className="font-bold text-emerald-400">R$ {caixaDoDia.pix}</span></div>
              <div className="flex justify-between"><span>💳 Cartão:</span> <span className="font-bold text-emerald-400">R$ {caixaDoDia.cartao}</span></div>
              <div className="flex justify-between border-t border-neutral-800 pt-2 font-extrabold text-base text-white">
                <span>Total Recebido:</span> <span>R$ {caixaDoDia.total}</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-3">
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">💎 Atendimentos do Clube Hoje</h3>
            <ul className="text-sm space-y-1.5 pt-1">
              {atendimentosClubeContador.map((nome, index) => (
                <li key={index} className="flex justify-between bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-900 text-xs">
                  <span className="font-medium text-neutral-300">{nome}</span>
                  <span className="text-neutral-500 font-semibold">R$ 0,00 (Pago pelo Clube)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  )
}
