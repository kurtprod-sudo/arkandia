import { createClient } from '@/lib/supabase/server'

// Produção passiva on-demand via timestamp
// Regra inviolável: nunca background job — sempre calculado no momento da coleta
// Referência: GDD_Sistemas §4

const REINVESTMENT_MULTIPLIERS = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 4.0]

/**
 * Calcula produção acumulada de um território desde o último collect.
 * On-demand — sem background job.
 */
export function calculateProduction(params: {
  baseProductionPerHour: number
  lastCollected: Date
  reinvestmentLevel: number
  now?: Date
}): { libras: number; hoursElapsed: number } {
  const now = params.now ?? new Date()
  const msElapsed = now.getTime() - params.lastCollected.getTime()
  const hoursElapsed = msElapsed / (1000 * 60 * 60)

  // Cap em 72 horas para evitar acúmulo excessivo
  const cappedHours = Math.min(hoursElapsed, 72)
  const multiplier = REINVESTMENT_MULTIPLIERS[
    Math.min(params.reinvestmentLevel, REINVESTMENT_MULTIPLIERS.length - 1)
  ] ?? 1.0

  const libras = Math.floor(
    params.baseProductionPerHour * cappedHours * multiplier
  )

  return { libras, hoursElapsed: cappedHours }
}

/**
 * Coleta produção passiva de todos os territórios de uma Sociedade.
 * Aplica imposto configurado pela Sociedade.
 * Referência: GDD_Sistemas §4
 */
export async function collectTerritoryProduction(
  societyId: string,
  userId: string
): Promise<{
  success: boolean
  error?: string
  totalLibras?: number
  territories?: Array<{ name: string; libras: number }>
}> {
  const supabase = await createClient()

  // Verifica que usuário é líder ou general da sociedade
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)
    .eq('society_id', societyId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: membership } = await supabase
    .from('society_members')
    .select('role')
    .eq('society_id', societyId)
    .eq('character_id', character.id)
    .single()
  if (!['leader', 'officer'].includes(membership?.role ?? '')) {
    return { success: false, error: 'Apenas Líder ou General pode coletar produção.' }
  }

  // Busca sociedade (tax e treasury)
  const { data: society } = await supabase
    .from('societies')
    .select('treasury_libras, tax_percent')
    .eq('id', societyId)
    .single()
  if (!society) return { success: false, error: 'Sociedade não encontrada.' }

  // Busca territórios controlados com produção
  const { data: productions } = await supabase
    .from('territory_production')
    .select('*, territories(name, base_production)')
    .eq('society_id', societyId)

  if (!productions || productions.length === 0) {
    return { success: true, totalLibras: 0, territories: [] }
  }

  const now = new Date()
  let totalLibras = 0
  const results: Array<{ name: string; libras: number }> = []

  for (const prod of productions) {
    const territory = prod.territories as Record<string, unknown> | null
    const baseProduction = territory?.base_production as Record<string, unknown> | null
    const basePerHour = (baseProduction?.libras_per_hour as number) ?? 0

    const { libras } = calculateProduction({
      baseProductionPerHour: basePerHour,
      lastCollected: new Date(prod.last_collected ?? now),
      reinvestmentLevel: prod.reinvestment_level ?? 0,
      now,
    })

    if (libras > 0) {
      totalLibras += libras
      results.push({
        name: (territory?.name as string) ?? 'Território',
        libras,
      })

      // Atualiza last_collected
      await supabase
        .from('territory_production')
        .update({ last_collected: now.toISOString() })
        .eq('id', prod.id)
    }
  }

  // Aplica imposto: percentual vai pro cofre, resto distribuído
  const taxAmount = Math.floor(totalLibras * ((society.tax_percent ?? 10) / 100))
  const distributable = totalLibras - taxAmount

  // Adiciona imposto ao cofre
  if (taxAmount > 0) {
    await supabase
      .from('societies')
      .update({ treasury_libras: (society.treasury_libras ?? 0) + taxAmount })
      .eq('id', societyId)
    const { updateSocietyMissionProgress } = await import('./society_missions')
    await updateSocietyMissionProgress(character.id, 'collective_treasury', taxAmount).catch(() => {})
  }

  // Distribui restante para o coletador (simplificado — pode expandir para todos membros)
  if (distributable > 0) {
    const { data: wallet } = await supabase
      .from('character_wallet')
      .select('libras')
      .eq('character_id', character.id)
      .single()
    if (wallet) {
      await supabase
        .from('character_wallet')
        .update({ libras: wallet.libras + distributable })
        .eq('character_id', character.id)
    }
  }

  return { success: true, totalLibras, territories: results }
}
