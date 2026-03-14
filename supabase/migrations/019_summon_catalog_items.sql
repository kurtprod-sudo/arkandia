-- ============================================================================
-- Correção: Adicionar itens ao catálogo de summon inicial
-- Os item_ids correspondem aos itens inseridos em 013_market.sql
-- ============================================================================

INSERT INTO summon_catalog_items
  (catalog_id, item_id, quantity, weight, is_pity_eligible)
SELECT
  c.id,
  i.id,
  1,
  300,
  FALSE
FROM summon_catalogs c, items i
WHERE c.name = 'Caixa do Viajante'
  AND i.name = 'Erva de Cura';

INSERT INTO summon_catalog_items
  (catalog_id, item_id, quantity, weight, is_pity_eligible)
SELECT
  c.id,
  i.id,
  1,
  300,
  FALSE
FROM summon_catalogs c, items i
WHERE c.name = 'Caixa do Viajante'
  AND i.name = 'Poção de Éter';

INSERT INTO summon_catalog_items
  (catalog_id, item_id, quantity, weight, is_pity_eligible)
SELECT
  c.id,
  i.id,
  2,
  200,
  FALSE
FROM summon_catalogs c, items i
WHERE c.name = 'Caixa do Viajante'
  AND i.name = 'Minério Etéreo';

INSERT INTO summon_catalog_items
  (catalog_id, item_id, quantity, weight, is_pity_eligible)
SELECT
  c.id,
  i.id,
  1,
  150,
  FALSE
FROM summon_catalogs c, items i
WHERE c.name = 'Caixa do Viajante'
  AND i.name = 'Componente Arcano';

INSERT INTO summon_catalog_items
  (catalog_id, item_id, quantity, weight, is_pity_eligible)
SELECT
  c.id,
  i.id,
  1,
  40,
  TRUE
FROM summon_catalogs c, items i
WHERE c.name = 'Caixa do Viajante'
  AND i.name = 'Essência Natural';

INSERT INTO summon_catalog_items
  (catalog_id, item_id, quantity, weight, is_pity_eligible)
SELECT
  c.id,
  i.id,
  1,
  10,
  TRUE
FROM summon_catalogs c, items i
WHERE c.name = 'Caixa do Viajante'
  AND i.name = 'Pergaminho de Classe de Prestígio';
