# GDD — Arkandia

## Identidade
- Nome: Arkandia
- Gênero: RPG híbrido com motor duplo
- Lore: Fantasia transmídia — referências de One Piece, Fate, mitologias e história
- Plataformas: Site web (motor) + Habbo Hotel (palco social, sem integração API)
- GM: Solo (nakkyz)

## Estrutura de Conta
- 1 conta = 1 personagem. A conta É o personagem. Sem alts.

## Motor Duplo
- Site: onde tudo acontece mecanicamente (combate, economia, progressão, crafting, guerras)
- Habbo: palco social para roleplay, diplomacia, encontros e eventos ao vivo
- Ponte: o que acontece no Habbo inspira ações no site. O que acontece no site fornece conteúdo para o Habbo.

## Moedas
- Libra: econômica, circula entre jogadores, múltiplas fontes
- Essência: progressão pessoal, intransferível
- Premium: cash shop via PIX

## Progressão em 4 Passos
1. Nível 1 — Profissão: define atributos iniciais e vantagens em sistemas específicos
2. Nível 5 — Ressonância: escolha 1 dos 12 Arquétipos (passivas e multiplicadores)
3. Nível 10 — Classe: define Skills Ativas
4. Macro — Sociedade: acesso a Expedições e Guerras de Território

## Os 12 Arquétipos
Ordem, Caos, Tempo, Espaço, Matéria, Vida, Morte, Vontade, Sonho, Guerra, Vínculo, Ruína.
Cada um concede passivas e multiplicadores únicos. Exemplo: Ruína concede Penetração de Defesa passiva. Vontade aumenta Tenacidade. Tempo aumenta Velocidade.

## Core Ruleset

### Atributos Fundamentais
- Ataque: multiplicador primário para dano físico
- Magia: multiplicador primário para habilidades místicas, curas e escudos
- Éter: recurso consumível para ativar habilidades (equivalente a MP)
- Defesa: única mitigação de dano (física, mágica e elemental)
- Vitalidade: determina HP máximo
- Velocidade: define iniciativa de turno e chance passiva de Esquiva
- Precisão: aumenta chance de aplicar Efeitos Negativos
- Tenacidade: aumenta chance de resistir a Efeitos Negativos
- Capitania: define limite numérico de tropas
- Moral: modificador volátil que afeta rendimento de tropas

### Sistema de Combate
- Turnos, sem grid espacial
- Range States: Curto, Médio, Longo
- Skills com fórmulas abertas: Dano Base + (Ataque * fator) + (Magia * fator)
- Suporte a True Damage e Penetração de Defesa
- Cooldowns por turno e duração de efeitos por turno
- Skills híbridas possíveis

### Sistema de Guerra
- Poder Militar = atributos do Herói + quantidade/nível das tropas
- Triângulo: Infantaria > Cavalaria > Arquearia > Infantaria
- Cerco: multiplicador exclusivo contra Estruturas
- Fases: Declaração → Preparação → Entrada de Aliados → Batalha em Turnos

### Ficha Pública vs Privada
- Público: Nome, Level, Sociedade, Título, Status de Vida
- Privado: atributos exatos, HP, Éter, Skills, tropas (revelados apenas em batalha)

## Sistemas Planejados
- Personagem: ficha, atributos, classes, profissões, árvore de skills, reputação
- Economia: mercado player-driven, crafting, produção passiva, impostos, cash shop
- Mundo: territórios, facções NPC, relacionamento jogador ↔ facção, mapa político
- Combate: PvP em turnos com animações, sistema de guerra com fases
- Progressão: tasks, farm solo, expedições idle, dungeons em grupo
- Narrativa: ações diárias, jornal via IA, histórico de personagem
- Monetização: cash shop, integração PIX

## Princípios de Arquitetura
1. Tudo é um evento — toda ação gera registro na tabela events
2. Sistemas modulares — cada sistema novo conecta ao core via interfaces
3. Estado explícito — tudo tem campo status com transições rastreáveis
4. Produção passiva on-demand — calcula no momento da coleta via timestamp
5. GM tem override em tudo — endpoints de admin em todo sistema

## Design System
- Paleta: crimson escuro sobre preto profundo — branco/cinza para interface, dourado reservado para momentos épicos
- Fonte: Intelo (local, todos os pesos) — única família, papel definido por weight e letter-spacing
- Componentes: ArkCard, ArkButton, ArkBadge, ArkStatBar, ArkDivider, ArkTooltip, ArkModal, ArkIcons
- Superfícies: glassmorphism (backdrop-filter blur) como padrão — cards translúcidos sobre background
- Regra do dourado: SOMENTE nome do personagem, arquétipo, itens lendários, level máximo

## Stack
- Frontend: Next.js 14 (App Router)
- Backend: Next.js API Routes + Supabase
- Banco: PostgreSQL via Supabase
- Realtime: Supabase Realtime
- Auth: Supabase Auth
- Pagamentos: gateway PIX (a definir)
- IA Narrativa: Anthropic API (Claude)
- Deploy: Vercel

## Fases de Desenvolvimento
- Fase 1 ✅ Concluída: auth, criação de personagem, ficha, painel GM, design system
- Fase 2: territórios, facções NPC, relacionamento jogador ↔ facção, mapa político
- Fase 3: inventário, crafting, mercado, produção passiva
- Fase 4: PvP em turnos, sistema de guerra
- Fase 5: classes, profissões, skills, expedições, dungeons
- Fase 6: ações narrativas, jornal via IA, histórico de personagem
- Fase 7: cash shop, integração PIX
