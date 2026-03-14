'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { createCharacter } from '@/app/character/actions'
import { type Race, type GameClass } from '@/types'
import ArkInput from '@/components/ui/ArkInput'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import ArkDivider from '@/components/ui/ArkDivider'
import { ATTR_ICONS } from '@/components/ui/ArkIcons'

interface Props {
  races: Race[]
  classes: GameClass[]
}

interface FormState {
  error?: string
}

const ATTR_ABBR: Record<string, string> = {
  ataque: 'ATQ',
  magia: 'MAG',
  eter_max: 'ÉTR',
  defesa: 'DEF',
  vitalidade: 'VIT',
  velocidade: 'VEL',
  precisao: 'PRE',
  tenacidade: 'TEN',
  capitania: 'CAP',
}

const ATTR_COLOR: Record<string, string> = {
  ataque: 'text-attr-ataque',
  magia: 'text-attr-magia',
  eter_max: 'text-attr-eter',
  defesa: 'text-attr-defesa',
  vitalidade: 'text-attr-vitalidade',
  velocidade: 'text-attr-velocidade',
  precisao: 'text-attr-precisao',
  tenacidade: 'text-attr-tenacidade',
  capitania: 'text-attr-capitania',
}

const ATTR_ICON_KEY: Record<string, string> = {
  ataque: 'ataque',
  magia: 'magia',
  eter_max: 'eter',
  defesa: 'defesa',
  vitalidade: 'vitalidade',
  velocidade: 'velocidade',
  precisao: 'precisao',
  tenacidade: 'tenacidade',
  capitania: 'capitania',
}

export default function CreateCharacterForm({ races, classes }: Props) {
  const [step, setStep] = useState(1)
  const [selectedRace, setSelectedRace] = useState<Race | null>(null)
  const [selectedClass, setSelectedClass] = useState<GameClass | null>(null)
  const [charName, setCharName] = useState('')
  const [physicalTraits, setPhysicalTraits] = useState('')

  const [state, formAction] = useFormState<FormState, FormData>(
    async (_prev: FormState, formData: FormData) => {
      const result = await createCharacter(formData)
      return result ?? {}
    },
    {}
  )

  const canAdvance = () => {
    if (step === 1) return selectedRace !== null
    if (step === 2) return selectedClass !== null
    if (step === 3) return charName.trim().length >= 2 && charName.trim().length <= 32
    return false
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">
          {step === 1 && 'Escolha sua Raça'}
          {step === 2 && 'Escolha sua Classe'}
          {step === 3 && 'Nomeie seu personagem'}
          {step === 4 && 'Confirme seu destino'}
        </p>
        <p className="text-xs font-data text-[var(--text-ghost)]">
          {step} / 4
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-0.5 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-[var(--ark-red-glow)]' : 'bg-[var(--ark-border)]'
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Raça */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          {races.map((race) => (
            <button
              key={race.id}
              type="button"
              onClick={() => setSelectedRace(race)}
              className={`relative p-4 rounded-sm border text-left transition-all duration-200 ${
                selectedRace?.id === race.id
                  ? 'border-[var(--ark-border-bright)] bg-[#6e160f]/20'
                  : 'border-[var(--ark-border)] bg-[var(--ark-bg)] hover:border-[var(--ark-border-bright)] hover:bg-[var(--ark-surface)]'
              }`}
            >
              <p className="font-display text-sm font-bold text-[var(--ark-gold-bright)] mb-1">
                {race.name}
              </p>
              <p className="text-[10px] font-data text-[var(--text-label)] mb-2">
                {race.geo_affinity}
              </p>
              <p className="text-xs text-[var(--text-secondary)] font-body line-clamp-3 mb-3">
                {race.lore_text.slice(0, 120)}
                {race.lore_text.length > 120 ? '…' : ''}
              </p>
              <div className="flex flex-wrap gap-1">
                {race.archetype_origin.map((arch) => (
                  <ArkBadge key={arch} color="archetype" className="text-[9px] px-1.5 py-0">
                    {arch}
                  </ArkBadge>
                ))}
              </div>
              {selectedRace?.id === race.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--ark-red-glow)] animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Classe */}
      {step === 2 && (
        <div className="grid grid-cols-2 gap-3">
          {classes.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`relative p-4 rounded-sm border text-left transition-all duration-200 ${
                selectedClass?.id === cls.id
                  ? 'border-[var(--ark-border-bright)] bg-[#6e160f]/20'
                  : 'border-[var(--ark-border)] bg-[var(--ark-bg)] hover:border-[var(--ark-border-bright)] hover:bg-[var(--ark-surface)]'
              }`}
            >
              <p className="font-display text-sm font-bold text-[var(--ark-gold-bright)] mb-1">
                {cls.name}
              </p>
              <p className="text-[10px] font-data text-[var(--text-label)] mb-2 flex items-center gap-1">
                <span>&#x2694;</span> {cls.weapon_type ?? '—'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] font-body line-clamp-3 mb-3">
                {cls.description.slice(0, 120)}
                {cls.description.length > 120 ? '…' : ''}
              </p>
              <div className="flex flex-wrap gap-1">
                {(cls.primary_attributes ?? []).map((attr) => (
                  <ArkBadge key={attr} color={attr as 'ataque'} className="text-[9px] px-1.5 py-0">
                    {ATTR_ABBR[attr] ?? attr.toUpperCase()}
                  </ArkBadge>
                ))}
                {cls.secondary_attribute && (
                  <ArkBadge color={cls.secondary_attribute as 'ataque'} className="text-[9px] px-1.5 py-0 opacity-60">
                    {ATTR_ABBR[cls.secondary_attribute] ?? cls.secondary_attribute.toUpperCase()}
                  </ArkBadge>
                )}
              </div>
              {selectedClass?.id === cls.id && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--ark-red-glow)] animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Step 3 — Nome + Preview */}
      {step === 3 && (
        <div className="space-y-4">
          <ArkInput
            id="charNamePreview"
            name="charNamePreview"
            type="text"
            label="Nome do personagem"
            required
            minLength={2}
            maxLength={32}
            placeholder="Ex: Kael Dawnbringer"
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
          />

          <div className="space-y-2">
            <label
              className="block text-[11px] font-semibold tracking-[0.15em] uppercase mb-1.5 text-[var(--text-label)]"
              style={{ fontFamily: 'var(--font-intelo)' }}
            >
              Caracter&iacute;sticas F&iacute;sicas <span className="text-[var(--text-ghost)] normal-case">(opcional)</span>
            </label>
            <textarea
              name="charPhysicalTraitsPreview"
              value={physicalTraits}
              onChange={(e) => setPhysicalTraits(e.target.value)}
              placeholder="Ex: cabelo branco longo, olhos vermelhos, cicatriz no rosto, compleição atlética..."
              maxLength={300}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-sm bg-[rgba(7,5,15,0.6)] border border-[var(--ark-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--ark-border-bright)] transition-all duration-200 resize-none"
              style={{ fontFamily: 'var(--font-intelo)' }}
            />
            <p className="text-xs text-[var(--text-ghost)] font-body">
              Essas caracter&iacute;sticas ser&atilde;o usadas para gerar seu avatar.
              Voc&ecirc; pode alterar depois na ficha por 50 Gemas.
            </p>
          </div>

          {selectedClass && (
            <ClassAttributePreview classData={selectedClass} />
          )}
        </div>
      )}

      {/* Step 4 — Confirmação */}
      {step === 4 && (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="race_id" value={selectedRace?.id ?? ''} />
          <input type="hidden" name="class_id" value={selectedClass?.id ?? ''} />
          <input type="hidden" name="name" value={charName.trim()} />
          <input type="hidden" name="physical_traits" value={physicalTraits} />

          {/* Resumo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)]">
              <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Raça</span>
              <span className="font-display text-sm font-bold text-[var(--ark-gold-bright)]">
                {selectedRace?.name}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)]">
              <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Classe</span>
              <span className="font-display text-sm font-bold text-[var(--ark-gold-bright)]">
                {selectedClass?.name}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)]">
              <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Nome</span>
              <span className="font-display text-sm font-bold text-white">
                {charName}
              </span>
            </div>

            {selectedClass?.weapon_type && (
              <div className="flex items-center justify-between p-3 rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)]">
                <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider">Arma</span>
                <span className="text-sm font-data text-[var(--text-secondary)]">
                  {selectedClass.weapon_type}
                </span>
              </div>
            )}

            {physicalTraits && (
              <div className="flex items-start justify-between p-3 rounded-sm bg-[var(--ark-surface)] border border-[var(--ark-border)]">
                <span className="text-xs font-data text-[var(--text-label)] uppercase tracking-wider flex-shrink-0">Apar&ecirc;ncia</span>
                <span className="text-sm font-body text-[var(--text-secondary)] text-right max-w-[60%]">
                  {physicalTraits}
                </span>
              </div>
            )}
          </div>

          {selectedClass && (
            <ClassAttributePreview classData={selectedClass} />
          )}

          {state?.error && (
            <div className="flex items-center gap-2 text-sm bg-red-950/40 border border-red-800/50 rounded-sm px-4 py-3">
              <span className="text-red-400">&#x26A0;</span>
              <p className="text-red-300">{state.error}</p>
            </div>
          )}

          <SubmitButton />
        </form>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div className="flex gap-3">
          {step > 1 && (
            <ArkButton
              type="button"
              variant="secondary"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Voltar
            </ArkButton>
          )}
          <ArkButton
            type="button"
            disabled={!canAdvance()}
            onClick={() => setStep(step + 1)}
            className="flex-1"
          >
            Continuar
          </ArkButton>
        </div>
      )}

      {step === 4 && (
        <ArkButton
          type="button"
          variant="secondary"
          onClick={() => setStep(3)}
          className="w-full"
        >
          Voltar
        </ArkButton>
      )}
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <ArkButton
      type="submit"
      disabled={pending}
      className="w-full py-3"
      size="lg"
    >
      {pending ? 'Forjando destino…' : 'Despertar em Arkandia'}
    </ArkButton>
  )
}

function ClassAttributePreview({ classData }: { classData: GameClass }) {
  const primaryAttrs = classData.primary_attributes ?? []
  const secondaryAttr = classData.secondary_attribute

  const allAttrs = [
    'ataque', 'magia', 'eter_max', 'defesa', 'vitalidade',
    'velocidade', 'precisao', 'tenacidade', 'capitania',
  ]

  return (
    <div className="p-4 bg-[var(--ark-surface)] rounded-sm border border-[var(--ark-border)]">
      <ArkDivider variant="dark" className="mt-0 mb-3" />
      <p className="text-xs text-[var(--text-label)] uppercase tracking-wider mb-3 font-body">
        Escalonamento de atributos
      </p>
      <div className="grid grid-cols-3 gap-2">
        {allAttrs.map((attr) => {
          const abbr = ATTR_ABBR[attr] ?? attr.toUpperCase()
          const color = ATTR_COLOR[attr] ?? 'text-[var(--text-secondary)]'
          const iconKey = ATTR_ICON_KEY[attr] ?? attr
          const Icon = ATTR_ICONS[iconKey as keyof typeof ATTR_ICONS]
          const isPrimary = primaryAttrs.includes(attr)
          const isSecondary = secondaryAttr === attr

          let label = '—'
          if (isPrimary) label = 'Primário'
          else if (isSecondary) label = 'Secundário'

          return (
            <div
              key={attr}
              className={`flex items-center justify-between text-sm px-2 py-1.5 rounded bg-[var(--ark-surface)] ${
                isPrimary ? 'ring-1 ring-[var(--ark-border-bright)]' : ''
              }`}
            >
              <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                {Icon && <Icon className={color} size={14} />}
                <span className="font-data text-xs">{abbr}</span>
              </span>
              <span className={`font-data text-[10px] ${isPrimary ? 'text-[var(--ark-red-glow)]' : isSecondary ? 'text-[var(--text-secondary)]' : 'text-[var(--text-ghost)]'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
