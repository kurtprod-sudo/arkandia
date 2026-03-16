-- ============================================================================
-- FASE 27 — Desafio Diário de Combate + Eventos de Mundo
-- Referência: GDD_Sistemas §6.5
-- ============================================================================

CREATE TABLE daily_challenges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id     UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  challenge_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  npc_snapshot     JSONB NOT NULL,
  combat_session_id UUID REFERENCES combat_sessions(id),
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  won              BOOLEAN,
  reward_claimed   BOOLEAN NOT NULL DEFAULT FALSE,
  current_streak   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, challenge_date)
);

CREATE TABLE world_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN (
    'monolito', 'invasao_faccao', 'passagem_imperador',
    'torneio', 'crise_politica', 'catalogo_lendario'
  )),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended')),
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at     TIMESTAMPTZ,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_by  UUID NOT NULL REFERENCES characters(id),
  ended_by    UUID REFERENCES characters(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_challenges_owner" ON daily_challenges
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "world_events_read_all" ON world_events FOR SELECT USING (TRUE);
CREATE POLICY "world_events_gm_write" ON world_events FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE INDEX idx_daily_challenges_character_date ON daily_challenges(character_id, challenge_date DESC);
CREATE INDEX idx_daily_challenges_uncompleted ON daily_challenges(character_id, completed) WHERE completed = FALSE;
CREATE INDEX idx_world_events_status ON world_events(status);
CREATE INDEX idx_world_events_type ON world_events(type);
CREATE INDEX idx_world_events_created ON world_events(created_at DESC);
