import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArkDivider from '@/components/ui/ArkDivider'
import ArkBadge from '@/components/ui/ArkBadge'
import EquipmentSilhouette from '@/components/character/EquipmentSilhouette'
import SkillTreeSection from '@/components/character/SkillTreeSection'
import MaestriaShopSection from '@/components/character/MaestriaShopSection'

const SKILL_ESSENCIA_COST: Record<number, number> = {
  1: 0, 2: 0,
  3: 30, 4: 30,
  5: 50, 6: 50,
  7: 80,
  8: 120,
}

export default async function BuildingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: charCheck } = await supabase
    .from('characters').select('id, class_id, resonance_archetype, resonance_level, is_resonance_unlocked').eq('user_id', user.id).maybeSingle()
  if (!charCheck) redirect('/character/create')

  const characterId = charCheck.id

  const [
    { data: buildingRaw },
    { data: equippedItemsRaw },
    { data: slotDefinitionsRaw },
    { data: inventoryRaw },
    { data: characterSkillsRaw },
    { data: characterMaestriasRaw },
    { data: classSkillTreeRaw },
    { data: essenciaWallet },
    { data: prestigioMaestriasRaw },
    { data: ressonanciaMaestriasRaw },
    { data: acquiredMaestriasRaw },
  ] = await Promise.all([
    supabase
      .from('character_building')
      .select('slot, skill_id, skills(id, name, skill_type, eter_cost, range_state, description)')
      .eq('character_id', characterId)
      .order('slot'),
    supabase
      .from('character_equipment')
      .select('*, items(id, name, description, rarity, stats, slot_type, required_level)')
      .eq('character_id', characterId),
    supabase
      .from('equipment_slots_definition')
      .select('*')
      .order('slot_order'),
    supabase
      .from('inventory')
      .select('id, item_id, quantity, items!inner(id, name, rarity, stats, slot_type, required_level)')
      .eq('character_id', characterId)
      .filter('items.item_type', 'eq', 'equipamento'),
    supabase
      .from('character_skills')
      .select('skill_id, skills(id, name, skill_type, eter_cost, range_state, description)')
      .eq('character_id', characterId),
    supabase
      .from('character_maestrias')
      .select('maestria_id, maestrias(id, name, description, category)')
      .eq('character_id', characterId),
    // Árvore de skills da classe (todas as 8)
    charCheck.class_id
      ? supabase
          .from('skills')
          .select('id, name, description, skill_type, tree_position, eter_cost, range_state, is_starting_skill')
          .eq('class_id', charCheck.class_id)
          .order('tree_position')
      : Promise.resolve({ data: null }),
    // Essência disponível
    supabase
      .from('character_wallet')
      .select('essencia')
      .eq('character_id', characterId)
      .single(),
    // Maestrias de Prestígio (da classe)
    charCheck.class_id
      ? supabase
          .from('maestrias')
          .select('id, name, description, category, restrictions, cost')
          .eq('category', 'prestígio')
          .eq('is_active', true)
      : Promise.resolve({ data: null }),
    // Maestrias de Ressonância (do arquétipo)
    charCheck.resonance_archetype
      ? supabase
          .from('maestrias')
          .select('id, name, description, category, restrictions, cost')
          .eq('category', 'ressonância')
          .eq('is_active', true)
      : Promise.resolve({ data: null }),
    // Maestrias já adquiridas
    supabase
      .from('character_maestrias')
      .select('maestria_id')
      .eq('character_id', characterId),
  ])

  // Transform building slots
  const building = (buildingRaw ?? []).map((b) => ({
    slot: b.slot as number,
    skill: b.skills ? {
      id: (b.skills as Record<string, unknown>).id as string,
      name: (b.skills as Record<string, unknown>).name as string,
      skill_type: (b.skills as Record<string, unknown>).skill_type as string,
      eter_cost: (b.skills as Record<string, unknown>).eter_cost as number,
      range_state: (b.skills as Record<string, unknown>).range_state as string,
      description: (b.skills as Record<string, unknown>).description as string,
    } : null,
  }))

  // Equipped skill IDs for filtering unequipped
  const equippedSkillIds = new Set(building.filter((b) => b.skill).map((b) => b.skill!.id))

  // All owned skills not in building
  const unequippedSkills = (characterSkillsRaw ?? [])
    .filter((cs) => !equippedSkillIds.has(cs.skill_id))
    .map((cs) => {
      const s = cs.skills as Record<string, unknown> | null
      return s ? {
        id: s.id as string,
        name: s.name as string,
        skill_type: s.skill_type as string,
        eter_cost: s.eter_cost as number,
        range_state: s.range_state as string,
        description: s.description as string,
      } : null
    })
    .filter(Boolean)

  // Maestrias
  const maestrias = (characterMaestriasRaw ?? []).map((cm) => {
    const m = cm.maestrias as Record<string, unknown> | null
    return m ? {
      id: m.id as string,
      name: m.name as string,
      description: m.description as string,
      category: m.category as string,
    } : null
  }).filter(Boolean)

  // Equipment data
  const slotDefs = (slotDefinitionsRaw ?? []).map((s) => ({
    slot_key: s.slot_key as string,
    label: s.label as string,
    slot_order: s.slot_order as number,
    is_locked: s.is_locked as boolean,
  }))

  const equippedItems = (equippedItemsRaw ?? []).map((e) => ({
    slot_key: e.slot_key as string,
    enhancement: e.enhancement as number,
    items: e.items ? {
      id: (e.items as Record<string, unknown>).id as string,
      name: (e.items as Record<string, unknown>).name as string,
      description: (e.items as Record<string, unknown>).description as string,
      rarity: (e.items as Record<string, unknown>).rarity as string,
      stats: ((e.items as Record<string, unknown>).stats ?? {}) as Record<string, number>,
      slot_type: (e.items as Record<string, unknown>).slot_type as string,
    } : null,
  }))

  const inventoryItems = (inventoryRaw ?? []).map((inv) => ({
    id: inv.id as string,
    item_id: inv.item_id as string,
    quantity: inv.quantity as number,
    items: {
      id: (inv.items as Record<string, unknown>).id as string,
      name: (inv.items as Record<string, unknown>).name as string,
      rarity: (inv.items as Record<string, unknown>).rarity as string,
      stats: ((inv.items as Record<string, unknown>).stats ?? {}) as Record<string, number>,
      slot_type: (inv.items as Record<string, unknown>).slot_type as string,
      required_level: (inv.items as Record<string, unknown>).required_level as number,
    },
  }))

  // Skill tree data
  const classSkillTree = classSkillTreeRaw ?? []
  const acquiredSkillIds = new Set((characterSkillsRaw ?? []).map((cs) => cs.skill_id as string))
  const essencia = (essenciaWallet as Record<string, unknown> | null)?.essencia as number ?? 0

  // Maestria data
  const hasUnlockedMaestrias = acquiredSkillIds.size >= 8
  const acquiredMaestriaIds = new Set((acquiredMaestriasRaw ?? []).map((cm) => cm.maestria_id as string))

  const prestigioMaestrias = (prestigioMaestriasRaw ?? [])
    .filter((m) => {
      const r = m.restrictions as Record<string, unknown> | null
      if (!r) return true
      if (r.class_id && r.class_id !== charCheck.class_id) return false
      if (r.class_ids && !(r.class_ids as string[]).includes(charCheck.class_id as string)) return false
      return true
    })
    .map((m) => {
      const cost = (m.cost as Record<string, unknown>) ?? {}
      return {
        id: m.id as string,
        name: m.name as string,
        description: m.description as string,
        category: 'prestígio' as const,
        essenciaCost: (cost.essencia as number) ?? 0,
        requiresItem: (cost.requires_item as string) ?? null,
        minResonanceLevel: 0,
        locked: false,
      }
    })

  const ressonanciaMaestrias = (ressonanciaMaestriasRaw ?? [])
    .filter((m) => {
      const r = m.restrictions as Record<string, unknown> | null
      if (!r) return true
      if (r.resonance_type && r.resonance_type !== charCheck.resonance_archetype) return false
      return true
    })
    .map((m) => {
      const cost = (m.cost as Record<string, unknown>) ?? {}
      const restrictions = (m.restrictions as Record<string, unknown>) ?? {}
      const minResLevel = (restrictions.min_resonance_level as number) ?? 1
      const locked = (charCheck.resonance_level ?? 1) < minResLevel
      return {
        id: m.id as string,
        name: m.name as string,
        description: m.description as string,
        category: 'ressonância' as const,
        essenciaCost: (cost.essencia as number) ?? 0,
        requiresItem: null,
        minResonanceLevel: minResLevel,
        locked,
      }
    })

  const SKILL_TYPE_BADGE: Record<string, 'crimson' | 'gold' | 'bronze'> = {
    ativa: 'crimson', passiva: 'gold', reativa: 'bronze',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
        Building
      </h1>
      <ArkDivider variant="dark" />

      {/* SEÇÃO 1 — Skills Equipadas */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Skills Equipadas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => i + 1).map((slot) => {
            const b = building.find((s) => s.slot === slot)
            return (
              <div key={slot} className={`p-3 rounded-sm border text-center ${b?.skill ? 'border-[var(--ark-border-bright)] bg-[var(--ark-bg)]' : 'border-[var(--ark-border)] border-dashed'}`}>
                {b?.skill ? (
                  <>
                    <p className="text-xs font-data font-semibold text-[var(--text-primary)] truncate">{b.skill.name}</p>
                    <ArkBadge color={SKILL_TYPE_BADGE[b.skill.skill_type] ?? 'bronze'} className="text-[7px] mt-1">
                      {b.skill.skill_type}
                    </ArkBadge>
                    <p className="text-[9px] font-data text-[var(--text-label)] mt-1">
                      {b.skill.eter_cost > 0 ? `${b.skill.eter_cost} Éter` : 'Passiva'}
                      {b.skill.range_state !== 'qualquer' && ` · ${b.skill.range_state}`}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-data text-[var(--text-ghost)]">Slot {slot}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* SEÇÃO 2 — Equipamentos */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Equipamentos</h2>
        <EquipmentSilhouette
          characterId={characterId}
          slotDefinitions={slotDefs}
          equippedItems={equippedItems}
          inventoryItems={inventoryItems}
        />
      </div>

      {/* SEÇÃO 3 — Skills e Maestrias disponíveis */}
      <div className="bg-[var(--ark-surface)] backdrop-blur-xl rounded-sm p-5 border border-[var(--ark-border)]">
        <h2 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-3">Skills Disponíveis</h2>
        {unequippedSkills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {unequippedSkills.map((skill) => skill && (
              <div key={skill.id} className="p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-data font-semibold text-[var(--text-primary)]">{skill.name}</span>
                  <ArkBadge color={SKILL_TYPE_BADGE[skill.skill_type] ?? 'bronze'} className="text-[7px]">
                    {skill.skill_type}
                  </ArkBadge>
                </div>
                <p className="text-[10px] font-body text-[var(--text-label)] mt-0.5 line-clamp-1">{skill.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-body text-[var(--text-label)] italic mb-4">Todas as skills estão na Building.</p>
        )}

        {maestrias.length > 0 && (
          <>
            <h3 className="text-[10px] font-data text-[var(--text-label)] uppercase tracking-wider mb-2">Maestrias Adquiridas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {maestrias.map((m) => m && (
                <div key={m.id} className="p-3 bg-[var(--ark-bg)] border border-[var(--ark-border)] rounded-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-data font-semibold text-[var(--text-primary)]">{m.name}</span>
                    <ArkBadge color="gold" className="text-[7px]">{m.category}</ArkBadge>
                  </div>
                  <p className="text-[10px] font-body text-[var(--text-label)] mt-0.5 line-clamp-1">{m.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* SEÇÃO 4 — Árvore de Skills */}
      {classSkillTree.length > 0 && (
        <SkillTreeSection
          characterId={characterId}
          classSkillTree={classSkillTree.map((s) => ({
            id: s.id as string,
            name: s.name as string,
            description: s.description as string,
            skill_type: s.skill_type as string,
            tree_position: (s.tree_position as number) ?? 0,
            eter_cost: (s.eter_cost as number) ?? 0,
            range_state: s.range_state as string,
            is_starting_skill: s.is_starting_skill as boolean,
          }))}
          acquiredSkillIds={Array.from(acquiredSkillIds)}
          essencia={essencia}
          costMap={SKILL_ESSENCIA_COST}
        />
      )}

      {/* SEÇÃO 5 — Maestrias */}
      {hasUnlockedMaestrias && (
        <MaestriaShopSection
          characterId={characterId}
          essencia={essencia}
          prestigioMaestrias={prestigioMaestrias}
          ressonanciaMaestrias={ressonanciaMaestrias}
          acquiredIds={Array.from(acquiredMaestriaIds)}
          resonanceArchetype={charCheck.resonance_archetype as string | null}
        />
      )}
    </div>
  )
}
