-- ============================================================================
-- 041 — Achievements de Campanha
-- ============================================================================

INSERT INTO achievements
  (key, title, description, category, rarity, icon, target, title_reward_name)
VALUES
  ('first_campaign_chapter',
   'Primeiro Passo', 'Complete seu primeiro capítulo da Campanha.',
   'progressao', 'comum', 'book-open', NULL, NULL),
  ('campaign_inicial_complete',
   'Expedicionário', 'Conclua a Campanha Inicial completa.',
   'progressao', 'epico', 'scroll', NULL, 'Expedicionário'),
  ('first_campaign_stage',
   'Aventureiro', 'Complete sua primeira fase da Campanha Longa.',
   'progressao', 'comum', 'map-pin', NULL, NULL)
ON CONFLICT (key) DO NOTHING;

INSERT INTO title_definitions
  (name, description, category, trigger_type, trigger_condition, is_unique)
VALUES
  ('Expedicionário',
   'Concluiu a Campanha Inicial da Expedição Régia.',
   'progressao', 'automatico',
   '{"event": "campaign_complete"}', FALSE)
ON CONFLICT (name) DO NOTHING;
