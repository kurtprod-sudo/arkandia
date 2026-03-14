-- ============================================================================
-- Correção: Constraint UNIQUE para upsert de rankings funcionar sem duplicatas
-- ============================================================================

ALTER TABLE rankings
  ADD CONSTRAINT rankings_category_entity_unique
  UNIQUE (category, entity_id);
