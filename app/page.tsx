'use client'

import React, { useState, useEffect } from 'react'

export default function Home() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Força o carregamento a terminar em no máximo 1.5 segundos caso o Firebase demore ou falhe
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm font-medium text-muted-foreground">
            Carregando Barbearia Hiroschi...
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6">
      {/* Cabeçalho */}
      <header className="bg-black text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">Barbearia Hiroschi</h1>
          <p className="text-xs text-slate-400">Painel Principal de Gestão</p>
        </div>
        <span className="bg-emerald-500 text-black text-xs font-semibold px-3 py-1.5 rounded-md">
          Sistema Online
        </span>
      </header>

      {/* Grid de Atalhos / Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h2 className="font-semibold text-lg text-slate-800">Agenda de Hoje</h2>
          <p className="text-sm text-slate-500">Gerencie os horários marcados para hoje.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h2 className="font-semibold text-lg text-slate-800">Clientes Cadastrados</h2>
          <p className="text-sm text-slate-500">Consulte o histórico e contatos de clientes.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <h2 className="font-semibold text-lg text-slate-800">Controle Financeiro</h2>
          <p className="text-sm text-slate-500">Resumo de entradas e movimentações do caixa.</p>
        </div>
      </div>
    </main>
  )
}
