-- ============================================================================
-- 027_moderation_onboarding.sql — Moderação e Onboarding
-- ============================================================================

-- ─── 1. MODERAÇÃO ────────────────────────────────────────────────────────

CREATE TABLE moderation_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id  UUID NOT NULL REFERENCES profiles(id),
  target_user_id UUID NOT NULL REFERENCES profiles(id),
  action        TEXT NOT NULL
    CHECK (action IN ('ban', 'unban', 'silence', 'unsilence', 'warn')),
  reason        TEXT NOT NULL,
  duration_hours INTEGER,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_until   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ban_reason     TEXT,
  ADD COLUMN IF NOT EXISTS is_silenced    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS silenced_until TIMESTAMPTZ;

ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderation_logs_gm_only" ON moderation_logs
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE INDEX idx_moderation_logs_target ON moderation_logs(target_user_id);
CREATE INDEX idx_moderation_logs_created ON moderation_logs(created_at DESC);

-- ─── 2. ONBOARDING ────────────────────────────────────────────────────────

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
