'use client'

import { useState, useEffect } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import { Sparkles, X } from 'lucide-react'

interface EchoModalProps {
  characterId: string
  onClose: () => void
}

const ARCHETYPE_COLORS: Record<string, string> = {
  ordem: '#4a90d9', caos: '#d94a4a', tempo: '#90d94a', espaco: '#d9d94a',
  materia: '#8b6914', vida: '#4ad96a', morte: '#8a4ad9', vontade: '#d96a4a',
  sonho: '#b04ad9', guerra: '#d9304a', vinculo: '#4ad9d9', ruina: '#6a6a6a',
}

export default function EchoModal({ characterId, onClose }: EchoModalProps) {
  const [loading, setLoading] = useState(true)
  const [echo, setEcho] = useState<{
    id: string; content: string; archetype: string
    essenciaReward: number; claimed: boolean
  } | null>(null)
  const [error, setError] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    fetch(`/api/daily/echo?character_id=${characterId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.echo) setEcho(data.echo)
        else setError(data.error ?? 'Erro ao carregar Eco.')
        setLoading(false)
      })
      .catch(() => { setError('Erro de conexão.'); setLoading(false) })
  }, [characterId])

  // Typewriter effect
  useEffect(() => {
    if (!echo?.content) return
    let i = 0
    const interval = setInterval(() => {
      setDisplayedText(echo.content.slice(0, i + 1))
      i++
      if (i >= echo.content.length) clearInterval(interval)
    }, 15)
    return () => clearInterval(interval)
  }, [echo?.content])

  const handleClaim = async () => {
    if (!echo) return
    setClaiming(true)
    const res = await fetch('/api/daily/echo/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, echo_id: echo.id }),
    })
    const data = await res.json()
    if (data.success) {
      setEcho({ ...echo, claimed: true })
    }
    setClaiming(false)
  }

  const color = echo ? (ARCHETYPE_COLORS[echo.archetype] ?? '#d3a539') : '#d3a539'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-lg mx-4 w-full bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded-sm relative overflow-hidden">
        {/* Gradient header */}
        <div className="h-1" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color }} />
              {echo && (
                <ArkBadge color="gold" className="text-[9px]">
                  {echo.archetype.charAt(0).toUpperCase() + echo.archetype.slice(1)}
                </ArkBadge>
              )}
            </div>
            <button onClick={onClose} className="text-[var(--text-label)] hover:text-[var(--text-secondary)]">
              <X size={16} />
            </button>
          </div>

          <h3 className="text-sm font-display font-bold text-[var(--text-primary)] mb-4">
            Eco do Arquétipo
          </h3>

          {loading && (
            <p className="text-xs font-body text-[var(--text-label)] italic py-8 text-center">
              O Arquétipo fala...
            </p>
          )}

          {error && (
            <p className="text-xs font-body text-[var(--ark-red-glow)] py-4 text-center">{error}</p>
          )}

          {echo && (
            <>
              <div className="text-sm font-body text-[var(--text-secondary)] leading-relaxed whitespace-pre-line mb-6 min-h-[120px]">
                {displayedText}
              </div>

              {!echo.claimed ? (
                <ArkButton onClick={handleClaim} disabled={claiming} className="w-full">
                  {claiming ? 'Reivindicando...' : `Reivindicar +${echo.essenciaReward} Essências`}
                </ArkButton>
              ) : (
                <p className="text-xs font-data text-status-alive text-center">
                  +{echo.essenciaReward} Essências reivindicadas
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
