'use client'

import { useState, useTransition } from 'react'
import { distributeAttribute } from '@/app/character/actions'
import { type CharacterAttributes } from '@/types'
import ArkButton from '@/components/ui/ArkButton'
import { ATTR_ICONS } from '@/components/ui/ArkIcons'

interface Props {
  characterId: string
  availablePoints: number
  currentAttributes: CharacterAttributes
}

type DistributableAttr = 'ataque' | 'magia' | 'eter_max' | 'defesa' | 'vitalidade' | 'velocidade' | 'precisao' | 'tenacidade' | 'capitania'

const ATTRS: { key: DistributableAttr; label: string; desc: string; color: string; iconKey: string }[] = [
  { key: 'ataque', label: 'Ataque', desc: 'Dano físico', color: 'text-attr-ataque', iconKey: 'ataque' },
  { key: 'magia', label: 'Magia', desc: 'Habilidades místicas e curas', color: 'text-attr-magia', iconKey: 'magia' },
  { key: 'eter_max', label: 'Éter', desc: 'Recurso para ativar habilidades', color: 'text-attr-eter', iconKey: 'eter' },
  { key: 'defesa', label: 'Defesa', desc: 'Mitiga todo tipo de dano', color: 'text-attr-defesa', iconKey: 'defesa' },
  { key: 'vitalidade', label: 'Vitalidade', desc: 'Determina HP máximo (+10 HP cada)', color: 'text-attr-vitalidade', iconKey: 'vitalidade' },
  { key: 'velocidade', label: 'Velocidade', desc: 'Iniciativa e chance de esquiva', color: 'text-attr-velocidade', iconKey: 'velocidade' },
  { key: 'precisao', label: 'Precisão', desc: 'Chance de aplicar efeitos negativos', color: 'text-attr-precisao', iconKey: 'precisao' },
  { key: 'tenacidade', label: 'Tenacidade', desc: 'Resistência a efeitos negativos', color: 'text-attr-tenacidade', iconKey: 'tenacidade' },
  { key: 'capitania', label: 'Capitania', desc: 'Limite de tropas lideradas', color: 'text-attr-capitania', iconKey: 'capitania' },
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
    <div className="bg-[#6e160f]/15 border border-[#6e160f]/30 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm text-[var(--ark-gold-bright)] text-glow-gold">
          Pontos para distribuir
        </h2>
        <span className="text-2xl font-data font-bold text-[var(--ark-gold-bright)]">{remaining}</span>
      </div>

      <div className="space-y-2 mb-4">
        {ATTRS.map(({ key, label, desc, color, iconKey }) => {
          const currentVal = currentAttributes[key]
          const pendingVal = pendingDistrib[key] ?? 0
          const Icon = ATTR_ICONS[iconKey as keyof typeof ATTR_ICONS]
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {Icon && <Icon className={color} size={14} />}
                  <p className={`text-sm font-body font-medium ${color}`}>{label}</p>
                </div>
                <p className="text-xs text-[var(--text-label)] truncate">{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjust(key, -1)}
                  disabled={pendingVal <= 0}
                  className="w-7 h-7 rounded-sm bg-[var(--ark-bg-raised)] border border-[var(--ark-gold-dim)] hover:border-[var(--ark-gold)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] font-bold transition-colors font-data"
                >
                  −
                </button>
                <span className="w-20 text-center font-data text-sm">
                  <span className="text-[var(--text-primary)]">{currentVal}</span>
                  {pendingVal > 0 && (
                    <span className="text-[var(--ark-gold-bright)]"> +{pendingVal}</span>
                  )}
                </span>
                <button
                  onClick={() => adjust(key, 1)}
                  disabled={remaining <= 0}
                  className="w-7 h-7 rounded-sm bg-[var(--ark-bg-raised)] border border-[var(--ark-gold-dim)] hover:border-[var(--ark-gold)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-primary)] font-bold transition-colors font-data"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {message && (
        <p className={`text-sm mb-3 font-body ${message.includes('!') ? 'text-status-alive' : 'text-status-dead'}`}>
          {message}
        </p>
      )}

      <ArkButton
        onClick={confirm}
        disabled={pending || totalPending === 0}
        className="w-full"
        size="lg"
      >
        {pending ? 'Aplicando...' : 'Confirmar Distribuição'}
      </ArkButton>
    </div>
  )
}
