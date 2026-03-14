'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ArkButton from '@/components/ui/ArkButton'
import ArkModal from '@/components/ui/ArkModal'

interface InboxLetter {
  id: string
  subject: string
  content: string
  isRead: boolean
  parentId: string | null
  createdAt: string
  senderName: string
  senderTitle: string | null
  senderId: string
}

interface SentLetter {
  id: string
  subject: string
  content: string
  isRead: boolean
  createdAt: string
  recipientName: string
  recipientTitle: string | null
}

interface LettersPanelProps {
  characterId: string
  characterName: string
  inbox: InboxLetter[]
  sent: SentLetter[]
}

interface SearchResult {
  id: string
  name: string
  title: string | null
}

export default function LettersPanel({
  characterId,
  inbox: initialInbox,
  sent: initialSent,
}: LettersPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')
  const [inbox, setInbox] = useState(initialInbox)
  const [selectedLetter, setSelectedLetter] = useState<InboxLetter | null>(null)
  const [selectedSentLetter, setSelectedSentLetter] = useState<SentLetter | null>(null)

  // New letter state
  const [showNewModal, setShowNewModal] = useState(false)
  const [recipientSearch, setRecipientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<SearchResult | null>(null)
  const [newSubject, setNewSubject] = useState('')
  const [newContent, setNewContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reply state
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced character search
  useEffect(() => {
    if (!recipientSearch.trim() || recipientSearch.length < 2) {
      setSearchResults([])
      return
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/characters/search?q=${encodeURIComponent(recipientSearch)}`)
        const data = await res.json()
        if (data.results) {
          setSearchResults(
            (data.results as SearchResult[]).filter((r: SearchResult) => r.id !== characterId)
          )
        }
      } catch {
        setSearchResults([])
      }
    }, 300)

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [recipientSearch, characterId])

  const handleSend = useCallback(async (
    recipientId: string,
    subject: string,
    content: string,
    parentId?: string
  ) => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/letters/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: characterId,
          recipient_id: recipientId,
          subject,
          content,
          parent_id: parentId,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'Erro desconhecido.')
        return false
      }
      return true
    } finally {
      setSending(false)
    }
  }, [characterId])

  const handleNewLetter = useCallback(async () => {
    if (!selectedRecipient) return
    const ok = await handleSend(selectedRecipient.id, newSubject, newContent)
    if (ok) {
      setShowNewModal(false)
      setNewSubject('')
      setNewContent('')
      setSelectedRecipient(null)
      setRecipientSearch('')
      router.refresh()
    }
  }, [selectedRecipient, newSubject, newContent, handleSend, router])

  const handleReply = useCallback(async () => {
    if (!selectedLetter) return
    setReplying(true)
    const ok = await handleSend(
      selectedLetter.senderId,
      `Re: ${selectedLetter.subject}`,
      replyContent,
      selectedLetter.id
    )
    if (ok) {
      setReplyContent('')
      setShowReplyForm(false)
      setSelectedLetter(null)
      router.refresh()
    }
    setReplying(false)
  }, [selectedLetter, replyContent, handleSend, router])

  const handleOpenInboxLetter = useCallback(async (letter: InboxLetter) => {
    setSelectedLetter(letter)
    setShowReplyForm(false)
    setReplyContent('')

    if (!letter.isRead) {
      await fetch('/api/letters/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter_id: letter.id }),
      })
      setInbox((prev) =>
        prev.map((l) => (l.id === letter.id ? { ...l, isRead: true } : l))
      )
    }
  }, [])

  const formatDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const tabs = [
    { key: 'inbox' as const, label: 'Recebidas', count: inbox.filter((l) => !l.isRead).length },
    { key: 'sent' as const, label: 'Enviadas', count: 0 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-[var(--text-primary)]">
          Correspondência
        </h1>
        <ArkButton variant="primary" onClick={() => setShowNewModal(true)}>
          Nova Carta
        </ArkButton>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1a0808]">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`
              px-4 py-2 font-data text-sm tracking-wider uppercase transition-colors
              ${activeTab === key
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--ark-red-glow)]'
                : 'text-[var(--text-ghost)] hover:text-[var(--text-secondary)]'}
            `}
          >
            {label}
            {count > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-[var(--ark-red)]/40 text-[var(--ark-red-glow)] rounded">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inbox */}
      {activeTab === 'inbox' && (
        <div className="space-y-2">
          {inbox.length === 0 ? (
            <p className="text-center py-12 text-[var(--text-ghost)] font-body italic">
              Caixa vazia.
            </p>
          ) : (
            inbox.map((letter) => (
              <button
                key={letter.id}
                type="button"
                onClick={() => handleOpenInboxLetter(letter)}
                className={`
                  w-full text-left px-4 py-3 rounded-md transition-colors
                  ${letter.isRead
                    ? 'bg-[var(--ark-bg)] border border-[#1a0808] hover:border-[#2a1008]'
                    : 'bg-[var(--ark-bg)] border border-[var(--ark-border-bright)] hover:border-[var(--ark-red-glow)]'}
                `}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-data text-sm truncate ${letter.isRead ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] font-semibold'}`}>
                      {letter.subject}
                    </p>
                    <p className="font-body text-xs text-[var(--text-label)] mt-0.5">
                      De: {letter.senderName}
                      {letter.senderTitle && ` — "${letter.senderTitle}"`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!letter.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[var(--ark-red-glow)]" />
                    )}
                    <span className="font-data text-[10px] text-[var(--text-ghost)]">
                      {formatDate(letter.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Sent */}
      {activeTab === 'sent' && (
        <div className="space-y-2">
          {initialSent.length === 0 ? (
            <p className="text-center py-12 text-[var(--text-ghost)] font-body italic">
              Nenhuma carta enviada.
            </p>
          ) : (
            initialSent.map((letter) => (
              <button
                key={letter.id}
                type="button"
                onClick={() => setSelectedSentLetter(letter)}
                className="w-full text-left px-4 py-3 bg-[var(--ark-bg)] border border-[#1a0808] rounded-md hover:border-[#2a1008] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-data text-sm text-[var(--text-secondary)] truncate">
                      {letter.subject}
                    </p>
                    <p className="font-body text-xs text-[var(--text-label)] mt-0.5">
                      Para: {letter.recipientName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-data text-[10px] ${letter.isRead ? 'text-[var(--text-ghost)]' : 'text-[var(--ark-red-glow)]'}`}>
                      {letter.isRead ? 'Lida' : 'Pendente'}
                    </span>
                    <span className="font-data text-[10px] text-[var(--text-ghost)]">
                      {formatDate(letter.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Read inbox letter modal */}
      <ArkModal open={!!selectedLetter} onClose={() => { setSelectedLetter(null); setShowReplyForm(false) }} title={selectedLetter?.subject ?? 'Carta'}>
        {selectedLetter && (
          <div className="space-y-4">
            <div>
              <p className="font-body text-xs text-[var(--text-label)] mt-1">
                De: <span className="text-[var(--text-secondary)]">{selectedLetter.senderName}</span>
                {selectedLetter.senderTitle && (
                  <span className="italic"> — &quot;{selectedLetter.senderTitle}&quot;</span>
                )}
                <span className="ml-2">{formatDate(selectedLetter.createdAt)}</span>
              </p>
            </div>

            <div className="h-px bg-[#1a0808]" />

            <p className="font-body text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {selectedLetter.content}
            </p>

            {/* Reply */}
            {!showReplyForm ? (
              <div className="flex justify-end">
                <ArkButton variant="secondary" onClick={() => setShowReplyForm(true)}>
                  Responder
                </ArkButton>
              </div>
            ) : (
              <div className="space-y-3 pt-3 border-t border-[#1a0808]">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  maxLength={3000}
                  rows={5}
                  className="w-full bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded px-3 py-2 text-sm font-body text-[var(--text-primary)] focus:border-[var(--ark-border-bright)] focus:outline-none transition-colors resize-none"
                  placeholder="Escreva sua resposta..."
                />
                <div className="flex justify-end gap-3">
                  <ArkButton variant="ghost" onClick={() => setShowReplyForm(false)}>
                    Cancelar
                  </ArkButton>
                  <ArkButton
                    variant="primary"
                    onClick={handleReply}
                    disabled={replying || !replyContent.trim()}
                  >
                    {replying ? 'Enviando...' : 'Enviar Resposta'}
                  </ArkButton>
                </div>
              </div>
            )}
          </div>
        )}
      </ArkModal>

      {/* Read sent letter modal */}
      <ArkModal open={!!selectedSentLetter} onClose={() => setSelectedSentLetter(null)} title={selectedSentLetter?.subject ?? 'Carta Enviada'}>
        {selectedSentLetter && (
          <div className="space-y-4">
            <div>
              <p className="font-body text-xs text-[var(--text-label)] mt-1">
                Para: <span className="text-[var(--text-secondary)]">{selectedSentLetter.recipientName}</span>
                <span className="ml-2">{formatDate(selectedSentLetter.createdAt)}</span>
                <span className="ml-2">
                  ({selectedSentLetter.isRead ? 'Lida' : 'Pendente'})
                </span>
              </p>
            </div>

            <div className="h-px bg-[#1a0808]" />

            <p className="font-body text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {selectedSentLetter.content}
            </p>
          </div>
        )}
      </ArkModal>

      {/* New letter modal */}
      <ArkModal open={showNewModal} onClose={() => { setShowNewModal(false); setError(null) }} title="Nova Carta">
        <div className="space-y-4">

          {/* Recipient search */}
          <div>
            <label className="block font-data text-[11px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-1">
              Destinatário
            </label>
            {selectedRecipient ? (
              <div className="flex items-center gap-2">
                <span className="font-body text-sm text-[var(--text-primary)]">
                  {selectedRecipient.name}
                  {selectedRecipient.title && (
                    <span className="text-[var(--text-label)] italic ml-1">— &quot;{selectedRecipient.title}&quot;</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedRecipient(null); setRecipientSearch('') }}
                  className="text-xs text-[var(--text-ghost)] hover:text-[var(--ark-red-glow)]"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="w-full bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded px-3 py-2 text-sm font-body text-[var(--text-primary)] focus:border-[var(--ark-border-bright)] focus:outline-none transition-colors"
                  placeholder="Buscar personagem..."
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--ark-bg-raised)] border border-[var(--ark-border)] rounded shadow-lg z-50 max-h-40 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setSelectedRecipient(r)
                          setRecipientSearch('')
                          setSearchResults([])
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--ark-surface)] transition-colors"
                      >
                        <span className="font-body text-sm text-[var(--text-primary)]">{r.name}</span>
                        {r.title && (
                          <span className="font-body text-xs text-[var(--text-label)] italic ml-2">
                            — &quot;{r.title}&quot;
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block font-data text-[11px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-1">
              Assunto
            </label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              maxLength={120}
              className="w-full bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded px-3 py-2 text-sm font-body text-[var(--text-primary)] focus:border-[var(--ark-border-bright)] focus:outline-none transition-colors"
              placeholder="Assunto da carta..."
            />
          </div>

          {/* Content */}
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
              onClick={handleNewLetter}
              disabled={sending || !selectedRecipient || !newSubject.trim() || !newContent.trim()}
            >
              {sending ? 'Enviando...' : 'Enviar Carta'}
            </ArkButton>
          </div>
        </div>
      </ArkModal>
    </div>
  )
}
