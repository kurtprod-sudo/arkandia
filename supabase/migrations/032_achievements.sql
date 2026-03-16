-- ============================================================================
-- FASE 28 — Conquistas Automáticas
-- Referência: GDD_Sistemas §6.9
-- ============================================================================

CREATE TABLE achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key               TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN (
    'progressao', 'combate', 'exploracao', 'social', 'economia', 'marco'
  )),
  rarity            TEXT NOT NULL DEFAULT 'comum' CHECK (rarity IN (
    'comum', 'raro', 'epico', 'lendario'
  )),
  icon              TEXT NOT NULL DEFAULT 'trophy',
  target            INTEGER,
  title_reward_name TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE character_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id   UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress       INTEGER NOT NULL DEFAULT 0,
  unlocked_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, achievement_id)
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_read_all" ON achievements FOR SELECT USING (TRUE);
CREATE POLICY "achievements_gm_write" ON achievements FOR ALL USING (get_user_role(auth.uid()) = 'gm');

ALTER TABLE character_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_achievements_owner" ON character_achievements
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "character_achievements_read_all" ON character_achievements FOR SELECT USING (TRUE);

CREATE INDEX idx_char_achievements_character ON character_achievements(character_id);
CREATE INDEX idx_char_achievements_unlocked ON character_achievements(character_id, unlocked_at) WHERE unlocked_at IS NOT NULL;
CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);

-- Títulos novos
INSERT INTO title_definitions (name, description, category, trigger_type, trigger_condition, is_unique) VALUES
('Veterano','Alcançou o nível 20.','progressao','automatico','{}',FALSE),
('Lenda Viva','Alcançou o nível 30.','progressao','automatico','{}',FALSE),
('Mestre dos Mestres','Aprendeu todas as Maestrias.','maestria','automatico','{}',FALSE),
('Artesão Supremo','Enhancement +12.','progressao','automatico','{}',FALSE),
('Guerreiro Provado','50 duelos ranqueados.','guerra','automatico','{}',FALSE),
('Cem Quedas','100 duelos ranqueados.','guerra','automatico','{}',FALSE),
('Terror do Campo','500 duelos ranqueados.','guerra','automatico','{}',FALSE),
('Campeão','Venceu um torneio.','guerra','automatico','{}',FALSE),
('Incansável','Desafio diário 30 dias.','progressao','automatico','{}',FALSE),
('Desbravador','50 expedições.','exploracao','automatico','{}',FALSE),
('Predador','500 NPCs em hunting.','exploracao','automatico','{}',FALSE),
('Flagelo','1000 NPCs em hunting.','exploracao','automatico','{}',FALSE),
('Senhor das Profundezas','50 dungeons.','exploracao','automatico','{}',FALSE),
('General de Campo','Expedição com tropas.','guerra','automatico','{}',FALSE),
('Voz do Mundo','50 cartas enviadas.','especial','automatico','{}',FALSE),
('Tesoureiro','100.000 Libras.','progressao','automatico','{}',FALSE),
('Tocado pelo Destino','Item lendário via Summon.','especial','automatico','{}',FALSE),
('Presença Constante','Streak 30 dias.','progressao','automatico','{}',FALSE),
('Disciplina','Daily tasks 30 dias.','progressao','automatico','{}',FALSE),
('Testemunha da História','Evento de Mundo.','especial','automatico','{}',FALSE)
ON CONFLICT (name) DO NOTHING;

-- Conquistas
INSERT INTO achievements (key, title, description, category, rarity, icon, target, title_reward_name) VALUES
('first_level','Primeiro Passo','Alcance o nível 2.','progressao','comum','arrow-up',NULL,NULL),
('level_5','Ressonância Desperta','Alcance o nível 5.','progressao','comum','zap',NULL,NULL),
('level_10','A Travessia','Alcance o nível 10.','progressao','raro','star',NULL,NULL),
('level_20','Veterano de Ellia','Alcance o nível 20.','progressao','epico','crown',NULL,'Veterano'),
('level_30','Lenda Viva','Alcance o nível 30.','progressao','lendario','flame',NULL,'Lenda Viva'),
('first_maestria','Primeiro Domínio','Aprenda sua primeira Maestria.','progressao','comum','book-open',NULL,NULL),
('all_maestrias','Mestre dos Mestres','Aprenda todas as Maestrias.','progressao','lendario','library',NULL,'Mestre dos Mestres'),
('first_equipment','Armado','Equipe um item pela primeira vez.','progressao','comum','shield',NULL,NULL),
('enhance_plus5','Forjador','Aprimore um item até +5.','progressao','raro','hammer',NULL,NULL),
('enhance_plus12','Artesão Supremo','Aprimore um item até +12.','progressao','epico','anvil',NULL,'Artesão Supremo'),
('first_pvp_win','Primeira Sangria','Vença seu primeiro duelo.','combate','comum','swords',NULL,NULL),
('pvp_wins_10','Combatente','Vença 10 duelos.','combate','comum','swords',10,NULL),
('pvp_wins_50','Guerreiro Provado','Vença 50 duelos ranqueados.','combate','raro','shield',50,'Guerreiro Provado'),
('pvp_wins_100','Cem Quedas','Vença 100 duelos ranqueados.','combate','epico','trophy',100,'Cem Quedas'),
('pvp_wins_500','Terror do Campo','Vença 500 duelos ranqueados.','combate','lendario','skull',500,'Terror do Campo'),
('first_ambush','Sombra','Realize sua primeira emboscada.','combate','raro','eye-off',NULL,NULL),
('tournament_win','Campeão','Vença um torneio.','combate','epico','crown',NULL,'Campeão'),
('daily_challenge_7','Sete Dias de Aço','Desafio diário 7 dias seguidos.','combate','raro','calendar',7,NULL),
('daily_challenge_30','Incansável','Desafio diário 30 dias seguidos.','combate','lendario','flame',30,'Incansável'),
('first_expedition','Horizonte Aberto','Complete sua primeira expedição.','exploracao','comum','compass',NULL,NULL),
('expeditions_10','Explorador','Complete 10 expedições.','exploracao','comum','map',10,NULL),
('expeditions_50','Desbravador','Complete 50 expedições.','exploracao','raro','map-pin',50,'Desbravador'),
('first_hunting','Primeira Caça','Derrote seu primeiro NPC em hunting.','exploracao','comum','crosshair',NULL,NULL),
('hunting_kills_100','Caçador','Derrote 100 NPCs em hunting.','exploracao','comum','target',100,NULL),
('hunting_kills_500','Predador','Derrote 500 NPCs em hunting.','exploracao','raro','zap',500,'Predador'),
('hunting_kills_1000','Flagelo das Criaturas','Derrote 1000 NPCs em hunting.','exploracao','epico','skull',1000,'Flagelo'),
('first_dungeon','Adentrou o Abismo','Complete sua primeira dungeon.','exploracao','comum','door-open',NULL,NULL),
('dungeons_10','Mergulhador','Complete 10 dungeons.','exploracao','raro','layers',10,NULL),
('dungeons_50','Senhor das Profundezas','Complete 50 dungeons.','exploracao','epico','anchor',50,'Senhor das Profundezas'),
('first_troop_exp','General de Campo','Expedição com tropas.','exploracao','raro','flag',NULL,'General de Campo'),
('first_letter','Correio do Destino','Envie sua primeira carta.','social','comum','mail',NULL,NULL),
('letters_10','Escriba','Envie 10 cartas.','social','comum','pen-line',10,NULL),
('letters_50','Voz do Mundo','Envie 50 cartas.','social','raro','scroll',50,'Voz do Mundo'),
('first_diary','Memória Registrada','Primeira entrada de diário.','social','comum','book',NULL,NULL),
('join_society','Parte de Algo Maior','Entre em uma Sociedade.','social','comum','users',NULL,NULL),
('society_war_win','Herói de Guerra','Participe de uma guerra vencida.','social','raro','shield',NULL,'Veterano de Guerra'),
('resonance_event','O Chamado','Desbloqueie a Ressonância.','social','raro','sparkles',NULL,NULL),
('first_trade','Comerciante','Primeira transação no Bazaar.','economia','comum','shopping-bag',NULL,NULL),
('trades_50','Negociante','50 transações no Bazaar.','economia','raro','trending-up',50,NULL),
('first_craft','Artesão','Primeiro item craftado.','economia','comum','hammer',NULL,NULL),
('libras_100k','Tesoureiro','Acumule 100.000 Libras.','economia','raro','coins',NULL,'Tesoureiro'),
('first_summon','O Chamado da Caixa','Primeiro Summon.','economia','comum','gift',NULL,NULL),
('summon_lendario','Toque do Destino','Item lendário via Summon.','economia','epico','star',NULL,'Tocado pelo Destino'),
('first_login','O Início','Entre em Arkandia.','marco','comum','log-in',NULL,NULL),
('streak_30','Presença Constante','Login streak de 30 dias.','marco','epico','calendar',NULL,'Presença Constante'),
('all_daily_tasks','Dia Completo','Todas as daily tasks em um dia.','marco','comum','check-circle',NULL,NULL),
('daily_tasks_30','Disciplina','Daily tasks por 30 dias.','marco','raro','zap',30,'Disciplina'),
('first_world_event','Testemunha da História','Participe de um Evento de Mundo.','marco','raro','globe',NULL,'Testemunha da História'),
('secret_lore','Portador de Segredo','Fragmento de lore secreto.','marco','lendario','eye',NULL,'Portador de Segredo');
