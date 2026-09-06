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

      async function carregarConfigFuncionamento() {
        try {
          const refConfig = doc(db, "configuracoes", "funcionamento")
          const snap = await getDoc(refConfig)
          if (snap.exists()) {
            const dados = snap.data()
            if (dados.horarios) configFuncionamento.horarios = dados.horarios
            configFuncionamento.diasBloqueados = dados.diasBloqueados || []
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
        // Membros do Clube: avança até a próxima Terça, Quarta ou Quinta
        if (clienteEhMembroClube) {
          let limite = 0
          while (![2, 3, 4].includes(hojeDt.getDay()) && limite < 7) {
            hojeDt.setDate(hojeDt.getDate() + 1)
            limite++
          }
          return hojeDt.toLocaleDateString("sv")
        }
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
            const totalPreco = servicosSelecionados.reduce((acc, curr) => acc + Number(curr.preco), 0)
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

            btnSalvarAgendamento.innerText = "Agendando..."
            try {
              await addDoc(collection(db, "agendamentos"), {
                cliente_nome: clienteNome,
                cliente_apelido: clienteApelido,
                cliente_telefone: clienteTelefone,
                data: dataSel,
                horario: horarioSelecionado,
                servico: nomesServicos,
                preco_total: totalPreco,
                duracao_total: duracaoTotal,
                criado_em: new Date().toISOString(),
              })
              ultimoAgendamento = {
                servico: nomesServicos,
                data: dataSel,
                horario: horarioSelecionado || "",
                total: totalPreco,
              }
              document.getElementById("tela-agenda")?.classList.add("hidden")
              document.getElementById("tela-sucesso")?.classList.remove("hidden")
            } catch (e) {
              alert("Erro ao salvar o agendamento.")
            } finally {
              btnSalvarAgendamento.innerText = "Confirmar Agendamento"
            }
          })
        }

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

        const abas = ["tab-agenda", "tab-clientes", "tab-clube-admin", "tab-servicos-admin", "tab-horarios-admin", "tab-financeiro-admin", "tab-produtos-admin"]
        const conteudos = [
          "conteudo-admin-agenda",
          "conteudo-admin-clientes",
          "conteudo-admin-clube",
          "conteudo-admin-servicos",
          "conteudo-admin-horarios",
          "conteudo-admin-financeiro",
          "conteudo-admin-produtos",
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
            const foto = (document.getElementById("novo-serv-foto") as HTMLInputElement)?.value.trim() || ""

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
            const foto = (document.getElementById("novo-prod-foto") as HTMLInputElement)?.value.trim() || ""
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
        document.getElementById("tela-agenda")?.classList.add("hidden")
        document.getElementById("tela-sucesso")?.classList.add("hidden")
        document.getElementById("tela-menu")?.classList.remove("hidden")
        const saudacao = document.getElementById("saudacao-menu")
        if (saudacao) saudacao.innerText = `Olá, ${clienteApelido}! 👋`
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

      function atualizarResumoServicos() {
        const total = servicosSelecionados.reduce((acc, curr) => acc + Number(curr.preco), 0)
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
        // Membros do Clube só agendam Terça (2), Quarta (3) e Quinta (4)
        if (clienteEhMembroClube && ![2, 3, 4].includes(diaSemana)) {
          alert(
            "Como membro do Clube do Hiroschi, os agendamentos estão disponíveis apenas de Terça a Quinta-feira."
          )
          return false
        }
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

        // Gera os horários conforme a configuração do dia da semana selecionado
        const [anoCfg, mesCfg, diaCfg] = dataSelecionada.split("-")
        const diaSemanaSel = new Date(Number(anoCfg), Number(mesCfg) - 1, Number(diaCfg)).getDay()
        const cfgDia = configFuncionamento.horarios[String(diaSemanaSel)]
        if (!cfgDia || cfgDia.fechado) {
          container.innerHTML =
            "<p style='color: #d90429; grid-column: span 3; text-align:center; font-weight:bold;'>Fechado neste dia da semana.</p>"
          return
        }
        // Restrição para membros do Clube: somente Terça, Quarta e Quinta
        if (clienteEhMembroClube && ![2, 3, 4].includes(diaSemanaSel)) {
          container.innerHTML =
            "<p style='color: #d90429; grid-column: span 3; text-align:center; font-weight:bold;'>Membros do Clube do Hiroschi agendam apenas de Terça a Quinta-feira.</p>"
          return
        }
        const horariosDoDia = gerarHorarios(cfgDia.abertura, cfgDia.fechamento)

        try {
          const q = query(collection(db, "agendamentos"), where("data", "==", dataSelecionada))
          const querySnapshot = await getDocs(q)

          // Monta os intervalos ocupados [inicio, fim) em minutos, considerando a
          // duração de cada serviço já agendado (bloqueio por tempo de serviço).
          const intervalosOcupados: { inicio: number; fim: number }[] = []
          querySnapshot.forEach((docSnap: any) => {
            const ag = docSnap.data()
            if (!ag.horario) return
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
        const telLimpo = String(clienteTelefone || "").replace(/\D/g, "")
        if (!telLimpo) return
        try {
          const refMembro = doc(db, "membros_clube", telLimpo)
          const snap = await getDoc(refMembro)
          if (snap.exists()) {
            clienteEhMembroClube = true
            clienteCategoriaClube = snap.data().categoria || null
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
        })
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
        body {
          margin: 0;
          background-color: #f0f2f5;
          font-family: sans-serif;
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
          border: 4px solid #002855;
          padding: 25px 15px;
          display: flex;
          flex-direction: column;
          box-shadow: 0px 10px 25px rgba(0, 0, 0, 0.1);
          box-sizing: border-box;
          overflow-y: auto;
          position: relative;
        }
        .hidden { display: none !important; }
        #logo { font-size: 24px; color: #002855; text-align: center; margin-top: 10px; margin-bottom: 25px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
        h2 { font-size: 18px; color: #002855; margin-bottom: 15px; text-align: center; font-weight: bold; }
        .form { width: 100%; display: flex; flex-direction: column; gap: 15px; }
        input, select { width: 100%; padding: 14px; background-color: #ffffff; border: 1px solid #ccd1d9; border-radius: 8px; color: #333; font-size: 16px; box-sizing: border-box; outline: none; }
        input:focus, select:focus { border-color: #002855; }
        label { color: #65676b; font-size: 13px; margin-bottom: -5px; padding-left: 5px; }
        button { width: 100%; padding: 14px; background-color: #d90429; border: none; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
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
        .card-foto { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid #e4e6eb; flex-shrink: 0; }
        .preview-foto-edit { width: 100%; max-height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #e4e6eb; margin-top: 4px; }
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
          <p style={{ color: "#65676b", fontSize: "14px", textAlign: "center", marginBottom: "20px" }}>Escolha o que deseja fazer hoje:</p>
          <div className="btn-menu" id="opt-agendamento">
            <div>Novo Agendamento<span className="sub-txt">Escolha e combine os serviços desejados.</span></div>
            <span>➔</span>
          </div>
          <div className="btn-menu" id="opt-meus-horarios" style={{ borderLeftColor: "#65676b" }}>
            <div>Ver Meus Agendamentos<span className="sub-txt">Consulte ou cancele seus horários marcados.</span></div>
            <span>➔</span>
          </div>
          <div className="btn-menu" id="opt-produtos" style={{ borderLeftColor: "#2e7d32" }}>
            <div>Produtos<span className="sub-txt">Confira nossa linha de produtos exclusivos.</span></div>
            <span>➔</span>
          </div>
          <div className="btn-menu" id="opt-clube" style={{ borderLeftColor: "#d90429" }}>
            <div>Clube do Hiroschi<span className="sub-txt">Nossos planos de assinatura mensal.</span></div>
            <span>➔</span>
          </div>
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
                <input type="text" id="novo-prod-foto" placeholder="URL da imagem" style={{ padding: "10px", fontSize: "14px" }} />
                <button id="btn-cadastrar-produto" style={{ marginTop: "5px", padding: "10px", backgroundColor: "#002855" }}>Cadastrar Produto</button>
              </div>
            </div>
            <div className="section-title">Alterar ou Excluir Produtos</div>
            <div id="lista-produtos-editor" className="card-list"></div>
          </div>
          <div id="conteudo-admin-horarios" className="hidden">
            <div className="admin-box">
              <h3>Horário de Funcionamento</h3>
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
          </div>
          <button id="btn-sair-admin" style={{ marginTop: "20px", backgroundColor: "#65676b", color: "#fff" }}>Voltar para o App</button>
        </div>
      </div>
    </>
  )
}
