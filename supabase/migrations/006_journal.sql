-- ===========================================================================
-- Fase 7 — Jornal do Mundo (Gazeta do Horizonte)
-- Referência: GDD_Narrativa §3
-- ===========================================================================

-- Edições do jornal (geradas por IA ou pelo GM)
CREATE TABLE journal_editions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  sections      JSONB NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  generated_by  TEXT NOT NULL DEFAULT 'ai'
    CHECK (generated_by IN ('ai', 'gm')),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Flags de lore revelado (controle do GM sobre o que a IA pode referenciar)
CREATE TABLE journal_lore_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL,
  revealed_at  TIMESTAMPTZ DEFAULT NOW(),
  scope        TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global', 'faction', 'character')),
  target_id    UUID,
  created_by   TEXT DEFAULT 'gm'
);

-- RLS
ALTER TABLE journal_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_published_read" ON journal_editions
  FOR SELECT USING (status = 'published' OR get_user_role(auth.uid()) = 'gm');
CREATE POLICY "journal_gm_write" ON journal_editions
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE journal_lore_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lore_flags_gm_only" ON journal_lore_flags
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- Índices
CREATE INDEX idx_journal_editions_date ON journal_editions(edition_date DESC);
CREATE INDEX idx_journal_editions_status ON journal_editions(status);

-- Trigger de updated_at
CREATE TRIGGER trg_journal_editions_updated_at
  BEFORE UPDATE ON journal_editions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
