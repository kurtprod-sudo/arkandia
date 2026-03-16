'use server'

import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

/**
 * Entra em um cenário social.
 * Valida: cenário ativo, não excede max_players, personagem não está já presente.
 */
export async function joinScenario(
  scenarioId: string,
  characterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id, name')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Busca cenário
  const { data: scenario } = await supabase
    .from('social_scenarios')
    .select('id, name, max_players, is_active')
    .eq('id', scenarioId)
    .eq('is_active', true)
    .single()
  if (!scenario) return { success: false, error: 'Cenário não encontrado.' }

  // Verifica se já está presente
  const { data: existing } = await supabase
    .from('scenario_presence')
    .select('id')
    .eq('scenario_id', scenarioId)
    .eq('character_id', characterId)
    .maybeSingle()
  if (existing) return { success: false, error: 'Você já está neste cenário.' }

  // Verifica lotação
  const { count } = await supabase
    .from('scenario_presence')
    .select('id', { count: 'exact', head: true })
    .eq('scenario_id', scenarioId)
  if ((count ?? 0) >= scenario.max_players) {
    return { success: false, error: 'Cenário lotado.' }
  }

  // Entra no cenário
  const { error } = await supabase
    .from('scenario_presence')
    .insert({ scenario_id: scenarioId, character_id: characterId })
  if (error) return { success: false, error: 'Erro ao entrar no cenário.' }

  await createEvent(supabase, {
    type: 'scenario_joined',
    actorId: characterId,
    metadata: { scenario_id: scenarioId, scenario_name: scenario.name },
    isPublic: false,
    narrativeText: `${character.name} entrou em ${scenario.name}.`,
  })

  return { success: true }
}

/**
 * Sai de um cenário social.
 */
export async function leaveScenario(
  scenarioId: string,
  characterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  await supabase
    .from('scenario_presence')
    .delete()
    .eq('scenario_id', scenarioId)
    .eq('character_id', characterId)

  return { success: true }
}

/**
 * Envia uma mensagem em um cenário.
 * isOoc = mensagem fora do personagem (entre colchetes, tom diferente).
 */
export async function sendMessage(
  scenarioId: string,
  characterId: string,
  userId: string,
  content: string,
  isOoc = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  if (!content.trim()) return { success: false, error: 'Mensagem vazia.' }
  if (content.length > 500) return { success: false, error: 'Mensagem muito longa.' }

  // Verifica silêncio
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (authUser) {
    const { checkSilenceStatus } = await import('./moderation')
    const isSilenced = await checkSilenceStatus(authUser.id)
    if (isSilenced) {
      return { success: false, error: 'Você está silenciado e não pode enviar mensagens.' }
    }
  }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  // Verifica que está no cenário
  const { data: presence } = await supabase
    .from('scenario_presence')
    .select('id')
    .eq('scenario_id', scenarioId)
    .eq('character_id', characterId)
    .maybeSingle()
  if (!presence) return { success: false, error: 'Você não está neste cenário.' }

  const { error } = await supabase
    .from('scenario_messages')
    .insert({
      scenario_id: scenarioId,
      character_id: characterId,
      content: content.trim(),
      is_ooc: isOoc,
    })
  if (error) return { success: false, error: 'Erro ao enviar mensagem.' }

  return { success: true }
}

/**
 * Retorna os cenários ativos com contagem de participantes.
 */
export async function getActiveScenarios() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('social_scenarios')
    .select('*, scenario_presence(count)')
    .eq('is_active', true)
    .order('name')
  return data ?? []
}
