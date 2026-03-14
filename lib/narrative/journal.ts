import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Busca os eventos públicos das últimas 24h para o feed do jornal.
 */
async function getDailyEventsFeed() {
  const supabase = await createClient()
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)

  const { data } = await supabase
    .from('events')
    .select('type, narrative_text, created_at')
    .eq('is_public', true)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  return data ?? []
}

/**
 * Busca a edição publicada mais recente para continuidade narrativa.
 */
async function getLastPublishedEdition() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('journal_editions')
    .select('sections, edition_date')
    .eq('status', 'published')
    .order('edition_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * Gera o system prompt da Gazeta do Horizonte.
 * Referência: GDD_Narrativa §3
 */
function buildJournalSystemPrompt(): string {
  return `Você é Mara Voss, editora-chefe da Gazeta do Horizonte — o jornal \
do mundo de Arkandia. Ex-agente da Expedição Régia, desertora, jornalista \
por necessidade e instinto. Baseada em Vallaeon, com fontes em todas as \
macrorregiões. Tem opiniões fortes sobre o Conselho dos Anciões que expressa \
de forma oblíqua — nunca direta o suficiente para ser silenciada.

TOM: Direto, levemente irreverente, nunca sensacionalista. Desconfia do poder \
institucional mas não é panfleto revolucionário. Separa fato de rumor \
explicitamente com "Confirmado:" vs "Dizem que:". Usa o presente para tudo. \
NUNCA neutro — sempre há um ponto de vista velado.

REGRAS DE VOZ:
- Frases como "Dizem que", "Foi visto", "Correm rumores" para eventos não confirmados
- Ironia leve quando o assunto envolve os poderosos
- O que não é dito importa tanto quanto o que é
- Natural, não poético. Leitura fácil e envolvente
- Máximo 30 linhas por edição completa

MUNDO: Arkandia, continente de Ellia. Ano 432. A Guerra dos Monólitos está \
começando. O Conselho dos Anciões perde autoridade. Os Quatro Imperadores \
se movimentam. A Expedição Régia opera em Vallaeon (Bastilha Velada).

RESTRIÇÕES:
- Nunca inventar que um jogador fez algo que não fez
- Nunca declarar território mudou de mãos sem evento real
- Nunca revelar lore secreto dos Monólitos de Sentença ou A Voz que Não Existe
- Nunca referenciar obras externas (outros jogos, filmes, séries)
- Eventos NPC inventados devem ser plausíveis e nunca afetar jogadores diretamente

FORMATO DE RESPOSTA: JSON válido com esta estrutura exata:
{
  "manchete": "texto da manchete",
  "secoes": [
    { "tipo": "manchete", "conteudo": "..." },
    { "tipo": "olhos_viram", "conteudo": "..." },
    { "tipo": "rumores", "conteudo": "..." },
    { "tipo": "mesa_editora", "conteudo": "..." }
  ]
}

Inclua entre 3 e 5 seções. "manchete" é obrigatória. \
As demais escolha conforme relevância do dia.`
}

/**
 * Gera uma nova edição do jornal via Claude API.
 * Referência: GDD_Narrativa §3
 */
export async function generateDailyEdition(): Promise<{
  success: boolean
  editionId?: string
  error?: string
}> {
  try {
    const [events, lastEdition] = await Promise.all([
      getDailyEventsFeed(),
      getLastPublishedEdition(),
    ])

    const eventsText = events.length > 0
      ? events
          .map((e) => `- ${e.narrative_text ?? e.type} (${new Date(e.created_at).toLocaleString('pt-BR')})`)
          .join('\n')
      : 'Nenhum evento registrado nas últimas 24h.'

    const lastEditionText = lastEdition
      ? `Edição anterior (${lastEdition.edition_date}): ${JSON.stringify(lastEdition.sections).slice(0, 300)}...`
      : 'Esta é a primeira edição do jornal.'

    const userPrompt = `Gere a edição de hoje da Gazeta do Horizonte.

EVENTOS DO DIA (ações reais dos jogadores):
${eventsText}

CONTEXTO DA EDIÇÃO ANTERIOR:
${lastEditionText}

Crie uma edição coerente com os eventos acima. Se houver poucos eventos \
reais, complemente com movimentações NPC plausíveis no mundo (facções, \
rumores políticos, fenômenos mágicos menores). Mantenha continuidade \
narrativa com a edição anterior quando relevante.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: buildJournalSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'Resposta da IA sem conteúdo de texto.' }
    }

    // Parse JSON da resposta
    let parsed: { manchete: string; secoes: Array<{ tipo: string; conteudo: string }> }
    try {
      const clean = textContent.text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return { success: false, error: 'Resposta da IA não é JSON válido.' }
    }

    // Salva no banco como rascunho
    const supabase = await createClient()
    const { data: edition, error } = await supabase
      .from('journal_editions')
      .insert({
        sections: parsed.secoes,
        status: 'draft',
        generated_by: 'ai',
      })
      .select('id')
      .single()

    if (error || !edition) {
      return { success: false, error: 'Erro ao salvar edição.' }
    }

    return { success: true, editionId: edition.id }
  } catch (err) {
    console.error('[journal] generateDailyEdition error:', err)
    return { success: false, error: 'Erro interno na geração do jornal.' }
  }
}

/**
 * Publica uma edição (torna visível para todos os jogadores).
 */
export async function publishEdition(editionId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('journal_editions')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', editionId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Retorna a edição publicada mais recente.
 */
export async function getLatestPublishedEdition() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('journal_editions')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * Retorna o arquivo de edições publicadas.
 */
export async function getPublishedEditions(limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('journal_editions')
    .select('id, edition_date, sections, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
