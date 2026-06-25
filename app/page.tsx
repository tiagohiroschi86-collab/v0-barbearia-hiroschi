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
  // Controle de login e navegação
  const [estaLogado, setEstaLogado] = useState(false)
  const [whatsapp, setWhatsapp] = useState("")
  const [telaAtual, setTelaAtual] = useState<"inicial" | "agendamento" | "meus_agendamentos" | "clube" | "produtos" | "painel">("inicial")
  
  // Dados do Aplicativo
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
  const [caixaDoDia, setCaixaDoDia] = useState({ pix: 320, cartao: 410, dinero: 180, total: 910 })
  const [atendimentosClubeContador, setAtendimentosClubeContador] = useState<string[]>(["João (Diamante)", "Carlos (Prata)"])

  // Efeito do Carrossel de Fotos
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
        setErroAgendamento("Clientes do Clube Hiroschi realizam seus agendamentos de terça a quinta-feira, conforme as regras do plano.")
        return
      }
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center p-4 selection:bg-amber-500">
      
      {/* 1. TELA DE LOGIN (SÓ APARECE SE NÃO ESTIVER LOGADO) */}
      {!estaLogado && (
        <div className="w-full max-w-md flex flex-col items-center justify-center min-h-[80vh] space-y-6">
          <div className="w-full bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight uppercase text-amber-500">Barbearia Hiroschi</h1>
              <p className="text-neutral-400 text-sm">Agende seu Horário rápido e sem fila</p>
            </div>

            <form onSubmit={lidarComLogin} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 uppercase">Digite seu WhatsApp com DDD:</label>
                <input 
                  type="tel" 
                  placeholder="Ex: 21999998888" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-4 bg-neutral-950 border border-neutral-800 rounded-xl focus:border-amber-500 focus:outline-none text-white font-medium"
                  required
                />
              </div>
              <button type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl transition shadow-lg shadow-amber-500/10 uppercase tracking-wider text-sm">
                Acessar Sistema
              </button>
            </form>

            <button onClick={() => { setEstaLogado(true); setTelaAtual("painel"); }} className="text-xs text-neutral-500 hover:text-neutral-400 font-medium underline block mx-auto">
              Acesso do Proprietário
            </button>
          </div>
        </div>
      )}

      {/* 2. MENU PRINCIPAL (APÓS LOGIN bem-sucedido) */}
      {estaLogado && telaAtual === "inicial" && (
        <div className="w-full max-w-md flex flex-col items-center space-y-6 text-center pt-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center font-bold text-black text-xl tracking-wider shadow-lg shadow-amber-500/20">
              BARBER
            </div>
            <h1 className="text-xl font-extrabold mt-2 tracking-tight">Olá, bem-vindo de volta!</h1>
            <p className="text-neutral-400 text-xs">Escolha o que deseja fazer hoje:</p>
          </div>

          {/* Carrossel de Fotos Automático */}
          {fotosBanners.length > 0 && (
            <div className="w-full relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
              <div className="h-56 w-full relative flex items-center justify-center">
                <img src={fotosBanners[fotoAtualIndex].url} alt={fotosBanners[fotoAtualIndex].titulo} className="w-full h-full object-cover transition-all duration-700" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4 text-left">
                  <p className="text-sm font-bold text-white">{fotosBanners[fotoAtualIndex].titulo}</p>
                </div>
              </div>
              <div className="absolute top-4 right-4 flex space-x-1 bg-black/50 px-2 py-1 rounded-full">
                {fotosBanners.map((_, idx) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === fotoAtualIndex ? "bg-amber-500" : "bg-neutral-500"}`} />
                ))}
              </div>
            </div>
          )}

          <div className="w-full flex flex-col space-y-3">
            <button onClick={() => setTelaAtual("agendamento")} className="w-full p-4 bg-neutral-900 border border-neutral-800 text-left rounded-xl flex items-center justify-between hover:border-neutral-700 transition">
              <div className="flex items-center space-x-3">
                <span className="text-xl">📅</span>
                <div className="text-left"><p className="font-bold text-sm">Novo Agendamento</p><p className="text-neutral-400 text-xs">Escolha e combine os serviços</p></div>
              </div>
              <span className="text-neutral-500 text-sm">→</span>
            </button><button onClick={() => setTelaAtual("meus_agendamentos")} className="w-full p-4 bg-neutral-900 border border-neutral-800 text-left rounded-xl flex items-center justify-between hover:border-neutral-700 transition">
              <div className="flex items-center space-x-3">
                <span className="text-xl">📋</span>
                <div className="text-left"><p className="font-bold text-sm">Ver Meus Agendamentos</p><p className="text-neutral-400 text-xs">Consulte ou cancele seus horários</p></div>
              </div>
              <span className="text-neutral-500 text-sm">→</span>
            </button>

            <button onClick={() => setTelaAtual("clube")} className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-left rounded-xl flex items-center justify-between hover:opacity-95 transition shadow-lg shadow-blue-600/10">
              <div className="flex items-center space-x-3">
                <span className="text-xl">💎</span>
                <div className="text-left"><p className="font-bold text-sm text-white">Clube do Hiroschi</p><p className="text-blue-200 text-xs">Veja seu plano e vantagens ativas</p></div>
              </div>
              <span className="text-blue-300 text-sm">→</span>
            </button>

            <button onClick={() => setTelaAtual("produtos")} className="w-full p-4 bg-neutral-900 border border-neutral-800 text-left rounded-xl flex items-center justify-between hover:border-neutral-700 transition">
              <div className="flex items-center space-x-3">
                <span className="text-xl">🛒</span>
                <div className="text-left"><p className="font-bold text-sm">Produtos</p><p className="text-neutral-400 text-xs">Confira nossa linha de produtos exclusivos</p></div>
              </div>
              <span className="text-neutral-500 text-sm">→</span>
            </button>
          </div>

          <button onClick={() => { setEstaLogado(false); setTelaAtual("inicial"); setWhatsapp(""); }} className="text-xs text-neutral-600 hover:text-neutral-400 font-medium pt-4 underline">
            Sair da Conta
          </button>
        </div>
      )}

      {/* TELA DE AGENDAMENTO */}
      {estaLogado && telaAtual === "agendamento" && (
        <div className="w-full max-w-md flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">←</button>
            <h2 className="text-xl font-bold">Escolha o Dia</h2>
          </div>
          {usuarioClube && (
            <div className="bg-blue-950/40 border border-blue-900/60 p-3 rounded-xl text-xs flex items-center space-x-2 text-blue-300">
              <span>💎</span>
              <p>Membro <strong>Plano {usuarioClube.plano}</strong>: Seus dias são de Terça a Quinta.</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 pt-2">
            {["Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((dia) => (
              <button
                key={dia}
                onClick={() => lidarComSelecaoDeDia(dia)}
                className={`w-full p-4 rounded-xl font-bold text-left border transition flex justify-between items-center ${
                  diaSelecionado === dia ? "bg-amber-500 text-black border-amber-500" : "bg-neutral-900 text-white border-neutral-800"
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
            <div className="p-4 bg-red-950/80 border border-red-900 rounded-xl text-sm text-red-200 mt-2 font-medium">
              ⚠️ {erroAgendamento}
            </div>
          )}
        </div>
      )}

      {/* TELA DO CLUBE */}
      {estaLogado && telaAtual === "clube" && (
        <div className="w-full max-w-md flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">←</button>
            <h2 className="text-xl font-bold">Meu Clube</h2>
          </div>
          {usuarioClube ? (
            <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
                <div>
                  <p className="text-xs text-neutral-400">Membro</p>
                  <p className="text-lg font-bold">{usuarioClube.nome}</p>
                </div>
                <span className="px-3 py-1 bg-blue-600 rounded-full text-xs font-extrabold">💎 {usuarioClube.plano}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-neutral-400">Início</p><p className="font-medium">{usuarioClube.inicio}</p></div>
                <div><p className="text-xs text-neutral-400">Próxima Cobrança</p><p className="font-medium">{usuarioClube.proximaCobranca}</p></div>
              </div>
              <div className="w-full py-2 bg-emerald-950/50 text-emerald-400 text-center rounded-xl border border-emerald-900 text-xs font-bold uppercase">
                ● Status: Membro Ativo
              </div>
            </div>
          ) : (
            <p className="text-neutral-400 text-center">Nenhum plano ativo encontrado.</p>
          )}
        </div>
      )}

      {/* VITRINE DE PRODUTOS */}
      {estaLogado && telaAtual === "produtos" && (
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

      {/* PAINEL ADMINISTRADOR */}
      {estaLogado && telaAtual === "painel" && (
        <div className="w-full max-w-md flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setTelaAtual("inicial")} className="p-2 bg-neutral-900 rounded-lg">←</button>
            <h2 className="text-xl font-bold">Painel Administrativo</h2>
          </div>
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">💰 Caixa do Dia</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>💵 Dinheiro:</span> <span className="font-bold text-emerald-400">R$ {caixaDoDia.dinheiro}</span></div>
              <div className="flex justify-between"><span>📱 PIX:</span> <span className="font-bold text-emerald-400">R$ {caixaDoDia.pix}</span></div>
              <div className="flex justify-between"><span>💳 Cartão:</span> <span className="font-bold text-emerald-400">R$ {caixaDoDia.cartao}</span></div>
              <div className="flex justify-between border-t border-neutral-800 pt-2 font-extrabold text-white">
                <span>Total:</span> <span>R$ {caixaDoDia.total}</span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">💎 Cortesia do Clube Hoje</h3>
            <ul className="text-xs space-y-1.5">
              {atendimentosClubeContador.map((nome, index) => (
                <li key={index} className="flex justify-between bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-900">
                  <span className="text-neutral-300">{nome}</span>
                  <span className="text-neutral-500 font-semibold">R$ 0,00</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* REMOVE TOTALMENTE OS CRÉDITOS DO V0 DO CANTO DA TELA */}
      <style jsx global>{`
        .v0-badge, [class*="v0-"], [id*="v0-"], img[src*="v0.dev"], div[style*="fixed"][style*="bottom"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>

    </div>
  )
}
