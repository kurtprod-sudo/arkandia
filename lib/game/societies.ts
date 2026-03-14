import { createClient } from '@/lib/supabase/server'
import { createEvent } from './events'

const SOCIETY_CREATION_COST = 500 // Libras
const MIN_LEVEL_TO_FOUND = 10

/**
 * Cria uma nova Sociedade.
 * Referência: GDD_Sociedades §2
 */
export async function createSociety(
  founderId: string,
  userId: string,
  name: string,
  description: string,
  manifesto?: string
): Promise<{ success: boolean; error?: string; societyId?: string }> {
  const supabase = await createClient()

  // Verifica ownership e level mínimo
  const { data: founder } = await supabase
    .from('characters')
    .select('id, name, level, society_id')
    .eq('id', founderId)
    .eq('user_id', userId)
    .single()
  if (!founder) return { success: false, error: 'Personagem não encontrado.' }
  if (founder.level < MIN_LEVEL_TO_FOUND) {
    return { success: false, error: `Nível ${MIN_LEVEL_TO_FOUND} necessário para fundar uma Sociedade.` }
  }
  if (founder.society_id) {
    return { success: false, error: 'Você já pertence a uma Sociedade.' }
  }

  // Verifica nome único
  const { data: existingName } = await supabase
    .from('societies')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (existingName) return { success: false, error: 'Nome já em uso.' }

  // Verifica custo em Libras
  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('libras')
    .eq('character_id', founderId)
    .single()
  if (!wallet || wallet.libras < SOCIETY_CREATION_COST) {
    return { success: false, error: `Libras insuficientes. Custo: ${SOCIETY_CREATION_COST} Libras.` }
  }

  // Debita Libras
  await supabase
    .from('character_wallet')
    .update({ libras: wallet.libras - SOCIETY_CREATION_COST })
    .eq('character_id', founderId)

  // Cria a Sociedade
  const { data: society, error } = await supabase
    .from('societies')
    .insert({
      name,
      description,
      manifesto: manifesto ?? null,
      leader_id: founderId,
      level: 1,
      treasury_libras: 0,
    })
    .select()
    .single()

  if (error || !society) {
    return { success: false, error: 'Erro ao criar Sociedade.' }
  }

  // Adiciona fundador como líder
  await supabase.from('society_members').insert({
    society_id: society.id,
    character_id: founderId,
    role: 'leader',
  })

  // Atualiza society_id no personagem
  await supabase
    .from('characters')
    .update({ society_id: society.id })
    .eq('id', founderId)

  await createEvent(supabase, {
    type: 'society_founded',
    actorId: founderId,
    metadata: { society_id: society.id, society_name: name },
    isPublic: true,
    narrativeText: `${founder.name} fundou a Sociedade ${name}.`,
  })

  return { success: true, societyId: society.id }
}

/**
 * Entra em uma Sociedade.
 * Referência: GDD_Sociedades §4
 */
export async function joinSociety(
  characterId: string,
  userId: string,
  societyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, society_id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }
  if (character.society_id) {
    return { success: false, error: 'Você já pertence a uma Sociedade.' }
  }

  // Busca sociedade e verifica limite de membros
  const { data: society } = await supabase
    .from('societies')
    .select('id, name, level, recruitment_open')
    .eq('id', societyId)
    .is('dissolved_at', null)
    .single()
  if (!society) return { success: false, error: 'Sociedade não encontrada.' }
  if (!society.recruitment_open) {
    return { success: false, error: 'Esta Sociedade não está recrutando.' }
  }

  // Limite de membros por nível (10 + 5 por nível)
  const maxMembers = 10 + (society.level - 1) * 5
  const { count } = await supabase
    .from('society_members')
    .select('id', { count: 'exact', head: true })
    .eq('society_id', societyId)
  if ((count ?? 0) >= maxMembers) {
    return { success: false, error: 'Sociedade com membros no limite.' }
  }

  await supabase.from('society_members').insert({
    society_id: societyId,
    character_id: characterId,
    role: 'member',
  })

  await supabase
    .from('characters')
    .update({ society_id: societyId })
    .eq('id', characterId)

  await createEvent(supabase, {
    type: 'society_joined',
    actorId: characterId,
    metadata: { society_id: societyId, society_name: society.name },
    isPublic: true,
    narrativeText: `${character.name} ingressou em ${society.name}.`,
  })

  return { success: true }
}

/**
 * Sai de uma Sociedade voluntariamente.
 */
export async function leaveSociety(
  characterId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, society_id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character || !character.society_id) {
    return { success: false, error: 'Você não pertence a uma Sociedade.' }
  }

  // Líder não pode sair — deve transferir liderança primeiro
  const { data: membership } = await supabase
    .from('society_members')
    .select('role')
    .eq('society_id', character.society_id)
    .eq('character_id', characterId)
    .single()
  if (membership?.role === 'leader') {
    return { success: false, error: 'Transfira a liderança antes de sair.' }
  }

  await supabase
    .from('society_members')
    .delete()
    .eq('society_id', character.society_id)
    .eq('character_id', characterId)

  await supabase
    .from('characters')
    .update({ society_id: null })
    .eq('id', characterId)

  return { success: true }
}

/**
 * Dissolve uma Sociedade.
 * Territórios ficam sem dono. Cofre distribuído entre membros.
 * Referência: GDD_Sociedades §8
 */
export async function dissolveSociety(
  societyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verifica que é o líder
  const { data: leader } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)
    .eq('society_id', societyId)
    .single()
  if (!leader) return { success: false, error: 'Personagem não encontrado.' }

  const { data: membership } = await supabase
    .from('society_members')
    .select('role')
    .eq('society_id', societyId)
    .eq('character_id', leader.id)
    .single()
  if (membership?.role !== 'leader') {
    return { success: false, error: 'Apenas o Líder pode dissolver a Sociedade.' }
  }

  const { data: society } = await supabase
    .from('societies')
    .select('treasury_libras, name')
    .eq('id', societyId)
    .single()
  if (!society) return { success: false, error: 'Sociedade não encontrada.' }

  // Distribui cofre entre membros ativos
  const { data: members } = await supabase
    .from('society_members')
    .select('character_id')
    .eq('society_id', societyId)

  if (members && members.length > 0 && society.treasury_libras > 0) {
    const sharePerMember = Math.floor(society.treasury_libras / members.length)
    for (const member of members) {
      const { data: wallet } = await supabase
        .from('character_wallet')
        .select('libras')
        .eq('character_id', member.character_id)
        .single()
      if (wallet) {
        await supabase
          .from('character_wallet')
          .update({ libras: wallet.libras + sharePerMember })
          .eq('character_id', member.character_id)
      }
    }
  }

  // Remove todos os membros e atualiza society_id para null
  const memberIds = (members ?? []).map((m) => m.character_id)
  if (memberIds.length > 0) {
    await supabase
      .from('characters')
      .update({ society_id: null })
      .in('id', memberIds)
    await supabase
      .from('society_members')
      .delete()
      .eq('society_id', societyId)
  }

  // Dissolve — trigger cuida dos territórios
  await supabase
    .from('societies')
    .update({ dissolved_at: new Date().toISOString() })
    .eq('id', societyId)

  await createEvent(supabase, {
    type: 'society_dissolved',
    actorId: leader.id,
    metadata: { society_id: societyId, society_name: society.name },
    isPublic: true,
    narrativeText: `A Sociedade ${society.name} foi dissolvida.`,
  })

  return { success: true }
}

/**
 * Deposita Libras no cofre da Sociedade.
 */
export async function depositToTreasury(
  characterId: string,
  userId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  if (amount <= 0) return { success: false, error: 'Valor inválido.' }

  const { data: character } = await supabase
    .from('characters')
    .select('id, society_id')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()
  if (!character?.society_id) {
    return { success: false, error: 'Você não pertence a uma Sociedade.' }
  }

  const { data: wallet } = await supabase
    .from('character_wallet')
    .select('libras')
    .eq('character_id', characterId)
    .single()
  if (!wallet || wallet.libras < amount) {
    return { success: false, error: 'Libras insuficientes.' }
  }

  await supabase
    .from('character_wallet')
    .update({ libras: wallet.libras - amount })
    .eq('character_id', characterId)

  const { data: society } = await supabase
    .from('societies')
    .select('treasury_libras')
    .eq('id', character.society_id)
    .single()
  if (society) {
    await supabase
      .from('societies')
      .update({ treasury_libras: society.treasury_libras + amount })
      .eq('id', character.society_id)
  }

  return { success: true }
}
