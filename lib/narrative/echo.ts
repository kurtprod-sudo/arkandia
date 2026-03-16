// ---------------------------------------------------------------------------
// Eco do Arquétipo — Geração narrativa via API
// Referência: GDD_Sistemas §5.1 Task 7, GDD_Narrativa §5
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'
import { createEvent } from '@/lib/game/events'

const ARCHETYPE_CONTEXTS: Record<string, string> = {
  ordem:   'O Arquétipo da Ordem estrutura e sustenta. Seus ecos falam de lei, de ciclos fixos, de prisões e proteções simultaneamente.',
  caos:    'O Arquétipo do Caos não reconhece limites. Seus ecos falam de mutação, de possibilidade infinita, de criação e destruição sem medida.',
  tempo:   'O Arquétipo do Tempo pulsa. Seus ecos falam de paciência, de presciência, de ecos de eras passadas e sombras de futuros não nascidos.',
  espaco:  'O Arquétipo do Espaço separa e conecta. Seus ecos falam de distância, de presença simultânea, de portas entre o que existe e o que poderia existir.',
  materia: 'O Arquétipo da Matéria é peso e substância. Seus ecos falam de construção, de permanência, de coisas que duram além de quem as criou.',
  vida:    'O Arquétipo da Vida cresce e transforma. Seus ecos falam de ciclos de nascimento, de venenos e remédios que são a mesma coisa.',
  morte:   'O Arquétipo da Morte é fim e passagem. Seus ecos falam de espectros, de ciclos completos, de o que resta depois que tudo mais vai embora.',
  vontade: 'O Arquétipo da Vontade quebra limites. Seus ecos falam de resistência absoluta, de a última coisa que fica quando tudo mais foi tirado.',
  sonho:   'O Arquétipo do Sonho cria e ilude. Seus ecos falam de duplicatas, de percepção, de o que é real quando a realidade é maleável.',
  guerra:  'O Arquétipo da Guerra forja e destrói. Seus ecos falam de técnica, de conflito como catalisador, de o que o combate revela sobre quem luta.',
  vinculo: 'O Arquétipo do Vínculo conecta. Seus ecos falam de pactos, de o que é transferido entre seres, de laços que definem identidade.',
  ruina:   'O Arquétipo da Ruína anula e corrói. Seus ecos falam de fins inevitáveis, de o que sobrevive à destruição, de a beleza no que está se desfazendo.',
}

export async function getDailyEcho(
  characterId: string,
  userId: string
): Promise<{
  success: boolean; error?: string
  echo?: { id: string; content: string; archetype: string; essenciaReward: number; claimed: boolean; echoDate: string }
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: character } = await supabase
    .from('characters')
    .select('id, name, is_resonance_unlocked, resonance_archetype, resonance_level')
    .eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }
  if (!character.is_resonance_unlocked || !character.resonance_archetype) {
    return { success: false, error: 'Ressonância ainda não desperta. Disponível a partir do nível 5.' }
  }

  const { data: existing } = await supabase
    .from('archetype_echoes')
    .select('*').eq('character_id', characterId).eq('echo_date', today).maybeSingle()

  if (existing) {
    return { success: true, echo: { id: existing.id, content: existing.content, archetype: existing.archetype, essenciaReward: existing.essencia_reward, claimed: !!existing.claimed, echoDate: existing.echo_date } }
  }

  const archetype = character.resonance_archetype as string
  const ctx = ARCHETYPE_CONTEXTS[archetype] ?? 'Um Arquétipo misterioso pulsa em você.'

  const prompt = `Você é a voz do Arquétipo da ${archetype.charAt(0).toUpperCase() + archetype.slice(1)} em Ellia — um mundo onde o Éter permeia toda existência.

Contexto do Arquétipo: ${ctx}

Gere um Eco do Arquétipo para ${character.name as string}, nível de Ressonância ${character.resonance_level ?? 1}.

O Eco deve ser:
- Um fragmento narrativo curto (3 a 5 parágrafos)
- Escrito em segunda pessoa, como se o Arquétipo falasse diretamente ao personagem
- Atmosférico, poético e denso — sem mecânicas de jogo
- Único: inclua uma imagem ou metáfora que pareça pessoal
- Tom: misterioso, ancestral, íntimo
- Finaliza com uma frase curta que ressoa como ensinamento

Escreva apenas o Eco, sem título, sem prefácio.`

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return { success: false, error: 'API narrativa não configurada.' }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const content = data.content?.[0]?.text?.trim() ?? ''
    if (!content) return { success: false, error: 'Erro ao gerar Eco.' }

    const { data: echo } = await supabase
      .from('archetype_echoes')
      .insert({ character_id: characterId, echo_date: today, archetype, content, essencia_reward: 5 })
      .select().single()

    if (!echo) return { success: false, error: 'Erro ao salvar Eco.' }

    return { success: true, echo: { id: echo.id, content: echo.content, archetype: echo.archetype, essenciaReward: echo.essencia_reward, claimed: !!echo.claimed, echoDate: echo.echo_date } }
  } catch (err) {
    console.error('[getDailyEcho] API error:', err)
    return { success: false, error: 'Serviço narrativo indisponível.' }
  }
}

export async function claimEchoReward(
  characterId: string, userId: string, echoId: string
): Promise<{ success: boolean; error?: string; essenciaGranted?: number }> {
  const supabase = await createClient()

  const { data: character } = await supabase
    .from('characters').select('id').eq('id', characterId).eq('user_id', userId).single()
  if (!character) return { success: false, error: 'Personagem não encontrado.' }

  const { data: echo } = await supabase
    .from('archetype_echoes').select('*').eq('id', echoId).eq('character_id', characterId).single()
  if (!echo) return { success: false, error: 'Eco não encontrado.' }
  if (echo.claimed) return { success: false, error: 'Recompensa já reivindicada.' }

  const { data: wallet } = await supabase
    .from('character_wallet').select('essencia').eq('character_id', characterId).single()
  if (wallet) {
    await supabase.from('character_wallet')
      .update({ essencia: wallet.essencia + echo.essencia_reward })
      .eq('character_id', characterId)
  }

  await supabase.from('archetype_echoes')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', echoId)

  await createEvent(supabase, {
    type: 'daily_task_completed',
    actorId: characterId,
    metadata: { task_type: 'eco_arquetipo', archetype: echo.archetype },
    isPublic: false,
    narrativeText: `Eco do Arquétipo recebido. +${echo.essencia_reward} Essências.`,
  })

  return { success: true, essenciaGranted: echo.essencia_reward }
}
