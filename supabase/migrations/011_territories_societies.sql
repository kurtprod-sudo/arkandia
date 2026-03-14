-- ============================================================================
-- FASE 12 — Territórios e Sociedades
-- ============================================================================

-- Territórios do mapa político
CREATE TABLE territories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  region          TEXT NOT NULL,
  category        TEXT NOT NULL
    CHECK (category IN ('forja', 'arcano', 'comercial', 'militar', 'reliquia', 'estrategico')),
  controlling_society_id UUID REFERENCES societies(id) ON DELETE SET NULL,
  safezone_until  TIMESTAMPTZ,
  base_production JSONB DEFAULT '{}',
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Produção passiva de território (snapshot on-demand)
CREATE TABLE territory_production (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id    UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  society_id      UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  last_collected  TIMESTAMPTZ DEFAULT NOW(),
  reinvestment_level INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(territory_id)
);

-- Refatorar societies para suportar nível e cofre
ALTER TABLE societies
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS treasury_libras BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_percent INTEGER DEFAULT 10
    CHECK (tax_percent BETWEEN 0 AND 50),
  ADD COLUMN IF NOT EXISTS recruitment_open BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS manifesto TEXT,
  ADD COLUMN IF NOT EXISTS dissolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inactive_since TIMESTAMPTZ;

-- Cargos de membros já existem em society_members
-- Adicionar coluna title se não existir
ALTER TABLE society_members
  ADD COLUMN IF NOT EXISTS title TEXT;

-- RLS
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "territories_read_all" ON territories
  FOR SELECT USING (TRUE);
CREATE POLICY "territories_gm_write" ON territories
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');
CREATE POLICY "territories_society_update" ON territories
  FOR UPDATE USING (
    controlling_society_id IN (
      SELECT s.id FROM societies s
      JOIN society_members sm ON sm.society_id = s.id
      WHERE sm.character_id IN (
        SELECT id FROM characters WHERE user_id = auth.uid()
      )
      AND sm.role IN ('leader', 'officer')
    )
  );

ALTER TABLE territory_production ENABLE ROW LEVEL SECURITY;
CREATE POLICY "territory_production_society" ON territory_production
  FOR ALL USING (
    society_id IN (
      SELECT society_id FROM society_members
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_territories_region ON territories(region);
CREATE INDEX idx_territories_controlling ON territories(controlling_society_id);
CREATE INDEX idx_territory_production_territory ON territory_production(territory_id);
CREATE INDEX idx_territory_production_society ON territory_production(society_id);

-- Trigger para inactive_since em societies
CREATE OR REPLACE FUNCTION check_society_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dissolved_at IS NOT NULL AND OLD.dissolved_at IS NULL THEN
    -- Libera territórios ao dissolver
    UPDATE territories
    SET controlling_society_id = NULL,
        safezone_until = NULL
    WHERE controlling_society_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_society_dissolved
  AFTER UPDATE ON societies
  FOR EACH ROW
  WHEN (NEW.dissolved_at IS NOT NULL AND OLD.dissolved_at IS NULL)
  EXECUTE FUNCTION check_society_activity();

-- Seed: territórios iniciais (Bastilha Velada e arredores de Vallaeon)
INSERT INTO territories (name, region, category, description, base_production) VALUES
('Minas de Ferro de Düren',      'Domínios do Norte',  'forja',      'Minas ricas em minério etéreo. Produção de materiais de forja de alta qualidade.', '{"libras_per_hour": 15, "material": "minerio_etereo"}'),
('Torre de Serdin',              'Terras Centrais',    'arcano',     'Centro de pesquisa arcana. Produção de componentes mágicos raros.',                  '{"libras_per_hour": 12, "material": "componente_arcano"}'),
('Porto de Ogygia',              'Ilhas Ocidentais',   'comercial',  'Porto estratégico. Alta renda em Libras, rotas comerciais exclusivas.',               '{"libras_per_hour": 25, "material": null}'),
('Fortaleza de Valoria',         'Terras Centrais',    'militar',    'Posição defensiva chave. Bônus em recrutamento de tropas.',                           '{"libras_per_hour": 8,  "material": "equipamento_militar"}'),
('Ruínas de Thar-Halum',        'Terras Centrais',    'reliquia',   'Ruínas de uma era perdida. Fragmentos de lore e materiais lendários raros.',          '{"libras_per_hour": 5,  "material": "fragmento_lore"}'),
('Encruzilhada de Vallaeon',    'Terras Centrais',    'estrategico','Ponto de controle central. Quem controla dita o fluxo de tropas na região.',          '{"libras_per_hour": 10, "material": null}'),
('Floresta de Eryuell',          'Ilhas Ocidentais',   'arcano',     'Floresta etérea dos Elfos. Materiais raros de natureza e sonho.',                     '{"libras_per_hour": 10, "material": "essencia_natural"}'),
('Mercado Negro de Urgath',     'Areias do Juízo',    'comercial',  'Ponto de comércio proibido. Alto rendimento, alta exposição política.',               '{"libras_per_hour": 20, "material": "item_contrabandeado"}');
