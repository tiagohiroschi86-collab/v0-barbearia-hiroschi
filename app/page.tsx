"use client"

import { useEffect, useState } from "react"

export default function BarbeariaHiroschi() {
 // Estados da Aplicação
 const [telaAtual, setTelaAtual] = useState<"login" | "cadastro" | "menu" | "agendamento" | "pagamento" | "admin">("login")
 const [abaAdmin, setAbaAdmin] = useState<"agenda" | "caixa" | "cliente" | "clube" | "servicos" | "produtos" | "horarios" | "configuracao">("agenda")
 
 // Dados do Cliente
 const [whatsappInput, setWhatsappInput] = useState("")
 const [cliente, setCliente] = useState<{ nome: string; apelido: string; whatsapp: string } | null>(null)
 const [mostrarSenhaAdmin, setMostrarSenhaAdmin] = useState(false)
 const [senhaAdminInput, setSenhaAdminInput] = useState("")

 // Opções de Pagamento e Pix
 const [formaPagamento, setFormaPagamento] = useState<"local" | "pix" | null>(null)
 const [tempoPix, setTempoPix] = useState(600) // 10 minutos
 const [timerAtivo, setTimerAtivo] = useState(false)

 // Cores do Tema Dinâmico
 const [corPrimaria, setCorPrimaria] = useState("#d4af37") // Dourado padrão
 const [corFundo, setCorFundo] = useState("#121212") // Escuro
 const [corTexto, setCorTexto] = useState("#ffffff")

 // Carrossel de Cortes
 const [slideAtual, setSlideAtual] = useState(0)
 const fotosCortes = [
   "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
   "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80",
   "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80"
 ]

 // Instância do Firebase
 const [db, setDb] = useState(null)

 useEffect(() => {
   const initFirebase = async () => {
     try {
       const { initializeApp } = await import("firebase/app")
       const { getFirestore } = await import("firebase/firestore")

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
       const database = getFirestore(app)
       setDb(database)
     } catch (err) {
       console.error("Erro Firebase:", err)
     }
   }
   initFirebase()
 }, [])

 // Timer do Pix (10 min)
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

 // Login Handler
 const handleAcessar = () => {
   if (!whatsappInput || whatsappInput.length < 10) {
     alert("Informe um WhatsApp válido com DDD!")
     return
   }
   setCliente({ nome: "Cliente", apelido: "Amigo", whatsapp: whatsappInput })
   setTelaAtual("menu")
 }

 // Admin Access Handler
 const handleAcessoAdmin = () => {
   if (senhaAdminInput === "77186800") {
     setTelaAtual("admin")
   } else {
     alert("Senha de Administrador incorreta!")
   }
 }

 // Formatação Tempo Pix
 const formatarTempo = (segundos: number) => {
   const mins = Math.floor(segundos / 60)
   const segs = segundos % 60
   return `${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
 }

 return (
   

     

       
       {/* CABEÇALHO */}
       
         

           Barbearia Hiroschi 2.0
         

         
Estilo & Tradição

       

       {/* TELA 1: LOGIN */}
       {telaAtual === "login" && (
         

           
Acesse seu Perfil

           
            setWhatsappInput(e.target.value)}
             className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-center focus:outline-none focus:border-amber-500"
           />

           
             Acessar Sistema
           

           

             

                setSenhaAdminInput(e.target.value)}
                 className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-2 text-xs"
               />
                setMostrarSenhaAdmin(!mostrarSenhaAdmin)}
                 className="p-2 text-sm bg-gray-800 rounded-xl border border-gray-700"
               >
                 {mostrarSenhaAdmin ? "🙈" : "👁️"}
               
             


             
               Acesso do Proprietário
             
           

         
       )}

       {/* TELA 2: MENU PRINCIPAL CLIENTE */}
       {telaAtual === "menu" && (
         

           

             
Olá, {cliente?.apelido || cliente?.nome}!

              setTelaAtual("login")} className="text-xs text-gray-400 hover:text-white">Sair
           


           {/* CARROSSEL / SLIDE DE CORTES */}
           

             
             

               Galeria de Trabalhos
             

              setSlideAtual((prev) => (prev === 0 ? fotosCortes.length - 1 : prev - 1))}
               className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-xs text-white"
             >
               ❮
             
              setSlideAtual((prev) => (prev === fotosCortes.length - 1 ? 0 : prev + 1))}
               className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full text-xs text-white"
             >
               ❯
             
           


           {/* BOTÕES DE NAVEGAÇÃO DO CLIENTE */}
           

              setTelaAtual("pagamento")}
               className="p-4 rounded-xl font-bold text-sm text-center shadow-md transition transform active:scale-95"
               style={{ backgroundColor: corPrimaria, color: "#000000" }}
             >
               Novo Agendamento
             
             
               Meus Agendamentos
             
             
               Clube do Hiroschi
             
             
               Produtos
             
           

         
       )}

       {/* TELA 3: CHECKOUT E PAGAMENTO */}
       {telaAtual === "pagamento" && (
         

            setTelaAtual("menu")} className="text-xs text-gray-400">← Voltar
           
Confirmar Agendamento


           

              {
                 setFormaPagamento("local")
                 setTimerAtivo(false)
               }}
               className={`p-3 rounded-xl font-bold text-sm border ${formaPagamento === "local" ? "border-green-500 bg-green-500/20 text-green-400" : "border-gray-700 bg-gray-800"}`}
             >
               Pagar no Local
             
              {
                 setFormaPagamento("pix")
                 setTempoPix(600)
                 setTimerAtivo(true)
               }}
               className={`p-3 rounded-xl font-bold text-sm border ${formaPagamento === "pix" ? "border-green-500 bg-green-500/20 text-green-400" : "border-gray-700 bg-gray-800"}`}
             >
               Pagar via Pix
             
           


           {formaPagamento === "pix" && (
             

               
Chave Pix (Telefone):

               
21979012977

               
Tempo para conclusão:

               
{formatarTempo(tempoPix)}

             
           )}

           {formaPagamento && (
              {
                 alert("Agendamento efetuado com sucesso!")
                 setTelaAtual("menu")
               }}
               className="w-full py-3 bg-green-600 text-white font-bold rounded-xl text-center shadow-lg hover:bg-green-500"
             >
               Finalizar Agendamento
             
           )}
         

       )}

       {/* PAINEL DO ADMINISTRADOR */}
       {telaAtual === "admin" && (
         

           

             
Painel Admin 2.0

              setTelaAtual("login")} className="text-xs text-red-400 font-bold">Sair
           


           {/* NAV ABAS ADMIN */}
           

             {(["agenda", "caixa", "cliente", "clube", "servicos", "produtos", "horarios", "configuracao"] as const).map((aba) => (
                setAbaAdmin(aba)}
                 className={`px-3 py-1.5 rounded-lg capitalize font-bold whitespace-nowrap transition ${abaAdmin === aba ? "bg-amber-500 text-black" : "bg-gray-800 text-gray-300"}`}
               >
                 {aba}
               
             ))}
           


           {/* CONTEÚDO CONFIGURAÇÃO DE CORES */}
           {abaAdmin === "configuracao" && (
             

               
Personalizar Cores do App

               
               

                 Cor Primária (Destaque/Botões):
                  setCorPrimaria(e.target.value)}
                   className="w-full h-10 rounded cursor-pointer bg-transparent border-0"
                 />
               


               

                 Cor do Fundo:
                  setCorFundo(e.target.value)}
                   className="w-full h-10 rounded cursor-pointer bg-transparent border-0"
                 />
               


               

                 Cor do Texto:
                  setCorTexto(e.target.value)}
                   className="w-full h-10 rounded cursor-pointer bg-transparent border-0"
                 />
               


                alert("Estilo visual atualizado!")}
                 className="w-full py-2 bg-amber-500 text-black font-bold rounded-lg text-xs"
               >
                 Salvar Preferências
               
             

           )}

           {abaAdmin !== "configuracao" && (
             

               Aba {abaAdmin} pronta para operações.
             

           )}
         

       )}

     

   
 )
}
