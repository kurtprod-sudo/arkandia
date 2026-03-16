// ---------------------------------------------------------------------------
// Desafio Diário de Combate — Fase 27
// Referência: GDD_Sistemas §6
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createNotification } from './notifications'
import { calcSkillDamage, calcDodgeChance } from './attributes'

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

  // Check if already exists today
  const { data: existing } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('character_id', characterId)
    .eq('challenge_date', today)
    .maybeSingle()

  if (existing) {
    return { success: true, challenge: mapRecord(existing) }
  }

  // Get player attributes
  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('ataque, magia, defesa, vitalidade, velocidade, precisao, tenacidade, capitania, eter_max')
    .eq('character_id', characterId)
    .single()
  if (!attrs) return { success: false, error: 'Atributos não encontrados.' }

  // Generate NPC at 80% of player stats
  const npcAttrs: Record<string, number> = {}
  for (const [key, val] of Object.entries(attrs)) {
    npcAttrs[key] = Math.max(1, Math.floor((val as number) * 0.8))
  }
  npcAttrs.hp_max = 80 + npcAttrs.vitalidade * 5
  npcAttrs.hp_atual = npcAttrs.hp_max
  npcAttrs.eter_atual = npcAttrs.eter_max

  // Get yesterday's streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const { data: yesterdayChallenge } = await supabase
    .from('daily_challenges')
    .select('current_streak, won')
    .eq('character_id', characterId)
    .eq('challenge_date', yesterday)
    .maybeSingle()

  const prevStreak = (yesterdayChallenge?.won && yesterdayChallenge?.current_streak) ?? 0

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
    .select()
    .single()

  if (!created) return { success: false, error: 'Erro ao criar desafio.' }

  return { success: true, challenge: mapRecord(created) }
}

/**
 * Simulates a simplified combat vs the NPC snapshot.
 * Returns win/loss based on attribute comparison + randomness.
 * Uses the same calcSkillDamage engine as hunting.
 */
export async function acceptDailyChallenge(
  challengeId: string,
  userId: string
): Promise<{ success: boolean; error?: string; won?: boolean }> {
  const supabase = await createClient()

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('id', challengeId)
    .single()
  if (!challenge) return { success: false, error: 'Desafio não encontrado.' }
  if (challenge.completed) return { success: false, error: 'Desafio já completado.' }

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', challenge.character_id).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Acesso negado.' }

  const { data: playerAttrs } = await supabase
    .from('character_attributes')
    .select('ataque, magia, defesa, vitalidade, velocidade, precisao, eter_max')
    .eq('character_id', character.id)
    .single()
  if (!playerAttrs) return { success: false, error: 'Atributos não encontrados.' }

  const npc = (challenge.npc_snapshot as unknown as NpcSnapshot).attributes
  const playerHp = 80 + playerAttrs.vitalidade * 5
  const npcHp = npc.hp_max ?? 100

  // Simulate 15 rounds of basic attack exchange
  let pHp = playerHp
  let nHp = npcHp

  for (let turn = 0; turn < 15 && pHp > 0 && nHp > 0; turn++) {
    // Player attacks NPC
    const pDodge = calcDodgeChance(npc.velocidade ?? 10)
    if (Math.random() * 100 > pDodge) {
      const pDmg = calcSkillDamage({
        baseDamage: 8, ataqueFactor: 0.6,
        attackerAtaque: playerAttrs.ataque, attackerMagia: playerAttrs.magia,
        targetDefesa: npc.defesa ?? 5,
      })
      nHp -= Math.max(1, Math.floor(pDmg.afterDefense))
    }

    if (nHp <= 0) break

    // NPC attacks player
    const nDodge = calcDodgeChance(playerAttrs.velocidade)
    if (Math.random() * 100 > nDodge) {
      const nDmg = calcSkillDamage({
        baseDamage: 8, ataqueFactor: 0.6,
        attackerAtaque: npc.ataque ?? 10, attackerMagia: npc.magia ?? 10,
        targetDefesa: playerAttrs.defesa,
      })
      pHp -= Math.max(1, Math.floor(nDmg.afterDefense))
    }
  }

  const won = nHp <= 0 || pHp > nHp

  // Resolve
  await resolveDailyChallenge(challenge.id, challenge.character_id, won, supabase)

  return { success: true, won }
}

async function resolveDailyChallenge(
  challengeId: string,
  characterId: string,
  won: boolean,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  // Get yesterday's streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const { data: yesterdayChallenge } = await supabase
    .from('daily_challenges')
    .select('current_streak, won')
    .eq('character_id', characterId)
    .eq('challenge_date', yesterday)
    .maybeSingle()

  let newStreak = 0
  if (won) {
    newStreak = (yesterdayChallenge?.won ? (yesterdayChallenge.current_streak ?? 0) : 0) + 1
  }

  await supabase
    .from('daily_challenges')
    .update({ completed: true, won, current_streak: newStreak, reward_claimed: won })
    .eq('id', challengeId)

  if (won) {
    // 150 Libras reward
    const { data: wallet } = await supabase
      .from('character_wallet').select('libras, summon_tickets').eq('character_id', characterId).single()
    if (wallet) {
      const updates: Record<string, number> = { libras: wallet.libras + 150 }

      // Streak bonus: every 7 wins → +1 Ticket
      if (newStreak > 0 && newStreak % 7 === 0) {
        updates.summon_tickets = wallet.summon_tickets + 1
      }

      await supabase.from('character_wallet').update(updates as never).eq('character_id', characterId)
    }

    // 30% material drop
    if (Math.random() < 0.3) {
      const { data: material } = await supabase
        .from('items')
        .select('id')
        .eq('item_type', 'material')
        .eq('rarity', 'comum')
        .limit(5)
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

    // Complete daily task
    const { completeTask } = await import('./daily')
    await completeTask(characterId, 'win_pvp').catch(() => {})

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
    .from('daily_challenges')
    .select('*')
    .eq('character_id', characterId)
    .eq('challenge_date', today)
    .maybeSingle()
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
