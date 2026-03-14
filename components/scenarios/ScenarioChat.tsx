'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'

interface ChatMessage {
  id: string
  characterId: string
  characterName: string
  content: string
  isOoc: boolean
  createdAt: string
}

interface PresenceEntry {
  characterId: string
  characterName: string
  characterLevel: number
  characterClass: string
}

interface ScenarioChatProps {
  scenarioId: string
  scenario: { name: string; description: string; location: string; max_players: number }
  myCharacter: { id: string; name: string }
  initialMessages: ChatMessage[]
  initialPresence: PresenceEntry[]
  isAlreadyPresent: boolean
}

export default function ScenarioChat({
  scenarioId,
  scenario,
  myCharacter,
  initialMessages,
  initialPresence,
  isAlreadyPresent,
}: ScenarioChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [presence, setPresence] = useState<PresenceEntry[]>(initialPresence)
  const [isPresent, setIsPresent] = useState(isAlreadyPresent)
  const [input, setInput] = useState('')
  const [isOoc, setIsOoc] = useState(false)
  const [sending, setSending] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient()

    const messagesChannel = supabase
      .channel(`scenario-messages-${scenarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scenario_messages',
          filter: `scenario_id=eq.${scenarioId}`,
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>
          // Fetch character name for the message
          const charId = row.character_id as string
          const existingPresence = presence.find((p) => p.characterId === charId)
          const charName = existingPresence?.characterName ?? '???'

          const newMsg: ChatMessage = {
            id: row.id as string,
            characterId: charId,
            characterName: charName,
            content: row.content as string,
            isOoc: (row.is_ooc as boolean) ?? false,
            createdAt: row.created_at as string,
          }

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    const presenceChannel = supabase
      .channel(`scenario-presence-${scenarioId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scenario_presence',
          filter: `scenario_id=eq.${scenarioId}`,
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>
          const charId = row.character_id as string

          // Fetch character details
          const { data: ch } = await supabase
            .from('characters')
            .select('id, name, level, classes(name)')
            .eq('id', charId)
            .single()

          if (ch) {
            const entry: PresenceEntry = {
              characterId: ch.id,
              characterName: ch.name,
              characterLevel: ch.level,
              characterClass: ((ch.classes as Record<string, unknown>)?.name as string) ?? '',
            }
            setPresence((prev) => {
              if (prev.some((p) => p.characterId === charId)) return prev
              return [...prev, entry]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'scenario_presence',
          filter: `scenario_id=eq.${scenarioId}`,
        },
        (payload) => {
          const old = payload.old as Record<string, unknown>
          const charId = old.character_id as string
          setPresence((prev) => prev.filter((p) => p.characterId !== charId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(presenceChannel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId])

  const handleJoin = async () => {
    setJoining(true)
    setError(null)
    try {
      const res = await fetch('/api/scenarios/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId, character_id: myCharacter.id }),
      })
      const data = await res.json()
      if (data.success) {
        setIsPresent(true)
      } else {
        setError(data.error ?? 'Erro ao entrar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    try {
      await fetch('/api/scenarios/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId, character_id: myCharacter.id }),
      })
      router.push('/scenarios')
    } catch {
      setError('Erro ao sair.')
    }
  }

  const handleSend = async () => {
    if (sending || !input.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/scenarios/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenarioId,
          character_id: myCharacter.id,
          content: input.trim(),
          is_ooc: isOoc,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setInput('')
      } else {
        setError(data.error ?? 'Erro ao enviar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--ark-border)] bg-[var(--ark-surface)] backdrop-blur-xl flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-lg font-bold text-[var(--text-primary)]">
            {scenario.name}
          </h1>
          <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
            {scenario.location}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ArkButton variant="ghost" size="sm" onClick={() => router.push('/scenarios')}>
            &larr; Cenários
          </ArkButton>
          {isPresent && (
            <ArkButton variant="ghost" size="sm" onClick={handleLeave}>
              Sair
            </ArkButton>
          )}
        </div>
      </div>

      {/* Ephemeral notice */}
      <div className="px-4 py-1.5 bg-[rgba(110,22,15,0.1)] border-b border-[var(--ark-border)] flex-shrink-0">
        <p className="text-[10px] font-data text-[var(--text-ghost)] text-center tracking-wider uppercase">
          As mensagens deste cenário não são salvas ao fechar
        </p>
      </div>

      {/* Join gate */}
      {!isPresent && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <p className="text-sm text-[var(--text-secondary)] font-body">
              {scenario.description}
            </p>
            <ArkDivider variant="dark" />
            <ArkButton onClick={handleJoin} disabled={joining}>
              {joining ? 'Entrando…' : 'Entrar no cenário'}
            </ArkButton>
            {error && (
              <p className="text-xs text-[var(--ark-red-glow)] font-body">{error}</p>
            )}
          </div>
        </div>
      )}

      {/* Chat + Presence */}
      {isPresent && (
        <div className="flex flex-1 min-h-0">
          {/* Chat column */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-[var(--text-ghost)] text-xs font-body italic py-8">
                  O cenário aguarda suas primeiras palavras.
                </p>
              )}
              {messages.map((msg) => {
                const isMe = msg.characterId === myCharacter.id
                return (
                  <div key={msg.id} className={`flex gap-2 ${msg.isOoc ? 'opacity-50' : ''}`}>
                    <span
                      className={`font-data text-xs flex-shrink-0 mt-0.5 ${
                        isMe ? 'text-[var(--ark-gold-bright)]' : 'text-[var(--ark-gold)]'
                      }`}
                    >
                      {msg.characterName}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm break-words ${
                          msg.isOoc
                            ? 'italic text-[var(--text-ghost)] font-body'
                            : 'text-[var(--text-secondary)] font-body'
                        }`}
                      >
                        {msg.isOoc && (
                          <span className="text-[var(--text-ghost)] font-data text-[10px] mr-1">[OOC]</span>
                        )}
                        {msg.content}
                      </p>
                      <span className="text-[9px] text-[var(--text-ghost)] font-data">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[var(--ark-border)] bg-[var(--ark-surface)] flex-shrink-0">
              {error && (
                <p className="text-xs text-[var(--ark-red-glow)] font-body mb-2">{error}</p>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, 500))}
                    onKeyDown={handleKeyDown}
                    placeholder={isOoc ? 'Mensagem fora do personagem…' : 'Fale como seu personagem…'}
                    rows={2}
                    className="w-full px-3 py-2 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--ark-border-bright)] transition-all duration-200 resize-none"
                    style={{ fontFamily: 'var(--font-intelo)' }}
                    disabled={sending}
                  />
                  <span className="absolute bottom-1.5 right-2 text-[9px] font-data text-[var(--text-ghost)]">
                    {input.length}/500
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOoc(!isOoc)}
                    className={`px-2 py-1 rounded-sm text-[9px] font-data tracking-wider uppercase border transition-colors ${
                      isOoc
                        ? 'border-[var(--ark-border-bright)] text-[var(--text-label)] bg-[var(--ark-surface)]'
                        : 'border-[var(--ark-border)] text-[var(--text-ghost)] hover:text-[var(--text-label)]'
                    }`}
                    title="Toggle OOC (fora do personagem)"
                  >
                    OOC
                  </button>
                  <ArkButton
                    size="sm"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                  >
                    {sending ? '…' : 'Enviar'}
                  </ArkButton>
                </div>
              </div>
            </div>
          </div>

          {/* Presence sidebar */}
          <div className="w-[200px] border-l border-[var(--ark-border)] bg-[var(--ark-surface)] backdrop-blur-xl flex-shrink-0 overflow-y-auto hidden md:block">
            <div className="px-3 py-3">
              <p className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">
                Presentes ({presence.length}/{scenario.max_players})
              </p>
              <div className="space-y-2">
                {presence.map((p) => {
                  const isMe = p.characterId === myCharacter.id
                  return (
                    <div key={p.characterId} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className={`font-data text-xs truncate ${isMe ? 'text-[var(--ark-gold-bright)]' : 'text-[var(--text-secondary)]'}`}>
                          {p.characterName}
                        </p>
                        <p className="text-[9px] font-data text-[var(--text-ghost)] truncate">
                          Nv {p.characterLevel} · {p.characterClass || '—'}
                        </p>
                      </div>
                      {isMe && (
                        <span className="text-[8px] font-data text-[var(--ark-red-glow)] uppercase tracking-wider flex-shrink-0 ml-1">
                          Você
                        </span>
                      )}
                    </div>
                  )
                })}
                {presence.length === 0 && (
                  <p className="text-[10px] text-[var(--text-ghost)] font-body italic">
                    Ninguém aqui ainda.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
