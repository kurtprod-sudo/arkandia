# CONTENT REGISTRY — Arkandia
> Fonte de verdade para todo conteúdo seedado no banco.
> Atualizar sempre que executar um seed SQL novo.
> Última atualização: Março 2026 — Seeds A/B/C executados (266 equipamentos + 12 materiais)

---

## COMO USAR

Antes de criar qualquer conteúdo que referencie outros itens (loot_tables, receitas,
maestrias, campanhas), consulte este arquivo para saber o que já existe no banco.
Nunca referenciar item, skill, NPC ou zona que não esteja listado aqui.

---

## MATERIAIS

> Tabela: items (item_type = 'material')
> Seed: supabase/seeds/seed_materiais.sql

### Enhancement (hardcoded em lib/game/equipment.ts — não renomear)

| Nome | Raridade | Uso | base_value |
|---|---|---|---|
| Minério Etéreo | incomum | Enhancement +5 a +8 | 200 |
| Componente Arcano | raro | Enhancement +9 a +12 | 800 |

### Maestrias

| Nome | Raridade | Uso | base_value |
|---|---|---|---|
| Pergaminho de Classe de Prestígio | épico | Qualquer Maestria de Prestígio (universal) | 3.000 |

### Materiais Físicos (progressão por zona)

| Nome | Raridade | Zona primária | base_value |
|---|---|---|---|
| Fragmento de Bronze | comum | Ruínas de Thar-Halum (1–5) | 30 |
| Fragmento de Ferro | comum | Floresta de Eryuell (3–8) | 80 |
| Fragmento de Aço | incomum | Minas de Düren (5–10) + Floresta (3–8) | 250 |
| Fragmento de Prata | raro | Bordas de Urgath (8–15) | 700 |

### Materiais Mágicos

| Nome | Raridade | Zona primária | base_value |
|---|---|---|---|
| Tecido Etéreo | comum | Floresta de Eryuell (3–8) | 50 |
| Seda Arcana | incomum | Floresta de Eryuell (3–8) | 220 |
| Couro Espiritual | incomum | Bordas de Urgath (8–15) | 300 |
| Madeira Etérea | comum | Ruínas de Thar-Halum (1–5) | 60 |

---

## EQUIPAMENTOS

> Tabela: items (item_type = 'equipamento')
> Seeds: seed_armas.sql ✓, seed_armaduras.sql ✓, seed_acessorios.sql ✓

### Regras de inserção (CRÍTICO)
- Tabela items NÃO tem UNIQUE constraint em name
- NUNCA usar ON CONFLICT (name) — gera erro
- Padrão obrigatório: INSERT ... WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = '...')
- Para atualizar existentes: UPDATE items SET ... WHERE name = '...'

### Armas Iniciais por Classe (concedidas na criação do personagem)

| Classe | Arma inicial | Slot | Seed |
|---|---|---|---|
| Espadachim | Espada de Bronze | arma_principal | pendente (seed_item_inicial.sql) |
| Lanceiro | Lança de Bronze | arma_principal | pendente |
| Lutador | Manoplas de Bronze | arma_principal | pendente |
| Destruidor | Martelo de Bronze | arma_principal | pendente |
| Escudeiro | Espada Curta de Bronze | arma_principal | pendente |
| Assassino | Adaga de Bronze | arma_principal | pendente |
| Arqueiro | Arco Curto de Bronze | arma_principal | pendente |
| Atirador | Pistola Etérica de Bronze | arma_principal | pendente |
| Druida | Machado de Bronze | arma_principal | pendente |
| Bardo | Alaúde de Bronze | arma_principal | pendente |
| Mago | Cajado de Bronze | arma_principal | pendente |

---

### Armas (slot: arma_principal) — 132 itens ✓
> Seed: seed_armas.sql — executado

**Estrutura:** 11 classes × 3 variações × 4 materiais (Bronze/Ferro/Aço/Prata)
**Raridades:** Bronze=comum, Ferro=comum, Aço=incomum, Prata=raro
**Levels:** Bronze=1, Ferro=3, Aço=6, Prata=10 (Montante/Glaive/Destruidor +1)

| Classe | Variações | Stats primário |
|---|---|---|
| Espadachim | Espada, Katana, Montante | ataque |
| Lanceiro | Lança, Alabarda, Glaive | ataque (Alabarda: +vel 1) |
| Lutador | Manoplas, Garras, Braçadeiras de Combate | ataque |
| Destruidor | Martelo, Maça, Mangual | ataque |
| Escudeiro | Espada Curta, Machado Curto, Maça Curta | ataque |
| Assassino | Adaga, Kunai, Stiletto | ataque |
| Arqueiro | Arco Curto, Arco Longo, Arco Composto | ataque |
| Atirador | Pistola Etérica, Rifle Etérico, Espingarda Etérica | ataque |
| Druida | Machado, Machadinha Dupla, Machado de Guerra | ataque |
| Mago | Cajado, Varinha, Orbe | magia |
| Bardo | Alaúde, Flauta de Combate, Tambor Etéreo | magia |

Nomes Prata têm identidade cultural (ex: "Espada Prateada de Ogygia", "Cajado Prateado de Serdin").

---

### Armaduras (slot: armadura) — 21 itens ✓
> Seed: seed_armaduras.sql — executado

**Físicas (Bronze/Ferro/Aço/Prata):**
- Armadura de [Material] — DEF puro
- Armadura Reforçada de [Material] — DEF maior, required_level +1
- Gibão de [Material] — DEF menor + VIT

**Mágicas (Tecido Etéreo/Seda Arcana/Couro Espiritual):**
- Manto de [Material] — VIT puro
- Túnica de [Material] — VIT + DEF 1
- Vestes de [Material] — VIT maior, required_level +1

---

### Elmos (slot: elmo) — 21 itens ✓
> Seed: seed_armaduras.sql — executado

**Físicos (Bronze/Ferro/Aço/Prata):**
- Elmo de [Material] — DEF puro
- Capacete de [Material] — DEF + VIT 1
- Morrião de [Material] — DEF ligeiramente maior

**Mágicos (Tecido Etéreo/Seda Arcana/Couro Espiritual):**
- Capuz de [Material] — VIT puro
- Tiara de [Material] — VIT + PRE 1
- Capuz Reforçado de [Material] — VIT maior

---

### Calças (slot: calca) — 14 itens ✓
> Seed: seed_armaduras.sql — executado

**Físicas (Bronze/Ferro/Aço/Prata):**
- Grevas de [Material] — DEF + VEL
- Calças de Combate de [Material] — DEF menor + VEL maior

**Mágicas (Tecido Etéreo/Seda Arcana/Couro Espiritual):**
- Calças de [Material] — DEF 1 + VEL
- Saia de Combate de [Material] — VEL puro

---

### Botas (slot: bota) — 14 itens ✓
> Seed: seed_armaduras.sql — executado

**Físicas (Bronze/Ferro/Aço/Prata):**
- Botas de [Material] — VEL puro
- Botas de Combate de [Material] — VEL menor + PRE

**Mágicas (Tecido Etéreo/Seda Arcana/Couro Espiritual):**
- Sandálias de [Material] — VEL puro
- Botas Etéreas de [Material] — VEL menor + PRE 1

---

### Acessórios (slot: acessorio_1) — 64 itens ✓
> Seed: seed_acessorios.sql — executado
> Nota: slot_type = 'acessorio_1' mas equipável em acessorio_2 também

**Sistema de tiers:** Tier 1 (comum, lv1) → Reforçado (comum, lv4) → Etéreo (incomum, lv7) → Ancestral (raro, lv10)

**Categoria 1 — Anéis de Ataque (16 itens):**
- Anel de Combate [tier] — ATQ
- Anel Arcano [tier] — MAG
- Anel do Caçador [tier] — ATQ + PRE 1
- Anel da Velocidade [tier] — ATQ + VEL 1

**Categoria 2 — Amuletos de Defesa (16 itens):**
- Amuleto de Proteção [tier] — DEF
- Amuleto da Vitalidade [tier] — VIT
- Amuleto da Tenacidade [tier] — TEN
- Amuleto do Escudo [tier] — DEF + VIT 2

**Categoria 3 — Colares de Suporte (16 itens):**
- Colar da Precisão [tier] — PRE
- Colar da Velocidade [tier] — VEL
- Colar do Comandante [tier] — CAP
- Colar Equilibrado [tier] — DEF + VEL

**Categoria 4 — Híbridos (16 itens):**
- Anel do Duelo [tier] — ATQ + DEF
- Amuleto da Força Espiritual [tier] — MAG + VIT
- Anel do Assassino [tier] — ATQ + TEN
- Amuleto do Guardião [tier] — DEF + TEN

---

### Equipamentos legados (migration 025 — já existiam antes dos seeds)

| Nome | Slot | Raridade | Stats | min_level |
|---|---|---|---|---|
| Espada de Ferro | arma_principal | comum | ATQ +5 | 1 |
| Adaga de Osso | arma_principal | comum | ATQ +3, VEL +2 | 1 |
| Cajado de Aprendiz | arma_principal | comum | MAG +6 | 1 |
| Armadura de Couro | armadura | comum | DEF +4 | 1 |
| Elmo de Ferro | elmo | comum | DEF +2, VIT +1 | 1 |
| Botas de Viajante | bota | comum | VEL +2 | 1 |
| Anel de Proteção | acessorio_1 | incomum | DEF +3 | 3 |
| Amuleto de Força | acessorio_1 | incomum | ATQ +4 | 3 |

> Atenção: esses itens têm nomes que podem colidir com os seeds novos.
> "Espada de Ferro" já existia — o seed_armas.sql usa WHERE NOT EXISTS e não duplica.
> "Elmo de Ferro", "Armadura de Couro", "Botas de Viajante" são únicos, sem conflito.

---

## CONSUMÍVEIS E OUTROS

> Pendente — sem conteúdo além dos seeds de migration

---

## SKILLS

> Tabela: skills
> Seed: pendente (aguardando geração por classe)

| Classe | Skills seedadas | Status |
|---|---|---|
| Espadachim | 0/8 | Pendente |
| Lanceiro | 0/8 | Pendente |
| Lutador | 0/8 | Pendente |
| Destruidor | 0/8 | Pendente |
| Escudeiro | 0/8 | Pendente |
| Assassino | 0/8 | Pendente |
| Arqueiro | 0/8 | Pendente |
| Atirador | 0/8 | Pendente |
| Druida | 0/8 | Pendente |
| Mago | 0/8 | Pendente |
| Bardo | 0/8 | Pendente |

---

## MAESTRIAS

> Tabela: maestrias
> Seed: pendente

| Categoria | Seedadas | Status |
|---|---|---|
| Prestígio | 0 | Pendente |
| Ressonância | 0 | Pendente |
| Lendária | 0 | Pendente |

---

## ZONAS DE HUNTING

> Tabela: hunting_zones
> Seed: migration 022

| Nome | Nível | Risco | NPCs seedados |
|---|---|---|---|
| Ruínas de Thar-Halum | 1–5 | baixo | Guardião Esquecido (fraco), Sentinela Antiga (médio) |
| Floresta de Eryuell | 3–8 | médio | Espírito Corrompido (médio) |
| Minas de Düren | 5–10 | médio | Golem de Pedra (forte) |
| Bordas de Urgath | 8–15 | alto | Cultista do Caos (forte) |
| Câmara do Arquétipo Corrompido | 10+ | extremo | Eco do Corrompido (elite) |
| Zona nível 15–25 | 15–25 | alto | Pendente |
| Zona nível 25+ | 25+ | extremo | Pendente |

### Drops atuais por zona (loot_tables dos NPCs existentes)

| Zona | Drops confirmados |
|---|---|
| Ruínas de Thar-Halum | Libras, XP, Essência (15%), Fragmento de Lore* (5%) |
| Floresta de Eryuell | Libras, XP, Essência (25%), Essência Natural* (15%) |
| Minas de Düren | Libras, XP, Essência (30%), Minério Etéreo (25%), Componente Arcano (10%) |
| Bordas de Urgath | Libras, XP, Essência (35%), Componente Arcano (20%), Pergaminho* (2%) |
| Câmara do Arquétipo | Libras, XP, Essência (50%), Componente Arcano (25%), Pergaminho* (5%) |

*Fragmento de Lore, Essência Natural: itens referenciados mas ainda não seedados na tabela items
*Pergaminho: referenciado como "Pergaminho de Classe de Prestígio" — agora seedado ✓

> AÇÃO PENDENTE: criar seed_zonas_novas.sql para:
> 1. Adicionar 2 zonas novas (nível 15–25 e 25+)
> 2. Atualizar loot_tables das 5 zonas existentes para incluir drops de equipamentos
> 3. Referências válidas para loot_tables: qualquer item listado neste registry

---

## NPCs DE HUNTING

> Tabela: npc_types
> Seed: migration 022

| Nome | Zona | Tier | Level | ATQ | MAG | HP | DEF |
|---|---|---|---|---|---|---|---|
| Guardião Esquecido | Ruínas de Thar-Halum | fraco | 2 | 14 | 8 | 90 | 8 |
| Sentinela Antiga | Ruínas de Thar-Halum | médio | 4 | 22 | 12 | 160 | 14 |
| Espírito Corrompido | Floresta de Eryuell | médio | 5 | 18 | 28 | 180 | 12 |
| Golem de Pedra | Minas de Düren | forte | 7 | 32 | 10 | 350 | 30 |
| Cultista do Caos | Bordas de Urgath | forte | 10 | 38 | 32 | 280 | 18 |
| Eco do Corrompido | Câmara do Arquétipo | elite | 12 | 55 | 55 | 600 | 35 |

---

## DUNGEONS

> Tabela: dungeon_types
> Seed: pendente

| Nome | Dificuldade | Min Level | Status |
|---|---|---|---|
| — | — | — | Pendente |

---

## EXPEDIÇÕES

> Tabela: expedition_types
> Seed: migrations 005 + 021 (balance) + 030 (tropas)

| Nome | Subtipo | Risco | Duração |
|---|---|---|---|
| Patrulha dos Arredores | exploração | seguro | 2h |
| Caçada Menor | caça | moderado | 4h |
| Investigação de Ruínas | investigação | moderado | 6h |
| Caçada Perigosa | caça | perigoso | 8h |
| Missão de Reconhecimento | exploração | perigoso | 10h |
| Expedição Extrema | investigação | extremo | 12h |
| Escolta de Comboio | missao_faccao | moderado | 2h |

---

## LOJA NPC (Mercado Volátil)

> Tabela: npc_shop_items
> Seed: migration 028

| Nome | Reward Type | Reward Amount | Preço (Libras) | Raridade |
|---|---|---|---|---|
| Tônico Etéreo | essencia | 10 | 150 | incomum |
| Moeda do Viajante | libras | 200 | 100 | comum |

> AÇÃO NECESSÁRIA: adicionar mais itens após seed de equipamentos

---

## CAMPANHA INICIAL (Expedição Régia)

> Tabela: campaigns + campaign_chapters
> Seed: migration 039

| Capítulo | Título | Texto | Choices | Combate |
|---|---|---|---|---|
| 1 | A Chegada a Vallaeon | PLACEHOLDER | ✓ seedado | ✓ NPC snapshot |
| 2 | A Bastilha Velada | PLACEHOLDER | ✓ seedado | — |
| 3 | Primeira Missão | PLACEHOLDER | ✓ seedado | — |
| 4 | Facções em Conflito | PLACEHOLDER | ✓ seedado | — |
| 5 | O Chamado do Arquétipo | PLACEHOLDER | ✓ seedado | ✓ NPC snapshot |
| 6 | O Peso do Arquétipo | PLACEHOLDER | ✓ seedado | — |
| 7 | Revelações | PLACEHOLDER | ✓ seedado | — |
| 8 | Aliados e Inimigos | PLACEHOLDER | ✓ seedado | — |
| 9 | O Clímax | PLACEHOLDER | — | ✓ NPC snapshot |
| 10 | O Início de Tudo | PLACEHOLDER | — | — |

---

## CAMPANHA LONGA (A Aventura Começa)

> Tabela: campaigns + campaign_stages
> Seed: migration 040

| Capítulo | Nação | Fases Normal | Fases Hard | Textos |
|---|---|---|---|---|
| 1 — Sombras de Valoria | Valoria | 10 seedadas | 10 seedadas | PLACEHOLDER |
| 2 — O Véu de Eryuell | Eryuell | 10 seedadas | 10 seedadas | PLACEHOLDER |
| 3 — A Chama de Düren | Düren | 10 seedadas | 10 seedadas | PLACEHOLDER |

---

## FACÇÕES

> Tabela: factions
> Seed: migrations anteriores

> AÇÃO NECESSÁRIA: listar facções e slugs após confirmar seeds existentes

---

## TÍTULOS

> Tabela: title_definitions
> Seeds: migrations diversas + 041

| Nome | Categoria | Fonte |
|---|---|---|
| Expedicionário | progressao | Campanha Inicial completa |
| Primeiro do Eco | progressao | Achievement |
| Sobrevivente de Thar-Halum | progressao | Achievement |
| Fantasma de Eryuell | progressao | Achievement (bestiário) |
| Forjador das Profundezas | progressao | Achievement (bestiário) |
| Algoz de Urgath | progressao | Achievement (bestiário) |
| Lâmina da Ordem | narrativo | Choice — Cap. 4 Campanha |
| Agente do Caos | narrativo | Choice — Cap. 4 Campanha |
| Sem Bandeira | narrativo | Choice — Cap. 8 Campanha |

---

## CONQUISTAS (ACHIEVEMENTS)

> Tabela: achievements
> Seed: migrations anteriores + 041

> ~50 conquistas seedadas. Categorias: progressao, combate, exploracao, social, colecao.
> Consultar tabela achievements diretamente para lista completa.

---

## SEEDS EXECUTADOS

| Arquivo | Conteúdo | Status |
|---|---|---|
| migrations 001–041 | Schema + seeds base | ✓ Executado |
| seed_materiais_v3.sql | 12 materiais (4 UPDATE + 8 INSERT) | ✓ Executado |
| seed_armas.sql | 132 armas (11 classes × 3 variações × 4 materiais) | ✓ Executado |
| seed_armaduras.sql | 70 itens (armadura 21, elmo 21, calca 14, bota 14) | ✓ Executado |
| seed_acessorios.sql | 64 acessórios (4 categorias × 4 variações × 4 tiers) | ✓ Executado |
| seed_item_inicial.sql | Item Bronze por classe na criação do personagem | Pendente |
| seed_zonas_novas.sql | 2 zonas novas (15–25, 25+) + loot_tables atualizadas | Pendente |
| seed_skills_[classe].sql | 8 skills por classe | Pendente (11 seeds) |

### Contagem total de itens no banco (estimada)

| Categoria | Quantidade |
|---|---|
| Materiais | 12 |
| Armas (arma_principal) | 132 + 3 legados = 135 |
| Armaduras | 21 + 1 legado = 22 |
| Elmos | 21 + 1 legado = 22 |
| Calças | 14 |
| Botas | 14 + 1 legado = 15 |
| Acessórios | 64 + 2 legados = 66 |
| Pergaminhos | 1 |
| Outros (migration 013) | Erva de Cura, Poção de Éter, Fragmento de Lore, Equipamento Militar = 4 |
| **Total estimado** | **~291 itens** |
