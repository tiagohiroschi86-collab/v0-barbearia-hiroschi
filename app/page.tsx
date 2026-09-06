"use client"

import { useEffect, useState } from "react"

export default function BarbeariaHiroschi() {
  const [telaAtual, setTelaAtual] = useState<"login" | "cadastro" | "menu" | "agendamento" | "pagamento" | "admin">("login")
  const [abaAdmin, setAbaAdmin] = useState<"agenda" | "caixa" | "cliente" | "clube" | "servicos" | "produtos" | "horarios" | "configuracao">("agenda")
  
  const [whatsappInput, setWhatsappInput] = useState("")
  const [cliente, setCliente] = useState<{ nome: string; apelido: string; whatsapp: string } | null>(null)
  const [mostrarSenhaAdmin, setMostrarSenhaAdmin] = useState(false)
  const [senhaAdminInput, setSenhaAdminInput] = useState("")

  const [formaPagamento, setFormaPagamento] = useState<"local" | "pix" | null>(null)
  const [tempoPix, setTempoPix] = useState(600)
  const [timerAtivo, setTimerAtivo] = useState(false)

  const [corPrimaria, setCorPrimaria] = useState("#d4af37")
  const [corFundo, setCorFundo] = useState("#121212")
  const [corTexto, setCorTexto] = useState("#ffffff")

  const [slideAtual, setSlideAtual] = useState(0)
  const fotosCortes = [
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80"
  ]

  useEffect(() => {
    let interval: any = null
    if (timerAtivo && tempoPix > 0) {
      interval = setInterval(() => {
        setTempoPix((prev) => prev - 1)
      }, 1000)
    } else if (tempoPix === 0) {
      setTimerAtivo(false)
      alert("Tempo limite do Pix atingido! O horário foi liberado.")
      setTelaAtual("menu")
    }
    return () => clearInterval(interval)
  }, [timerAtivo, tempoPix])

  const handleAcessar = () => {
    if (!whatsappInput || whatsappInput.length < 10) {
      alert("Informe um WhatsApp válido com DDD!")
      return
    }
    setCliente({ nome: "Cliente", apelido: "Amigo", whatsapp: whatsappInput })
    setTelaAtual("menu")
  }

  const handleAcessoAdmin = () => {
    if (senhaAdminInput === "77186800") {
      setTelaAtual("admin")
    } else {
      alert("Senha de Administrador incorreta!")
    }
  }

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60)
    const segs = segundos % 60
    return `${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
  }

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-start p-4 transition-colors duration-300"
      style={{ backgroundColor: corFundo, color: corTexto }}
    >
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6 border border-gray-800 bg-gray-900/90 backdrop-blur-md">
        
        <header className="text-center border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-extrabold tracking-wider uppercase" style={{ color: corPrimaria }}>
            Barbearia Hiroschi 2.0
          </h1>
          <p className="text-xs text-gray-400">Estilo & Tradição</p>
        </header>

        {telaAtual === "login" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-center">Acesse seu Perfil</h2>
            
            <input 
              type="tel"
              placeholder="WhatsApp com DDD"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-center focus:outline-none focus:border-amber-500"
            />

            <button 
              onClick={handleAcessar}
              className="w-full py-3 rounded-xl font-bold uppercase tracking-wide transition transform active:scale-95 shadow-lg"
              style={{ backgroundColor: corPrimaria, color: "#000000" }}
            >
              Acessar Sistema
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
                <button 
                  type="button"
                  onClick={() => setMostrarSenhaAdmin(!mostrarSenhaAdmin)}
                  className="p-2 text-sm bg-gray-800 rounded-xl border border-gray-700"
                >
                  {mostrarSenhaAdmin ? "🙈" : "👁️"}
                </button>
              </div>

              <button 
                onClick={handleAcessoAdmin}
                className="text-xs text-red-400 hover:underline"
              >
                Acesso do Proprietário
              </button>
            </div>
          </div>
        )}

        {telaAtual === "menu" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <p className="font-bold text-md">Olá, {cliente?.apelido || cliente?.nome}!</p>
              <button onClick={() => setTelaAtual("login")} className="text-xs text-gray-400 hover:text-white">Sair</button>
            </div>

            <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-lg group border border-gray-800">
              <img 
                src={fotosCortes[slideAtual]} 
                alt="Corte Barbearia"
                className="w-full h-full object-cover transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-xs text-amber-400 font-semibold">Galeria de Trabalhos</span>
              </div>
              <button 
                onClick={() => setSlideAtual((prev) => (prev === 0 ? fotosCortes.length - 1 : prev - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-xs text-white"
              >
                ❮
              </button>
              <button 
                onClick={() => setSlideAtual((prev) => (prev === fotosCortes.length - 1 ? 0 : prev + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-xs text-white"
              >
                ❯
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setTelaAtual("pagamento")}
                className="p-4 rounded-xl font-bold text-sm text-center shadow-md transition transform active:scale-95"
                style={{ backgroundColor: corPrimaria, color: "#000000" }}
              >
                Novo Agendamento
              </button>
              <button className="p-4 bg-gray-800 border border-gray-700 rounded-xl font-semibold text-sm text-center hover:bg-gray-700">
                Meus Agendamentos
              </button>
              <button className="p-4 bg-gray-800 border border-gray-700 rounded-xl font-semibold text-sm text-center hover:bg-gray-700">
                Clube do Hiroschi
              </button>
              <button className="p-4 bg-gray-800 border border-gray-700 rounded-xl font-semibold text-sm text-center hover:bg-gray-700">
                Produtos
              </button>
            </div>
          </div>
        )}

        {telaAtual === "pagamento" && (
          <div className="space-y-4">
            <button onClick={() => setTelaAtual("menu")} className="text-xs text-gray-400">← Voltar</button>
            <h2 className="text-lg font-bold text-center">Confirmar Agendamento</h2>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setFormaPagamento("local")
                  setTimerAtivo(false)
                }}
                className={`p-3 rounded-xl font-bold text-sm border ${formaPagamento === "local" ? "border-green-500 bg-green-500/20 text-green-400" : "border-gray-700 bg-gray-800"}`}
              >
                Pagar no Local
              </button>
              <button 
                onClick={() => {
                  setFormaPagamento("pix")
                  setTempoPix(600)
                  setTimerAtivo(true)
                }}
                className={`p-3 rounded-xl font-bold text-sm border ${formaPagamento === "pix" ? "border-green-500 bg-green-500/20 text-green-400" : "border-gray-700 bg-gray-800"}`}
              >
                Pagar via Pix
              </button>
            </div>

            {formaPagamento === "pix" && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-2">
                <p className="text-xs text-amber-400 font-bold">Chave Pix (Telefone):</p>
                <p className="text-lg font-mono font-black text-white">21979012977</p>
                <p className="text-xs text-gray-400">Tempo para conclusão:</p>
                <p className="text-2xl font-bold text-red-500">{formatarTempo(tempoPix)}</p>
              </div>
            )}

            {formaPagamento && (
              <button 
                onClick={() => {
                  alert("Agendamento efetuado com sucesso!")
                  setTelaAtual("menu")
                }}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-center shadow-lg hover:bg-green-500"
              >
                Finalizar Agendamento
              </button>
            )}
          </div>
        )}

        {telaAtual === "admin" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h2 className="font-bold text-lg text-amber-400">Painel Admin 2.0</h2>
              <button onClick={() => setTelaAtual("login")} className="text-xs text-red-400 font-bold">Sair</button>
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 text-xs border-b border-gray-800 no-scrollbar">
              {(["agenda", "caixa", "cliente", "clube", "servicos", "produtos", "horarios", "configuracao"] as const).map((aba) => (
                <button
                  key={aba}
                  onClick={() => setAbaAdmin(aba)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-bold whitespace-nowrap transition ${abaAdmin === aba ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-300"}`}
                >
                  {aba}
                </button>
              ))}
            </div>

            {abaAdmin === "configuracao" && (
              <div className="space-y-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <h3 className="font-bold text-sm text-amber-400">Personalizar Cores do App</h3>
                
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Cor Primária (Destaque/Botões):</label>
                  <input 
                    type="color" 
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Cor do Fundo:</label>
                  <input 
                    type="color" 
                    value={corFundo}
                    onChange={(e) => setCorFundo(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Cor do Texto:</label>
                  <input 
                    type="color" 
                    value={corTexto}
                    onChange={(e) => setCorTexto(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>

                <button 
                  onClick={() => alert("Estilo visual atualizado!")}
                  className="w-full py-2 bg-amber-500 text-black font-bold rounded-lg text-xs"
                >
                  Salvar Preferências
                </button>
              </div>
            )}

            {abaAdmin !== "configuracao" && (
              <div className="text-center py-8 text-xs text-gray-400">
                Aba <span className="text-amber-400 font-bold uppercase">{abaAdmin}</span> pronta para operações.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
