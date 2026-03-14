-- ============================================================================
-- FASE 9 — Sistema de Combate PvP
-- Referência: GDD_Sistemas §1
-- ============================================================================

-- Sessões de combate
CREATE TABLE combat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   UUID NOT NULL REFERENCES characters(id),
  defender_id     UUID NOT NULL REFERENCES characters(id),
  modality        TEXT NOT NULL
    CHECK (modality IN ('duelo_livre', 'duelo_ranqueado', 'emboscada', 'torneio')),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'finished', 'cancelled')),
  current_turn    INTEGER NOT NULL DEFAULT 1,
  active_player_id UUID REFERENCES characters(id),
  turn_expires_at  TIMESTAMPTZ,
  winner_id       UUID REFERENCES characters(id),
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Turnos de combate
CREATE TABLE combat_turns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES combat_sessions(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  actor_id    UUID NOT NULL REFERENCES characters(id),
  action_type TEXT NOT NULL
    CHECK (action_type IN ('skill', 'ataque_basico', 'mudar_range', 'usar_item', 'fuga', 'render', 'timeout')),
  skill_id    UUID REFERENCES skills(id),
  range_state TEXT CHECK (range_state IN ('curto', 'medio', 'longo')),
  damage_dealt INTEGER DEFAULT 0,
  effect_applied TEXT,
  narrative_text TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Efeitos de status ativos em combate
CREATE TABLE combat_effects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES combat_sessions(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id),
  effect_type TEXT NOT NULL,
  stacks      INTEGER DEFAULT 1,
  duration_turns INTEGER NOT NULL,
  applied_at_turn INTEGER NOT NULL,
  expires_at_turn INTEGER NOT NULL,
  source_skill_id UUID REFERENCES skills(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE combat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combat_sessions_participants" ON combat_sessions
  FOR SELECT USING (
    challenger_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR defender_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "combat_sessions_insert" ON combat_sessions
  FOR INSERT WITH CHECK (
    challenger_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );
CREATE POLICY "combat_sessions_update" ON combat_sessions
  FOR UPDATE USING (
    challenger_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR defender_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE combat_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combat_turns_read" ON combat_turns
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM combat_sessions
      WHERE challenger_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
         OR defender_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "combat_turns_insert" ON combat_turns
  FOR INSERT WITH CHECK (
    actor_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE combat_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "combat_effects_participants" ON combat_effects
  FOR ALL USING (
    session_id IN (
      SELECT id FROM combat_sessions
      WHERE challenger_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
         OR defender_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_combat_sessions_challenger ON combat_sessions(challenger_id);
CREATE INDEX idx_combat_sessions_defender ON combat_sessions(defender_id);
CREATE INDEX idx_combat_sessions_status ON combat_sessions(status);
CREATE INDEX idx_combat_turns_session ON combat_turns(session_id, turn_number);
CREATE INDEX idx_combat_effects_session ON combat_effects(session_id);
CREATE INDEX idx_combat_effects_character ON combat_effects(character_id);

-- Restaura HP e Éter ao máximo após fim de combate
CREATE OR REPLACE FUNCTION restore_combat_vitals(p_character_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE character_attributes
  SET hp_atual = hp_max,
      eter_atual = eter_max
  WHERE character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
