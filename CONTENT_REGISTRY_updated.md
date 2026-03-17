# CONTENT REGISTRY — Arkandia
> Fonte de verdade para todo conteúdo seedado no banco.
> Atualizar sempre que executar um seed SQL novo.
> Última atualização: Março 2026 — Sessão Fase 38 completa

---

## COMO USAR

Antes de criar qualquer conteúdo que referencie outros itens (loot_tables, receitas,
maestrias, campanhas), consulte este arquivo para saber o que já existe no banco.
Nunca referenciar item, skill, NPC ou zona que não esteja listado aqui.

---

## MATERIAIS

> Tabela: items (item_type = 'material')
> Seed: supabase/seeds/seed_materiais_v3.sql ✓

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
| Fragmento de Aço | incomum | Minas de Düren (5–10) | 250 |
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
> Seeds: seed_armas.sql ✓ seed_armaduras.sql ✓ seed_acessorios.sql ✓

### Regras de inserção (CRÍTICO)
- Tabela `items` NÃO tem UNIQUE constraint em `name`
- NUNCA usar ON CONFLICT (name) — gera erro
- Padrão: `INSERT ... WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = '...')`
- Para atualizar: `UPDATE items SET ... WHERE name = '...'`

### Armas Iniciais por Classe

| Classe | Arma inicial | Lógica |
|---|---|---|
| Espadachim | Espada de Bronze | `createCharacter` em app/character/actions.ts |
| Lanceiro | Lança de Bronze | idem |
| Lutador | Manoplas de Bronze | idem |
| Destruidor | Martelo de Bronze | idem |
| Escudeiro | Espada Curta de Bronze | idem |
| Assassino | Adaga de Bronze | idem |
| Arqueiro | Arco Curto de Bronze | idem |
| Atirador | Pistola Etérica de Bronze | idem |
| Druida | Machado de Bronze | idem |
| Bardo | Alaúde de Bronze | idem |
| Mago | Cajado de Bronze | idem |

### Armas (slot: arma_principal) — 132 itens ✓

**Estrutura:** 11 classes × 3 variações × 4 materiais (Bronze/Ferro/Aço/Prata)

| Classe | Variações |
|---|---|
| Espadachim | Espada, Katana, Montante |
| Lanceiro | Lança, Alabarda, Glaive |
| Lutador | Manoplas, Garras, Braçadeiras de Combate |
| Destruidor | Martelo, Maça, Mangual |
| Escudeiro | Espada Curta, Machado Curto, Maça Curta |
| Assassino | Adaga, Kunai, Stiletto |
| Arqueiro | Arco Curto, Arco Longo, Arco Composto |
| Atirador | Pistola Etérica, Rifle Etérico, Espingarda Etérica |
| Druida | Machado, Machadinha Dupla, Machado de Guerra |
| Mago | Cajado, Varinha, Orbe |
| Bardo | Alaúde, Flauta de Combate, Tambor Etéreo |

### Armaduras — 70 itens ✓ (seed_armaduras.sql)

Armadura (21), Elmo (21), Calça (14), Bota (14)

### Acessórios — 64 itens ✓ (seed_acessorios.sql)

Anel (16), Amuleto (16), Colar (16), Bracelete (16)

---

## SKILLS

> Tabela: skills
> Seed: seed_skills.sql ✓ — 88 skills executadas

### Status por classe

| Classe | Skills | Iniciais (pos 1–2) | Compráveis (pos 3–8) |
|---|---|---|---|
| Espadachim | 8 | Corte Preciso (ativa), Olho da Lâmina (passiva) | 6 |
| Lanceiro | 8 | Investida (ativa), Domínio de Alcance (passiva) | 6 |
| Lutador | 8 | Soco Direto (ativa), Corpo de Ferro (passiva) | 6 |
| Destruidor | 8 | Martelada (ativa), Peso do Impacto (passiva) | 6 |
| Escudeiro | 8 | Golpe de Escudo (ativa), Postura Defensiva (passiva) | 6 |
| Assassino | 8 | Golpe Furtivo (ativa), Instinto Sombrio (passiva) | 6 |
| Arqueiro | 8 | Flecha Precisa (ativa), Olho de Caçador (passiva) | 6 |
| Atirador | 8 | Disparo Etéreo (ativa), Mira Calibrada (passiva) | 6 |
| Druida | 8 | Golpe Selvagem (ativa), Raízes Profundas (passiva) | 6 |
| Mago | 8 | Pulso Etéreo (ativa), Fluxo Arcano (passiva) | 6 |
| Bardo | 8 | Acorde Dissonante (ativa), Afinação Constante (passiva) | 6 |

**Custo de compra por posição:**
- Pos 3–4: 30 Essências
- Pos 5–6: 50 Essências
- Pos 7: 80 Essências
- Pos 8 (ultimate): 120 Essências

---

## MAESTRIAS

> Tabela: maestrias
> Seeds: seed_maestrias_prestígio_ressonância.sql ✓

### Maestrias de Prestígio — 33 ✓

**Custo:** 150 Essências + Pergaminho de Classe de Prestígio
**Restrição:** class_id vinculado à classe

| Classe | Maestrias |
|---|---|
| Espadachim | Samurai, Retalhador, Mestre de Armas |
| Lanceiro | Dragoon, Sentinela, Hussardo |
| Lutador | Brawler, Campeão, Colosso |
| Destruidor | Demolidor, Quebrador, Juggernaut |
| Escudeiro | Paladino, Provocador, Centurião |
| Assassino | Executor, Sicário, Ninja |
| Arqueiro | Atirador de Elite, Caçador, Franco-Atirador |
| Atirador | Artilheiro, Justiceiro, Arcabuzeiro |
| Druida | Xamã, Berserker, Curandeiro |
| Mago | Arquimago, Supressor, Alquimista |
| Bardo | Menestrel, Réquiem, Maestro |

**⚠️ skill_ids = '{}' em todas** — skills das Maestrias pendentes (ver seção abaixo)

### Maestrias de Ressonância — 24 ✓

**Custo:** Básica = 200 Essências (nível 1) · Avançada = 350 Essências (nível 3)
**Restrição:** resonance_type + min_resonance_level

| Arquétipo | Básica (nível 1) | Avançada (nível 3) |
|---|---|---|
| Ordem | Decreto Imutável | Reversão da Ordem |
| Caos | Maré do Caos | Cascata de Ruína |
| Tempo | Distorção Temporal | Segundo Absoluto |
| Espaço | Salto Dimensional | Barreira Dimensional |
| Matéria | Armadura Viva | Transmutação de Impacto |
| Vida | Pulso Vital | Renascimento |
| Morte | Toque do Fim | Drenagem de Alma |
| Vontade | Vontade Inabalável | Pressão do Rei |
| Sonho | Eco do Irreal | Pesadelo Desperto |
| Guerra | Sede de Combate | Eu Sou a Guerra |
| Vínculo | Pacto de Dor | Fusão de Intenção |
| Ruína | Corrosão Absoluta | Desfazer |

**⚠️ skill_ids = '{}' em todas** — skills das Maestrias pendentes

### Maestrias Lendárias — 0

Criadas via GM Panel e vinculadas manualmente à temporada ativa.

---

## ZONAS DE HUNTING

> Tabela: hunting_zones + npc_types
> Seeds: migration 022 + seed_zonas_novas.sql ✓

| Zona | Nível | Risco | NPCs | Pergaminho drop |
|---|---|---|---|---|
| Ruínas de Thar-Halum | 1–5 | baixo | Guardião Esquecido, Sentinela Antiga | — |
| Floresta de Eryuell | 3–8 | médio | Espírito Corrompido | — |
| Minas de Düren | 5–10 | médio | Golem de Pedra | — |
| Bordas de Urgath | 8–15 | alto | Cultista do Caos | 2% |
| Câmara do Arquétipo Corrompido | 10+ | extremo | Eco do Corrompido | 5% |
| Planícies de Cinderyn | 15–25 | alto | Cavaleiro Caído, Sentinela do Sonho | 4% |
| Abismo de Khar-Thun | 25+ | extremo | Devorador das Profundezas, Fragmento Primordial | 8% |

**Drops por zona (resumo pós seed_zonas_novas.sql):**
- Thar-Halum: Bronze, Madeira Etérea, armas/armaduras Bronze
- Eryuell: Ferro, Tecido Etéreo, Seda Arcana, armas/armaduras Ferro
- Düren: Ferro/Aço, Minério Etéreo, Componente Arcano, armaduras Aço
- Urgath: Aço/Prata, Couro Espiritual, Componente Arcano, Pergaminho (2%), acessórios Etéreos
- Câmara: Prata, Componente Arcano, Pergaminho (5%), acessórios Etéreos

---

## SUMMON

> Tabelas: summon_catalogs, summon_catalog_items
> Seed: seed_summon_catalog.sql ✓

### Catálogo ativo: "Caixa do Viajante"

| Item | Raridade | Quantidade | Peso | Prob. aprox. |
|---|---|---|---|---|
| Fragmento de Bronze | comum | 3 | 120 | 15.8% |
| Fragmento de Ferro | comum | 3 | 120 | 15.8% |
| Tecido Etéreo | comum | 2 | 100 | 13.2% |
| Madeira Etérea | comum | 2 | 100 | 13.2% |
| Fragmento de Aço | incomum | 2 | 60 | 7.9% |
| Seda Arcana | incomum | 2 | 60 | 7.9% |
| Couro Espiritual | incomum | 2 | 60 | 7.9% |
| Minério Etéreo | incomum | 1 | 50 | 6.6% |
| Fragmento de Prata | raro | 1 | 25 | 3.3% |
| Componente Arcano | raro | 1 | 20 | 2.6% |
| Anel de Combate Etéreo | raro | 1 | 15 | 2.0% |
| Amuleto de Proteção Etéreo | raro | 1 | 15 | 2.0% |
| Colar da Precisão Etéreo | raro | 1 | 10 | 1.3% |
| Pergaminho de Classe de Prestígio | épico | 1 | 5 | 0.7% |

---

## CAMPANHA INICIAL

> Tabelas: campaigns, campaign_chapters, campaign_chapter_progress
> Seeds: migration 039 (estrutura) + seed_campanha_inicial.sql ✓

**Slug:** `inicial` | **Nível:** 1–10 | **Capítulos:** 10

| Cap | Título | Combate | Antagonista |
|---|---|---|---|
| 1 | A Chegada a Vallaeon | Interceptador Sem Nome (0.5×) | — |
| 2 | A Bastilha Velada | — | Apresentação Aldric Mohr |
| 3 | Primeira Missão | — | — |
| 4 | Facções em Conflito | — | — |
| 5 | O Chamado do Arquétipo | Eco do Arquétipo (0.75×) | — |
| 6 | O Peso do Arquétipo | — | — |
| 7 | Revelações | — | Operação Véu Negro revelada |
| 8 | Aliados e Inimigos | — | — |
| 9 | O Clímax | Aldric Mohr o Selado (0.9×) | Boss final |
| 10 | O Início de Tudo | — | — |

**NPCs recorrentes:** Elara Voss (Expedição Régia), Aldric Mohr (Conselho/antagonista), Kael (Maré Vermelha)

---

## CAMPANHA LONGA

> Tabelas: campaigns, campaign_stages, campaign_stage_progress
> Seeds: migration 040 ✓ (estrutura + 60 stages placeholder)

**Slug:** `aventura` | **Capítulos:** 3 | **Stages:** 30 normal + 30 hard
**Status:** estrutura criada, textos são placeholders — narrativa pendente

---

## TEMPORADA / BATTLE PASS

> Tabela: seasons
> Ação manual SQL ✓ (executada)

**Temporada ativa:** "Era do Despertar" — 30 dias a partir da criação
**Coliseu:** Quinzena renovada manualmente ✓

---

## FACÇÕES (slugs canônicos)

> Migration 004 (base) + migration 026 (regionais)

**Globais:** expedicao_regia, conselho_ancioes, marinha_imperial, ordem_doze_espelhos,
suserania_negra, academia_arcana, inquisicao_duren, cavaleiros_vermelhos,
mare_vermelha, circulo_sangue, maos_zaffar, companhia_primeiro_vento,
pacto_vagalumes, portadores_chama

**Regionais:** imperio_valoriano, clans_norrheim, forjas_duren, coroa_ogygia,
guardas_eryuell, codigo_ryugakure, filosofos_shenzhou

---

## PENDÊNCIAS CONHECIDAS

| Item | Prioridade | Status |
|---|---|---|
| Skills das Maestrias de Prestígio (33 × N skills) | Alta | Prompt gerado |
| Skills das Maestrias de Ressonância (24 × 1-2 skills) | Alta | Prompt gerado |
| Maestrias Lendárias | Média | Criação via GM Panel |
| Textos da Campanha Longa (60 fases) | Baixa | Placeholder |
| Fragmentos de Lore da Campanha Longa (9) | Baixa | Placeholder |
