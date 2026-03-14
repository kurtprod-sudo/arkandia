-- ============================================================================
-- FASE 11 — Cenários Sociais (RP in-character)
-- ============================================================================

CREATE TABLE social_scenarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  location     TEXT NOT NULL,
  max_players  INTEGER NOT NULL DEFAULT 6,
  is_active    BOOLEAN DEFAULT TRUE,
  is_private   BOOLEAN DEFAULT FALSE,
  created_by   UUID REFERENCES characters(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scenario_presence (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id  UUID NOT NULL REFERENCES social_scenarios(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scenario_id, character_id)
);

CREATE TABLE scenario_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id  UUID NOT NULL REFERENCES social_scenarios(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id),
  content      TEXT NOT NULL,
  is_ooc       BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE social_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenarios_read_active" ON social_scenarios
  FOR SELECT USING (is_active = TRUE OR get_user_role(auth.uid()) = 'gm');
CREATE POLICY "scenarios_gm_write" ON social_scenarios
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');
CREATE POLICY "scenarios_player_insert" ON social_scenarios
  FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

ALTER TABLE scenario_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "presence_read_all" ON scenario_presence
  FOR SELECT USING (TRUE);
CREATE POLICY "presence_owner" ON scenario_presence
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "presence_leave" ON scenario_presence
  FOR DELETE USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE scenario_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read_participants" ON scenario_messages
  FOR SELECT USING (
    scenario_id IN (
      SELECT scenario_id FROM scenario_presence
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "messages_insert_participants" ON scenario_messages
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    AND scenario_id IN (
      SELECT scenario_id FROM scenario_presence
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    )
  );

-- Índices
CREATE INDEX idx_scenario_presence_scenario ON scenario_presence(scenario_id);
CREATE INDEX idx_scenario_presence_character ON scenario_presence(character_id);
CREATE INDEX idx_scenario_messages_scenario ON scenario_messages(scenario_id, created_at);

-- Seed: cenários iniciais
INSERT INTO social_scenarios (name, description, location, max_players, is_active)
VALUES
('Taverna do Escudo Partido',
 'O estabelecimento mais frequentado da Bastilha Velada. Cheira a cerveja barata e segredos caros.',
 'Bastilha Velada, Vallaeon', 8, TRUE),
('Mercado das Almas',
 'A praça central onde comerciantes, mercenários e curiosos se cruzam todo amanhecer.',
 'Bastilha Velada, Vallaeon', 10, TRUE),
('Sala de Briefing da Expedição',
 'Sala reservada para missões da Expedição Régia. Acesso restrito a membros.',
 'Quartel da Expedição Régia, Bastilha Velada', 6, TRUE),
('Beco dos Sussurros',
 'Uma viela escura onde negócios discretos acontecem. Ninguém faz perguntas.',
 'Bastilha Velada, Vallaeon', 4, TRUE);
