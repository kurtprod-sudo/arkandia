'use client'

import { useState, useTransition } from 'react'
import { distributeAttribute } from '@/app/character/actions'
import { type CharacterAttributes } from '@/types'

interface Props {
  characterId: string
  availablePoints: number
  currentAttributes: CharacterAttributes
}

type DistributableAttr = 'ataque' | 'magia' | 'eter_max' | 'defesa' | 'vitalidade' | 'velocidade' | 'precisao' | 'tenacidade' | 'capitania'

const ATTRS: { key: DistributableAttr; label: string; desc: string }[] = [
  { key: 'ataque', label: 'Ataque', desc: 'Dano físico' },
  { key: 'magia', label: 'Magia', desc: 'Habilidades místicas e curas' },
  { key: 'eter_max', label: 'Éter', desc: 'Recurso para ativar habilidades' },
  { key: 'defesa', label: 'Defesa', desc: 'Mitiga todo tipo de dano' },
  { key: 'vitalidade', label: 'Vitalidade', desc: 'Determina HP máximo (+10 HP cada)' },
  { key: 'velocidade', label: 'Velocidade', desc: 'Iniciativa e chance de esquiva' },
  { key: 'precisao', label: 'Precisão', desc: 'Chance de aplicar efeitos negativos' },
  { key: 'tenacidade', label: 'Tenacidade', desc: 'Resistência a efeitos negativos' },
  { key: 'capitania', label: 'Capitania', desc: 'Limite de tropas lideradas' },
]

export default function AttributeDistributor({ characterId, availablePoints, currentAttributes }: Props) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [pendingDistrib, setPendingDistrib] = useState<Record<string, number>>({})

  const totalPending = Object.values(pendingDistrib).reduce((a, b) => a + b, 0)
  const remaining = availablePoints - totalPending

  function adjust(attr: DistributableAttr, delta: number) {
    setPendingDistrib((prev) => {
      const current = prev[attr] ?? 0
      const next = current + delta
      if (next < 0 || totalPending - current + next > availablePoints) return prev
      return { ...prev, [attr]: next }
    })
  }

  function confirm() {
    startTransition(async () => {
      setMessage(null)
      for (const [attr, amount] of Object.entries(pendingDistrib)) {
        if (amount <= 0) continue
        const result = await distributeAttribute({
          character_id: characterId,
          attribute: attr as DistributableAttr,
          amount,
        })
        if (result?.error) {
          setMessage(result.error)
          return
        }
      }
      setPendingDistrib({})
      setMessage('Atributos distribuídos!')
    })
  }

  return (
    <div className="bg-amber-950/20 border border-amber-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-amber-400 font-bold">
          Pontos para distribuir
        </h2>
        <span className="text-2xl font-bold text-amber-400">{remaining}</span>
      </div>

      <div className="space-y-2 mb-4">
        {ATTRS.map(({ key, label, desc }) => {
          const currentVal = currentAttributes[key]
          const pending = pendingDistrib[key] ?? 0
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{label}</p>
                <p className="text-xs text-neutral-500 truncate">{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjust(key, -1)}
                  disabled={pending <= 0 || pending === undefined}
                  className="w-7 h-7 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold"
                >
                  −
                </button>
                <span className="w-20 text-center font-mono text-sm">
                  <span className="text-white">{currentVal}</span>
                  {pending > 0 && (
                    <span className="text-amber-400"> +{pending}</span>
                  )}
                </span>
                <button
                  onClick={() => adjust(key, 1)}
                  disabled={remaining <= 0}
                  className="w-7 h-7 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {message && (
        <p className={`text-sm mb-3 ${message.includes('!') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}

      <button
        onClick={confirm}
        disabled={pending || totalPending === 0}
        className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black font-bold rounded transition-colors"
      >
        {pending ? 'Aplicando...' : 'Confirmar Distribuição'}
      </button>
    </div>
  )
}
