"use client"

import { useEffect } from "react"

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
      let ultimoAgendamento: { servico: string; data: string; horario: string; total: number } | null = null
      let listaProdutosLocal: any[] = []
      let listaMembrosClube: any[] = []
      // Status de membro do Clube do Hiroschi para o cliente logado
      let clienteEhMembroClube = false
      let clienteCategoriaClube: string | null = null

      // Configuração de funcionamento (horários por dia da semana + dias bloqueados)
      // Padrão: Terça (2) a Sábado (6), das 09:00 às 19:00. Domingo/Segunda fechados.
      const configFuncionamento: {
        horarios: Record<string, { abertura: string; fechamento: string; fechado: boolean }>
        diasBloqueados: string[]
      } = {
        horarios: {
          "2": { abertura: "09:00", fechamento: "19:00", fechado: false },
          "3": { abertura: "09:00", fechamento: "19:00", fechado: false },
          "4": { abertura: "09:00", fechamento: "19:00", fechado: false },
          "5": { abertura: "09:00", fechamento: "19:00", fechado: false },
          "6": { abertura: "09:00", fechamento: "19:00", fechado: false },
        },
        diasBloqueados: [],
      }

      configurarMascarasEDatas()
      configurarEventosBotoes()
      carregarServicosDoBanco()
      carregarConfigFuncionamento()
      // Aplica tema salvo (cores, fonte) assim que o app abre
      setTimeout(() => {
        try { (window as any).__carregarTemaAoIniciar?.() } catch {}
      }, 400)

      async function carregarConfigFuncionamento() {
        try {
          const refConfig = doc(db, "configuracoes", "funcionamento")
          const snap = await getDoc(refConfig)
          if (snap.exists()) {
            const dados = snap.data()
            if (dados.horarios) configFuncionamento.horarios = dados.horarios
            configFuncionamento.diasBloqueados = dados.diasBloqueados || []
            ;(configFuncionamento as any).datas_customizadas = dados.datas_customizadas || {}
          }
        } catch (e) {
          console.error("Erro ao carregar configuração de funcionamento:", e)
        }
      }

      // Gera os horários (slots de 15 min) entre abertura e fechamento
      function gerarHorarios(abertura: string, fechamento: string) {
        const slots: string[] = []
        const ini = converterHoraParaMinutos(abertura)
        const fim = converterHoraParaMinutos(fechamento)
        for (let m = ini; m <= fim; m += 15) {
          slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`)
        }
        return slots
      }

      function configurarMascarasEDatas() {
        const cadAniversario = document.getElementById("cad-aniversario") as HTMLInputElement
        if (cadAniversario) {
          cadAniversario.addEventListener("input", (e) => {
            const target = e.target as HTMLInputElement
            let v = target.value.replace(/\D/g, "")
            if (v.length > 8) v = v.slice(0, 8)
            if (v.length > 4) {
              v = v.replace(/^(\d{2})(\d{2})(\d{4})$/, "$1/$2/$3")
            } else if (v.length > 2) {
              v = v.replace(/^(\d{2})(\d{0,2})$/, "$1/$2")
            }
            target.value = v
          })
        }

        const dataPadraoInicial = obterDataDeHojeValida()
        const inputData = document.getElementById("input-data") as HTMLInputElement
        const filtroDataAdmin = document.getElementById("filtro-data-admin") as HTMLInputElement
        const filtroDataFinanceiro = document.getElementById("filtro-data-financeiro") as HTMLInputElement
        if (inputData) inputData.value = dataPadraoInicial
        if (filtroDataAdmin) filtroDataAdmin.value = dataPadraoInicial
        if (filtroDataFinanceiro) filtroDataFinanceiro.value = new Date().toLocaleDateString("sv")
      }

      function obterDataDeHojeValida() {
        const hojeDt = new Date()
        // Regra atualizada: cliente (mesmo membro do Clube) pode escolher qualquer dia.
        // Ter/Qua/Qui aplicará isenção; Sex/Sab paga normal. Domingo/Segunda pula.
        const diaSemana = hojeDt.getDay()
        if (diaSemana === 0) hojeDt.setDate(hojeDt.getDate() + 2)
        else if (diaSemana === 1) hojeDt.setDate(hojeDt.getDate() + 1)
        return hojeDt.toLocaleDateString("sv")
      }

      async function carregarServicosDoBanco() {
        try {
          const querySnapshot = await getDocs(collection(db, "servicos"))
          listaServicosLocal = []
          querySnapshot.forEach((docSnap: any) => {
            listaServicosLocal.push({ id: docSnap.id, ...docSnap.data() })
          })
        } catch (e) {
          console.error("Erro ao carregar serviços:", e)
        }
      }

      function configurarEventosBotoes() {
        const btnLimparServicos = document.getElementById("btn-limpar-todos-servicos")
        if (btnLimparServicos) {
          btnLimparServicos.addEventListener("click", async () => {
            const confirmar1 = confirm(
              "ATENÇÃO HIROSCHI:\nVocê deseja APAGAR TODOS os serviços salvos para reiniciar o catálogo do zero?"
            )
            if (!confirmar1) return

            const confirmar2 = confirm("Tem certeza absoluta? Essa ação não pode ser desfeita.")
            if (!confirmar2) return

            btnLimparServicos.innerText = "APAGANDO BANCO..."
            try {
              const snapshot = await getDocs(collection(db, "servicos"))
              const deletarPromessas: Promise<void>[] = []
              snapshot.forEach((docSnap: any) => {
                deletarPromessas.push(deleteDoc(doc(db, "servicos", docSnap.id)))
              })

              await Promise.all(deletarPromessas)
              alert("Sucesso! Todos os serviços foram excluídos. O banco está limpo.")
              await carregarServicosEditorAdmin()
            } catch (err: any) {
              alert("Erro crítico ao tentar limpar o banco: " + err.message)
            } finally {
              btnLimparServicos.innerText = "⚠️ LIMPAR BANCO DE SERVIÇOS (APAGAR TUDO)"
            }
          })
        }

        const btnVerificarWhats = document.getElementById("btn-verificar-whats")
        if (btnVerificarWhats) {
          btnVerificarWhats.addEventListener("click", async () => {
            const loginWhatsapp = document.getElementById("login-whatsapp") as HTMLInputElement
            const whatsappInformado = loginWhatsapp?.value.trim() || ""
            if (!whatsappInformado || whatsappInformado.length < 10) {
              alert("Insira um número de WhatsApp válido com DDD!")
              return
            }
            btnVerificarWhats.innerText = "Verificando..."
            try {
              const q = query(collection(db, "clientes"), where("whatsapp", "==", whatsappInformado))
              const querySnapshot = await getDocs(q)
              clienteTelefone = whatsappInformado
              if (querySnapshot.empty) {
                document.getElementById("tela-login")?.classList.add("hidden")
                document.getElementById("tela-cadastro")?.classList.remove("hidden")
              } else {
                querySnapshot.forEach((docSnap: any) => {
                  const dados = docSnap.data()
                  clienteNome = dados.nome
                  clienteApelido = dados.apelido
                  clienteAniversario = dados.aniversario
                })
                await carregarStatusMembroCliente()
                abrirMenuPrincipal()
              }
            } catch (error) {
              alert("Erro na conexão com o banco.")
            } finally {
              btnVerificarWhats.innerText = "Acessar Sistema"
            }
          })
        }

        const btnSalvarCadastro = document.getElementById("btn-salvar-cadastro")
        if (btnSalvarCadastro) {
          btnSalvarCadastro.addEventListener("click", async () => {
            const nomeInput = (document.getElementById("cad-nome") as HTMLInputElement)?.value.trim() || ""
            const apelidoInput = (document.getElementById("cad-apelido") as HTMLInputElement)?.value.trim() || ""
            const niverInput = (document.getElementById("cad-aniversario") as HTMLInputElement)?.value.trim() || ""

            if (!nomeInput || !apelidoInput || !niverInput) {
              alert("Preencha todos os campos!")
              return
            }
            btnSalvarCadastro.innerText = "Salvando..."

            try {
              const qCheck = query(collection(db, "clientes"), where("whatsapp", "==", clienteTelefone))
              const snapCheck = await getDocs(qCheck)

              if (!snapCheck.empty) {
                snapCheck.forEach((docSnap: any) => {
                  const dados = docSnap.data()
                  clienteNome = dados.nome
                  clienteApelido = dados.apelido
                  clienteAniversario = dados.aniversario
                })
              } else {
                await addDoc(collection(db, "clientes"), {
                  nome: nomeInput,
                  apelido: apelidoInput,
                  whatsapp: clienteTelefone,
                  aniversario: niverInput,
                  cadastrado_em: new Date().toISOString(),
                })
                clienteNome = nomeInput
                clienteApelido = apelidoInput
                clienteAniversario = niverInput
              }
              document.getElementById("tela-cadastro")?.classList.add("hidden")
              abrirMenuPrincipal()
            } catch (e) {
              alert("Erro ao cadastrar.")
            } finally {
              btnSalvarCadastro.innerText = "Salvar e Continuar"
            }
          })
        }

        document.getElementById("opt-agendamento")?.addEventListener("click", async () => {
          document.getElementById("tela-menu")?.classList.add("hidden")
          document.getElementById("tela-servicos")?.classList.remove("hidden")
          await carregarServicosDoBanco()
          initializeListaServicos()
        })

        document.getElementById("btn-voltar-agenda-servicos")?.addEventListener("click", () => {
          document.getElementById("tela-agenda")?.classList.add("hidden")
          document.getElementById("tela-servicos")?.classList.remove("hidden")
          initializeListaServicos(true)
        })

        document.getElementById("btn-voltar-serv-menu")?.addEventListener("click", abrirMenuPrincipal)
        document.getElementById("btn-voltar-menu")?.addEventListener("click", abrirMenuPrincipal)
        document.getElementById("btn-voltar-horarios-menu")?.addEventListener("click", abrirMenuPrincipal)
        document.getElementById("btn-voltar")?.addEventListener("click", abrirMenuPrincipal)

        document.getElementById("opt-clube")?.addEventListener("click", () => {
          document.getElementById("tela-menu")?.classList.add("hidden")
          document.getElementById("tela-clube")?.classList.remove("hidden")
        })

        document.getElementById("opt-meus-horarios")?.addEventListener("click", async () => {
          document.getElementById("tela-menu")?.classList.add("hidden")
          document.getElementById("tela-meus-horarios")?.classList.remove("hidden")
          await carregarHorariosCliente()
        })

        document.getElementById("opt-produtos")?.addEventListener("click", async () => {
          document.getElementById("tela-menu")?.classList.add("hidden")
          document.getElementById("tela-produtos")?.classList.remove("hidden")
          await carregarProdutosCliente()
        })

        document.getElementById("opt-galeria")?.addEventListener("click", async () => {
          document.getElementById("tela-menu")?.classList.add("hidden")
          document.getElementById("tela-galeria")?.classList.remove("hidden")
          await carregarGaleriaCompleta()
        })

        document.getElementById("btn-voltar-galeria-menu")?.addEventListener("click", abrirMenuPrincipal)

        document.getElementById("btn-voltar-produtos-menu")?.addEventListener("click", abrirMenuPrincipal)

        const btnResumoWhats = document.getElementById("btn-resumo-whatsapp")
        if (btnResumoWhats) {
          btnResumoWhats.addEventListener("click", () => {
            if (!ultimoAgendamento) {
              alert("Nenhum agendamento encontrado para gerar o resumo.")
              return
            }
            const [ano, mes, dia] = ultimoAgendamento.data.split("-")
            const dataFormatada = `${dia}/${mes}/${ano}`
            const valorFormatado = `R$ ${Number(ultimoAgendamento.total).toFixed(2).replace(".", ",")}`
            const mensagem =
              `Olá! Segue o resumo do meu agendamento na Barbearia Hiroschi: ` +
              `${ultimoAgendamento.servico}, ` +
              `Data: ${dataFormatada}, ` +
              `Horário: ${ultimoAgendamento.horario}, ` +
              `Valor Total: ${valorFormatado}`
            const telefoneLimpo = String(clienteTelefone || "").replace(/\D/g, "")
            const url = telefoneLimpo
              ? `https://wa.me/55${telefoneLimpo}?text=${encodeURIComponent(mensagem)}`
              : `https://wa.me/?text=${encodeURIComponent(mensagem)}`
            window.open(url, "_blank")
          })
        }

        const btnAderirClube = document.getElementById("btn-aderir-clube")
        if (btnAderirClube) {
          btnAderirClube.addEventListener("click", async () => {
            if (!planoClubeSelecionado) {
              alert("Selecione um dos planos clicando sobre ele!")
              return
            }
            const telLimpoMembro = String(clienteTelefone || "").replace(/\D/g, "")
            if (!telLimpoMembro) {
              alert("Não foi possível identificar seu WhatsApp. Refaça o login.")
              return
            }
            btnAderirClube.innerText = "Processando..."
            try {
              // Registra o cliente como MEMBRO do Clube do Hiroschi na categoria escolhida
              await setDoc(doc(db, "membros_clube", telLimpoMembro), {
                telefone: telLimpoMembro,
                nome: clienteNome,
                apelido: clienteApelido,
                categoria: planoClubeSelecionado.nome,
                valor_plano: planoClubeSelecionado.valor,
                criado_em: new Date().toISOString(),
              })
              clienteEhMembroClube = true
              clienteCategoriaClube = planoClubeSelecionado.nome
              alert(
                `Bem-vindo ao Clube, ${clienteApelido}! Você agora é membro ${planoClubeSelecionado.nome}.\n\nLembrete: agendamentos para membros do Clube são apenas de Terça a Quinta-feira.`
              )
              abrirMenuPrincipal()
            } catch (e) {
              alert("Erro ao processar.")
            } finally {
              btnAderirClube.innerText = "Quero Assinar Este Plano"
            }
          })
        }

        const btnIrAgenda = document.getElementById("btn-ir-agenda")
        if (btnIrAgenda) {
          btnIrAgenda.addEventListener("click", async () => {
            if (servicosSelecionados.length === 0) {
              alert("Selecione ao menos um serviço!")
              return
            }
            const inputData = document.getElementById("input-data") as HTMLInputElement
            if (!validarDiaSemana(inputData?.value || "")) {
              inputData.value = obterDataDeHojeValida()
            }
            document.getElementById("tela-servicos")?.classList.add("hidden")
            document.getElementById("tela-agenda")?.classList.remove("hidden")
            await atualizarHorariosDisponiveis()
          })
        }

        const inputData = document.getElementById("input-data")
        if (inputData) {
          inputData.addEventListener("change", async (e) => {
            const target = e.target as HTMLInputElement
            if (!validarDiaSemana(target.value)) {
              target.value = obterDataDeHojeValida()
            }
            await atualizarHorariosDisponiveis()
            atualizarResumoServicos() // recalcula isenção conforme dia
          })
        }

        const btnSalvarAgendamento = document.getElementById("btn-salvar-agendamento")
        if (btnSalvarAgendamento) {
          btnSalvarAgendamento.addEventListener("click", async () => {
            if (!horarioSelecionado) {
              alert("Por favor, selecione um horário disponível da lista!")
              return
            }
            const dataSel = (document.getElementById("input-data") as HTMLInputElement)?.value || ""
            // NOVO: calcula total considerando isenção do Clube (Ter/Qua/Qui + serviço incluído)
            const totalPreco = servicosSelecionados.reduce(
              (acc, curr) => acc + precoServicoParaCliente(curr, dataSel),
              0
            )
            const nomesServicos = servicosSelecionados.map((s) => s.nome).join(" + ")
            const duracaoTotal = calcularDuracaoTotalSelecionada()

            // Revalida a antecedência mínima de 6 horas no momento de confirmar
            const agoraConfirm = new Date()
            const [aC, mC, dC] = dataSel.split("-")
            const [hC, minC] = (horarioSelecionado || "").split(":")
            const dataHoraSlot = new Date(Number(aC), Number(mC) - 1, Number(dC), Number(hC), Number(minC), 0)
            const horasAntecedencia = (dataHoraSlot.getTime() - agoraConfirm.getTime()) / (1000 * 60 * 60)
            if (horasAntecedencia < 6) {
              alert("Agendamentos só podem ser feitos com no mínimo 6 horas de antecedência. Escolha outro horário.")
              await atualizarHorariosDisponiveis()
              return
            }

            // NOVO: guarda o pré-agendamento em memória e vai para tela de pagamento
            const w = window as any
            w.preAgendamento = {
              cliente_nome: clienteNome,
              cliente_apelido: clienteApelido,
              cliente_telefone: clienteTelefone,
              data: dataSel,
              horario: horarioSelecionado,
              servico: nomesServicos,
              preco_total: totalPreco,
              duracao_total: duracaoTotal,
            }

            // Renderiza resumo na tela de pagamento
            const rp = document.getElementById("pg-resumo")
            if (rp) {
              rp.innerHTML =
                '<div class="pg-line"><span>Serviço:</span><strong>' + nomesServicos + '</strong></div>' +
                '<div class="pg-line"><span>Data:</span><strong>' + dataSel.split("-").reverse().join("/") + '</strong></div>' +
                '<div class="pg-line"><span>Horário:</span><strong>' + horarioSelecionado + '</strong></div>' +
                '<div class="pg-line pg-total"><span>Total:</span><strong>R$ ' + totalPreco.toFixed(2).replace(".", ",") + '</strong></div>' +
                (totalPreco === 0
                  ? '<div class="pg-isento">🎁 Isento pelo Clube do Hiroschi</div>'
                  : '')
            }

            // Se total é R$ 0 (todos isentos pelo clube), só permite "Pagar no Local" (grava direto)
            const btnPix = document.getElementById("btn-pagar-pix") as HTMLButtonElement
            const btnLocal = document.getElementById("btn-pagar-local") as HTMLButtonElement
            if (btnPix && btnLocal) {
              if (totalPreco === 0) {
                btnPix.disabled = true
                btnPix.style.opacity = "0.4"
                btnPix.title = "Serviço isento — confirmação direta"
              } else {
                btnPix.disabled = false
                btnPix.style.opacity = "1"
                btnPix.title = ""
              }
            }
            // Reset da seleção da forma
            w.formaPagamentoEscolhida = null
            document.querySelectorAll(".pg-forma-btn").forEach(b => b.classList.remove("selected"))

            document.getElementById("tela-agenda")?.classList.add("hidden")
            document.getElementById("tela-pagamento")?.classList.remove("hidden")
          })
        }

        // ================= FLUXO DE PAGAMENTO =================
        // Botão "Pagar no Local"
        document.getElementById("btn-pagar-local")?.addEventListener("click", () => {
          const w = window as any
          w.formaPagamentoEscolhida = "local"
          document.querySelectorAll(".pg-forma-btn").forEach(b => b.classList.remove("selected"))
          document.getElementById("btn-pagar-local")?.classList.add("selected")
        })
        // Botão "Pagar via Pix"
        document.getElementById("btn-pagar-pix")?.addEventListener("click", () => {
          const w = window as any
          if ((w.preAgendamento?.preco_total || 0) === 0) {
            alert("Este agendamento é ISENTO pelo Clube. Use 'Pagar no Local' para confirmar.")
            return
          }
          w.formaPagamentoEscolhida = "pix"
          document.querySelectorAll(".pg-forma-btn").forEach(b => b.classList.remove("selected"))
          document.getElementById("btn-pagar-pix")?.classList.add("selected")
        })
        // Voltar para agenda
        document.getElementById("btn-pg-voltar")?.addEventListener("click", () => {
          document.getElementById("tela-pagamento")?.classList.add("hidden")
          document.getElementById("tela-agenda")?.classList.remove("hidden")
        })
        // Confirmar agendamento (após escolher forma)
        document.getElementById("btn-pg-confirmar")?.addEventListener("click", async () => {
          const w = window as any
          const forma = w.formaPagamentoEscolhida
          const pre = w.preAgendamento
          if (!pre) { alert("Sessão perdida. Volte e tente novamente."); return }
          if (!forma) { alert("Escolha uma forma de pagamento."); return }
          const btnConfirm = document.getElementById("btn-pg-confirmar") as HTMLButtonElement
          btnConfirm.disabled = true; btnConfirm.innerText = "Processando..."
          try {
            if (forma === "local") {
              // Grava agendamento direto (mantém padrão antigo + novos campos)
              await addDoc(collection(db, "agendamentos"), {
                cliente_nome: pre.cliente_nome,
                cliente_apelido: pre.cliente_apelido,
                cliente_telefone: pre.cliente_telefone,
                data: pre.data,
                horario: pre.horario,
                servico: pre.servico,
                preco_total: pre.preco_total,
                duracao_total: pre.duracao_total,
                criado_em: new Date().toISOString(),
                forma_pagamento: "local",
                status: "Agendado",
              })
              ultimoAgendamento = { servico: pre.servico, data: pre.data, horario: pre.horario, total: pre.preco_total }
              document.getElementById("tela-pagamento")?.classList.add("hidden")
              document.getElementById("tela-sucesso")?.classList.remove("hidden")
            } else if (forma === "pix") {
              // Chama backend para criar reserva atomica + ordem PagBank
              const resp = await fetch("/api/pagbank/pix/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pre),
              })
              const j = await resp.json()
              if (!resp.ok) {
                if (j.error === "SLOT_OCUPADO") {
                  alert("Este horário acabou de ser reservado por outro cliente. Escolha outro.")
                } else {
                  alert("Não foi possível criar a cobrança Pix: " + (j.error || resp.status))
                }
                document.getElementById("tela-pagamento")?.classList.add("hidden")
                document.getElementById("tela-agenda")?.classList.remove("hidden")
                await atualizarHorariosDisponiveis()
                return
              }
              // Mostra tela Pix com QR + copia-e-cola + timer
              iniciarTelaPix(j)
            }
          } catch (e: any) {
            alert("Erro: " + (e?.message || e))
          } finally {
            btnConfirm.disabled = false; btnConfirm.innerText = "CONFIRMAR AGENDAMENTO"
          }
        })

        // ================= TELA PIX =================
        function iniciarTelaPix(dados: any) {
          const w = window as any
          w.pixSessao = { ...dados, expiraEm: new Date(dados.reserva_expira_em).getTime() }
          document.getElementById("tela-pagamento")?.classList.add("hidden")
          document.getElementById("tela-pix")?.classList.remove("hidden")
          const img = document.getElementById("pix-qr-img") as HTMLImageElement
          if (img) img.src = dados.qr_code_png_url
          const cpc = document.getElementById("pix-copia-cola") as HTMLTextAreaElement
          if (cpc) cpc.value = dados.qr_code_text
          const valor = document.getElementById("pix-valor")
          if (valor) valor.innerText = "R$ " + (dados.valor_centavos / 100).toFixed(2).replace(".", ",")
          atualizarTimerPix()
          if (w.pixTimerInt) clearInterval(w.pixTimerInt)
          if (w.pixPollInt) clearInterval(w.pixPollInt)
          w.pixTimerInt = setInterval(atualizarTimerPix, 1000)
          w.pixPollInt = setInterval(() => pollPix(), 5000)
          setTimeout(() => pollPix(), 3000) // primeiro poll rápido
        }
        function atualizarTimerPix() {
          const w = window as any
          const el = document.getElementById("pix-timer")
          if (!el || !w.pixSessao) return
          const restante = Math.max(0, w.pixSessao.expiraEm - Date.now())
          const min = Math.floor(restante / 60000)
          const seg = Math.floor((restante % 60000) / 1000)
          el.innerText = String(min).padStart(2, "0") + ":" + String(seg).padStart(2, "0")
          if (restante <= 0) {
            clearInterval(w.pixTimerInt)
            clearInterval(w.pixPollInt)
            alert("Tempo esgotado. O horário foi liberado. Tente novamente.")
            document.getElementById("tela-pix")?.classList.add("hidden")
            document.getElementById("tela-menu")?.classList.remove("hidden")
          }
        }
        async function pollPix() {
          const w = window as any
          if (!w.pixSessao) return
          try {
            const r = await fetch("/api/pagbank/pix/status?agendamento_id=" + w.pixSessao.agendamento_id)
            const j = await r.json()
            if (j.status === "Confirmado") {
              clearInterval(w.pixTimerInt); clearInterval(w.pixPollInt)
              ultimoAgendamento = {
                servico: w.preAgendamento?.servico || "",
                data: w.preAgendamento?.data || "",
                horario: w.preAgendamento?.horario || "",
                total: w.preAgendamento?.preco_total || 0,
              }
              document.getElementById("tela-pix")?.classList.add("hidden")
              document.getElementById("tela-sucesso")?.classList.remove("hidden")
            } else if (j.status === "Cancelado") {
              clearInterval(w.pixTimerInt); clearInterval(w.pixPollInt)
              alert("Reserva cancelada (expirada). Faça o agendamento novamente.")
              document.getElementById("tela-pix")?.classList.add("hidden")
              document.getElementById("tela-menu")?.classList.remove("hidden")
            }
          } catch (e) { /* silencia */ }
        }
        ;(window as any).pixCopiarCola = function() {
          const cpc = document.getElementById("pix-copia-cola") as HTMLTextAreaElement
          if (!cpc) return
          cpc.select()
          try { document.execCommand("copy") } catch {}
          try { (navigator as any)?.clipboard?.writeText(cpc.value) } catch {}
          const btn = document.getElementById("btn-copiar-pix")
          if (btn) { btn.innerText = "COPIADO ✓"; setTimeout(() => { btn.innerText = "COPIAR CÓDIGO PIX" }, 2000) }
        }
        ;(window as any).pixCancelar = async function() {
          const w = window as any
          if (!w.pixSessao) return
          if (!confirm("Cancelar o pagamento e voltar? O horário será liberado.")) return
          clearInterval(w.pixTimerInt); clearInterval(w.pixPollInt)
          try {
            await fetch("/api/pagbank/pix/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agendamento_id: w.pixSessao.agendamento_id, motivo: "user_cancel" }),
            })
          } catch {}
          document.getElementById("tela-pix")?.classList.add("hidden")
          document.getElementById("tela-menu")?.classList.remove("hidden")
        }

        async function carregarGaleriaMenuCliente() {
          const track = document.getElementById("hero-track")
          const dots = document.getElementById("hero-dots")
          const prev = document.getElementById("hero-prev")
          const next = document.getElementById("hero-next")
          if (!track) return
          track.innerHTML = "<div class='hero-slide hero-slide-empty'>Carregando fotos...</div>"
          try {
            const snap = await getDocs(collection(db, "galeria"))
            const fotos: any[] = []
            snap.forEach((d: any) => fotos.push({ id: d.id, ...d.data() }))
            fotos.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
            if (fotos.length === 0) {
              track.innerHTML = "<div class='hero-slide hero-slide-empty'>Sem fotos ainda. Volte em breve.</div>"
              if (dots) dots.innerHTML = ""
              return
            }
            track.innerHTML = fotos.map(f => "<div class='hero-slide'><img src='" + (f.foto || "") + "' alt='' /></div>").join("")
            if (dots) dots.innerHTML = fotos.map((_, i) => "<div class='hero-dot" + (i === 0 ? " active" : "") + "' data-i='" + i + "'></div>").join("")
            const w = window as any
            w.heroIdx = 0
            w.heroTotal = fotos.length
            function go(i: number) {
              const nw = window as any
              nw.heroIdx = ((i % nw.heroTotal) + nw.heroTotal) % nw.heroTotal
              const t = document.getElementById("hero-track") as HTMLElement
              if (t) t.style.transform = "translateX(-" + (nw.heroIdx * 100) + "%)"
              document.querySelectorAll(".hero-dot").forEach((d, k) => d.classList.toggle("active", k === nw.heroIdx))
            }
            ;(window as any).heroGo = go
            prev?.addEventListener("click", () => go((w.heroIdx || 0) - 1))
            next?.addEventListener("click", () => go((w.heroIdx || 0) + 1))
            dots?.querySelectorAll(".hero-dot").forEach(d => {
              d.addEventListener("click", () => go(Number(d.getAttribute("data-i") || 0)))
            })
            // Autoplay a cada 5s
            if (w.heroAutoplayInt) clearInterval(w.heroAutoplayInt)
            w.heroAutoplayInt = setInterval(() => go((w.heroIdx || 0) + 1), 5000)
          } catch (e) {
            track.innerHTML = "<div class='hero-slide hero-slide-empty'>Erro ao carregar galeria.</div>"
          }
        }

        async function carregarGaleriaCompleta() {
          const grid = document.getElementById("galeria-grid")
          if (!grid) return
          grid.innerHTML = "<p style='grid-column: span 2; text-align:center; color:#65676b;'>Carregando...</p>"
          try {
            const snap = await getDocs(collection(db, "galeria"))
            const fotos: any[] = []
            snap.forEach((d: any) => fotos.push({ id: d.id, ...d.data() }))
            fotos.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
            if (fotos.length === 0) {
              grid.innerHTML = "<p style='grid-column: span 2; text-align:center; color:#65676b;'>Sem fotos ainda.</p>"
              return
            }
            grid.innerHTML = fotos.map(f =>
              "<div class='galeria-item'><img src='" + (f.foto || "") + "' alt='' /></div>"
            ).join("")
          } catch (e) {
            grid.innerHTML = "<p style='grid-column: span 2; text-align:center; color:#d90429;'>Erro ao carregar.</p>"
          }
        }

        function fileToDataURI(file: File, maxW: number = 1600): Promise<string> {
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const img = new Image()
              img.onload = () => {
                let w = img.width, h = img.height
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
                const canvas = document.createElement("canvas")
                canvas.width = w; canvas.height = h
                const ctx = canvas.getContext("2d")!
                ctx.drawImage(img, 0, 0, w, h)
                resolve(canvas.toDataURL("image/jpeg", 0.82))
              }
              img.onerror = reject
              img.src = String(reader.result)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        }

        async function carregarGaleriaAdmin() {
          const lista = document.getElementById("lista-galeria-admin")
          if (!lista) return
          lista.innerHTML = "<p style='grid-column: span 2; text-align:center; color:#65676b;'>Carregando...</p>"
          const snap = await getDocs(collection(db, "galeria"))
          const fotos: any[] = []
          snap.forEach((d: any) => fotos.push({ id: d.id, ...d.data() }))
          fotos.sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
          if (fotos.length === 0) {
            lista.innerHTML = "<p style='grid-column: span 2; text-align:center; color:#65676b;'>Nenhuma foto ainda.</p>"
            return
          }
          lista.innerHTML = fotos.map(f =>
            "<div class='galeria-item'><img src='" + (f.foto || "") + "' alt='' /><button class='del' data-id='" + f.id + "'>Excluir</button></div>"
          ).join("")
          lista.querySelectorAll(".del").forEach(b => {
            b.addEventListener("click", async (e: any) => {
              const id = e.target.getAttribute("data-id")
              if (!confirm("Excluir esta foto da galeria?")) return
              await deleteDoc(doc(db, "galeria", id))
              await carregarGaleriaAdmin()
            })
          })
        }

        async function carregarConfiguracaoAdmin() {
          ;(window as any).__carregarGaleriaMenuCliente = carregarGaleriaMenuCliente
          ;(window as any).__renderizarDatasEspeciais = renderizarDatasEspeciais
          await carregarGaleriaAdmin()
          try {
            const ref = doc(db, "configuracoes", "tema")
            const s = await getDoc(ref)
            if (s.exists()) {
              const t = s.data()
              const setV = (id: string, val: any) => { const el = document.getElementById(id) as any; if (el && val) el.value = val }
              setV("cfg-cor-primaria", t.cor_primaria)
              setV("cfg-cor-secundaria", t.cor_secundaria)
              setV("cfg-cor-botao", t.cor_botao)
              setV("cfg-cor-texto", t.cor_texto)
              setV("cfg-cor-fundo", t.cor_fundo)
              setV("cfg-fonte", t.fonte_familia)
              setV("cfg-fonte-tamanho", t.fonte_tamanho_base)
            }
          } catch (e) { console.error("[tema]", e) }
        }

        function aplicarTema(t: any) {
          const r = document.documentElement.style
          if (t.cor_primaria)   r.setProperty("--cor-primaria", t.cor_primaria)
          if (t.cor_secundaria) r.setProperty("--cor-secundaria", t.cor_secundaria)
          if (t.cor_botao)      r.setProperty("--cor-botao", t.cor_botao)
          if (t.cor_texto)      r.setProperty("--cor-texto", t.cor_texto)
          if (t.cor_fundo)      r.setProperty("--cor-fundo", t.cor_fundo)
          if (t.fonte_familia)  r.setProperty("--fonte-familia", t.fonte_familia)
          if (t.fonte_tamanho_base) r.setProperty("--fonte-tamanho-base", t.fonte_tamanho_base + "px")
        }

        async function carregarTemaAoIniciar() {
          try {
            const s = await getDoc(doc(db, "configuracoes", "tema"))
            if (s.exists()) aplicarTema(s.data())
          } catch {}
        }

        document.getElementById("btn-salvar-tema")?.addEventListener("click", async () => {
          const t = {
            cor_primaria: (document.getElementById("cfg-cor-primaria") as HTMLInputElement)?.value || "#002855",
            cor_secundaria: (document.getElementById("cfg-cor-secundaria") as HTMLInputElement)?.value || "#d90429",
            cor_botao: (document.getElementById("cfg-cor-botao") as HTMLInputElement)?.value || "#d90429",
            cor_texto: (document.getElementById("cfg-cor-texto") as HTMLInputElement)?.value || "#333333",
            cor_fundo: (document.getElementById("cfg-cor-fundo") as HTMLInputElement)?.value || "#f0f2f5",
            fonte_familia: (document.getElementById("cfg-fonte") as HTMLSelectElement)?.value || "sans-serif",
            fonte_tamanho_base: Number((document.getElementById("cfg-fonte-tamanho") as HTMLInputElement)?.value || "16"),
            atualizado_em: new Date().toISOString(),
          }
          await setDoc(doc(db, "configuracoes", "tema"), t, { merge: true })
          aplicarTema(t)
          alert("Aparência salva e aplicada.")
        })

        document.getElementById("btn-restaurar-tema")?.addEventListener("click", async () => {
          if (!confirm("Restaurar cores e fonte padrão?")) return
          const padrao = {
            cor_primaria: "#002855",
            cor_secundaria: "#d90429",
            cor_botao: "#d90429",
            cor_texto: "#333333",
            cor_fundo: "#f0f2f5",
            fonte_familia: "sans-serif",
            fonte_tamanho_base: 16,
          }
          const setV = (id: string, val: any) => { const el = document.getElementById(id) as any; if (el) el.value = val }
          setV("cfg-cor-primaria", padrao.cor_primaria)
          setV("cfg-cor-secundaria", padrao.cor_secundaria)
          setV("cfg-cor-botao", padrao.cor_botao)
          setV("cfg-cor-texto", padrao.cor_texto)
          setV("cfg-cor-fundo", padrao.cor_fundo)
          setV("cfg-fonte", padrao.fonte_familia)
          setV("cfg-fonte-tamanho", padrao.fonte_tamanho_base)
          await setDoc(doc(db, "configuracoes", "tema"), padrao, { merge: true })
          aplicarTema(padrao)
        })

        document.getElementById("btn-add-galeria")?.addEventListener("click", async () => {
          const inp = document.getElementById("galeria-file") as HTMLInputElement
          const tit = document.getElementById("galeria-titulo") as HTMLInputElement
          if (!inp?.files?.[0]) { alert("Escolha uma foto do seu celular/tablet."); return }
          const btn = document.getElementById("btn-add-galeria") as HTMLButtonElement
          btn.disabled = true; btn.innerText = "Processando..."
          try {
            const dataUri = await fileToDataURI(inp.files[0], 1600)
            const nowOrder = Date.now()
            await addDoc(collection(db, "galeria"), {
              foto: dataUri,
              titulo: tit?.value || "",
              ordem: nowOrder,
              criado_em: new Date().toISOString(),
            })
            inp.value = ""; if (tit) tit.value = ""
            await carregarGaleriaAdmin()
            alert("Foto adicionada!")
          } catch (e: any) {
            alert("Erro ao adicionar foto: " + (e?.message || e))
          } finally {
            btn.disabled = false; btn.innerText = "Adicionar à Galeria"
          }
        })

        // ============ DATAS ESPECIAIS ============
        function renderizarDatasEspeciais() {
          const cont = document.getElementById("lista-datas-especiais")
          if (!cont) return
          const custom = (configFuncionamento as any).datas_customizadas || {}
          const chaves = Object.keys(custom).sort()
          if (chaves.length === 0) { cont.innerHTML = "<p style='color:#65676b; font-size:12px;'>Nenhuma data especial cadastrada.</p>"; return }
          cont.innerHTML = chaves.map(k => {
            const d = custom[k]
            const label = d.fechado ? "FECHADO" : "Aberto " + (d.abertura || "") + "-" + (d.fechamento || "")
            const motivo = d.motivo ? " · " + d.motivo : ""
            return "<div class='esp-item'><span>" + k.split('-').reverse().join('/') + " · " + label + motivo + "</span><button data-k='" + k + "'>Remover</button></div>"
          }).join("")
          cont.querySelectorAll(".esp-item button").forEach(b => {
            b.addEventListener("click", async (e: any) => {
              const k = e.target.getAttribute("data-k")
              const custom = (configFuncionamento as any).datas_customizadas || {}
              delete custom[k]
              ;(configFuncionamento as any).datas_customizadas = custom
              await persistirConfigFuncionamento()
              renderizarDatasEspeciais()
            })
          })
        }

        document.getElementById("btn-salvar-data-especial")?.addEventListener("click", async () => {
          const data = (document.getElementById("esp-data") as HTMLInputElement)?.value
          const modo = (document.getElementById("esp-modo") as HTMLSelectElement)?.value
          const ab = (document.getElementById("esp-abertura") as HTMLInputElement)?.value
          const fe = (document.getElementById("esp-fechamento") as HTMLInputElement)?.value
          const mot = (document.getElementById("esp-motivo") as HTMLInputElement)?.value
          if (!data) { alert("Escolha a data."); return }
          const custom = (configFuncionamento as any).datas_customizadas || {}
          custom[data] = modo === "fechado"
            ? { fechado: true, motivo: mot || "" }
            : { fechado: false, abertura: ab || "09:00", fechamento: fe || "18:00", motivo: mot || "" }
          ;(configFuncionamento as any).datas_customizadas = custom
          await persistirConfigFuncionamento()
          renderizarDatasEspeciais()
          alert("Data especial salva.")
        })

        // Upload de foto para SERVIÇO
        document.getElementById("novo-serv-foto-file")?.addEventListener("change", async (e: any) => {
          const file = e.target.files?.[0]
          if (!file) return
          const dataUri = await fileToDataURI(file, 900)
          ;(window as any).novoServicoFotoDataUri = dataUri
          const prev = document.getElementById("novo-serv-foto-preview") as HTMLImageElement
          if (prev) { prev.src = dataUri; prev.classList.remove("hidden") }
        })

        // Upload de foto para PRODUTO
        document.getElementById("novo-prod-foto-file")?.addEventListener("change", async (e: any) => {
          const file = e.target.files?.[0]
          if (!file) return
          const dataUri = await fileToDataURI(file, 900)
          ;(window as any).novoProdutoFotoDataUri = dataUri
          const prev = document.getElementById("novo-prod-foto-preview") as HTMLImageElement
          if (prev) { prev.src = dataUri; prev.classList.remove("hidden") }
        })

        // Expõe funções para uso em outros escopos (menu principal, admin, bootstrap)
        ;(window as any).__carregarGaleriaMenuCliente = carregarGaleriaMenuCliente
        ;(window as any).__carregarGaleriaCompleta = carregarGaleriaCompleta
        ;(window as any).__renderizarDatasEspeciais = renderizarDatasEspeciais
        ;(window as any).__carregarTemaAoIniciar = carregarTemaAoIniciar
        ;(window as any).__aplicarTema = aplicarTema

        document.getElementById("btn-abrir-admin")?.addEventListener("click", () => {
          const passe = prompt("Digite a senha de acesso gerencial:")
          if (passe === "77186800") {
            document.getElementById("tela-login")?.classList.add("hidden")
            document.getElementById("tela-admin")?.classList.remove("hidden")
            carregarAgendaAdmin()
          } else {
            alert("Senha incorreta!")
          }
        })

        document.getElementById("btn-sair-admin")?.addEventListener("click", () => {
          document.getElementById("tela-admin")?.classList.add("hidden")
          document.getElementById("tela-login")?.classList.remove("hidden")
        })

        // Ordem solicitada: Agenda, Caixa, Clientes, Clube, Serviços, Produtos, Horários, Configuração
        const abas = [
          "tab-agenda",
          "tab-financeiro-admin",
          "tab-clientes",
          "tab-clube-admin",
          "tab-servicos-admin",
          "tab-produtos-admin",
          "tab-horarios-admin",
          "tab-configuracao-admin",
        ]
        const conteudos = [
          "conteudo-admin-agenda",
          "conteudo-admin-financeiro",
          "conteudo-admin-clientes",
          "conteudo-admin-clube",
          "conteudo-admin-servicos",
          "conteudo-admin-produtos",
          "conteudo-admin-horarios",
          "conteudo-admin-configuracao",
        ]

        abas.forEach((abaId, index) => {
          document.getElementById(abaId)?.addEventListener("click", () => {
            abas.forEach((id) => document.getElementById(id)?.classList.remove("active"))
            conteudos.forEach((id) => document.getElementById(id)?.classList.add("hidden"))

            document.getElementById(abaId)?.classList.add("active")
            document.getElementById(conteudos[index])?.classList.remove("hidden")

            if (abaId === "tab-agenda") carregarAgendaAdmin()
            if (abaId === "tab-clientes") carregarClientesAdmin()
            if (abaId === "tab-clube-admin") carregarClubeAdmin()
            if (abaId === "tab-servicos-admin") carregarServicosEditorAdmin()
            if (abaId === "tab-horarios-admin") carregarConfigHorariosAdmin()
            if (abaId === "tab-financeiro-admin") carregarFinanceiroAdmin()
            if (abaId === "tab-produtos-admin") carregarProdutosEditorAdmin()
            if (abaId === "tab-configuracao-admin") carregarConfiguracaoAdmin()
          })
        })

        document.getElementById("busca-cliente")?.addEventListener("input", (e) => {
          renderizarClientes((e.target as HTMLInputElement).value)
        })

        document.getElementById("btn-salvar-horarios")?.addEventListener("click", salvarConfigHorarios)

        const btnBloquearDia = document.getElementById("btn-bloquear-dia")
        if (btnBloquearDia) {
          btnBloquearDia.addEventListener("click", async () => {
            const dataInput = document.getElementById("input-bloquear-dia") as HTMLInputElement
            const dataBloq = dataInput?.value || ""
            if (!dataBloq) {
              alert("Selecione uma data para bloquear!")
              return
            }
            if (configFuncionamento.diasBloqueados.includes(dataBloq)) {
              alert("Esse dia já está bloqueado.")
              return
            }
            configFuncionamento.diasBloqueados.push(dataBloq)
            btnBloquearDia.innerText = "Bloqueando..."
            try {
              await persistirConfigFuncionamento()
              dataInput.value = ""
              renderizarDiasBloqueados()
            } catch (e) {
              alert("Erro ao bloquear o dia.")
            } finally {
              btnBloquearDia.innerText = "Bloquear Dia (Férias/Feriado)"
            }
          })
        }

        document.getElementById("filtro-data-admin")?.addEventListener("change", carregarAgendaAdmin)

        const btnSalvarEncaixe = document.getElementById("btn-salvar-encaixe")
        if (btnSalvarEncaixe) {
          btnSalvarEncaixe.addEventListener("click", async () => {
            const nome = (document.getElementById("encaixe-nome") as HTMLInputElement)?.value.trim() || ""
            const serv = (document.getElementById("encaixe-servico") as HTMLInputElement)?.value.trim() || ""
            const hora = (document.getElementById("encaixe-hora") as HTMLInputElement)?.value.trim() || ""
            const preco = (document.getElementById("encaixe-preco") as HTMLInputElement)?.value.trim() || ""
            const dataFiltro = (document.getElementById("filtro-data-admin") as HTMLInputElement)?.value || ""

            if (!nome || !serv || !hora) {
              alert("Preencha Nome, Serviço e Hora!")
              return
            }
            try {
              await addDoc(collection(db, "agendamentos"), {
                cliente_nome: nome,
                cliente_apelido: "Encaixe",
                cliente_telefone: "Painel",
                data: dataFiltro,
                horario: hora,
                servico: serv,
                preco_total: parseFloat(preco) || 0,
                duracao_total: 30,
                criado_em: new Date().toISOString(),
              })
              ;(document.getElementById("encaixe-nome") as HTMLInputElement).value = ""
              ;(document.getElementById("encaixe-servico") as HTMLInputElement).value = ""
              ;(document.getElementById("encaixe-hora") as HTMLInputElement).value = ""
              ;(document.getElementById("encaixe-preco") as HTMLInputElement).value = ""
              carregarAgendaAdmin()
            } catch (e) {
              alert("Erro ao fazer encaixe.")
            }
          })
        }

        const btnCadastrarServico = document.getElementById("btn-cadastrar-servico")
        if (btnCadastrarServico) {
          btnCadastrarServico.addEventListener("click", async () => {
            const nome = (document.getElementById("novo-serv-nome") as HTMLInputElement)?.value.trim() || ""
            const preco = parseFloat((document.getElementById("novo-serv-preco") as HTMLInputElement)?.value) || 0
            const tempo = (document.getElementById("novo-serv-tempo") as HTMLInputElement)?.value.trim() || ""
            const fotoURL = (document.getElementById("novo-serv-foto") as HTMLInputElement)?.value.trim() || ""
            const fotoUploaded = (window as any).novoServicoFotoDataUri || ""
            const foto = fotoUploaded || fotoURL

            if (!nome || preco <= 0 || !tempo) {
              alert("Preencha todos os campos!")
              return
            }
            btnCadastrarServico.innerText = "Cadastrando..."
            try {
              await addDoc(collection(db, "servicos"), { nome, preco, duracao: tempo, foto })
              ;(document.getElementById("novo-serv-nome") as HTMLInputElement).value = ""
              ;(document.getElementById("novo-serv-preco") as HTMLInputElement).value = ""
              ;(document.getElementById("novo-serv-tempo") as HTMLInputElement).value = ""
              ;(document.getElementById("novo-serv-foto") as HTMLInputElement).value = ""
              ;(document.getElementById("novo-serv-foto-file") as HTMLInputElement).value = ""
              document.getElementById("novo-serv-foto-preview")?.classList.add("hidden")
              ;(window as any).novoServicoFotoDataUri = ""
              alert("Novo serviço adicionado!")
              await carregarServicosEditorAdmin()
            } catch (e) {
              alert("Erro ao salvar.")
            } finally {
              btnCadastrarServico.innerText = "Cadastrar Serviço"
            }
          })
        }

        document.querySelectorAll(".plan-card").forEach((card) => {
          card.addEventListener("click", () => {
            document.querySelectorAll(".plan-card").forEach((c) => c.classList.remove("selected"))
            card.classList.add("selected")
            planoClubeSelecionado = {
              nome: card.getAttribute("data-plano") || "",
              valor: card.getAttribute("data-valor") || "",
            }
          })
        })

        // ===== FINANCEIRO / CAIXA =====
        document.getElementById("filtro-data-financeiro")?.addEventListener("change", carregarFinanceiroAdmin)

        const btnAddEntrada = document.getElementById("btn-add-entrada")
        if (btnAddEntrada) {
          btnAddEntrada.addEventListener("click", async () => {
            const desc = (document.getElementById("mov-entrada-desc") as HTMLInputElement)?.value.trim() || ""
            const valor = parseFloat((document.getElementById("mov-entrada-valor") as HTMLInputElement)?.value) || 0
            const dataFin = (document.getElementById("filtro-data-financeiro") as HTMLInputElement)?.value || ""
            if (!desc || valor <= 0) {
              alert("Preencha a descrição e um valor válido!")
              return
            }
            btnAddEntrada.innerText = "Salvando..."
            try {
              await addDoc(collection(db, "caixa_movimentacoes"), {
                tipo: "entrada",
                descricao: desc,
                valor: valor,
                data: dataFin,
                criado_em: new Date().toISOString(),
              })
              ;(document.getElementById("mov-entrada-desc") as HTMLInputElement).value = ""
              ;(document.getElementById("mov-entrada-valor") as HTMLInputElement).value = ""
              await carregarFinanceiroAdmin()
            } catch (e) {
              alert("Erro ao salvar entrada.")
            } finally {
              btnAddEntrada.innerText = "Adicionar Entrada Manual"
            }
          })
        }

        const btnAddSangria = document.getElementById("btn-add-sangria")
        if (btnAddSangria) {
          btnAddSangria.addEventListener("click", async () => {
            const desc = (document.getElementById("mov-sangria-desc") as HTMLInputElement)?.value.trim() || ""
            const valor = parseFloat((document.getElementById("mov-sangria-valor") as HTMLInputElement)?.value) || 0
            const dataFin = (document.getElementById("filtro-data-financeiro") as HTMLInputElement)?.value || ""
            if (!desc || valor <= 0) {
              alert("Preencha a descrição e um valor válido!")
              return
            }
            btnAddSangria.innerText = "Salvando..."
            try {
              await addDoc(collection(db, "caixa_movimentacoes"), {
                tipo: "saida",
                descricao: desc,
                valor: valor,
                data: dataFin,
                criado_em: new Date().toISOString(),
              })
              ;(document.getElementById("mov-sangria-desc") as HTMLInputElement).value = ""
              ;(document.getElementById("mov-sangria-valor") as HTMLInputElement).value = ""
              await carregarFinanceiroAdmin()
            } catch (e) {
              alert("Erro ao registrar retirada.")
            } finally {
              btnAddSangria.innerText = "Registrar Retirada/Sangria"
            }
          })
        }

        // ===== GERENCIAR PRODUTOS =====
        const btnCadastrarProduto = document.getElementById("btn-cadastrar-produto")
        if (btnCadastrarProduto) {
          btnCadastrarProduto.addEventListener("click", async () => {
            const nome = (document.getElementById("novo-prod-nome") as HTMLInputElement)?.value.trim() || ""
            const preco = parseFloat((document.getElementById("novo-prod-preco") as HTMLInputElement)?.value) || 0
            const fotoURL = (document.getElementById("novo-prod-foto") as HTMLInputElement)?.value.trim() || ""
            const fotoUploaded = (window as any).novoProdutoFotoDataUri || ""
            const foto = fotoUploaded || fotoURL
            const descricao = (document.getElementById("novo-prod-desc") as HTMLInputElement)?.value.trim() || ""

            if (!nome || preco <= 0) {
              alert("Preencha ao menos o nome e o preço do produto!")
              return
            }
            btnCadastrarProduto.innerText = "Cadastrando..."
            try {
              await addDoc(collection(db, "produtos"), { nome, preco, foto, descricao })
              ;(document.getElementById("novo-prod-nome") as HTMLInputElement).value = ""
              ;(document.getElementById("novo-prod-preco") as HTMLInputElement).value = ""
              ;(document.getElementById("novo-prod-foto") as HTMLInputElement).value = ""
              ;(document.getElementById("novo-prod-foto-file") as HTMLInputElement).value = ""
              document.getElementById("novo-prod-foto-preview")?.classList.add("hidden")
              ;(window as any).novoProdutoFotoDataUri = ""
              ;(document.getElementById("novo-prod-desc") as HTMLInputElement).value = ""
              alert("Novo produto adicionado!")
              await carregarProdutosEditorAdmin()
            } catch (e) {
              alert("Erro ao salvar produto.")
            } finally {
              btnCadastrarProduto.innerText = "Cadastrar Produto"
            }
          })
        }

        // ===== GERENCIAR MEMBROS DO CLUBE (ADMIN) =====
        const btnAddMembro = document.getElementById("btn-add-membro")
        if (btnAddMembro) {
          btnAddMembro.addEventListener("click", async () => {
            const nome = (document.getElementById("membro-nome") as HTMLInputElement)?.value.trim() || ""
            const telBruto = (document.getElementById("membro-telefone") as HTMLInputElement)?.value.trim() || ""
            const categoria = (document.getElementById("membro-categoria") as HTMLSelectElement)?.value || "Bronze"
            const tel = telBruto.replace(/\D/g, "")
            if (!nome || tel.length < 10) {
              alert("Preencha o nome e um WhatsApp válido com DDD!")
              return
            }
            btnAddMembro.innerText = "Salvando..."
            try {
              await setDoc(doc(db, "membros_clube", tel), {
                telefone: tel,
                nome,
                apelido: nome,
                categoria,
                criado_em: new Date().toISOString(),
              })
              ;(document.getElementById("membro-nome") as HTMLInputElement).value = ""
              ;(document.getElementById("membro-telefone") as HTMLInputElement).value = ""
              alert(`${nome} foi adicionado ao Clube na categoria ${categoria}!`)
              await carregarMembrosClubeAdmin()
            } catch (e) {
              alert("Erro ao adicionar membro.")
            } finally {
              btnAddMembro.innerText = "Adicionar Membro"
            }
          })
        }
      }

      function abrirMenuPrincipal() {
        document.getElementById("tela-login")?.classList.add("hidden")
        document.getElementById("tela-cadastro")?.classList.add("hidden")
        document.getElementById("tela-servicos")?.classList.add("hidden")
        document.getElementById("tela-clube")?.classList.add("hidden")
        document.getElementById("tela-meus-horarios")?.classList.add("hidden")
        document.getElementById("tela-produtos")?.classList.add("hidden")
        document.getElementById("tela-galeria")?.classList.add("hidden")
        document.getElementById("tela-agenda")?.classList.add("hidden")
        document.getElementById("tela-sucesso")?.classList.add("hidden")
        document.getElementById("tela-pagamento")?.classList.add("hidden")
        document.getElementById("tela-pix")?.classList.add("hidden")
        document.getElementById("tela-menu")?.classList.remove("hidden")
        const saudacao = document.getElementById("saudacao-menu")
        if (saudacao) saudacao.innerText = `Olá, ${clienteApelido}! 👋`
        // Carrossel de trabalhos
        try {
          const fn = (window as any).__carregarGaleriaMenuCliente
          if (typeof fn === "function") fn()
        } catch {}
      }

      async function carregarHorariosCliente() {
        const container = document.getElementById("lista-horarios-cliente")
        if (!container) return
        container.innerHTML = "<p style='color: #65676b; text-align:center;'>Buscando seus horários...</p>"
        try {
          const q = query(collection(db, "agendamentos"), where("cliente_telefone", "==", clienteTelefone))
          const querySnapshot = await getDocs(q)
          container.innerHTML = ""
          if (querySnapshot.empty) {
            container.innerHTML =
              "<p style='color: #8d949e; text-align:center; margin-top:20px;'>Você não possui horários agendados.</p>"
            return
          }
          const agendamentos: any[] = []
          querySnapshot.forEach((docSnap: any) => {
            agendamentos.push({ id: docSnap.id, ...docSnap.data() })
          })
          agendamentos.sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`))

          agendamentos.forEach((agenda) => {
            const [ano, mes, dia] = agenda.data.split("-")
            const div = document.createElement("div")
            div.className = "item-agenda"
            div.innerHTML = `
              <div class="hora-admin">📅 ${dia}/${mes}/${ano} às ${agenda.horario}</div>
              <div style="margin-top: 4px;"><b>Serviço:</b> ${agenda.servico}</div>
              <div style="color: #002855; font-weight: bold; margin-top: 2px;">Valor: R$ ${Number(agenda.preco_total || 0).toFixed(2).replace(".", ",")}</div>
              <button class="btn-deletar" data-id="${agenda.id}" data-data="${agenda.data}" data-horario="${agenda.horario}">❌ Cancelar</button>
            `
            const btnDeletar = div.querySelector(".btn-deletar")
            if (btnDeletar) {
              btnDeletar.addEventListener("click", async (e) => {
                const target = e.target as HTMLElement
                const idAgendamento = target.getAttribute("data-id")
                const dataAgendada = target.getAttribute("data-data")
                const horarioAgendada = target.getAttribute("data-horario")
                const agora = new Date()
                const [anoA, mesA, diaA] = (dataAgendada || "").split("-")
                const [horaA, minA] = (horarioAgendada || "").split(":")
                const dataHoraAgendamento = new Date(
                  Number(anoA),
                  Number(mesA) - 1,
                  Number(diaA),
                  Number(horaA),
                  Number(minA),
                  0
                )
                const diferencaHoras = (dataHoraAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60)

                if (diferencaHoras < 0) {
                  alert("Esse horário já passou.")
                  return
                }
                if (diferencaHoras < 2) {
                  alert("Cancelamentos apenas com 2h de antecedência. Fale com o Hiroschi.")
                  return
                }

                if (confirm("Deseja cancelar esse agendamento?")) {
                  await deleteDoc(doc(db, "agendamentos", idAgendamento))
                  alert("Agendamento cancelado!")
                  carregarHorariosCliente()
                }
              })
            }
            container.appendChild(div)
          })
        } catch (e) {
          container.innerHTML = "<p style='color: #d90429; text-align:center;'>Erro ao carregar.</p>"
        }
      }

      function initializeListaServicos(preservarSelecao = false) {
        const sLista = document.getElementById("lista-servicos")
        if (!sLista) return
        sLista.innerHTML = ""
        if (!preservarSelecao) {
          servicosSelecionados = []
        }
        atualizarResumoServicos()

        if (listaServicosLocal.length === 0) {
          sLista.innerHTML = "<p style='color:#8d949e; text-align:center;'>Nenhum serviço cadastrado.</p>"
          return
        }

        listaServicosLocal.forEach((s) => {
          const div = document.createElement("div")
          div.className = "card"
          div.id = `serv-${s.id}`
          const fotoHtml = s.foto
            ? `<img src="${s.foto}" alt="${s.nome}" class="card-foto" crossorigin="anonymous" />`
            : ""
          div.innerHTML = `
            <div class="card-info">
              ${fotoHtml}
              <div>
                <div class="card-name">${s.nome}</div>
                <div class="card-duration">⏱️ Tempo: ${s.duracao || "30 min"}</div>
              </div>
            </div>
            <div class="card-price">R$ ${Number(s.preco).toFixed(2).replace(".", ",")}</div>
          `
          if (servicosSelecionados.some((item) => item.id === s.id)) {
            div.classList.add("selected")
          }
          div.onclick = () => {
            const index = servicosSelecionados.findIndex((item) => item.id === s.id)
            if (index > -1) {
              servicosSelecionados.splice(index, 1)
              div.classList.remove("selected")
            } else {
              servicosSelecionados.push(s)
              div.classList.add("selected")
            }
            atualizarResumoServicos()
          }
          sLista.appendChild(div)
        })
      }

      // Helper: verifica se o serviço específico é ISENTO para o cliente-membro na data selecionada
      // Regras:
      //  - Cliente precisa ser membro ativo do Clube
      //  - Dia da semana precisa ser Terça (2), Quarta (3) ou Quinta (4)
      //  - Serviço precisa estar em servicos_incluidos do membro (se lista existir) OU
      //    fallback: cliente é membro e não tem lista específica → todos os serviços são incluídos
      function servicoIsentoNoDia(servicoNome: string, dataStr: string) {
        if (!clienteEhMembroClube) return false
        if (!dataStr) return false
        const partes = dataStr.split("-")
        const dia = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])).getDay()
        if (![2, 3, 4].includes(dia)) return false
        const w = window as any
        const incluidos: string[] = Array.isArray(w.clienteServicosIncluidos) ? w.clienteServicosIncluidos : []
        if (incluidos.length === 0) return true // fallback retrocompatível
        const alvo = (servicoNome || "").trim().toLowerCase()
        return incluidos.some(s => (s || "").trim().toLowerCase() === alvo)
      }

      function precoServicoParaCliente(s: any, dataStr: string) {
        return servicoIsentoNoDia(s?.nome || "", dataStr) ? 0 : Number(s?.preco || 0)
      }

      function atualizarResumoServicos() {
        const dataSel = (document.getElementById("input-data") as HTMLInputElement)?.value || ""
        const total = servicosSelecionados.reduce(
          (acc, curr) => acc + precoServicoParaCliente(curr, dataSel),
          0
        )
        const resumoQtd = document.getElementById("resumo-qtd")
        const resumoTotal = document.getElementById("resumo-total")
        if (resumoQtd) resumoQtd.innerText = String(servicosSelecionados.length)
        if (resumoTotal) resumoTotal.innerText = `R$ ${total.toFixed(2).replace(".", ",")}`
      }

      function validarDiaSemana(dataString: string) {
        if (!dataString) return false
        const partes = dataString.split("-")
        const diaSemana = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])).getDay()
        const cfg = configFuncionamento.horarios[String(diaSemana)]
        if (!cfg || cfg.fechado) {
          alert("A barbearia não funciona neste dia da semana.")
          return false
        }
        // Regra do Clube do Hiroschi:
        //  - Terça (2), Quarta (3) e Quinta (4): serviços incluídos ficam ISENTOS
        //  - Sexta/Sábado: agendamento permitido, mas com preço NORMAL (sem consumir benefício)
        if (configFuncionamento.diasBloqueados.includes(dataString)) {
          alert("Este dia está bloqueado (Férias/Feriado). Escolha outra data.")
          return false
        }
        return true
      }

      function converterHoraParaMinutos(stringHora: string) {
        const [horas, minutos] = stringHora.split(":").map(Number)
        return horas * 60 + minutos
      }

      // Extrai a quantidade de minutos de uma string de duração (ex: "30 min", "1h", "45")
      function parseDuracaoMinutos(stringDuracao: string) {
        if (!stringDuracao) return 30
        const texto = String(stringDuracao).toLowerCase()
        let total = 0
        const matchHoras = texto.match(/(\d+)\s*h/)
        if (matchHoras) total += Number(matchHoras[1]) * 60
        const matchMin = texto.match(/(\d+)\s*m/)
        if (matchMin) total += Number(matchMin[1])
        // Se não achou padrão (ex: só "30"), tenta o primeiro número como minutos
        if (total === 0) {
          const soNumero = texto.match(/(\d+)/)
          if (soNumero) total = Number(soNumero[1])
        }
        return total > 0 ? total : 30
      }

      // Soma a duração total (em minutos) dos serviços selecionados
      function calcularDuracaoTotalSelecionada() {
        const total = servicosSelecionados.reduce(
          (acc, curr) => acc + parseDuracaoMinutos(curr.duracao || "30 min"),
          0
        )
        return total > 0 ? total : 30
      }

      async function atualizarHorariosDisponiveis() {
        const container = document.getElementById("container-horarios")
        const aviso = document.getElementById("aviso-restricao")
        if (!container) return
        container.innerHTML =
          "<p style='color: #65676b; grid-column: span 3; text-align:center;'>Buscando...</p>"
        const dataSelecionada = (document.getElementById("input-data") as HTMLInputElement)?.value || ""
        horarioSelecionado = null

        const ehNevou = servicosSelecionados.some((s) => s.nome.includes("Nevou"))
        if (ehNevou) aviso?.classList.remove("hidden")
        else aviso?.classList.add("hidden")

        // Verifica se o dia está bloqueado (Férias/Feriado)
        if (configFuncionamento.diasBloqueados.includes(dataSelecionada)) {
          container.innerHTML =
            "<p style='color: #d90429; grid-column: span 3; text-align:center; font-weight:bold;'>Dia bloqueado (Férias/Feriado). Escolha outra data.</p>"
          return
        }

        // Verifica se há data especial (customizada) — sobrepõe o horário semanal
        const datasCustom = (configFuncionamento as any).datas_customizadas || {}
        const custom = datasCustom[dataSelecionada]
        if (custom && custom.fechado) {
          container.innerHTML =
            "<p style='color: #d90429; grid-column: span 3; text-align:center; font-weight:bold;'>Fechado nesta data (" + (custom.motivo || "data especial") + "). Escolha outra.</p>"
          return
        }

        // Gera os horários conforme a configuração do dia da semana selecionado
        const [anoCfg, mesCfg, diaCfg] = dataSelecionada.split("-")
        const diaSemanaSel = new Date(Number(anoCfg), Number(mesCfg) - 1, Number(diaCfg)).getDay()
        let cfgDia = configFuncionamento.horarios[String(diaSemanaSel)]
        if (custom && !custom.fechado) {
          cfgDia = { fechado: false, abertura: custom.abertura || "09:00", fechamento: custom.fechamento || "18:00" }
        }
        if (!cfgDia || cfgDia.fechado) {
          container.innerHTML =
            "<p style='color: #d90429; grid-column: span 3; text-align:center; font-weight:bold;'>Fechado neste dia da semana.</p>"
          return
        }
        // Restrição para membros do Clube: sem bloqueio de dia.
        // Sex/Sab é permitido (paga preço normal, sem consumir benefício do clube).
        const horariosDoDia = gerarHorarios(cfgDia.abertura, cfgDia.fechamento)

        try {
          const q = query(collection(db, "agendamentos"), where("data", "==", dataSelecionada))
          const querySnapshot = await getDocs(q)

          // Monta os intervalos ocupados [inicio, fim) em minutos, considerando a
          // duração de cada serviço já agendado (bloqueio por tempo de serviço).
          // Ignora agendamentos com status "Cancelado" e reservas Pix cujo prazo já expirou.
          const nowMs = Date.now()
          const intervalosOcupados: { inicio: number; fim: number }[] = []
          querySnapshot.forEach((docSnap: any) => {
            const ag = docSnap.data()
            if (!ag.horario) return
            if (ag.status === "Cancelado") return
            if (ag.status === "reservado_pix" && ag.reserva_expira_em &&
                new Date(ag.reserva_expira_em).getTime() < nowMs) return
            const inicio = converterHoraParaMinutos(ag.horario)
            const duracao = Number(ag.duracao_total) > 0 ? Number(ag.duracao_total) : 30
            intervalosOcupados.push({ inicio, fim: inicio + duracao })
          })

          // Duração do serviço que o cliente está agendando agora
          const duracaoNova = calcularDuracaoTotalSelecionada()

          // Antecedência mínima de 6 horas
          const agora = new Date()
          const limiteAntecedencia = new Date(agora.getTime() + 6 * 60 * 60 * 1000)
          const [anoSel, mesSel, diaSel] = dataSelecionada.split("-")

          container.innerHTML = ""
          horariosDoDia.forEach((hora) => {
            const btn = document.createElement("div")
            btn.className = "btn-horario"
            btn.innerText = hora

            const inicioNovo = converterHoraParaMinutos(hora)
            const fimNovo = inicioNovo + duracaoNova

            // 1) Verifica conflito com algum intervalo ocupado (sobreposição)
            const temConflito = intervalosOcupados.some(
              (iv) => inicioNovo < iv.fim && fimNovo > iv.inicio
            )

            // 2) Verifica antecedência mínima de 6 horas
            const dataHoraSlot = new Date(
              Number(anoSel),
              Number(mesSel) - 1,
              Number(diaSel),
              Math.floor(inicioNovo / 60),
              inicioNovo % 60,
              0
            )
            const foraAntecedencia = dataHoraSlot.getTime() < limiteAntecedencia.getTime()

            // 3) Restrição especial do serviço "Nevou" após 17:00
            const restricaoNevou = ehNevou && inicioNovo > converterHoraParaMinutos("17:00")

            if (temConflito || foraAntecedencia || restricaoNevou) {
              btn.classList.add("ocupado")
            } else {
              btn.onclick = () => {
                document.querySelectorAll(".btn-horario").forEach((b) => b.classList.remove("selected"))
                btn.classList.add("selected")
                horarioSelecionado = hora
              }
            }
            container.appendChild(btn)
          })
        } catch (e) {
          container.innerHTML = "<p style='color: #d90429;'>Erro ao processar horários.</p>"
        }
      }

      async function carregarAgendaAdmin() {
        const lista = document.getElementById("lista-agendamentos-admin")
        const dataFiltro = (document.getElementById("filtro-data-admin") as HTMLInputElement)?.value || ""
        if (!lista) return
        lista.innerHTML = "Carregando..."

        try {
          const q = query(collection(db, "agendamentos"), where("data", "==", dataFiltro))
          const snap = await getDocs(q)
          lista.innerHTML = ""
          if (snap.empty) {
            lista.innerHTML =
              "<p style='text-align:center; color:#8d949e; font-size:13px;'>Nenhum horário marcado.</p>"
            return
          }

          // Coleta e ordena estritamente por horário (do mais cedo para o mais tarde)
          const agendamentosAdmin: any[] = []
          snap.forEach((docSnap: any) => {
            agendamentosAdmin.push({ id: docSnap.id, ...docSnap.data() })
          })
          agendamentosAdmin.sort(
            (a, b) => converterHoraParaMinutos(a.horario || "00:00") - converterHoraParaMinutos(b.horario || "00:00")
          )

          agendamentosAdmin.forEach((ag) => {
            const div = document.createElement("div")
            div.className = "item-agenda"
            const confirmado = ag.status === "Confirmado"
            if (confirmado) div.classList.add("confirmado")
            const fimMin = converterHoraParaMinutos(ag.horario || "00:00") + (Number(ag.duracao_total) || 30)
            const fimHora = `${String(Math.floor(fimMin / 60)).padStart(2, "0")}:${String(fimMin % 60).padStart(2, "0")}`
            div.innerHTML = `
              <div class="hora-admin">⏱️ ${ag.horario} - ${fimHora}</div>
              <div><b>Cliente:</b> ${ag.cliente_nome} (${ag.cliente_apelido})</div>
              <div><b>Serviço:</b> ${ag.servico}</div>
              ${confirmado ? '<div class="tag-confirmado">✓ Presença Confirmada</div>' : ""}
              <div class="btn-acoes-agenda">
                <button class="btn-confirmar-presenca" data-id="${ag.id}">${confirmado ? "Desfazer Confirmação" : "Confirmar Presença"}</button>
                <button class="btn-remover-agenda" data-id="${ag.id}">Remover</button>
              </div>
            `
            const btnConfirmar = div.querySelector(".btn-confirmar-presenca")
            if (btnConfirmar) {
              btnConfirmar.addEventListener("click", async (e) => {
                const target = e.target as HTMLElement
                const idDoc = target.getAttribute("data-id") || ""
                try {
                  await updateDoc(doc(db, "agendamentos", idDoc), {
                    status: confirmado ? "Agendado" : "Confirmado",
                  })
                  carregarAgendaAdmin()
                } catch (err) {
                  alert("Erro ao atualizar o status.")
                }
              })
            }
            const btnDeletar = div.querySelector(".btn-remover-agenda")
            if (btnDeletar) {
              btnDeletar.addEventListener("click", async (e) => {
                const target = e.target as HTMLElement
                if (confirm("Deseja remover esse horário?")) {
                  await deleteDoc(doc(db, "agendamentos", target.getAttribute("data-id")))
                  carregarAgendaAdmin()
                }
              })
            }
            lista.appendChild(div)
          })
        } catch (e) {
          lista.innerHTML = "Erro ao buscar agenda."
        }
      }

      let listaClientesLocal: any[] = []

      async function carregarClientesAdmin() {
        const lista = document.getElementById("lista-clientes-admin")
        if (!lista) return
        lista.innerHTML = "Buscando..."
        try {
          const snap = await getDocs(collection(db, "clientes"))
          listaClientesLocal = []
          snap.forEach((docSnap: any) => {
            listaClientesLocal.push({ id: docSnap.id, ...docSnap.data() })
          })
          listaClientesLocal.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
          const inputBusca = document.getElementById("busca-cliente") as HTMLInputElement
          renderizarClientes(inputBusca?.value || "")
        } catch (e) {
          lista.innerHTML = "Erro."
        }
      }

      function renderizarClientes(filtro: string) {
        const lista = document.getElementById("lista-clientes-admin")
        if (!lista) return
        lista.innerHTML = ""

        const termo = filtro.trim().toLowerCase()
        const filtrados = termo
          ? listaClientesLocal.filter(
              (c) =>
                (c.nome || "").toLowerCase().includes(termo) ||
                (c.apelido || "").toLowerCase().includes(termo)
            )
          : listaClientesLocal

        if (filtrados.length === 0) {
          lista.innerHTML = `<p style='text-align:center; color:#8d949e;'>${
            termo ? "Nenhum cliente encontrado com esse nome." : "Nenhum cliente."
          }</p>`
          return
        }

        filtrados.forEach((c) => {
          const whatsLimpo = String(c.whatsapp || "").replace(/\D/g, "")
          const div = document.createElement("div")
          div.className = "item-agenda"
          div.innerHTML = `
            <div><b>${c.nome} (${c.apelido})</b><br>📱 ${c.whatsapp}<br>🎂 Nasc: ${c.aniversario}</div>
            <a class="btn-whats-cliente" href="https://wa.me/55${whatsLimpo}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
            <button class="btn-deletar" data-id="${c.id}">Excluir</button>
          `
          const btnDeletar = div.querySelector(".btn-deletar")
          if (btnDeletar) {
            btnDeletar.addEventListener("click", async (e) => {
              const target = e.target as HTMLElement
              if (confirm(`Excluir permanentemente o cadastro de ${c.nome}?`)) {
                await deleteDoc(doc(db, "clientes", target.getAttribute("data-id")))
                carregarClientesAdmin()
              }
            })
          }
          lista.appendChild(div)
        })
      }

      // Verifica se o cliente logado é membro do Clube e carrega sua categoria
      async function carregarStatusMembroCliente() {
        clienteEhMembroClube = false
        clienteCategoriaClube = null
        ;(window as any).clienteServicosIncluidos = []
        const telLimpo = String(clienteTelefone || "").replace(/\D/g, "")
        if (!telLimpo) return
        try {
          const refMembro = doc(db, "membros_clube", telLimpo)
          const snap = await getDoc(refMembro)
          if (snap.exists()) {
            const dados = snap.data()
            // Retrocompatível: registros antigos sem 'status' e sem 'ativado_em' seguem ATIVOS.
            const statusOK = !dados.status || dados.status === "Ativo"
            if (statusOK) {
              clienteEhMembroClube = true
              clienteCategoriaClube = dados.categoria || null
              if (Array.isArray(dados.servicos_incluidos)) {
                ;(window as any).clienteServicosIncluidos = dados.servicos_incluidos
              }
            }
          }
        } catch (e) {
          console.error("[v0] Erro ao verificar membro do clube:", e)
        }
      }

      async function carregarClubeAdmin() {
        await carregarMembrosClubeAdmin()
        const lista = document.getElementById("lista-clube-admin")
        if (!lista) return
        lista.innerHTML = "Buscando..."
        try {
          const snap = await getDocs(collection(db, "solicitacoes_clube"))
          lista.innerHTML = ""
          if (snap.empty) {
            lista.innerHTML = "<p style='text-align:center; color:#8d949e;'>Nenhum interesse.</p>"
            return
          }
          snap.forEach((docSnap: any) => {
            const cl = docSnap.data()
            const div = document.createElement("div")
            div.className = "item-agenda"
            div.innerHTML = `<div><b>${cl.cliente_nome}</b> (${cl.cliente_apelido})<br>Plano: <b>${cl.plano_escolhido}</b> - ${cl.valor_plano}<br>WhatsApp: ${cl.cliente_telefone}</div>`
            lista.appendChild(div)
          })
        } catch (e) {
          lista.innerHTML = "Erro."
        }
      }

      // Lista os membros cadastrados no Clube do Hiroschi (com nome + categoria) e permite excluir
      async function carregarMembrosClubeAdmin() {
        const lista = document.getElementById("lista-membros-clube")
        if (!lista) return
        lista.innerHTML = "Buscando..."
        try {
          const snap = await getDocs(collection(db, "membros_clube"))
          listaMembrosClube = []
          snap.forEach((docSnap: any) => {
            listaMembrosClube.push({ id: docSnap.id, ...docSnap.data() })
          })
          listaMembrosClube.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
          lista.innerHTML = ""
          if (listaMembrosClube.length === 0) {
            lista.innerHTML = "<p style='text-align:center; color:#8d949e;'>Nenhum membro cadastrado no Clube.</p>"
            return
          }
          listaMembrosClube.forEach((m) => {
            const div = document.createElement("div")
            div.className = "item-agenda"
            div.innerHTML = `
              <div><b>${m.nome}</b> <span class="tag-categoria-clube">${m.categoria || "—"}</span><br>📱 ${m.telefone}</div>
              <button class="btn-deletar" data-id="${m.id}">Excluir</button>
            `
            const btn = div.querySelector(".btn-deletar")
            if (btn) {
              btn.addEventListener("click", async () => {
                if (confirm(`Remover ${m.nome} do Clube do Hiroschi?`)) {
                  await deleteDoc(doc(db, "membros_clube", m.id))
                  carregarMembrosClubeAdmin()
                }
              })
            }
            lista.appendChild(div)
          })
        } catch (e) {
          lista.innerHTML = "<p style='color:#d90429;'>Erro ao carregar membros.</p>"
        }
      }

      async function carregarServicosEditorAdmin() {
        const lista = document.getElementById("lista-servicos-editor")
        if (!lista) return
        lista.innerHTML = "Carregando..."
        await carregarServicosDoBanco()
        lista.innerHTML = ""

        if (listaServicosLocal.length === 0) {
          lista.innerHTML =
            "<p style='text-align:center; color:#8d949e;'>Nenhum serviço. Use o formulário acima para cadastrar novos!</p>"
          return
        }

        listaServicosLocal.forEach((s) => {
          const div = document.createElement("div")
          div.className = "row-edit-servico"
          div.innerHTML = `
            <div class="info-linha"><span>🔹 ${s.nome}</span></div>
            <div class="inputs-linha">
              <input type="number" step="0.01" id="p-${s.id}" value="${s.preco}" style="flex:1;">
              <input type="text" id="t-${s.id}" value="${s.duracao || "30 min"}" style="flex:1;">
            </div>
            <input type="text" id="f-${s.id}" value="${s.foto || ""}" placeholder="URL da foto (deixe vazio para remover)" style="width:100%; padding:6px; font-size:12px;">
            ${s.foto ? `<img src="${s.foto}" alt="${s.nome}" class="preview-foto-edit" crossorigin="anonymous" />` : ""}
            <div class="btn-acoes-serv">
              <button class="btn-salvar-alt" data-id="${s.id}" style="background-color:#002855;">Salvar</button>
              <button class="btn-excluir-serv" data-id="${s.id}" style="background-color:#d90429;">Excluir</button>
            </div>
          `

          const btnSalvar = div.querySelector(".btn-salvar-alt")
          if (btnSalvar) {
            btnSalvar.addEventListener("click", async (e) => {
              const target = e.target as HTMLElement
              const idDoc = target.getAttribute("data-id") || ""
              const novoPreco =
                parseFloat((document.getElementById(`p-${idDoc}`) as HTMLInputElement)?.value) || 0
              const novoTempo = (document.getElementById(`t-${idDoc}`) as HTMLInputElement)?.value.trim() || ""
              const novaFoto = (document.getElementById(`f-${idDoc}`) as HTMLInputElement)?.value.trim() || ""
              try {
                await updateDoc(doc(db, "servicos", idDoc), { preco: novoPreco, duracao: novoTempo, foto: novaFoto })
                alert("Alterado!")
                await carregarServicosEditorAdmin()
              } catch (err) {
                alert("Erro ao salvar.")
              }
            })
          }

          const btnExcluir = div.querySelector(".btn-excluir-serv")
          if (btnExcluir) {
            btnExcluir.addEventListener("click", async (e) => {
              const target = e.target as HTMLElement
              const idDoc = target.getAttribute("data-id") || ""
              if (confirm(`Remover permanentemente "${s.nome}" do catálogo?`)) {
                try {
                  await deleteDoc(doc(db, "servicos", idDoc))
                  alert("Removido!")
                  await carregarServicosEditorAdmin()
                } catch (err) {
                  alert("Erro ao deletar.")
                }
              }
            })
          }
          lista.appendChild(div)
        })
      }

      function carregarConfigHorariosAdmin() {
        const container = document.getElementById("config-horarios-dias")
        if (!container) return
        container.innerHTML = ""
        const nomesDias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

        nomesDias.forEach((nome, idx) => {
          const cfg = configFuncionamento.horarios[String(idx)]
          const aberto = !!cfg && !cfg.fechado
          const abertura = cfg?.abertura || "09:00"
          const fechamento = cfg?.fechamento || "19:00"

          const div = document.createElement("div")
          div.className = "dia-config"
          div.innerHTML = `
            <div class="dia-config-header">
              <label class="dia-check">
                <input type="checkbox" id="dia-aberto-${idx}" ${aberto ? "checked" : ""} style="width:auto;">
                <b>${nome}</b>
              </label>
            </div>
            <div class="dia-config-horas">
              <div style="flex:1;">
                <label style="margin:0;">Abre</label>
                <input type="time" id="dia-abre-${idx}" value="${abertura}" style="padding:6px;">
              </div>
              <div style="flex:1;">
                <label style="margin:0;">Fecha</label>
                <input type="time" id="dia-fecha-${idx}" value="${fechamento}" style="padding:6px;">
              </div>
            </div>
          `
          container.appendChild(div)
        })

        renderizarDiasBloqueados()
      }

      function renderizarDiasBloqueados() {
        const lista = document.getElementById("lista-dias-bloqueados")
        if (!lista) return
        lista.innerHTML = ""
        if (configFuncionamento.diasBloqueados.length === 0) {
          lista.innerHTML = "<p style='text-align:center; color:#8d949e; font-size:13px;'>Nenhum dia bloqueado.</p>"
          return
        }
        const ordenados = [...configFuncionamento.diasBloqueados].sort()
        ordenados.forEach((dataBloq) => {
          const [ano, mes, dia] = dataBloq.split("-")
          const div = document.createElement("div")
          div.className = "item-bloqueado"
          div.innerHTML = `
            <span>🚫 ${dia}/${mes}/${ano}</span>
            <button class="btn-remover-bloqueio" data-data="${dataBloq}">Remover</button>
          `
          const btn = div.querySelector(".btn-remover-bloqueio")
          if (btn) {
            btn.addEventListener("click", async (e) => {
              const target = e.target as HTMLElement
              const dataRemover = target.getAttribute("data-data") || ""
              configFuncionamento.diasBloqueados = configFuncionamento.diasBloqueados.filter(
                (d) => d !== dataRemover
              )
              await persistirConfigFuncionamento()
              renderizarDiasBloqueados()
            })
          }
          lista.appendChild(div)
        })
      }

      async function persistirConfigFuncionamento() {
        await setDoc(doc(db, "configuracoes", "funcionamento"), {
          horarios: configFuncionamento.horarios,
          diasBloqueados: configFuncionamento.diasBloqueados,
          datas_customizadas: (configFuncionamento as any).datas_customizadas || {},
        }, { merge: true })
      }

      // ===== VITRINE DE PRODUTOS (CLIENTE) =====
      async function carregarProdutosCliente() {
        const container = document.getElementById("lista-produtos-cliente")
        if (!container) return
        container.innerHTML = "<p style='color:#65676b; text-align:center;'>Carregando produtos...</p>"
        try {
          const snap = await getDocs(collection(db, "produtos"))
          listaProdutosLocal = []
          snap.forEach((docSnap: any) => {
            listaProdutosLocal.push({ id: docSnap.id, ...docSnap.data() })
          })
          container.innerHTML = ""
          if (listaProdutosLocal.length === 0) {
            container.innerHTML =
              "<p style='color:#8d949e; text-align:center; margin-top:20px;'>Nenhum produto disponível no momento.</p>"
            return
          }
          listaProdutosLocal.forEach((p) => {
            const div = document.createElement("div")
            div.className = "produto-card"
            const fotoHtml = p.foto
              ? `<img src="${p.foto}" alt="${p.nome}" class="produto-foto" crossorigin="anonymous" />`
              : `<div class="produto-foto produto-sem-foto">Sem imagem</div>`
            div.innerHTML = `
              ${fotoHtml}
              <div class="produto-info">
                <div class="produto-nome">${p.nome}</div>
                <div class="produto-desc">${p.descricao || ""}</div>
                <div class="produto-preco">R$ ${Number(p.preco).toFixed(2).replace(".", ",")}</div>
              </div>
            `
            container.appendChild(div)
          })
        } catch (e) {
          container.innerHTML = "<p style='color:#d90429; text-align:center;'>Erro ao carregar produtos.</p>"
        }
      }

      // ===== FINANCEIRO / CAIXA (ADMIN) =====
      async function carregarFinanceiroAdmin() {
        const dataFin = (document.getElementById("filtro-data-financeiro") as HTMLInputElement)?.value || ""
        const elTotalAgend = document.getElementById("fin-total-agendamentos")
        const elTotalEntradas = document.getElementById("fin-total-entradas")
        const elTotalSaidas = document.getElementById("fin-total-saidas")
        const elSaldo = document.getElementById("fin-saldo-final")
        const listaMov = document.getElementById("lista-movimentacoes-financeiro")
        if (!dataFin) return
        if (listaMov) listaMov.innerHTML = "Carregando..."

        try {
          // 0) Carrega os telefones dos membros do Clube (serviços de membro NÃO entram no caixa)
          const snapMembros = await getDocs(collection(db, "membros_clube"))
          const telefonesMembros = new Set<string>()
          snapMembros.forEach((docSnap: any) => {
            telefonesMembros.add(String(docSnap.data().telefone || "").replace(/\D/g, ""))
          })

          // 1) Soma agendamentos confirmados do dia (clientes do Clube entram como R$ 0,00)
          const qAg = query(collection(db, "agendamentos"), where("data", "==", dataFin))
          const snapAg = await getDocs(qAg)
          let totalAgendamentos = 0
          snapAg.forEach((docSnap: any) => {
            const ag = docSnap.data()
            if (ag.status === "Confirmado") {
              const telAg = String(ag.cliente_telefone || "").replace(/\D/g, "")
              const ehMembro = telefonesMembros.has(telAg)
              // Membro do Clube: serviço não contabilizado no caixa do dia
              if (!ehMembro) {
                totalAgendamentos += Number(ag.preco_total || 0)
              }
            }
          })

          // 2) Movimentações manuais do dia
          const qMov = query(collection(db, "caixa_movimentacoes"), where("data", "==", dataFin))
          const snapMov = await getDocs(qMov)
          const movimentacoes: any[] = []
          let totalEntradas = 0
          let totalSaidas = 0
          snapMov.forEach((docSnap: any) => {
            const m = { id: docSnap.id, ...docSnap.data() }
            movimentacoes.push(m)
            if (m.tipo === "entrada") totalEntradas += Number(m.valor || 0)
            else totalSaidas += Number(m.valor || 0)
          })

          const saldoFinal = totalAgendamentos + totalEntradas - totalSaidas

          const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`
          if (elTotalAgend) elTotalAgend.innerText = fmt(totalAgendamentos)
          if (elTotalEntradas) elTotalEntradas.innerText = fmt(totalEntradas)
          if (elTotalSaidas) elTotalSaidas.innerText = fmt(totalSaidas)
          if (elSaldo) elSaldo.innerText = fmt(saldoFinal)

          // Lista de movimentações manuais
          if (listaMov) {
            listaMov.innerHTML = ""
            if (movimentacoes.length === 0) {
              listaMov.innerHTML =
                "<p style='text-align:center; color:#8d949e; font-size:13px;'>Nenhuma movimentação manual neste dia.</p>"
            } else {
              movimentacoes.sort((a, b) => (a.criado_em || "").localeCompare(b.criado_em || ""))
              movimentacoes.forEach((m) => {
                const ehEntrada = m.tipo === "entrada"
                const div = document.createElement("div")
                div.className = `mov-item ${ehEntrada ? "mov-entrada" : "mov-saida"}`
                div.innerHTML = `
                  <div class="mov-info">
                    <span class="mov-desc">${ehEntrada ? "↑" : "↓"} ${m.descricao}</span>
                    <span class="mov-valor">${ehEntrada ? "+" : "-"} ${fmt(Number(m.valor || 0))}</span>
                  </div>
                  <button class="btn-remover-mov" data-id="${m.id}">Excluir</button>
                `
                const btn = div.querySelector(".btn-remover-mov")
                if (btn) {
                  btn.addEventListener("click", async (e) => {
                    const target = e.target as HTMLElement
                    if (confirm("Remover esta movimentação do caixa?")) {
                      await deleteDoc(doc(db, "caixa_movimentacoes", target.getAttribute("data-id")))
                      carregarFinanceiroAdmin()
                    }
                  })
                }
                listaMov.appendChild(div)
              })
            }
          }
        } catch (e) {
          if (listaMov) listaMov.innerHTML = "<p style='color:#d90429;'>Erro ao carregar o caixa.</p>"
        }
      }

      // ===== GERENCIAR PRODUTOS (ADMIN) =====
      async function carregarProdutosEditorAdmin() {
        const lista = document.getElementById("lista-produtos-editor")
        if (!lista) return
        lista.innerHTML = "Carregando..."
        try {
          const snap = await getDocs(collection(db, "produtos"))
          listaProdutosLocal = []
          snap.forEach((docSnap: any) => {
            listaProdutosLocal.push({ id: docSnap.id, ...docSnap.data() })
          })
          lista.innerHTML = ""
          if (listaProdutosLocal.length === 0) {
            lista.innerHTML =
              "<p style='text-align:center; color:#8d949e;'>Nenhum produto. Use o formulário acima para cadastrar!</p>"
            return
          }
          listaProdutosLocal.forEach((p) => {
            const div = document.createElement("div")
            div.className = "row-edit-servico"
            div.innerHTML = `
              <div class="info-linha"><span>🛍️ ${p.nome}</span></div>
              <input type="text" id="pn-${p.id}" value="${p.nome}" placeholder="Nome" style="width:100%; padding:6px; font-size:13px;">
              <input type="number" step="0.01" id="pp-${p.id}" value="${p.preco}" placeholder="Preço" style="width:100%; padding:6px; font-size:13px;">
              <input type="text" id="pd-${p.id}" value="${p.descricao || ""}" placeholder="Descrição curta" style="width:100%; padding:6px; font-size:13px;">
              <input type="text" id="pf-${p.id}" value="${p.foto || ""}" placeholder="URL da imagem" style="width:100%; padding:6px; font-size:12px;">
              ${p.foto ? `<img src="${p.foto}" alt="${p.nome}" class="preview-foto-edit" crossorigin="anonymous" />` : ""}
              <div class="btn-acoes-serv">
                <button class="btn-salvar-prod" data-id="${p.id}" style="background-color:#002855;">Salvar</button>
                <button class="btn-excluir-prod" data-id="${p.id}" style="background-color:#d90429;">Excluir</button>
              </div>
            `
            const btnSalvar = div.querySelector(".btn-salvar-prod")
            if (btnSalvar) {
              btnSalvar.addEventListener("click", async (e) => {
                const target = e.target as HTMLElement
                const idDoc = target.getAttribute("data-id") || ""
                const novoNome = (document.getElementById(`pn-${idDoc}`) as HTMLInputElement)?.value.trim() || ""
                const novoPreco = parseFloat((document.getElementById(`pp-${idDoc}`) as HTMLInputElement)?.value) || 0
                const novaDesc = (document.getElementById(`pd-${idDoc}`) as HTMLInputElement)?.value.trim() || ""
                const novaFoto = (document.getElementById(`pf-${idDoc}`) as HTMLInputElement)?.value.trim() || ""
                try {
                  await updateDoc(doc(db, "produtos", idDoc), {
                    nome: novoNome,
                    preco: novoPreco,
                    descricao: novaDesc,
                    foto: novaFoto,
                  })
                  alert("Produto alterado!")
                  await carregarProdutosEditorAdmin()
                } catch (err) {
                  alert("Erro ao salvar.")
                }
              })
            }
            const btnExcluir = div.querySelector(".btn-excluir-prod")
            if (btnExcluir) {
              btnExcluir.addEventListener("click", async (e) => {
                const target = e.target as HTMLElement
                const idDoc = target.getAttribute("data-id") || ""
                if (confirm(`Remover permanentemente "${p.nome}"?`)) {
                  try {
                    await deleteDoc(doc(db, "produtos", idDoc))
                    alert("Produto removido!")
                    await carregarProdutosEditorAdmin()
                  } catch (err) {
                    alert("Erro ao deletar.")
                  }
                }
              })
            }
            lista.appendChild(div)
          })
        } catch (e) {
          lista.innerHTML = "<p style='color:#d90429;'>Erro ao carregar produtos.</p>"
        }
      }

      async function salvarConfigHorarios() {
        const btn = document.getElementById("btn-salvar-horarios")
        const novosHorarios: Record<string, { abertura: string; fechamento: string; fechado: boolean }> = {}
        for (let idx = 0; idx < 7; idx++) {
          const aberto = (document.getElementById(`dia-aberto-${idx}`) as HTMLInputElement)?.checked
          const abertura = (document.getElementById(`dia-abre-${idx}`) as HTMLInputElement)?.value || "09:00"
          const fechamento = (document.getElementById(`dia-fecha-${idx}`) as HTMLInputElement)?.value || "19:00"
          if (aberto) {
            novosHorarios[String(idx)] = { abertura, fechamento, fechado: false }
          }
        }
        configFuncionamento.horarios = novosHorarios
        if (btn) btn.innerText = "Salvando..."
        try {
          await persistirConfigFuncionamento()
          alert("Horários de funcionamento atualizados!")
        } catch (e) {
          alert("Erro ao salvar os horários.")
        } finally {
          if (btn) btn.innerText = "Salvar Horários de Funcionamento"
        }
      }
    }

    loadFirebase()
  }, [])

  return (
    <>
      <style jsx global>{`
        :root {
          --cor-primaria: #002855;
          --cor-secundaria: #d90429;
          --cor-botao: #d90429;
          --cor-texto: #333333;
          --cor-fundo: #f0f2f5;
          --fonte-familia: sans-serif;
          --fonte-tamanho-base: 16px;
        }
        body {
          margin: 0;
          background-color: var(--cor-fundo);
          color: var(--cor-texto);
          font-family: var(--fonte-familia);
          font-size: var(--fonte-tamanho-base);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
          box-sizing: border-box;
        }
        #phone-simulator {
          width: 100%;
          max-width: 360px;
          height: 640px;
          background-color: #ffffff;
          border-radius: 30px;
          border: 4px solid var(--cor-primaria);
          padding: 25px 15px;
          display: flex;
          flex-direction: column;
          box-shadow: 0px 10px 25px rgba(0, 0, 0, 0.1);
          box-sizing: border-box;
          overflow-y: auto;
          position: relative;
        }
        .hidden { display: none !important; }
        /* ====== Tela de pagamento (Local vs Pix) ====== */
        .pg-resumo { background:#f7f8fa; border-radius:10px; padding:14px; border:1px solid #e4e6eb; }
        .pg-line { display:flex; justify-content:space-between; padding:4px 0; font-size:14px; color:#333; }
        .pg-line.pg-total { border-top:1px solid #e4e6eb; margin-top:8px; padding-top:10px; font-size:16px; color:#002855; }
        .pg-isento { margin-top:8px; padding:8px; background:#e6ffed; border:1px solid #34c759; border-radius:6px; text-align:center; color:#0a6b1e; font-weight:bold; font-size:13px; }
        .pg-formas { display:flex; flex-direction:column; gap:10px; margin-top:10px; }
        .pg-forma-btn { background:#fff !important; color:#002855 !important; border:2px solid #ccd1d9 !important; border-radius:12px; padding:14px 12px !important; text-align:left; cursor:pointer; transition:all 0.2s; }
        .pg-forma-btn.selected { border-color:#d90429 !important; background:#fff5f5 !important; box-shadow:0 0 0 3px rgba(217,4,41,0.1); }
        .pg-forma-btn .pg-icone { font-size:22px; }
        .pg-forma-btn .pg-label { font-weight:bold; font-size:15px; margin-top:2px; }
        .pg-forma-btn .pg-sub { font-size:12px; color:#65676b; margin-top:2px; }
        .pg-forma-btn:disabled { cursor:not-allowed; }
        /* ====== Tela Pix ====== */
        .pix-timer-box { text-align:center; background:#fff5f5; border:1px solid #ffb3b3; border-radius:10px; padding:10px; }
        .pix-timer-box span { color:#65676b; font-size:12px; display:block; }
        .pix-timer { font-size:32px; color:#d90429; font-weight:bold; letter-spacing:2px; margin-top:2px; }
        .pix-valor-box { text-align:center; padding:12px; background:#f0f8ff; border-radius:8px; font-size:15px; color:#333; margin-top:12px; }
        .pix-valor-box strong { color:#002855; font-size:18px; }
        .pix-qr-wrap { display:flex; justify-content:center; margin-top:16px; }
        .pix-qr-wrap img { width:230px; height:230px; background:#fff; padding:6px; border:1px solid #e4e6eb; border-radius:8px; object-fit:contain; }
        .pix-copia-cola { width:100%; padding:10px; border:1px solid #ccd1d9; border-radius:8px; font-family:monospace; font-size:11px; word-break:break-all; box-sizing:border-box; resize:none; color:#333; background:#f7f8fa; }
        .pix-instrucoes { font-size:13px; color:#65676b; margin-top:14px; line-height:1.6; }
        /* ====== Carrossel de trabalhos (tela cliente) ====== */
        .hero-carousel { position: relative; width: 100%; height: 180px; margin-bottom: 14px; overflow: hidden; border-radius: 12px; background: #eaeaea; }
        .hero-track { display: flex; height: 100%; transition: transform 0.5s ease; }
        .hero-slide { min-width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #000; }
        .hero-slide img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
        .hero-slide-empty { color: #65676b; font-size: 13px; }
        .hero-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.35); color: #fff; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 22px; cursor: pointer; z-index: 5; }
        .hero-nav.hero-prev { left: 6px; }
        .hero-nav.hero-next { right: 6px; }
        .hero-dots { position: absolute; bottom: 6px; left: 0; right: 0; display: flex; justify-content: center; gap: 6px; }
        .hero-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.6); cursor: pointer; }
        .hero-dot.active { background: #fff; }
        /* Galeria completa */
        .galeria-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .galeria-item { position: relative; background: #eee; border-radius: 8px; overflow: hidden; height: 130px; display:flex; align-items:center; justify-content:center; }
        .galeria-item img { width: 100%; height: 100%; object-fit: contain; background:#000; }
        .galeria-item .del { position: absolute; top: 4px; right: 4px; background: rgba(217,4,41,0.85); color: #fff; border: none; border-radius: 4px; padding: 4px 6px; font-size: 11px; cursor: pointer; }
        /* Configuração admin */
        .cfg-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .cfg-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .cfg-row label { font-size: 13px; color: #333; flex: 1; }
        .cfg-row input[type=color] { width: 60px; height: 34px; border: 1px solid #ccd1d9; border-radius: 6px; padding: 2px; cursor: pointer; }
        .cfg-row input[type=number], .cfg-row select { width: 140px; padding: 8px; font-size: 14px; border: 1px solid #ccd1d9; border-radius: 6px; }
        /* Datas especiais lista */
        .esp-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #e4e6eb; border-radius: 6px; margin-top: 6px; font-size: 13px; }
        .esp-item button { background: #d90429; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }
        /* Preview de imagem em upload */
        .file-preview { max-width: 100%; max-height: 140px; object-fit: contain; margin-top: 6px; border: 1px solid #e4e6eb; border-radius: 6px; background:#f7f8fa; display:block; }
        #logo { font-size: 24px; color: var(--cor-primaria); text-align: center; margin-top: 10px; margin-bottom: 25px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
        h2 { font-size: 18px; color: var(--cor-primaria); margin-bottom: 15px; text-align: center; font-weight: bold; }
        .form { width: 100%; display: flex; flex-direction: column; gap: 15px; }
        input, select { width: 100%; padding: 14px; background-color: #ffffff; border: 1px solid #ccd1d9; border-radius: 8px; color: #333; font-size: 16px; box-sizing: border-box; outline: none; }
        input:focus, select:focus { border-color: #002855; }
        label { color: #65676b; font-size: 13px; margin-bottom: -5px; padding-left: 5px; }
        button { width: 100%; padding: 14px; background-color: var(--cor-botao); border: none; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
        button:hover { background-color: #b30322; }
        button:disabled { background-color: #ccd1d9; color: #8d949e; cursor: not-allowed; }
        .section-title { color: #002855; font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 15px; margin-bottom: 10px; border-left: 3px solid #d90429; padding-left: 6px; }
        .card-list { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .card { background-color: #ffffff; border: 1px solid #e4e6eb; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: #333; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .card.selected { border-color: #002855; background-color: #e6f0fa; border-width: 2px; }
        .card-name { font-weight: bold; font-size: 15px; color: #002855; }
        .card-price { color: #d90429; font-weight: bold; font-size: 15px; }
        .card-duration { font-size: 12px; color: #65676b; font-weight: normal; margin-top: 2px; }
        .btn-menu { background-color: #ffffff; border: 1px solid #e4e6eb; border-left: 5px solid #002855; color: #002855; padding: 15px; border-radius: 10px; text-align: left; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .btn-menu:hover { background-color: #e6f0fa; }
        .btn-menu span { color: #d90429; font-size: 18px; }
        .sub-txt { font-size: 12px; color: #65676b; font-weight: normal; margin-top: 4px; display: block; }
        .plan-card { background-color: #ffffff; border: 1px solid #e4e6eb; border-radius: 10px; padding: 15px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 5px; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .plan-card.selected { border-color: #d90429; background-color: #fdf2f4; border-width: 2px; }
        .plan-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 16px; }
        .plan-desc { font-size: 13px; color: #555; margin-top: 2px; }
        .plan-price { font-size: 16px; color: #d90429; font-weight: bold; }
        .resumo-barra { background-color: #002855; border-radius: 8px; padding: 12px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; color: #fff; font-size: 14px; }
        .grid-horarios { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; }
        .btn-horario { background-color: #ffffff; border: 1px solid #ccd1d9; color: #333; padding: 8px 4px; border-radius: 6px; text-align: center; cursor: pointer; font-size: 13px; transition: 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .btn-horario.selected { background-color: #002855; color: #ffffff; font-weight: bold; border-color: #002855; }
        .btn-horario.ocupado { background-color: #ffebe6; border-color: #ffccd0; color: #ba3c46; cursor: not-allowed; opacity: 0.6; }
        .sucesso-box { text-align: center; color: #333; margin-top: 40px; }
        .sucesso-icon { font-size: 50px; color: #002855; margin-bottom: 20px; }
        #status-conexao { color: #002855; font-size: 11px; text-align: center; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .btn-admin-secreto { background: none; border: none; color: #8d949e; font-size: 12px; text-decoration: underline; margin-top: 20px; cursor: pointer; align-self: center; width: auto; padding: 5px; }
        .item-agenda { background-color: #ffffff; border-left: 4px solid #002855; padding: 12px; border-radius: 4px; color: #333; margin-bottom: 10px; font-size: 14px; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.02); border-top: 1px solid #e4e6eb; border-right: 1px solid #e4e6eb; border-bottom: 1px solid #e4e6eb; }
        .item-agenda .hora-admin { color: #d90429; font-weight: bold; font-size: 16px; margin-bottom: 4px; }
        .btn-deletar { position: absolute; top: 12px; right: 12px; background: none; border: none; color: #ff4444; font-weight: bold; cursor: pointer; font-size: 14px; text-transform: none; letter-spacing: normal; width: auto; margin-top: 0; padding: 0; }
        .aviso-servico { font-size: 12px; color: #d90429; margin-bottom: 10px; font-weight: bold; text-align: center; }
        .admin-nav { display: flex; gap: 4px; margin-bottom: 15px; background: #e4e6eb; padding: 4px; border-radius: 8px; }
        .admin-nav-btn { flex: 1; padding: 8px 2px; font-size: 11px; background: none; border: none; color: #002855; font-weight: bold; cursor: pointer; border-radius: 6px; margin-top: 0; text-align: center; text-transform: none; letter-spacing: normal; }
        .admin-nav-btn.active { background: #002855; color: #fff; }
        .admin-box { background: #ffffff; border: 1px solid #ccd1d9; padding: 12px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .admin-box h3 { margin-top: 0; font-size: 14px; color: #002855; margin-bottom: 10px; border-bottom: 1px solid #ccd1d9; padding-bottom: 5px; }
        .row-edit-servico { display: flex; flex-direction: column; background: #fff; border: 1px solid #e4e6eb; padding: 10px; border-radius: 6px; margin-bottom: 8px; gap: 6px; }
        .row-edit-servico .info-linha { display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: #002855; font-size: 14px; }
        .row-edit-servico .inputs-linha { display: flex; gap: 5px; }
        .row-edit-servico input { padding: 6px; font-size: 13px; text-align: center; background-color: #fff; }
        .row-edit-servico .btn-acoes-serv { display: flex; gap: 5px; width: 100%; }
        .row-edit-servico button { width: 100%; margin-top: 4px; padding: 8px; font-size: 12px; }
        .btn-perigo { background-color: #000000; color: #ffffff; border: 2px solid #ff4444; margin-bottom: 15px; font-size: 12px; padding: 10px; }
        .btn-perigo:hover { background-color: #ffccd0; color: #000; }
        .card-info { display: flex; align-items: center; gap: 10px; }
        .card-foto { width: 48px; height: 48px; border-radius: 8px; object-fit: contain; background:#f0f2f5; border: 1px solid #e4e6eb; flex-shrink: 0; }
        .preview-foto-edit { width: 100%; max-height: 140px; object-fit: contain; background:#f0f2f5; border-radius: 6px; border: 1px solid #e4e6eb; margin-top: 4px; }
        .item-agenda.confirmado { border-left: 4px solid #2e7d32; border-top-color: #2e7d32; border-right-color: #2e7d32; border-bottom-color: #2e7d32; background-color: #f0faf0; }
        .tag-confirmado { color: #2e7d32; font-weight: bold; font-size: 12px; margin-top: 6px; }
        .btn-acoes-agenda { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
        .btn-confirmar-presenca { background-color: #2e7d32; padding: 8px; font-size: 12px; margin-top: 0; }
        .btn-confirmar-presenca:hover { background-color: #256628; }
        .btn-remover-agenda { background-color: #d90429; padding: 8px; font-size: 12px; margin-top: 0; }
        .btn-remover-agenda:hover { background-color: #b30322; }
        .btn-whats-cliente { display: inline-block; background-color: #25d366; color: #fff; text-decoration: none; font-size: 13px; font-weight: bold; padding: 8px 12px; border-radius: 6px; margin-top: 8px; text-align: center; }
        .dia-config { border: 1px solid #e4e6eb; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
        .dia-config-header { margin-bottom: 8px; }
        .dia-check { display: flex; align-items: center; gap: 8px; color: #002855; font-size: 14px; margin: 0; padding: 0; }
        .dia-config-horas { display: flex; gap: 8px; }
        .dia-config-horas label { font-size: 11px; }
        .dia-config-horas input { padding: 6px; font-size: 13px; }
        .item-bloqueado { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e4e6eb; border-left: 4px solid #d90429; padding: 10px; border-radius: 6px; margin-bottom: 8px; font-size: 14px; color: #002855; font-weight: bold; }
        .btn-remover-bloqueio { width: auto; margin-top: 0; padding: 6px 10px; font-size: 11px; background-color: #65676b; }
        /* Botão Resumo WhatsApp */
        .btn-whats-resumo { background-color: #25d366 !important; color: #fff; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-whats-resumo:hover { background-color: #1faa52 !important; }
        /* Vitrine de Produtos */
        .banner-produtos { background: linear-gradient(135deg, #002855, #013a78); color: #fff; padding: 16px; border-radius: 12px; margin-bottom: 18px; text-align: center; box-shadow: 0 4px 10px rgba(0,40,85,0.2); }
        .banner-produtos .banner-tag { display: inline-block; background-color: #d90429; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .banner-produtos .banner-texto { font-size: 15px; font-weight: bold; line-height: 1.4; }
        .banner-produtos .banner-texto b { color: #ffd166; }
        .produto-card { background-color: #ffffff; border: 1px solid #e4e6eb; border-radius: 12px; overflow: hidden; margin-bottom: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        .produto-foto { width: 100%; height: auto; max-height: 320px; object-fit: contain; display: block; background-color: #f0f2f5; }
        .produto-sem-foto { display: flex; align-items: center; justify-content: center; background-color: #e4e6eb; color: #8d949e; font-size: 13px; min-height: 150px; }
        .tag-categoria-clube { display: inline-block; background-color: #d90429; color: #fff; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 20px; margin-left: 4px; vertical-align: middle; }
        .produto-info { padding: 12px; }
        .produto-nome { font-size: 16px; font-weight: bold; color: #002855; }
        .produto-desc { font-size: 13px; color: #65676b; margin-top: 4px; line-height: 1.4; }
        .produto-preco { font-size: 17px; font-weight: bold; color: #d90429; margin-top: 8px; }
        /* Financeiro / Caixa */
        .fin-resumo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .fin-card { background-color: #ffffff; border: 1px solid #e4e6eb; border-radius: 10px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .fin-card .fin-label { font-size: 11px; color: #65676b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
        .fin-card .fin-valor { font-size: 18px; font-weight: bold; margin-top: 4px; }
        .fin-card.fin-agendamentos { border-left: 4px solid #002855; }
        .fin-card.fin-agendamentos .fin-valor { color: #002855; }
        .fin-card.fin-entradas { border-left: 4px solid #2e7d32; }
        .fin-card.fin-entradas .fin-valor { color: #2e7d32; }
        .fin-card.fin-saidas { border-left: 4px solid #d90429; }
        .fin-card.fin-saidas .fin-valor { color: #d90429; }
        .fin-card.fin-saldo { grid-column: span 2; border-left: 4px solid #002855; background-color: #002855; text-align: center; }
        .fin-card.fin-saldo .fin-label { color: #cdd9e8; }
        .fin-card.fin-saldo .fin-valor { color: #ffffff; font-size: 26px; }
        .mov-item { display: flex; flex-direction: column; gap: 6px; background: #fff; border: 1px solid #e4e6eb; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
        .mov-item.mov-entrada { border-left: 4px solid #2e7d32; }
        .mov-item.mov-saida { border-left: 4px solid #d90429; }
        .mov-info { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
        .mov-desc { color: #002855; font-weight: bold; }
        .mov-entrada .mov-valor { color: #2e7d32; font-weight: bold; }
        .mov-saida .mov-valor { color: #d90429; font-weight: bold; }
        .btn-remover-mov { width: auto; align-self: flex-end; margin-top: 0; padding: 5px 10px; font-size: 11px; background-color: #65676b; }
        .btn-add-entrada { background-color: #2e7d32 !important; }
        .btn-add-entrada:hover { background-color: #256628 !important; }
      `}</style>

      <div id="phone-simulator">
        <div id="status-conexao">Conectado ao Firebase</div>
        <h1 id="logo">Barbearia Hiroschi</h1>

        <div id="tela-login" className="form">
          <h2>Agende seu Horário</h2>
          <div className="form">
            <label htmlFor="login-whatsapp">Digite seu WhatsApp com DDD:</label>
            <input type="tel" id="login-whatsapp" placeholder="Ex: 21999998888" />
            <button id="btn-verificar-whats">Acessar Sistema</button>
          </div>
          <button id="btn-abrir-admin" className="btn-admin-secreto">Acesso do Proprietário</button>
        </div>

        <div id="tela-cadastro" className="hidden form">
          <h2>Criar Novo Cadastro</h2>
          <p style={{ color: "#65676b", fontSize: "13px", textAlign: "center", marginTop: "-10px" }}>Notamos que é seu primeiro contato!</p>
          <div className="form">
            <input type="text" id="cad-nome" placeholder="Nome Completo" />
            <input type="text" id="cad-apelido" placeholder="Como quer ser chamado? (Apelido)" />
            <label htmlFor="cad-aniversario">Data de Nascimento:</label>
            <input type="text" id="cad-aniversario" placeholder="DD/MM/AAAA" maxLength={10} inputMode="numeric" />
            <button id="btn-salvar-cadastro">Salvar e Continuar</button>
          </div>
        </div>

        <div id="tela-menu" className="hidden">
          <h2 id="saudacao-menu">Olá!</h2>

          {/* Carrossel de trabalhos - fotos do admin */}
          <div id="hero-carousel" className="hero-carousel">
            <div id="hero-track" className="hero-track"></div>
            <button id="hero-prev" className="hero-nav hero-prev" type="button" aria-label="Anterior">‹</button>
            <button id="hero-next" className="hero-nav hero-next" type="button" aria-label="Próxima">›</button>
            <div id="hero-dots" className="hero-dots"></div>
          </div>

          <p style={{ color: "#65676b", fontSize: "13px", textAlign: "center", marginBottom: "12px" }}>Escolha o que deseja fazer:</p>
          <div className="btn-menu" id="opt-agendamento">
            <div>Novo Agendamento<span className="sub-txt">Escolha e combine os serviços desejados.</span></div>
            <span>➔</span>
          </div>
          <div className="btn-menu" id="opt-meus-horarios" style={{ borderLeftColor: "#65676b" }}>
            <div>Ver Meus Agendamentos<span className="sub-txt">Consulte ou cancele seus horários marcados.</span></div>
            <span>➔</span>
          </div>
          <div className="btn-menu" id="opt-clube" style={{ borderLeftColor: "#d90429" }}>
            <div>Clube do Hiroschi<span className="sub-txt">Nossos planos de assinatura mensal.</span></div>
            <span>➔</span>
          </div>
          <div className="btn-menu" id="opt-galeria" style={{ borderLeftColor: "#a97142" }}>
            <div>Galeria de Fotos<span className="sub-txt">Veja mais trabalhos e cortes.</span></div>
            <span>➔</span>
          </div>
          <div className="btn-menu" id="opt-produtos" style={{ borderLeftColor: "#2e7d32" }}>
            <div>Produtos<span className="sub-txt">Confira nossa linha de produtos exclusivos.</span></div>
            <span>➔</span>
          </div>
        </div>

        <div id="tela-galeria" className="hidden">
          <h2>Galeria de Fotos</h2>
          <p style={{ color: "#65676b", fontSize: "13px", textAlign: "center", marginBottom: "12px" }}>Nossos trabalhos e cortes:</p>
          <div id="galeria-grid" className="galeria-grid"></div>
          <button id="btn-voltar-galeria-menu" style={{ backgroundColor: "#65676b", color: "#fff", marginTop: "15px" }}>Voltar ao Menu</button>
        </div>

        <div id="tela-meus-horarios" className="hidden">
          <h2>Meus Horários</h2>
          <p style={{ color: "#65676b", fontSize: "13px", textAlign: "center", marginBottom: "15px" }}>Abaixo estão seus compromissos agendados:</p>
          <div id="lista-horarios-cliente" className="card-list"></div>
          <button id="btn-voltar-horarios-menu" style={{ backgroundColor: "#65676b", color: "#fff", marginTop: "15px" }}>Voltar ao Menu</button>
        </div>

        <div id="tela-produtos" className="hidden">
          <h2>Nossos Produtos</h2>
          <div className="banner-produtos">
            <span className="banner-tag">Clube Hiroschi</span>
            <div className="banner-texto">Membro do Clube Hiroschi tem <b>20% de desconto</b> em qualquer produto!</div>
          </div>
          <div id="lista-produtos-cliente" className="card-list"></div>
          <button id="btn-voltar-produtos-menu" style={{ backgroundColor: "#65676b", color: "#fff", marginTop: "15px" }}>Voltar ao Menu</button>
        </div>

        <div id="tela-clube" className="hidden">
          <h2>Clube do Hiroschi</h2>
          <p style={{ color: "#65676b", fontSize: "13px", textAlign: "center", marginBottom: "15px" }}>Selecione o plano ideal para manter o visual em dia:</p>
          <div id="lista-planos-clube">
            <div className="plan-card" data-plano="Bronze" data-valor="R$ 49,90">
              <div className="plan-header"><span style={{ color: "#cd7f32", fontWeight: "bold" }}>Bronze</span><span className="plan-price">R$ 49,90</span></div>
              <div className="plan-desc">Direito a 2 cortes no mês (de 15 em 15 dias).</div>
            </div>
            <div className="plan-card" data-plano="Prata" data-valor="R$ 79,90">
              <div className="plan-header"><span style={{ color: "#707780", fontWeight: "bold" }}>Prata</span><span className="plan-price">R$ 79,90</span></div>
              <div className="plan-desc">Direito a 2 cortes + barba no mês (de 15 em 15 dias).</div>
            </div>
            <div className="plan-card" data-plano="Ouro" data-valor="R$ 99,90">
              <div className="plan-header"><span style={{ color: "#a37000", fontWeight: "bold" }}>Ouro</span><span className="plan-price">R$ 99,90</span></div>
              <div className="plan-desc">Direito a 4 cortes no mês (1 por semana).</div>
            </div>
            <div className="plan-card" data-plano="Diamante" data-valor="R$ 169,90">
              <div className="plan-header"><span style={{ color: "#00b4d8", fontWeight: "bold" }}>Diamante</span><span className="plan-price">R$ 169,90</span></div>
              <div className="plan-desc">Direito a 4 cortes + barba no mês.</div>
            </div>
          </div>
          <button id="btn-aderir-clube">Quero Assinar Este Plano</button>
          <button id="btn-voltar-menu" style={{ backgroundColor: "#65676b", color: "#fff", marginTop: "10px" }}>Voltar ao Menu</button>
        </div>

        <div id="tela-servicos" className="hidden">
          <h2>Escolha os Serviços</h2>
          <p style={{ color: "#65676b", fontSize: "13px", textAlign: "center", marginTop: "-10px", marginBottom: "15px" }}>Selecione os procedimentos abaixo:</p>
          <div id="lista-servicos" className="card-list"></div>
          <div className="resumo-barra">
            <div><b>Selecionados:</b> <span id="resumo-qtd">0</span></div>
            <div><b>Total:</b> <span id="resumo-total" style={{ color: "#ffffff", fontWeight: "bold" }}>R$ 0,00</span></div>
          </div>
          <button id="btn-ir-agenda" style={{ marginTop: "15px" }}>Escolher Data e Hora</button>
          <button id="btn-voltar-serv-menu" style={{ backgroundColor: "#65676b", color: "#fff", marginTop: "5px", padding: "8px" }}>Voltar</button>
        </div>

        <div id="tela-agenda" className="hidden">
          <h2>Escolha o Horário</h2>
          <button id="btn-voltar-agenda-servicos" style={{ backgroundColor: "#65676b", color: "#fff", marginBottom: "15px", padding: "10px" }}>← Voltar para Serviços</button>
          <div className="section-title">1. Selecione o Dia</div>
          <input type="date" id="input-data" />
          <div className="section-title" style={{ marginTop: "20px" }}>2. Horários Disponíveis (Terça a Sábado)</div>
          <div id="aviso-restricao" className="aviso-servico hidden">Aviso: Horários limitados para este serviço até as 17:00.</div>
          <div className="grid-horarios" id="container-horarios"></div>
          <button id="btn-salvar-agendamento" style={{ marginTop: "30px" }}>Confirmar Agendamento</button>
        </div>

        <div id="tela-pagamento" className="hidden">
          <h2>Forma de Pagamento</h2>
          <button id="btn-pg-voltar" style={{ backgroundColor: "#65676b", color: "#fff", marginBottom: "15px", padding: "10px" }}>← Voltar</button>
          <div id="pg-resumo" className="pg-resumo"></div>
          <div className="section-title" style={{ marginTop: "18px" }}>Como você quer pagar?</div>
          <div className="pg-formas">
            <button id="btn-pagar-local" className="pg-forma-btn" type="button">
              <div className="pg-icone">🏪</div>
              <div className="pg-label">PAGAR NO LOCAL</div>
              <div className="pg-sub">Pague em dinheiro/cartão na barbearia</div>
            </button>
            <button id="btn-pagar-pix" className="pg-forma-btn" type="button">
              <div className="pg-icone">📱</div>
              <div className="pg-label">PAGAR VIA PIX</div>
              <div className="pg-sub">Reserva por 10 min, confirmação automática</div>
            </button>
          </div>
          <button id="btn-pg-confirmar" style={{ marginTop: "24px" }}>CONFIRMAR AGENDAMENTO</button>
        </div>

        <div id="tela-pix" className="hidden">
          <h2>Pagamento Pix</h2>
          <div className="pix-timer-box">
            <span>Reserva expira em</span>
            <div id="pix-timer" className="pix-timer">10:00</div>
          </div>
          <div className="pix-valor-box">
            Valor a pagar: <strong id="pix-valor">R$ 0,00</strong>
          </div>
          <div className="pix-qr-wrap">
            <img id="pix-qr-img" alt="QR Code Pix" />
          </div>
          <div className="section-title" style={{ marginTop: "16px" }}>Ou copie o código Pix (copia e cola):</div>
          <textarea id="pix-copia-cola" readOnly rows={4} className="pix-copia-cola"></textarea>
          <button id="btn-copiar-pix" onClick={() => (window as any).pixCopiarCola?.()} style={{ marginTop: "10px", backgroundColor: "#002855", color: "#fff" }}>COPIAR CÓDIGO PIX</button>
          <p className="pix-instrucoes">
            1. Abra seu app do banco<br />
            2. Escaneie o QR ou cole o código<br />
            3. Confirme o pagamento<br />
            <strong>A confirmação chegará automaticamente. Não feche esta tela.</strong>
          </p>
          <button id="btn-cancelar-pix" onClick={() => (window as any).pixCancelar?.()} style={{ marginTop: "18px", backgroundColor: "#65676b", color: "#fff" }}>CANCELAR E VOLTAR</button>
        </div>

        <div id="tela-sucesso" className="hidden">
          <div className="sucesso-box">
            <div className="sucesso-icon">✓</div>
            <h2>Agendamento Concluído!</h2>
            <p style={{ color: "#65676b", fontSize: "15px", marginTop: "15px" }}>Seu horário foi salvo com sucesso!</p>
            <button id="btn-resumo-whatsapp" className="btn-whats-resumo" style={{ marginTop: "30px" }}>Enviar Resumo via WhatsApp</button>
            <button id="btn-voltar" style={{ marginTop: "10px", backgroundColor: "#002855", color: "#fff" }}>Voltar ao Início</button>
          </div>
        </div>

        <div id="tela-admin" className="hidden">
          <h2>Painel Hiroschi</h2>
          <div className="admin-nav">
            <button className="admin-nav-btn active" id="tab-agenda">Agenda</button>
            <button className="admin-nav-btn" id="tab-financeiro-admin">Caixa</button>
            <button className="admin-nav-btn" id="tab-clientes">Clientes</button>
            <button className="admin-nav-btn" id="tab-clube-admin">Clube</button>
            <button className="admin-nav-btn" id="tab-servicos-admin">Serviços</button>
            <button className="admin-nav-btn" id="tab-produtos-admin">Produtos</button>
            <button className="admin-nav-btn" id="tab-horarios-admin">Horários</button>
            <button className="admin-nav-btn" id="tab-configuracao-admin">Configuração</button>
          </div>
          <div id="conteudo-admin-agenda">
            <div className="admin-box">
              <h3>Filtro de Data</h3>
              <input type="date" id="filtro-data-admin" style={{ textAlign: "center", padding: "8px" }} />
            </div>
            <div className="admin-box">
              <h3>Realizar Encaixe Rápido</h3>
              <div className="form" style={{ gap: "8px" }}>
                <input type="text" id="encaixe-nome" placeholder="Nome do Cliente" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="text" id="encaixe-servico" placeholder="Serviço (Ex: Corte + Barba)" style={{ padding: "10px", fontSize: "14px" }} />
                <div style={{ display: "flex", gap: "5px" }}>
                  <input type="text" id="encaixe-hora" placeholder="Hora (Ex: 14:30)" style={{ padding: "10px", fontSize: "14px", flex: 1 }} />
                  <input type="text" id="encaixe-preco" placeholder="Valor R$" style={{ padding: "10px", fontSize: "14px", flex: 1 }} />
                </div>
                <button id="btn-salvar-encaixe" style={{ marginTop: "5px", padding: "10px", backgroundColor: "#002855" }}>Salvar Encaixe</button>
              </div>
            </div>
            <div className="section-title">Horários Agendados</div>
            <div id="lista-agendamentos-admin" className="card-list"></div>
          </div>
          <div id="conteudo-admin-clientes" className="hidden">
            <div className="admin-box">
              <h3>Pesquisar Cliente</h3>
              <input type="text" id="busca-cliente" placeholder="Digite o nome ou apelido..." style={{ padding: "10px", fontSize: "14px" }} />
            </div>
            <div className="section-title">Todos os Clientes</div>
            <div id="lista-clientes-admin" className="card-list"></div>
          </div>
          <div id="conteudo-admin-clube" className="hidden">
            <div className="admin-box">
              <h3>Adicionar Membro ao Clube</h3>
              <div className="form" style={{ gap: "8px" }}>
                <input type="text" id="membro-nome" placeholder="Nome do Cliente" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="tel" id="membro-telefone" placeholder="WhatsApp com DDD (Ex: 21999998888)" style={{ padding: "10px", fontSize: "14px" }} />
                <select id="membro-categoria" style={{ padding: "10px", fontSize: "14px" }}>
                  <option value="Bronze">Bronze</option>
                  <option value="Prata">Prata</option>
                  <option value="Ouro">Ouro</option>
                  <option value="Diamante">Diamante</option>
                </select>
                <button id="btn-add-membro" style={{ marginTop: "5px", padding: "10px", backgroundColor: "#002855" }}>Adicionar Membro</button>
              </div>
            </div>
            <div className="section-title">Membros do Clube</div>
            <div id="lista-membros-clube" className="card-list"></div>
            <div className="section-title">Interessados no Clube</div>
            <div id="lista-clube-admin" className="card-list"></div>
          </div>
          <div id="conteudo-admin-servicos" className="hidden">
            <button id="btn-limpar-todos-servicos" className="btn-perigo">⚠️ LIMPAR BANCO DE SERVIÇOS (APAGAR TUDO)</button>
            <div className="admin-box">
              <h3>Incluir Novo Serviço</h3>
              <div className="form" style={{ gap: "8px" }}>
                <input type="text" id="novo-serv-nome" placeholder="Nome do Serviço (Ex: Sobrancelha)" style={{ padding: "10px", fontSize: "14px" }} />
                <div style={{ display: "flex", gap: "5px" }}>
                  <input type="number" step="0.01" id="novo-serv-preco" placeholder="Preço (Ex: 20.00)" style={{ padding: "10px", fontSize: "14px", flex: 1 }} />
                  <input type="text" id="novo-serv-tempo" placeholder="Tempo (Ex: 15 min)" style={{ padding: "10px", fontSize: "14px", flex: 1 }} />
                </div>
                <input type="text" id="novo-serv-foto" placeholder="URL da foto (opcional)" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="file" id="novo-serv-foto-file" accept="image/*" style={{ padding: "8px", fontSize: "13px" }} />
                <img id="novo-serv-foto-preview" className="file-preview hidden" alt="preview" />
                <button id="btn-cadastrar-servico" style={{ marginTop: "5px", padding: "10px", backgroundColor: "#002855" }}>Cadastrar Serviço</button>
              </div>
            </div>
            <div className="section-title">Alterar ou Excluir Serviços</div>
            <div id="lista-servicos-editor" className="card-list"></div>
          </div>
          <div id="conteudo-admin-financeiro" className="hidden">
            <div className="admin-box">
              <h3>Caixa do Dia</h3>
              <input type="date" id="filtro-data-financeiro" style={{ textAlign: "center", padding: "8px" }} />
            </div>
            <div className="fin-resumo-grid">
              <div className="fin-card fin-agendamentos">
                <div className="fin-label">Agendam. Confirmados</div>
                <div className="fin-valor" id="fin-total-agendamentos">R$ 0,00</div>
              </div>
              <div className="fin-card fin-entradas">
                <div className="fin-label">Entradas Manuais</div>
                <div className="fin-valor" id="fin-total-entradas">R$ 0,00</div>
              </div>
              <div className="fin-card fin-saidas">
                <div className="fin-label">Retiradas/Sangrias</div>
                <div className="fin-valor" id="fin-total-saidas">R$ 0,00</div>
              </div>
              <div className="fin-card fin-saldo">
                <div className="fin-label">Saldo Final do Caixa</div>
                <div className="fin-valor" id="fin-saldo-final">R$ 0,00</div>
              </div>
            </div>
            <div className="admin-box">
              <h3>Adicionar Entrada Manual</h3>
              <div className="form" style={{ gap: "8px" }}>
                <input type="text" id="mov-entrada-desc" placeholder="Descrição (Ex: Venda de produto)" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="number" step="0.01" id="mov-entrada-valor" placeholder="Valor R$" style={{ padding: "10px", fontSize: "14px" }} />
                <button id="btn-add-entrada" className="btn-add-entrada" style={{ marginTop: "5px", padding: "10px" }}>Adicionar Entrada Manual</button>
              </div>
            </div>
            <div className="admin-box">
              <h3>Registrar Retirada / Sangria</h3>
              <div className="form" style={{ gap: "8px" }}>
                <input type="text" id="mov-sangria-desc" placeholder="Descrição (Ex: Pagamento fornecedor)" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="number" step="0.01" id="mov-sangria-valor" placeholder="Valor R$" style={{ padding: "10px", fontSize: "14px" }} />
                <button id="btn-add-sangria" style={{ marginTop: "5px", padding: "10px", backgroundColor: "#d90429" }}>Registrar Retirada/Sangria</button>
              </div>
            </div>
            <div className="section-title">Movimentações do Dia</div>
            <div id="lista-movimentacoes-financeiro" className="card-list"></div>
          </div>
          <div id="conteudo-admin-produtos" className="hidden">
            <div className="admin-box">
              <h3>Incluir Novo Produto</h3>
              <div className="form" style={{ gap: "8px" }}>
                <input type="text" id="novo-prod-nome" placeholder="Nome do Produto (Ex: Pomada Modeladora)" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="number" step="0.01" id="novo-prod-preco" placeholder="Preço (Ex: 45.00)" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="text" id="novo-prod-desc" placeholder="Descrição curta" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="text" id="novo-prod-foto" placeholder="URL da imagem (opcional)" style={{ padding: "10px", fontSize: "14px" }} />
                <input type="file" id="novo-prod-foto-file" accept="image/*" style={{ padding: "8px", fontSize: "13px" }} />
                <img id="novo-prod-foto-preview" className="file-preview hidden" alt="preview" />
                <button id="btn-cadastrar-produto" style={{ marginTop: "5px", padding: "10px", backgroundColor: "#002855" }}>Cadastrar Produto</button>
              </div>
            </div>
            <div className="section-title">Alterar ou Excluir Produtos</div>
            <div id="lista-produtos-editor" className="card-list"></div>
          </div>
          <div id="conteudo-admin-horarios" className="hidden">
            <div className="admin-box">
              <h3>Horário de Funcionamento (semanal)</h3>
              <p style={{ color: "#65676b", fontSize: "12px", marginTop: "-5px", marginBottom: "10px" }}>Marque os dias abertos e defina o horário que aparece para os clientes.</p>
              <div id="config-horarios-dias"></div>
              <button id="btn-salvar-horarios" style={{ marginTop: "10px", padding: "10px", backgroundColor: "#002855" }}>Salvar Horários de Funcionamento</button>
            </div>
            <div className="admin-box">
              <h3>Bloquear Dia (Férias/Feriado)</h3>
              <p style={{ color: "#65676b", fontSize: "12px", marginTop: "-5px", marginBottom: "10px" }}>O dia bloqueado não aceitará agendamentos.</p>
              <div style={{ display: "flex", gap: "5px", alignItems: "flex-end" }}>
                <input type="date" id="input-bloquear-dia" style={{ flex: 1, padding: "10px", fontSize: "14px" }} />
              </div>
              <button id="btn-bloquear-dia" style={{ marginTop: "8px", padding: "10px", backgroundColor: "#d90429" }}>Bloquear Dia (Férias/Feriado)</button>
              <div className="section-title" style={{ marginTop: "15px" }}>Dias Bloqueados</div>
              <div id="lista-dias-bloqueados"></div>
            </div>
            <div className="admin-box">
              <h3>Datas Especiais (Natal, Ano Novo, Feriados)</h3>
              <p style={{ color: "#65676b", fontSize: "12px", marginTop: "-5px", marginBottom: "10px" }}>Abra ou defina horários específicos para datas futuras — sobrepõe o horário semanal padrão.</p>
              <div className="form" style={{ gap: "8px" }}>
                <input type="date" id="esp-data" style={{ padding: "10px", fontSize: "14px" }} />
                <select id="esp-modo" style={{ padding: "10px", fontSize: "14px" }}>
                  <option value="aberto">Abrir dia (com horário especial)</option>
                  <option value="fechado">Fechar dia (bloquear)</option>
                </select>
                <div style={{ display: "flex", gap: "5px" }}>
                  <input type="time" id="esp-abertura" defaultValue="09:00" style={{ flex: 1, padding: "10px", fontSize: "14px" }} />
                  <input type="time" id="esp-fechamento" defaultValue="18:00" style={{ flex: 1, padding: "10px", fontSize: "14px" }} />
                </div>
                <input type="text" id="esp-motivo" placeholder="Motivo (ex: Véspera de Natal)" style={{ padding: "10px", fontSize: "14px" }} />
                <button id="btn-salvar-data-especial" style={{ padding: "10px", backgroundColor: "#002855" }}>Salvar Data Especial</button>
              </div>
              <div className="section-title" style={{ marginTop: "15px" }}>Datas Especiais Cadastradas</div>
              <div id="lista-datas-especiais"></div>
            </div>
          </div>
          <div id="conteudo-admin-configuracao" className="hidden">
            <div className="admin-box">
              <h3>Aparência do Aplicativo</h3>
              <p style={{ color: "#65676b", fontSize: "12px", marginTop: "-5px", marginBottom: "10px" }}>Altere cores, fonte e tamanho. As mudanças ficam salvas e são aplicadas para todos os clientes.</p>
              <div className="cfg-grid">
                <div className="cfg-row"><label>Cor Primária (topo/títulos)</label><input type="color" id="cfg-cor-primaria" defaultValue="#002855" /></div>
                <div className="cfg-row"><label>Cor Secundária (destaques)</label><input type="color" id="cfg-cor-secundaria" defaultValue="#d90429" /></div>
                <div className="cfg-row"><label>Cor dos Botões</label><input type="color" id="cfg-cor-botao" defaultValue="#d90429" /></div>
                <div className="cfg-row"><label>Cor do Texto</label><input type="color" id="cfg-cor-texto" defaultValue="#333333" /></div>
                <div className="cfg-row"><label>Cor de Fundo</label><input type="color" id="cfg-cor-fundo" defaultValue="#f0f2f5" /></div>
                <div className="cfg-row">
                  <label>Fonte</label>
                  <select id="cfg-fonte">
                    <option value="sans-serif">Padrão (sans-serif)</option>
                    <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="Georgia, serif">Georgia (serifada)</option>
                    <option value="'Montserrat', sans-serif">Montserrat</option>
                    <option value="'Poppins', sans-serif">Poppins</option>
                  </select>
                </div>
                <div className="cfg-row">
                  <label>Tamanho da fonte base (px)</label>
                  <input type="number" id="cfg-fonte-tamanho" defaultValue="16" min="12" max="22" />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button id="btn-salvar-tema" style={{ flex: 1, padding: "10px", backgroundColor: "#002855" }}>Salvar e Aplicar</button>
                <button id="btn-restaurar-tema" style={{ flex: 1, padding: "10px", backgroundColor: "#65676b" }}>Restaurar Padrão</button>
              </div>
            </div>
            <div className="admin-box">
              <h3>Galeria de Fotos (trabalhos)</h3>
              <p style={{ color: "#65676b", fontSize: "12px", marginTop: "-5px", marginBottom: "10px" }}>Fotos que aparecem no carrossel da tela principal do cliente. Escolha diretamente da galeria do seu celular/tablet.</p>
              <div className="form" style={{ gap: "8px" }}>
                <input type="file" id="galeria-file" accept="image/*" style={{ padding: "8px", fontSize: "13px" }} />
                <input type="text" id="galeria-titulo" placeholder="Título/legenda (opcional)" style={{ padding: "10px", fontSize: "14px" }} />
                <button id="btn-add-galeria" style={{ padding: "10px", backgroundColor: "#002855" }}>Adicionar à Galeria</button>
              </div>
              <div className="section-title" style={{ marginTop: "12px" }}>Fotos da Galeria</div>
              <div id="lista-galeria-admin" className="galeria-grid"></div>
            </div>
          </div>
          <button id="btn-sair-admin" style={{ marginTop: "20px", backgroundColor: "#65676b", color: "#fff" }}>Voltar para o App</button>
        </div>
      </div>
    </>
  )
}
