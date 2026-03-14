'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkModal from '@/components/ui/ArkModal'

const REACTION_SYMBOLS: { key: string; emoji: string; label: string }[] = [
  { key: 'chama',   emoji: '🔥', label: 'Chama' },
  { key: 'espada',  emoji: '⚔️', label: 'Espada' },
  { key: 'estrela', emoji: '✦',  label: 'Estrela' },
  { key: 'lacre',   emoji: '🔏', label: 'Lacre' },
  { key: 'corvo',   emoji: '🐦', label: 'Corvo' },
]

interface DiaryEntryView {
  id: string
  title: string
  content: string
  isLoreConfirmed: boolean
  createdAt: string
  reactionCounts: Record<string, number>
  myReaction: string | null
}

interface DiaryPanelProps {
  characterId: string
  characterName: string
  characterTitle: string | null
  characterAvatarUrl: string | null
  entries: DiaryEntryView[]
  isOwner: boolean
  myCharacterId: string | null
}

export default function DiaryPanel({
  characterId,
  characterName,
  characterTitle,
  entries: initialEntries,
  isOwner,
  myCharacterId,
}: DiaryPanelProps) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/diary/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          title: newTitle,
          content: newContent,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'Erro desconhecido.')
        return
      }
      setNewTitle('')
      setNewContent('')
      setShowNewModal(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [characterId, newTitle, newContent, router])

  const handleDelete = useCallback(async (entryId: string) => {
    const res = await fetch('/api/diary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId }),
    })
    const data = await res.json()
    if (data.success) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId))
    }
  }, [])

  const handleReact = useCallback(async (entryId: string, symbol: string) => {
    if (!myCharacterId) return
    const res = await fetch('/api/diary/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_id: entryId,
        character_id: myCharacterId,
        symbol,
      }),
    })
    const data = await res.json()
    if (!data.success) return

    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e
        const counts = { ...e.reactionCounts }
        if (data.added) {
          // Remove contagem do símbolo anterior se trocou
          if (e.myReaction && e.myReaction !== symbol) {
            counts[e.myReaction] = Math.max(0, (counts[e.myReaction] ?? 0) - 1)
          }
          counts[symbol] = (counts[symbol] ?? 0) + (e.myReaction === symbol ? 0 : 1)
          return { ...e, reactionCounts: counts, myReaction: symbol }
        } else {
          // Toggle off
          counts[symbol] = Math.max(0, (counts[symbol] ?? 0) - 1)
          return { ...e, reactionCounts: counts, myReaction: null }
        }
      })
    )
  }, [myCharacterId])

  const formatDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl text-[var(--text-primary)] mb-1">
          Diário de {characterName}
        </h1>
        {characterTitle && (
          <p className="font-body italic text-sm text-[var(--text-label)]">
            &quot;{characterTitle}&quot;
          </p>
        )}
      </div>

      {/* New entry button */}
      {isOwner && (
        <div className="mb-6 text-center">
          <ArkButton variant="primary" onClick={() => setShowNewModal(true)}>
            Nova Entrada
          </ArkButton>
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-ghost)] font-body italic">
            O diário está em branco.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-[var(--ark-bg)] border border-[#2a1008] rounded-md p-5"
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="font-display text-lg text-[var(--text-primary)] truncate">
                    {entry.title}
                  </h3>
                  {entry.isLoreConfirmed && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-data tracking-wider uppercase bg-[var(--ark-gold)]/20 text-[var(--text-gold)] border border-[var(--ark-gold)]/40 rounded">
                      Lore Confirmado
                    </span>
                  )}
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="text-[var(--text-ghost)] hover:text-[var(--ark-red-glow)] transition-colors text-xs font-data"
                  >
                    Excluir
                  </button>
                )}
              </div>

              {/* Content */}
              <p className="font-body text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed mb-4">
                {entry.content}
              </p>

              {/* Footer: date + reactions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1a0808]">
                <span className="font-data text-[10px] text-[var(--text-ghost)] tracking-wider">
                  {formatDate(entry.createdAt)}
                </span>

                {/* Reactions bar */}
                <div className="flex items-center gap-1">
                  {REACTION_SYMBOLS.map(({ key, emoji }) => {
                    const count = entry.reactionCounts[key] ?? 0
                    const isActive = entry.myReaction === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleReact(entry.id, key)}
                        disabled={!myCharacterId}
                        className={`
                          flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
                          ${isActive
                            ? 'bg-[var(--ark-red)]/30 border border-[var(--ark-border-bright)]'
                            : 'bg-transparent border border-transparent hover:border-[var(--ark-border)]'}
                          ${!myCharacterId ? 'opacity-40 cursor-default' : 'cursor-pointer'}
                        `}
                        title={key}
                      >
                        <span>{emoji}</span>
                        {count > 0 && (
                          <span className="font-data text-[10px] text-[var(--text-secondary)]">
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New entry modal */}
      <ArkModal open={showNewModal} onClose={() => setShowNewModal(false)} title="Nova Entrada no Diário">
        <div className="space-y-4">

          <div>
            <label className="block font-data text-[11px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-1">
              Título
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={120}
              className="w-full bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded px-3 py-2 text-sm font-body text-[var(--text-primary)] focus:border-[var(--ark-border-bright)] focus:outline-none transition-colors"
              placeholder="Título da entrada..."
            />
          </div>

          <div>
            <label className="block font-data text-[11px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-1">
              Conteúdo
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              maxLength={3000}
              rows={8}
              className="w-full bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded px-3 py-2 text-sm font-body text-[var(--text-primary)] focus:border-[var(--ark-border-bright)] focus:outline-none transition-colors resize-none"
              placeholder="Escreva como seu personagem..."
            />
            <p className="text-right font-data text-[10px] text-[var(--text-ghost)] mt-1">
              {newContent.length}/3000
            </p>
          </div>

          {error && (
            <p className="text-sm font-body text-[var(--ark-red-glow)]">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <ArkButton variant="ghost" onClick={() => setShowNewModal(false)}>
              Cancelar
            </ArkButton>
            <ArkButton
              variant="primary"
              onClick={handleCreate}
              disabled={saving || !newTitle.trim() || !newContent.trim()}
            >
              {saving ? 'Salvando...' : 'Publicar'}
            </ArkButton>
          </div>
        </div>
      </ArkModal>
    </div>
  )
}
