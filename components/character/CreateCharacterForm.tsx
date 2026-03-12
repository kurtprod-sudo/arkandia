'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { createCharacter } from '@/app/character/actions'
import { type Profession, type ProfessionBaseAttributes } from '@/types'
import ArkInput from '@/components/ui/ArkInput'
import ArkButton from '@/components/ui/ArkButton'
import ArkDivider from '@/components/ui/ArkDivider'
import { ATTR_ICONS } from '@/components/ui/ArkIcons'

interface Props {
  professions: Profession[]
}

interface FormState {
  error?: string
}

const PROFESSION_LABELS: Record<string, string> = {
  comerciante: 'Comerciante',
  militar: 'Militar',
  clerigo: 'Clérigo',
  explorador: 'Explorador',
  artesao: 'Artesão',
  erudito: 'Erudito',
  nobre: 'Nobre',
  mercenario: 'Mercenário',
}

const PROFESSION_ICONS: Record<string, string> = {
  comerciante: '💰',
  militar: '⚔️',
  clerigo: '✝️',
  explorador: '🧭',
  artesao: '🔨',
  erudito: '📖',
  nobre: '👑',
  mercenario: '🗡️',
}

export default function CreateCharacterForm({ professions }: Props) {
  const [selected, setSelected] = useState<Profession | null>(null)

  const [state, formAction] = useFormState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => {
      const result = await createCharacter(formData)
      return result ?? {}
    },
    {}
  )

  return (
    <form action={formAction} className="space-y-6">
      {/* Nome do personagem */}
      <ArkInput
        id="charName"
        name="name"
        type="text"
        label="Nome do personagem"
        required
        minLength={2}
        maxLength={32}
        placeholder="Ex: Kael Dawnbringer"
      />

      {/* Escolha de profissão */}
      <div>
        <p className="text-xs font-body text-ark-text-secondary uppercase tracking-wider mb-3">
          Escolha sua profissão
        </p>
        <div className="grid grid-cols-2 gap-3">
          {professions.map((prof) => (
            <button
              key={prof.id}
              type="button"
              onClick={() => setSelected(prof)}
              className={`relative p-4 rounded-lg border text-left transition-all duration-200 ${
                selected?.id === prof.id
                  ? 'border-wine-glow/60 bg-wine-dark/20 glow-wine'
                  : 'border-bronze-dark/30 bg-ark-bg-primary hover:border-bronze-mid/40 hover:bg-ark-bg-tertiary'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{PROFESSION_ICONS[prof.name] ?? '⚡'}</span>
                <p className="font-display text-sm font-bold text-gold-pure">
                  {PROFESSION_LABELS[prof.name] ?? prof.name}
                </p>
              </div>
              <p className="text-xs text-ark-text-muted font-body mt-1 line-clamp-2">
                {prof.description}
              </p>
              {selected?.id === prof.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-wine-glow animate-pulse-glow" />
              )}
            </button>
          ))}
        </div>
        {selected && (
          <>
            <input type="hidden" name="profession" value={selected.name} />
            <AttributePreview attrs={selected.base_attributes} />
          </>
        )}
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 text-sm bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
          <span className="text-red-400">&#x26A0;</span>
          <p className="text-red-300">{state.error}</p>
        </div>
      )}

      <CreateSubmitButton disabled={!selected} />
    </form>
  )
}

function CreateSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <ArkButton
      type="submit"
      disabled={pending || disabled}
      className="w-full py-3"
      size="lg"
    >
      {pending ? 'Forjando destino...' : 'Despertar em Arkandia'}
    </ArkButton>
  )
}

function AttributePreview({ attrs }: { attrs: ProfessionBaseAttributes }) {
  const ATTR_CONFIG: { key: keyof ProfessionBaseAttributes; abbr: string; color: string; iconKey: string }[] = [
    { key: 'ataque', abbr: 'ATQ', color: 'text-attr-ataque', iconKey: 'ataque' },
    { key: 'magia', abbr: 'MAG', color: 'text-attr-magia', iconKey: 'magia' },
    { key: 'eter_max', abbr: 'ÉTR', color: 'text-attr-eter', iconKey: 'eter' },
    { key: 'defesa', abbr: 'DEF', color: 'text-attr-defesa', iconKey: 'defesa' },
    { key: 'vitalidade', abbr: 'VIT', color: 'text-attr-vitalidade', iconKey: 'vitalidade' },
    { key: 'velocidade', abbr: 'VEL', color: 'text-attr-velocidade', iconKey: 'velocidade' },
    { key: 'precisao', abbr: 'PRE', color: 'text-attr-precisao', iconKey: 'precisao' },
    { key: 'tenacidade', abbr: 'TEN', color: 'text-attr-tenacidade', iconKey: 'tenacidade' },
    { key: 'capitania', abbr: 'CAP', color: 'text-attr-capitania', iconKey: 'capitania' },
  ]

  return (
    <div className="mt-4 p-4 bg-ark-bg-primary rounded-lg border border-bronze-dark/25">
      <ArkDivider variant="dark" className="mt-0 mb-3" />
      <p className="text-xs text-ark-text-muted uppercase tracking-wider mb-3 font-body">
        Atributos iniciais
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ATTR_CONFIG.map(({ key, abbr, color, iconKey }) => {
          const val = attrs[key]
          const Icon = ATTR_ICONS[iconKey as keyof typeof ATTR_ICONS]
          return (
            <div key={key} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-ark-bg-secondary/50">
              <span className="flex items-center gap-1.5 text-ark-text-secondary">
                {Icon && <Icon className={color} size={14} />}
                <span className="font-data text-xs">{abbr}</span>
              </span>
              <span className={`font-data font-bold ${color}`}>{val ?? '-'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
