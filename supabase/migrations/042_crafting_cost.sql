-- ============================================================================
-- 042_crafting_cost.sql — Adiciona custo em Libras nas receitas de crafting
-- Referência: GDD_Personagem §11 — "crafting direto, sem aleatoriedade"
-- ============================================================================

ALTER TABLE crafting_recipes
  ADD COLUMN IF NOT EXISTS crafting_cost INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN crafting_recipes.crafting_cost IS
  'Custo em Libras para executar o crafting. Debitado da carteira do personagem.';
