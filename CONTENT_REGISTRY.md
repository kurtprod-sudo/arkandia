# CONTENT REGISTRY — Arkandia
> Fonte de verdade para todo conteúdo seedado no banco.
> Atualizar sempre que executar um seed SQL novo.
> Última atualização: Março 2026

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
> Seeds: supabase/seeds/seed_armas.sql (pendente), seed_armaduras.sql (pendente)

### Armas Iniciais por Classe (concedidas na criação do personagem)

| Nome | Classe | Slot | Seed |
|---|---|---|---|
| — | — | — | pendente (seed_item_inicial.sql) |

### Armas (slot: arma_principal)

> Pendente — aguardando geração via prompt A

### Armaduras (slot: armadura)

> Pendente — aguardando geração via prompt B

### Elmos (slot: elmo)

> Pendente — aguardando geração via prompt B

### Calças (slot: calca)

> Pendente — aguardando geração via prompt B

### Botas (slot: bota)

> Pendente — aguardando geração via prompt B

### Acessórios (slot: acessorio_1 / acessorio_2)

> Pendente — aguardando geração via prompt C

### Equipamentos de Exemplo (migration 025 — já existiam)

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

> AÇÃO NECESSÁRIA: atualizar loot_tables das zonas para incluir
> equipamentos após seed_armas.sql e seed_armaduras.sql serem executados

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
| seed_materiais.sql | 12 materiais base | ✓ Pronto para executar |
| seed_armas.sql | 132 armas (11 classes × 3 variações × 4 materiais) | Pendente |
| seed_armaduras.sql | Armaduras, elmos, calças, botas | Pendente |
| seed_acessorios.sql | Anéis, amuletos, colares | Pendente |
| seed_item_inicial.sql | Item inicial por classe + lógica createCharacter | Pendente |
| seed_zonas_novas.sql | 2 zonas novas (15–25, 25+) + loot_tables atualizadas | Pendente |
| seed_skills_[classe].sql | 8 skills por classe | Pendente (11 seeds) |
