// ---------------------------------------------------------------------------
// Sistema de Tropas — Fase 26
// Referência: GDD_Sistemas §2
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'

export type TroopType = 'infantaria' | 'arquearia' | 'cavalaria' | 'cerco'

export interface TroopStock {
  infantaria: number
  arquearia: number
  cavalaria: number
  cerco: number
}

export interface TroopDeployment {
  infantaria?: number
  arquearia?: number
  cavalaria?: number
  cerco?: number
}

export const TROOP_CONFIG: Record<TroopType, {
  quantityPerLot: number
  librasCost: number
  durationHours: number
}> = {
  infantaria: { quantityPerLot: 10, librasCost: 300, durationHours: 1 },
  arquearia:  { quantityPerLot: 8,  librasCost: 400, durationHours: 2 },
  cavalaria:  { quantityPerLot: 5,  librasCost: 400, durationHours: 3 },
  cerco:      { quantityPerLot: 2,  librasCost: 260, durationHours: 4 },
}

export const TROOP_ADVANTAGE: Partial<Record<TroopType, TroopType>> = {
  arquearia: 'cavalaria',
  cavalaria: 'infantaria',
  infantaria: 'arquearia',
}

const ALL_TROOP_TYPES: TroopType[] = ['infantaria', 'arquearia', 'cavalaria', 'cerco']

export async function getTroopStock(characterId: string): Promise<TroopStock> {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('character_troops')
    .select('troop_type, quantity')
    .eq('character_id', characterId)

  const stock: TroopStock = { infantaria: 0, arquearia: 0, cavalaria: 0, cerco: 0 }
  for (const row of rows ?? []) {
    stock[row.troop_type as TroopType] = row.quantity
  }

  // Ensure all types exist in DB
  for (const tt of ALL_TROOP_TYPES) {
    if (!(rows ?? []).some((r) => r.troop_type === tt)) {
      await supabase.from('character_troops').upsert(
        { character_id: characterId, troop_type: tt, quantity: 0 },
        { onConflict: 'character_id,troop_type' }
      )
    }
  }

  return stock
}

export async function getCapacityLimit(characterId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('character_attributes')
    .select('capitania')
    .eq('character_id', characterId)
    .single()
  return (data?.capitania ?? 0) * 10
}

export async function enqueueRecruitment(
  characterId: string,
  userId: string,
  troopType: TroopType
): Promise<{ success: boolean; error?: string; endsAt?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const config = TROOP_CONFIG[troopType]

  // Check libras
  const { data: wallet } = await supabase
    .from('character_wallet').select('libras').eq('character_id', characterId).single()
  if (!wallet || wallet.libras < config.librasCost) {
    return { success: false, error: `Libras insuficientes. Necessário: ${config.librasCost}.` }
  }

  // Debit libras
  await supabase
    .from('character_wallet')
    .update({ libras: wallet.libras - config.librasCost })
    .eq('character_id', characterId)

  // Find starts_at: after last pending lot or NOW
  const { data: lastPending } = await supabase
    .from('recruitment_queue')
    .select('ends_at')
    .eq('character_id', characterId)
    .eq('completed', false)
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = new Date()
  const startsAt = lastPending?.ends_at && new Date(lastPending.ends_at) > now
    ? new Date(lastPending.ends_at)
    : now

  const endsAt = new Date(startsAt.getTime() + config.durationHours * 3600000)

  await supabase.from('recruitment_queue').insert({
    character_id: characterId,
    troop_type: troopType,
    quantity: config.quantityPerLot,
    libras_spent: config.librasCost,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    completed: false,
  })

  return { success: true, endsAt: endsAt.toISOString() }
}

export async function processCompletedRecruitment(
  characterId: string
): Promise<{ processed: number }> {
  const supabase = await createClient()

  const { data: completable } = await supabase
    .from('recruitment_queue')
    .select('id, troop_type, quantity')
    .eq('character_id', characterId)
    .eq('completed', false)
    .lte('ends_at', new Date().toISOString())

  if (!completable || completable.length === 0) return { processed: 0 }

  for (const lot of completable) {
    const tt = lot.troop_type as TroopType

    // Upsert troop stock
    const { data: current } = await supabase
      .from('character_troops')
      .select('quantity')
      .eq('character_id', characterId)
      .eq('troop_type', tt)
      .maybeSingle()

    if (current) {
      await supabase
        .from('character_troops')
        .update({ quantity: current.quantity + lot.quantity })
        .eq('character_id', characterId)
        .eq('troop_type', tt)
    } else {
      await supabase
        .from('character_troops')
        .insert({ character_id: characterId, troop_type: tt, quantity: lot.quantity })
    }

    await supabase
      .from('recruitment_queue')
      .update({ completed: true })
      .eq('id', lot.id)
  }

  if (completable.length > 0) {
    const summary = completable.map((l) => `+${l.quantity} ${l.troop_type}`).join(', ')
    await createNotification({
      characterId,
      type: 'general',
      title: 'Recrutamento concluído',
      body: `Tropas prontas: ${summary}.`,
      actionUrl: '/battle/troops',
    })
  }

  return { processed: completable.length }
}

export async function getRecruitmentQueue(
  characterId: string
): Promise<Array<{ id: string; troopType: TroopType; quantity: number; startsAt: string; endsAt: string }>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recruitment_queue')
    .select('id, troop_type, quantity, starts_at, ends_at')
    .eq('character_id', characterId)
    .eq('completed', false)
    .order('starts_at')

  return (data ?? []).map((r) => ({
    id: r.id,
    troopType: r.troop_type as TroopType,
    quantity: r.quantity,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  }))
}

export async function validateTroopDeployment(
  characterId: string,
  deployment: TroopDeployment
): Promise<{ valid: boolean; error?: string }> {
  const total = Object.values(deployment).reduce((s, v) => s + (v ?? 0), 0)
  if (total <= 0) return { valid: false, error: 'Selecione ao menos uma tropa.' }

  const capacity = await getCapacityLimit(characterId)
  if (total > capacity) {
    return { valid: false, error: `Total ${total} excede a capacidade de ${capacity} (Capitania × 10).` }
  }

  const stock = await getTroopStock(characterId)
  for (const tt of ALL_TROOP_TYPES) {
    const requested = deployment[tt] ?? 0
    if (requested > stock[tt]) {
      return { valid: false, error: `${tt}: solicitado ${requested}, disponível ${stock[tt]}.` }
    }
  }

  return { valid: true }
}

export async function deductTroopLosses(
  characterId: string,
  losses: TroopDeployment
): Promise<void> {
  const supabase = await createClient()

  for (const tt of ALL_TROOP_TYPES) {
    const loss = losses[tt] ?? 0
    if (loss <= 0) continue

    const { data: current } = await supabase
      .from('character_troops')
      .select('quantity')
      .eq('character_id', characterId)
      .eq('troop_type', tt)
      .single()

    if (current) {
      await supabase
        .from('character_troops')
        .update({ quantity: Math.max(0, current.quantity - loss) })
        .eq('character_id', characterId)
        .eq('troop_type', tt)
    }
  }
}

export function calcTroopSuccessModifier(
  deployment: TroopDeployment,
  resistanceType: TroopType
): number {
  let modifier = 0

  // Find which troop type has advantage against resistance
  const advantageousType = Object.entries(TROOP_ADVANTAGE)
    .find(([, weak]) => weak === resistanceType)?.[0] as TroopType | undefined

  // Find which troop type is weak to resistance
  const disadvantagedType = TROOP_ADVANTAGE[resistanceType]

  // Advantage bonus
  if (advantageousType && (deployment[advantageousType] ?? 0) > 0) {
    modifier += 0.15
  }

  // Cerco bonus: +0.05 per lot present (max +0.20)
  const cercoCount = deployment.cerco ?? 0
  if (cercoCount > 0) {
    const cercoLots = Math.floor(cercoCount / TROOP_CONFIG.cerco.quantityPerLot)
    modifier += Math.min(0.20, cercoLots * 0.05)
  }

  // Disadvantage penalty if majority
  if (disadvantagedType) {
    const totalTroops = Object.values(deployment).reduce((s, v) => s + (v ?? 0), 0)
    const disadCount = deployment[disadvantagedType] ?? 0
    if (totalTroops > 0 && disadCount / totalTroops > 0.5) {
      modifier -= 0.10
    }
  }

  return Math.max(-0.20, Math.min(0.35, modifier))
}
