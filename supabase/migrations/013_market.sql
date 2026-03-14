-- ============================================================================
-- FASE 14 — Mercado e Economia
-- Referência: GDD_Sistemas §4
-- ============================================================================

-- Catálogo de itens do jogo
CREATE TABLE items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  item_type    TEXT NOT NULL
    CHECK (item_type IN ('material', 'equipamento', 'consumivel', 'especial', 'pergaminho')),
  rarity       TEXT NOT NULL DEFAULT 'comum'
    CHECK (rarity IN ('comum', 'incomum', 'raro', 'epico', 'lendario')),
  is_tradeable BOOLEAN DEFAULT TRUE,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Inventário de personagens
CREATE TABLE inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id      UUID NOT NULL REFERENCES items(id),
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, item_id)
);

-- Listagens do Bazaar (preço fixo, direto)
CREATE TABLE market_listings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    UUID NOT NULL REFERENCES characters(id),
  item_id      UUID NOT NULL REFERENCES items(id),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  price_libras INTEGER NOT NULL CHECK (price_libras > 0),
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'cancelled')),
  sold_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Leilões
CREATE TABLE auction_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES characters(id),
  item_id         UUID NOT NULL REFERENCES items(id),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  starting_price  INTEGER NOT NULL CHECK (starting_price > 0),
  current_bid     INTEGER NOT NULL DEFAULT 0,
  current_bidder  UUID REFERENCES characters(id),
  ends_at         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'finished', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Lances de leilão
CREATE TABLE auction_bids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  UUID NOT NULL REFERENCES auction_listings(id) ON DELETE CASCADE,
  bidder_id   UUID NOT NULL REFERENCES characters(id),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Receitas de crafting
CREATE TABLE crafting_recipes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  result_item_id UUID NOT NULL REFERENCES items(id),
  result_quantity INTEGER NOT NULL DEFAULT 1,
  ingredients  JSONB NOT NULL DEFAULT '[]',
  required_level INTEGER DEFAULT 1,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_read_all" ON items FOR SELECT USING (TRUE);
CREATE POLICY "items_gm_write" ON items
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_owner" ON inventory
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_listings_read_active" ON market_listings
  FOR SELECT USING (status = 'active' OR seller_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  ) OR get_user_role(auth.uid()) = 'gm');
CREATE POLICY "market_listings_seller" ON market_listings
  FOR INSERT WITH CHECK (
    seller_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "market_listings_update" ON market_listings
  FOR UPDATE USING (
    seller_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE auction_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auction_read_active" ON auction_listings
  FOR SELECT USING (TRUE);
CREATE POLICY "auction_seller_insert" ON auction_listings
  FOR INSERT WITH CHECK (
    seller_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "auction_update" ON auction_listings
  FOR UPDATE USING (get_user_role(auth.uid()) = 'gm'
    OR seller_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auction_bids_read" ON auction_bids
  FOR SELECT USING (TRUE);
CREATE POLICY "auction_bids_insert" ON auction_bids
  FOR INSERT WITH CHECK (
    bidder_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

ALTER TABLE crafting_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crafting_recipes_read" ON crafting_recipes
  FOR SELECT USING (TRUE);
CREATE POLICY "crafting_recipes_gm_write" ON crafting_recipes
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- Índices
CREATE INDEX idx_inventory_character ON inventory(character_id);
CREATE INDEX idx_inventory_item ON inventory(item_id);
CREATE INDEX idx_market_listings_status ON market_listings(status);
CREATE INDEX idx_market_listings_item ON market_listings(item_id);
CREATE INDEX idx_market_listings_seller ON market_listings(seller_id);
CREATE INDEX idx_auction_listings_status ON auction_listings(status);
CREATE INDEX idx_auction_listings_ends ON auction_listings(ends_at);
CREATE INDEX idx_auction_bids_auction ON auction_bids(auction_id);

-- Trigger updated_at para inventory
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed: itens básicos iniciais
INSERT INTO items (name, description, item_type, rarity, is_tradeable) VALUES
('Minério Etéreo', 'Minério impregnado de Éter. Base para forja de equipamentos.', 'material', 'comum', TRUE),
('Componente Arcano', 'Fragmento de energia condensada. Usado em crafting mágico.', 'material', 'incomum', TRUE),
('Erva de Cura', 'Planta medicinal básica. Restaura HP quando consumida.', 'consumivel', 'comum', TRUE),
('Poção de Éter', 'Restaura Éter em combate.', 'consumivel', 'comum', TRUE),
('Fragmento de Lore', 'Pedaço de conhecimento antigo. Entregue ao GM para recompensa narrativa.', 'especial', 'raro', FALSE),
('Pergaminho de Classe de Prestígio', 'Permite adquirir uma Maestria de Prestígio compatível com sua Classe.', 'pergaminho', 'epico', TRUE),
('Essência Natural', 'Concentrado de energia vital. Material de crafting raro.', 'material', 'raro', TRUE),
('Equipamento Militar', 'Suprimentos militares básicos. Usados em recrutamento de tropas.', 'material', 'comum', TRUE);
