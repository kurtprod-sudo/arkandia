-- ============================================================================
-- FASE 17 — Diário e Correspondência
-- Referência: GDD_Sistemas §6.7 e §6.5
-- ============================================================================

-- Entradas do diário
CREATE TABLE diary_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  is_lore_confirmed BOOLEAN DEFAULT FALSE,
  lore_confirmed_by UUID REFERENCES characters(id),
  lore_confirmed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Reações a entradas do diário
CREATE TABLE diary_reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  symbol       TEXT NOT NULL
    CHECK (symbol IN ('chama', 'espada', 'estrela', 'lacre', 'corvo')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, character_id)
);

-- Correspondências entre personagens
CREATE TABLE letters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID NOT NULL REFERENCES characters(id),
  recipient_id    UUID NOT NULL REFERENCES characters(id),
  subject         TEXT NOT NULL,
  content         TEXT NOT NULL,
  parent_id       UUID REFERENCES letters(id),
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diary_entries_read_all" ON diary_entries
  FOR SELECT USING (TRUE);
CREATE POLICY "diary_entries_owner_write" ON diary_entries
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "diary_entries_owner_update" ON diary_entries
  FOR UPDATE USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "diary_entries_owner_delete" ON diary_entries
  FOR DELETE USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE diary_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diary_reactions_read_all" ON diary_reactions
  FOR SELECT USING (TRUE);
CREATE POLICY "diary_reactions_owner" ON diary_reactions
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "letters_participants" ON letters
  FOR SELECT USING (
    sender_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "letters_sender_insert" ON letters
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "letters_recipient_update" ON letters
  FOR UPDATE USING (
    recipient_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_diary_entries_character ON diary_entries(character_id, created_at DESC);
CREATE INDEX idx_diary_reactions_entry ON diary_reactions(entry_id);
CREATE INDEX idx_letters_recipient ON letters(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_letters_sender ON letters(sender_id, created_at DESC);
CREATE INDEX idx_letters_parent ON letters(parent_id);

-- Trigger updated_at para diary_entries
CREATE TRIGGER trg_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
