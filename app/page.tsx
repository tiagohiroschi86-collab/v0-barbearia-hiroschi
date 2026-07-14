"use client"

import React, { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"

// ==========================================
// TIPOS E INTERFACES
// ==========================================
interface ClienteClube {
  id: string
  nome: string
  plano: "Bronze" | "Prata" | "Ouro" | "Diamante"
  status: "Ativo" | "Suspenso" | "Pendente"
  inicio: string
  proximaCobranca: string
}

interface BannerFoto {
  id: string
  url: string
  titulo: string
  ordem: number
}

interface Produto {
  id: string
  nome: string
  preco: number
  imagem: string
  descricao: string
}

interface Agendamento {
  id: string
  clienteNome: string
  servico: string
  dia: string
  horario: string
  eClube: boolean
  planoClube?: string
}

interface MovimentacaoCaixa {
  id: string
  cliente: string
  servico: string
  valorBruto: number
  desconto: number
  valorPago: number
  metodo: "PIX" | "Cartão" | "Dinheiro" | "Clube Hiroschi"
  eClube: boolean
  data: string
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function BarbeariaHiroschi() {
  // Estado de Autenticação e Navegação
  const [estaLogado, setEstaLogado] = useState(false)
  const [eAdmin, setEAdmin] = useState(false)
  const [whatsapp, setWhatsapp] = useState("")
  const [telaAtual, setTelaAtual] = useState<
    "inicial" | "agendamento" | "meus_agendamentos" | "clube" | "produtos" | "painel"
  >("inicial")

  // Estado do Banner Carousel
  const [fotosBanners, setFotosBanners] = useState<BannerFoto[]>([
    {
      id: "1",
      url: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=80",
      titulo: "Taper Fade Americano",
      ordem: 1,
    },
    {
      id: "2",
      url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
      titulo: "Barba Alinhada & Toalha Quente",
      ordem: 2,
    },
    {
      id: "3",
      url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80",
      titulo: "Corte Social Moderno",
      ordem: 3,
    },
  ])
  const [fotoAtualIndex, setFotoAtualIndex] = useState(0)

  // Estado do Login Administrativo (senha com mostrar/ocultar)
  const [mostrarFormAdmin, setMostrarFormAdmin] = useState(false)
  const [senhaAdmin, setSenhaAdmin] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erroSenhaAdmin, setErroSenhaAdmin] = useState("")

  // Novo Banner Form State (Admin)
  const [novoBannerUrl, setNovoBannerUrl] = useState("")
  const [novoBannerTitulo, setNovoBannerTitulo] = useState("")
  const [novoBannerArquivo, setNovoBannerArquivo] = useState("")

  // Estado do Clube Hiroschi
  // O cliente NÃO é membro por padrão. Só passa a usufruir dos benefícios
  // após o Proprietário confirmar o pagamento no painel administrativo.
  const [usuarioClube, setUsuarioClube] = useState<ClienteClube | null>(null)

  const [listaMembrosClube, setListaMembrosClube] = useState<ClienteClube[]>([
    {
      id: "user_1",
      nome: "Tiago Antônio",
      plano: "Diamante",
      status: "Ativo",
      inicio: "24/06/2026",
      proximaCobranca: "24/07/2026",
    },
    {
      id: "user_2",
      nome: "Carlos Eduardo",
      plano: "Prata",
      status: "Ativo",
      inicio: "10/05/2026",
      proximaCobranca: "10/06/2026",
    },
    {
      id: "user_3",
      nome: "Rafael Souza",
      plano: "Ouro",
      status: "Pendente",
      inicio: "-",
      proximaCobranca: "-",
    },
  ])

  // Número de WhatsApp da barbearia (formato internacional, sem símbolos)
  const numeroWhatsappBarbearia = "5511999998888"

  // Estado dos Agendamentos
  const [diaSelecionado, setDiaSelecionado] = useState("")
  const [servicoSelecionado, setServicoSelecionado] = useState("Corte de Cabelo")
  const [erroAgendamento, setErroAgendamento] = useState("")
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([
    {
      id: "1",
      clienteNome: "Tiago Antônio",
      servico: "Corte de Cabelo",
      dia: "Quarta",
      horario: "14:00",
      eClube: true,
      planoClube: "Diamante",
    },
    { id: "2", clienteNome: "João Silva", servico: "Corte + Barba", dia: "Sábado", horario: "10:00", eClube: false },
  ])

  // Estado dos Produtos
  const [produtos] = useState<Produto[]>([
    {
      id: "p1",
      nome: "Pomada Modeladora Matte",
      preco: 45.0,
      imagem: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80",
      descricao: "Fixação forte com acabamento natural sem brilho.",
    },
    {
      id: "p2",
      nome: "Óleo para Barba Premium",
      preco: 38.0,
      imagem: "https://images.unsplash.com/photo-1608248597261-02b4d13e7178?w=500&auto=format&fit=crop&q=80",
      descricao: "Hidratação profunda para os fios e a pele.",
    },
  ])

  // Estado do Caixa Financeiro
  const [historicoCaixa, setHistoricoCaixa] = useState<MovimentacaoCaixa[]>([
    {
      id: "c1",
      cliente: "João Silva",
      servico: "Corte + Barba",
      valorBruto: 65,
      desconto: 10,
      valorPago: 55,
      metodo: "PIX",
      eClube: false,
      data: "Hoje",
    },
    {
      id: "c2",
      cliente: "Maria Oliveira",
      servico: "Corte Fino",
      valorBruto: 35,
      desconto: 0,
      valorPago: 35,
      metodo: "Cartão",
      eClube: false,
      data: "Hoje",
    },
    {
      id: "c3",
      cliente: "Carlos Eduardo",
      servico: "Corte de Cabelo",
      valorBruto: 35,
      desconto: 35,
      valorPago: 0,
      metodo: "Clube Hiroschi",
      eClube: true,
      data: "Hoje",
    },
  ])

  // Formulário de Fechamento de Caixa (Admin)
  const [caixaCliente, setCaixaCliente] = useState("")
  const [caixaServico] = useState("Corte")
  const [caixaValor, setCaixaValor] = useState("35")
  const [caixaDesconto, setCaixaDesconto] = useState("0")
  const [caixaMetodo, setCaixaMetodo] = useState<"PIX" | "Cartão" | "Dinheiro">("PIX")
  const [caixaEClube, setCaixaEClube] = useState(false)

  // ------------------------------------------
  // CARROSSEL AUTOMÁTICO (5 SEGUNDOS)
  // ------------------------------------------
  useEffect(() => {
    if (fotosBanners.length === 0 || !estaLogado || telaAtual !== "inicial") return
    const interval = setInterval(() => {
      setFotoAtualIndex((prev) => (prev + 1) % fotosBanners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [fotosBanners, estaLogado, telaAtual])

  // ------------------------------------------
  // LÓGICAS E MÉTODOS
  // ------------------------------------------
  const lidarComLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (whatsapp.trim().length >= 8) {
      setEstaLogado(true)
      setEAdmin(false)
      setTelaAtual("inicial")
    }
  }

  const SENHA_ADMIN = "77186800"

  const validarLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault()
    if (senhaAdmin === SENHA_ADMIN) {
      setEstaLogado(true)
      setEAdmin(true)
      setTelaAtual("painel")
      setSenhaAdmin("")
      setErroSenhaAdmin("")
      setMostrarFormAdmin(false)
    } else {
      setErroSenhaAdmin("Senha incorreta. Tente novamente.")
    }
  }

  // Formata uma data para o padrão DD/MM/AAAA
  const formatarData = (data: Date) =>
    data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

  // ------------------------------------------
  // FLUXO DE ASSINATURA DO CLUBE (COM APROVAÇÃO DO ADMIN)
  // ------------------------------------------
  const solicitarAssinatura = (plano: ClienteClube["plano"]) => {
    const idCliente = "user_atual"
    const nomeCliente = whatsapp ? `Cliente ${whatsapp}` : "Cliente WhatsApp"

    const solicitacao: ClienteClube = {
      id: idCliente,
      nome: nomeCliente,
      plano,
      status: "Pendente",
      inicio: "-",
      proximaCobranca: "-",
    }

    // Registra/atualiza a solicitação na lista do proprietário
    setListaMembrosClube((prev) => {
      const jaExiste = prev.some((m) => m.id === idCliente)
      if (jaExiste) return prev.map((m) => (m.id === idCliente ? solicitacao : m))
      return [...prev, solicitacao]
    })

    // Define o status local do cliente como Pendente (sem benefícios ainda)
    setUsuarioClube(solicitacao)

    // Redireciona ao WhatsApp da barbearia para confirmação do pagamento
    const mensagem = encodeURIComponent(
      `Olá! Quero assinar o Plano ${plano} do Clube Hiroschi. Meu WhatsApp cadastrado: ${whatsapp || "(informar)"}.`,
    )
    window.open(`https://wa.me/${numeroWhatsappBarbearia}?text=${mensagem}`, "_blank")
  }

  // Proprietário confirma o pagamento e ativa o membro
  const ativarMembro = (id: string) => {
    const hoje = new Date()
    const proxima = new Date()
    proxima.setMonth(proxima.getMonth() + 1)

    setListaMembrosClube((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: "Ativo", inicio: formatarData(hoje), proximaCobranca: formatarData(proxima) }
          : m,
      ),
    )

    // Sincroniza o status do cliente logado, caso seja ele
    setUsuarioClube((prev) =>
      prev && prev.id === id
        ? { ...prev, status: "Ativo", inicio: formatarData(hoje), proximaCobranca: formatarData(proxima) }
        : prev,
    )
  }

  const lidarComSelecaoDeDia = (dia: string) => {
    setDiaSelecionado(dia)
    setErroAgendamento("")

    // Regra de Restrição do Clube
    if (usuarioClube && usuarioClube.status === "Ativo") {
      if (dia === "Sexta" || dia === "Sábado") {
        setErroAgendamento(
          "Clientes do Clube Hiroschi realizam seus agendamentos de terça a quinta-feira, conforme as regras do plano.",
        )
      }
    }
  }

  const confirmarAgendamento = () => {
    if (!diaSelecionado) {
      alert("Por favor, selecione um dia.")
      return
    }
    if (erroAgendamento) return

    const novo: Agendamento = {
      id: Date.now().toString(),
      clienteNome: usuarioClube?.nome || "Cliente WhatsApp",
      servico: servicoSelecionado,
      dia: diaSelecionado,
      horario: "15:00",
      eClube: !!(usuarioClube && usuarioClube.status === "Ativo"),
      planoClube: usuarioClube?.plano,
    }

    setAgendamentos([...agendamentos, novo])
    alert("Agendamento efetuado com sucesso!")
    setTelaAtual("meus_agendamentos")
  }

  // Upload direto da galeria/câmera do celular (converte para base64)
  const lidarComUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => {
      setNovoBannerArquivo(leitor.result as string)
    }
    leitor.readAsDataURL(arquivo)
  }

  const adicionarBanner = (e: React.FormEvent) => {
    e.preventDefault()
    // Prioriza a foto enviada do celular; senão usa a URL informada
    const fonteImagem = novoBannerArquivo || novoBannerUrl
    if (!fonteImagem || !novoBannerTitulo) return
    const novo: BannerFoto = {
      id: Date.now().toString(),
      url: fonteImagem,
      titulo: novoBannerTitulo,
      ordem: fotosBanners.length + 1,
    }
    setFotosBanners([...fotosBanners, novo])
    setNovoBannerUrl("")
    setNovoBannerTitulo("")
    setNovoBannerArquivo("")
  }

  const removerBanner = (id: string) => {
    setFotosBanners(fotosBanners.filter((b) => b.id !== id))
  }

  const lancarCaixa = (e: React.FormEvent) => {
    e.preventDefault()
    const bruto = Number.parseFloat(caixaValor) || 0
    const desc = Number.parseFloat(caixaDesconto) || 0
    const pago = caixaEClube ? 0 : Math.max(0, bruto - desc)

    const novaMovimentacao: MovimentacaoCaixa = {
      id: Date.now().toString(),
      cliente: caixaCliente,
      servico: caixaServico,
      valorBruto: bruto,
      desconto: desc,
      valorPago: pago,
      metodo: caixaEClube ? "Clube Hiroschi" : caixaMetodo,
      eClube: caixaEClube,
      data: "Hoje",
    }

    setHistoricoCaixa([novaMovimentacao, ...historicoCaixa])
    setCaixaCliente("")
    setCaixaValor("35")
    setCaixaDesconto("0")
    setCaixaEClube(false)
    alert("Atendimento finalizado e gravado no caixa!")
  }

  // Cálculos do Caixa Inteligente
  const faturamentoTotal = historicoCaixa.filter((h) => !h.eClube).reduce((acc, h) => acc + h.valorPago, 0)

  const faturamentoPix = historicoCaixa
    .filter((h) => h.metodo === "PIX" && !h.eClube)
    .reduce((acc, h) => acc + h.valorPago, 0)

  const faturamentoCartao = historicoCaixa
    .filter((h) => h.metodo === "Cartão" && !h.eClube)
    .reduce((acc, h) => acc + h.valorPago, 0)

  const faturamentoDinheiro = historicoCaixa
    .filter((h) => h.metodo === "Dinheiro" && !h.eClube)
    .reduce((acc, h) => acc + h.valorPago, 0)

  const valorTotalIsentoClube = historicoCaixa.filter((h) => h.eClube).reduce((acc, h) => acc + h.valorBruto, 0)

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col items-center justify-start p-2 sm:p-4">
      {/* TELA DE LOGIN / AUTENTICAÇÃO */}
      {!estaLogado && (
        <div className="w-full max-w-md flex flex-col items-center justify-center min-h-[90vh] space-y-6">
          <div className="w-full bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <span className="text-4xl">💈</span>
              <h1 className="text-2xl font-black uppercase tracking-wider text-amber-500">Barbearia Hiroschi</h1>
              <p className="text-xs text-neutral-400">Seu próximo corte está a poucos cliques.</p>
            </div>

            <form onSubmit={lidarComLogin} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-neutral-400 mb-1 block">Número do WhatsApp</label>
                <input
                  type="tel"
                  placeholder="(00) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full p-4 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:border-amber-500 text-white placeholder-neutral-600 transition"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl uppercase tracking-wider transition shadow-lg shadow-amber-500/10 active:scale-[0.98]"
              >
                Acessar Agendamento
              </button>
            </form>

            <div className="pt-4 border-t border-neutral-800">
              {!mostrarFormAdmin ? (
                <button
                  onClick={() => {
                    setMostrarFormAdmin(true)
                    setErroSenhaAdmin("")
                  }}
                  className="text-xs text-neutral-500 hover:text-amber-500 transition underline"
                >
                  Área Administrativa do Proprietário
                </button>
              ) : (
                <form onSubmit={validarLoginAdmin} className="space-y-3 text-left">
                  <label className="text-xs font-semibold text-neutral-400 mb-1 block">Senha do Proprietário</label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      placeholder="Digite a senha"
                      value={senhaAdmin}
                      onChange={(e) => {
                        setSenhaAdmin(e.target.value)
                        setErroSenhaAdmin("")
                      }}
                      className="w-full p-3 pr-12 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:border-amber-500 text-white placeholder-neutral-600 transition"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-amber-500 transition"
                    >
                      {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {erroSenhaAdmin && <p className="text-[11px] text-red-400">{erroSenhaAdmin}</p>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarFormAdmin(false)
                        setSenhaAdmin("")
                        setErroSenhaAdmin("")
                      }}
                      className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl uppercase tracking-wider transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl uppercase tracking-wider transition"
                    >
                      Entrar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APLICAÇÃO LOGADA */}
      {estaLogado && (
        <div className="w-full max-w-md flex flex-col min-h-screen pb-20">
          {/* BARRA SUPERIOR / CABEÇALHO */}
          <header className="flex items-center justify-between py-4 border-b border-neutral-800 mb-4 px-2">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setTelaAtual("inicial")}>
              <span className="text-2xl">💈</span>
              <div>
                <h1 className="text-base font-bold tracking-wider text-amber-500 uppercase leading-none">HIROSCHI</h1>
                <span className="text-[10px] text-neutral-400">{eAdmin ? "Painel do Proprietário" : "Barbearia"}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setEstaLogado(false)
                setEAdmin(false)
                setTelaAtual("inicial")
              }}
              className="text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg"
            >
              Sair
            </button>
          </header>

          {/* NAVEGAÇÃO SUPERIOR RÁPIDA (CLIENTE) */}
          {!eAdmin && (
            <nav className="grid grid-cols-5 gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 mb-6 text-[10px] sm:text-xs">
              <button
                onClick={() => setTelaAtual("inicial")}
                className={`py-2 rounded-lg transition text-center font-medium ${
                  telaAtual === "inicial" ? "bg-amber-500 text-black font-bold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Início
              </button>
              <button
                onClick={() => setTelaAtual("agendamento")}
                className={`py-2 rounded-lg transition text-center font-medium ${
                  telaAtual === "agendamento" ? "bg-amber-500 text-black font-bold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Agendar
              </button>
              <button
                onClick={() => setTelaAtual("meus_agendamentos")}
                className={`py-2 rounded-lg transition text-center font-medium ${
                  telaAtual === "meus_agendamentos"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Agenda
              </button>
              <button
                onClick={() => setTelaAtual("clube")}
                className={`py-2 rounded-lg transition text-center font-medium ${
                  telaAtual === "clube" ? "bg-amber-500 text-black font-bold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Clube
              </button>
              <button
                onClick={() => setTelaAtual("produtos")}
                className={`py-2 rounded-lg transition text-center font-medium ${
                  telaAtual === "produtos" ? "bg-amber-500 text-black font-bold" : "text-neutral-400 hover:text-white"
                }`}
              >
                Vitrine
              </button>
            </nav>
          )}

          {/* TELA INICIAL (CLIENTE) */}
          {telaAtual === "inicial" && !eAdmin && (
            <div className="space-y-6">
              {/* TÍTULO & SAUDAÇÃO */}
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-neutral-100">Bem-vindo à Barbearia Hiroschi</h2>
                <p className="text-xs text-neutral-400">Seu próximo corte está a poucos cliques.</p>
              </div>

              {/* CARROSSEL DE FOTOS COM BANNER */}
              {fotosBanners.length > 0 && (
                <div className="relative w-full overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl group">
                  <div className="relative h-64 w-full">
                    <img
                      src={fotosBanners[fotoAtualIndex].url || "/placeholder.svg"}
                      alt={fotosBanners[fotoAtualIndex].titulo}
                      className="w-full h-full object-cover transition-all duration-700 ease-in-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-4 left-4 right-4 text-left">
                      <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-black uppercase">
                        Destaque
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">{fotosBanners[fotoAtualIndex].titulo}</h3>
                    </div>
                  </div>

                  {/* INDICADORES DO CARROSSEL */}
                  <div className="absolute bottom-2 right-4 flex space-x-1.5">
                    {fotosBanners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFotoAtualIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === fotoAtualIndex ? "w-6 bg-amber-500" : "w-2 bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* BOTÕES DE NAVEGAÇÃO PRINCIPAIS */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setTelaAtual("agendamento")}
                  className="w-full p-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl flex items-center justify-between transition shadow-lg shadow-amber-500/10"
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-xl">📅</span>
                    <span>Novo Agendamento</span>
                  </span>
                  <span>→</span>
                </button>

                <button
                  onClick={() => setTelaAtual("meus_agendamentos")}
                  className="w-full p-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex items-center justify-between transition"
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-xl">📋</span>
                    <span>Meus Agendamentos</span>
                  </span>
                  <span>→</span>
                </button>

                <button
                  onClick={() => setTelaAtual("clube")}
                  className="w-full p-4 bg-gradient-to-r from-neutral-900 to-amber-950/40 border border-amber-500/30 rounded-xl flex items-center justify-between transition"
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-xl">💎</span>
                    <span className="text-amber-400 font-bold">Clube Hiroschi</span>
                  </span>
                  <span className="text-amber-400">→</span>
                </button>

                <button
                  onClick={() => setTelaAtual("produtos")}
                  className="w-full p-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex items-center justify-between transition"
                >
                  <span className="flex items-center space-x-3">
                    <span className="text-xl">🛒</span>
                    <span>Produtos</span>
                  </span>
                  <span>→</span>
                </button>
              </div>

              {/* BANNER DE AVALIAÇÃO */}
              <div className="bg-neutral-900/60 border border-neutral-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1 text-amber-500 text-sm">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span className="font-bold text-white ml-2">4,9 / 5,0</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Mais de 500 clientes atendidos com excelência.</p>
                </div>
              </div>
            </div>
          )}

          {/* TELA DE AGENDAMENTO COM RESTRIÇÃO DE DIA */}
          {telaAtual === "agendamento" && !eAdmin && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-amber-500 border-b border-neutral-800 pb-2">Agendar Horário</h2>

              {/* SELEÇÃO DE SERVIÇO */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">Serviço</label>
                <select
                  value={servicoSelecionado}
                  onChange={(e) => setServicoSelecionado(e.target.value)}
                  className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="Corte de Cabelo">Corte de Cabelo - R$ 35</option>
                  <option value="Barba Completa">Barba Completa - R$ 30</option>
                  <option value="Corte + Barba">Combo Corte + Barba - R$ 60</option>
                  <option value="Sobrancelha">Sobrancelha - R$ 15</option>
                </select>
              </div>

              {/* SELEÇÃO DO DIA */}
              <div className="space-y-2">
                <label className="text-xs text-neutral-400">Escolha o Dia</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((dia) => (
                    <button
                      key={dia}
                      onClick={() => lidarComSelecaoDeDia(dia)}
                      className={`p-3 rounded-xl border text-sm font-medium transition ${
                        diaSelecionado === dia
                          ? "bg-amber-500 border-amber-500 text-black font-bold"
                          : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>

              {/* MENSAGEM DE ERRO/ALERTA DO CLUBE */}
              {erroAgendamento && (
                <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-red-300 text-xs leading-relaxed">
                  ⚠️ {erroAgendamento}
                </div>
              )}

              {usuarioClube && usuarioClube.status === "Ativo" && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
                  💎 Você é membro do <strong>Clube Hiroschi ({usuarioClube.plano})</strong>. Seus agendamentos são de
                  terça a quinta com isenção no atendimento!
                </div>
              )}

              <button
                onClick={confirmarAgendamento}
                disabled={!!erroAgendamento || !diaSelecionado}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl uppercase tracking-wider transition"
              >
                Confirmar Agendamento
              </button>
            </div>
          )}

          {/* TELA MEUS AGENDAMENTOS */}
          {telaAtual === "meus_agendamentos" && !eAdmin && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-amber-500 border-b border-neutral-800 pb-2">Meus Agendamentos</h2>

              {agendamentos.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-8">Nenhum agendamento encontrado.</p>
              ) : (
                agendamentos.map((item) => (
                  <div key={item.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm text-white">{item.servico}</h3>
                      {item.eClube && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                          Clube {item.planoClube}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-400 flex justify-between">
                      <span>Dia: {item.dia}</span>
                      <span>Horário: {item.horario}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TELA CLUBE HIROSCHI */}
          {telaAtual === "clube" && !eAdmin && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-amber-500/30 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-10">💎</div>
                <h2 className="text-xl font-black text-amber-500 uppercase tracking-wide">Clube Hiroschi</h2>

                {usuarioClube && usuarioClube.status === "Ativo" ? (
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span className="text-neutral-400">Membro:</span>
                      <span className="font-bold text-white">{usuarioClube.nome}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span className="text-neutral-400">Plano Atual:</span>
                      <span className="font-bold text-amber-400">{usuarioClube.plano}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span className="text-neutral-400">Início:</span>
                      <span className="text-white">{usuarioClube.inicio}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span className="text-neutral-400">Próxima Cobrança:</span>
                      <span className="text-white">{usuarioClube.proximaCobranca}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-neutral-400">Status:</span>
                      <span className="text-green-400 font-bold">● {usuarioClube.status}</span>
                    </div>
                  </div>
                ) : usuarioClube && usuarioClube.status === "Pendente" ? (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-yellow-400">⏳ Solicitação em análise</p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Recebemos sua solicitação do <strong>Plano {usuarioClube.plano}</strong>. Os benefícios serão
                      liberados assim que o proprietário confirmar o pagamento pelo WhatsApp.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 mt-2">
                    Assine o clube para garantir seus cortes mensais e benefícios exclusivos.
                  </p>
                )}
              </div>

              {/* PLANOS */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-neutral-300">Escolha seu Plano</h3>

                {(
                  [
                    { nome: "Bronze", preco: "R$ 49,90/mês", descricao: "2 cortes por mês" },
                    { nome: "Prata", preco: "R$ 79,90/mês", descricao: "2 cortes + barba" },
                    { nome: "Ouro", preco: "R$ 99,90/mês", descricao: "4 cortes por mês" },
                    { nome: "Diamante", preco: "R$ 169,90/mês", descricao: "4 cortes + barba" },
                  ] as { nome: ClienteClube["plano"]; preco: string; descricao: string }[]
                ).map((plano) => {
                  const ehPlanoSolicitado = usuarioClube?.plano === plano.nome
                  const pendente = ehPlanoSolicitado && usuarioClube?.status === "Pendente"
                  const ativo = ehPlanoSolicitado && usuarioClube?.status === "Ativo"
                  return (
                    <div
                      key={plano.nome}
                      className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-white">Plano {plano.nome}</h4>
                        <p className="text-[11px] text-neutral-400">{plano.descricao}</p>
                        <span className="text-xs text-amber-500 font-bold block mt-1">{plano.preco}</span>
                      </div>
                      <button
                        onClick={() => solicitarAssinatura(plano.nome)}
                        disabled={pendente || ativo}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs rounded-lg uppercase whitespace-nowrap transition"
                      >
                        {ativo ? "Ativo" : pendente ? "Pendente" : "Assinar"}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TELA DE PRODUTOS (VITRINE SEM CORTAR IMAGENS) */}
          {telaAtual === "produtos" && !eAdmin && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-amber-500 border-b border-neutral-800 pb-2">Vitrine de Produtos</h2>

              <div className="grid grid-cols-1 gap-4">
                {produtos.map((p) => (
                  <div
                    key={p.id}
                    className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex space-x-4 items-center"
                  >
                    {/* Imagem Inteira mantendo Proporção (object-contain) */}
                    <div className="w-24 h-24 bg-neutral-950 rounded-lg p-1 border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={p.imagem || "/placeholder.svg"}
                        alt={p.nome}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <h3 className="font-bold text-sm text-white">{p.nome}</h3>
                      <p className="text-[11px] text-neutral-400 leading-tight">{p.descricao}</p>
                      <span className="text-sm font-black text-amber-500 block pt-1">R$ {p.preco.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAINEL ADMINISTRATIVO (PROPRIETÁRIO) */}
          {eAdmin && (
            <div className="space-y-8">
              {/* CAIXA DO DIA E RECEBIMENTOS */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-lg font-black text-amber-500 uppercase tracking-wide flex items-center justify-between">
                  <span>💰 Caixa Inteligente</span>
                  <span className="text-xs text-neutral-400 font-normal">Hoje</span>
                </h2>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block uppercase">Total Recebido</span>
                    <span className="text-lg font-black text-green-400">R$ {faturamentoTotal.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block uppercase">Atendimentos Clube</span>
                    <span className="text-lg font-black text-amber-400">R$ {valorTotalIsentoClube.toFixed(2)}</span>
                    <span className="text-[9px] text-neutral-500 block">(Não soma ao caixa)</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center text-xs pt-2 border-t border-neutral-800">
                  <div>
                    <span className="text-neutral-400 block">PIX</span>
                    <span className="font-bold text-white">R$ {faturamentoPix}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Cartão</span>
                    <span className="font-bold text-white">R$ {faturamentoCartao}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Dinheiro</span>
                    <span className="font-bold text-white">R$ {faturamentoDinheiro}</span>
                  </div>
                </div>

                {/* LANÇAR NOVO ATENDIMENTO */}
                <form onSubmit={lancarCaixa} className="pt-4 border-t border-neutral-800 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase">Finalizar Atendimento</h3>

                  <input
                    type="text"
                    placeholder="Nome do Cliente"
                    value={caixaCliente}
                    onChange={(e) => setCaixaCliente(e.target.value)}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Valor (R$)"
                      value={caixaValor}
                      onChange={(e) => setCaixaValor(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Desconto (R$)"
                      value={caixaDesconto}
                      onChange={(e) => setCaixaDesconto(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="eClube"
                      checked={caixaEClube}
                      onChange={(e) => setCaixaEClube(e.target.checked)}
                      className="rounded bg-neutral-950 border-neutral-800"
                    />
                    <label htmlFor="eClube" className="text-xs text-amber-400">
                      Cliente do Clube Hiroschi (Isento hoje)
                    </label>
                  </div>

                  {!caixaEClube && (
                    <select
                      value={caixaMetodo}
                      onChange={(e) => setCaixaMetodo(e.target.value as "PIX" | "Cartão" | "Dinheiro")}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                    >
                      <option value="PIX">Pagamento via PIX</option>
                      <option value="Cartão">Pagamento via Cartão</option>
                      <option value="Dinheiro">Pagamento em Dinheiro</option>
                    </select>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition"
                  >
                    Confirmar Atendimento
                  </button>
                </form>
              </div>

              {/* GERENCIAR BANNERS DO CARROSSEL */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-sm font-bold text-amber-500 uppercase">📸 Banners da Tela Inicial</h2>

                <form onSubmit={adicionarBanner} className="space-y-2">
                  {/* Upload direto da galeria/câmera do celular */}
                  <div>
                    <label className="text-[11px] text-neutral-400 mb-1 block">Enviar foto do celular</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={lidarComUploadFoto}
                      className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-black file:font-bold file:text-xs file:uppercase file:cursor-pointer bg-neutral-950 border border-neutral-800 rounded-lg p-1.5"
                    />
                  </div>

                  {novoBannerArquivo && (
                    <div className="relative">
                      <img
                        src={novoBannerArquivo || "/placeholder.svg"}
                        alt="Pré-visualização da foto selecionada"
                        className="w-full h-32 object-cover rounded-lg border border-neutral-800"
                      />
                      <button
                        type="button"
                        onClick={() => setNovoBannerArquivo("")}
                        className="absolute top-1.5 right-1.5 bg-neutral-950/80 text-red-400 text-[10px] px-2 py-1 rounded-lg border border-neutral-700"
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase">
                    <div className="h-px flex-1 bg-neutral-800" />
                    <span>ou cole uma URL</span>
                    <div className="h-px flex-1 bg-neutral-800" />
                  </div>

                  <input
                    type="url"
                    placeholder="URL da Imagem (opcional)"
                    value={novoBannerUrl}
                    onChange={(e) => setNovoBannerUrl(e.target.value)}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Título / Legenda do Corte"
                    value={novoBannerTitulo}
                    onChange={(e) => setNovoBannerTitulo(e.target.value)}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                    required
                  />
                  <button type="submit" className="w-full py-2 bg-amber-500 text-black font-bold text-xs rounded-lg uppercase">
                    Adicionar Foto
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {fotosBanners.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2 bg-neutral-950 rounded-lg border border-neutral-800 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <img src={b.url || "/placeholder.svg"} alt={b.titulo} className="w-10 h-10 object-cover rounded" />
                        <span className="font-medium text-white">{b.titulo}</span>
                      </div>
                      <button
                        onClick={() => removerBanner(b.id)}
                        className="text-red-400 hover:text-red-300 px-2 py-1"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SOLICITAÇÕES PENDENTES DO CLUBE */}
              <div className="bg-neutral-900 border border-yellow-500/30 p-5 rounded-2xl space-y-4">
                <h2 className="text-sm font-bold text-yellow-400 uppercase flex items-center justify-between">
                  <span>⏳ Solicitações Pendentes do Clube</span>
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                    {listaMembrosClube.filter((m) => m.status === "Pendente").length}
                  </span>
                </h2>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  O cliente só passa a usufruir dos benefícios do plano após você confirmar o pagamento abaixo.
                </p>

                <div className="space-y-2">
                  {listaMembrosClube.filter((m) => m.status === "Pendente").length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">Nenhuma solicitação pendente.</p>
                  ) : (
                    listaMembrosClube
                      .filter((m) => m.status === "Pendente")
                      .map((membro) => (
                        <div
                          key={membro.id}
                          className="p-3 bg-neutral-950 rounded-xl border border-yellow-500/20 text-xs space-y-3"
                        >
                          <div>
                            <h4 className="font-bold text-white">{membro.nome}</h4>
                            <p className="text-[10px] text-neutral-400">
                              Plano solicitado: <span className="text-amber-400 font-bold">{membro.plano}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => ativarMembro(membro.id)}
                            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition"
                          >
                            Confirmar Pagamento / Ativar Membro
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* GERENCIAR MEMBROS DO CLUBE */}
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-sm font-bold text-amber-500 uppercase">💎 Gerenciar Membros do Clube</h2>

                <div className="space-y-2">
                  {listaMembrosClube.filter((m) => m.status !== "Pendente").length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">Nenhum membro ativo no momento.</p>
                  ) : null}
                  {listaMembrosClube
                    .filter((m) => m.status !== "Pendente")
                    .map((membro) => (
                    <div
                      key={membro.id}
                      className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-white">{membro.nome}</h4>
                        <p className="text-[10px] text-neutral-400">
                          Plano {membro.plano} • Status:{" "}
                          <span className={membro.status === "Ativo" ? "text-green-400" : "text-red-400"}>
                            {membro.status}
                          </span>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setListaMembrosClube(
                            listaMembrosClube.map((m) =>
                              m.id === membro.id
                                ? {
                                    ...m,
                                    status: m.status === "Ativo" ? "Suspenso" : "Ativo",
                                  }
                                : m,
                            ),
                          )
                        }}
                        className="px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-[10px]"
                      >
                        {membro.status === "Ativo" ? "Suspender" : "Ativar"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
