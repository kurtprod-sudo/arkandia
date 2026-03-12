'use client'

import { useState, useTransition } from 'react'
import { gmGrantCurrency, gmEditAttributes, gmEditCharacterStatus } from '@/app/gm/actions'
import { type CharacterWithAttributes } from '@/types'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkButton from '@/components/ui/ArkButton'
import { ATTR_ICONS, CoinIcon, CrystalIcon, DiamondIcon } from '@/components/ui/ArkIcons'

interface Props {
  characters: CharacterWithAttributes[]
}

const STATUS_LABELS = { active: 'Vivo', injured: 'Ferido', dead: 'Morto' } as const
const STATUS_BADGE: Record<string, 'alive' | 'injured' | 'dead'> = {
  active: 'alive', injured: 'injured', dead: 'dead',
}

const PROFESSION_LABELS: Record<string, string> = {
  comerciante: 'Comerciante', militar: 'Militar', clerigo: 'Clérigo',
  explorador: 'Explorador', artesao: 'Artesão', erudito: 'Erudito',
  nobre: 'Nobre', mercenario: 'Mercenário',
}

const ATTR_GRID: { key: string; abbr: string; color: string; iconKey: string }[] = [
  { key: 'ataque', abbr: 'ATQ', color: 'text-attr-ataque', iconKey: 'ataque' },
  { key: 'magia', abbr: 'MAG', color: 'text-attr-magia', iconKey: 'magia' },
  { key: 'eter_max', abbr: 'ETR', color: 'text-attr-eter', iconKey: 'eter' },
  { key: 'defesa', abbr: 'DEF', color: 'text-attr-defesa', iconKey: 'defesa' },
  { key: 'vitalidade', abbr: 'VIT', color: 'text-attr-vitalidade', iconKey: 'vitalidade' },
  { key: 'velocidade', abbr: 'VEL', color: 'text-attr-velocidade', iconKey: 'velocidade' },
  { key: 'precisao', abbr: 'PRE', color: 'text-attr-precisao', iconKey: 'precisao' },
  { key: 'tenacidade', abbr: 'TEN', color: 'text-attr-tenacidade', iconKey: 'tenacidade' },
  { key: 'capitania', abbr: 'CAP', color: 'text-attr-capitania', iconKey: 'capitania' },
]

export default function GMCharacterList({ characters }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {characters.length === 0 && (
        <p className="text-ark-text-muted text-sm font-body italic">Nenhum personagem criado ainda.</p>
      )}
      {characters.map((char) => (
        <CharacterRow
          key={char.id}
          character={char}
          isExpanded={expanded === char.id}
          onToggle={() => setExpanded(expanded === char.id ? null : char.id)}
        />
      ))}
    </div>
  )
}

function CharacterRow({
  character,
  isExpanded,
  onToggle,
}: {
  character: CharacterWithAttributes
  isExpanded: boolean
  onToggle: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const attrs = character.character_attributes
  const wallet = character.character_wallet

  function handleGrantCurrency(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const currency = fd.get('currency') as 'libras' | 'essencia' | 'premium_currency'
    const amount = parseInt(fd.get('amount') as string)
    if (!amount || amount <= 0) return

    startTransition(async () => {
      const result = await gmGrantCurrency({ character_id: character.id, currency, amount })
      setMessage(result.error ? `Erro: ${result.error}` : `+${amount} ${currency} concedidos.`)
    })
  }

  function handleStatusChange(status: 'active' | 'injured' | 'dead') {
    startTransition(async () => {
      const result = await gmEditCharacterStatus(character.id, status)
      setMessage(result?.error ? `Erro: ${result.error}` : `Status atualizado para ${status}.`)
    })
  }

  function handleEditAttr(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const attr = fd.get('attr') as string
    const value = parseInt(fd.get('value') as string)
    if (!attr || isNaN(value)) return

    startTransition(async () => {
      const result = await gmEditAttributes({
        character_id: character.id,
        attributes: { [attr]: value },
      })
      setMessage(result?.error ? `Erro: ${result.error}` : `${attr} definido para ${value}.`)
    })
  }

  return (
    <div className="bg-ark-bg-secondary rounded-xl border border-bronze-dark/25 overflow-hidden">
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-ark-bg-tertiary transition-colors"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-full bg-wine-dark/30 border border-bronze-mid/40 flex items-center justify-center font-display font-bold text-gold-pure">
            {character.name.charAt(0)}
          </div>
          <div>
            <p className="font-display text-sm font-bold text-gold-pure">{character.name}</p>
            <p className="text-xs text-ark-text-muted font-body">
              Nv {character.level} • {PROFESSION_LABELS[character.profession] ?? character.profession}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ArkBadge color={STATUS_BADGE[character.status]}>
            {STATUS_LABELS[character.status]}
          </ArkBadge>
          <span className="text-ark-text-muted text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="border-t border-bronze-dark/20 px-5 py-4 space-y-5">
          {message && (
            <p className={`text-sm font-body ${message.startsWith('Erro') ? 'text-status-dead' : 'text-status-alive'}`}>
              {message}
            </p>
          )}

          {/* Current attributes */}
          {attrs && (
            <div>
              <p className="text-xs text-ark-text-muted uppercase tracking-wider mb-2 font-body">Atributos atuais</p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {ATTR_GRID.map(({ key, abbr, color, iconKey }) => {
                  const Icon = ATTR_ICONS[iconKey as keyof typeof ATTR_ICONS]
                  return (
                    <div key={key} className="bg-ark-bg-primary rounded-lg p-2 border border-bronze-dark/15">
                      <div className="flex items-center gap-1 mb-0.5">
                        {Icon && <Icon className={color} size={12} />}
                        <p className="text-ark-text-muted font-data">{abbr}</p>
                      </div>
                      <p className={`font-data font-bold ${color}`}>
                        {attrs[key as keyof typeof attrs]}
                      </p>
                    </div>
                  )
                })}
                <div className="bg-ark-bg-primary rounded-lg p-2 border border-bronze-dark/15">
                  <p className="text-ark-text-muted font-data text-xs">HP</p>
                  <p className="font-data font-bold text-wine-glow">{attrs.hp_atual}/{attrs.hp_max}</p>
                </div>
                <div className="bg-ark-bg-primary rounded-lg p-2 border border-bronze-dark/15">
                  <p className="text-ark-text-muted font-data text-xs">Moral</p>
                  <p className="font-data font-bold text-attr-moral">{attrs.moral}</p>
                </div>
                <div className="bg-ark-bg-primary rounded-lg p-2 border border-bronze-dark/15">
                  <p className="text-ark-text-muted font-data text-xs">Pts</p>
                  <p className="font-data font-bold text-gold-pure">{attrs.attribute_points}</p>
                </div>
              </div>
            </div>
          )}

          {/* Wallet */}
          {wallet && (
            <div>
              <p className="text-xs text-ark-text-muted uppercase tracking-wider mb-2 font-body">Carteira</p>
              <div className="flex gap-4 text-sm font-body">
                <span className="flex items-center gap-1">
                  <CoinIcon className="text-gold-pure" size={14} />
                  <strong className="text-gold-pure font-data">{wallet.libras}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <CrystalIcon className="text-attr-capitania" size={14} />
                  <strong className="text-attr-capitania font-data">{wallet.essencia}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <DiamondIcon className="text-status-alive" size={14} />
                  <strong className="text-status-alive font-data">{wallet.premium_currency}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Edit attribute */}
          <form onSubmit={handleEditAttr} className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-ark-text-muted block mb-1 font-body">Atributo</label>
              <select
                name="attr"
                className="bg-ark-bg-primary border border-bronze-dark/30 text-ark-text-primary text-sm rounded-lg px-2 py-1.5 font-data focus:outline-none focus:border-bronze-mid/50"
              >
                {['ataque','magia','eter_max','eter_atual','defesa','vitalidade','hp_max','hp_atual',
                  'velocidade','precisao','tenacidade','capitania','moral','attribute_points'].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ark-text-muted block mb-1 font-body">Valor</label>
              <input
                name="value"
                type="number"
                placeholder="0"
                className="w-24 bg-ark-bg-primary border border-bronze-dark/30 text-ark-text-primary text-sm rounded-lg px-2 py-1.5 font-data focus:outline-none focus:border-bronze-mid/50"
              />
            </div>
            <ArkButton type="submit" disabled={pending} variant="secondary" size="sm">
              Definir
            </ArkButton>
          </form>

          {/* Grant currency */}
          <form onSubmit={handleGrantCurrency} className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-ark-text-muted block mb-1 font-body">Moeda</label>
              <select
                name="currency"
                className="bg-ark-bg-primary border border-bronze-dark/30 text-ark-text-primary text-sm rounded-lg px-2 py-1.5 font-data focus:outline-none focus:border-bronze-mid/50"
              >
                <option value="libras">Libras</option>
                <option value="essencia">Essência</option>
                <option value="premium_currency">Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ark-text-muted block mb-1 font-body">Quantidade</label>
              <input
                name="amount"
                type="number"
                min="1"
                placeholder="100"
                className="w-24 bg-ark-bg-primary border border-bronze-dark/30 text-ark-text-primary text-sm rounded-lg px-2 py-1.5 font-data focus:outline-none focus:border-bronze-mid/50"
              />
            </div>
            <ArkButton type="submit" disabled={pending} size="sm">
              Conceder
            </ArkButton>
          </form>

          {/* Change status */}
          <div>
            <p className="text-xs text-ark-text-muted uppercase tracking-wider mb-2 font-body">Alterar status</p>
            <div className="flex gap-2">
              {(['active', 'injured', 'dead'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={pending || character.status === s}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    s === 'active' ? 'bg-emerald-950/40 border-emerald-800/40 text-status-alive hover:bg-emerald-950/60' :
                    s === 'injured' ? 'bg-amber-950/40 border-amber-800/40 text-status-injured hover:bg-amber-950/60' :
                    'bg-red-950/40 border-red-800/40 text-status-dead hover:bg-red-950/60'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
