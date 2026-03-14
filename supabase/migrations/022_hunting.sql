-- ============================================================================
-- FASE 21 — Sistema de Missões PvE (Hunting)
-- Referência: GDD_Balanceamento §16, GDD_Sistemas §1.11
-- ============================================================================

-- Zonas de caça disponíveis
CREATE TABLE hunting_zones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  location        TEXT NOT NULL,
  min_level       INTEGER NOT NULL DEFAULT 1,
  max_level       INTEGER,
  risk_level      TEXT NOT NULL
    CHECK (risk_level IN ('baixo', 'medio', 'alto', 'extremo')),
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de NPC disponíveis nas zonas
CREATE TABLE npc_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         UUID NOT NULL REFERENCES hunting_zones(id),
  name            TEXT NOT NULL,
  tier            TEXT NOT NULL
    CHECK (tier IN ('fraco', 'medio', 'forte', 'elite')),
  level           INTEGER NOT NULL DEFAULT 1,
  base_hp         INTEGER NOT NULL DEFAULT 100,
  base_ataque     INTEGER NOT NULL DEFAULT 10,
  base_magia      INTEGER NOT NULL DEFAULT 10,
  base_defesa     INTEGER NOT NULL DEFAULT 5,
  base_velocidade INTEGER NOT NULL DEFAULT 10,
  base_eter       INTEGER NOT NULL DEFAULT 50,
  skills          JSONB NOT NULL DEFAULT '[]',
  loot_table      JSONB NOT NULL DEFAULT '[]',
  behavior        TEXT NOT NULL DEFAULT 'balanced'
    CHECK (behavior IN ('balanced', 'aggressive', 'defensive', 'support')),
  xp_reward       INTEGER NOT NULL DEFAULT 20,
  narrative_text  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de hunting ativas e históricas
CREATE TABLE hunting_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  zone_id         UUID NOT NULL REFERENCES hunting_zones(id),
  mode            TEXT NOT NULL DEFAULT 'manual'
    CHECK (mode IN ('manual', 'auto')),
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'finished', 'died')),
  kills           INTEGER NOT NULL DEFAULT 0,
  max_kills       INTEGER NOT NULL DEFAULT 20,
  loot_accumulated JSONB NOT NULL DEFAULT '[]',
  xp_accumulated  INTEGER NOT NULL DEFAULT 0,
  libras_accumulated INTEGER NOT NULL DEFAULT 0,
  essencia_accumulated INTEGER NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  current_npc_id  UUID REFERENCES npc_types(id),
  current_npc_hp  INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Estado de combate contra NPC atual (turno a turno)
CREATE TABLE hunting_combat_turns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES hunting_sessions(id) ON DELETE CASCADE,
  npc_kill_number INTEGER NOT NULL,
  turn_number     INTEGER NOT NULL DEFAULT 1,
  actor           TEXT NOT NULL CHECK (actor IN ('player', 'npc')),
  action_type     TEXT NOT NULL,
  damage_dealt    INTEGER NOT NULL DEFAULT 0,
  effect_applied  TEXT,
  narrative_text  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE hunting_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hunting_zones_read_all" ON hunting_zones
  FOR SELECT USING (TRUE);
CREATE POLICY "hunting_zones_gm_write" ON hunting_zones
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE npc_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_types_read_all" ON npc_types
  FOR SELECT USING (TRUE);
CREATE POLICY "npc_types_gm_write" ON npc_types
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE hunting_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hunting_sessions_owner" ON hunting_sessions
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE hunting_combat_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hunting_turns_owner" ON hunting_combat_turns
  FOR ALL USING (
    session_id IN (
      SELECT id FROM hunting_sessions
      WHERE character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    ) OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_hunting_sessions_character ON hunting_sessions(character_id);
CREATE INDEX idx_hunting_sessions_status ON hunting_sessions(status);
CREATE INDEX idx_hunting_sessions_zone ON hunting_sessions(zone_id);
CREATE INDEX idx_hunting_turns_session ON hunting_combat_turns(session_id);
CREATE INDEX idx_npc_types_zone ON npc_types(zone_id);

-- Trigger updated_at
CREATE TRIGGER trg_hunting_sessions_updated_at
  BEFORE UPDATE ON hunting_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SEED: Zonas de caça iniciais ─────────────────────────────────────────

INSERT INTO hunting_zones
  (name, description, location, min_level, max_level, risk_level, cooldown_minutes)
VALUES
('Ruínas de Thar-Halum',
 'As ruínas antigas escondem guardiões esquecidos que protegem fragmentos de lore perdido. Zona ideal para iniciantes.',
 'Terras Centrais — Valoria',
 1, 5, 'baixo', 30),

('Floresta de Eryuell',
 'A floresta élfica abriga espíritos corrompidos que perderam o vínculo com o Sonho. Perigosa mas lucrativa.',
 'Ilhas Ocidentais — Eryuell',
 3, 8, 'medio', 30),

('Minas de Düren',
 'Galerias abandonadas infestadas por Golens de Pedra ativados por energia etérea residual.',
 'Domínios do Norte — Düren',
 5, 10, 'medio', 30),

('Bordas de Urgath',
 'Território hostil onde cultistas do Caos estabeleceram acampamentos. Alto risco, alto retorno.',
 'Urgath',
 8, 15, 'alto', 30),

('Câmara do Arquétipo Corrompido',
 'Uma câmara selada onde ecos de um Arquétipo corrompido ainda vagam. Apenas os mais preparados entram.',
 'Localização secreta',
 10, NULL, 'extremo', 30);

-- ─── SEED: NPCs por zona ──────────────────────────────────────────────────

-- Ruínas de Thar-Halum
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Guardião Esquecido',
  'fraco',
  2, 90, 14, 8, 8, 10, 40,
  '[{"name": "Golpe Etéreo", "base": 5, "ataque_factor": 0.8, "eter_cost": 10, "cooldown": 1}]'::jsonb,
  '[
    {"type": "libras", "min": 5, "max": 15, "chance": 1.0},
    {"type": "xp", "amount": 20, "chance": 1.0},
    {"type": "item", "item_name": "Fragmento de Lore", "chance": 0.05},
    {"type": "essencia", "amount": 2, "chance": 0.15}
  ]'::jsonb,
  'balanced',
  20,
  'Um eco espiritual preso entre o passado e o esquecimento.'
FROM hunting_zones z WHERE z.name = 'Ruínas de Thar-Halum';

INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Sentinela Antiga',
  'medio',
  4, 160, 22, 12, 14, 12, 60,
  '[
    {"name": "Punho de Pedra", "base": 10, "ataque_factor": 1.0, "eter_cost": 15, "cooldown": 1},
    {"name": "Barreira Etérea", "type": "buff", "effect": "escudo_etereo", "stacks": 2, "eter_cost": 20, "cooldown": 3}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 15, "max": 35, "chance": 1.0},
    {"type": "xp", "amount": 45, "chance": 1.0},
    {"type": "item", "item_name": "Minério Etéreo", "chance": 0.15},
    {"type": "essencia", "amount": 3, "chance": 0.2}
  ]'::jsonb,
  'defensive',
  45,
  'Uma figura encurvada com armadura de pedra impregnada de Éter residual.'
FROM hunting_zones z WHERE z.name = 'Ruínas de Thar-Halum';

-- Floresta de Eryuell
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Espírito Corrompido',
  'medio',
  5, 180, 18, 28, 12, 18, 80,
  '[
    {"name": "Toque do Sonho Partido", "base": 8, "magia_factor": 1.2, "eter_cost": 18, "cooldown": 1,
     "effect_type": "silencio", "effect_duration": 1},
    {"name": "Névoa Ilusória", "base": 0, "type": "buff", "effect": "esquiva_bonus",
     "eter_cost": 15, "cooldown": 3}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 20, "max": 60, "chance": 1.0},
    {"type": "xp", "amount": 55, "chance": 1.0},
    {"type": "item", "item_name": "Essência Natural", "chance": 0.15},
    {"type": "essencia", "amount": 4, "chance": 0.25}
  ]'::jsonb,
  'aggressive',
  55,
  'A silhueta de um elfo cujas memórias se tornaram correntes.'
FROM hunting_zones z WHERE z.name = 'Floresta de Eryuell';

-- Minas de Düren
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Golem de Pedra',
  'forte',
  7, 350, 32, 10, 30, 8, 50,
  '[
    {"name": "Punho Sísmico", "base": 20, "ataque_factor": 1.5, "eter_cost": 25, "cooldown": 2,
     "effect_type": "stun", "effect_duration": 1},
    {"name": "Pele de Pedra", "type": "buff", "effect": "defesa_bonus", "value": 15,
     "eter_cost": 20, "cooldown": 4}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 60, "max": 120, "chance": 1.0},
    {"type": "xp", "amount": 90, "chance": 1.0},
    {"type": "item", "item_name": "Minério Etéreo", "chance": 0.25},
    {"type": "item", "item_name": "Componente Arcano", "chance": 0.1},
    {"type": "essencia", "amount": 6, "chance": 0.3}
  ]'::jsonb,
  'defensive',
  90,
  'Uma construção de pedra animada por Éter residual das forjas ancestrais.'
FROM hunting_zones z WHERE z.name = 'Minas de Düren';

-- Bordas de Urgath
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Cultista do Caos',
  'forte',
  10, 280, 38, 32, 18, 22, 90,
  '[
    {"name": "Rajada do Caos", "base": 15, "magia_factor": 1.4, "ataque_factor": 0.4,
     "eter_cost": 28, "cooldown": 1, "effect_type": "confusao", "effect_duration": 1},
    {"name": "Instabilidade", "base": 25, "magia_factor": 1.8, "eter_cost": 40, "cooldown": 3}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 80, "max": 180, "chance": 1.0},
    {"type": "xp", "amount": 140, "chance": 1.0},
    {"type": "item", "item_name": "Componente Arcano", "chance": 0.2},
    {"type": "essencia", "amount": 8, "chance": 0.35},
    {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.02}
  ]'::jsonb,
  'aggressive',
  140,
  'Um devoto que abraçou a entropia como filosofia e arma.'
FROM hunting_zones z WHERE z.name = 'Bordas de Urgath';

-- Câmara do Arquétipo
INSERT INTO npc_types
  (zone_id, name, tier, level, base_hp, base_ataque, base_magia, base_defesa,
   base_velocidade, base_eter, skills, loot_table, behavior, xp_reward, narrative_text)
SELECT
  z.id,
  'Eco do Corrompido',
  'elite',
  12, 600, 55, 55, 35, 25, 150,
  '[
    {"name": "Pulso Arquetípico", "base": 30, "magia_factor": 2.0, "eter_cost": 50,
     "cooldown": 2, "effect_type": "corrosao_eterica", "effect_duration": 2},
    {"name": "Ruptura do Vínculo", "base": 40, "ataque_factor": 1.5, "magia_factor": 1.5,
     "eter_cost": 70, "cooldown": 4, "is_true_damage": false},
    {"name": "Restauração Etérea", "type": "heal", "base": 80, "eter_cost": 40, "cooldown": 3}
  ]'::jsonb,
  '[
    {"type": "libras", "min": 150, "max": 300, "chance": 1.0},
    {"type": "xp", "amount": 300, "chance": 1.0},
    {"type": "essencia", "amount": 15, "chance": 0.5},
    {"type": "item", "item_name": "Essência Natural", "chance": 0.3},
    {"type": "item", "item_name": "Componente Arcano", "chance": 0.25},
    {"type": "item", "item_name": "Pergaminho de Classe de Prestígio", "chance": 0.05}
  ]'::jsonb,
  'balanced',
  300,
  'Uma manifestação fragmentada de um Arquétipo que perdeu a si mesmo.'
FROM hunting_zones z WHERE z.name = 'Câmara do Arquétipo Corrompido';
