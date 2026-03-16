'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  gmCreateTournament,
  registerForTournament,
  gmGenerateBracket,
  gmAdvanceBracket,
  gmFinishTournament,
} from '@/lib/game/tournament'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

async function assertGM() {
  const { supabase, user } = await getAuthUser()
  if (!user) throw new Error('Não autenticado.')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'gm') throw new Error('Acesso negado.')
  return { supabase, user }
}

export async function registerForTournamentAction(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const result = await registerForTournament(tournamentId, character.id, user.id)
  revalidatePath(`/tournament/${tournamentId}`)
  return result
}

export async function gmCreateTournamentAction(input: {
  name: string
  description?: string
  maxParticipants: 8 | 16 | 32
  registrationEndsAt: string
  prizePool: {
    first: { libras?: number; gemas?: number }
    second: { libras?: number; gemas?: number }
    third: { libras?: number; gemas?: number }
  }
}): Promise<{ success: boolean; tournamentId?: string; error?: string }> {
  const { supabase, user } = await assertGM()

  const { data: character } = await supabase
    .from('characters').select('id').eq('user_id', user.id).single()
  if (!character) return { success: false, error: 'Personagem GM não encontrado.' }

  const result = await gmCreateTournament({
    gmCharacterId: character.id,
    ...input,
  })
  revalidatePath('/gm')
  revalidatePath('/tournament')
  return result
}

export async function gmGenerateBracketAction(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  await assertGM()
  const result = await gmGenerateBracket(tournamentId)
  revalidatePath(`/tournament/${tournamentId}`)
  revalidatePath('/gm')
  return result
}

export async function gmAdvanceBracketAction(
  matchId: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const { user } = await assertGM()
  const result = await gmAdvanceBracket(matchId, user.id)
  revalidatePath('/gm')
  return result
}

export async function gmFinishTournamentAction(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  await assertGM()
  const result = await gmFinishTournament(tournamentId)
  revalidatePath(`/tournament/${tournamentId}`)
  revalidatePath('/gm')
  return result
}
