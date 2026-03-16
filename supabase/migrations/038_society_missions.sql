-- ============================================================================
-- FASE 35 — Missões Coletivas de Sociedade
-- Referência: GDD_Sociedades §10, GDD_Sistemas §6.16
-- ============================================================================

CREATE TABLE society_missions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id            UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  week_start            DATE NOT NULL,
  missions              JSONB NOT NULL DEFAULT '[]',
  bonus_unlocked        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(society_id, week_start)
);

ALTER TABLE society_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "society_missions_read" ON society_missions FOR SELECT USING (
  society_id IN (
    SELECT society_id FROM society_members
    WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  ) OR get_user_role(auth.uid()) = 'gm'
);
CREATE POLICY "society_missions_system_write" ON society_missions FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE INDEX idx_society_missions_society_week ON society_missions(society_id, week_start DESC);
CREATE INDEX idx_society_missions_week ON society_missions(week_start);

CREATE TRIGGER trg_society_missions_updated_at BEFORE UPDATE ON society_missions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
