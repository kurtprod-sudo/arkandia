-- ============================================================================
-- FASE 32+33 — Battle Pass + Ranking Sazonal
-- ============================================================================

CREATE TABLE character_battle_pass (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id   UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  season_id      UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  season_xp      INTEGER NOT NULL DEFAULT 0,
  current_tier   INTEGER NOT NULL DEFAULT 0,
  is_premium     BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, season_id)
);

CREATE TABLE battle_pass_claims (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id   UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  season_id      UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  tier           INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 40),
  track          TEXT NOT NULL CHECK (track IN ('free', 'premium')),
  claimed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, season_id, tier, track)
);

CREATE TABLE season_ranking_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id    UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_name  TEXT NOT NULL,
  score        INTEGER NOT NULL,
  rank_position INTEGER NOT NULL,
  metadata     JSONB DEFAULT '{}',
  snapshotted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE character_battle_pass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_pass_owner" ON character_battle_pass FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

ALTER TABLE battle_pass_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_pass_claims_owner" ON battle_pass_claims FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);
CREATE POLICY "battle_pass_claims_read_all" ON battle_pass_claims FOR SELECT USING (TRUE);

ALTER TABLE season_ranking_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_snapshots_read_all" ON season_ranking_snapshots FOR SELECT USING (TRUE);
CREATE POLICY "season_snapshots_gm_write" ON season_ranking_snapshots FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE INDEX idx_cbp_character_season ON character_battle_pass(character_id, season_id);
CREATE INDEX idx_cbp_season ON character_battle_pass(season_id);
CREATE INDEX idx_bpc_character_season ON battle_pass_claims(character_id, season_id);
CREATE INDEX idx_season_snapshots_season ON season_ranking_snapshots(season_id, category, rank_position);

CREATE TRIGGER trg_cbp_updated_at BEFORE UPDATE ON character_battle_pass FOR EACH ROW EXECUTE FUNCTION update_updated_at();
