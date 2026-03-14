'use client'

import { useState, useCallback } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ExpeditionCountdown from './ExpeditionCountdown'

interface ExpeditionActionsProps {
  characterId: string
  activeExpedition: {
    id: string
    ends_at: string
    expedition_types: {
      name: string
      subtype: string
      risk_level: string
      duration_hours: number
    }
  } | null
  expeditionTypes: Array<{
    id: string
    name: string
    subtype: string
    risk_level: string
    duration_hours: number
    description: string
  }>
  isInjured: boolean
  injuredUntilText: string | null
}

const RISK_COLORS: Record<string, string> = {
  seguro:   'text-green-400',
  moderado: 'text-[var(--ark-amber)]',
  perigoso: 'text-orange-400',
  extremo:  'text-red-400',
}

const RISK_BG: Record<string, string> = {
  seguro:   'border-green-800/30',
  moderado: 'border-[var(--ark-amber)]/30',
  perigoso: 'border-orange-800/30',
  extremo:  'border-red-800/30',
}

const SUBTYPE_LABELS: Record<string, string> = {
  exploracao:     'Exploração',
  caca:           'Caça',
  investigacao:   'Investigação',
  missao_faccao:  'Missão de Facção',
}

export default function ExpeditionActions({
  characterId,
  activeExpedition,
  expeditionTypes,
  isInjured,
  injuredUntilText,
}: ExpeditionActionsProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    narrativeText: string
    xp: number
    libras: number
  } | null>(null)
  const [canCollect, setCanCollect] = useState(() => {
    if (!activeExpedition) return false
    return new Date(activeExpedition.ends_at).getTime() <= Date.now()
  })

  const handleStart = async (typeId: string) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/expeditions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, expedition_type_id: typeId }),
      })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else {
        setResult({ success: false, narrativeText: data.error ?? 'Erro desconhecido.', xp: 0, libras: 0 })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCollect = async () => {
    if (!activeExpedition) return
    setLoading(true)
    try {
      const res = await fetch('/api/expeditions/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expedition_id: activeExpedition.id }),
      })
      const data = await res.json()
      if (data.success && data.result) {
        setResult(data.result)
        // Reload after short delay so user can read the result
        setTimeout(() => window.location.reload(), 3000)
      } else {
        setResult({ success: false, narrativeText: data.error ?? 'Erro ao coletar.', xp: 0, libras: 0 })
      }
    } finally {
      setLoading(false)
    }
  }

  const onCountdownComplete = useCallback(() => {
    setCanCollect(true)
  }, [])

  // Result banner
  if (result) {
    return (
      <div className={`p-6 rounded-md border ${result.success ? 'border-green-800/40 bg-green-950/20' : 'border-red-800/40 bg-red-950/20'}`}>
        <p className={`font-body text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
          {result.narrativeText}
        </p>
      </div>
    )
  }

  // Active expedition
  if (activeExpedition) {
    const expType = activeExpedition.expedition_types
    const riskColor = RISK_COLORS[expType.risk_level] ?? 'text-[var(--text-label)]'

    return (
      <div className="bg-[var(--ark-bg)] rounded-md p-6 border border-[#2a1008]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-[var(--text-primary)]">
            {expType.name}
          </h3>
          <span className={`font-data text-xs tracking-[0.15em] uppercase ${riskColor}`}>
            {expType.risk_level}
          </span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className="font-data text-[11px] tracking-[0.2em] text-[var(--text-label)] uppercase">
            Tempo restante
          </span>
          <ExpeditionCountdown
            endsAt={activeExpedition.ends_at}
            onComplete={onCountdownComplete}
          />
        </div>

        <ArkButton
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canCollect || loading}
          onClick={handleCollect}
        >
          {loading ? 'Coletando...' : canCollect ? 'Coletar Resultado' : 'Em andamento...'}
        </ArkButton>
      </div>
    )
  }

  // Injured banner
  if (isInjured) {
    return (
      <>
        <div className="p-4 bg-red-950/20 border border-red-800/30 rounded-md mb-6">
          <p className="text-red-400 text-sm font-body">
            Personagem ferido{injuredUntilText ? ` — recuperação até ${injuredUntilText}` : ''}.
            Expedições indisponíveis durante recuperação.
          </p>
        </div>
        <ExpeditionGrid types={expeditionTypes} onStart={handleStart} disabled loading={loading} />
      </>
    )
  }

  // Available expeditions
  return <ExpeditionGrid types={expeditionTypes} onStart={handleStart} disabled={false} loading={loading} />
}

function ExpeditionGrid({
  types,
  onStart,
  disabled,
  loading,
}: {
  types: ExpeditionActionsProps['expeditionTypes']
  onStart: (id: string) => void
  disabled: boolean
  loading: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {types.map((t) => {
        const riskColor = RISK_COLORS[t.risk_level] ?? 'text-[var(--text-label)]'
        const riskBg = RISK_BG[t.risk_level] ?? 'border-[#2a1008]'

        return (
          <div
            key={t.id}
            className={`bg-[var(--ark-bg)] rounded-md p-5 border ${riskBg} hover:border-[var(--ark-border-bright)] transition-colors duration-200`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-display text-base text-[var(--text-primary)]">
                {t.name}
              </h4>
              <span className={`font-data text-[10px] tracking-[0.15em] uppercase ${riskColor} flex-shrink-0 ml-2`}>
                {t.risk_level}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <span className="font-data text-[10px] tracking-[0.15em] text-[var(--text-label)] uppercase">
                {SUBTYPE_LABELS[t.subtype] ?? t.subtype}
              </span>
              <span className="text-[var(--text-ghost)]">·</span>
              <span className="font-data text-[10px] tracking-[0.15em] text-[var(--text-label)] uppercase">
                {t.duration_hours}h
              </span>
            </div>

            <p className="font-body text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
              {t.description}
            </p>

            <ArkButton
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={disabled || loading}
              onClick={() => onStart(t.id)}
            >
              {loading ? 'Aguarde...' : 'Partir'}
            </ArkButton>
          </div>
        )
      })}
    </div>
  )
}
