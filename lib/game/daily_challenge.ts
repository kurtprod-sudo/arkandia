// ---------------------------------------------------------------------------
// Desafio Diário de Combate — Fase 27
// Referência: GDD_Sistemas §6
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { startCombat } from './combat'

const NPC_NAMES = [
  'Malachar, o Errante', 'Syvara, Lâmina da Névoa', 'Drothek, o Inclemente',
  'Vaen, Punho do Vazio', 'Thessia, a Implacável', 'Rhorkan, Sombra de Thar',
  'Ivael, o Sem-Memória', 'Cendra, Chama Apagada', 'Morusk, o Peso do Fim',
  'Larien, Voz do Abismo', 'Nythros, o Quebrado', 'Eska, Portadora do Lacre',
  'Valdrek, Braço da Tempestade', 'Ouryn, o Eterno Segundo', 'Phaena, Raiz do Caos',
  'Solmek, o Desperto', 'Cirath, Eco de Guerra', 'Brelune, a Insaciável',
  'Vorkas, Dente do Mundo', 'Thessan, o Sem-Caminho',
] as const

const NPC_PHRASES = [
  'Você ousa enfrentar o Braço da Tempestade?',
  'Cada ferida minha é uma lição que você não sobreviverá para aplicar.',
  'Já vi mil como você. Nenhum ficou de pé.',
  'Venha. Provarei que seu Arquétipo escolheu errado.',
  'Não luto por glória. Luto porque é tudo que resta.',
  'Seu nome será esquecido antes do amanhecer.',
  'Eu já morri uma vez. Você não tem essa vantagem.',
  'O mundo não precisa de mais heróis. Precisa de sobreviventes.',
  'Mostre-me o que seu Arquétipo realmente te deu.',
  'Vim de mais longe do que você pode imaginar. E voltarei.',
  'Cada passo seu em direção a mim é um erro calculado.',
  'Lutei nas Ruínas de Thar-Halum. Você é apenas mais um obstáculo.',
  'Seu Éter tem cheiro de iniciante.',
  'Não subestime quem não tem mais nada a perder.',
  'Já derrubei os fortes. Os fracos mal me entretêm.',
  'Você vai lembrar deste momento pelo resto da sua vida — que será curta.',
  'Seu Arquétipo sussurra para você? O meu grita.',
  'Vim buscar um duelo. Você me oferece um treino.',
  'Não existe honra aqui. Existe apenas quem cai primeiro.',
  'Ellia não se importa com quem vence. Mas eu me importo.',
] as const

export interface NpcSnapshot {
  name: string
  challengePhrase: string
  attributes: Record<string, number>
}

export interface DailyChallengeRecord {
  id: string
  characterId: string
  challengeDate: string
  npcSnapshot: NpcSnapshot
  combatSessionId: string | null
  completed: boolean
  won: boolean | null
  rewardClaimed: boolean
  currentStreak: number
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function generateDailyChallenge(
  characterId: string,
  userId: string
): Promise<{ success: boolean; error?: string; challenge?: DailyChallengeRecord }> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: existing } = await supabase
    .from('daily_challenges').select('*')
    .eq('character_id', characterId).eq('challenge_date', today).maybeSingle()
  if (existing) return { success: true, challenge: mapRecord(existing) }

  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('ataque, magia, defesa, vitalidade, velocidade, precisao, tenacidade, capitania, eter_max')
    .eq('character_id', characterId).single()
  if (!attrs) return { success: false, error: 'Atributos não encontrados.' }

  // NPC at 80% of player stats
  const npcAttrs: Record<string, number> = {}
  for (const [key, val] of Object.entries(attrs)) {
    npcAttrs[key] = Math.max(1, Math.floor((val as number) * 0.8))
  }
  npcAttrs.hp_max = 80 + npcAttrs.vitalidade * 5
  npcAttrs.hp_atual = npcAttrs.hp_max
  npcAttrs.eter_atual = npcAttrs.eter_max

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const { data: yesterdayChallenge } = await supabase
    .from('daily_challenges').select('current_streak, won')
    .eq('character_id', characterId).eq('challenge_date', yesterday).maybeSingle()

  const prevStreak = yesterdayChallenge?.won ? (yesterdayChallenge.current_streak ?? 0) : 0

  const npcSnapshot: NpcSnapshot = {
    name: pick(NPC_NAMES),
    challengePhrase: pick(NPC_PHRASES),
    attributes: npcAttrs,
  }

  const { data: created } = await supabase
    .from('daily_challenges')
    .insert({
      character_id: characterId,
      challenge_date: today,
      npc_snapshot: npcSnapshot as unknown as never,
      completed: false,
      current_streak: prevStreak,
    })
    .select().single()

  if (!created) return { success: false, error: 'Erro ao criar desafio.' }
  return { success: true, challenge: mapRecord(created) }
}

/**
 * Inicia o combate do desafio diário via engine PvP completo.
 * Cria um personagem fantasma para o NPC, inicia combate duelo_livre,
 * retorna sessionId para redirecionar à CombatArena.
 */
export async function acceptDailyChallenge(
  challengeId: string,
  userId: string
): Promise<{ success: boolean; error?: string; sessionId?: string }> {
  const supabase = await createClient()

  const { data: challenge } = await supabase
    .from('daily_challenges').select('*').eq('id', challengeId).single()
  if (!challenge) return { success: false, error: 'Desafio não encontrado.' }
  if (challenge.completed) return { success: false, error: 'Desafio já completado.' }

  // If already has a session, return it (idempotent)
  if (challenge.combat_session_id) {
    return { success: true, sessionId: challenge.combat_session_id as string }
  }

  const { data: character } = await supabase
    .from('characters').select('id')
    .eq('id', challenge.character_id).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  const npcSnapshot = challenge.npc_snapshot as unknown as NpcSnapshot
  const npcAttrs = npcSnapshot.attributes

  // Create phantom NPC character for the combat engine
  const { data: npcChar } = await supabase
    .from('characters')
    .insert({
      user_id: userId,
      name: npcSnapshot.name,
      level: 1,
      status: 'active',
      xp: 0,
      xp_to_next_level: 9999,
    } as never)
    .select('id').single()

  if (!npcChar) return { success: false, error: 'Erro ao criar NPC.' }

  // Set NPC attributes from snapshot
  await supabase.from('character_attributes').upsert({
    character_id: npcChar.id,
    ataque: npcAttrs.ataque ?? 10,
    magia: npcAttrs.magia ?? 10,
    defesa: npcAttrs.defesa ?? 5,
    vitalidade: npcAttrs.vitalidade ?? 10,
    velocidade: npcAttrs.velocidade ?? 10,
    precisao: npcAttrs.precisao ?? 10,
    tenacidade: npcAttrs.tenacidade ?? 10,
    capitania: npcAttrs.capitania ?? 0,
    eter_max: npcAttrs.eter_max ?? 50,
    eter_atual: npcAttrs.eter_atual ?? 50,
    hp_max: npcAttrs.hp_max ?? 130,
    hp_atual: npcAttrs.hp_atual ?? 130,
    moral: 100,
    attribute_points: 0,
  } as never, { onConflict: 'character_id' })

  // Start combat via the full PvP engine (duelo_livre — no consequences)
  const combatResult = await startCombat(character.id, npcChar.id, 'duelo_livre', userId)

  if (!combatResult.success || !combatResult.sessionId) {
    await supabase.from('character_attributes').delete().eq('character_id', npcChar.id)
    await supabase.from('characters').delete().eq('id', npcChar.id)
    return { success: false, error: combatResult.error ?? 'Erro ao iniciar combate.' }
  }

  // Link session to challenge
  await supabase
    .from('daily_challenges')
    .update({ combat_session_id: combatResult.sessionId })
    .eq('id', challengeId)

  return { success: true, sessionId: combatResult.sessionId }
}

/**
 * Resolve o desafio diário após o combate terminar.
 * Chamada por combat.ts quando uma sessão com daily_challenge associado é finalizada.
 */
export async function resolveDailyChallenge(
  sessionId: string,
  winnerId: string
): Promise<void> {
  const supabase = await createClient()

  const { data: challenge } = await supabase
    .from('daily_challenges').select('id, character_id, current_streak')
    .eq('combat_session_id', sessionId).maybeSingle()

  if (!challenge) return

  const characterId = challenge.character_id as string
  const won = winnerId === characterId

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const { data: yesterdayChallenge } = await supabase
    .from('daily_challenges').select('current_streak, won')
    .eq('character_id', characterId).eq('challenge_date', yesterday).maybeSingle()

  let newStreak = 0
  if (won) {
    newStreak = (yesterdayChallenge?.won ? (yesterdayChallenge.current_streak ?? 0) : 0) + 1
  }

  await supabase
    .from('daily_challenges')
    .update({ completed: true, won, current_streak: newStreak, reward_claimed: won })
    .eq('id', challenge.id)

  if (won) {
    const { data: wallet } = await supabase
      .from('character_wallet').select('libras, summon_tickets')
      .eq('character_id', characterId).single()
    if (wallet) {
      const updates: Record<string, number> = { libras: wallet.libras + 150 }
      if (newStreak > 0 && newStreak % 7 === 0) {
        updates.summon_tickets = wallet.summon_tickets + 1
      }
      await supabase.from('character_wallet').update(updates as never).eq('character_id', characterId)
    }

    // 30% material drop
    if (Math.random() < 0.3) {
      const { data: material } = await supabase
        .from('items').select('id').eq('item_type', 'material').eq('rarity', 'comum').limit(5)
      if (material && material.length > 0) {
        const item = material[Math.floor(Math.random() * material.length)]
        const { data: inv } = await supabase
          .from('inventory').select('id, quantity')
          .eq('character_id', characterId).eq('item_id', item.id).maybeSingle()
        if (inv) {
          await supabase.from('inventory').update({ quantity: inv.quantity + 1 }).eq('id', inv.id)
        } else {
          await supabase.from('inventory').insert({ character_id: characterId, item_id: item.id, quantity: 1 })
        }
      }
    }

    const { completeTask } = await import('./daily')
    await completeTask(characterId, 'win_pvp').catch(() => {})

    const { checkAchievements } = await import('./achievements')
    await checkAchievements(characterId, 'daily_challenge_streak', { streakDays: newStreak }).catch(() => {})

    const streakMsg = newStreak % 7 === 0 ? ` Streak ${newStreak}! +1 Ticket de Summon.` : ''
    await createNotification({
      characterId,
      type: 'general',
      title: 'Desafio Diário — Vitória',
      body: `+150 Libras.${streakMsg} Streak: ${newStreak}.`,
      actionUrl: '/home',
    })
  } else {
    await createNotification({
      characterId,
      type: 'general',
      title: 'Desafio Diário — Derrota',
      body: 'Sem recompensa. Streak resetado. Tente novamente amanhã.',
      actionUrl: '/home',
    })
  }
}

export async function getDailyChallenge(characterId: string): Promise<DailyChallengeRecord | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_challenges').select('*')
    .eq('character_id', characterId).eq('challenge_date', today).maybeSingle()
  return data ? mapRecord(data) : null
}

function mapRecord(r: Record<string, unknown>): DailyChallengeRecord {
  return {
    id: r.id as string,
    characterId: r.character_id as string,
    challengeDate: r.challenge_date as string,
    npcSnapshot: r.npc_snapshot as unknown as NpcSnapshot,
    combatSessionId: r.combat_session_id as string | null,
    completed: r.completed as boolean,
    won: r.won as boolean | null,
    rewardClaimed: r.reward_claimed as boolean,
    currentStreak: r.current_streak as number,
  }
}
