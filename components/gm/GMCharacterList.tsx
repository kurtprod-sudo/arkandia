'use client'

import { useState, useTransition } from 'react'
import { gmGrantCurrency, gmEditAttributes, gmEditCharacterStatus } from '@/app/gm/actions'
import { type CharacterWithAttributes } from '@/types'

interface Props {
  characters: CharacterWithAttributes[]
}

const STATUS_COLORS = {
  active: 'text-green-400 border-green-800',
  injured: 'text-yellow-400 border-yellow-800',
  dead: 'text-red-400 border-red-800',
}

const STATUS_LABELS = { active: 'Vivo', injured: 'Ferido', dead: 'Morto' }

const PROFESSION_LABELS: Record<string, string> = {
  comerciante: 'Comerciante', militar: 'Militar', clerigo: 'Clérigo',
  explorador: 'Explorador', artesao: 'Artesão', erudito: 'Erudito',
  nobre: 'Nobre', mercenario: 'Mercenário',
}

export default function GMCharacterList({ characters }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {characters.length === 0 && (
        <p className="text-neutral-600 text-sm">Nenhum personagem criado ainda.</p>
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
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
      {/* Row header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-neutral-800 transition-colors"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-amber-400">
            {character.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{character.name}</p>
            <p className="text-xs text-neutral-500">
              Nv {character.level} • {PROFESSION_LABELS[character.profession] ?? character.profession}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[character.status]}`}>
            {STATUS_LABELS[character.status]}
          </span>
          <span className="text-neutral-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="border-t border-neutral-800 px-5 py-4 space-y-5">
          {message && (
            <p className={`text-sm ${message.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>
              {message}
            </p>
          )}

          {/* Atributos atuais */}
          {attrs && (
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Atributos atuais</p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  ['ATQ', attrs.ataque], ['MAG', attrs.magia], ['ETR', attrs.eter_max],
                  ['DEF', attrs.defesa], ['VIT', attrs.vitalidade], ['VEL', attrs.velocidade],
                  ['PRE', attrs.precisao], ['TEN', attrs.tenacidade], ['CAP', attrs.capitania],
                  ['HP', `${attrs.hp_atual}/${attrs.hp_max}`], ['Moral', attrs.moral], ['Pts', attrs.attribute_points],
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-neutral-800 rounded p-2">
                    <p className="text-neutral-500">{label}</p>
                    <p className="font-mono font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carteira */}
          {wallet && (
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Carteira</p>
              <div className="flex gap-4 text-sm">
                <span>Libras: <strong className="text-yellow-400">{wallet.libras}</strong></span>
                <span>Essência: <strong className="text-purple-400">{wallet.essencia}</strong></span>
                <span>Premium: <strong className="text-emerald-400">{wallet.premium_currency}</strong></span>
              </div>
            </div>
          )}

          {/* Editar atributo */}
          <form onSubmit={handleEditAttr} className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Atributo</label>
              <select
                name="attr"
                className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded px-2 py-1.5"
              >
                {['ataque','magia','eter_max','eter_atual','defesa','vitalidade','hp_max','hp_atual',
                  'velocidade','precisao','tenacidade','capitania','moral','attribute_points'].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Valor</label>
              <input
                name="value"
                type="number"
                placeholder="0"
                className="w-24 bg-neutral-800 border border-neutral-700 text-white text-sm rounded px-2 py-1.5"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded"
            >
              Definir
            </button>
          </form>

          {/* Conceder moeda */}
          <form onSubmit={handleGrantCurrency} className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Moeda</label>
              <select
                name="currency"
                className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded px-2 py-1.5"
              >
                <option value="libras">Libras</option>
                <option value="essencia">Essência</option>
                <option value="premium_currency">Premium</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Quantidade</label>
              <input
                name="amount"
                type="number"
                min="1"
                placeholder="100"
                className="w-24 bg-neutral-800 border border-neutral-700 text-white text-sm rounded px-2 py-1.5"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black font-semibold text-sm rounded"
            >
              Conceder
            </button>
          </form>

          {/* Alterar status */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Alterar status</p>
            <div className="flex gap-2">
              {(['active', 'injured', 'dead'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={pending || character.status === s}
                  className={`px-3 py-1 rounded text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                    s === 'active' ? 'bg-green-800 hover:bg-green-700 text-green-200' :
                    s === 'injured' ? 'bg-yellow-800 hover:bg-yellow-700 text-yellow-200' :
                    'bg-red-800 hover:bg-red-700 text-red-200'
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
