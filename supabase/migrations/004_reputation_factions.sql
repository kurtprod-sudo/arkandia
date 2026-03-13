-- ===========================================================================
-- Fase 5 — Sistema de Reputação e Facções
-- Referência: GDD_Mundo §8, GDD_Personagem §12
-- ===========================================================================

-- Tabela de facções
CREATE TABLE factions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL,
  alignment   TEXT NOT NULL,
  description TEXT NOT NULL,
  is_hidden   BOOLEAN DEFAULT FALSE,
  conflict_faction_slugs TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Reputação do personagem com facções
CREATE TABLE character_reputation (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  faction_id   UUID NOT NULL REFERENCES factions(id),
  points       INTEGER NOT NULL DEFAULT 0,
  stage        TEXT NOT NULL DEFAULT 'neutro'
    CHECK (stage IN ('hostil', 'neutro', 'reconhecido', 'aliado', 'venerado')),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, faction_id)
);

-- RLS
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factions_read_all" ON factions FOR SELECT USING (TRUE);
CREATE POLICY "factions_gm_write" ON factions
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE character_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reputation_owner" ON character_reputation
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- Índices
CREATE INDEX idx_character_reputation_character_id
  ON character_reputation(character_id);
CREATE INDEX idx_character_reputation_faction_id
  ON character_reputation(faction_id);

-- Trigger updated_at
CREATE TRIGGER trg_character_reputation_updated_at
  BEFORE UPDATE ON character_reputation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================================================
-- Seed: 15 facções (GDD_Mundo §8)
-- ===========================================================================
INSERT INTO factions
  (name, slug, type, alignment, description, is_hidden, conflict_faction_slugs)
VALUES
('Expedição Régia', 'expedicao_regia', 'institucional', 'ordem_moderada',
 'Força-tarefa especial de Vallaeon. Hub inicial dos jogadores.',
 FALSE, '{}'),

('Conselho dos Anciões', 'conselho_ancioes', 'poder_global', 'ordem_absoluta',
 'Fundado após a Guerra Fraturada. Missão declarada: zelar pelo equilíbrio dos Arquétipos.',
 FALSE, ARRAY['mare_vermelha']),

('Marinha Imperial', 'marinha_imperial', 'forca_ordem', 'lei_continental',
 'Braço armado do Conselho. Aplica a lei entre macrorregiões.',
 FALSE, '{}'),

('Ordem dos Doze Espelhos', 'ordem_doze_espelhos', 'religioso', 'equilibrio',
 'Principal instituição religiosa de Vallaeon. Medeia fés de todo o continente.',
 FALSE, '{}'),

('Suserania Negra', 'suserania_negra', 'coalizao', 'caos_controlado',
 'Aliança informal de resistência ao domínio das nações centrais. Reputação invisível na ficha pública.',
 TRUE, '{}'),

('Academia Arcana de Serdin', 'academia_arcana', 'institucional_arcano', 'neutra',
 'Maior centro de estudos arcanos de Ellia. Forma magos e especialistas em Maestrias.',
 FALSE, ARRAY['inquisicao_duren']),

('Inquisição de Düren', 'inquisicao_duren', 'religioso_militar', 'pureza_extrema',
 'Braço espiritual e militar de Düren. Fiscalizadora do uso de Éter.',
 FALSE, ARRAY['academia_arcana', 'portadores_chama']),

('Cavaleiros Vermelhos', 'cavaleiros_vermelhos', 'elite_militar', 'vontade_flamejante',
 'Elite mais antiga de Vermécia. Mistura aço, fé e Éter.',
 FALSE, '{}'),

('Maré Vermelha', 'mare_vermelha', 'revolucionario', 'ruptura',
 'Dissidentes e exilados. Terroristas para uns, última esperança para outros.',
 FALSE, ARRAY['conselho_ancioes', 'marinha_imperial']),

('Círculo de Sangue', 'circulo_sangue', 'mercenario', 'contrato',
 'Mercenários oficiais do continente. Fazem o trabalho sujo.',
 FALSE, '{}'),

('Mãos de Zaffar', 'maos_zaffar', 'comercio', 'oportunismo',
 'Mercadores e agentes do mercado negro. Especialistas em itens raros.',
 FALSE, '{}'),

('Companhia do Primeiro Vento', 'companhia_primeiro_vento', 'exploracao', 'neutro',
 'Lendária tripulação. Missões impossíveis nos bastidores.',
 FALSE, '{}'),

('Pacto dos Vagalumes', 'pacto_vagalumes', 'espiritual', 'sonho_ruina',
 'Nômades que buscam reacender a luz original de Ellia.',
 FALSE, '{}'),

('Portadores da Chama', 'portadores_chama', 'legado', 'vontade',
 'Herdeiros do ideal de Liesel Heckmann. Dispersos pelo continente.',
 FALSE, ARRAY['inquisicao_duren']);
