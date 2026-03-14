-- ============================================================================
-- FASE 16 — Rankings e Títulos
-- Referência: GDD_Sistemas §6.3 e §6.4
-- ============================================================================

-- Definição de títulos disponíveis
CREATE TABLE title_definitions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL,
  category     TEXT NOT NULL
    CHECK (category IN ('progressao', 'guerra', 'exploracao', 'maestria', 'especial', 'gm')),
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('automatico', 'gm_manual', 'primeiro_a')),
  trigger_condition JSONB DEFAULT '{}',
  is_unique    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Títulos adquiridos por personagem
CREATE TABLE character_titles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title_id     UUID NOT NULL REFERENCES title_definitions(id),
  granted_by   TEXT NOT NULL DEFAULT 'system'
    CHECK (granted_by IN ('system', 'gm')),
  granted_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, title_id)
);

-- Rankings (snapshot atualizado pelo cron)
CREATE TABLE rankings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     TEXT NOT NULL
    CHECK (category IN (
      'maiores_guerreiros',
      'sociedades_dominantes',
      'exploradores',
      'primeiros_maestria',
      'herois_guerra'
    )),
  entity_id    UUID NOT NULL,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('character', 'society')),
  entity_name  TEXT NOT NULL,
  score        INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER,
  metadata     JSONB DEFAULT '{}',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE title_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "title_definitions_read_all" ON title_definitions
  FOR SELECT USING (TRUE);
CREATE POLICY "title_definitions_gm_write" ON title_definitions
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE character_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_titles_read_all" ON character_titles
  FOR SELECT USING (TRUE);
CREATE POLICY "character_titles_owner" ON character_titles
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "character_titles_gm_delete" ON character_titles
  FOR DELETE USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rankings_read_all" ON rankings
  FOR SELECT USING (TRUE);
CREATE POLICY "rankings_gm_write" ON rankings
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- Índices
CREATE INDEX idx_character_titles_character ON character_titles(character_id);
CREATE INDEX idx_character_titles_title ON character_titles(title_id);
CREATE INDEX idx_rankings_category ON rankings(category, rank_position);
CREATE INDEX idx_rankings_entity ON rankings(entity_id);

-- Seed: títulos iniciais canônicos
INSERT INTO title_definitions
  (name, description, category, trigger_type, trigger_condition, is_unique)
VALUES
('Portador de Segredo',
 'Descobriu algo que poucos sabem. O peso deste conhecimento é visível.',
 'especial', 'gm_manual', '{}', FALSE),

('Primeiro do Eco',
 'Primeiro a despertar uma Ressonância no servidor.',
 'progressao', 'primeiro_a', '{"event": "resonance_unlocked"}', TRUE),

('Sobrevivente de Thar-Halum',
 'Explorou as Ruínas de Thar-Halum e voltou.',
 'exploracao', 'gm_manual', '{}', FALSE),

('Fundador',
 'Fundou uma Sociedade em Arkandia.',
 'progressao', 'automatico', '{"event": "society_founded"}', FALSE),

('Sem Derrota',
 'Venceu 10 duelos ranqueados consecutivos sem derrota.',
 'guerra', 'automatico', '{"event": "battle_result", "consecutive_wins": 10}', FALSE),

('Arauto da Gazeta',
 'Citado no Jornal do Mundo pela primeira vez.',
 'especial', 'gm_manual', '{}', FALSE),

('Veterano de Guerra',
 'Participou de 3 ou mais guerras de território.',
 'guerra', 'automatico', '{"event": "war_finished", "min_wars": 3}', FALSE),

('Lâmina Lendária',
 'Primeiro a adquirir uma Maestria Lendária.',
 'maestria', 'primeiro_a', '{"event": "maestria_acquired", "category": "lendaria"}', TRUE),

('Escolhido pelo Arquétipo',
 'Atingiu o nível máximo de Ressonância.',
 'maestria', 'automatico', '{"event": "resonance_upgraded", "max_level": true}', FALSE),

('Errante',
 'Completou 50 expedições.',
 'exploracao', 'automatico', '{"event": "expedition_completed", "total": 50}', FALSE);
