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
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.apiKey || "",
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
   <main className="min-h-screen bg-white text-gray-900 font-sans">
     <header className="border-b border-gray-200 px-5 py-4">
       <h1 className="text-xl font-bold">Barbearia Hiroschi 2.0</h1>
       <p className="text-sm text-gray-500">Estilo &amp; Tradição</p>
     </header>

     <section id="tela-login" className="tela mx-auto flex max-w-md flex-col gap-4 px-5 py-8">
       <h2 className="text-2xl font-bold">Acesse seu Perfil</h2>
       <input id="login-whatsapp" type="tel" placeholder="WhatsApp com DDD" className="rounded-lg border border-gray-300 p-3" />
       <button id="btn-verificar-whats" className="rounded-lg bg-gray-900 p-3 font-semibold text-white">Acessar Sistema</button>
       <button id="btn-toggle-senha" type="button" className="hidden">Mostrar senha</button>
       <button type="button" className="text-left text-xs text-red-600 underline" onClick={() => {
         const pass = prompt("Digite a senha do Administrador:")
         if (pass === "77186800") {
           document.querySelectorAll(".tela").forEach((t) => t.classList.add("hidden"))
           document.getElementById("tela-admin")?.classList.remove("hidden")
         } else alert("Senha incorreta!")
       }}>Acesso do Proprietário</button>
     </section>

     <section id="tela-cadastro" className="tela hidden mx-auto max-w-md px-5 py-8">
       <h2 className="text-2xl font-bold">Complete seu cadastro</h2>
     </section>

     <section id="tela-menu" className="tela hidden mx-auto max-w-md space-y-4 px-5 py-8">
       <h2 id="texto-boas-vindas" className="text-2xl font-bold" />
       <button id="btn-novo-agendamento" className="w-full rounded-lg bg-gray-900 p-4 font-semibold text-white">Novo Agendamento</button>
       <button className="w-full rounded-lg border border-gray-300 p-4">Meus Agendamentos</button>
       <button className="w-full rounded-lg border border-gray-300 p-4">Clube do Hiroschi</button>
       <button className="w-full rounded-lg border border-gray-300 p-4">Produtos</button>
     </section>

     <section id="tela-pagamento" className="tela hidden mx-auto max-w-md space-y-4 px-5 py-8">
       <h2 className="text-2xl font-bold">Forma de Pagamento</h2>
       <div className="flex gap-3"><button id="btn-pay-local" className="rounded-lg border p-3">Pagar no Local</button><button id="btn-pay-pix" className="rounded-lg border p-3">Pagar via Pix</button></div>
       <div id="container-pix" className="hidden rounded-lg bg-gray-100 p-4"><p>Chave Pix (Telefone):</p><strong>21979012977</strong><p>Tempo: <span id="timer-pix">10:00</span></p></div>
       <button id="btn-confirmar-agendamento" className="hidden rounded-lg bg-gray-900 p-3 text-white">Confirmar Agendamento</button>
     </section>

     <section id="tela-admin" className="tela hidden px-5 py-8">
       <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Painel Admin</h2><button className="text-xs font-bold text-red-600" onClick={() => { document.querySelectorAll(".tela").forEach((t) => t.classList.add("hidden")); document.getElementById("tela-login")?.classList.remove("hidden") }}>Sair</button></div>
       <nav className="mt-6 flex flex-wrap gap-3 text-sm">{["agenda", "caixa", "cliente", "clube", "servicos", "produtos", "horarios", "configuracao"].map((aba) => <button key={aba} id={`tab-${aba}`} className="border-b-2 border-transparent px-2 py-2 font-semibold">{aba}</button>)}</nav>
       <div id="conteudo-admin-configuracao" className="mt-8 max-w-md space-y-4"><h3 className="text-xl font-bold">Personalização do App</h3><label className="block">Cor Principal do Tema:<input id="config-cor-primaria" type="color" defaultValue="#111827" className="ml-3" /></label><label className="block">Estilo de Fonte:<select id="config-fonte" className="ml-3 rounded border p-2"><option value="sans-serif">Padrão Sans-Serif</option><option value="serif">Elegante (Serif)</option><option value="monospace">Moderno (Monospace)</option></select></label><button id="btn-salvar-config" className="rounded-lg bg-gray-900 p-3 text-white">Salvar Estilo</button></div>
     </section>
   </main>
 )
}
