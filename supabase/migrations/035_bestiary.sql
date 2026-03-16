-- ============================================================================
-- FASE 31 — Bestiário
-- Referência: GDD_Sistemas §6.12
-- ============================================================================

CREATE TABLE npc_lore (
  npc_type_id        UUID PRIMARY KEY REFERENCES npc_types(id) ON DELETE CASCADE,
  lore_text          TEXT NOT NULL,
  first_discoverer_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  generated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_bestiary (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  npc_type_id        UUID NOT NULL REFERENCES npc_types(id) ON DELETE CASCADE,
  total_defeated     INTEGER NOT NULL DEFAULT 1,
  first_defeated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, npc_type_id)
);

ALTER TABLE npc_lore ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_lore_read_all" ON npc_lore FOR SELECT USING (TRUE);
CREATE POLICY "npc_lore_system_write" ON npc_lore FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE character_bestiary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bestiary_read_all" ON character_bestiary FOR SELECT USING (TRUE);
CREATE POLICY "bestiary_owner" ON character_bestiary FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

CREATE INDEX idx_npc_lore_npc ON npc_lore(npc_type_id);
CREATE INDEX idx_bestiary_character ON character_bestiary(character_id);
CREATE INDEX idx_bestiary_npc ON character_bestiary(npc_type_id);
CREATE INDEX idx_bestiary_character_npc ON character_bestiary(character_id, npc_type_id);

-- Títulos por zona
INSERT INTO title_definitions (name, description, category, trigger_type, trigger_condition, is_unique) VALUES
('Fantasma de Eryuell', 'Derrotou todas as criaturas da Floresta de Eryuell.', 'exploracao', 'automatico', '{"zone": "Floresta de Eryuell"}', FALSE),
('Forjador das Profundezas', 'Derrotou todas as criaturas das Minas de Düren.', 'exploracao', 'automatico', '{"zone": "Minas de Düren"}', FALSE),
('Algoz de Urgath', 'Derrotou todas as criaturas das Bordas de Urgath.', 'exploracao', 'automatico', '{"zone": "Bordas de Urgath"}', FALSE)
ON CONFLICT (name) DO NOTHING;
