import Link from 'next/link'
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

  // Fetch building and rare achievements in parallel
  const [
    { data: buildingRaw },
    { data: achievementsRaw },
  ] = await Promise.all([
    supabase
      .from('character_building')
      .select('slot, skills(id, name, skill_type, eter_cost, range_state)')
      .eq('character_id', character.id)
      .order('slot'),
    supabase
      .from('character_achievements')
      .select('achievement_id, unlocked_at, achievements(title, description, rarity, icon)')
      .eq('character_id', character.id)
      .not('unlocked_at', 'is', null)
      .order('unlocked_at', { ascending: false }),
  ])

  const building = (buildingRaw ?? []).map((b) => ({
    slot: b.slot as number,
    skill: b.skills ? {
      name: (b.skills as Record<string, unknown>).name as string,
      skill_type: (b.skills as Record<string, unknown>).skill_type as string,
      eter_cost: (b.skills as Record<string, unknown>).eter_cost as number,
    } : null,
  }))

  const rareAchievements = (achievementsRaw ?? [])
    .filter((a) => {
      const ach = a.achievements as Record<string, unknown> | null
      return ach && ['raro', 'epico', 'lendario'].includes(ach.rarity as string)
    })
    .slice(0, 6)

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

          {/* Building */}
          {building.some((b) => b.skill) && (
            <div className="mt-4 pt-4 border-t border-[var(--ark-border)]">
              <p className="text-[9px] font-data text-[var(--text-ghost)] uppercase tracking-wider mb-2">Building</p>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 6 }, (_, i) => {
                  const slot = building.find((b) => b.slot === i + 1)
                  const skill = slot?.skill ?? null
                  return (
                    <div
                      key={i}
                      className={`p-2 rounded-sm border text-center ${
                        skill ? 'border-[var(--ark-border-bright)] bg-[var(--ark-bg)]' : 'border-[var(--ark-border)] opacity-30'
                      }`}
                    >
                      {skill ? (
                        <>
                          <p className="text-[9px] font-data text-[var(--text-primary)] truncate">{skill.name}</p>
                          <p className="text-[8px] font-data text-[var(--text-ghost)] mt-0.5">{skill.skill_type}</p>
                        </>
                      ) : (
                        <p className="text-[9px] font-data text-[var(--text-ghost)]">—</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Conquistas raras */}
          {rareAchievements.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--ark-border)]">
              <p className="text-[9px] font-data text-[var(--text-ghost)] uppercase tracking-wider mb-2">Conquistas</p>
              <div className="flex flex-wrap gap-1.5">
                {rareAchievements.map((a) => {
                  const ach = a.achievements as Record<string, unknown>
                  const rarity = ach.rarity as string
                  const color = rarity === 'lendario' ? 'text-[var(--ark-gold-bright)] border-[var(--ark-gold)]/40'
                    : rarity === 'epico' ? 'text-attr-eter border-attr-eter/40'
                    : 'text-[var(--text-secondary)] border-[var(--ark-border)]'
                  return (
                    <span
                      key={a.achievement_id as string}
                      title={ach.description as string}
                      className={`text-[9px] font-data px-2 py-0.5 rounded-sm border ${color}`}
                    >
                      {ach.title as string}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Diário + Rankings */}
          <div className="flex justify-center gap-4 mt-6">
            <Link href={`/diary/${character.id}`} className="text-xs font-data text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors">
              Ver Diário
            </Link>
            <Link href="/rankings" className="text-xs font-data text-[var(--text-ghost)] hover:text-[var(--text-secondary)] transition-colors">
              Rankings →
            </Link>
          </div>

          {/* Nota de privacidade */}
          <p className="text-xs text-[var(--text-label)] text-center mt-4 font-data">
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
