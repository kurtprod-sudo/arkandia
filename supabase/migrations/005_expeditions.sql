-- ===========================================================================
-- Fase 6 — Sistema de Expedições Idle
-- Referência: GDD_Sistemas §3
-- ===========================================================================

-- Tipos de expedição disponíveis (configurados pelo GM via seed)
CREATE TABLE expedition_types (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  subtype          TEXT NOT NULL
    CHECK (subtype IN ('exploracao', 'caca', 'investigacao', 'missao_faccao')),
  risk_level       TEXT NOT NULL
    CHECK (risk_level IN ('seguro', 'moderado', 'perigoso', 'extremo')),
  duration_hours   INTEGER NOT NULL CHECK (duration_hours BETWEEN 1 AND 12),
  description      TEXT NOT NULL,
  loot_table       JSONB DEFAULT '{}',
  success_formula  JSONB DEFAULT '{}',
  required_faction_slug TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Expedições ativas e históricas por personagem
CREATE TABLE expeditions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id   UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  type_id        UUID NOT NULL REFERENCES expedition_types(id),
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'failed')),
  risk_level     TEXT NOT NULL,
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  ends_at        TIMESTAMPTZ NOT NULL,
  result         JSONB,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE expedition_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expedition_types_read_all" ON expedition_types
  FOR SELECT USING (TRUE);
CREATE POLICY "expedition_types_gm_write" ON expedition_types
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE expeditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expeditions_owner" ON expeditions
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_expeditions_character_id ON expeditions(character_id);
CREATE INDEX idx_expeditions_status ON expeditions(status);
CREATE INDEX idx_expeditions_ends_at ON expeditions(ends_at);

-- ===========================================================================
-- Seed: tipos de expedição iniciais
-- ===========================================================================
INSERT INTO expedition_types
  (name, subtype, risk_level, duration_hours, description, loot_table, success_formula)
VALUES
('Patrulha dos Arredores', 'exploracao', 'seguro', 2,
 'Reconhecimento das terras próximas à Bastilha Velada. Baixo risco, recompensa modesta.',
 '{"xp": 50, "libras": {"min": 20, "max": 60}}',
 '{"base_chance": 90, "ataque_weight": 0.1}'
),
('Caçada Menor', 'caca', 'moderado', 4,
 'Rastreamento de criaturas menores nas bordas da floresta.',
 '{"xp": 120, "libras": {"min": 50, "max": 150}, "material_chance": 0.3}',
 '{"base_chance": 70, "ataque_weight": 0.3, "velocidade_weight": 0.2}'
),
('Investigação de Ruínas', 'investigacao', 'moderado', 6,
 'Exploração de ruínas próximas em busca de fragmentos de lore.',
 '{"xp": 150, "libras": {"min": 40, "max": 120}, "lore_chance": 0.4}',
 '{"base_chance": 65, "magia_weight": 0.3, "precisao_weight": 0.2}'
),
('Caçada Perigosa', 'caca', 'perigoso', 8,
 'Criaturas de maior porte em território hostil. Risco real de ferimento.',
 '{"xp": 250, "libras": {"min": 100, "max": 300}, "material_chance": 0.6, "rare_chance": 0.1}',
 '{"base_chance": 50, "ataque_weight": 0.4, "vitalidade_weight": 0.2}'
),
('Missão de Reconhecimento', 'exploracao', 'perigoso', 10,
 'Infiltração em território controlado por facções hostis.',
 '{"xp": 300, "libras": {"min": 150, "max": 400}, "lore_chance": 0.5}',
 '{"base_chance": 45, "velocidade_weight": 0.3, "precisao_weight": 0.3}'
),
('Expedição Extrema', 'investigacao', 'extremo', 12,
 'Missão de alto risco em território completamente desconhecido.',
 '{"xp": 500, "libras": {"min": 300, "max": 800}, "rare_chance": 0.3, "lore_chance": 0.6}',
 '{"base_chance": 30, "ataque_weight": 0.2, "magia_weight": 0.2, "vitalidade_weight": 0.2}'
);
