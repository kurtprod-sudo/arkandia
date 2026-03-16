// ---------------------------------------------------------------------------
// Sistema de Level Up — grantXp centralizado
// Referência: GDD_Balanceamento §6
// ---------------------------------------------------------------------------

import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { checkLevelUp, xpToNextLevel } from './xp'
import { createEvent } from './events'
import { createNotification } from './notifications'

export interface GrantXpResult {
  levelsGained: number
  newLevel: number
  newXp: number
  xpToNext: number
}

/**
 * Concede XP a um personagem e processa level ups.
 * - Calcula quantos níveis subiu
 * - Atualiza level, xp, xp_to_next_level no banco
 * - O trigger on_level_up concede attribute_points e marca resonance_event_pending
 * - Cria evento e notificação para cada level up
 *
 * Use esta função em vez de atualizar xp diretamente.
 */
export async function grantXp(
  characterId: string,
  amount: number,
  supabaseOverride?: SupabaseClient<Database>
): Promise<GrantXpResult> {
  const supabase = supabaseOverride ?? await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, level, xp')
    .eq('id', characterId)
    .single()

  if (!character) return { levelsGained: 0, newLevel: 0, newXp: 0, xpToNext: 0 }

  const result = checkLevelUp(character.level, character.xp, amount)

  // Atualiza personagem
  await supabase
    .from('characters')
    .update({
      xp: result.newXp,
      level: result.newLevel,
      xp_to_next_level: xpToNextLevel(result.newLevel),
    })
    .eq('id', characterId)

  // Cria eventos e notificações para cada level ganho
  if (result.levelsGained > 0) {
    for (let lvl = character.level + 1; lvl <= result.newLevel; lvl++) {
      await createEvent(supabase, {
        type: 'level_up',
        actorId: characterId,
        metadata: {
          old_level: lvl - 1,
          new_level: lvl,
        },
        isPublic: true,
        narrativeText: `${character.name} alcançou o nível ${lvl}.`,
      })
    }

    await createNotification({
      characterId,
      type: 'level_up',
      title: result.levelsGained === 1
        ? `Nível ${result.newLevel}!`
        : `${result.levelsGained} níveis ganhos!`,
      body: result.levelsGained === 1
        ? `Você alcançou o nível ${result.newLevel}. Pontos de atributo disponíveis.`
        : `Você subiu para o nível ${result.newLevel}. Distribua seus pontos de atributo.`,
      actionUrl: '/character',
    })
  }

  return {
    levelsGained: result.levelsGained,
    newLevel: result.newLevel,
    newXp: result.newXp,
    xpToNext: xpToNextLevel(result.newLevel),
  }
}
