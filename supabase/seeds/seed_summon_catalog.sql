-- ============================================================================
-- SEED: Summon Catalog Items — Caixa do Viajante
-- Popula summon_catalog_items para o catálogo existente
-- Referência: GDD_Sistemas §4.6
-- ============================================================================

DO $$
DECLARE
  _catalog_id UUID;
BEGIN
  SELECT id INTO _catalog_id FROM summon_catalogs WHERE name = 'Caixa do Viajante' LIMIT 1;
  IF _catalog_id IS NULL THEN
    RAISE EXCEPTION 'Catálogo não encontrado. Execute migration 014 primeiro.';
  END IF;

  -- Remove itens antigos se existirem (idempotente)
  DELETE FROM summon_catalog_items WHERE catalog_id = _catalog_id;

  -- ── MATERIAIS COMUNS (alta probabilidade) ──────────────────────────────
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 3, 120, FALSE FROM items WHERE name = 'Fragmento de Bronze'    LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 3, 120, FALSE FROM items WHERE name = 'Fragmento de Ferro'     LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 2, 100, FALSE FROM items WHERE name = 'Tecido Etéreo'          LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 2, 100, FALSE FROM items WHERE name = 'Madeira Etérea'         LIMIT 1;

  -- ── MATERIAIS INCOMUNS (probabilidade média) ───────────────────────────
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 2, 60, FALSE FROM items WHERE name = 'Fragmento de Aço'        LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 2, 60, FALSE FROM items WHERE name = 'Seda Arcana'             LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 2, 60, FALSE FROM items WHERE name = 'Couro Espiritual'        LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 1, 50, TRUE  FROM items WHERE name = 'Minério Etéreo'          LIMIT 1;

  -- ── MATERIAIS RAROS (baixa probabilidade, elegíveis para pity) ────────
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 1, 25, TRUE  FROM items WHERE name = 'Fragmento de Prata'      LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 1, 20, TRUE  FROM items WHERE name = 'Componente Arcano'       LIMIT 1;

  -- ── EQUIPAMENTOS (muito baixa probabilidade) ──────────────────────────
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 1, 15, TRUE  FROM items WHERE name = 'Anel de Combate Etéreo'  LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 1, 15, TRUE  FROM items WHERE name = 'Amuleto de Proteção Etéreo' LIMIT 1;
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 1, 10, TRUE  FROM items WHERE name = 'Colar da Precisão Etéreo' LIMIT 1;

  -- ── ESPECIAL (raridade extrema) ────────────────────────────────────────
  INSERT INTO summon_catalog_items (catalog_id, item_id, quantity, weight, is_pity_eligible)
  SELECT _catalog_id, id, 1, 5, TRUE   FROM items WHERE name = 'Pergaminho de Classe de Prestígio' LIMIT 1;

END $$;

-- VERIFICAÇÃO
-- SELECT i.name, i.rarity, sci.quantity, sci.weight, sci.is_pity_eligible,
--        ROUND(sci.weight::numeric / SUM(sci.weight) OVER () * 100, 1) AS probabilidade_pct
-- FROM summon_catalog_items sci
-- JOIN items i ON i.id = sci.item_id
-- ORDER BY sci.weight DESC;
