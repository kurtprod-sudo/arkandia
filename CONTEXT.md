# Arkandia — Contexto Técnico

## Visão Geral
RPG híbrido web: **Next.js** como motor de regras + **Habbo Hotel** como palco social (sem integração API).
1 conta = 1 personagem. GM solo com override em tudo.

---

## Status do projeto
Fase 1 concluída em Março 2026.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js Server Actions + API Routes |
| Banco | Supabase (PostgreSQL + Auth + Realtime) |
| Deploy | Vercel |

---

## Estrutura de Pastas

```
/app
  /auth/login          — Página de login
  /auth/register       — Página de registro
  /auth/actions.ts     — Server Actions: login, register, logout
  /dashboard           — Hub do jogador (pós-login)
  /character           — Ficha privada completa
  /character/[id]      — Ficha pública (campos restritos)
  /character/create    — Fluxo de criação de personagem
  /character/actions.ts — Server Actions: createCharacter, distributeAttribute
  /gm                  — Painel GM (role = 'gm')
  /gm/actions.ts       — Server Actions GM: grant currency, edit attrs, change status

/components
  /ui
    AuthForm.tsx        — Form genérico com useActionState
    ArkCard.tsx         — Card (variantes: default, highlighted, legendary)
    ArkButton.tsx       — Botão (variantes: primary, secondary, ghost, danger)
    ArkBadge.tsx
    ArkStatBar.tsx      — Barra HP/Éter/XP/Moral reutilizável
    ArkDivider.tsx
    ArkTooltip.tsx
    ArkModal.tsx
    ArkIcons.tsx        — Ícones temáticos SVG (atributos, moedas, profissões)
  /character
    CreateCharacterForm.tsx  — Form de criação com preview de atributos
    AttributeDistributor.tsx — UI para distribuir attribute_points
  /gm
    GMCharacterList.tsx  — Lista expansível com controles GM
    GMEventFeed.tsx      — Feed dos últimos 50 eventos

/lib
  /supabase
    client.ts     — createBrowserClient (use em Client Components)
    server.ts     — createServerClient com cookies (use em Server Components/Actions)
    middleware.ts — updateSession + proteção de rotas
  /game
    attributes.ts — buildInitialAttributes, calcHpMax, calcSkillDamage, calcDodgeChance
    xp.ts         — xpToNextLevel, checkLevelUp, canChooseArchetype, canChooseClass
    events.ts     — createEvent, getRecentEvents

/types
  index.ts   — Todos os tipos TypeScript espelhando o schema (zero `any`)

/supabase
  /migrations
    001_initial_schema.sql — Schema completo + RLS + Triggers + Seed
```

---

## Componentes Ark* disponíveis
Toda página nova deve usar esses componentes de `/components/ui/`:
- **ArkCard** — variantes: default, highlighted, legendary
- **ArkButton** — variantes: primary, secondary, ghost, danger
- **ArkBadge**
- **ArkStatBar** — variantes: hp, eter, xp, moral
- **ArkDivider**
- **ArkTooltip**
- **ArkModal**
- **ArkIcons** — ícones temáticos SVG para atributos, moedas e profissões

---

## Design system
- **Paleta:** variáveis CSS em globals.css (vinho, bronze, dourado, cores por atributo)
- **Tipografia:** Cinzel Decorative (títulos), Crimson Pro (textos), Inter (números)
- **Efeitos:** .glow-wine, .glow-bronze, .glow-gold, .shimmer, .pulse-glow, .particle-float

---

## Schema do Banco

### Enums
- `user_role`: player | gm
- `character_status`: active | injured | dead
- `profession_type`: comerciante | militar | clerigo | explorador | artesao | erudito | nobre | mercenario
- `archetype_type`: ordem | caos | tempo | espaco | materia | vida | morte | vontade | sonho | guerra | vinculo | ruina
- `skill_type`: active | passive
- `range_state`: curto | medio | longo | all
- `society_member_role`: leader | officer | member

### Tabelas principais
- **profiles** — extensão de auth.users (username, role)
- **characters** — núcleo do personagem (1 por conta)
- **character_attributes** — atributos separados para facilitar cálculos
- **character_wallet** — libras, essencia, premium_currency
- **professions** — config populada pelo GM
- **archetypes** — 12 arquétipos com passivas em JSONB
- **classes** — classes desbloqueáveis no nível 10
- **skills** — habilidades com fórmulas de dano em JSONB
- **societies** — organizações de jogadores
- **society_members** — membros com role
- **events** — log central de toda ação relevante

### Triggers
- `trg_on_character_created` → cria `character_attributes` e `character_wallet` zerados
- `trg_on_level_up` → distribui `attribute_points` (2/nível, +1 a cada múltiplo de 5)
- `trg_character_attributes_updated_at` / `trg_character_wallet_updated_at` → updated_at automático

---

## Princípios Arquiteturais

1. **Tudo é um evento** — toda ação relevante chama `createEvent()` em `/lib/game/events.ts`
2. **Lógica de jogo em `/lib/game`** — nunca inline em componentes
3. **Estado explícito** — todo modelo tem campo `status` com transições rastreáveis
4. **Produção passiva on-demand** — calcula no momento da coleta via timestamp, nunca em background
5. **GM tem override em tudo** — Server Actions GM fazem `assertGM()` antes de qualquer operação

---

## Convenções de Código

- TypeScript estrito — zero `any`
- Server Actions para mutações (não API Routes para CRUD simples)
- `createClient()` do `@/lib/supabase/server` em Server Components e Actions
- `createClient()` do `@/lib/supabase/client` em Client Components
- Nomes em português para domínio do jogo, inglês para infra técnica

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=          # URL pública do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Chave anon pública
SUPABASE_SERVICE_ROLE_KEY=         # Chave service role (apenas server-side)
```

---

## Como rodar o Supabase

1. Crie um projeto em supabase.com
2. Copie `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para `.env.local`
3. Execute `supabase/migrations/001_initial_schema.sql` no SQL Editor do Dashboard
4. `npm run dev`

---

## Progressão do Personagem

| Marco | Nível | Desbloqueio |
|---|---|---|
| Profissão | 1 | Definida na criação — atributos base e bônus |
| Arquétipo | 5 | 1 dos 12 — passivas e multiplicadores |
| Classe | 10 | Skills ativas |
| Sociedade | Qualquer | Fundação ou entrada — Expedições e Guerras |

---

## Convenção de prompts futuros
Todo prompt novo deve começar com `@CONTEXT.md @GDD.md` e referenciar os componentes Ark* para qualquer página nova criada.
