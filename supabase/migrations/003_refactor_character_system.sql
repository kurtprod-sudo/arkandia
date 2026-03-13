-- =============================================================================
-- ARKANDIA — Migration 003: Refatoração do sistema de personagem
-- Redesign: Profissões → Raças + Classes por arma
-- Referência: GDD_Personagem.md v1.0
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Criar tabela races
-- ---------------------------------------------------------------------------

CREATE TABLE races (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  archetype_origin TEXT[] NOT NULL,
  geo_affinity TEXT NOT NULL,
  lore_text   TEXT NOT NULL,
  passives    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. Refatorar tabela classes (adicionar colunas do novo sistema)
-- ---------------------------------------------------------------------------

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS weapon_type TEXT,
  ADD COLUMN IF NOT EXISTS primary_attributes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_attribute TEXT,
  ADD COLUMN IF NOT EXISTS scaling JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lore_text TEXT;

-- ---------------------------------------------------------------------------
-- 3. Adicionar colunas de Raça, Ressonância e estado em characters
-- ---------------------------------------------------------------------------

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS race_id UUID REFERENCES races(id),
  ADD COLUMN IF NOT EXISTS resonance_archetype TEXT,
  ADD COLUMN IF NOT EXISTS resonance_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_resonance_unlocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS injured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_until TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. Dropar tabela skills antiga e recriar com novo schema
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS skills CASCADE;

CREATE TABLE skills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  class_id              UUID REFERENCES classes(id),
  skill_type            TEXT NOT NULL CHECK (skill_type IN ('ativa', 'passiva', 'reativa')),
  tree_position         INTEGER,
  formula               JSONB DEFAULT '{}',
  eter_cost             INTEGER DEFAULT 0,
  cooldown_turns        INTEGER DEFAULT 0,
  effect_duration_turns INTEGER,
  range_state           TEXT CHECK (range_state IN ('curto', 'medio', 'longo', 'qualquer')),
  description           TEXT NOT NULL,
  is_starting_skill     BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. Criar tabela character_skills
-- ---------------------------------------------------------------------------

CREATE TABLE character_skills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id     UUID NOT NULL REFERENCES skills(id),
  acquired_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, skill_id)
);

-- ---------------------------------------------------------------------------
-- 6. Criar tabela character_building (6 slots)
-- ---------------------------------------------------------------------------

CREATE TABLE character_building (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id      UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot              INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 6),
  skill_id          UUID REFERENCES skills(id),
  equipment_item_id UUID,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, slot)
);

-- ---------------------------------------------------------------------------
-- 7. Criar tabela maestrias
-- ---------------------------------------------------------------------------

CREATE TABLE maestrias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('prestígio', 'ressonância', 'lendária')),
  flavor        TEXT CHECK (flavor IN ('bestial', 'mítica', 'singular')),
  description   TEXT NOT NULL,
  restrictions  JSONB DEFAULT '{}',
  cost          JSONB DEFAULT '{}',
  skill_ids     UUID[] DEFAULT '{}',
  is_exhaustible BOOLEAN DEFAULT FALSE,
  exhausted_by  UUID REFERENCES characters(id),
  exhausted_at  TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. Criar tabela character_maestrias
-- ---------------------------------------------------------------------------

CREATE TABLE character_maestrias (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  maestria_id  UUID NOT NULL REFERENCES maestrias(id),
  acquired_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, maestria_id)
);

-- ---------------------------------------------------------------------------
-- 9. Deprecar professions (sem deletar)
-- ---------------------------------------------------------------------------

ALTER TABLE professions
  ADD COLUMN IF NOT EXISTS deprecated BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON TABLE professions IS 'DEPRECATED — substituída por races + classes no redesign de Março 2026. Mantida para preservar dados históricos.';

-- ---------------------------------------------------------------------------
-- 10. Atualizar archetypes com lore completo (GDD_Mundo §3 + GDD_Personagem §6)
-- ---------------------------------------------------------------------------

TRUNCATE TABLE archetypes RESTART IDENTITY CASCADE;

INSERT INTO archetypes (name, description, lore_text, passives) VALUES
('ordem', 'A estrutura que sustenta o mundo.', 'A Ordem não pensa, mas estrutura. Não ama, mas sustenta. Seu sopro fixa o ciclo das marés, a solidez dos ossos, o compasso das estrelas. Os que carregam essa Ressonância são os legisladores silenciosos da realidade — mas a Ordem também é prisão.', '{"tendencia": "controle de campo, selos, bloqueios", "culturas": ["Valoria", "Düren", "Shenzhou"]}'),
('caos', 'A força que quebra correntes.', 'O Caos não deseja o mal — apenas não reconhece limites. É a fagulha que interrompe o silêncio, o impulso de criar e destruir sem medir. São poetas da mutação e mestres da dissonância.', '{"tendencia": "instabilidade como arma, efeitos duplos", "culturas": ["Norrheim", "Maré Vermelha"]}'),
('tempo', 'O fluxo imutável que tudo consome.', 'O Tempo não corre — pulsa. Está em tudo: no amadurecimento de uma árvore, no esfarelar de uma ruína. São cronomantes, profetas, observadores. Não agem com pressa. Pois sabem que tudo chega — ou volta.', '{"tendencia": "velocidade, cooldowns, presciência", "culturas": ["Shenzhou", "Urgath", "Eryuell"]}'),
('espaco', 'A distância entre todas as coisas.', 'O Espaço não se move, mas permite o movimento. Liga e separa, distancia e conecta. Os tocados por essa Ressonância têm uma estranha relação com a presença: nunca estão totalmente onde deveriam.', '{"tendencia": "teleporte, distância, posicionamento", "culturas": ["Ottovar", "Ogygia"]}'),
('materia', 'A substância de toda criação.', 'É pedra, madeira, metal, osso, músculo. Firme, pesada, ancestral. Os que herdam essa Ressonância sentem afinidade com o tangível. A Matéria ensina que a realidade é maleável — mas exige esforço e intenção.', '{"tendencia": "resistência, construção, transmutação", "culturas": ["Düren", "Norrheim"]}'),
('vida', 'A chama que arde em todo ser vivente.', 'É a seiva que sobe pela raiz, o sangue que corre, o grito do primeiro ar. Generosa, exuberante e às vezes cruel. Os portadores exalam energia, emoção, criação. A Vida nunca para.', '{"tendencia": "regeneração, crescimento, veneno", "culturas": ["Albyn", "Kastulle", "Indravaar"]}'),
('morte', 'O fim inevitável e a transformação.', 'A Morte não é maligna. Ela apenas é. Aguarda com a paciência de mil eras. Sem a Morte não haveria renovação, descanso ou memória. Os que a tocam devem decidir: serão pontes ou juízes?', '{"tendencia": "drenagem, fim de ciclos, espectros", "culturas": ["Kastulle", "Urgath"]}'),
('vontade', 'A determinação que move montanhas.', 'A Vontade não é força física nem intelecto — é aquilo que, dentro do peito, recusa o fim. Os herdeiros dessa Ressonância são sobreviventes, superadores, desafiadores do impossível.', '{"tendencia": "limites quebrados, resistência sobrenatural", "culturas": ["Vermécia", "Indravaar", "Norrheim"]}'),
('sonho', 'O reino entre o real e o imaginado.', 'Escapa à lógica, à física, à razão. É a origem de ideias, símbolos e pesadelos. Os fragmentados por ele vivem com um pé na realidade e outro em outro lugar.', '{"tendencia": "ilusão, criação, percepção distorcida", "culturas": ["Eryuell", "Ottovar", "Albyn"]}'),
('guerra', 'O impulso de se testar.', 'É mais do que sangue. É o desejo de se medir, de descobrir o quanto se pode ir antes de cair. Está no duelo honrado, no conflito interno, no avanço sobre o medo.', '{"tendencia": "combate puro, técnicas nomeadas, aura de desafio", "culturas": ["Vermécia", "Ryugakure", "Ogygia"]}'),
('vinculo', 'O fio que une tudo.', 'Está no laço entre mãe e filho, no pacto entre reis, no toque entre amantes. Pulsa em almas conectadas — que vivem pelos outros, com os outros, entre os outros.', '{"tendencia": "fusão com aliados, transferência, pactos espirituais", "culturas": ["Vallaeon", "Eryuell", "Albyn"]}'),
('ruina', 'A entropia que corrói toda criação.', 'Ela não corre: espera. Tudo que existe tende ao fim, ao desgaste, à quebra. Os tocados por ela caminham entre os restos — desestabilizadores, purificadores pelo fim.', '{"tendencia": "quebra de magias, corrosão, anulação de buffs", "culturas": ["Urgath", "Suserania Negra"]}');

-- ---------------------------------------------------------------------------
-- 11. Seeds de Raças (GDD_Personagem §2)
-- ---------------------------------------------------------------------------

INSERT INTO races (name, archetype_origin, geo_affinity, lore_text, passives) VALUES
('Humano', ARRAY['Vínculo'], 'Terras Centrais — cosmopolita', 'Os humanos não são a raça mais forte, mais velha nem mais sábia — são a mais versátil. Sem dom inato único, desenvolveram a capacidade de se adaptar, aprender e superar qualquer outra raça em dedicação pura.', '{"descricao_bonus": "Maior pool de pontos livres por nível. Sem restrição a nenhuma Maestria por raça.", "adaptacao": true, "versatilidade": true}'),
('Elfo', ARRAY['Sonho', 'Vínculo'], 'Eryuell — Ilhas Ocidentais', 'Os elfos de Ellia são distantes. Vivem mais longamente que qualquer raça jogável, o que os torna naturalmente contemplativos e às vezes melancólicos. Cada elfo carrega memórias de eras que outras raças conhecem apenas como história.', '{"descricao_bonus": "Bônus em Éter máximo. Vantagem em missões de ilusão, sonho e planos espirituais.", "eter_bonus": true, "percepcao_sonho": true}'),
('Anão', ARRAY['Matéria', 'Ordem'], 'Düren e Norrheim — Domínios do Norte', 'Os anões são a raça mais antiga ainda presente no mundo físico em grandes números. Seu corpo foi literalmente moldado pela Matéria — denso, resistente, próximo da pedra e do ferro. São os maiores mestres de forja e arquitetura de Ellia.', '{"descricao_bonus": "Bônus em Defesa e Vitalidade. Vantagem em missões de crafting e territórios Forja.", "defesa_bonus": true, "vitalidade_bonus": true, "bonus_forja": true}'),
('Draconiano', ARRAY['Guerra', 'Vontade', 'Ruína'], 'Disperso — sem pátria após a queda de Petrania', 'Jogar como Draconiano é carregar o peso de uma linhagem apagada. O Conselho dos Anciões suprimiu a história dos Drakharn. São vistos com mistura de fascínio e desconfiança: lembram demais o que foi destruído.', '{"descricao_bonus": "Bônus em Ataque e resistência a dano de fogo. Em missões de Monólitos, recebem fragmentos narrativos exclusivos.", "ataque_bonus": true, "resistencia_fogo": true, "eco_do_ciclo": true}'),
('Meio-Gigante', ARRAY['Guerra', 'Matéria'], 'Norrheim — Domínios do Norte', 'Os Meio-Gigantes existem entre dois mundos: grandes demais para serem tratados como iguais pelas raças menores, pequenos demais para pertencerem à linhagem pura dos Gigantes ancestrais. Em Norrheim são respeitados como guerreiros de elite.', '{"descricao_bonus": "Bônus em Vitalidade e Tenacidade. Bônus em habilidades de impacto e derrubada.", "vitalidade_bonus": true, "tenacidade_bonus": true, "bonus_impacto": true}'),
('Melfork', ARRAY['Vida', 'Espaço', 'Vínculo'], 'Ilhas Ocidentais e litoral de Kastulle', 'Os Melfork são a raça mais misteriosa para os continentais — porque vêm de um mundo que a maioria nunca verá. O oceano de Ellia não é apenas água: é um plano com sua própria política, história e magia.', '{"descricao_bonus": "Bônus em Magia e regeneração de Éter. Vantagem em missões aquáticas e territoriais insulares.", "magia_bonus": true, "eter_regeneracao": true, "bonus_maritimo": true}');

-- ---------------------------------------------------------------------------
-- 12. Seeds de Classes (GDD_Personagem §3)
-- ---------------------------------------------------------------------------

TRUNCATE TABLE classes RESTART IDENTITY CASCADE;

INSERT INTO classes (name, description, weapon_type, primary_attributes, secondary_attribute, lore_text, scaling) VALUES
('Lanceiro', 'O Lanceiro é a distância calculada. Não recua — posiciona. Combina alcance, timing e fluxo de Éter em movimentos que parecem dança e terminam em perfuração.', 'Lança / Alabarda / Glaive', ARRAY['ataque', 'velocidade'], 'precisao', 'Em culturas guerreiras como Ryugakure e Valoria, a lança é a arma do soldado que mantém a linha. Em Indravaar, é o símbolo do guardião espiritual.', '{"foco": "ataque e velocidade", "crescimento_secundario": "precisao"}'),
('Espadachim', 'A espada é a arma mais estudada de Ellia — e o Espadachim é quem levou esse estudo à obsessão. Cada golpe é intencional, cada movimento tem nome.', 'Espada (uma mão, duas mãos ou dupla)', ARRAY['ataque', 'precisao'], 'tenacidade', 'Há escolas, filosofias, juramentos e heresias dentro do combate com espada. O Espadachim pode ser o duelista elegante de Ogygia ou o guerreiro-código de Ryugakure.', '{"foco": "ataque e precisao", "crescimento_secundario": "tenacidade"}'),
('Lutador', 'O Lutador escolheu a distância zero — não como desespero, mas como filosofia. Canaliza Éter diretamente pela carne. Seus golpes carregam intenção espiritual concentrada.', 'Manopla / Garras / Braçadeiras de combate', ARRAY['ataque', 'vitalidade'], 'tenacidade', 'Em Norrheim e Indravaar, o combate corpo a corpo é forma de oração. Em Vermécia, é o teste máximo da Vontade Flamejante.', '{"foco": "vitalidade e ataque", "crescimento_secundario": "tenacidade"}'),
('Bardo', 'O instrumento do Bardo não é ornamento — é arma. Som é Éter em forma auditiva: frequências que ressoam com os Arquétipos, melodias que reescrevem estados espirituais.', 'Instrumento musical (catalisador mágico-musical)', ARRAY['magia', 'eter_max'], 'precisao', 'Em Albyn e Ogygia, bardos são temidos como armas de guerra. Em Vallaeon, são diplomatas que mudam o humor de salas inteiras com sua presença.', '{"foco": "magia e eter", "crescimento_secundario": "precisao"}'),
('Atirador', 'As armas de fogo de Ellia não são pólvora comum — são projéteis etéreos acelerados por cristais de compressão. O Atirador acerta o alvo antes que o debate sobre honra termine.', 'Arma de fogo (pistola, rifle, espingarda etérica)', ARRAY['precisao', 'ataque'], 'velocidade', 'Surgiu nas últimas eras, associado às culturas que mesclaram alquimia e engenharia espiritual: Vermécia, Ogygia, Kastulle. É a classe mais controversa — alguns a chamam de magia sem honra.', '{"foco": "precisao e ataque", "crescimento_secundario": "velocidade"}'),
('Arqueiro', 'O arco existe desde a Era dos Heróis Eternos e nunca foi superado em elegância ou alcance espiritual. O Arqueiro canaliza Éter pela flecha no momento do disparo.', 'Arco (curto, longo, composto)', ARRAY['precisao', 'ataque'], 'velocidade', 'Em Ryugakure, arqueiros são assassinos de precisão cirúrgica. Em Norrheim, são caçadores com vínculo espiritual com a presa. Em Eryuell, o arco é instrumento de meditação.', '{"foco": "precisao e ataque", "crescimento_secundario": "velocidade"}'),
('Assassino', 'O Assassino não é apenas alguém que mata — é alguém que entende que a maioria das batalhas termina antes de começar. A adaga é o ponto final de uma frase que começou muito antes.', 'Adaga / Armas curtas / Ferramentas de ocultação', ARRAY['ataque', 'velocidade'], 'precisao', 'Existem em todas as culturas: Shinobi em Ryugakure, Lâminas Sombrias em Vermécia, Sombras do Véu em Eryuell. Todos compartilham a mesma verdade: visibilidade é vulnerabilidade.', '{"foco": "velocidade e ataque", "crescimento_secundario": "precisao"}'),
('Druida', 'O Druida de Arkandia não é o ancião contemplativo — é o guardião que pega um machado e vai resolver o problema pessoalmente. Canaliza o Arquétipo da Vida diretamente através do golpe.', 'Machado (uma ou duas mãos)', ARRAY['ataque', 'vitalidade'], 'magia', 'Inspirado nos guerreiros-druidas de Albyn e guardiões de Norrheim. O machado não corta apenas carne — corta raízes espirituais, sela fluxos de Éter corrompido.', '{"foco": "ataque e vitalidade", "crescimento_secundario": "magia"}'),
('Destruidor', 'O Destruidor não derrota inimigos — ele desfaz. Estruturas, formações, escudos, armaduras, vontades: tudo cede diante do impacto certo no momento certo.', 'Martelo / Maça / Armas de impacto pesado', ARRAY['ataque', 'vitalidade'], 'defesa', 'Em Düren, Destruidores demolem estruturas etéricas proibidas. Em Norrheim, são campeões em rituais de força. Em Urgath, alguns carregam martelos com fragmentos de Gaia.', '{"foco": "ataque e vitalidade", "crescimento_secundario": "defesa"}'),
('Escudeiro', 'O Escudeiro não é um aprendiz — é alguém que entendeu que proteção é uma forma de ataque. O escudo é arma, declaração e canal etéreo simultaneamente.', 'Escudo (combinado com espada curta, maça ou lança)', ARRAY['defesa', 'vitalidade'], 'ataque', 'Em Valoria são a espinha dorsal das legiões. Em Düren são os guardiões das execuções públicas. Em qualquer lugar, sua presença muda o ritmo do combate.', '{"foco": "defesa e vitalidade", "crescimento_secundario": "ataque"}'),
('Mago', 'O Cajado é o catalisador mais antigo de Ellia — anterior às espadas. O Mago escolheu o Éter como linguagem primária, quem estuda sua estrutura, quem o manipula em formas que outros mal percebem.', 'Cajado (catalisador etéreo bruto)', ARRAY['magia', 'eter_max'], 'precisao', 'Em Serdin, Magos são arqueomagos em formação. Em Shenzhou, são filósofos do cosmos. Em Urgath, são oráculos que leem o tempo através do Éter.', '{"foco": "magia e eter", "crescimento_secundario": "precisao"}');

-- ---------------------------------------------------------------------------
-- 13. Índices para novas tabelas
-- ---------------------------------------------------------------------------

CREATE INDEX idx_races_name ON races(name);
CREATE INDEX idx_skills_class_id ON skills(class_id);
CREATE INDEX idx_skills_skill_type ON skills(skill_type);
CREATE INDEX idx_character_skills_character_id ON character_skills(character_id);
CREATE INDEX idx_character_skills_skill_id ON character_skills(skill_id);
CREATE INDEX idx_character_building_character_id ON character_building(character_id);
CREATE INDEX idx_maestrias_category ON maestrias(category);
CREATE INDEX idx_maestrias_is_active ON maestrias(is_active);
CREATE INDEX idx_character_maestrias_character_id ON character_maestrias(character_id);
CREATE INDEX idx_characters_race_id ON characters(race_id);

-- ---------------------------------------------------------------------------
-- 14. RLS para novas tabelas
-- ---------------------------------------------------------------------------

-- races: leitura pública
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "races_read_all" ON races FOR SELECT USING (TRUE);
CREATE POLICY "races_gm_write" ON races FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- skills (nova): leitura pública
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_read_all" ON skills FOR SELECT USING (TRUE);
CREATE POLICY "skills_gm_write" ON skills FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- character_skills: jogador vê/gerencia as próprias, GM acesso total
ALTER TABLE character_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_skills_owner" ON character_skills
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "character_skills_insert" ON character_skills
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- character_building: jogador gerencia o próprio, GM acesso total
ALTER TABLE character_building ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_building_owner" ON character_building
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "character_building_insert" ON character_building
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- maestrias: leitura pública
ALTER TABLE maestrias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maestrias_read_all" ON maestrias FOR SELECT USING (TRUE);
CREATE POLICY "maestrias_gm_write" ON maestrias FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- character_maestrias: jogador vê/gerencia as próprias, GM acesso total
ALTER TABLE character_maestrias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "character_maestrias_owner" ON character_maestrias
  FOR ALL USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );
CREATE POLICY "character_maestrias_insert" ON character_maestrias
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR get_user_role(auth.uid()) = 'gm'
  );

-- ---------------------------------------------------------------------------
-- 15. Trigger updated_at para character_building
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_character_building_updated_at
  BEFORE UPDATE ON character_building
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
