-- ============================================================================
-- 023_notifications.sql — Sistema de Notificações In-App
-- ============================================================================

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN (
    'expedition_done',
    'duel_received',
    'letter_received',
    'dungeon_invite',
    'society_invite',
    'war_declared',
    'level_up',
    'hunting_done',
    'resonance_unlocked',
    'general'
  )),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  action_url   TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_owner" ON notifications
  FOR ALL USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    ) OR get_user_role(auth.uid()) = 'gm'
  );

CREATE INDEX idx_notifications_character ON notifications(character_id);
CREATE INDEX idx_notifications_unread ON notifications(character_id, is_read)
  WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(character_id, created_at DESC);
