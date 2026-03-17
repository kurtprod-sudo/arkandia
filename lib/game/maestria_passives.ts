// ---------------------------------------------------------------------------
// Passivas de Maestria — aplicadas no início de cada turno de combate
// ---------------------------------------------------------------------------

import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database.types'

export interface MaestriaPassiveModifiers {
  reducaoDanoPercent: number
  reflexoDanoPercent: number
  danoBonus: number
  chancEsquivaBonus: number
  regenHpPorTurno: number
  cooldownReducao: number
  danoBonusAlvoEnvenenado: number
  danoBonusRangeCurto: number
  reducaoDefAlvoPorGolpe: number
}

const EMPTY: MaestriaPassiveModifiers = {
  reducaoDanoPercent: 0,
  reflexoDanoPercent: 0,
  danoBonus: 0,
  chancEsquivaBonus: 0,
  regenHpPorTurno: 0,
  cooldownReducao: 0,
  danoBonusAlvoEnvenenado: 0,
  danoBonusRangeCurto: 0,
  reducaoDefAlvoPorGolpe: 0,
}

/**
 * Lê as Maestrias passivas adquiridas pelo personagem e agrega os modificadores.
 */
export async function getMaestriaPassives(
  characterId: string,
  supabase: SupabaseClient<Database>
): Promise<MaestriaPassiveModifiers> {
  try {
    const { data: acquired } = await supabase
      .from('character_maestrias')
      .select('maestria_id, maestrias(skill_ids)')
      .eq('character_id', characterId)

    if (!acquired || acquired.length === 0) return EMPTY

    const allSkillIds: string[] = []
    for (const entry of acquired) {
      const maestria = entry.maestrias as Record<string, unknown> | null
      const skillIds = (maestria?.skill_ids as string[]) ?? []
      allSkillIds.push(...skillIds)
    }

    if (allSkillIds.length === 0) return EMPTY

    const { data: passiveSkills } = await supabase
      .from('skills')
      .select('formula')
      .in('id', allSkillIds)
      .eq('skill_type', 'passiva')

    if (!passiveSkills || passiveSkills.length === 0) return EMPTY

    const mods = { ...EMPTY }

    for (const skill of passiveSkills) {
      const formula = (skill.formula ?? {}) as Record<string, unknown>
      const buffType = formula.buff_type as string | undefined
      const buffValue = (formula.buff_value as number) ?? 0

      switch (buffType) {
        case 'reducao_dano_percent':
          mods.reducaoDanoPercent += buffValue
          break
        case 'reflexo_dano_percent':
        case 'reflexo_dano_ao_alvo':
          mods.reflexoDanoPercent += buffValue
          break
        case 'ataque_bonus_aura':
        case 'ataque_bonus_temp':
          mods.danoBonus += buffValue
          break
        case 'chance_esquiva_bonus':
          mods.chancEsquivaBonus += buffValue
          break
        case 'regen_hp_turno':
          mods.regenHpPorTurno += buffValue
          break
        case 'cooldown_reducao_global':
          mods.cooldownReducao += buffValue
          break
        case 'dano_bonus_alvo_envenenado':
          mods.danoBonusAlvoEnvenenado += buffValue
          break
        case 'dano_bonus_range_curto':
          mods.danoBonusRangeCurto += buffValue
          break
        case 'reducao_def_alvo_por_golpe':
          mods.reducaoDefAlvoPorGolpe += buffValue
          break
      }
    }

    return mods
  } catch {
    return EMPTY
  }
}
