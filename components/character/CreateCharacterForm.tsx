'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { createCharacter } from '@/app/character/actions'
import { type Profession, type ProfessionBaseAttributes } from '@/types'

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
      <div>
        <label className="block text-sm text-neutral-300 mb-1" htmlFor="charName">
          Nome do personagem
        </label>
        <input
          id="charName"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={32}
          placeholder="Ex: Kael Dawnbringer"
          className="w-full px-4 py-2 rounded bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Escolha de profissão */}
      <div>
        <p className="text-sm text-neutral-300 mb-3">Escolha sua profissão</p>
        <div className="grid grid-cols-2 gap-3">
          {professions.map((prof) => (
            <button
              key={prof.id}
              type="button"
              onClick={() => setSelected(prof)}
              className={`p-4 rounded border text-left transition-colors ${
                selected?.id === prof.id
                  ? 'border-amber-500 bg-amber-950/30'
                  : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500'
              }`}
            >
              <p className="font-semibold text-white">
                {PROFESSION_LABELS[prof.name] ?? prof.name}
              </p>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                {prof.description}
              </p>
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
        <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded px-3 py-2">
          {state.error}
        </p>
      )}

      <CreateSubmitButton disabled={!selected} />
    </form>
  )
}

function CreateSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black font-bold rounded transition-colors"
    >
      {pending ? 'Criando personagem...' : 'Despertar em Arkandia'}
    </button>
  )
}

function AttributePreview({ attrs }: { attrs: ProfessionBaseAttributes }) {
  const ATTR_LABELS: Record<string, string> = {
    ataque: 'ATQ', magia: 'MAG', eter_max: 'ÉTR',
    defesa: 'DEF', vitalidade: 'VIT', velocidade: 'VEL',
    precisao: 'PRE', tenacidade: 'TEN', capitania: 'CAP',
  }

  return (
    <div className="mt-4 p-4 bg-neutral-900 rounded border border-neutral-700">
      <p className="text-xs text-neutral-400 mb-3 uppercase tracking-wide">Atributos iniciais</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(ATTR_LABELS).map(([key, label]) => {
          const val = attrs[key as keyof ProfessionBaseAttributes]
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-neutral-400">{label}</span>
              <span className="text-amber-400 font-mono font-semibold">{val ?? '-'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
