-- ============================================================================
-- 021_balance.sql — Calibração de Balanceamento
-- Revisão completa de números do Arkandia
-- ============================================================================

-- ─── 1. ATUALIZA ATRIBUTOS INICIAIS POR CLASSE ───────────────────────────

-- Lanceiro
UPDATE classes SET
  scaling = '{
    "ataque_per_level": 3,
    "velocidade_per_level": 3,
    "precisao_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['ataque', 'velocidade']
WHERE name = 'Lanceiro';

-- Espadachim
UPDATE classes SET
  scaling = '{
    "ataque_per_level": 3,
    "precisao_per_level": 3,
    "tenacidade_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['ataque', 'precisao']
WHERE name = 'Espadachim';

-- Lutador
UPDATE classes SET
  scaling = '{
    "ataque_per_level": 3,
    "vitalidade_per_level": 3,
    "tenacidade_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['ataque', 'vitalidade']
WHERE name = 'Lutador';

-- Bardo
UPDATE classes SET
  scaling = '{
    "magia_per_level": 3,
    "eter_per_level": 13,
    "precisao_per_level": 1,
    "default_per_level": 0.5
  }'::jsonb,
  primary_attributes = ARRAY['magia', 'eter_max']
WHERE name = 'Bardo';

-- Atirador
UPDATE classes SET
  scaling = '{
    "precisao_per_level": 3,
    "ataque_per_level": 3,
    "velocidade_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['precisao', 'ataque']
WHERE name = 'Atirador';

-- Arqueiro
UPDATE classes SET
  scaling = '{
    "precisao_per_level": 3,
    "ataque_per_level": 3,
    "velocidade_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['precisao', 'ataque']
WHERE name = 'Arqueiro';

-- Assassino
UPDATE classes SET
  scaling = '{
    "ataque_per_level": 3,
    "velocidade_per_level": 3,
    "precisao_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['ataque', 'velocidade']
WHERE name = 'Assassino';

-- Druida
UPDATE classes SET
  scaling = '{
    "ataque_per_level": 3,
    "vitalidade_per_level": 3,
    "magia_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['ataque', 'vitalidade']
WHERE name = 'Druida';

-- Destruidor
UPDATE classes SET
  scaling = '{
    "ataque_per_level": 3,
    "vitalidade_per_level": 3,
    "defesa_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['ataque', 'vitalidade']
WHERE name = 'Destruidor';

-- Escudeiro
UPDATE classes SET
  scaling = '{
    "defesa_per_level": 3,
    "vitalidade_per_level": 3,
    "ataque_per_level": 1,
    "default_per_level": 0.5,
    "eter_per_level": 8
  }'::jsonb,
  primary_attributes = ARRAY['defesa', 'vitalidade']
WHERE name = 'Escudeiro';

-- Mago
UPDATE classes SET
  scaling = '{
    "magia_per_level": 3,
    "eter_per_level": 13,
    "precisao_per_level": 1,
    "default_per_level": 0.5
  }'::jsonb,
  primary_attributes = ARRAY['magia', 'eter_max']
WHERE name = 'Mago';

-- ─── 2. ATUALIZA BÔNUS RACIAIS ────────────────────────────────────────────

UPDATE races SET passives = '{
  "bonus_attribute_points_per_level": 1,
  "maestria_restriction": false
}'::jsonb WHERE name = 'Humano';

UPDATE races SET passives = '{
  "eter_bonus_base": 20,
  "eter_bonus_per_level": 2
}'::jsonb WHERE name = 'Elfo';

UPDATE races SET passives = '{
  "defesa_bonus_base": 3,
  "vitalidade_bonus_base": 2
}'::jsonb WHERE name = 'Anão';

UPDATE races SET passives = '{
  "ataque_bonus_base": 3,
  "fire_damage_resistance_percent": 15
}'::jsonb WHERE name = 'Draconiano';

UPDATE races SET passives = '{
  "vitalidade_bonus_base": 4,
  "tenacidade_bonus_base": 3
}'::jsonb WHERE name = 'Meio-Gigante';

UPDATE races SET passives = '{
  "magia_bonus_base": 3,
  "eter_regen_per_turn": 3
}'::jsonb WHERE name = 'Melfork';

-- ─── 3. TABELA DE XP POR NÍVEL ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS xp_table (
  level       INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL,
  xp_total    INTEGER NOT NULL
);

INSERT INTO xp_table (level, xp_required, xp_total) VALUES
(1,  50,    50),
(2,  100,   150),
(3,  180,   330),
(4,  270,   600),
(5,  400,   1000),
(6,  600,   1600),
(7,  900,   2500),
(8,  1300,  3800),
(9,  1800,  5600),
(10, 2800,  8400),
(11, 4000,  12400),
(12, 5500,  17900),
(13, 7200,  25100),
(14, 9200,  34300),
(15, 11500, 45800)
ON CONFLICT (level) DO UPDATE
  SET xp_required = EXCLUDED.xp_required,
      xp_total = EXCLUDED.xp_total;

-- Para níveis 16+: xp_required = 500 × level²
-- Calculado dinamicamente em /lib/game/xp.ts

-- ─── 4. FUNÇÃO DE ÉTER DA RESSONÂNCIA ─────────────────────────────────────

-- Éter adicional por nível de Ressonância: 30n + 5n²
CREATE OR REPLACE FUNCTION calc_resonance_eter(resonance_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (30 * resonance_level + 5 * resonance_level * resonance_level)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Custo em Essências para upar Ressonância: 50n + 10n²
CREATE OR REPLACE FUNCTION calc_resonance_cost(target_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (50 * target_level + 10 * target_level * target_level)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 5. ATUALIZA TABELA DE EXPEDIÇÕES ─────────────────────────────────────

UPDATE expedition_types SET
  success_formula = '{
    "base_chance": 75,
    "ataque_weight": 0.1,
    "magia_weight": 0.1,
    "velocidade_weight": 0.05
  }'::jsonb
WHERE risk_level = 'seguro';

UPDATE expedition_types SET
  success_formula = '{
    "base_chance": 55,
    "ataque_weight": 0.15,
    "magia_weight": 0.15,
    "velocidade_weight": 0.1
  }'::jsonb
WHERE risk_level = 'moderado';

UPDATE expedition_types SET
  success_formula = '{
    "base_chance": 35,
    "ataque_weight": 0.2,
    "magia_weight": 0.2,
    "velocidade_weight": 0.15,
    "precisao_weight": 0.1
  }'::jsonb
WHERE risk_level = 'perigoso';

UPDATE expedition_types SET
  success_formula = '{
    "base_chance": 15,
    "ataque_weight": 0.25,
    "magia_weight": 0.25,
    "velocidade_weight": 0.2,
    "precisao_weight": 0.15,
    "vitalidade_weight": 0.1
  }'::jsonb
WHERE risk_level = 'extremo';

UPDATE expedition_types SET
  loot_table = '{
    "xp": 100,
    "libras": {"min": 40, "max": 80},
    "essencia_chance": 0,
    "material_chance": 0.1,
    "rare_chance": 0.02,
    "lore_chance": 0.05
  }'::jsonb
WHERE risk_level = 'seguro';

UPDATE expedition_types SET
  loot_table = '{
    "xp": 220,
    "libras": {"min": 100, "max": 200},
    "essencia_chance": 0.3,
    "essencia_amount": 5,
    "material_chance": 0.25,
    "rare_chance": 0.05,
    "lore_chance": 0.1
  }'::jsonb
WHERE risk_level = 'moderado';

UPDATE expedition_types SET
  loot_table = '{
    "xp": 425,
    "libras": {"min": 220, "max": 400},
    "essencia_chance": 0.4,
    "essencia_amount": 15,
    "material_chance": 0.4,
    "rare_chance": 0.1,
    "lore_chance": 0.15
  }'::jsonb
WHERE risk_level = 'perigoso';

UPDATE expedition_types SET
  loot_table = '{
    "xp": 750,
    "libras": {"min": 450, "max": 800},
    "essencia_chance": 0.5,
    "essencia_amount": 30,
    "material_chance": 0.6,
    "rare_chance": 0.2,
    "lore_chance": 0.25
  }'::jsonb
WHERE risk_level = 'extremo';

-- ─── 6. AJUSTA CUSTO DE TROPAS ────────────────────────────────────────────

-- (Tropas são gerenciadas via código em war.ts — atualizar constantes lá)
-- Este comentário serve como lembrete para atualizar RECRUITMENT_COST em
-- lib/game/war.ts:
-- infantaria: 30, cavalaria: 80, arquearia: 50, cerco: 130

-- ─── 7. TABELA DE PONTOS LIVRES POR NÍVEL ────────────────────────────────

-- Humanos ganham 4 pontos livres por nível, outras raças ganham 3
-- Implementado em lib/game/attributes.ts via metadata de raça

-- ─── 8. RLS PARA XP TABLE ─────────────────────────────────────────────────

ALTER TABLE xp_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_table_read_all" ON xp_table
  FOR SELECT USING (TRUE);
CREATE POLICY "xp_table_gm_write" ON xp_table
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- ─── 9. ÍNDICE ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_xp_table_level ON xp_table(level);
