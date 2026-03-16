-- ============================================================================
-- 028_shop_eco_lendarias.sql — Loja NPC, Eco do Arquétipo, Lendárias
-- ============================================================================

-- ─── 1. LOJA NPC DIÁRIA ──────────────────────────────────────────────────

CREATE TABLE npc_shop_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  item_id         UUID REFERENCES items(id),
  reward_type     TEXT NOT NULL
    CHECK (reward_type IN ('item', 'libras', 'essencia', 'ticket', 'xp')),
  reward_amount   INTEGER,
  price_libras    INTEGER NOT NULL DEFAULT 0,
  price_gemas     INTEGER NOT NULL DEFAULT 0,
  rarity          TEXT NOT NULL DEFAULT 'comum'
    CHECK (rarity IN ('comum', 'incomum', 'raro', 'epico', 'lendario')),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_npc_shop (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  shop_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  item_id         UUID NOT NULL REFERENCES npc_shop_items(id),
  purchased       BOOLEAN DEFAULT FALSE,
  purchased_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, shop_date)
);

-- ─── 2. ECO DO ARQUÉTIPO ─────────────────────────────────────────────────

CREATE TABLE archetype_echoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  echo_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  archetype       TEXT NOT NULL,
  content         TEXT NOT NULL,
  essencia_reward INTEGER NOT NULL DEFAULT 5,
  claimed         BOOLEAN DEFAULT FALSE,
  claimed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, echo_date)
);

-- ─── 3. LOJA SAZONAL DE LENDÁRIAS ────────────────────────────────────────

CREATE TABLE seasons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  theme           TEXT NOT NULL,
  lore_text       TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE seasonal_legendaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  maestria_id     UUID NOT NULL REFERENCES maestrias(id),
  price_gemas     INTEGER NOT NULL,
  is_exclusive    BOOLEAN DEFAULT TRUE,
  purchased_by    UUID REFERENCES characters(id),
  purchased_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, maestria_id)
);

-- ─── 4. FRAGMENTOS DE MAESTRIA ───────────────────────────────────────────

CREATE TABLE maestria_fragments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  fragment_type   TEXT NOT NULL DEFAULT 'prestígio',
  quantity        INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, fragment_type)
);

-- RLS
ALTER TABLE npc_shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_shop_items_read_all" ON npc_shop_items FOR SELECT USING (TRUE);
CREATE POLICY "npc_shop_items_gm_write" ON npc_shop_items FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE daily_npc_shop ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_npc_shop_owner" ON daily_npc_shop FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

ALTER TABLE archetype_echoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "archetype_echoes_owner" ON archetype_echoes FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_read_all" ON seasons FOR SELECT USING (TRUE);
CREATE POLICY "seasons_gm_write" ON seasons FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE seasonal_legendaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasonal_legendaries_read_all" ON seasonal_legendaries FOR SELECT USING (TRUE);
CREATE POLICY "seasonal_legendaries_gm_write" ON seasonal_legendaries FOR ALL USING (get_user_role(auth.uid()) = 'gm');
CREATE POLICY "seasonal_legendaries_purchase" ON seasonal_legendaries FOR UPDATE USING (
  purchased_by IS NULL OR purchased_by IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

ALTER TABLE maestria_fragments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maestria_fragments_owner" ON maestria_fragments FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

-- Índices
CREATE INDEX idx_daily_npc_shop_character_date ON daily_npc_shop(character_id, shop_date);
CREATE INDEX idx_archetype_echoes_character_date ON archetype_echoes(character_id, echo_date);
CREATE INDEX idx_seasonal_legendaries_season ON seasonal_legendaries(season_id);
CREATE INDEX idx_seasonal_legendaries_purchased ON seasonal_legendaries(purchased_by) WHERE purchased_by IS NOT NULL;

CREATE TRIGGER trg_maestria_fragments_updated_at
  BEFORE UPDATE ON maestria_fragments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SEED: Itens da Loja NPC ──────────────────────────────────────────────

INSERT INTO npc_shop_items (name, description, reward_type, reward_amount, price_libras, rarity) VALUES
('Tônico Etéreo', 'Uma ampola de Éter concentrado.', 'essencia', 10, 150, 'incomum'),
('Moeda do Viajante', 'Uma bolsa extra de Libras.', 'libras', 200, 0, 'comum'),
('Fragmento de Lore Selado', 'Um pergaminho lacrado com informações sobre Ellia.', 'essencia', 15, 200, 'raro'),
('Ticket de Invocação', 'Um ticket para o Santuário.', 'ticket', 1, 350, 'raro'),
('Essência Bruta', 'Fragmento de energia espiritual em estado puro.', 'essencia', 25, 500, 'epico'),
('Caixa Misteriosa do Viajante', 'Conteúdo desconhecido.', 'xp', 100, 300, 'incomum'),
('Cristal de Memória', 'Guarda o eco de uma batalha antiga.', 'essencia', 20, 400, 'raro'),
('Libras do Saque', 'Recuperadas de uma expedição de alto risco.', 'libras', 500, 0, 'epico');
