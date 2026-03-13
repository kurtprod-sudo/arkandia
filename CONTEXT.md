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

## Design System

### Tipografia
| Variável CSS       | Fonte   | Peso    | Uso                                        |
|--------------------|---------|---------|--------------------------------------------|
| `--font-display`   | Intelo  | 700–800 | Títulos, nome do personagem, headers       |
| `--font-body`      | Intelo  | 400     | Texto corrido, descrições, lore            |
| `--font-data`      | Intelo  | 600     | Labels, stats, números, UI, siglas         |

Todas apontam para `--font-intelo` (fonte local em `public/fonts/`).
Classes Tailwind: `font-display`, `font-body`, `font-data` — mantidas para compatibilidade.

### Paleta de Cores
| Variável             | Hex       | Uso                              |
|----------------------|-----------|----------------------------------|
| `--ark-red`          | #6e160f   | Cor primária, bordas, moldura    |
| `--ark-red-glow`     | #c42a1e   | Glow, hover, barra HP            |
| `--ark-gold`         | #d3a539   | Títulos, dourado, destaque       |
| `--ark-gold-bright`  | #f0c84a   | Shimmer, hover gold              |
| `--ark-bg`           | #0a0508   | Background base                  |
| `--ark-bg-raised`    | #110a0e   | Cards, superfícies elevadas      |
| `--text-primary`     | #ffffff            | Texto principal                       |
| `--text-secondary`   | rgba(255,255,255,0.65) | Texto secundário                 |
| `--text-label`       | rgba(255,255,255,0.4)  | Labels, siglas                   |
| `--text-ghost`       | rgba(255,255,255,0.2)  | Separadores, fantasmas           |
| `--ark-surface`      | rgba(110,22,15,0.15)   | Cards — glassmorphism base       |
| `--ark-border`       | rgba(196,42,30,0.3)    | Borders padrão — crimson sutil   |
| `--ark-border-bright`| rgba(196,42,30,0.7)    | Borders foco/hover               |
| `--text-gold`        | #D3A539   | Texto dourado                    |
| `--ark-white`        | #F5EDD8   | Texto hero, headlines de landing     |
| `--ark-red-vivid`    | #e03030   | Glows intensos, hover, impacto       |
| `--ark-amber`        | #e87820   | XP, level up, conquistas             |
| `--ark-amber-bright` | #f5a030   | Hover amber, shimmer de conquista    |

**Regra canônica:** Dourado (`--ark-gold`, `--ark-gold-bright`) aparece SOMENTE em nome do personagem, arquétipo, itens lendários e level máximo. Nunca em borders de card, labels, tabs ou botões comuns.

### Componentes Ark* disponíveis
Toda página nova deve usar esses componentes de `/components/ui/`:
- **ArkCard** — variantes: default, highlighted, legendary
- **ArkButton** — variantes: primary, secondary, ghost, danger
- **ArkStatBar** — variantes: hp, eter, xp, moral
- **ArkDivider**
- **ArkTooltip**
- **ArkModal**
- **ArkPortraitParticles** — partículas animadas ao redor do portrait

### Padrões visuais aprovados
- `ark-section-header` + `ark-section-title` + `ark-section-line` → headers de seção
- `ark-hud` com 3 camadas → Arquétipo / Classe+Status / Metadados finos
- `name-shimmer` → efeito shimmer dourado no nome do personagem
- `portrait-glow` → glow animado na moldura do portrait
- Barras: `bar-hp` (vermelho), `bar-eter` (cinza/branco), `bar-xp` (dourado)
- Atributos: nome em maiúsculo + sigla `(ABR)` em `.ark-attr-abbr`
- `.shimmer-epic` → shimmer dourado/branco para títulos de landing
- `.glow-vivid` → pulse animado em vermelho vívido para elementos de destaque
- `.flash-levelup` → animação de conquista em âmbar
- `.text-hero` → headline branca creme em Intelo bold

### Asset de Moldura
- `/public/assets/frames/portrait-default.png` — 1024×1536px
- Área interior: top 25.1%, left 14.3%, right 14.3%, bottom 9.8%
- Usar com `mix-blend-mode: multiply` removido; fundo preto, PNG sobrepõe

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
