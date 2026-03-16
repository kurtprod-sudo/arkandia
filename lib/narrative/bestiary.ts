// ---------------------------------------------------------------------------
// Geração de Lore de NPC — Fase 31
// Referência: GDD_Sistemas §6.12
// ---------------------------------------------------------------------------

import { createClient } from '@/lib/supabase/server'

export async function generateNpcLore(
  npcTypeId: string,
  discovererId: string
): Promise<{ success: boolean; loreText?: string; error?: string }> {
  const supabase = await createClient()

  // Check if already exists
  const { data: existing } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('npc_lore').select('lore_text').eq('npc_type_id', npcTypeId).single()
  if (existing) return { success: true, loreText: existing.lore_text as string }

  // Get NPC info
  const { data: npc } = await supabase
    .from('npc_types')
    .select('name, narrative_text, tier, hunting_zones(name, location)')
    .eq('id', npcTypeId)
    .single()
  if (!npc) return { success: false, error: 'NPC não encontrado.' }

  const zoneName = ((npc.hunting_zones as Record<string, unknown>)?.name as string) ?? 'Desconhecida'
  const zoneLocation = ((npc.hunting_zones as Record<string, unknown>)?.location as string) ?? ''

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { success: false, error: 'API narrativa não configurada.' }

  const prompt = `Você é o narrador do mundo de Ellia — um mundo-cicatriz onde o Éter permeia toda existência.

Escreva o registro do bestiário para a criatura "${npc.name}" que habita em ${zoneName} (${zoneLocation}).

Contexto da criatura: ${npc.narrative_text ?? 'Uma criatura misteriosa.'}
Classificação: ${npc.tier}

O registro deve:
- Ter 2-3 parágrafos em terceira pessoa
- Tom: épico, narrativo, carregado de atmosfera
- Descrever origem, comportamento e o que torna esta criatura parte de Ellia
- NÃO mencionar mecânicas de jogo (HP, dano, XP)
- Terminar com uma frase impactante

Escreva apenas o registro, sem título ou prefácio.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const loreText = (data.content?.[0]?.text as string)?.trim() ?? ''
    if (!loreText) return { success: false, error: 'Erro ao gerar lore.' }

    // Atomic upsert — DO NOTHING if someone else generated it first
    await (supabase as unknown as { from: (t: string) => { upsert: (d: Record<string, unknown>, o: Record<string, string | boolean>) => Promise<unknown> } })
      .from('npc_lore').upsert({
        npc_type_id: npcTypeId,
        lore_text: loreText,
        first_discoverer_id: discovererId,
      }, { onConflict: 'npc_type_id', ignoreDuplicates: true })

    return { success: true, loreText }
  } catch (err) {
    console.error('[generateNpcLore] error:', err)
    return { success: false, error: 'Serviço narrativo indisponível.' }
  }
}

export async function getNpcLore(
  npcTypeId: string
): Promise<{ loreText: string; firstDiscovererName: string | null } | null> {
  const supabase = await createClient()

  const { data } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } } } })
    .from('npc_lore').select('lore_text, first_discoverer_id, characters(name)').eq('npc_type_id', npcTypeId).single()

  if (!data) return null

  return {
    loreText: data.lore_text as string,
    firstDiscovererName: ((data.characters as Record<string, unknown>)?.name as string) ?? null,
  }
}
