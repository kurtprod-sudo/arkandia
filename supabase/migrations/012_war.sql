-- ============================================================================
-- FASE 13 — Sistema de Guerra de Territórios
-- Referência: GDD_Sistemas §2
-- ============================================================================

-- Tropas recrutadas por sociedade
CREATE TABLE troops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id   UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  troop_type   TEXT NOT NULL
    CHECK (troop_type IN ('infantaria', 'cavalaria', 'arquearia', 'cerco')),
  quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Declarações de guerra
CREATE TABLE war_declarations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id       UUID NOT NULL REFERENCES societies(id),
  defender_id       UUID REFERENCES societies(id),
  target_territory_id UUID NOT NULL REFERENCES territories(id),
  status            TEXT NOT NULL DEFAULT 'preparation'
    CHECK (status IN ('preparation', 'active', 'finished', 'cancelled')),
  phase             INTEGER NOT NULL DEFAULT 1,
  declared_at       TIMESTAMPTZ DEFAULT NOW(),
  preparation_ends  TIMESTAMPTZ NOT NULL,
  finished_at       TIMESTAMPTZ,
  winner_id         UUID REFERENCES societies(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes da guerra (personagens e suas tropas comprometidas)
CREATE TABLE war_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id          UUID NOT NULL REFERENCES war_declarations(id) ON DELETE CASCADE,
  society_id      UUID NOT NULL REFERENCES societies(id),
  character_id    UUID NOT NULL REFERENCES characters(id),
  troops_committed JSONB NOT NULL DEFAULT '{}',
  side            TEXT NOT NULL CHECK (side IN ('attacker', 'defender')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(war_id, character_id)
);

-- Batalhas dentro de uma guerra (resolvidas idle)
CREATE TABLE war_battles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id          UUID NOT NULL REFERENCES war_declarations(id) ON DELETE CASCADE,
  phase           INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'finished')),
  attacker_power  INTEGER DEFAULT 0,
  defender_power  INTEGER DEFAULT 0,
  winner_side     TEXT CHECK (winner_side IN ('attacker', 'defender', 'draw')),
  casualties      JSONB DEFAULT '{}',
  narrative_text  TEXT,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE troops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "troops_society_members" ON troops
  FOR ALL USING (
    society_id IN (
      SELECT society_id FROM society_members
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE war_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "war_declarations_read_all" ON war_declarations
  FOR SELECT USING (TRUE);
CREATE POLICY "war_declarations_participants" ON war_declarations
  FOR UPDATE USING (
    attacker_id IN (
      SELECT society_id FROM society_members
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
      AND role IN ('leader', 'officer')
    ) OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "war_declarations_insert" ON war_declarations
  FOR INSERT WITH CHECK (
    attacker_id IN (
      SELECT society_id FROM society_members
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
      AND role IN ('leader', 'officer')
    )
  );

ALTER TABLE war_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "war_participants_read_all" ON war_participants
  FOR SELECT USING (TRUE);
CREATE POLICY "war_participants_insert" ON war_participants
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE war_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "war_battles_read_all" ON war_battles
  FOR SELECT USING (TRUE);
CREATE POLICY "war_battles_gm_write" ON war_battles
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- Índices
CREATE INDEX idx_troops_society ON troops(society_id);
CREATE INDEX idx_war_declarations_attacker ON war_declarations(attacker_id);
CREATE INDEX idx_war_declarations_defender ON war_declarations(defender_id);
CREATE INDEX idx_war_declarations_status ON war_declarations(status);
CREATE INDEX idx_war_declarations_territory ON war_declarations(target_territory_id);
CREATE INDEX idx_war_participants_war ON war_participants(war_id);
CREATE INDEX idx_war_battles_war ON war_battles(war_id);

-- Trigger updated_at para troops
CREATE TRIGGER trg_troops_updated_at
  BEFORE UPDATE ON troops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
