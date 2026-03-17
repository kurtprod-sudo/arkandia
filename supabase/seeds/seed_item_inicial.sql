-- ============================================================================
-- SEED: Item Inicial por Classe — Arkandia
-- Este seed NÃO insere itens novos.
-- Os itens de Bronze já foram inseridos pelo seed_armas.sql.
-- Este arquivo documenta o mapeamento classe → item inicial para referência.
-- A lógica de concessão está em app/character/actions.ts (createCharacter).
-- ============================================================================

-- Verificação: confirmar que todos os itens iniciais existem no banco
-- Executar após seed_armas.sql para validar:

SELECT
  classe,
  item_name,
  CASE WHEN EXISTS (SELECT 1 FROM items WHERE name = item_name) THEN '✓ existe' ELSE '✗ AUSENTE' END AS status
FROM (VALUES
  ('Espadachim',  'Espada de Bronze'),
  ('Lanceiro',    'Lança de Bronze'),
  ('Lutador',     'Manoplas de Bronze'),
  ('Destruidor',  'Martelo de Bronze'),
  ('Escudeiro',   'Espada Curta de Bronze'),
  ('Assassino',   'Adaga de Bronze'),
  ('Arqueiro',    'Arco Curto de Bronze'),
  ('Atirador',    'Pistola Etérica de Bronze'),
  ('Druida',      'Machado de Bronze'),
  ('Bardo',       'Alaúde de Bronze'),
  ('Mago',        'Cajado de Bronze')
) AS t(classe, item_name);
