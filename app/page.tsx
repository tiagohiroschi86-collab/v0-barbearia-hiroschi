"use client"

import React, { useState, useEffect } from "react"
import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, onSnapshot } from "firebase/firestore"
import { Eye, EyeOff, Trash2, Calendar, Clock, User, Phone, CheckCircle, AlertCircle } from "lucide-react"

// Configuração Nativa do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBg_BaH-0ECyJo8h0oOmTlZgt1FU3uCevQ",
  authDomain: "barbearia-do-hiroschi.firebaseapp.com",
  projectId: "barbearia-do-hiroschi",
  storageBucket: "barbearia-do-hiroschi.firebasestorage.app",
  messagingSenderId: "630587096303",
  appId: "1:630587096303:web:cacab13a15420e4a5d6f1a"
}

// Inicializa o Firebase sem duplicar a conexão
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export default function BarbeariaApp() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Busca os agendamentos em tempo real
    const unsubAgendamentos = onSnapshot(collection(db, "agendamentos"), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setAgendamentos(docs)
      setCarregando(false)
    }, (error) => {
      console.error("Erro ao carregar agendamentos:", error)
      setCarregando(false)
    })

    // Busca os clientes em tempo real
    const unsubClientes = onSnapshot(collection(db, "clientes"), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setClientes(docs)
    }, (error) => {
      console.error("Erro ao carregar clientes:", error)
    })

    return () => {
      unsubAgendamentos()
      unsubClientes()
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 font-sans">
      <header className="max-w-md mx-auto text-center py-6">
        <h1 className="text-2xl font-bold text-amber-500">Barbearia Hiroschi</h1>
        <p className="text-xs text-neutral-400">Painel Principal Conectado</p>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-amber-500 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Agendamentos Recentes
          </h2>
          {carregando ? (
            <p className="text-sm text-neutral-500 text-center py-4">Carregando dados do Firebase...</p>
          ) : agendamentos.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="space-y-3">
              {agendamentos.map((item) => (
                <div key={item.id} className="bg-neutral-800/50 p-3 rounded-lg border border-neutral-700/50 text-sm">
                  <p className="font-medium text-amber-400">{item.nome || item.cliente || "Cliente"}</p>
                  <p className="text-xs text-neutral-400">{item.data || "Data não informada"} - {item.horario || item.hora || ""}</p>
                  <p className="text-xs text-neutral-300 mt-1">{item.servico || "Serviço não especificado"}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3 text-amber-500 flex items-center gap-2">
            <User className="w-5 h-5" /> Clientes Cadastrados ({clientes.length})
          </h2>
          {clientes.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {clientes.slice(0, 5).map((cliente) => (
                <div key={cliente.id} className="flex justify-between items-center bg-neutral-800/30 p-2 rounded text-xs">
                  <span>{cliente.nome || "Sem nome"}</span>
                  <span className="text-neutral-400">{cliente.telefone || ""}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
