-- ============================================================================
-- FASE 15 — Sistema de Summon (Gacha)
-- Referência: GDD_Sistemas §4.4
-- ============================================================================

-- Catálogos de summon (configurados pelo GM)
CREATE TABLE summon_catalogs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  cost_gemas   INTEGER NOT NULL DEFAULT 10,
  cost_tickets INTEGER NOT NULL DEFAULT 0,
  pity_threshold INTEGER NOT NULL DEFAULT 50,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Itens dentro de um catálogo com probabilidades
CREATE TABLE summon_catalog_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id  UUID NOT NULL REFERENCES summon_catalogs(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items(id),
  quantity    INTEGER NOT NULL DEFAULT 1,
  weight      INTEGER NOT NULL DEFAULT 100,
  is_pity_eligible BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de summons por personagem
CREATE TABLE summon_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  catalog_id   UUID NOT NULL REFERENCES summon_catalogs(id),
  item_id      UUID NOT NULL REFERENCES items(id),
  quantity     INTEGER NOT NULL DEFAULT 1,
  cost_type    TEXT NOT NULL CHECK (cost_type IN ('gemas', 'ticket')),
  cost_amount  INTEGER NOT NULL DEFAULT 0,
  was_pity     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Contador de pity por personagem por catálogo
CREATE TABLE summon_pity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  catalog_id   UUID NOT NULL REFERENCES summon_catalogs(id),
  pulls_since_rare INTEGER NOT NULL DEFAULT 0,
  total_pulls  INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, catalog_id)
);

-- Tickets de summon no inventário (campo separado da wallet)
ALTER TABLE character_wallet
  ADD COLUMN IF NOT EXISTS summon_tickets INTEGER NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE summon_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summon_catalogs_read_active" ON summon_catalogs
  FOR SELECT USING (is_active = TRUE OR get_user_role(auth.uid()) = 'gm');
CREATE POLICY "summon_catalogs_gm_write" ON summon_catalogs
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE summon_catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summon_catalog_items_read" ON summon_catalog_items
  FOR SELECT USING (TRUE);
CREATE POLICY "summon_catalog_items_gm_write" ON summon_catalog_items
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE summon_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summon_history_owner" ON summon_history
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE summon_pity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "summon_pity_owner" ON summon_pity
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_summon_catalog_items_catalog ON summon_catalog_items(catalog_id);
CREATE INDEX idx_summon_history_character ON summon_history(character_id);
CREATE INDEX idx_summon_history_catalog ON summon_history(catalog_id);
CREATE INDEX idx_summon_pity_character_catalog ON summon_pity(character_id, catalog_id);

-- Triggers
CREATE TRIGGER trg_summon_catalogs_updated_at
  BEFORE UPDATE ON summon_catalogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_summon_pity_updated_at
  BEFORE UPDATE ON summon_pity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed: catálogo inicial
INSERT INTO summon_catalogs
  (name, description, cost_gemas, cost_tickets, pity_threshold)
VALUES
('Caixa do Viajante',
 'Itens básicos para aventureiros iniciantes. Materiais, consumíveis e raridades ocasionais.',
 10, 1, 30);
