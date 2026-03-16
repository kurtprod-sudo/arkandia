-- ============================================================================
-- 026_reputation.sql — Reputation Events + Seed de facções adicionais
-- Complementa 004_reputation_factions.sql
-- ============================================================================

-- Log de eventos de reputação (auditoria)
CREATE TABLE IF NOT EXISTS reputation_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  faction_id    UUID NOT NULL REFERENCES factions(id),
  delta         INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  source        TEXT NOT NULL
    CHECK (source IN ('expedition', 'war', 'narrative', 'gm', 'quest')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reputation_events_owner" ON reputation_events
  FOR SELECT USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "reputation_events_system_insert" ON reputation_events
  FOR INSERT WITH CHECK (TRUE);

CREATE INDEX idx_reputation_events_character ON reputation_events(character_id);
CREATE INDEX idx_reputation_events_faction ON reputation_events(faction_id);

-- Seed facções regionais adicionais (se não existem)
-- As facções base foram criadas na migration 004
INSERT INTO factions (slug, name, type, alignment, description, is_hidden, conflict_faction_slugs)
VALUES
('imperio_valoriano',
 'Império Valoriano',
 'nacao', 'ordem',
 'O maior poder militar das Terras Centrais. Ordem, disciplina e expansão.',
 FALSE, ARRAY['mare_vermelha']),
('clans_norrheim',
 'Clãs de Norrheim',
 'nacao', 'guerra',
 'Confederação de clãs guerreiros do norte. Honra acima de tudo.',
 FALSE, ARRAY[]::text[]),
('forjas_duren',
 'Forjas de Düren',
 'nacao', 'ordem',
 'Guildas anãs que controlam as melhores forjas do mundo conhecido.',
 FALSE, ARRAY[]::text[]),
('coroa_ogygia',
 'Coroa de Ogygia',
 'nacao', 'vinculo',
 'Monarquia insultar refinada. Artes, duelos e diplomacia são suas armas.',
 FALSE, ARRAY[]::text[]),
('guardas_eryuell',
 'Guardas de Eryuell',
 'nacao', 'sonho',
 'Protetores élficos das Ilhas ancestrais. Memória viva de eras passadas.',
 FALSE, ARRAY[]::text[]),
('codigo_ryugakure',
 'Código de Ryugakure',
 'nacao', 'ordem',
 'Ordem marcial do extremo oriente. Disciplina espiritual e técnica elevada.',
 FALSE, ARRAY[]::text[]),
('filosofos_shenzhou',
 'Filósofos de Shenzhou',
 'nacao', 'tempo',
 'Estudiosos do Éter e do cosmos. Conhecimento é seu único poder.',
 FALSE, ARRAY[]::text[])
ON CONFLICT (slug) DO NOTHING;
