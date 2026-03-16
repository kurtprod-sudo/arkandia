-- ============================================================================
-- FASE 30 — Coliseu (PvP Assíncrono Ranqueado)
-- ============================================================================

CREATE TABLE character_mirrors (
  character_id      UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  attrs_snapshot    JSONB NOT NULL DEFAULT '{}',
  building_snapshot JSONB NOT NULL DEFAULT '[]',
  coliseu_points    INTEGER NOT NULL DEFAULT 500,
  wins              INTEGER NOT NULL DEFAULT 0,
  losses            INTEGER NOT NULL DEFAULT 0,
  daily_challenges_used INTEGER NOT NULL DEFAULT 0,
  last_challenge_date   DATE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coliseu_challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id       UUID NOT NULL REFERENCES characters(id),
  defender_mirror_id  UUID NOT NULL REFERENCES characters(id),
  challenger_points_before INTEGER NOT NULL,
  defender_points_before   INTEGER NOT NULL,
  points_delta        INTEGER NOT NULL,
  result              TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  combat_log          JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coliseu_seasons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  rewards_distributed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE character_mirrors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mirrors_read_all" ON character_mirrors FOR SELECT USING (TRUE);
CREATE POLICY "mirrors_owner_write" ON character_mirrors FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

ALTER TABLE coliseu_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_read_all" ON coliseu_challenges FOR SELECT USING (TRUE);
CREATE POLICY "challenges_owner" ON coliseu_challenges FOR INSERT WITH CHECK (
  challenger_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

ALTER TABLE coliseu_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_read_all" ON coliseu_seasons FOR SELECT USING (TRUE);
CREATE POLICY "seasons_gm_write" ON coliseu_seasons FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE INDEX idx_mirrors_points ON character_mirrors(coliseu_points DESC);
CREATE INDEX idx_challenges_challenger ON coliseu_challenges(challenger_id);
CREATE INDEX idx_challenges_defender ON coliseu_challenges(defender_mirror_id);
CREATE INDEX idx_challenges_created ON coliseu_challenges(created_at DESC);
CREATE INDEX idx_seasons_status ON coliseu_seasons(status);

INSERT INTO coliseu_seasons (starts_at, ends_at, status)
VALUES (NOW(), NOW() + INTERVAL '15 days', 'active');
