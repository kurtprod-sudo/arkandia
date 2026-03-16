-- ============================================================================
-- FASE 37 — Campanha Longa
-- Estende a arquitetura multi-campanha da Fase 36 (migration 039)
-- Referência: GDD_Mundo §5 (nações), GDD_Sistemas §7 (campanha)
-- ============================================================================

-- Estender tabela campaigns com colunas novas
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unlock_requires_campaign_slug TEXT;

-- Atualizar campanha inicial com order_index = 1
UPDATE campaigns SET order_index = 1 WHERE slug = 'inicial';

-- Adicionar item_type 'cosmetico' à tabela items
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_item_type_check;
ALTER TABLE items ADD CONSTRAINT items_item_type_check
  CHECK (item_type IN ('material', 'equipamento', 'consumivel', 'especial', 'pergaminho', 'cosmetico'));

-- Fases de campanha (subdivisão de capítulos)
CREATE TABLE campaign_stages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id             UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  chapter_number          INTEGER NOT NULL,
  stage_number            INTEGER NOT NULL,  -- 1–10
  difficulty              TEXT NOT NULL DEFAULT 'normal'
    CHECK (difficulty IN ('normal', 'hard')),
  title                   TEXT NOT NULL,
  narrative_text          TEXT NOT NULL DEFAULT '',
  -- NPC recorrente — mesmo npc_key = mesmo personagem narrativo
  npc_key                 TEXT,
  npc_name                TEXT NOT NULL,
  npc_challenge_phrase    TEXT NOT NULL DEFAULT '',
  -- Se não null: substitui fórmula de scaling automática
  npc_snapshot_override   JSONB,
  -- Recompensas: { xp, libras, lore_fragment_key? }
  rewards                 JSONB NOT NULL DEFAULT '{"xp": 0, "libras": 0}',
  is_published            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, chapter_number, stage_number, difficulty)
);

-- Progresso por personagem por fase
CREATE TABLE campaign_stage_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  chapter_number  INTEGER NOT NULL,
  stage_number    INTEGER NOT NULL,
  difficulty      TEXT NOT NULL DEFAULT 'normal'
    CHECK (difficulty IN ('normal', 'hard')),
  completed_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, campaign_id, chapter_number, stage_number, difficulty)
);

-- Fragmentos de Lore desbloqueados por personagem
CREATE TABLE lore_fragments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  fragment_key    TEXT NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  nation          TEXT NOT NULL,
  unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, fragment_key)
);

-- Catálogo global de fragmentos de lore
CREATE TABLE lore_fragment_catalog (
  fragment_key    TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  nation          TEXT NOT NULL,
  chapter_number  INTEGER NOT NULL,
  stage_number    INTEGER NOT NULL,
  difficulty      TEXT NOT NULL DEFAULT 'normal'
);

-- RLS
ALTER TABLE campaign_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stages_read_all" ON campaign_stages
  FOR SELECT USING (TRUE);
CREATE POLICY "stages_gm_write" ON campaign_stages
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE campaign_stage_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_progress_owner" ON campaign_stage_progress
  FOR ALL USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    ) OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE lore_fragments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lore_fragments_owner" ON lore_fragments
  FOR ALL USING (
    character_id IN (
      SELECT id FROM characters WHERE user_id = auth.uid()
    ) OR get_user_role(auth.uid()) = 'gm'
  );

ALTER TABLE lore_fragment_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lore_catalog_read" ON lore_fragment_catalog
  FOR SELECT USING (TRUE);

-- Índices
CREATE INDEX idx_campaign_stages_campaign_chapter
  ON campaign_stages(campaign_id, chapter_number, stage_number);
CREATE INDEX idx_stage_progress_character
  ON campaign_stage_progress(character_id, campaign_id);
CREATE INDEX idx_stage_progress_lookup
  ON campaign_stage_progress(character_id, campaign_id,
    chapter_number, stage_number, difficulty);
CREATE INDEX idx_lore_fragments_character
  ON lore_fragments(character_id);

-- ============================================================================
-- SEED: Campanha Aventura + 3 Capítulos + 30 Stages Normal + 30 Hard
-- ============================================================================

INSERT INTO campaigns
  (slug, name, description, total_chapters, order_index, min_level,
   unlock_requires_campaign_slug, is_active)
VALUES (
  'aventura',
  'A Aventura Começa',
  'A jornada que se abre após a Campanha Inicial. Três continentes. Trinta batalhas. Um destino.',
  3,
  2,
  10,
  'inicial',
  TRUE
) ON CONFLICT (slug) DO NOTHING;

-- CAPÍTULO 1 — Valoria (stages 1-10 Normal)
INSERT INTO campaign_stages
  (campaign_id, chapter_number, stage_number, difficulty,
   title, narrative_text, npc_key, npc_name, npc_challenge_phrase, rewards)
SELECT
  c.id, 1, s.n, 'normal',
  CASE s.n
    WHEN 1  THEN 'Portões de Aurelia'
    WHEN 2  THEN 'O Senado Desperto'
    WHEN 3  THEN 'Guardiões do Fórum'
    WHEN 4  THEN 'Criptafórum'
    WHEN 5  THEN 'A Ordem dos Códigos'
    WHEN 6  THEN 'Cavaleiros da Concordia'
    WHEN 7  THEN 'Monte Concordia'
    WHEN 8  THEN 'Heresia no Senado'
    WHEN 9  THEN 'O Arconte'
    WHEN 10 THEN 'Coração do Império'
  END,
  '[PLACEHOLDER] Fase ' || s.n || ' do Capítulo 1 — Sombras de Valoria.',
  CASE s.n
    WHEN 5 THEN 'senador_varek'
    WHEN 9 THEN 'senador_varek'
    WHEN 10 THEN 'arconte_primus'
    ELSE NULL
  END,
  CASE s.n
    WHEN 10 THEN 'Arconte Primus'
    ELSE 'Soldado Valoriano'
  END,
  CASE s.n
    WHEN 10 THEN 'O Império não cede. Nunca cedeu.'
    ELSE 'Você não passa por aqui.'
  END,
  json_build_object(
    'xp', 80 + (s.n * 20),
    'libras', 60 + (s.n * 15),
    'lore_fragment_key',
    CASE WHEN s.n IN (3, 7, 10)
      THEN 'valoria_1_' || s.n
      ELSE NULL
    END
  )::jsonb
FROM campaigns c,
     (SELECT generate_series(1,10) AS n) s
WHERE c.slug = 'aventura';

-- CAPÍTULO 1 — Hard
INSERT INTO campaign_stages
  (campaign_id, chapter_number, stage_number, difficulty,
   title, narrative_text, npc_key, npc_name, npc_challenge_phrase, rewards)
SELECT
  c.id, 1, s.n, 'hard',
  CASE s.n
    WHEN 1  THEN 'Portões de Aurelia — Sombra'
    WHEN 2  THEN 'O Senado Desperto — Sombra'
    WHEN 3  THEN 'Guardiões do Fórum — Sombra'
    WHEN 4  THEN 'Criptafórum — Sombra'
    WHEN 5  THEN 'A Ordem dos Códigos — Sombra'
    WHEN 6  THEN 'Cavaleiros da Concordia — Sombra'
    WHEN 7  THEN 'Monte Concordia — Sombra'
    WHEN 8  THEN 'Heresia no Senado — Sombra'
    WHEN 9  THEN 'O Arconte — Sombra'
    WHEN 10 THEN 'Coração do Império — Sombra'
  END,
  '[PLACEHOLDER] Versão Difícil — Fase ' || s.n || ' do Capítulo 1.',
  CASE s.n
    WHEN 5 THEN 'senador_varek'
    WHEN 9 THEN 'senador_varek'
    WHEN 10 THEN 'arconte_primus'
    ELSE NULL
  END,
  CASE s.n
    WHEN 10 THEN 'Arconte Primus'
    ELSE 'Veterano Valoriano'
  END,
  CASE s.n
    WHEN 10 THEN 'Você sobreviveu à sombra do Império. Impressionante.'
    ELSE 'Você não passou da versão fácil por acidente.'
  END,
  json_build_object(
    'xp', (80 + (s.n * 20)) * 2,
    'libras', (60 + (s.n * 15)) * 2,
    'lore_fragment_key', 'valoria_hard_1_' || s.n
  )::jsonb
FROM campaigns c,
     (SELECT generate_series(1,10) AS n) s
WHERE c.slug = 'aventura';

-- CAPÍTULO 2 — Eryuell (Normal)
INSERT INTO campaign_stages
  (campaign_id, chapter_number, stage_number, difficulty,
   title, narrative_text, npc_key, npc_name, npc_challenge_phrase, rewards)
SELECT
  c.id, 2, s.n, 'normal',
  CASE s.n
    WHEN 1  THEN 'O Véu de Vorai'
    WHEN 2  THEN 'Trilhas do Sonho'
    WHEN 3  THEN 'Guardiões de Myr-Nael'
    WHEN 4  THEN 'O Santuário de Lithennar'
    WHEN 5  THEN 'Conselhos de Memória'
    WHEN 6  THEN 'Jardins Suspensos de Evyan'
    WHEN 7  THEN 'O Tempo Regride'
    WHEN 8  THEN 'Trono Velado'
    WHEN 9  THEN 'Titânia Desperta'
    WHEN 10 THEN 'Além do Véu'
  END,
  '[PLACEHOLDER] Fase ' || s.n || ' do Capítulo 2 — O Véu de Eryuell.',
  CASE s.n
    WHEN 4 THEN 'espirito_floresta'
    WHEN 7 THEN 'espirito_floresta'
    WHEN 10 THEN 'titania'
    ELSE NULL
  END,
  CASE s.n
    WHEN 10 THEN 'Titânia'
    ELSE 'Guardião Élfico'
  END,
  CASE s.n
    WHEN 10 THEN 'O Sonho te trouxe até aqui. O Sonho pode te destruir.'
    ELSE 'Este véu não é atravessado por forasteiros.'
  END,
  json_build_object(
    'xp', 120 + (s.n * 25),
    'libras', 100 + (s.n * 20),
    'lore_fragment_key',
    CASE WHEN s.n IN (4, 7, 10)
      THEN 'eryuell_2_' || s.n
      ELSE NULL
    END
  )::jsonb
FROM campaigns c,
     (SELECT generate_series(1,10) AS n) s
WHERE c.slug = 'aventura';

-- CAPÍTULO 2 — Eryuell (Hard)
INSERT INTO campaign_stages
  (campaign_id, chapter_number, stage_number, difficulty,
   title, narrative_text, npc_key, npc_name, npc_challenge_phrase, rewards)
SELECT
  c.id, 2, s.n, 'hard',
  CASE s.n
    WHEN 1  THEN 'O Véu de Vorai — Sombra'
    WHEN 2  THEN 'Trilhas do Sonho — Sombra'
    WHEN 3  THEN 'Guardiões de Myr-Nael — Sombra'
    WHEN 4  THEN 'O Santuário de Lithennar — Sombra'
    WHEN 5  THEN 'Conselhos de Memória — Sombra'
    WHEN 6  THEN 'Jardins Suspensos de Evyan — Sombra'
    WHEN 7  THEN 'O Tempo Regride — Sombra'
    WHEN 8  THEN 'Trono Velado — Sombra'
    WHEN 9  THEN 'Titânia Desperta — Sombra'
    WHEN 10 THEN 'Além do Véu — Sombra'
  END,
  '[PLACEHOLDER] Versão Difícil — Fase ' || s.n || ' do Capítulo 2.',
  CASE s.n
    WHEN 4 THEN 'espirito_floresta'
    WHEN 7 THEN 'espirito_floresta'
    WHEN 10 THEN 'titania'
    ELSE NULL
  END,
  CASE s.n
    WHEN 10 THEN 'Titânia'
    ELSE 'Ancião Élfico'
  END,
  CASE s.n
    WHEN 10 THEN 'O Véu não perdoa uma segunda vez.'
    ELSE 'Impressionante. Inútil.'
  END,
  json_build_object(
    'xp', (120 + (s.n * 25)) * 2,
    'libras', (100 + (s.n * 20)) * 2,
    'lore_fragment_key', 'eryuell_hard_2_' || s.n
  )::jsonb
FROM campaigns c,
     (SELECT generate_series(1,10) AS n) s
WHERE c.slug = 'aventura';

-- CAPÍTULO 3 — Düren (Normal)
INSERT INTO campaign_stages
  (campaign_id, chapter_number, stage_number, difficulty,
   title, narrative_text, npc_key, npc_name, npc_challenge_phrase, rewards)
SELECT
  c.id, 3, s.n, 'normal',
  CASE s.n
    WHEN 1  THEN 'Fronteira de Ferro'
    WHEN 2  THEN 'Eisenfurt'
    WHEN 3  THEN 'Tribunal da Chama'
    WHEN 4  THEN 'Minas de Gravik'
    WHEN 5  THEN 'Cavaleiros da Chama Imaculada'
    WHEN 6  THEN 'Fortaleza de Valdrak'
    WHEN 7  THEN 'O Muro de Cinzas'
    WHEN 8  THEN 'Heresia Silenciosa'
    WHEN 9  THEN 'Inquisidor-Chefe'
    WHEN 10 THEN 'A Chama Que Não Apaga'
  END,
  '[PLACEHOLDER] Fase ' || s.n || ' do Capítulo 3 — A Chama de Düren.',
  CASE s.n
    WHEN 3 THEN 'inquisidor_maren'
    WHEN 6 THEN 'inquisidor_maren'
    WHEN 9 THEN 'inquisidor_maren'
    WHEN 10 THEN 'inquisidor_chefe'
    ELSE NULL
  END,
  CASE s.n
    WHEN 10 THEN 'Inquisidor-Chefe Valdrak'
    WHEN 9 THEN 'Inquisidor Maren'
    WHEN 3 THEN 'Inquisidor Maren'
    WHEN 6 THEN 'Inquisidor Maren'
    ELSE 'Cavaleiro da Chama'
  END,
  CASE s.n
    WHEN 10 THEN 'A pureza não negocia. A pureza extingue.'
    WHEN 9  THEN 'Você chegou longe para um herege.'
    ELSE 'A Chama julga tudo que é impuro.'
  END,
  json_build_object(
    'xp', 160 + (s.n * 30),
    'libras', 140 + (s.n * 25),
    'lore_fragment_key',
    CASE WHEN s.n IN (7, 9, 10)
      THEN 'duren_3_' || s.n
      ELSE NULL
    END
  )::jsonb
FROM campaigns c,
     (SELECT generate_series(1,10) AS n) s
WHERE c.slug = 'aventura';

-- CAPÍTULO 3 — Düren (Hard)
INSERT INTO campaign_stages
  (campaign_id, chapter_number, stage_number, difficulty,
   title, narrative_text, npc_key, npc_name, npc_challenge_phrase, rewards)
SELECT
  c.id, 3, s.n, 'hard',
  CASE s.n
    WHEN 1  THEN 'Fronteira de Ferro — Sombra'
    WHEN 2  THEN 'Eisenfurt — Sombra'
    WHEN 3  THEN 'Tribunal da Chama — Sombra'
    WHEN 4  THEN 'Minas de Gravik — Sombra'
    WHEN 5  THEN 'Cavaleiros da Chama Imaculada — Sombra'
    WHEN 6  THEN 'Fortaleza de Valdrak — Sombra'
    WHEN 7  THEN 'O Muro de Cinzas — Sombra'
    WHEN 8  THEN 'Heresia Silenciosa — Sombra'
    WHEN 9  THEN 'Inquisidor-Chefe — Sombra'
    WHEN 10 THEN 'A Chama Que Não Apaga — Sombra'
  END,
  '[PLACEHOLDER] Versão Difícil — Fase ' || s.n || ' do Capítulo 3.',
  CASE s.n
    WHEN 3 THEN 'inquisidor_maren'
    WHEN 6 THEN 'inquisidor_maren'
    WHEN 9 THEN 'inquisidor_maren'
    WHEN 10 THEN 'inquisidor_chefe'
    ELSE NULL
  END,
  CASE s.n
    WHEN 10 THEN 'Inquisidor-Chefe Valdrak'
    WHEN 9  THEN 'Inquisidor Maren'
    ELSE 'Veterano da Chama'
  END,
  CASE s.n
    WHEN 10 THEN 'Você ousou voltar. Isso não é coragem. É insanidade.'
    ELSE 'A versão fácil foi misericórdia. Essa não é.'
  END,
  json_build_object(
    'xp', (160 + (s.n * 30)) * 2,
    'libras', (140 + (s.n * 25)) * 2,
    'lore_fragment_key', 'duren_hard_3_' || s.n
  )::jsonb
FROM campaigns c,
     (SELECT generate_series(1,10) AS n) s
WHERE c.slug = 'aventura';

-- Fragmentos de Lore seed (placeholders)
INSERT INTO lore_fragment_catalog
  (fragment_key, title, content, nation, chapter_number, stage_number, difficulty)
VALUES
  ('valoria_1_3',  'Fragmento: Os Guardiões',
   '[PLACEHOLDER] Um pergaminho encontrado no Fórum. Fala de um acordo secreto entre o Senado e a Expedição Régia.',
   'valoria', 1, 3, 'normal'),
  ('valoria_1_7',  'Fragmento: O Oráculo do Monte',
   '[PLACEHOLDER] Palavras gravadas na pedra do Monte Concordia. O vento as repete há séculos.',
   'valoria', 1, 7, 'normal'),
  ('valoria_1_10', 'Fragmento: O Coração do Império',
   '[PLACEHOLDER] O diário do Arconte. Páginas rasgadas. O que resta sugere que o Conselho dos Anciões visitou Aurelia três vezes neste ano.',
   'valoria', 1, 10, 'normal'),
  ('eryuell_2_4',  'Fragmento: O Santuário Partido',
   '[PLACEHOLDER] Uma melodia gravada em casca de árvore. Quem a lê ouve algo que não existe.',
   'eryuell', 2, 4, 'normal'),
  ('eryuell_2_7',  'Fragmento: Quando o Tempo Recua',
   '[PLACEHOLDER] Registro de um elfo que viveu o mesmo dia duas vezes. O segundo foi diferente.',
   'eryuell', 2, 7, 'normal'),
  ('eryuell_2_10', 'Fragmento: A Voz de Titânia',
   '[PLACEHOLDER] Titânia disse algo antes de recuar. Ninguém consegue repetir com precisão — mas todos lembram como se sentiram.',
   'eryuell', 2, 10, 'normal'),
  ('duren_3_7',    'Fragmento: O Muro que Não Esquece',
   '[PLACEHOLDER] A terra do Muro de Cinzas guarda impressões. Uma palma na terra e você sente algo que não é seu.',
   'duren', 3, 7, 'normal'),
  ('duren_3_9',    'Fragmento: Palavras do Inquisidor',
   '[PLACEHOLDER] Maren não era sempre assim. Há um registro anterior — antes de Valdrak.',
   'duren', 3, 9, 'normal'),
  ('duren_3_10',   'Fragmento: A Chama Imaculada',
   '[PLACEHOLDER] O Inquisidor-Chefe carrega algo que não é Éter. Os instrumentos de medição de Serdin não conseguem nomear.',
   'duren', 3, 10, 'normal')
ON CONFLICT (fragment_key) DO NOTHING;
