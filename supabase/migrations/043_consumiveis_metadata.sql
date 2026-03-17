-- ============================================================================
-- 043_consumiveis_metadata.sql — Popula metadata de combate nos consumíveis
-- ============================================================================

-- Erva de Cura: restaura 50 HP em combate
UPDATE items
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'),
  '{combat_heal_hp}',
  '50'
)
WHERE name = 'Erva de Cura'
  AND item_type = 'consumivel';

-- Poção de Éter: restaura 30 Éter em combate
UPDATE items
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'),
  '{combat_restore_eter}',
  '30'
)
WHERE name = 'Poção de Éter'
  AND item_type = 'consumivel';

-- Receitas de crafting para consumíveis
INSERT INTO crafting_recipes (name, result_item_id, result_quantity, ingredients, crafting_cost, required_level)
SELECT
  'Preparar Erva de Cura',
  (SELECT id FROM items WHERE name = 'Erva de Cura' LIMIT 1),
  3,
  jsonb_build_array(
    jsonb_build_object('item_id', (SELECT id::text FROM items WHERE name = 'Madeira Etérea' LIMIT 1), 'quantity', 2),
    jsonb_build_object('item_id', (SELECT id::text FROM items WHERE name = 'Tecido Etéreo' LIMIT 1), 'quantity', 1)
  ),
  40,
  1
WHERE NOT EXISTS (SELECT 1 FROM crafting_recipes WHERE name = 'Preparar Erva de Cura');

INSERT INTO crafting_recipes (name, result_item_id, result_quantity, ingredients, crafting_cost, required_level)
SELECT
  'Destilar Poção de Éter',
  (SELECT id FROM items WHERE name = 'Poção de Éter' LIMIT 1),
  2,
  jsonb_build_array(
    jsonb_build_object('item_id', (SELECT id::text FROM items WHERE name = 'Tecido Etéreo' LIMIT 1), 'quantity', 2),
    jsonb_build_object('item_id', (SELECT id::text FROM items WHERE name = 'Seda Arcana' LIMIT 1), 'quantity', 1)
  ),
  60,
  3
WHERE NOT EXISTS (SELECT 1 FROM crafting_recipes WHERE name = 'Destilar Poção de Éter');
