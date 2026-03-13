# GDD — Arkandia (Índice)
> Este arquivo é o índice do game design de Arkandia.
> Todo o conteúdo de design está distribuído nos documentos especializados abaixo.
> Para implementação, sempre consulte o GDD específico da feature em desenvolvimento.

## Documentos de Design

| Documento | Conteúdo |
|---|---|
| `GDD_Mundo.md` | Mundo, lore, cosmologia, arquétipos, cronologia, nações, territórios, facções, figuras lendárias, Imperadores, Conselho dos Anciões, Armas Ancestrais, Monólitos, Expedição Régia |
| `GDD_Personagem.md` | Raças, classes, atributos, progressão, ressonância, skills, building, maestrias, moedas, crafting, ficha |
| `GDD_Sistemas.md` | Combate PvP/PvE, guerra de territórios, expedições, economia, progressão diária, engajamento e retenção |
| `GDD_Narrativa.md` | Voz do mundo, Jornal do Mundo (Gazeta do Horizonte), Diário de Bordo, contextos de IA, conduta da IA, painel GM narrativo, glossário canônico, diretrizes de estilo |
| `GDD_Sociedades.md` | Hierarquia, criação, dissolução e regras de Sociedades |

## Identidade do Projeto

- **Nome:** Arkandia
- **Gênero:** RPG híbrido com motor duplo
- **GM:** Solo (nakkyz)
- **Plataformas:** Site web Next.js (motor mecânico) + Habbo Hotel (palco social, sem integração API)
- **1 conta = 1 personagem** — a conta É o personagem, sem alts

## Stack Técnica

- Frontend: Next.js 14 (App Router)
- Backend: Next.js API Routes + Supabase
- Banco: PostgreSQL via Supabase
- Realtime: Supabase Realtime
- Auth: Supabase Auth
- IA Narrativa: Anthropic API (Claude Sonnet)
- Pagamentos: PIX (gateway a definir)
- Deploy: Vercel

## Progressão do Personagem (resumo)
Criação (Nível 1)     → Escolha de Raça + Classe
Nível 5               → Ressonância desperta (evento narrativo — não é escolha)
Nível 10              → Jogo completo desbloqueado (Sociedades, PvP, territórios)
Pós-8 skills de Classe → Maestrias desbloqueadas

## Moedas

| Moeda | Uso | Transferível |
|---|---|---|
| Libra | Comércio e economia geral | Sim |
| Essência | Evolução do personagem (skills, ressonância, maestrias) | Não |
| Gema | Premium — cash shop via PIX | Não |

## Design System

- Paleta: crimson escuro sobre preto profundo — dourado reservado para momentos épicos
- Fonte: Intelo (local, todos os pesos) — única família, papel definido por weight e letter-spacing
- Componentes: ArkCard, ArkButton, ArkBadge, ArkStatBar, ArkDivider, ArkTooltip, ArkModal, ArkIcons
- Superfícies: glassmorphism (backdrop-filter blur) como padrão
- Regra do dourado: SOMENTE nome do personagem, arquétipo, itens lendários, level máximo

## Princípios de Arquitetura

1. Tudo é um evento — toda ação relevante gera registro na tabela `events`
2. Lógica de jogo em `/lib/game/` — nunca inline em componentes ou API routes
3. Lógica narrativa em `/lib/narrative/` — separada da lógica de jogo
4. Estado explícito — todo modelo tem campo `status` com transições rastreáveis
5. Produção passiva on-demand — calculada no momento da coleta via timestamp, nunca em background job
6. GM tem override em tudo — Server Actions GM fazem `assertGM()` antes de qualquer operação
7. TypeScript estrito — zero `any`, interfaces definidas em `/types/index.ts`
8. Migrations sequenciais — nunca alterar migrations anteriores, sempre criar nova
9. Valores numéricos de balanceamento nunca hardcoded — sempre em seed SQL

## Convenção de prompts

Todo prompt novo deve começar referenciando os arquivos relevantes:
`@CONTEXT.md @GDD.md` para contexto geral
`@GDD_Personagem.md` para features de personagem
`@GDD_Sistemas.md` para features de sistemas
`@GDD_Narrativa.md` para features narrativas e IA
