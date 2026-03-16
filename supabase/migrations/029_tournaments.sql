-- ============================================================================
-- FASE 25 — Torneio PvP
-- Referência: GDD_Sistemas §1.10
-- ============================================================================

CREATE TABLE tournaments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  modality            TEXT NOT NULL DEFAULT 'torneio'
    CHECK (modality = 'torneio'),
  status              TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'bracket_generated', 'in_progress', 'finished')),
  max_participants    INTEGER NOT NULL CHECK (max_participants IN (8, 16, 32)),
  registration_ends_at TIMESTAMPTZ NOT NULL,
  starts_at           TIMESTAMPTZ,
  finished_at         TIMESTAMPTZ,
  prize_pool          JSONB NOT NULL DEFAULT '{
    "first":  { "libras": 0, "gemas": 0 },
    "second": { "libras": 0, "gemas": 0 },
    "third":  { "libras": 0, "gemas": 0 }
  }',
  created_by          UUID NOT NULL REFERENCES characters(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_participants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  character_id   UUID NOT NULL REFERENCES characters(id),
  seed           INTEGER,
  registered_at  TIMESTAMPTZ DEFAULT NOW(),
  eliminated_at  TIMESTAMPTZ,
  final_position INTEGER,
  UNIQUE(tournament_id, character_id),
  UNIQUE(tournament_id, seed)
);

CREATE TABLE tournament_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round           INTEGER NOT NULL,
  match_number    INTEGER NOT NULL,
  participant_a_id UUID REFERENCES tournament_participants(id),
  participant_b_id UUID REFERENCES tournament_participants(id),
  winner_id       UUID REFERENCES tournament_participants(id),
  combat_session_id UUID REFERENCES combat_sessions(id),
  is_bye          BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'waiting_combat', 'finished')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, round, match_number)
);

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments_read_all" ON tournaments FOR SELECT USING (TRUE);
CREATE POLICY "tournaments_gm_write" ON tournaments FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournament_participants_read_all" ON tournament_participants FOR SELECT USING (TRUE);
CREATE POLICY "tournament_participants_player_insert" ON tournament_participants
  FOR INSERT WITH CHECK (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));
CREATE POLICY "tournament_participants_gm_write" ON tournament_participants FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournament_matches_read_all" ON tournament_matches FOR SELECT USING (TRUE);
CREATE POLICY "tournament_matches_gm_write" ON tournament_matches FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- Índices
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tp_tournament ON tournament_participants(tournament_id);
CREATE INDEX idx_tp_character ON tournament_participants(character_id);
CREATE INDEX idx_tm_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tm_combat_session ON tournament_matches(combat_session_id);

CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
