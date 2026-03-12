-- =============================================================================
-- ARKANDIA — Migration 001: Schema inicial completo
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('player', 'gm');

CREATE TYPE character_status AS ENUM ('active', 'injured', 'dead');

CREATE TYPE profession_type AS ENUM (
  'comerciante', 'militar', 'clerigo', 'explorador',
  'artesao', 'erudito', 'nobre', 'mercenario'
);

CREATE TYPE archetype_type AS ENUM (
  'ordem', 'caos', 'tempo', 'espaco', 'materia',
  'vida', 'morte', 'vontade', 'sonho', 'guerra',
  'vinculo', 'ruina'
);

CREATE TYPE skill_type AS ENUM ('active', 'passive');

CREATE TYPE range_state AS ENUM ('curto', 'medio', 'longo', 'all');

CREATE TYPE society_member_role AS ENUM ('leader', 'officer', 'member');

-- ---------------------------------------------------------------------------
-- Tabelas de configuração (populadas pelo GM)
-- ---------------------------------------------------------------------------

CREATE TABLE professions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        profession_type NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  base_attributes JSONB NOT NULL DEFAULT '{}',
  bonuses     JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE archetypes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        archetype_type NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  lore_text   TEXT NOT NULL DEFAULT '',
  passives    JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE classes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL UNIQUE,
  description         TEXT NOT NULL DEFAULT '',
  allowed_professions JSONB NOT NULL DEFAULT '[]',
  base_skill_ids      JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE skills (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  type                  skill_type NOT NULL DEFAULT 'active',
  damage_formula        JSONB,
  is_true_damage        BOOLEAN NOT NULL DEFAULT FALSE,
  defense_penetration   INT NOT NULL DEFAULT 0,
  eter_cost             INT NOT NULL DEFAULT 0,
  cooldown_turns        INT NOT NULL DEFAULT 0,
  effect_duration_turns INT,
  range_state           range_state NOT NULL DEFAULT 'all',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Profiles (extensão de auth.users)
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL UNIQUE,
  role       user_role NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Societies (criada antes de characters por FK circular)
-- ---------------------------------------------------------------------------

CREATE TABLE societies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  leader_id   UUID, -- FK para characters, adicionada após
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Characters
-- ---------------------------------------------------------------------------

CREATE TABLE characters (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL UNIQUE,
  level             INT NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp                INT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  xp_to_next_level  INT NOT NULL DEFAULT 100,
  status            character_status NOT NULL DEFAULT 'active',
  title             TEXT,
  profession        profession_type NOT NULL,
  archetype         archetype_type,
  class_id          UUID REFERENCES classes(id) ON DELETE SET NULL,
  society_id        UUID REFERENCES societies(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agora que characters existe, adiciona FK em societies
ALTER TABLE societies
  ADD CONSTRAINT societies_leader_id_fkey
  FOREIGN KEY (leader_id) REFERENCES characters(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Character Attributes
-- ---------------------------------------------------------------------------

CREATE TABLE character_attributes (
  character_id    UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  ataque          INT NOT NULL DEFAULT 5 CHECK (ataque >= 0),
  magia           INT NOT NULL DEFAULT 5 CHECK (magia >= 0),
  eter_max        INT NOT NULL DEFAULT 20 CHECK (eter_max >= 0),
  eter_atual      INT NOT NULL DEFAULT 20 CHECK (eter_atual >= 0),
  defesa          INT NOT NULL DEFAULT 5 CHECK (defesa >= 0),
  vitalidade      INT NOT NULL DEFAULT 10 CHECK (vitalidade >= 1),
  hp_max          INT NOT NULL DEFAULT 100 CHECK (hp_max >= 1),
  hp_atual        INT NOT NULL DEFAULT 100 CHECK (hp_atual >= 0),
  velocidade      INT NOT NULL DEFAULT 5 CHECK (velocidade >= 0),
  precisao        INT NOT NULL DEFAULT 5 CHECK (precisao >= 0),
  tenacidade      INT NOT NULL DEFAULT 5 CHECK (tenacidade >= 0),
  capitania       INT NOT NULL DEFAULT 0 CHECK (capitania >= 0),
  moral           INT NOT NULL DEFAULT 100 CHECK (moral BETWEEN 0 AND 200),
  attribute_points INT NOT NULL DEFAULT 0 CHECK (attribute_points >= 0),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Character Wallet
-- ---------------------------------------------------------------------------

CREATE TABLE character_wallet (
  character_id      UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  libras            BIGINT NOT NULL DEFAULT 0 CHECK (libras >= 0),
  essencia          BIGINT NOT NULL DEFAULT 0 CHECK (essencia >= 0),
  premium_currency  BIGINT NOT NULL DEFAULT 0 CHECK (premium_currency >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Society Members
-- ---------------------------------------------------------------------------

CREATE TABLE society_members (
  society_id   UUID NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role         society_member_role NOT NULL DEFAULT 'member',
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (society_id, character_id)
);

-- ---------------------------------------------------------------------------
-- Events (log central)
-- ---------------------------------------------------------------------------

CREATE TABLE events (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type           TEXT NOT NULL,
  actor_id       UUID REFERENCES characters(id) ON DELETE SET NULL,
  target_id      UUID REFERENCES characters(id) ON DELETE SET NULL,
  metadata       JSONB NOT NULL DEFAULT '{}',
  is_public      BOOLEAN NOT NULL DEFAULT FALSE,
  narrative_text TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_society_id ON characters(society_id);
CREATE INDEX idx_characters_level ON characters(level);
CREATE INDEX idx_events_actor_id ON events(actor_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_is_public ON events(is_public);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_society_members_character_id ON society_members(character_id);

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_character_attributes_updated_at
  BEFORE UPDATE ON character_attributes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_character_wallet_updated_at
  BEFORE UPDATE ON character_wallet
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Verifica role do usuário (usada pelas políticas RLS)
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retorna o character_id do usuário logado
CREATE OR REPLACE FUNCTION get_my_character_id()
RETURNS UUID AS $$
  SELECT id FROM characters WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- Triggers de negócio
-- ---------------------------------------------------------------------------

-- Ao criar um profile, NÃO criamos character_attributes/wallet aqui
-- pois o personagem ainda não existe. Isso ocorre ao criar o character.

-- Ao criar um character: cria automaticamente character_attributes e character_wallet
CREATE OR REPLACE FUNCTION on_character_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO character_attributes (character_id, hp_max, hp_atual, eter_max, eter_atual)
  VALUES (NEW.id, 100, 100, 20, 20);

  INSERT INTO character_wallet (character_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_character_created
  AFTER INSERT ON characters
  FOR EACH ROW EXECUTE FUNCTION on_character_created();

-- Ao subir de nível: concede attribute_points
CREATE OR REPLACE FUNCTION on_level_up()
RETURNS TRIGGER AS $$
DECLARE
  points_gained INT;
BEGIN
  IF NEW.level > OLD.level THEN
    -- 2 pontos por nível, 3 pontos a cada múltiplo de 5
    points_gained := (NEW.level - OLD.level) * 2;
    IF (NEW.level % 5 = 0) THEN
      points_gained := points_gained + 1;
    END IF;

    UPDATE character_attributes
    SET attribute_points = attribute_points + points_gained
    WHERE character_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_level_up
  AFTER UPDATE OF level ON characters
  FOR EACH ROW EXECUTE FUNCTION on_level_up();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE society_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
-- Player lê/atualiza apenas o próprio perfil
CREATE POLICY "profiles: player read own" ON profiles
  FOR SELECT USING (auth.uid() = id OR get_user_role(auth.uid()) = 'gm');

CREATE POLICY "profiles: player update own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'player'); -- player não pode se auto-promover

CREATE POLICY "profiles: gm full access" ON profiles
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE POLICY "profiles: insert on signup" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ---- characters ----
-- Ficha pública: qualquer um pode ler campos públicos
CREATE POLICY "characters: public read" ON characters
  FOR SELECT USING (TRUE); -- todos leem; restrição de campos no nível da query

CREATE POLICY "characters: player insert own" ON characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "characters: player update own" ON characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "characters: gm full access" ON characters
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- ---- character_attributes ----
CREATE POLICY "char_attr: player read own" ON character_attributes
  FOR SELECT USING (
    character_id = get_my_character_id()
    OR get_user_role(auth.uid()) = 'gm'
  );

CREATE POLICY "char_attr: player update own" ON character_attributes
  FOR UPDATE USING (character_id = get_my_character_id());

CREATE POLICY "char_attr: gm full access" ON character_attributes
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE POLICY "char_attr: system insert" ON character_attributes
  FOR INSERT WITH CHECK (TRUE); -- trigger de sistema

-- ---- character_wallet ----
CREATE POLICY "wallet: player read own" ON character_wallet
  FOR SELECT USING (
    character_id = get_my_character_id()
    OR get_user_role(auth.uid()) = 'gm'
  );

CREATE POLICY "wallet: gm full access" ON character_wallet
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE POLICY "wallet: system insert" ON character_wallet
  FOR INSERT WITH CHECK (TRUE);

-- ---- tabelas de configuração (read-only para players) ----
CREATE POLICY "professions: public read" ON professions FOR SELECT USING (TRUE);
CREATE POLICY "professions: gm write" ON professions
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE POLICY "archetypes: public read" ON archetypes FOR SELECT USING (TRUE);
CREATE POLICY "archetypes: gm write" ON archetypes
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE POLICY "classes: public read" ON classes FOR SELECT USING (TRUE);
CREATE POLICY "classes: gm write" ON classes
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

CREATE POLICY "skills: public read" ON skills FOR SELECT USING (TRUE);
CREATE POLICY "skills: gm write" ON skills
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- ---- societies ----
CREATE POLICY "societies: public read" ON societies FOR SELECT USING (TRUE);
CREATE POLICY "societies: player insert" ON societies
  FOR INSERT WITH CHECK (
    leader_id = get_my_character_id()
  );
CREATE POLICY "societies: gm full access" ON societies
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- ---- society_members ----
CREATE POLICY "society_members: public read" ON society_members FOR SELECT USING (TRUE);
CREATE POLICY "society_members: gm full access" ON society_members
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- ---- events ----
-- Eventos públicos visíveis a todos; privados apenas ao GM
CREATE POLICY "events: public read" ON events
  FOR SELECT USING (is_public = TRUE OR get_user_role(auth.uid()) = 'gm');

CREATE POLICY "events: system insert" ON events
  FOR INSERT WITH CHECK (TRUE); -- server-side via service role

CREATE POLICY "events: gm full access" ON events
  FOR ALL USING (get_user_role(auth.uid()) = 'gm');

-- ---------------------------------------------------------------------------
-- Seed: Profissões base
-- ---------------------------------------------------------------------------

INSERT INTO professions (name, description, base_attributes, bonuses) VALUES
('comerciante', 'Especialista em trocas e economia. Domina o mercado com maestria.',
  '{"ataque": 4, "magia": 4, "eter_max": 15, "defesa": 4, "vitalidade": 8, "velocidade": 5, "precisao": 6, "tenacidade": 5, "capitania": 0}',
  '{"economic_multiplier": 1.5, "market_fee_reduction": 0.25}'
),
('militar', 'Guerreiro treinado nas artes da guerra e liderança de tropas.',
  '{"ataque": 8, "magia": 2, "eter_max": 10, "defesa": 7, "vitalidade": 12, "velocidade": 5, "precisao": 5, "tenacidade": 6, "capitania": 10}',
  '{"capitania_bonus": 5, "troop_training_speed": 1.25}'
),
('clerigo', 'Guardião da fé e da cura. Canaliza energias espirituais.',
  '{"ataque": 3, "magia": 9, "eter_max": 30, "defesa": 4, "vitalidade": 9, "velocidade": 4, "precisao": 5, "tenacidade": 7, "capitania": 0}',
  '{"healing_bonus": 1.3, "eter_recovery_bonus": 1.2}'
),
('explorador', 'Desbravador de terras desconhecidas. Ágil e adaptável.',
  '{"ataque": 6, "magia": 3, "eter_max": 15, "defesa": 4, "vitalidade": 9, "velocidade": 9, "precisao": 7, "tenacidade": 5, "capitania": 0}',
  '{"exploration_bonus": 1.5, "dodge_bonus": 0.1}'
),
('artesao', 'Mestre do ofício e da criação. Transforma matéria-prima em obras de arte.',
  '{"ataque": 4, "magia": 5, "eter_max": 20, "defesa": 5, "vitalidade": 9, "velocidade": 4, "precisao": 8, "tenacidade": 6, "capitania": 0}',
  '{"crafting_discount": 0.2, "item_quality_bonus": 1.2}'
),
('erudito', 'Sábio dedicado ao conhecimento arcano e científico.',
  '{"ataque": 3, "magia": 10, "eter_max": 35, "defesa": 3, "vitalidade": 7, "velocidade": 4, "precisao": 7, "tenacidade": 5, "capitania": 0}',
  '{"xp_bonus": 1.15, "spell_research_bonus": 1.3}'
),
('nobre', 'De linhagem ilustre. Influência política e recursos elevados.',
  '{"ataque": 4, "magia": 5, "eter_max": 20, "defesa": 5, "vitalidade": 9, "velocidade": 4, "precisao": 5, "tenacidade": 7, "capitania": 5}',
  '{"starting_libras": 500, "influence_bonus": 1.5}'
),
('mercenario', 'Combatente contratado. Leal apenas ao ouro.',
  '{"ataque": 7, "magia": 3, "eter_max": 15, "defesa": 6, "vitalidade": 11, "velocidade": 6, "precisao": 6, "tenacidade": 5, "capitania": 2}',
  '{"contract_reward_bonus": 1.2, "combat_xp_bonus": 1.1}'
);

-- Seed: Arquétipos
INSERT INTO archetypes (name, description, lore_text, passives) VALUES
('ordem', 'A estrutura que sustenta o mundo.', 'Os seguidores da Ordem acreditam que tudo tem seu lugar certo.', '{"defesa_bonus_percent": 15, "moral_regeneration": 5}'),
('caos', 'A força que quebra correntes.', 'O Caos não é destruição — é liberdade pura.', '{"dano_bonus_percent": 20, "dodge_bonus_percent": 10}'),
('tempo', 'O fluxo imutável que tudo consome.', 'Aqueles que dominam o Tempo veem o passado e o futuro como páginas de um livro.', '{"velocidade_bonus": 5, "cooldown_reduction_turns": 1}'),
('espaco', 'A distância entre todas as coisas.', 'O Espaço é o palco onde toda batalha se desenrola.', '{"range_bonus": 1, "penetracao_defesa": 5}'),
('materia', 'A substância de toda criação.', 'A Matéria é o fundamento do mundo físico.', '{"hp_bonus_percent": 20, "defesa_bonus": 3}'),
('vida', 'A chama que arde em todo ser vivente.', 'A Vida encontra um caminho, sempre.', '{"hp_regeneration_percent": 5, "eter_bonus_percent": 10}'),
('morte', 'O fim inevitável e a transformação.', 'A Morte não é o oposto da Vida — é sua conclusão.', '{"true_damage_bonus_percent": 10, "dano_bonus_percent": 15}'),
('vontade', 'A determinação que move montanhas.', 'A Vontade pura transcende limites físicos.', '{"tenacidade_bonus": 8, "moral_bonus": 20}'),
('sonho', 'O reino entre o real e o imaginado.', 'No Sonho, o impossível é apenas o ainda-não-tentado.', '{"magia_bonus_percent": 25, "eter_bonus_percent": 15}'),
('guerra', 'A arte do conflito e da estratégia.', 'A Guerra não é caos — é dança mortífera com regras próprias.', '{"capitania_bonus": 10, "ataque_bonus_percent": 15}'),
('vinculo', 'As conexões invisíveis entre todas as almas.', 'O Vínculo é a força que mantém sociedades unidas.', '{"aliado_bonus": 10, "society_buff_bonus": 15}'),
('ruina', 'A entropia que corrói toda criação.', 'A Ruína não destrói — ela revela a fragilidade de tudo.', '{"penetracao_defesa": 20, "efeito_negativo_bonus": 15}');
