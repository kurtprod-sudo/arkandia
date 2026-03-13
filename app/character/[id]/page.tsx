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

const PROFESSION_LABELS: Record<string, string> = {
  comerciante: 'Comerciante', militar: 'Militar', clerigo: 'Clérigo',
  explorador: 'Explorador', artesao: 'Artesão', erudito: 'Erudito',
  nobre: 'Nobre', mercenario: 'Mercenário',
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
      profession,
      archetype,
      societies (name)
    `)
    .eq('id', id)
    .single()

  if (!character) notFound()

  const society = character.societies as { name: string } | null

  return (
    <main className="min-h-screen bg-[var(--ark-void)] text-[var(--text-primary)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--ark-bg-raised)] rounded-xl p-8 border border-[var(--ark-gold-dim)]">
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
            <InfoRow label="Profissão" value={PROFESSION_LABELS[character.profession] ?? character.profession} />
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
    <div className="flex justify-between border-b border-[#7a5a18]/40 pb-2">
      <span className="text-[var(--text-secondary)] text-sm font-data">{label}</span>
      <span className={`font-data font-semibold text-sm ${valueClass}`}>{value}</span>
    </div>
  )
}
