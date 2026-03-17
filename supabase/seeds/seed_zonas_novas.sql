-- ============================================================================
-- SEED: Zonas de Hunting Novas + Loot Tables Atualizadas
-- Referência: CONTENT_REGISTRY.md — Itens disponíveis por tier
-- ============================================================================

-- ============================================================================
-- PARTE 1 — UPDATE das loot_tables dos NPCs existentes
-- ============================================================================

-- Ruínas de Thar-Halum — Guardião Esquecido (fraco, lv2)
UPDATE npc_types SET loot_table = '[
  {"type": "libras", "min": 5, "max": 15, "chance": 1.0},
  {"type": "xp", "amount": 20, "chance": 1.0},
  {"type": "essencia", "amount": 2, "chance": 0.15},
  {"type": "item", "item_name": "Fragmento de Bronze", "chance": 0.30},
  {"type": "item", "item_name": "Madeira Etérea", "chance": 0.20},
  {"type": "item", "item_name": "Espada de Bronze", "chance": 0.05},
  {"type": "item", "item_name": "Manoplas de Bronze", "chance": 0.05},
  {"type": "item", "item_name": "Armadura de Bronze", "chance": 0.04},
  {"type": "item", "item_name": "Botas de Bronze", "chance": 0.04}
]'::jsonb
WHERE name = 'Guardião Esquecido'
  AND zone_id = (SELECT id FROM hunting_zones WHERE name = 'Ruínas de Thar-Halum');

-- Ruínas de Thar-Halum — Sentinela Antiga (médio, lv4)
UPDATE npc_types SET loot_table = '[
  {"type": "libras", "min": 15, "max": 35, "chance": 1.0},
  {"type": "xp", "amount": 45, "chance": 1.0},
  {"type": "essencia", "amount": 3, "chance": 0.20},
  {"type": "item", "item_name": "Fragmento de Bronze", "chance": 0.40},
  {"type": "item", "item_name": "Fragmento de Ferro", "chance": 0.15},
  {"type": "item", "item_name": "Madeira Etérea", "chance": 0.20},
  {"type": "item", "item_name": "Minério Etéreo", "chance": 0.15},
  {"type": "item", "item_name": "Katana de Bronze", "chance": 0.06},
  {"type": "item", "item_name": "Elmo de Bronze", "chance": 0.05},
  {"type": "item", "item_name": "Grevas de Bronze", "chance": 0.05}
]'::jsonb
WHERE name = 'Sentinela Antiga'
  AND zone_id = (SELECT id FROM hunting_zones WHERE name = 'Ruínas de Thar-Halum');

-- Floresta de Eryuell — Espírito Corrompido (médio, lv5)
UPDATE npc_types SET loot_table = '[
  {"type": "libras", "min": 20, "max": 60, "chance": 1.0},
  {"type": "xp", "amount": 55, "chance": 1.0},
  {"type": "essencia", "amount": 4, "chance": 0.25},
  {"type": "item", "item_name": "Fragmento de Ferro", "chance": 0.35},
  {"type": "item", "item_name": "Tecido Etéreo", "chance": 0.30},
  {"type": "item", "item_name": "Seda Arcana", "chance": 0.12},
  {"type": "item", "item_name": "Minério Etéreo", "chance": 0.18},
  {"type": "item", "item_name": "Espada de Ferro", "chance": 0.05},
  {"type": "item", "item_name": "Gibão de Ferro", "chance": 0.04},
  {"type": "item", "item_name": "Manto de Seda Arcana", "chance": 0.03},
  {"type": "item", "item_name": "Capuz de Seda Arcana", "chance": 0.03}
]'::jsonb
WHERE name = 'Espírito Corrompido'
  AND zone_id = (SELECT id FROM hunting_zones WHERE name = 'Floresta de Eryuell');

-- Minas de Düren — Golem de Pedra (forte, lv7)
UPDATE npc_types SET loot_table = '[
  {"type": "libras", "min": 60, "max": 120, "chance": 1.0},
  {"type": "xp", "amount": 90, "chance": 1.0},
  {"type": "essencia", "amount": 6, "chance": 0.30},
  {"type": "item", "item_name": "Fragmento de Ferro", "chance": 0.30},
  {"type": "item", "item_name": "Fragmento de Aço", "chance": 0.25},
  {"type": "item", "item_name": "Minério Etéreo", "chance": 0.25},
  {"type": "item", "item_name": "Componente Arcano", "chance": 0.10},
  {"type": "item", "item_name": "Armadura de Aço", "chance": 0.05},
  {"type": "item", "item_name": "Elmo de Aço", "chance": 0.04},
  {"type": "item", "item_name": "Grevas de Aço", "chance": 0.04},
  {"type": "item", "item_name": "Morrião de Aço", "chance": 0.03}
]'::jsonb
WHERE name = 'Golem de Pedra'
  AND zone_id = (SELECT id FROM hunting_zones WHERE name = 'Minas de Düren');

-- Bordas de Urgath — Cultista do Caos (forte, lv10)
UPDATE npc_types SET loot_table = '[
  {"type": "libras", "min": 80, "max": 180, "chance": 1.0},
  {"type": "xp", "amount": 140, "chance": 1.0},
  {"type": "essencia", "amount": 8, "chance": 0.35},
  {"type": "item", "item_name": "Fragmento de Aço", "chance": 0.30},
  {"type": "item", "item_name": "Fragmento de Prata", "chance": 0.10},
  {"type": "item", "item_name": "Couro Espiritual", "chance": 0.20},
  {"type": "item", "item_name": "Componente Arcano", "chance": 0.20},
  {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.02},
  {"type": "item", "item_name": "Armadura Reforçada de Aço", "chance": 0.04},
  {"type": "item", "item_name": "Botas de Combate de Aço", "chance": 0.04},
  {"type": "item", "item_name": "Anel de Combate Etéreo", "chance": 0.03}
]'::jsonb
WHERE name = 'Cultista do Caos'
  AND zone_id = (SELECT id FROM hunting_zones WHERE name = 'Bordas de Urgath');

-- Câmara do Arquétipo Corrompido — Eco do Corrompido (elite, lv12)
UPDATE npc_types SET loot_table = '[
  {"type": "libras", "min": 150, "max": 300, "chance": 1.0},
  {"type": "xp", "amount": 300, "chance": 1.0},
  {"type": "essencia", "amount": 15, "chance": 0.50},
  {"type": "item", "item_name": "Fragmento de Prata", "chance": 0.25},
  {"type": "item", "item_name": "Couro Espiritual", "chance": 0.25},
  {"type": "item", "item_name": "Componente Arcano", "chance": 0.25},
  {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.05},
  {"type": "item", "item_name": "Espada Prateada de Ogygia", "chance": 0.03},
  {"type": "item", "item_name": "Armadura de Prata", "chance": 0.03},
  {"type": "item", "item_name": "Amuleto de Proteção Etéreo", "chance": 0.04},
  {"type": "item", "item_name": "Colar da Precisão Etéreo", "chance": 0.03}
]'::jsonb
WHERE name = 'Eco do Corrompido'
  AND zone_id = (SELECT id FROM hunting_zones WHERE name = 'Câmara do Arquétipo Corrompido');

-- ============================================================================
-- PARTE 2a — Zona: Planícies de Cinderyn (nível 15–25)
-- ============================================================================

INSERT INTO hunting_zones
  (name, description, location, min_level, max_level, risk_level, cooldown_minutes)
SELECT
  'Planícies de Cinderyn',
  'As planícies queimadas ao redor da Cidade Morta de Cinderyn abrigam cavaleiros caídos e sentinelas corrompidas pela Arma Ancestral Bellum. Território de alto risco e recompensas excepcionais.',
  'Cinderyn — Território Abandonado',
  15, 25, 'alto', 30
WHERE NOT EXISTS (SELECT 1 FROM hunting_zones WHERE name = 'Planícies de Cinderyn');

-- Cavaleiro Caído (forte, lv17)
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Cavaleiro Caído',
  'forte',
  17, 520, 58, 20, 42, 18, 80,
  '[
    {"name": "Golpe Devastador", "base": 30, "ataque_factor": 1.6, "eter_cost": 35, "cooldown": 2},
    {"name": "Investida do Vazio", "base": 20, "ataque_factor": 1.2, "eter_cost": 20, "cooldown": 1,
     "effect_type": "stun", "effect_duration": 1},
    {"name": "Resistência dos Mortos", "type": "buff", "effect": "defesa_bonus", "value": 20,
     "eter_cost": 30, "cooldown": 4}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 120, "max": 260, "chance": 1.0},
    {"type": "xp", "amount": 210, "chance": 1.0},
    {"type": "essencia", "amount": 10, "chance": 0.40},
    {"type": "item", "item_name": "Fragmento de Aço", "chance": 0.30},
    {"type": "item", "item_name": "Fragmento de Prata", "chance": 0.20},
    {"type": "item", "item_name": "Componente Arcano", "chance": 0.20},
    {"type": "item", "item_name": "Armadura Reforçada de Aço", "chance": 0.06},
    {"type": "item", "item_name": "Espada de Aço", "chance": 0.05},
    {"type": "item", "item_name": "Montante de Aço", "chance": 0.04},
    {"type": "item", "item_name": "Grevas de Aço", "chance": 0.04},
    {"type": "item", "item_name": "Anel de Combate Etéreo", "chance": 0.03},
    {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.02}
  ]'::jsonb,
  'aggressive',
  210,
  'Um guerreiro cujos olhos perderam a luz mas não a vontade de combater. A armadura ainda porta o brasão de uma ordem extinta.'
FROM hunting_zones z
WHERE z.name = 'Planícies de Cinderyn'
  AND NOT EXISTS (
    SELECT 1 FROM npc_types n WHERE n.name = 'Cavaleiro Caído' AND n.zone_id = z.id
  );

-- Sentinela do Sonho (elite, lv22)
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Sentinela do Sonho',
  'elite',
  22, 900, 70, 65, 50, 28, 200,
  '[
    {"name": "Lança do Sonho Quebrado", "base": 40, "magia_factor": 1.8, "eter_cost": 55, "cooldown": 2,
     "effect_type": "silencio", "effect_duration": 2},
    {"name": "Ruptura Onírica", "base": 55, "ataque_factor": 1.4, "magia_factor": 1.4,
     "eter_cost": 80, "cooldown": 3, "is_true_damage": false},
    {"name": "Véu do Sonho", "type": "buff", "effect": "esquiva_bonus",
     "eter_cost": 40, "cooldown": 4},
    {"name": "Fragmentação da Realidade", "base": 35, "magia_factor": 2.2,
     "eter_cost": 100, "cooldown": 5, "effect_type": "confusao", "effect_duration": 2}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 220, "max": 450, "chance": 1.0},
    {"type": "xp", "amount": 420, "chance": 1.0},
    {"type": "essencia", "amount": 18, "chance": 0.50},
    {"type": "item", "item_name": "Fragmento de Prata", "chance": 0.35},
    {"type": "item", "item_name": "Couro Espiritual", "chance": 0.30},
    {"type": "item", "item_name": "Componente Arcano", "chance": 0.25},
    {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.04},
    {"type": "item", "item_name": "Espada Prateada de Ogygia", "chance": 0.04},
    {"type": "item", "item_name": "Armadura de Prata", "chance": 0.04},
    {"type": "item", "item_name": "Elmo de Prata", "chance": 0.03},
    {"type": "item", "item_name": "Anel de Combate Ancestral", "chance": 0.02},
    {"type": "item", "item_name": "Amuleto da Vitalidade Etéreo", "chance": 0.03}
  ]'::jsonb,
  'balanced',
  420,
  'Uma entidade formada pelos sonhos não realizados dos que morreram em Cinderyn. Não ataca por instinto — ataca por memória.'
FROM hunting_zones z
WHERE z.name = 'Planícies de Cinderyn'
  AND NOT EXISTS (
    SELECT 1 FROM npc_types n WHERE n.name = 'Sentinela do Sonho' AND n.zone_id = z.id
  );

-- ============================================================================
-- PARTE 2b — Zona: Abismo de Khar-Thun (nível 25+)
-- ============================================================================

INSERT INTO hunting_zones
  (name, description, location, min_level, max_level, risk_level, cooldown_minutes)
SELECT
  'Abismo de Khar-Thun',
  'Uma fissura no fundo das Minas de Düren que desce além dos mapas conhecidos. Os seres que habitam o Abismo não pertencem a nenhum Arquétipo identificável — são anteriores à Fratura. Apenas os mais preparados de Ellia têm retornado.',
  'Profundezas de Düren — Localização Classificada',
  25, NULL, 'extremo', 45
WHERE NOT EXISTS (SELECT 1 FROM hunting_zones WHERE name = 'Abismo de Khar-Thun');

-- Devorador das Profundezas (elite, lv28)
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Devorador das Profundezas',
  'elite',
  28, 1200, 88, 55, 65, 20, 150,
  '[
    {"name": "Mandíbulas do Abismo", "base": 50, "ataque_factor": 2.0, "eter_cost": 60, "cooldown": 2,
     "effect_type": "corrosao_eterica", "effect_duration": 2},
    {"name": "Investida Subterrânea", "base": 40, "ataque_factor": 1.5, "eter_cost": 40, "cooldown": 1,
     "effect_type": "stun", "effect_duration": 1},
    {"name": "Casca Quitinosa", "type": "buff", "effect": "defesa_bonus", "value": 30,
     "eter_cost": 50, "cooldown": 5}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 300, "max": 600, "chance": 1.0},
    {"type": "xp", "amount": 580, "chance": 1.0},
    {"type": "essencia", "amount": 22, "chance": 0.55},
    {"type": "item", "item_name": "Fragmento de Prata", "chance": 0.40},
    {"type": "item", "item_name": "Componente Arcano", "chance": 0.35},
    {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.06},
    {"type": "item", "item_name": "Armadura Reforçada de Prata", "chance": 0.05},
    {"type": "item", "item_name": "Montante Prateado de Valoria", "chance": 0.04},
    {"type": "item", "item_name": "Elmo de Prata", "chance": 0.04},
    {"type": "item", "item_name": "Grevas de Prata", "chance": 0.04},
    {"type": "item", "item_name": "Anel de Combate Ancestral", "chance": 0.03},
    {"type": "item", "item_name": "Amuleto da Vitalidade Ancestral", "chance": 0.03}
  ]'::jsonb,
  'aggressive',
  580,
  'Uma criatura quitinosa de proporções impossíveis. Os olhos são muitos e não piscam. Pesquisadores de Düren acreditam que ela existia antes do primeiro Arquétipo se manifestar.'
FROM hunting_zones z
WHERE z.name = 'Abismo de Khar-Thun'
  AND NOT EXISTS (
    SELECT 1 FROM npc_types n WHERE n.name = 'Devorador das Profundezas' AND n.zone_id = z.id
  );

-- Fragmento Primordial (elite, lv32)
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Fragmento Primordial',
  'elite',
  32, 1800, 95, 110, 70, 35, 300,
  '[
    {"name": "Pulso do Vazio", "base": 60, "magia_factor": 2.5, "eter_cost": 90, "cooldown": 2,
     "effect_type": "corrosao_eterica", "effect_duration": 3},
    {"name": "Dissolução", "base": 80, "ataque_factor": 1.8, "magia_factor": 2.0,
     "eter_cost": 120, "cooldown": 4, "is_true_damage": true},
    {"name": "Reconstituição", "type": "heal", "base": 200, "eter_cost": 80, "cooldown": 5},
    {"name": "Fragmentação", "base": 45, "magia_factor": 1.6, "eter_cost": 70, "cooldown": 3,
     "effect_type": "confusao", "effect_duration": 2}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 500, "max": 1000, "chance": 1.0},
    {"type": "xp", "amount": 900, "chance": 1.0},
    {"type": "essencia", "amount": 35, "chance": 0.60},
    {"type": "item", "item_name": "Fragmento de Prata", "chance": 0.50},
    {"type": "item", "item_name": "Componente Arcano", "chance": 0.40},
    {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.08},
    {"type": "item", "item_name": "Armadura Reforçada de Prata", "chance": 0.06},
    {"type": "item", "item_name": "Katana Prateada de Ryugakure", "chance": 0.05},
    {"type": "item", "item_name": "Morrião de Prata", "chance": 0.05},
    {"type": "item", "item_name": "Botas de Prata", "chance": 0.05},
    {"type": "item", "item_name": "Anel do Duelo Ancestral", "chance": 0.03},
    {"type": "item", "item_name": "Amuleto do Guardião Ancestral", "chance": 0.03},
    {"type": "item", "item_name": "Colar Equilibrado Ancestral", "chance": 0.02}
  ]'::jsonb,
  'balanced',
  900,
  'Não é um ser — é uma ideia que ganhou forma. Os magos de Serdin chamam de Fragmento Primordial qualquer entidade que precede a linguagem dos Arquétipos. Esta é a maior já documentada.'
FROM hunting_zones z
WHERE z.name = 'Abismo de Khar-Thun'
  AND NOT EXISTS (
    SELECT 1 FROM npc_types n WHERE n.name = 'Fragmento Primordial' AND n.zone_id = z.id
  );

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- SELECT name, min_level, max_level, risk_level FROM hunting_zones ORDER BY min_level;
-- SELECT n.name, z.name as zona, n.tier, n.level FROM npc_types n
-- JOIN hunting_zones z ON z.id = n.zone_id ORDER BY n.level;
