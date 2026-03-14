-- ============================================================================
-- FASE 20 — Dungeons em Grupo
-- Referência: GDD_Sistemas §3
-- ============================================================================

-- Tipos de dungeon disponíveis
CREATE TABLE dungeon_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  difficulty    TEXT NOT NULL
    CHECK (difficulty IN ('normal', 'dificil', 'lendario')),
  min_players   INTEGER NOT NULL DEFAULT 2,
  max_players   INTEGER NOT NULL DEFAULT 4,
  min_level     INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  phases        INTEGER NOT NULL DEFAULT 3,
  base_xp_reward    INTEGER NOT NULL DEFAULT 100,
  base_libras_reward INTEGER NOT NULL DEFAULT 50,
  loot_table    JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de dungeon
CREATE TABLE dungeon_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dungeon_type_id UUID NOT NULL REFERENCES dungeon_types(id),
  leader_id       UUID NOT NULL REFERENCES characters(id),
  status          TEXT NOT NULL DEFAULT 'recruiting'
    CHECK (status IN ('recruiting', 'active', 'finished', 'failed', 'cancelled')),
  difficulty      TEXT NOT NULL
    CHECK (difficulty IN ('normal', 'dificil', 'lendario')),
  current_phase   INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  result          TEXT CHECK (result IN ('success', 'partial', 'failure')),
  phase_log       JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes de dungeon
CREATE TABLE dungeon_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES dungeon_sessions(id) ON DELETE CASCADE,
  character_id    UUID NOT NULL REFERENCES characters(id),
  status          TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'ready', 'active', 'fallen', 'survived')),
  hp_final        INTEGER,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, character_id)
);

-- Recompensas distribuídas por dungeon
CREATE TABLE dungeon_rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES dungeon_sessions(id) ON DELETE CASCADE,
  character_id    UUID NOT NULL REFERENCES characters(id),
  xp_granted      INTEGER NOT NULL DEFAULT 0,
  libras_granted  INTEGER NOT NULL DEFAULT 0,
  items_granted   JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE dungeon_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dungeon_types_read_all" ON dungeon_types
  FOR SELECT USING (TRUE);
CREATE POLICY "dungeon_types_gm_write" ON dungeon_types
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE dungeon_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dungeon_sessions_participants_read" ON dungeon_sessions
  FOR SELECT USING (
    id IN (
      SELECT session_id FROM dungeon_participants
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "dungeon_sessions_leader_insert" ON dungeon_sessions
  FOR INSERT WITH CHECK (
    leader_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "dungeon_sessions_update" ON dungeon_sessions
  FOR UPDATE USING (
    leader_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE dungeon_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dungeon_participants_read" ON dungeon_participants
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM dungeon_participants dp2
      WHERE dp2.character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "dungeon_participants_insert" ON dungeon_participants
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "dungeon_participants_update" ON dungeon_participants
  FOR UPDATE USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE dungeon_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dungeon_rewards_owner" ON dungeon_rewards
  FOR SELECT USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_dungeon_sessions_leader ON dungeon_sessions(leader_id);
CREATE INDEX idx_dungeon_sessions_status ON dungeon_sessions(status);
CREATE INDEX idx_dungeon_participants_session ON dungeon_participants(session_id);
CREATE INDEX idx_dungeon_participants_character ON dungeon_participants(character_id);
CREATE INDEX idx_dungeon_rewards_session ON dungeon_rewards(session_id);
CREATE INDEX idx_dungeon_rewards_character ON dungeon_rewards(character_id);

-- Trigger updated_at
CREATE TRIGGER trg_dungeon_sessions_updated_at
  BEFORE UPDATE ON dungeon_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed: tipos de dungeon iniciais
INSERT INTO dungeon_types
  (name, description, difficulty, min_players, max_players, min_level,
   duration_minutes, phases, base_xp_reward, base_libras_reward, loot_table)
VALUES
('Ruínas de Thar-Halum',
 'As ruínas antigas escondem criaturas do esquecimento e fragmentos de lore perdido.',
 'normal', 2, 4, 1, 20, 3, 150, 80,
 '[{"item_id": null, "chance": 0.3, "quantity": 1, "item_name": "Fragmento de Lore"}]'),

('Minas Profundas de Düren',
 'Galerias infestadas por guardiões de pedra. Ricas em minério etéreo para quem sobreviver.',
 'dificil', 2, 4, 5, 30, 3, 300, 150,
 '[{"item_id": null, "chance": 0.5, "quantity": 2, "item_name": "Minério Etéreo"}]'),

('Câmara do Arquétipo Corrompido',
 'Uma câmara selada onde um Arquétipo foi corrompido. Apenas os mais preparados entram.',
 'lendario', 3, 4, 10, 45, 3, 600, 300,
 '[{"item_id": null, "chance": 0.2, "quantity": 1, "item_name": "Pergaminho de Classe de Prestígio"}]');
