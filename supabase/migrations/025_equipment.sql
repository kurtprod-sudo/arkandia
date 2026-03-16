-- ============================================================================
-- 025_equipment.sql — Sistema de Equipamentos
-- ============================================================================

-- Tipos de slot disponíveis
CREATE TABLE equipment_slots_definition (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key    TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  slot_order  INTEGER NOT NULL,
  is_locked   BOOLEAN DEFAULT FALSE
);

INSERT INTO equipment_slots_definition (slot_key, label, slot_order, is_locked) VALUES
('arma_principal',  'Arma Principal',  1, FALSE),
('arma_secundaria', 'Arma Secundária', 2, TRUE),
('elmo',            'Elmo',            3, FALSE),
('armadura',        'Armadura',        4, FALSE),
('calca',           'Calça',           5, FALSE),
('bota',            'Bota',            6, FALSE),
('acessorio_1',     'Acessório I',     7, FALSE),
('acessorio_2',     'Acessório II',    8, FALSE);

-- Equipamentos atualmente equipados por personagem
CREATE TABLE character_equipment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot_key        TEXT NOT NULL REFERENCES equipment_slots_definition(slot_key),
  item_id         UUID NOT NULL REFERENCES items(id),
  enhancement     INTEGER NOT NULL DEFAULT 0
    CHECK (enhancement BETWEEN 0 AND 12),
  equipped_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, slot_key)
);

-- Melhorias de item (+1 ao +12)
CREATE TABLE item_enhancements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES items(id),
  inventory_id    UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  enhancement     INTEGER NOT NULL DEFAULT 0
    CHECK (enhancement BETWEEN 0 AND 12),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inventory_id)
);

-- Adiciona colunas de equipamento na tabela items
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS stats         JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slot_type     TEXT,
  ADD COLUMN IF NOT EXISTS required_level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS required_class TEXT[];

-- RLS
ALTER TABLE equipment_slots_definition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_slots_def_read_all" ON equipment_slots_definition
  FOR SELECT USING (TRUE);

ALTER TABLE character_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_equipment_owner" ON character_equipment
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE item_enhancements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_enhancements_owner" ON item_enhancements
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_character_equipment_character ON character_equipment(character_id);
CREATE INDEX idx_item_enhancements_character ON item_enhancements(character_id);
CREATE INDEX idx_item_enhancements_inventory ON item_enhancements(inventory_id);
CREATE INDEX idx_items_slot_type ON items(slot_type);

-- Trigger updated_at
CREATE TRIGGER trg_item_enhancements_updated_at
  BEFORE UPDATE ON item_enhancements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SEED: Equipamentos de exemplo ───────────────────────────────────────

INSERT INTO items (name, description, item_type, rarity, is_tradeable, stats, slot_type, required_level)
VALUES
('Espada de Ferro',
 'Uma espada comum forjada nas ferrerias de Valoria.',
 'equipamento', 'comum', TRUE,
 '{"ataque": 5}', 'arma_principal', 1),

('Adaga de Osso',
 'Feita de ossos de criaturas das Ruínas. Leve e afiada.',
 'equipamento', 'comum', TRUE,
 '{"ataque": 3, "velocidade": 2}', 'arma_principal', 1),

('Cajado de Aprendiz',
 'O primeiro cajado de um Mago em formação.',
 'equipamento', 'comum', TRUE,
 '{"magia": 6}', 'arma_principal', 1),

('Armadura de Couro',
 'Proteção básica para aventureiros iniciantes.',
 'equipamento', 'comum', TRUE,
 '{"defesa": 4}', 'armadura', 1),

('Elmo de Ferro',
 'Um elmo simples mas eficaz.',
 'equipamento', 'comum', TRUE,
 '{"defesa": 2, "vitalidade": 1}', 'elmo', 1),

('Botas de Viajante',
 'Calçado resistente para longas jornadas.',
 'equipamento', 'comum', TRUE,
 '{"velocidade": 2}', 'bota', 1),

('Anel de Proteção',
 'Um anel com runa de proteção básica.',
 'equipamento', 'incomum', TRUE,
 '{"defesa": 3}', 'acessorio_1', 3),

('Amuleto de Força',
 'Concede força etérea ao portador.',
 'equipamento', 'incomum', TRUE,
 '{"ataque": 4}', 'acessorio_1', 3);
