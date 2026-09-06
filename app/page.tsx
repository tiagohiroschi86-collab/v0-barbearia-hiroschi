"use client"

import { useEffect, useState } from "react"

export default function BarbeariaHiroschi() {
 useEffect(() => {
   const loadFirebase = async () => {
     const { initializeApp } = await import("firebase/app")
     const {
       getFirestore,
       collection,
       addDoc,
       getDocs,
       updateDoc,
       query,
       where,
       deleteDoc,
       doc,
       setDoc,
       getDoc,
     } = await import("firebase/firestore")

     const firebaseConfig = {
       apiKey: "AIzaSyBg_BaH-0ECyJo8h0oOmTlZgt1FU3uCevQ",
       authDomain: "barbearia-do-hiroschi.firebaseapp.com",
       projectId: "barbearia-do-hiroschi",
       storageBucket: "barbearia-do-hiroschi.firebasestorage.app",
       messagingSenderId: "630587096303",
       appId: "1:630587096303:web:cacab13a15420e4a5d6f1a",
       measurementId: "G-HNQ8SB9ZYT",
     }

     const app = initializeApp(firebaseConfig)
     const db = getFirestore(app)

     ;(window as any).firebaseDb = db
     ;(window as any).firebaseUtils = {
       collection,
       addDoc,
       getDocs,
       updateDoc,
       query,
       where,
       deleteDoc,
       doc,
       setDoc,
       getDoc,
     }

     initApp()
   }

   const initApp = () => {
     const db = (window as any).firebaseDb
     const { collection, addDoc, getDocs, updateDoc, query, where, deleteDoc, doc, setDoc, getDoc } = (window as any).firebaseUtils

     let listaServicosLocal: any[] = []
     let clienteNome = ""
     let clienteApelido = ""
     let clienteTelefone = ""
     let clienteAniversario = ""
     let servicosSelecionados: any[] = []
     let planoClubeSelecionado: { nome: string; valor: string } | null = null
     let horarioSelecionado: string | null = null
     let formaPagamentoSelecionada: "local" | "pix" | null = null
     let ultimoAgendamento: any = null
     let clienteEhMembroClube = false
     let clienteCategoriaClube: string | null = null
     let temporizadorPix: any = null
     let tempoRestantePix = 600 // 10 minutos

     const configFuncionamento: {
       horarios: Record
       diasBloqueados: string[]
       excecoesHorarios: Record
       temaCorPrimaria: string
       fonteFamilia: string
     } = {
       horarios: {
         "2": { abertura: "09:00", fechamento: "19:00", fechado: false },
         "3": { abertura: "09:00", fechamento: "19:00", fechado: false },
         "4": { abertura: "09:00", fechamento: "19:00", fechado: false },
         "5": { abertura: "09:00", fechamento: "19:00", fechado: false },
         "6": { abertura: "09:00", fechamento: "19:00", fechado: false },
       },
       diasBloqueados: [],
       excecoesHorarios: {},
       temaCorPrimaria: "#111827",
       fonteFamilia: "sans-serif"
     }

     configurarMascarasEDatas()
     configurarEventosBotoes()
     carregarServicosDoBanco()
     carregarConfigFuncionamento()

     async function carregarConfigFuncionamento() {
       try {
         const refConfig = doc(db, "configuracoes", "funcionamento")
         const snap = await getDoc(refConfig)
         if (snap.exists()) {
           const dados = snap.data()
           if (dados.horarios) configFuncionamento.horarios = dados.horarios
           configFuncionamento.diasBloqueados = dados.diasBloqueados || []
           configFuncionamento.excecoesHorarios = dados.excecoesHorarios || {}
           if (dados.temaCorPrimaria) configFuncionamento.temaCorPrimaria = dados.temaCorPrimaria
           if (dados.fonteFamilia) configFuncionamento.fonteFamilia = dados.fonteFamilia
           aplicarCustomizacaoVisual()
         }
       } catch (e) {
         console.error("Erro ao carregar configuracoes:", e)
       }
     }

     function aplicarCustomizacaoVisual() {
       document.documentElement.style.setProperty('--primary-color', configFuncionamento.temaCorPrimaria)
       document.body.style.fontFamily = configFuncionamento.fonteFamilia
     }

     function configurarMascarasEDatas() {
       const inputData = document.getElementById("input-data") as HTMLInputElement
       if (inputData) inputData.value = new Date().toLocaleDateString("sv")
     }

     async function carregarServicosDoBanco() {
       try {
         const querySnapshot = await getDocs(collection(db, "servicos"))
         listaServicosLocal = []
         querySnapshot.forEach((docSnap: any) => {
           listaServicosLocal.push({ id: docSnap.id, ...docSnap.data() })
         })
       } catch (e) {
         console.error("Erro ao carregar servicos:", e)
       }
     }

     function abrirMenuPrincipal() {
       document.querySelectorAll(".tela").forEach((t) => t.classList.add("hidden"))
       document.getElementById("tela-menu")?.classList.remove("hidden")
       const boasVindas = document.getElementById("texto-boas-vindas")
       if (boasVindas) boasVindas.innerText = `Olá, ${clienteApelido || clienteNome || 'Cliente'}!`
     }

     function iniciarTimerPix() {
       clearInterval(temporizadorPix)
       tempoRestantePix = 600
       const timerElement = document.getElementById("timer-pix")
       
       temporizadorPix = setInterval(() => {
         tempoRestantePix--
         const minutos = Math.floor(tempoRestantePix / 60)
         const segundos = tempoRestantePix % 60
         if (timerElement) {
           timerElement.innerText = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
         }

         if (tempoRestantePix <= 0) {
           clearInterval(temporizadorPix)
           alert("Tempo de pagamento Pix expirado! O horário foi liberado.")
           horarioSelecionado = null
           abrirMenuPrincipal()
         }
       }, 1000)
     }

     function configurarEventosBotoes() {
       // Alternar Visibilidade da Senha Admin
       const toggleSenha = document.getElementById("btn-toggle-senha")
       if (toggleSenha) {
         toggleSenha.addEventListener("click", () => {
           const inputSenha = document.getElementById("senha-admin-input") as HTMLInputElement
           if (inputSenha.type === "password") {
             inputSenha.type = "text"
             toggleSenha.innerText = "🙈"
           } else {
             inputSenha.type = "password"
             toggleSenha.innerText = "👁️"
           }
         })
       }

       // Login / Cadastro
       document.getElementById("btn-verificar-whats")?.addEventListener("click", async () => {
         const inputWhats = (document.getElementById("login-whatsapp") as HTMLInputElement)?.value.trim()
         if (!inputWhats || inputWhats.length < 10) {
           alert("Insira um WhatsApp válido com DDD!")
           return
         }
         clienteTelefone = inputWhats
         const q = query(collection(db, "clientes"), where("whatsapp", "==", inputWhats))
         const snap = await getDocs(q)
         if (snap.empty) {
           document.getElementById("tela-login")?.classList.add("hidden")
           document.getElementById("tela-cadastro")?.classList.remove("hidden")
         } else {
           snap.forEach((docSnap: any) => {
             const d = docSnap.data()
             clienteNome = d.nome
             clienteApelido = d.apelido
             clienteAniversario = d.aniversario
           })
           // Verificar Clube
           const refClube = doc(db, "membros_clube", inputWhats.replace(/\D/g, ""))
           const snapClube = await getDoc(refClube)
           if (snapClube.exists() && snapClube.data().status === "ativo") {
             clienteEhMembroClube = true
             clienteCategoriaClube = snapClube.data().categoria
           }
           abrirMenuPrincipal()
         }
       })

       // Seleção de Pagamento
       document.getElementById("btn-pay-local")?.addEventListener("click", () => {
         formaPagamentoSelecionada = "local"
         document.getElementById("container-pix")?.classList.add("hidden")
         document.getElementById("btn-pay-local")?.classList.add("bg-green-600", "text-white")
         document.getElementById("btn-pay-pix")?.classList.remove("bg-green-600", "text-white")
         document.getElementById("btn-confirmar-agendamento")?.classList.remove("hidden")
       })

       document.getElementById("btn-pay-pix")?.addEventListener("click", () => {
         formaPagamentoSelecionada = "pix"
         document.getElementById("container-pix")?.classList.remove("hidden")
         document.getElementById("btn-pay-pix")?.classList.add("bg-green-600", "text-white")
         document.getElementById("btn-pay-local")?.classList.remove("bg-green-600", "text-white")
         document.getElementById("btn-confirmar-agendamento")?.classList.remove("hidden")
         iniciarTimerPix()
       })

       // Uploads de Fotos sem URL (Base64)
       const setupImageUpload = (inputId: string, previewId: string) => {
         const input = document.getElementById(inputId) as HTMLInputElement
         if (input) {
           input.addEventListener("change", (e: any) => {
             const file = e.target.files[0]
             if (file) {
               const reader = new FileReader()
               reader.onloadend = () => {
                 (window as any)[`${inputId}_data`] = reader.result
                 const img = document.getElementById(previewId) as HTMLImageElement
                 if (img) img.src = reader.result as string
               }
               reader.readAsDataURL(file)
             }
           })
         }
       }

       setupImageUpload("input-foto-servico", "preview-foto-servico")
       setupImageUpload("input-foto-produto", "preview-foto-produto")

       // Navegação Administrador e Abas
       const abasAdmin = ["agenda", "caixa", "cliente", "clube", "servicos", "produtos", "horarios", "configuracao"]
       abasAdmin.forEach((aba) => {
         document.getElementById(`tab-${aba}`)?.addEventListener("click", () => {
           abasAdmin.forEach((a) => {
             document.getElementById(`tab-${a}`)?.classList.remove("border-b-2", "border-black", "font-bold")
             document.getElementById(`conteudo-admin-${a}`)?.classList.add("hidden")
           })
           document.getElementById(`tab-${aba}`)?.classList.add("border-b-2", "border-black", "font-bold")
           document.getElementById(`conteudo-admin-${aba}`)?.classList.remove("hidden")
         })
       })

       // Salvar Configurações de Tema
       document.getElementById("btn-salvar-config")?.addEventListener("click", async () => {
         const cor = (document.getElementById("config-cor-primaria") as HTMLInputElement)?.value
         const fonte = (document.getElementById("config-fonte") as HTMLSelectElement)?.value
         configFuncionamento.temaCorPrimaria = cor
         configFuncionamento.fonteFamilia = fonte

         await setDoc(doc(db, "configuracoes", "funcionamento"), {
           ...configFuncionamento
         }, { merge: true })

         aplicarCustomizacaoVisual()
         alert("Configurações salvas com sucesso!")
       })
     }

     // Inicialização da Tela
     document.getElementById("tela-login")?.classList.remove("hidden")
   }

   loadFirebase()
 }, [])

 return (
   

     

       
       {/* Cabeçalho */}
       
         
Barbearia Hiroschi 2.0

         
Estilo & Tradição

       

       {/* Tela 1: Login */}
       

         
Acesse seu Perfil

         
         Acessar Sistema
         
         

           👁️
            {
             const pass = prompt("Digite a senha do Administrador:")
             if (pass === "77186800") {
               document.querySelectorAll(".tela").forEach(t => t.classList.add("hidden"))
               document.getElementById("tela-admin")?.classList.remove("hidden")
             } else {
               alert("Senha incorreta!")
             }
           }} className="text-xs text-red-600 underline">Acesso do Proprietário
         

       

       {/* Tela 2: Menu Principal Cliente */}
       

         


         {/* Slide de Fotos (Cortes) */}
         

           
[ Galeria de Trabalhos & Cortes ]

         

         

            {
             document.querySelectorAll(".tela").forEach(t => t.classList.add("hidden"))
             document.getElementById("tela-servicos")?.classList.remove("hidden")
           }} className="p-4 bg-gray-900 text-white rounded-lg font-semibold text-sm text-center">Novo Agendamento
           Meus Agendamentos
           Clube do Hiroschi
           Produtos
         

       

       {/* Tela 3: Pagamento e Confirmação */}
       

         
Forma de Pagamento

         
         

           Pagar no Local
           Pagar via Pix
         


         
           
Chave Pix (Telefone):

           
21979012977

           
Tempo para realizar o Pix e enviar o comprovante:

           
10:00

         

         Confirmar Agendamento
       


       {/* Painel do Administrador */}
       

         

           
Painel Admin

            {
             document.querySelectorAll(".tela").forEach(t => t.classList.add("hidden"))
             document.getElementById("tela-login")?.classList.remove("hidden")
           }} className="text-xs text-red-600 font-bold">Sair
         


         {/* Abas de Navegação */}
         

           Agenda
           Caixa
           Clientes
           Clube
           Serviços
           Produtos
           Horários
           Configuração
         


         {/* Conteúdo Aba Configuração */}
         

           
Personalização do App

           

             Cor Principal do Tema:
             
           

           

             Estilo de Fonte:
             
               Padrão Sans-Serif
               Elegante (Serif)
               Moderno (Monospace)
             
           

           Salvar Estilo
         


       

     

   
