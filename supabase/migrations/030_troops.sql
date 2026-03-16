-- ============================================================================
-- FASE 26 — Tropas e Expedições com Tropas (CORRIGIDA)
-- Schema real: expedition_types (id, name, subtype, risk_level, duration_hours,
--   description, loot_table, success_formula, required_faction_slug, is_active)
-- Schema real: expeditions (id, character_id, type_id, status, risk_level,
--   started_at, ends_at, result, resolved_at)
-- ============================================================================

-- Estoque de tropas por personagem
CREATE TABLE character_troops (
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  troop_type    TEXT NOT NULL
    CHECK (troop_type IN ('infantaria', 'arquearia', 'cavalaria', 'cerco')),
  quantity      INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (character_id, troop_type)
);

-- Fila de recrutamento sequencial por personagem
CREATE TABLE recruitment_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  troop_type    TEXT NOT NULL
    CHECK (troop_type IN ('infantaria', 'arquearia', 'cavalaria', 'cerco')),
  quantity      INTEGER NOT NULL,
  libras_spent  INTEGER NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Colunas de tropas na tabela expeditions
ALTER TABLE expeditions
  ADD COLUMN IF NOT EXISTS troops_deployed JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS troop_losses    JSONB DEFAULT NULL;

-- RLS
ALTER TABLE character_troops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "troops_owner" ON character_troops
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE recruitment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recruitment_owner" ON recruitment_queue
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_character_troops_character ON character_troops(character_id);
CREATE INDEX idx_recruitment_queue_character ON recruitment_queue(character_id);
CREATE INDEX idx_recruitment_queue_active
  ON recruitment_queue(character_id, completed, ends_at)
  WHERE completed = FALSE;

-- Seed: 3 novos expedition_types com tropas
-- resistance_type e troop_expedition ficam dentro de success_formula (JSONB)
-- min_level validado por código: moderado=5, perigoso=8, extremo=12
INSERT INTO expedition_types
  (name, subtype, risk_level, duration_hours, description, loot_table, success_formula, is_active)
VALUES
  (
    'Escolta de Comboio',
    'missao_faccao',
    'moderado',
    2,
    'Escolte um comboio valioso através de território hostil usando suas tropas.',
    '{"xp": 180, "libras": {"min": 120, "max": 240}}',
    '{"base_chance": 55, "ataque_weight": 0.15, "magia_weight": 0.15, "velocidade_weight": 0.1, "resistance_type": "cavalaria", "troop_expedition": true}',
    TRUE
  ),
  (
    'Conquista de Ponto Estratégico',
    'missao_faccao',
    'perigoso',
    3,
    'Tome controle de um ponto estratégico defendido por forças inimigas.',
    '{"xp": 280, "libras": {"min": 200, "max": 400}}',
    '{"base_chance": 35, "ataque_weight": 0.2, "magia_weight": 0.2, "velocidade_weight": 0.15, "precisao_weight": 0.1, "resistance_type": "infantaria", "troop_expedition": true}',
    TRUE
  ),
  (
    'Raid Relâmpago',
    'missao_faccao',
    'extremo',
    4,
    'Ataque surpresa em território inimigo. Alta recompensa, risco máximo.',
    '{"xp": 420, "libras": {"min": 320, "max": 600}}',
    '{"base_chance": 15, "ataque_weight": 0.25, "magia_weight": 0.25, "velocidade_weight": 0.2, "precisao_weight": 0.15, "vitalidade_weight": 0.1, "resistance_type": "arquearia", "troop_expedition": true}',
    TRUE
  );