"use client"

import { useState, useEffect } from "react"

export default function BarbeariaHiroschi() {
  const [estaLogado, setEstaLogado] = useState(false)
  const [whatsapp, setWhatsapp] = useState("")

  const lidarComLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (whatsapp.trim().length >= 8) {
      setEstaLogado(true)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 flex flex-col items-center justify-center">
      {!estaLogado ? (
        <div className="w-full max-w-sm bg-neutral-900 p-6 rounded-2xl border border-neutral-800 text-center">
          <h1 className="text-2xl font-bold text-amber-500 mb-6">Barbearia Hiroschi</h1>
          <form onSubmit={lidarComLogin} className="space-y-4">
            <input 
              type="tel" 
              placeholder="Seu WhatsApp" 
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full p-4 bg-neutral-950 border border-neutral-800 rounded-xl"
              required
            />
            <button type="submit" className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl">
              Acessar Sistema
            </button>
          </form>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Bem-vindo ao Sistema!</h1>
          <button onClick={() => setEstaLogado(false)} className="mt-4 text-neutral-500 underline">Sair</button>
        </div>
      )}
    </div>
  )
}
