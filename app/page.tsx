"use client"

import React, { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"

// ============================================
// TIPOS
// ============================================
interface ClienteClube {
  id: string
  nome: string
  plano: "Bronze" | "Prata" | "Ouro" | "Diamante"
  status: "Ativo" | "Pendente"
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
  duracao: number
  valor: number
  pagamento: "Pagar no Local" | "PIX" | "Clube Hiroschi"
  eClube: boolean
  planoClube?: string
  eEncaixe?: boolean
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

interface Servico {
  id: string
  nome: string
  preco: number
  duracao: number
  foto: string
  longo?: boolean
}

interface HorarioDia {
  dia: string
  aberto: boolean
  abertura: string
  fechamento: string
}

interface ExcecaoHorario {
  data: string
  abertura: string
  fechamento: string
  aberto: boolean
}

interface ClienteCadastro {
  id: string
  nome: string
  apelido: string
  telefone: string
  nascimento: string
}

// ============================================
// CONSTANTES
// ============================================
const NUMERO_WHATSAPP_BARBEARIA = "5511999998888"
const SENHA_ADMIN = "77186800"
const PLANOS = [
  { nome: "Bronze" as const, preco: "R$ 49,90/mês", descricao: "2 cortes por mês" },
  { nome: "Prata" as const, preco: "R$ 79,90/mês", descricao: "2 cortes + barba" },
  { nome: "Ouro" as const, preco: "R$ 99,90/mês", descricao: "4 cortes por mês" },
  { nome: "Diamante" as const, preco: "R$ 169,90/mês", descricao: "4 cortes + barba" },
]
const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export default function BarbeariaHiroschi() {
  // ------------------------------------------
  // AUTENTICAÇÃO / NAVEGAÇÃO
  // ------------------------------------------
  const [estaLogado, setEstaLogado] = useState(false)
  const [eAdmin, setEAdmin] = useState(false)
  const [whatsapp, setWhatsapp] = useState("")
  const [telaAtual, setTelaAtual] = useState<
    "inicial" | "agendamento" | "meus_agendamentos" | "clube" | "produtos" | "painel"
  >("inicial")

  // Login administrativo
  const [mostrarFormAdmin, setMostrarFormAdmin] = useState(false)
  const [senhaAdmin, setSenhaAdmin] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erroSenhaAdmin, setErroSenhaAdmin] = useState("")

  // Abas do painel
  const [abaAdmin, setAbaAdmin] = useState<
    "caixa" | "agenda" | "servicos" | "horarios" | "clientes" | "clube" | "banners"
  >("caixa")

  // ------------------------------------------
  // BANNERS
  // ------------------------------------------
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
  const [novoBannerUrl, setNovoBannerUrl] = useState("")
  const [novoBannerTitulo, setNovoBannerTitulo] = useState("")
  const [novoBannerArquivo, setNovoBannerArquivo] = useState("")

  // ------------------------------------------
  // CLUBE (cliente logado)
  // ------------------------------------------
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
    { id: "user_3", nome: "Rafael Souza", plano: "Ouro", status: "Pendente", inicio: "-", proximaCobranca: "-" },
  ])

  // ------------------------------------------
  // AGENDAMENTO
  // ------------------------------------------
  const [diaSelecionado, setDiaSelecionado] = useState("")
  const [dataSelecionada, setDataSelecionada] = useState("")
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
  const [horarioSelecionado, setHorarioSelecionado] = useState("")
  const [formaPagamento, setFormaPagamento] = useState<"Pagar no Local" | "PIX" | "">("")
  const [erroAgendamento, setErroAgendamento] = useState("")
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([
    {
      id: "1",
      clienteNome: "Tiago Antônio",
      servico: "Corte de Cabelo",
      dia: "Quarta",
      horario: "14:00",
      duracao: 30,
      valor: 35,
      pagamento: "Clube Hiroschi",
      eClube: true,
      planoClube: "Diamante",
    },
    {
      id: "2",
      clienteNome: "João Silva",
      servico: "Corte + Barba",
      dia: "Sábado",
      horario: "10:00",
      duracao: 45,
      valor: 60,
      pagamento: "Pagar no Local",
      eClube: false,
    },
  ])

  // ------------------------------------------
  // PRODUTOS
  // ------------------------------------------
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

  // ------------------------------------------
  // SERVIÇOS (CRUD)
  // ------------------------------------------
  const [servicos, setServicos] = useState<Servico[]>([
    { id: "s1", nome: "Corte de Cabelo", preco: 35, duracao: 30, foto: "" },
    { id: "s2", nome: "Barba Completa", preco: 30, duracao: 20, foto: "" },
    { id: "s3", nome: "Corte + Barba", preco: 60, duracao: 45, foto: "" },
    { id: "s4", nome: "Sobrancelha", preco: 15, duracao: 10, foto: "" },
    { id: "s5", nome: "Reflexo", preco: 120, duracao: 120, foto: "", longo: true },
    { id: "s6", nome: "Descoloração", preco: 150, duracao: 150, foto: "", longo: true },
  ])
  const [servicoEditandoId, setServicoEditandoId] = useState<string | null>(null)
  const [servicoNome, setServicoNome] = useState("")
  const [servicoPreco, setServicoPreco] = useState("")
  const [servicoDuracao, setServicoDuracao] = useState("")
  const [servicoFoto, setServicoFoto] = useState("")
  const [servicoLongo, setServicoLongo] = useState(false)

  // ------------------------------------------
  // HORÁRIOS DE FUNCIONAMENTO
  // ------------------------------------------
  const [horarios, setHorarios] = useState<HorarioDia[]>([
    { dia: "Domingo", aberto: false, abertura: "09:00", fechamento: "19:00" },
    { dia: "Segunda", aberto: false, abertura: "09:00", fechamento: "19:00" },
    { dia: "Terça", aberto: true, abertura: "09:00", fechamento: "19:00" },
    { dia: "Quarta", aberto: true, abertura: "09:00", fechamento: "19:00" },
    { dia: "Quinta", aberto: true, abertura: "09:00", fechamento: "19:00" },
    { dia: "Sexta", aberto: true, abertura: "09:00", fechamento: "19:00" },
    { dia: "Sábado", aberto: true, abertura: "09:00", fechamento: "19:00" },
  ])
  const [excecoesHorario, setExcecoesHorario] = useState<ExcecaoHorario[]>([])
  const [novaExcecaoData, setNovaExcecaoData] = useState("")
  const [novaExcecaoAbertura, setNovaExcecaoAbertura] = useState("08:00")
  const [novaExcecaoFechamento, setNovaExcecaoFechamento] = useState("20:00")
  const [novaExcecaoAberta, setNovaExcecaoAberta] = useState(true)

  // ------------------------------------------
  // CLIENTES
  // ------------------------------------------
  const [clientesCadastrados] = useState<ClienteCadastro[]>([
    { id: "cl1", nome: "Tiago Antônio", apelido: "Tiaguinho", telefone: "11999998888", nascimento: "15/03/1990" },
    { id: "cl2", nome: "João Silva", apelido: "João", telefone: "11988887777", nascimento: "22/07/1985" },
    { id: "cl3", nome: "Maria Oliveira", apelido: "Mari", telefone: "11977776666", nascimento: "05/12/1995" },
    { id: "cl4", nome: "Carlos Eduardo", apelido: "Cadu", telefone: "11966665555", nascimento: "30/01/1988" },
  ])
  const [buscaCliente, setBuscaCliente] = useState("")

  // ------------------------------------------
  // ENCAIXE MANUAL
  // ------------------------------------------
  const [encaixeCliente, setEncaixeCliente] = useState("")
  const [encaixeServico, setEncaixeServico] = useState("")
  const [encaixeDia, setEncaixeDia] = useState("Terça")
  const [encaixeHorario, setEncaixeHorario] = useState("")

  // ------------------------------------------
  // CAIXA
  // ------------------------------------------
  const [historicoCaixa, setHistoricoCaixa] = useState<MovimentacaoCaixa[]>([
    {
      id: "c1",
      cliente: "João Silva",
      servico: "Corte + Barba",
      valorBruto: 60,
      desconto: 0,
      valorPago: 60,
      metodo: "PIX",
      eClube: false,
      data: new Date().toISOString().slice(0, 10),
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
      data: new Date().toISOString().slice(0, 10),
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
      data: new Date().toISOString().slice(0, 10),
    },
  ])
  const [caixaCliente, setCaixaCliente] = useState("")
  const [caixaServico, setCaixaServico] = useState("")
  const [caixaValor, setCaixaValor] = useState("")
  const [caixaMetodo, setCaixaMetodo] = useState<MovimentacaoCaixa["metodo"]>("PIX")
  const [caixaDataSelecionada, setCaixaDataSelecionada] = useState(() => new Date().toISOString().slice(0, 10))

  // ============================================
  // CARROSSEL AUTOMÁTICO
  // ============================================
  useEffect(() => {
    if (fotosBanners.length === 0 || !estaLogado || telaAtual !== "inicial") return
    const interval = setInterval(() => {
      setFotoAtualIndex((prev) => (prev + 1) % fotosBanners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [fotosBanners, estaLogado, telaAtual])

  // ============================================
  // HELPERS DE HORÁRIO
  // ============================================
  const horaParaMinutos = (hora: string) => {
    const [h, m] = hora.split(":").map(Number)
    return h * 60 + m
  }
  const minutosParaHora = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`

  const hojeISO = new Date().toISOString().slice(0, 10)
  const nomeDiaHoje = DIAS_SEMANA[new Date().getDay()]
  const obterDiaDaData = (data: string) => {
    if (!data) return ""
    const [ano, mes, dia] = data.split("-").map(Number)
    return DIAS_SEMANA[new Date(ano, mes - 1, dia).getDay()]
  }

  const duracaoTotalSelecionada = servicosSelecionados.reduce(
    (acc, id) => acc + (servicos.find((s) => s.id === id)?.duracao || 0),
    0,
  )
  const precoTotalSelecionado = servicosSelecionados.reduce(
    (acc, id) => acc + (servicos.find((s) => s.id === id)?.preco || 0),
    0,
  )
  const temServicoLongoSelecionado = servicosSelecionados.some((id) => servicos.find((s) => s.id === id)?.longo)

  // Gera horários livres: antecedência mínima de 3 horas no mesmo dia.
  const gerarHorariosDisponiveis = (dia: string, duracao: number, ignorarTravas = false) => {
    const excecao = excecoesHorario.find((e) => e.data === dataSelecionada)
    const configBase = horarios.find((h) => h.dia === dia)
    const config = excecao
      ? { dia, aberto: excecao.aberto, abertura: excecao.abertura, fechamento: excecao.fechamento }
      : configBase
    if (!config || !config.aberto || duracao <= 0) return []

    const inicio = horaParaMinutos(config.abertura)
    const fim = horaParaMinutos(config.fechamento)
    const ocupados = agendamentos.filter((a) => a.dia === dia)
    const slots: string[] = []

    const agora = new Date()
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes()
    const ehHoje = dia === nomeDiaHoje

    for (let t = inicio; t + duracao <= fim; t += 15) {
      // Conflito com agendamentos existentes (o próximo horário só abre após o término do anterior)
      const conflito = ocupados.some((a) => {
        const aInicio = horaParaMinutos(a.horario)
        const aFim = aInicio + (a.duracao || 30)
        return t < aFim && t + duracao > aInicio
      })
      if (conflito) continue

      if (!ignorarTravas) {
        // Trava de 6 horas para agendamentos no mesmo dia
        if (ehHoje && t < minutosAgora + 180) continue
        // Trava de serviço longo (Reflexo / Descoloração): só até 16:00
        if (temServicoLongoSelecionado && t >= 16 * 60) continue
      }
      slots.push(minutosParaHora(t))
    }
    return slots
  }

  // ============================================
  // AUTENTICAÇÃO
  // ============================================
  const lidarComLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (whatsapp.trim().length >= 8) {
      setEstaLogado(true)
      setEAdmin(false)
      const membro = listaMembrosClube.find((m) => m.id === `user_${whatsapp}`)
      setUsuarioClube(membro || null)
      setTelaAtual("inicial")
    }
  }

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

  const sair = () => {
    setEstaLogado(false)
    setEAdmin(false)
    setWhatsapp("")
    setUsuarioClube(null)
    setTelaAtual("inicial")
  }

  const formatarData = (data: Date) =>
    data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

  // ============================================
  // CLUBE — ASSINATURA E APROVAÇÃO MANUAL
  // ============================================
  const solicitarAssinatura = (plano: ClienteClube["plano"]) => {
    const idCliente = `user_${whatsapp || "atual"}`
    const solicitacao: ClienteClube = {
      id: idCliente,
      nome: whatsapp ? `Cliente ${whatsapp}` : "Cliente WhatsApp",
      plano,
      status: "Pendente",
      inicio: "-",
      proximaCobranca: "-",
    }
    setListaMembrosClube((prev) => {
      const existe = prev.some((m) => m.id === idCliente)
      return existe ? prev.map((m) => (m.id === idCliente ? solicitacao : m)) : [...prev, solicitacao]
    })
    setUsuarioClube(solicitacao)
    const msg = encodeURIComponent(
      `Olá! Quero assinar o Plano ${plano} do Clube Hiroschi. Meu WhatsApp: ${whatsapp || "(informar)"}.`,
    )
    window.open(`https://wa.me/${NUMERO_WHATSAPP_BARBEARIA}?text=${msg}`, "_blank")
  }

  const ativarMembro = (id: string) => {
    const hoje = new Date()
    const proxima = new Date()
    proxima.setMonth(proxima.getMonth() + 1)
    const atualizar = (m: ClienteClube): ClienteClube =>
      m.id === id
        ? { ...m, status: "Ativo", inicio: formatarData(hoje), proximaCobranca: formatarData(proxima) }
        : m
    setListaMembrosClube((prev) => prev.map(atualizar))
    setUsuarioClube((prev) => (prev && prev.id === id ? atualizar(prev) : prev))
  }

  // ============================================
  // AGENDAMENTO — CLIENTE
  // ============================================
  const clubeAtivo = !!(usuarioClube && usuarioClube.status === "Ativo")

  const alternarServicoSelecionado = (id: string) => {
    setHorarioSelecionado("")
    setFormaPagamento("")
    setServicosSelecionados((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const lidarComSelecaoDeDia = (dia: string) => {
    setDiaSelecionado(dia)
    setHorarioSelecionado("")
    setFormaPagamento("")
    setErroAgendamento("")
    if (clubeAtivo && (dia === "Sexta" || dia === "Sábado")) {
      setErroAgendamento(
        "Nas sextas e sábados o Clube Hiroschi não cobre o atendimento. Você pode agendar, mas será cobrado por fora como cliente avulso.",
      )
    }
  }

  // Nesse dia o atendimento é isento pelo clube? (Membro ativo + Terça a Quinta)
  const isentoPeloClube = clubeAtivo && ["Terça", "Quarta", "Quinta"].includes(diaSelecionado)

  const confirmarAgendamento = () => {
    if (servicosSelecionados.length === 0) return alert("Selecione ao menos um serviço.")
    if (!diaSelecionado) return alert("Selecione um dia.")
    if (!horarioSelecionado) return alert("Selecione um horário disponível.")
    if (!isentoPeloClube && !formaPagamento) return alert("Escolha a forma de pagamento.")

    const nomesServicos = servicosSelecionados
      .map((id) => servicos.find((s) => s.id === id)?.nome)
      .filter(Boolean)
      .join(" + ")

    const nomeCliente = whatsapp ? `Cliente ${whatsapp}` : "Cliente WhatsApp"
    const pagamento: Agendamento["pagamento"] = isentoPeloClube
      ? "Clube Hiroschi"
      : formaPagamento === "PIX"
        ? "PIX"
        : "Pagar no Local"

    const novo: Agendamento = {
      id: Date.now().toString(),
      clienteNome: nomeCliente,
      servico: nomesServicos,
      dia: diaSelecionado,
      horario: horarioSelecionado,
      duracao: duracaoTotalSelecionada,
      valor: isentoPeloClube ? 0 : precoTotalSelecionado,
      pagamento,
      eClube: isentoPeloClube,
      planoClube: usuarioClube?.plano,
    }
    setAgendamentos((prev) => [...prev, novo])

    // Resumo para o WhatsApp do barbeiro
    const resumo = encodeURIComponent(
      `*Novo Agendamento - Barbearia Hiroschi*\n` +
        `Cliente: ${nomeCliente}\n` +
        `Dia: ${diaSelecionado}\n` +
        `Horário: ${horarioSelecionado}\n` +
        `Serviços: ${nomesServicos}\n` +
        `Duração: ${duracaoTotalSelecionada} min\n` +
        `Valor: ${isentoPeloClube ? "Isento (Clube Hiroschi)" : `R$ ${precoTotalSelecionado.toFixed(2)}`}\n` +
        `Pagamento: ${pagamento}`,
    )
    window.open(`https://wa.me/${NUMERO_WHATSAPP_BARBEARIA}?text=${resumo}`, "_blank")

    alert("Agendamento efetuado com sucesso!")
    setServicosSelecionados([])
    setDiaSelecionado("")
    setHorarioSelecionado("")
    setFormaPagamento("")
    setTelaAtual("meus_agendamentos")
  }

  // ============================================
  // SERVIÇOS (CRUD)
  // ============================================
  const lidarComUploadFotoServico = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => setServicoFoto(leitor.result as string)
    leitor.readAsDataURL(arquivo)
  }
  const limparFormServico = () => {
    setServicoEditandoId(null)
    setServicoNome("")
    setServicoPreco("")
    setServicoDuracao("")
    setServicoFoto("")
    setServicoLongo(false)
  }
  const salvarServico = (e: React.FormEvent) => {
    e.preventDefault()
    const preco = Number.parseFloat(servicoPreco) || 0
    const duracao = Number.parseInt(servicoDuracao) || 0
    if (!servicoNome || duracao <= 0) return
    if (servicoEditandoId) {
      setServicos((prev) =>
        prev.map((s) =>
          s.id === servicoEditandoId
            ? { ...s, nome: servicoNome, preco, duracao, foto: servicoFoto, longo: servicoLongo }
            : s,
        ),
      )
    } else {
      setServicos((prev) => [
        ...prev,
        { id: Date.now().toString(), nome: servicoNome, preco, duracao, foto: servicoFoto, longo: servicoLongo },
      ])
    }
    limparFormServico()
  }
  const editarServico = (s: Servico) => {
    setServicoEditandoId(s.id)
    setServicoNome(s.nome)
    setServicoPreco(String(s.preco))
    setServicoDuracao(String(s.duracao))
    setServicoFoto(s.foto)
    setServicoLongo(!!s.longo)
  }
  const excluirServico = (id: string) => {
    setServicos((prev) => prev.filter((s) => s.id !== id))
    if (servicoEditandoId === id) limparFormServico()
  }

  // ============================================
  // HORÁRIOS
  // ============================================
  const alternarDiaAberto = (dia: string) =>
    setHorarios((prev) => prev.map((h) => (h.dia === dia ? { ...h, aberto: !h.aberto } : h)))
  const atualizarHorarioDia = (dia: string, campo: "abertura" | "fechamento", valor: string) =>
    setHorarios((prev) => prev.map((h) => (h.dia === dia ? { ...h, [campo]: valor } : h)))

  const salvarExcecaoHorario = (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaExcecaoData) return
    setExcecoesHorario((prev) => [
      ...prev.filter((item) => item.data !== novaExcecaoData),
      { data: novaExcecaoData, abertura: novaExcecaoAbertura, fechamento: novaExcecaoFechamento, aberto: novaExcecaoAberta },
    ].sort((a, b) => a.data.localeCompare(b.data)))
    setNovaExcecaoData("")
  }

  const removerExcecaoHorario = (data: string) =>
    setExcecoesHorario((prev) => prev.filter((item) => item.data !== data))

  // ============================================
  // CLIENTES
  // ============================================
  const clientesFiltrados = clientesCadastrados.filter((c) => {
    const termo = buscaCliente.trim().toLowerCase()
    if (!termo) return true
    return c.nome.toLowerCase().includes(termo) || c.apelido.toLowerCase().includes(termo)
  })
  const abrirWhatsappCliente = (telefone: string, nome: string) => {
    const numero = telefone.replace(/\D/g, "")
    const completo = numero.startsWith("55") ? numero : `55${numero}`
    const msg = encodeURIComponent(`Olá ${nome.split(" ")[0]}, aqui é da Barbearia Hiroschi! `)
    window.open(`https://wa.me/${completo}?text=${msg}`, "_blank")
  }

  // ============================================
  // ENCAIXE (ignora trava de 6h)
  // ============================================
  const criarEncaixe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!encaixeCliente || !encaixeHorario) return alert("Informe o cliente e o horário do encaixe.")
    const info = servicos.find((s) => s.id === encaixeServico)
    setAgendamentos((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        clienteNome: encaixeCliente,
        servico: info ? info.nome : "Encaixe",
        dia: encaixeDia,
        horario: encaixeHorario,
        duracao: info ? info.duracao : 30,
        valor: info ? info.preco : 0,
        pagamento: "Pagar no Local",
        eClube: false,
        eEncaixe: true,
      },
    ])
    setEncaixeCliente("")
    setEncaixeServico("")
    setEncaixeHorario("")
    alert("Encaixe adicionado à agenda!")
  }

  // ============================================
  // CAIXA
  // ============================================
  const registrarCaixa = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = Number.parseFloat(caixaValor) || 0
    if (!caixaCliente || !caixaServico) return
    const eClube = caixaMetodo === "Clube Hiroschi"
    setHistoricoCaixa((prev) => [
      {
        id: Date.now().toString(),
        cliente: caixaCliente,
        servico: caixaServico,
        valorBruto: valor,
        desconto: eClube ? valor : 0,
        valorPago: eClube ? 0 : valor,
        metodo: caixaMetodo,
        eClube,
        data: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ])
    setCaixaCliente("")
    setCaixaServico("")
    setCaixaValor("")
    setCaixaMetodo("PIX")
  }

  const dataHoje = new Date()
  const paraDataLocal = (valor: string) => {
    if (valor === "Hoje") return hojeISO
    return valor
  }
  const dataCaixaSelecionada = new Date(`${caixaDataSelecionada}T12:00:00`)
  const inicioSemana = new Date(dataCaixaSelecionada)
  inicioSemana.setDate(dataCaixaSelecionada.getDate() - 6)
  const mesmoDia = (data: string, alvo: Date) => paraDataLocal(data) === alvo.toISOString().slice(0, 10)
  const dentroDoPeriodo = (data: string, inicio: Date, fim: Date) => {
    const valor = new Date(`${paraDataLocal(data)}T12:00:00`).getTime()
    return valor >= inicio.getTime() && valor <= fim.getTime()
  }
  const caixaDoDia = historicoCaixa.filter((m) => mesmoDia(m.data, dataCaixaSelecionada))
  const caixaSemana = historicoCaixa.filter((m) => dentroDoPeriodo(m.data, inicioSemana, dataCaixaSelecionada))
  const inicioMes = new Date(dataCaixaSelecionada.getFullYear(), dataCaixaSelecionada.getMonth(), 1, 12)
  const caixaMes = historicoCaixa.filter((m) => dentroDoPeriodo(m.data, inicioMes, dataCaixaSelecionada))
  const resumirCaixa = (lancamentos: MovimentacaoCaixa[]) => ({
    PIX: lancamentos.filter((m) => m.metodo === "PIX").reduce((a, m) => a + m.valorPago, 0),
    Cartão: lancamentos.filter((m) => m.metodo === "Cartão").reduce((a, m) => a + m.valorPago, 0),
    Dinheiro: lancamentos.filter((m) => m.metodo === "Dinheiro").reduce((a, m) => a + m.valorPago, 0),
  })
  const resumoDia = resumirCaixa(caixaDoDia)
  const resumoSemana = resumirCaixa(caixaSemana)
  const resumoMes = resumirCaixa(caixaMes)
  const faturamentoReal = resumoDia.PIX + resumoDia.Cartão + resumoDia.Dinheiro
  const cobertoClube = caixaDoDia.filter((m) => m.eClube).reduce((a, m) => a + m.valorBruto, 0)

  // ============================================
  // BANNERS
  // ============================================
  const lidarComUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => setNovoBannerArquivo(leitor.result as string)
    leitor.readAsDataURL(arquivo)
  }
  const adicionarBanner = (e: React.FormEvent) => {
    e.preventDefault()
    const fonte = novoBannerArquivo || novoBannerUrl
    if (!fonte || !novoBannerTitulo) return
    setFotosBanners((prev) => [
      ...prev,
      { id: Date.now().toString(), url: fonte, titulo: novoBannerTitulo, ordem: prev.length + 1 },
    ])
    setNovoBannerUrl("")
    setNovoBannerTitulo("")
    setNovoBannerArquivo("")
  }
  const removerBanner = (id: string) => setFotosBanners((prev) => prev.filter((b) => b.id !== id))

  // ============================================
  // RENDER — LOGIN
  // ============================================
  if (!estaLogado) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-amber-500">Barbearia Hiroschi</h1>
            <p className="text-sm text-neutral-400">Agendamento & Clube Hiroschi</p>
          </div>

          <form onSubmit={lidarComLogin} className="space-y-3 text-left">
            <label className="text-xs font-semibold text-neutral-400 block">Número do WhatsApp</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="(00) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-xl focus:outline-none focus:border-amber-500 text-white placeholder-neutral-600 transition"
              required
            />
            <button
              type="submit"
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl uppercase tracking-wider transition"
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
                <label className="text-xs font-semibold text-neutral-400 block">Senha do Proprietário</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Digite a senha"
                    value={senhaAdmin}
                    onChange={(e) => {
                      setSenhaAdmin(e.target.value)
                      setErroSenhaAdmin("")
                    }}
                    className="w-full p-3 pr-12 bg-neutral-900 border border-neutral-800 rounded-xl focus:outline-none focus:border-amber-500 text-white placeholder-neutral-600 transition"
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
    )
  }

  // ============================================
  // RENDER — APP LOGADO
  // ============================================
  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      <header className="sticky top-0 z-20 bg-neutral-950/90 backdrop-blur border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-black text-amber-500">Barbearia Hiroschi</h1>
        <button onClick={sair} className="text-xs text-neutral-400 hover:text-white transition">
          Sair
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* ============ CLIENTE ============ */}
        {!eAdmin && (
          <div className="space-y-6">
            {/* INÍCIO */}
            {telaAtual === "inicial" && (
              <div className="space-y-6">
                <div className="relative h-52 rounded-2xl overflow-hidden border border-neutral-800">
                  {fotosBanners.map((b, i) => (
                    <div
                      key={b.id}
                      className={`absolute inset-0 transition-opacity duration-700 ${
                        i === fotoAtualIndex ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <img
                        src={b.url || "/placeholder.svg"}
                        alt={b.titulo}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-sm font-bold text-white">{b.titulo}</span>
                    </div>
                  ))}
                  <div className="absolute bottom-3 right-4 flex gap-1.5">
                    {fotosBanners.map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${i === fotoAtualIndex ? "bg-amber-500" : "bg-white/40"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm text-neutral-400">Bem-vindo,</p>
                  <p className="text-lg font-bold">{whatsapp}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTelaAtual("agendamento")}
                    className="p-5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-2xl transition"
                  >
                    Agendar Horário
                  </button>
                  <button
                    onClick={() => setTelaAtual("meus_agendamentos")}
                    className="p-5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl font-semibold transition"
                  >
                    Meus Agendamentos
                  </button>
                  <button
                    onClick={() => setTelaAtual("clube")}
                    className="p-5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl font-semibold transition"
                  >
                    Clube Hiroschi
                  </button>
                  <button
                    onClick={() => setTelaAtual("produtos")}
                    className="p-5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl font-semibold transition"
                  >
                    Produtos
                  </button>
                </div>
              </div>
            )}

            {/* AGENDAMENTO */}
            {telaAtual === "agendamento" && (
              <div className="space-y-5">
                <button onClick={() => setTelaAtual("inicial")} className="text-xs text-neutral-400 hover:text-white">
                  ← Voltar
                </button>
                <h2 className="text-xl font-black">Agendar Horário</h2>

                {/* SERVIÇOS */}
                <div className="space-y-2">
                  <label className="text-xs text-neutral-400">Serviços (selecione um ou mais)</label>
                  {servicos.map((s) => {
                    const marcado = servicosSelecionados.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => alternarServicoSelecionado(s.id)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                          marcado ? "bg-amber-500/10 border-amber-500" : "bg-neutral-900 border-neutral-800"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] font-black ${
                              marcado ? "bg-amber-500 border-amber-500 text-black" : "border-neutral-600 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span>
                            <span className="block text-sm font-medium text-white">
                              {s.nome}
                              {s.longo && (
                                <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase">
                                  até 16h
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-neutral-400">{s.duracao} min</span>
                          </span>
                        </span>
                        <span className="text-sm font-bold text-amber-500">R$ {s.preco.toFixed(2)}</span>
                      </button>
                    )
                  })}
                  {servicosSelecionados.length > 0 && (
                    <div className="flex justify-between text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                      <span>
                        Duração: <strong className="text-amber-400">{duracaoTotalSelecionada} min</strong>
                      </span>
                      <span>
                        Total: <strong className="text-amber-400">R$ {precoTotalSelecionado.toFixed(2)}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* CALENDÁRIO EXTENSO */}
                <div className="space-y-2">
                  <label htmlFor="data-agendamento" className="text-xs text-neutral-400">
                    Escolha a data (incluindo meses futuros)
                  </label>
                  <input
                    id="data-agendamento"
                    type="date"
                    min={hojeISO}
                    value={dataSelecionada}
                    onChange={(e) => {
                      const data = e.target.value
                      const dia = obterDiaDaData(data)
                      setDataSelecionada(data)
                      setDiaSelecionado(dia)
                      setHorarioSelecionado("")
                      setFormaPagamento("")
                      setErroAgendamento("")
                      if (clubeAtivo && (dia === "Sexta" || dia === "Sábado")) {
                        setErroAgendamento("Nas sextas e sábados o Clube Hiroschi não cobre o atendimento; o valor será cobrado à parte.")
                      }
                    }}
                    className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white"
                  />
                  {dataSelecionada && (
                    <p className="text-xs text-amber-400">{obterDiaDaData(dataSelecionada)} — data selecionada</p>
                  )}
                </div>

                {erroAgendamento && (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl text-amber-300 text-xs leading-relaxed">
                    ⚠️ {erroAgendamento}
                  </div>
                )}

                {isentoPeloClube && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs">
                    💎 Membro do Clube ({usuarioClube?.plano}) — atendimento isento de terça a quinta!
                  </div>
                )}

                {/* HORÁRIOS */}
                {diaSelecionado && servicosSelecionados.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400">Horários disponíveis</label>
                    {gerarHorariosDisponiveis(diaSelecionado, duracaoTotalSelecionada).length === 0 ? (
                      <p className="text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                        Não há horários livres para essa duração neste dia.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {gerarHorariosDisponiveis(diaSelecionado, duracaoTotalSelecionada).map((hora) => (
                          <button
                            key={hora}
                            onClick={() => {
                              setHorarioSelecionado(hora)
                              setFormaPagamento("")
                            }}
                            className={`py-2 rounded-lg border text-xs font-medium transition ${
                              horarioSelecionado === hora
                                ? "bg-amber-500 border-amber-500 text-black font-bold"
                                : "bg-neutral-900 border-neutral-800 text-neutral-300"
                            }`}
                          >
                            {hora}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PAGAMENTO (cliente avulso / não isento) */}
                {horarioSelecionado && !isentoPeloClube && (
                  <div className="space-y-2">
                    <label className="text-xs text-neutral-400">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["Pagar no Local", "PIX"] as const).map((op) => (
                        <button
                          key={op}
                          onClick={() => setFormaPagamento(op)}
                          className={`p-3 rounded-xl border text-sm font-medium transition ${
                            formaPagamento === op
                              ? "bg-amber-500 border-amber-500 text-black font-bold"
                              : "bg-neutral-900 border-neutral-800 text-neutral-300"
                          }`}
                        >
                          {op === "PIX" ? "Pagar via PIX Agora" : "Pagar no Local"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={confirmarAgendamento}
                  disabled={
                    servicosSelecionados.length === 0 ||
                    !diaSelecionado ||
                    !horarioSelecionado ||
                    (!isentoPeloClube && !formaPagamento)
                  }
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl uppercase tracking-wider transition"
                >
                  Confirmar Agendamento
                </button>
              </div>
            )}

            {/* MEUS AGENDAMENTOS */}
            {telaAtual === "meus_agendamentos" && (
              <div className="space-y-4">
                <button onClick={() => setTelaAtual("inicial")} className="text-xs text-neutral-400 hover:text-white">
                  ← Voltar
                </button>
                <h2 className="text-xl font-black">Meus Agendamentos</h2>
                {agendamentos.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-8">Nenhum agendamento.</p>
                ) : (
                  agendamentos.map((a) => (
                    <div key={a.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white">{a.servico}</h4>
                          <p className="text-xs text-neutral-400">
                            {a.dia} às {a.horario} • {a.duracao} min
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">{a.pagamento}</p>
                        </div>
                        <span className="text-sm font-bold text-amber-500">
                          {a.eClube ? "Isento" : `R$ ${a.valor.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* CLUBE */}
            {telaAtual === "clube" && (
              <div className="space-y-5">
                <button onClick={() => setTelaAtual("inicial")} className="text-xs text-neutral-400 hover:text-white">
                  ← Voltar
                </button>
                <h2 className="text-xl font-black">Clube Hiroschi</h2>

                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
                  <h3 className="text-sm font-bold text-amber-500">Seu Status</h3>
                  {clubeAtivo ? (
                    <div className="mt-2 space-y-1 text-xs text-neutral-300">
                      <p>
                        Plano <strong className="text-white">{usuarioClube?.plano}</strong> — Ativo ✅
                      </p>
                      <p>Próxima cobrança: {usuarioClube?.proximaCobranca}</p>
                    </div>
                  ) : usuarioClube && usuarioClube.status === "Pendente" ? (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-1">
                      <p className="text-xs font-bold text-yellow-400">⏳ Solicitação em análise</p>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        Recebemos seu pedido do <strong>Plano {usuarioClube.plano}</strong>. Os benefícios serão
                        liberados assim que o proprietário confirmar o pagamento.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 mt-2">
                      Assine um plano para garantir seus cortes mensais e benefícios exclusivos.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {PLANOS.map((plano) => {
                    const ehSolicitado = usuarioClube?.plano === plano.nome
                    const pendente = ehSolicitado && usuarioClube?.status === "Pendente"
                    const ativo = ehSolicitado && usuarioClube?.status === "Ativo"
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
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs rounded-lg uppercase whitespace-nowrap transition"
                        >
                          {ativo ? "Ativo" : pendente ? "Pendente" : "Assinar"}
                        </button>
                      </div>
                    )
                  })}
                </div>

                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Membros ativos agendam de terça a quinta com isenção do plano. Sextas e sábados são cobrados por fora
                  como cliente avulso.
                </p>
              </div>
            )}

            {/* PRODUTOS */}
            {telaAtual === "produtos" && (
              <div className="space-y-4">
                <button onClick={() => setTelaAtual("inicial")} className="text-xs text-neutral-400 hover:text-white">
                  ← Voltar
                </button>
                <h2 className="text-xl font-black">Produtos</h2>
                <div className="grid grid-cols-2 gap-3">
                  {produtos.map((p) => (
                    <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                      <img
                        src={p.imagem || "/placeholder.svg"}
                        alt={p.nome}
                        crossOrigin="anonymous"
                        className="w-full h-28 object-cover"
                      />
                      <div className="p-3 space-y-1">
                        <h4 className="text-sm font-bold text-white">{p.nome}</h4>
                        <p className="text-[10px] text-neutral-400 leading-snug">{p.descricao}</p>
                        <span className="text-sm font-bold text-amber-500 block">R$ {p.preco.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ PAINEL ADMIN ============ */}
        {eAdmin && (
          <div className="space-y-6">
            {/* ABAS */}
            <nav className="grid grid-cols-4 gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-[10px] sm:text-xs">
              {(
                [
                  { id: "caixa", label: "Caixa" },
                  { id: "agenda", label: "Agenda" },
                  { id: "servicos", label: "Serviços" },
                  { id: "horarios", label: "Horários" },
                  { id: "clientes", label: "Clientes" },
                  { id: "clube", label: "Clube" },
                  { id: "banners", label: "Banners" },
                ] as { id: typeof abaAdmin; label: string }[]
              ).map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAdmin(aba.id)}
                  className={`py-2 rounded-lg transition text-center font-medium ${
                    abaAdmin === aba.id ? "bg-amber-500 text-black font-bold" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {aba.label}
                </button>
              ))}
            </nav>

            {/* ABA CAIXA */}
            {abaAdmin === "caixa" && (
              <>
                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
                  <h2 className="text-lg font-black text-amber-500 uppercase tracking-wide flex items-center justify-between">
                    <span>Caixa Inteligente</span>
                    <span className="text-xs text-neutral-400 font-normal">{caixaDataSelecionada}</span>
                  </h2>
                  <label className="block text-xs text-neutral-400">
                    Filtrar por data
                    <input
                      type="date"
                      value={caixaDataSelecionada}
                      onChange={(e) => setCaixaDataSelecionada(e.target.value)}
                      className="mt-1 w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                    />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { titulo: "Faturamento do Dia", resumo: resumoDia },
                      { titulo: "Resumo dos Últimos 7 Dias", resumo: resumoSemana },
                      { titulo: "Resumo Mensal", resumo: resumoMes },
                    ].map((periodo) => (
                      <div key={periodo.titulo} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                        <p className="text-[10px] text-amber-400 uppercase font-bold mb-2">{periodo.titulo}</p>
                        <div className="space-y-1 text-xs text-neutral-300">
                          <p className="flex justify-between"><span>PIX</span><strong>R$ {periodo.resumo.PIX.toFixed(2)}</strong></p>
                          <p className="flex justify-between"><span>Cartão</span><strong>R$ {periodo.resumo.Cartão.toFixed(2)}</strong></p>
                          <p className="flex justify-between"><span>Dinheiro</span><strong>R$ {periodo.resumo.Dinheiro.toFixed(2)}</strong></p>
                          <p className="flex justify-between border-t border-neutral-800 pt-1 mt-1 text-green-400"><span>Total</span><strong>R$ {(periodo.resumo.PIX + periodo.resumo.Cartão + periodo.resumo.Dinheiro).toFixed(2)}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/30 text-center">
                      <p className="text-[10px] text-green-400 uppercase">Faturamento do Dia</p>
                      <p className="text-base font-black text-green-400">R$ {faturamentoReal.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-center">
                      <p className="text-[10px] text-amber-400 uppercase">Coberto pelo Clube</p>
                      <p className="text-base font-black text-amber-400">R$ {cobertoClube.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                  <h2 className="text-sm font-bold text-amber-500 uppercase">Registrar Atendimento</h2>
                  <form onSubmit={registrarCaixa} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Cliente"
                      value={caixaCliente}
                      onChange={(e) => setCaixaCliente(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Serviço"
                      value={caixaServico}
                      onChange={(e) => setCaixaServico(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Valor (R$)"
                        value={caixaValor}
                        onChange={(e) => setCaixaValor(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      />
                      <select
                        value={caixaMetodo}
                        onChange={(e) => setCaixaMetodo(e.target.value as MovimentacaoCaixa["metodo"])}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      >
                        <option value="PIX">PIX</option>
                        <option value="Cartão">Cartão</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Clube Hiroschi">Clube Hiroschi</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg uppercase tracking-wider transition"
                    >
                      Confirmar Atendimento
                    </button>
                  </form>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
                  <h2 className="text-sm font-bold text-amber-500 uppercase">Movimentações de {caixaDataSelecionada}</h2>
                  {caixaDoDia.length === 0 && <p className="text-xs text-neutral-500">Nenhum lançamento nesta data.</p>}
                  {caixaDoDia.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="block font-bold text-white">{m.cliente}</span>
                        <span className="block text-[10px] text-neutral-400">
                          {m.servico} • {m.metodo}
                        </span>
                      </div>
                      <span className={`font-bold ${m.eClube ? "text-amber-400" : "text-green-400"}`}>
                        {m.eClube ? "Isento" : `R$ ${m.valorPago.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ABA AGENDA */}
            {abaAdmin === "agenda" && (
              <>
                <div className="bg-neutral-900 border border-amber-500/30 p-5 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold text-amber-500 uppercase">➕ Agendar Encaixe</h2>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    O encaixe é criado manualmente e ignora a trava de antecedência de 6 horas.
                  </p>
                  <form onSubmit={criarEncaixe} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nome do Cliente"
                      value={encaixeCliente}
                      onChange={(e) => setEncaixeCliente(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      required
                    />
                    <select
                      value={encaixeServico}
                      onChange={(e) => setEncaixeServico(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                    >
                      <option value="">Selecione o serviço</option>
                      {servicos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} • {s.duracao} min • R$ {s.preco.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={encaixeDia}
                        onChange={(e) => setEncaixeDia(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      >
                        {horarios.map((h) => (
                          <option key={h.dia} value={h.dia}>
                            {h.dia}
                          </option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={encaixeHorario}
                        onChange={(e) => setEncaixeHorario(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg uppercase tracking-wider transition"
                    >
                      Adicionar Encaixe
                    </button>
                  </form>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                  <h2 className="text-sm font-bold text-amber-500 uppercase">📅 Agenda de Atendimentos</h2>
                  {agendamentos.length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">Nenhum agendamento.</p>
                  ) : (
                    agendamentos.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-bold text-white flex items-center gap-2">
                            {a.clienteNome}
                            {a.eEncaixe && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                                Encaixe
                              </span>
                            )}
                            {a.eClube && (
                              <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                                Clube
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-neutral-400">
                            {a.servico} • {a.duracao} min
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-amber-400">{a.horario}</span>
                          <span className="block text-[10px] text-neutral-500">{a.dia}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ABA SERVIÇOS */}
            {abaAdmin === "servicos" && (
              <>
                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold text-amber-500 uppercase">
                    ✂️ {servicoEditandoId ? "Editar Serviço" : "Cadastrar Serviço"}
                  </h2>
                  <form onSubmit={salvarServico} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nome do serviço"
                      value={servicoNome}
                      onChange={(e) => setServicoNome(e.target.value)}
                      className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Preço (R$)"
                        value={servicoPreco}
                        onChange={(e) => setServicoPreco(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Duração (min)"
                        value={servicoDuracao}
                        onChange={(e) => setServicoDuracao(e.target.value)}
                        className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                        required
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={servicoLongo}
                        onChange={(e) => setServicoLongo(e.target.checked)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      Serviço longo (só pode ser agendado até 16:00)
                    </label>
                    <div>
                      <label className="text-[11px] text-neutral-400 mb-1 block">Foto do serviço (galeria)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={lidarComUploadFotoServico}
                        className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-black file:font-bold file:text-xs file:uppercase file:cursor-pointer bg-neutral-950 border border-neutral-800 rounded-lg p-1.5"
                      />
                    </div>
                    {servicoFoto && (
                      <img
                        src={servicoFoto || "/placeholder.svg"}
                        alt="Pré-visualização do serviço"
                        className="w-full h-28 object-cover rounded-lg border border-neutral-800"
                      />
                    )}
                    <div className="flex gap-2">
                      {servicoEditandoId && (
                        <button
                          type="button"
                          onClick={limparFormServico}
                          className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-lg uppercase transition"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg uppercase tracking-wider transition"
                      >
                        {servicoEditandoId ? "Salvar" : "Cadastrar"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                  <h2 className="text-sm font-bold text-amber-500 uppercase">Serviços Cadastrados</h2>
                  {servicos.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {s.foto ? (
                          <img src={s.foto || "/placeholder.svg"} alt={s.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">✂️</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-xs">
                          {s.nome}
                          {s.longo && <span className="ml-1 text-[9px] text-amber-400">(até 16h)</span>}
                        </h4>
                        <p className="text-[10px] text-neutral-400">
                          R$ {s.preco.toFixed(2)} • {s.duracao} min
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => editarServico(s)}
                          className="px-2 py-1 bg-neutral-800 text-neutral-200 rounded text-[10px] hover:bg-neutral-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => excluirServico(s.id)}
                          className="px-2 py-1 bg-red-950/60 text-red-400 rounded text-[10px] hover:bg-red-900/60"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ABA HORÁRIOS */}
            {abaAdmin === "horarios" && (
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                <h2 className="text-sm font-bold text-amber-500 uppercase">🕒 Horário de Funcionamento</h2>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Ative/desative dias e ajuste os horários de abertura e fechamento.
                </p>
                {horarios.map((h) => (
                  <div
                    key={h.dia}
                    className={`p-3 rounded-xl border space-y-2 ${
                      h.aberto ? "bg-neutral-950 border-neutral-800" : "bg-neutral-950/50 border-neutral-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${h.aberto ? "text-white" : "text-neutral-500"}`}>
                        {h.dia}
                      </span>
                      <button
                        onClick={() => alternarDiaAberto(h.dia)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                          h.aberto
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {h.aberto ? "Aberto" : "Fechado"}
                      </button>
                    </div>
                    {h.aberto && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-1">Abertura</label>
                          <input
                            type="time"
                            value={h.abertura}
                            onChange={(e) => atualizarHorarioDia(h.dia, "abertura", e.target.value)}
                            className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-1">Fechamento</label>
                          <input
                            type="time"
                            value={h.fechamento}
                            onChange={(e) => atualizarHorarioDia(h.dia, "fechamento", e.target.value)}
                            className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-5 pt-5 border-t border-neutral-800 space-y-3">
                  <h3 className="text-sm font-bold text-amber-400 uppercase">Exceções / Horários Especiais por Data</h3>
                  <p className="text-[11px] text-neutral-400">Defina horários diferentes para datas futuras, sem alterar a regra semanal.</p>
                  <form onSubmit={salvarExcecaoHorario} className="space-y-2">
                    <input type="date" min={hojeISO} value={novaExcecaoData} onChange={(e) => setNovaExcecaoData(e.target.value)} required className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white" />
                    <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={novaExcecaoAberta} onChange={(e) => setNovaExcecaoAberta(e.target.checked)} className="accent-amber-500" /> Dia aberto</label>
                    {novaExcecaoAberta && <div className="grid grid-cols-2 gap-2"><input type="time" value={novaExcecaoAbertura} onChange={(e) => setNovaExcecaoAbertura(e.target.value)} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white" /><input type="time" value={novaExcecaoFechamento} onChange={(e) => setNovaExcecaoFechamento(e.target.value)} className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white" /></div>}
                    <button type="submit" className="w-full py-2.5 bg-amber-500 text-black font-bold text-xs rounded-lg uppercase">Salvar exceção</button>
                  </form>
                  {excecoesHorario.map((excecao) => <div key={excecao.data} className="flex items-center justify-between gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs"><span>{new Date(`${excecao.data}T12:00:00`).toLocaleDateString("pt-BR")} — {excecao.aberto ? `${excecao.abertura} às ${excecao.fechamento}` : "Fechado"}</span><button type="button" onClick={() => removerExcecaoHorario(excecao.data)} className="text-red-400 hover:text-red-300">Remover</button></div>)}
                </div>
              </div>
            )}

            {/* ABA CLIENTES */}
            {abaAdmin === "clientes" && (
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                <h2 className="text-sm font-bold text-amber-500 uppercase">👥 Clientes</h2>
                <input
                  type="text"
                  placeholder="Buscar por nome ou apelido..."
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                />
                {clientesFiltrados.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-4">Nenhum cliente encontrado.</p>
                ) : (
                  clientesFiltrados.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">
                          {c.nome} <span className="text-neutral-500 font-normal">({c.apelido})</span>
                        </h4>
                        <p className="text-[10px] text-neutral-400">📞 {c.telefone}</p>
                        <p className="text-[10px] text-neutral-400">🎂 {c.nascimento}</p>
                      </div>
                      <button
                        onClick={() => abrirWhatsappCliente(c.telefone, c.nome)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] rounded-lg uppercase tracking-wider transition whitespace-nowrap flex-shrink-0"
                      >
                        WhatsApp
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA CLUBE */}
            {abaAdmin === "clube" && (
              <>
                <div className="bg-neutral-900 border border-yellow-500/30 p-5 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold text-yellow-400 uppercase flex items-center justify-between">
                    <span>⏳ Solicitações Pendentes</span>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                      {listaMembrosClube.filter((m) => m.status === "Pendente").length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    O cliente só usufrui dos benefícios após você confirmar o pagamento abaixo.
                  </p>
                  {listaMembrosClube.filter((m) => m.status === "Pendente").length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">Nenhuma solicitação pendente.</p>
                  ) : (
                    listaMembrosClube
                      .filter((m) => m.status === "Pendente")
                      .map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-neutral-950 rounded-xl border border-yellow-500/20 text-xs space-y-3"
                        >
                          <div>
                            <h4 className="font-bold text-white">{m.nome}</h4>
                            <p className="text-[10px] text-neutral-400">
                              Plano solicitado: <span className="text-amber-400 font-bold">{m.plano}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => ativarMembro(m.id)}
                            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition"
                          >
                            Confirmar Pagamento / Ativar Membro
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3">
                  <h2 className="text-sm font-bold text-amber-500 uppercase">💎 Membros Ativos</h2>
                  {listaMembrosClube.filter((m) => m.status === "Ativo").length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-4">Nenhum membro ativo.</p>
                  ) : (
                    listaMembrosClube
                      .filter((m) => m.status === "Ativo")
                      .map((m) => (
                        <div
                          key={m.id}
                          className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs flex justify-between items-center"
                        >
                          <div>
                            <h4 className="font-bold text-white">{m.nome}</h4>
                            <p className="text-[10px] text-neutral-400">
                              Plano {m.plano} • desde {m.inicio}
                            </p>
                          </div>
                          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full font-bold uppercase">
                            Ativo
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}

            {/* ABA BANNERS */}
            {abaAdmin === "banners" && (
              <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-sm font-bold text-amber-500 uppercase">📸 Banners da Tela Inicial</h2>
                <form onSubmit={adicionarBanner} className="space-y-2">
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
                        alt="Pré-visualização"
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
                    placeholder="Título / Legenda"
                    value={novoBannerTitulo}
                    onChange={(e) => setNovoBannerTitulo(e.target.value)}
                    className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-amber-500 text-black font-bold text-xs rounded-lg uppercase"
                  >
                    Adicionar Foto
                  </button>
                </form>

                <div className="space-y-2">
                  {fotosBanners.map((b) => (
                    <div
                      key={b.id}
                      className="p-2 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center gap-3"
                    >
                      <img
                        src={b.url || "/placeholder.svg"}
                        alt={b.titulo}
                        crossOrigin="anonymous"
                        className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                      <span className="flex-1 text-xs font-medium text-white">{b.titulo}</span>
                      <button
                        onClick={() => removerBanner(b.id)}
                        className="px-2 py-1 bg-red-950/60 text-red-400 rounded text-[10px] hover:bg-red-900/60"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
