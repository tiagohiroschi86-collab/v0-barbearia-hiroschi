"use client"

import { useEffect, useState } from "react"
import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, onSnapshot, addDoc, query, orderBy } from "firebase/firestore"

// Configuração Firebase (Preencha com suas chaves se necessário)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export default function BarbeariaHiroschi() {
  const [telaAtual, setTelaAtual] = useState<"login" | "menu" | "agendamento_servico" | "agendamento_data" | "agendamento_pagamento" | "meus_agendamentos" | "clube" | "produtos" | "admin">("login")
  const [abaAdmin, setAbaAdmin] = useState<"agenda" | "caixa" | "cliente" | "clube" | "servicos" | "produtos" | "horarios" | "configuracao">("agenda")

  // Estados do Cliente e Login
  const [whatsappInput, setWhatsappInput] = useState("")
  const [cliente, setCliente] = useState<{ nome: string; apelido: string; whatsapp: string } | null>(null)
  const [mostrarSenhaAdmin, setMostrarSenhaAdmin] = useState(false)
  const [senhaAdminInput, setSenhaAdminInput] = useState("")

  // Seleções do Agendamento
  const [servicoSelecionado, setServicoSelecionado] = useState<{ id: string; nome: string; preco: number } | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState("")
  const [horarioSelecionado, setHorarioSelecionado] = useState("")
  const [formaPagamento, setFormaPagamento] = useState<"local" | "pix" | null>(null)

  // Timer Pix
  const [tempoPix, setTempoPix] = useState(600)
  const [timerAtivo, setTimerAtivo] = useState(false)

  // Cores Customizáveis
  const [corPrimaria, setCorPrimaria] = useState("#d4af37")
  const [corFundo, setCorFundo] = useState("#121212")
  const [corTexto, setCorTexto] = useState("#ffffff")

  // Carrossel
  const [slideAtual, setSlideAtual] = useState(0)
  const fotosCortes = [
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80"
  ]

  // Dados do Firebase
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [servicosList, setServicosList] = useState<any[]>([
    { id: "1", nome: "Corte Masculino", preco: 40, duracao: "30 min" },
    { id: "2", nome: "Barba Completa", preco: 30, duracao: "20 min" },
    { id: "3", nome: "Combo (Corte + Barba)", preco: 60, duracao: "50 min" }
  ])

  const horariosDisponiveis = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"]

  // Buscar Agendamentos em Tempo Real
  useEffect(() => {
    try {
      const q = query(collection(db, "agendamentos"))
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setAgendamentos(docs)
      }, () => {})
      return () => unsubscribe()
    } catch (e) {
      console.log("Firebase off-line ou em configuração local")
    }
  }, [])

  // Timer Pix
  useEffect(() => {
    let interval: any = null
    if (timerAtivo && tempoPix > 0) {
      interval = setInterval(() => setTempoPix(prev => prev - 1), 1000)
    } else if (tempoPix === 0) {
      setTimerAtivo(false)
      alert("Tempo limite do Pix expirado!")
      setTelaAtual("menu")
    }
    return () => clearInterval(interval)
  }, [timerAtivo, tempoPix])

  const handleAcessar = () => {
    if (!whatsappInput || whatsappInput.length < 10) {
      alert("Informe um WhatsApp válido com DDD!")
      return
    }
    setCliente({ nome: "Cliente", apelido: "Cliente", whatsapp: whatsappInput })
    setTelaAtual("menu")
  }

  const handleAcessoAdmin = () => {
    if (senhaAdminInput === "77186800") {
      setTelaAtual("admin")
    } else {
      alert("Senha incorreta!")
    }
  }

  const handleFinalizarAgendamento = async () => {
    if (!formaPagamento) {
      alert("Selecione a forma de pagamento!")
      return
    }

    const novoAgendamento = {
      clienteWhatsapp: cliente?.whatsapp,
      servico: servicoSelecionado?.nome,
      valor: servicoSelecionado?.preco,
      data: dataSelecionada,
      horario: horarioSelecionado,
      pagamento: formaPagamento,
      status: "Confirmado",
      criadoEm: new Date().toISOString()
    }

    try {
      await addDoc(collection(db, "agendamentos"), novoAgendamento)
    } catch (e) {
      setAgendamentos(prev => [...prev, novoAgendamento])
    }

    alert("Agendamento confirmado com sucesso!")
    setTimerAtivo(false)
    setTelaAtual("menu")
  }

  const formatarTempo = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 transition-colors" style={{ backgroundColor: corFundo, color: corTexto }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6 border border-gray-800 bg-gray-900/90 backdrop-blur-md">
        
        <header className="text-center border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-extrabold uppercase" style={{ color: corPrimaria }}>Barbearia Hiroschi 2.0</h1>
          <p className="text-xs text-gray-400">Estilo & Tradição</p>
        </header>

        {/* LOGIN */}
        {telaAtual === "login" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center">Acessar Sistema</h2>
            <input 
              type="tel" 
              placeholder="WhatsApp com DDD" 
              value={whatsappInput} 
              onChange={(e) => setWhatsappInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-center focus:outline-none"
            />
            <button onClick={handleAcessar} className="w-full py-3 rounded-xl font-bold uppercase" style={{ backgroundColor: corPrimaria, color: "#000" }}>
              Acessar
            </button>
            <div className="pt-4 border-t border-gray-800 flex flex-col items-center space-y-2">
              <div className="flex items-center space-x-2 w-full">
                <input 
                  type={mostrarSenhaAdmin ? "text" : "password"} 
                  placeholder="Senha Admin" 
                  value={senhaAdminInput} 
                  onChange={(e) => setSenhaAdminInput(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-2 text-xs"
                />
                <button type="button" onClick={() => setMostrarSenhaAdmin(!mostrarSenhaAdmin)} className="p-2 text-sm bg-gray-800 rounded-xl border border-gray-700">
                  {mostrarSenhaAdmin ? "🙈" : "👁️"}
                </button>
              </div>
              <button onClick={handleAcessoAdmin} className="text-xs text-red-400 hover:underline">Acesso do Proprietário</button>
            </div>
          </div>
        )}

        {/* MENU PRINCIPAL */}
        {telaAtual === "menu" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <p className="font-bold">Olá, {cliente?.whatsapp}!</p>
              <button onClick={() => setTelaAtual("login")} className="text-xs text-gray-400">Sair</button>
            </div>

            {/* Slide de Fotos */}
            <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gray-800">
              <img src={fotosCortes[slideAtual]} alt="Corte" className="w-full h-full object-cover" />
              <button onClick={() => setSlideAtual(prev => prev === 0 ? fotosCortes.length - 1 : prev - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-xs">❮</button>
              <button onClick={() => setSlideAtual(prev => prev === fotosCortes.length - 1 ? 0 : prev + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-xs">❯</button>
            </div>

            {/* Grid de Opções */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTelaAtual("agendamento_servico")} className="p-4 rounded-xl font-bold text-sm text-center" style={{ backgroundColor: corPrimaria, color: "#000" }}>
                Novo Agendamento
              </button>
              <button onClick={() => setTelaAtual("meus_agendamentos")} className="p-4 bg-gray-800 border border-gray-700 rounded-xl font-semibold text-sm text-center">
                Meus Agendamentos
              </button>
              <button onClick={() => setTelaAtual("clube")} className="p-4 bg-gray-800 border border-gray-700 rounded-xl font-semibold text-sm text-center">
                Clube do Hiroschi
              </button>
              <button onClick={() => setTelaAtual("produtos")} className="p-4 bg-gray-800 border border-gray-700 rounded-xl font-semibold text-sm text-center">
                Produtos
              </button>
            </div>
          </div>
        )}

        {/* AGENDAMENTO - ETAPA 1: SERVIÇOS */}
        {telaAtual === "agendamento_servico" && (
          <div className="space-y-4">
            <button onClick={() => setTelaAtual("menu")} className="text-xs text-gray-400">← Voltar</button>
            <h2 className="text-md font-bold text-center">1. Selecione o Serviço</h2>
            <div className="space-y-2">
              {servicosList.map((servico) => (
                <div 
                  key={servico.id} 
                  onClick={() => {
                    setServicoSelecionado(servico)
                    setTelaAtual("agendamento_data")
                  }}
                  className="p-3 bg-gray-800 border border-gray-700 rounded-xl flex justify-between items-center cursor-pointer hover:border-amber-500"
                >
                  <div>
                    <p className="font-bold text-sm">{servico.nome}</p>
                    <p className="text-xs text-gray-400">{servico.duracao}</p>
                  </div>
                  <span className="font-bold text-amber-400">R$ {servico.preco},00</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AGENDAMENTO - ETAPA 2: DATA E HORÁRIO */}
        {telaAtual === "agendamento_data" && (
          <div className="space-y-4">
            <button onClick={() => setTelaAtual("agendamento_servico")} className="text-xs text-gray-400">← Voltar</button>
            <h2 className="text-md font-bold text-center">2. Selecione Data e Horário</h2>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Data:</label>
              <input 
                type="date" 
                value={dataSelecionada} 
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white p-2 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Horário:</label>
              <div className="grid grid-cols-4 gap-2">
                {horariosDisponiveis.map((h) => (
                  <button 
                    key={h} 
                    onClick={() => setHorarioSelecionado(h)}
                    className={`p-2 rounded-lg text-xs font-bold ${horarioSelecionado === h ? "bg-amber-500 text-black" : "bg-gray-800 border border-gray-700"}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            {dataSelecionada && horarioSelecionado && (
              <button onClick={() => setTelaAtual("agendamento_pagamento")} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl text-sm">
                Avançar para Pagamento
              </button>
            )}
          </div>
        )}

        {/* AGENDAMENTO - ETAPA 3: PAGAMENTO */}
        {telaAtual === "agendamento_pagamento" && (
          <div className="space-y-4">
            <button onClick={() => setTelaAtual("agendamento_data")} className="text-xs text-gray-400">← Voltar</button>
            <h2 className="text-md font-bold text-center">3. Confirmar Pagamento</h2>
            
            <div className="p-3 bg-gray-800 rounded-xl text-xs space-y-1">
              <p><strong>Serviço:</strong> {servicoSelecionado?.nome}</p>
              <p><strong>Data/Hora:</strong> {dataSelecionada} às {horarioSelecionado}</p>
              <p><strong>Valor:</strong> R$ {servicoSelecionado?.preco},00</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setFormaPagamento("local"); setTimerAtivo(false); }}
                className={`p-3 rounded-xl font-bold text-xs border ${formaPagamento === "local" ? "border-green-500 bg-green-500/20 text-green-400" : "border-gray-700 bg-gray-800"}`}
              >
                Pagar no Local
              </button>
              <button 
                onClick={() => { setFormaPagamento("pix"); setTempoPix(600); setTimerAtivo(true); }}
                className={`p-3 rounded-xl font-bold text-xs border ${formaPagamento === "pix" ? "border-green-500 bg-green-500/20 text-green-400" : "border-gray-700 bg-gray-800"}`}
              >
                Pagar via Pix
              </button>
            </div>

            {formaPagamento === "pix" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1">
                <p className="text-xs text-amber-400 font-bold">Chave Pix (Telefone):</p>
                <p className="text-md font-mono font-bold">21979012977</p>
                <p className="text-xs text-red-400 font-bold">Expira em: {formatarTempo(tempoPix)}</p>
              </div>
            )}

            <button onClick={handleFinalizarAgendamento} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm">
              Confirmar e Agendar
            </button>
          </div>
        )}

        {/* MEUS AGENDAMENTOS */}
        {telaAtual === "meus_agendamentos" && (
          <div className="space-y-4">
            <button onClick={() => setTelaAtual("menu")} className="text-xs text-gray-400">← Voltar</button>
            <h2 className="text-md font-bold text-center">Meus Agendamentos</h2>
            <div className="space-y-2">
              {agendamentos.filter(a => a.clienteWhatsapp === cliente?.whatsapp).length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-4">Nenhum agendamento encontrado.</p>
              ) : (
                agendamentos.filter(a => a.clienteWhatsapp === cliente?.whatsapp).map((a, i) => (
                  <div key={i} className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-amber-400">{a.servico}</p>
                    <p>{a.data} às {a.horario}</p>
                    <p className="text-gray-400">Status: {a.status}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CLUBE */}
        {telaAtual === "clube" && (
          <div className="space-y-4">
            <button onClick={() => setTelaAtual("menu")} className="text-xs text-gray-400">← Voltar</button>
            <h2 className="text-md font-bold text-center">Clube do Hiroschi</h2>
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center space-y-2">
              <p className="text-xs text-gray-300">Corte 5 vezes e ganhe 1 Barba grátis!</p>
              <div className="text-2xl font-bold text-amber-400">3 / 5 Cortes</div>
            </div>
          </div>
        )}

        {/* PRODUTOS */}
        {telaAtual === "produtos" && (
          <div className="space-y-4">
            <button onClick={() => setTelaAtual("menu")} className="text-xs text-gray-400">← Voltar</button>
            <h2 className="text-md font-bold text-center">Produtos Disponíveis</h2>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-gray-800 rounded-xl border border-gray-700 flex justify-between">
                <span>Pomada Modeladora</span>
                <span className="text-amber-400 font-bold">R$ 35,00</span>
              </div>
              <div className="p-3 bg-gray-800 rounded-xl border border-gray-700 flex justify-between">
                <span>Óleo para Barba</span>
                <span className="text-amber-400 font-bold">R$ 25,00</span>
              </div>
            </div>
          </div>
        )}

        {/* PAINEL ADMIN */}
        {telaAtual === "admin" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h2 className="font-bold text-md text-amber-400">Painel do Proprietário</h2>
              <button onClick={() => setTelaAtual("login")} className="text-xs text-red-400 font-bold">Sair</button>
            </div>

            {/* Navegação de Abas Admin */}
            <div className="flex overflow-x-auto gap-2 pb-2 text-xs border-b border-gray-800 no-scrollbar">
              {(["agenda", "caixa", "cliente", "clube", "servicos", "produtos", "horarios", "configuracao"] as const).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaAdmin(aba)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-bold whitespace-nowrap ${abaAdmin === aba ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-300"}`}
                >
                  {aba}
                </button>
              ))}
            </div>

            {/* ABA AGENDA */}
            {abaAdmin === "agenda" && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-amber-400">Agendamentos Marcados</h3>
                {agendamentos.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">Nenhum agendamento no momento.</p>
                ) : (
                  agendamentos.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-800 rounded-xl border border-gray-700 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold">{item.clienteWhatsapp}</span>
                        <span className="text-amber-400 font-bold">R$ {item.valor},00</span>
                      </div>
                      <p>{item.servico} — {item.data} às {item.horario}</p>
                      <p className="text-gray-400">Pagamento: {item.pagamento}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA CAIXA */}
            {abaAdmin === "caixa" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-amber-400">Resumo de Caixa</h3>
                <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
                  <p className="text-xs text-gray-400">Total Faturado</p>
                  <p className="text-2xl font-bold text-green-400">
                    R$ {agendamentos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0)},00
                  </p>
                </div>
              </div>
            )}

            {/* ABA CLIENTES */}
            {abaAdmin === "cliente" && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-amber-400">Clientes Cadastrados</h3>
                <div className="p-3 bg-gray-800 rounded-xl border border-gray-700 text-xs">
                  <p className="font-bold">{cliente?.whatsapp || "Nenhum cliente registrado ainda"}</p>
                </div>
              </div>
            )}

            {/* CONFIGURAÇÃO DE CORES */}
            {abaAdmin === "configuracao" && (
              <div className="space-y-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700 text-xs">
                <h3 className="font-bold text-amber-400">Personalizar Cores</h3>
                <div>
                  <label className="block text-gray-400 mb-1">Cor Primária:</label>
                  <input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="w-full h-8 bg-transparent border-0 cursor-pointer" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Cor do Fundo:</label>
                  <input type="color" value={corFundo} onChange={(e) => setCorFundo(e.target.value)} className="w-full h-8 bg-transparent border-0 cursor-pointer" />
                </div>
                <button onClick={() => alert("Cores atualizadas!")} className="w-full py-2 bg-amber-500 text-black font-bold rounded-lg">Salvar Estilo</button>
              </div>
            )}

            {["clube", "servicos", "produtos", "horarios"].includes(abaAdmin) && (
              <div className="text-center py-6 text-xs text-gray-400">
                Gestão de <span className="text-amber-400 font-bold uppercase">{abaAdmin}</span> pronta para inclusão de novos itens.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
