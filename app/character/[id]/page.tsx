import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkBadge from '@/components/ui/ArkBadge'

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_LABELS = {
  active: 'Vivo',
  injured: 'Ferido',
  dead: 'Morto',
}

export default async function PublicCharacterPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select(`
      id,
      name,
      level,
      status,
      title,
      archetype,
      resonance_archetype,
      is_resonance_unlocked,
      races (name),
      classes (name),
      societies (name)
    `)
    .eq('id', id)
    .single()

  if (!character) notFound()

  const society = character.societies as { name: string } | null
  const race = character.races as { name: string } | null
  const gameClass = character.classes as { name: string } | null

  return (
    <main className="min-h-screen bg-[var(--ark-void)] text-[var(--text-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-8 border border-[var(--ark-border)]">
          {/* Nome e título */}
          <div className="text-center mb-6">
            <h1 className="font-display text-3xl font-bold text-[var(--ark-gold-bright)]">{character.name}</h1>
            {character.title && (
              <p className="font-body text-[var(--text-secondary)] italic mt-1">&quot;{character.title}&quot;</p>
            )}
          </div>

          {/* Status vital */}
          <div className="flex justify-center mb-6">
            <ArkBadge color={character.status === 'active' ? 'alive' : character.status === 'injured' ? 'injured' : 'dead'}>
              {STATUS_LABELS[character.status]}
            </ArkBadge>
          </div>

          {/* Informações públicas */}
          <div className="space-y-3">
            <InfoRow label="Nível" value={String(character.level)} />
            <InfoRow label="Raça" value={race?.name ?? '—'} />
            <InfoRow label="Classe" value={gameClass?.name ?? '—'} />
            {character.is_resonance_unlocked && character.resonance_archetype && (
              <InfoRow
                label="Ressonância"
                value={
                  (character.resonance_archetype as string).charAt(0).toUpperCase() +
                  (character.resonance_archetype as string).slice(1)
                }
                valueClass="text-[var(--ark-gold-bright)]"
              />
            )}
            {character.archetype && (
              <InfoRow
                label="Arquétipo"
                value={character.archetype.charAt(0).toUpperCase() + character.archetype.slice(1)}
                valueClass="text-attr-capitania"
              />
            )}
            <InfoRow
              label="Sociedade"
              value={society?.name ?? '—'}
              valueClass={society ? 'text-[var(--text-primary)]' : 'text-[var(--text-label)]'}
            />
          </div>

          {/* Nota de privacidade */}
          <p className="text-xs text-[var(--text-label)] text-center mt-6 font-data">
            Atributos, HP, Éter e Habilidades são informação privada.
          </p>
        </div>
      </div>
    </main>
  )
}

function InfoRow({
  label,
  value,
  valueClass = 'text-[var(--text-primary)]',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between border-b border-[var(--ark-border)] pb-2">
      <span className="text-[var(--text-secondary)] text-sm font-data">{label}</span>
      <span className={`font-data font-semibold text-sm ${valueClass}`}>{value}</span>
    </div>
  )
}
