// ---------------------------------------------------------------------------
// Loja Sazonal de Maestrias Lendárias
// Referência: GDD_Balanceamento §12
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

export async function getActiveSeason() {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('seasons')
    .select('*, seasonal_legendaries(*, maestrias(*))')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .maybeSingle()
  return data
}

export async function purchaseSeasonalLegendary(
  characterId: string,
  userId: string,
  seasonalLegendaryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, level, resonance_level')
    .eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: si } = await supabase
    .from('seasonal_legendaries')
    .select('*, seasons(is_active, starts_at, ends_at), maestrias(*)')
    .eq('id', seasonalLegendaryId).single()
  if (!si) return { success: false, error: 'Item não encontrado.' }

  const season = si.seasons as Record<string, unknown>
  const now = new Date()
  if (!season.is_active || new Date(season.starts_at as string) > now || new Date(season.ends_at as string) < now) {
    return { success: false, error: 'Temporada encerrada.' }
  }

  if (si.purchased_by) return { success: false, error: 'Maestria já adquirida por outro personagem.' }

  const maestria = si.maestrias as Record<string, unknown>
  const restrictions = (maestria.restrictions as Record<string, unknown>) ?? {}
  if (restrictions.min_level && character.level < (restrictions.min_level as number)) {
    return { success: false, error: `Nível ${restrictions.min_level} necessário.` }
  }
  if (restrictions.min_resonance_level && (character.resonance_level ?? 0) < (restrictions.min_resonance_level as number)) {
    return { success: false, error: `Ressonância nível ${restrictions.min_resonance_level} necessário.` }
  }

  const { data: wallet } = await supabase
    .from('character_wallet').select('premium_currency').eq('character_id', characterId).single()
  if (!wallet || wallet.premium_currency < si.price_gemas) {
    return { success: false, error: `Gemas insuficientes. Necessário: ${si.price_gemas}.` }
  }

  // Atomicidade: marca como comprado apenas se ainda disponível
  const { error: updateError } = await supabase
    .from('seasonal_legendaries')
    .update({ purchased_by: characterId, purchased_at: new Date().toISOString() })
    .eq('id', seasonalLegendaryId)
    .is('purchased_by', null)

  if (updateError) return { success: false, error: 'Maestria acabou de ser adquirida por outro personagem.' }

  await supabase.from('character_wallet')
    .update({ premium_currency: wallet.premium_currency - si.price_gemas })
    .eq('character_id', characterId)

  await supabase.from('character_maestrias')
    .insert({ character_id: characterId, maestria_id: si.maestria_id })

  await createEvent(supabase, {
    type: 'maestria_acquired',
    actorId: characterId,
    metadata: { maestria_name: maestria.name, category: 'lendaria', seasonal: true, price_gemas: si.price_gemas },
    isPublic: true,
    narrativeText: `${maestria.name as string} — Maestria Lendária adquirida.`,
  })

  return { success: true }
}
