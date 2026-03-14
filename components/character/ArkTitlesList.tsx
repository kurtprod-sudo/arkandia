'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkButton from '@/components/ui/ArkButton'

interface TitleView {
  id: string
  titleName: string
  titleDescription: string
  titleCategory: string
  grantedAt: string
}

interface ArkTitlesListProps {
  characterId: string
  titles: TitleView[]
  activeTitle: string | null
}

const CATEGORY_COLORS: Record<string, 'crimson' | 'gold' | 'bronze' | 'dead'> = {
  progressao: 'bronze',
  guerra: 'crimson',
  exploracao: 'bronze',
  maestria: 'gold',
  especial: 'gold',
  gm: 'crimson',
}

export default function ArkTitlesList({ characterId, titles, activeTitle }: ArkTitlesListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSetActive(titleName: string | null) {
    setLoading(titleName ?? '__remove')
    try {
      const res = await fetch('/api/titles/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          title_name: titleName,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.error ?? 'Erro ao definir título.')
      }
    } catch {
      alert('Erro de conexão.')
    } finally {
      setLoading(null)
      router.refresh()
    }
  }

  if (titles.length === 0) {
    return (
      <p className="text-xs font-body text-[var(--text-ghost)] italic">
        Nenhum título adquirido ainda.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {titles.map((t) => {
        const isActive = activeTitle === t.titleName
        return (
          <div
            key={t.id}
            className={`
              flex items-center justify-between p-3 rounded-sm
              ${isActive
                ? 'bg-[var(--ark-bg)]/80 border border-[var(--ark-gold)]/40'
                : 'bg-[var(--ark-bg)]/40 border border-[var(--ark-border)]/30'
              }
            `}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-body text-[var(--text-primary)] truncate">
                    {t.titleName}
                  </span>
                  <ArkBadge color={CATEGORY_COLORS[t.titleCategory] ?? 'dead'}>
                    {t.titleCategory}
                  </ArkBadge>
                  {isActive && (
                    <ArkBadge color="gold">Ativo</ArkBadge>
                  )}
                </div>
                <p className="text-[10px] font-body text-[var(--text-ghost)] mt-0.5 truncate">
                  {t.titleDescription}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 ml-2">
              {isActive ? (
                <ArkButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSetActive(null)}
                  disabled={loading !== null}
                >
                  {loading === '__remove' ? '...' : 'Remover'}
                </ArkButton>
              ) : (
                <ArkButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSetActive(t.titleName)}
                  disabled={loading !== null}
                >
                  {loading === t.titleName ? '...' : 'Exibir'}
                </ArkButton>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
