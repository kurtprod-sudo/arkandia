-- ============================================================================
-- FASE 10 — Sistema de Avatar Visual gerado por IA
-- ============================================================================

-- Histórico de avatares por personagem
CREATE TABLE avatar_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  prompt_used  TEXT NOT NULL,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('creation', 'rework', 'maestria_lendaria', 'item_especial')),
  gemas_spent  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna de características físicas em characters
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS physical_traits TEXT;

-- RLS
ALTER TABLE avatar_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avatar_history_owner" ON avatar_history
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "avatar_history_read_public" ON avatar_history
  FOR SELECT USING (TRUE);

-- Índice
CREATE INDEX idx_avatar_history_character_id
  ON avatar_history(character_id, created_at DESC);
