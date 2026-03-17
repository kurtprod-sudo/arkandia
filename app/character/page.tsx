import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PROGRESSION_MILESTONES } from '@/lib/game/xp'
import CharacterSheet from '@/components/character/CharacterSheet'
import CopyProfileLink from '@/components/character/CopyProfileLink'
import DistributePointsPanel from '@/components/character/DistributePointsPanel'
import ResonanceEventModal from '@/components/character/ResonanceEventModal'
import ResonancePanel from '@/components/character/ResonancePanel'

export default async function CharacterSheetPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: charCheck } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!charCheck) redirect('/character/create')

  const characterId = charCheck.id

  const [
    { data: characterRaw, error: charError },
    { data: attrs, error: attrsError },
    { data: wallet, error: walletError },
    { data: buildingRaw },
    { data: reputationsRaw },
    { data: characterTitlesRaw },
    { data: profileData },
    { data: characterSkillsRaw },
  ] = await Promise.all([
    supabase
      .from('characters')
      .select('*, races (name), classes (name)')
      .eq('id', characterId)
      .maybeSingle(),
    supabase
      .from('character_attributes')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle(),
    supabase
      .from('character_wallet')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle(),
    supabase
      .from('character_building')
      .select('slot, skill_id, skills (id, name, skill_type, eter_cost, range_state)')
      .eq('character_id', characterId)
      .order('slot'),
    supabase
      .from('character_reputation')
      .select('*, factions(id, name, slug, type, is_hidden)')
      .eq('character_id', characterId),
    supabase
      .from('character_titles')
      .select('*, title_definitions(name, description, category)')
      .eq('character_id', characterId)
      .order('granted_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single(),
    supabase
      .from('character_skills')
      .select('skill_id, skills(id, name, skill_type, description, eter_cost, range_state, tree_position)')
      .eq('character_id', characterId),
  ])

  // Extract joined names before casting to Character type
  const raceName = (characterRaw as Record<string, unknown>)?.races
    ? ((characterRaw as Record<string, unknown>).races as { name: string }).name
    : null
  const className = (characterRaw as Record<string, unknown>)?.classes
    ? ((characterRaw as Record<string, unknown>).classes as { name: string }).name
    : null
  const character = characterRaw

  // Transform building slots
  const building = (buildingRaw ?? []).map((b) => ({
    slot: b.slot as number,
    skill: b.skills
      ? {
          id: (b.skills as Record<string, unknown>).id as string,
          name: (b.skills as Record<string, unknown>).name as string,
          skill_type: (b.skills as Record<string, unknown>).skill_type as string,
          eter_cost: (b.skills as Record<string, unknown>).eter_cost as number,
          range_state: (b.skills as Record<string, unknown>).range_state as string,
        }
      : null,
  }))

  // Filter out hidden factions from reputations
  const reputations = (reputationsRaw ?? []).filter((r) => {
    const f = r.factions as Record<string, unknown> | null
    return f ? !f.is_hidden : true
  })

  // Map titles
  const characterTitles = (characterTitlesRaw ?? []).map((ct) => {
    const td = ct.title_definitions as Record<string, unknown> | null
    return {
      id: ct.id,
      titleName: (td?.name as string) ?? '',
      titleDescription: (td?.description as string) ?? '',
      titleCategory: (td?.category as string) ?? '',
      grantedAt: ct.granted_at ?? '',
    }
  })

  if (process.env.NODE_ENV === 'development') {
    if (charError) console.error('[/character] characters error:', charError)
    if (attrsError) console.error('[/character] character_attributes error:', attrsError)
    if (walletError) console.error('[/character] character_wallet error:', walletError)
    console.log('[/character] character:', character?.name, '| attrs:', !!attrs, '| wallet:', !!wallet)
  }

  if (!character) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-3 font-body">Erro ao carregar personagem.</p>
          <a href="/character" className="text-[#d3a539] hover:text-[#f0c84a] underline text-sm font-body">
            Tentar novamente
          </a>
        </div>
      </main>
    )
  }

  if (!attrs || !wallet) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-3 font-body">Inicializando personagem...</p>
          <a href="/character" className="text-[#d3a539] hover:text-[#f0c84a] underline text-sm font-body">
            Clique para continuar
          </a>
        </div>
      </main>
    )
  }

  let societyName: string | null = null
  if (character.society_id) {
    const { data: society } = await supabase
      .from('societies')
      .select('name')
      .eq('id', character.society_id)
      .maybeSingle()
    societyName = society?.name ?? null
  }

  return (
    <main className="min-h-screen px-4 py-8 relative bg-[var(--ark-void)]">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/8 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[var(--ark-gold)]/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        {/* Copy profile link */}
        {profileData?.username && (
          <div className="max-w-5xl mx-auto mb-2 flex justify-end">
            <CopyProfileLink username={profileData.username} />
          </div>
        )}

        <CharacterSheet
          character={character as unknown as import('@/types').Character}
          attrs={attrs}
          wallet={wallet}
          societyName={societyName}
          raceName={raceName}
          className={className}
          building={building}
          reputations={reputations as unknown as import('@/types').CharacterReputation[]}
          physicalTraits={character.physical_traits ?? null}
          gemasBalance={wallet.premium_currency}
          titles={characterTitles}
        />

        {/* Skills Adquiridas */}
        {characterSkillsRaw && characterSkillsRaw.length > 0 && (
          <div className="max-w-5xl mx-auto mt-6">
            <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider">
                  Skills Adquiridas
                </h2>
                <span className="text-[10px] font-data text-[var(--text-ghost)]">
                  {characterSkillsRaw.length}/8
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {characterSkillsRaw.map((cs) => {
                  const skill = cs.skills as Record<string, unknown> | null
                  if (!skill) return null
                  const skillType = skill.skill_type as string
                  const typeColor = skillType === 'ativa' ? 'text-[var(--ark-red-glow)]'
                    : skillType === 'reativa' ? 'text-[var(--ark-gold)]'
                    : 'text-[var(--text-label)]'
                  return (
                    <div key={cs.skill_id as string} className="p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-data font-semibold text-[var(--text-primary)] truncate">
                          {skill.name as string}
                        </span>
                        <span className={`text-[8px] font-data ${typeColor}`}>{skillType}</span>
                      </div>
                      <p className="text-[9px] font-body text-[var(--text-label)] line-clamp-2">
                        {skill.description as string}
                      </p>
                      {(skill.eter_cost as number) > 0 && (
                        <p className="text-[9px] font-data text-attr-eter mt-0.5">
                          {skill.eter_cost as number} Éter · {skill.range_state as string}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              {characterSkillsRaw.length < 8 && (
                <p className="text-[10px] font-data text-[var(--text-ghost)] text-center mt-3">
                  <a href="/building" className="hover:text-[var(--text-secondary)] transition-colors">
                    Adquirir mais skills na Building →
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Distribute attribute points */}
        {attrs.attribute_points > 0 && (
          <div className="max-w-5xl mx-auto mt-6">
            <DistributePointsPanel
              availablePoints={attrs.attribute_points}
              currentAttrs={{
                ataque: attrs.ataque,
                magia: attrs.magia,
                defesa: attrs.defesa,
                vitalidade: attrs.vitalidade,
                velocidade: attrs.velocidade,
                precisao: attrs.precisao,
                tenacidade: attrs.tenacidade,
                capitania: attrs.capitania,
              }}
            />
          </div>
        )}

        {/* Resonance Panel */}
        {character.is_resonance_unlocked && character.resonance_archetype && !character.resonance_event_pending && (
          <div className="max-w-5xl mx-auto mt-6">
            <ResonancePanel
              archetype={character.resonance_archetype as string}
              resonanceLevel={character.resonance_level ?? 1}
              essenciaBalance={wallet.essencia}
            />
          </div>
        )}

        {/* Milestone alerts */}
        {character.level >= PROGRESSION_MILESTONES.RESONANCE && !character.is_resonance_unlocked && !character.resonance_event_pending && (
          <div className="max-w-5xl mx-auto mt-6 p-4 bg-attr-capitania/10 border border-attr-capitania/30 rounded-lg">
            <p className="text-attr-capitania text-sm font-body font-semibold">
              Nível 5 atingido — sua Ressonância está prestes a despertar.
            </p>
          </div>
        )}
        {character.level >= PROGRESSION_MILESTONES.FULL_UNLOCK && (
          <div className="max-w-5xl mx-auto mt-2 p-4 bg-attr-eter/10 border border-attr-eter/30 rounded-lg">
            <p className="text-attr-eter text-sm font-body font-semibold">
              Nível 10 atingido — o mundo de Arkandia se abre. Sociedades, territórios e combate agora estão disponíveis.
            </p>
          </div>
        )}

        {/* Resonance event modal */}
        {character.resonance_event_pending && (
          <ResonanceEventModal />
        )}
      </div>
    </main>
  )
}
