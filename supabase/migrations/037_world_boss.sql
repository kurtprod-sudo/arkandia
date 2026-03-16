-- ============================================================================
-- FASE 34 — Boss de Mundo Semanal
-- Referência: GDD_Sistemas §6.15
-- ============================================================================

CREATE TABLE world_boss_instances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  lore_text         TEXT,
  hp_max            INTEGER NOT NULL DEFAULT 500000,
  hp_current        INTEGER NOT NULL DEFAULT 500000,
  status            TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'defeated', 'expired')),
  skills            JSONB NOT NULL DEFAULT '[]',
  behavior          TEXT NOT NULL DEFAULT 'aggressive',
  window_start      TIMESTAMPTZ NOT NULL,
  window_end        TIMESTAMPTZ NOT NULL,
  reward_pool       JSONB NOT NULL DEFAULT '{"libras": 50000, "essencia": 5000, "xp": 10000}',
  total_damage_dealt INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE world_boss_contributions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id           UUID NOT NULL REFERENCES world_boss_instances(id) ON DELETE CASCADE,
  character_id      UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  damage_dealt      INTEGER NOT NULL DEFAULT 0,
  attacks_today     INTEGER NOT NULL DEFAULT 0,
  last_attack_date  DATE,
  reward_claimed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(boss_id, character_id)
);

CREATE TABLE world_boss_attack_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id       UUID NOT NULL REFERENCES world_boss_instances(id) ON DELETE CASCADE,
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  turn_number   INTEGER NOT NULL,
  actor         TEXT NOT NULL CHECK (actor IN ('player', 'boss')),
  action_type   TEXT NOT NULL,
  damage_dealt  INTEGER NOT NULL DEFAULT 0,
  narrative_text TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE world_boss_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boss_instances_read_all" ON world_boss_instances FOR SELECT USING (TRUE);
CREATE POLICY "boss_instances_gm_write" ON world_boss_instances FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE world_boss_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boss_contributions_read_all" ON world_boss_contributions FOR SELECT USING (TRUE);
CREATE POLICY "boss_contributions_owner" ON world_boss_contributions FOR ALL USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()) OR get_user_role(auth.uid()) = 'gm'
);

ALTER TABLE world_boss_attack_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boss_log_read_all" ON world_boss_attack_log FOR SELECT USING (TRUE);
CREATE POLICY "boss_log_owner" ON world_boss_attack_log FOR INSERT WITH CHECK (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

CREATE INDEX idx_boss_instances_status ON world_boss_instances(status);
CREATE INDEX idx_boss_contributions_boss ON world_boss_contributions(boss_id);
CREATE INDEX idx_boss_contributions_character ON world_boss_contributions(character_id);
CREATE INDEX idx_boss_log_boss_character ON world_boss_attack_log(boss_id, character_id);

CREATE TRIGGER trg_boss_contributions_updated_at BEFORE UPDATE ON world_boss_contributions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO world_boss_instances (
  name, lore_text, hp_max, hp_current, status, behavior,
  window_start, window_end, reward_pool, skills
) VALUES (
  'Valdrek, o Flagelo Etéreo',
  'Uma entidade nascida da convergência de três Arquétipos corrompidos.',
  500000, 500000, 'upcoming', 'aggressive',
  NOW(), NOW() + INTERVAL '3 days',
  '{"libras": 50000, "essencia": 5000, "xp": 10000}',
  '[{"name":"Golpe Etéreo","base":5,"ataque_factor":0.8,"eter_cost":10,"cooldown":0},{"name":"Ruptura do Vazio","base":15,"ataque_factor":1.2,"magia_factor":0.4,"eter_cost":25,"cooldown":2},{"name":"Pulso Aniquilador","base":40,"ataque_factor":2.5,"eter_cost":70,"cooldown":4}]'::jsonb
);
