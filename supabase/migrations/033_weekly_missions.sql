-- ============================================================================
-- FASE 29 — Missões Semanais
-- Referência: GDD_Sistemas §6.10
-- ============================================================================

CREATE TABLE weekly_missions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id        UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  week_start          DATE NOT NULL,
  missions            JSONB NOT NULL DEFAULT '[]',
  completed_count     INTEGER NOT NULL DEFAULT 0,
  ticket_granted      BOOLEAN NOT NULL DEFAULT FALSE,
  early_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, week_start)
);

ALTER TABLE weekly_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_missions_owner" ON weekly_missions
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

CREATE INDEX idx_weekly_missions_character ON weekly_missions(character_id);
CREATE INDEX idx_weekly_missions_week ON weekly_missions(character_id, week_start DESC);
