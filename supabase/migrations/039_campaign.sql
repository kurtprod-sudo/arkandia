-- =============================================================================
-- 039 — Campanha Inicial (Campaign System)
-- =============================================================================

-- Tabela de campanhas
create table if not exists campaigns (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  description text not null default '',
  total_chapters int not null default 1,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table campaigns enable row level security;
create policy "campaigns_read" on campaigns for select using (true);

-- Tabela de capítulos
create table if not exists campaign_chapters (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  chapter_number int not null,
  title         text not null,
  narrative_text text not null default '',
  -- combat NPC (optional)
  has_combat    boolean not null default false,
  npc_name      text,
  npc_stat_pct  real not null default 0.8,  -- % of player stats
  -- choices (optional JSONB array)
  choices       jsonb,  -- [{label, reputation_faction, reputation_delta, narrative_result}]
  -- rewards
  xp_reward     int not null default 0,
  libras_reward int not null default 0,
  title_reward_id uuid references title_definitions(id),
  unlocks_resonance boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (campaign_id, chapter_number)
);

alter table campaign_chapters enable row level security;
create policy "chapters_read" on campaign_chapters for select using (true);

-- Progresso do jogador
create table if not exists campaign_progress (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references characters(id) on delete cascade,
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  current_chapter int not null default 1,
  chapter_choices jsonb not null default '{}',  -- { "1": 0, "3": 1 } chapterNum -> choiceIndex
  combat_session_id uuid,
  completed       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (character_id, campaign_id)
);

alter table campaign_progress enable row level security;
create policy "progress_own_read" on campaign_progress for select
  using (character_id in (select id from characters where user_id = auth.uid()));
create policy "progress_own_write" on campaign_progress for insert
  with check (character_id in (select id from characters where user_id = auth.uid()));
create policy "progress_own_update" on campaign_progress for update
  using (character_id in (select id from characters where user_id = auth.uid()));

-- =============================================================================
-- Seed: Campanha Inicial (10 capítulos)
-- =============================================================================

insert into campaigns (slug, name, description, total_chapters)
values ('inicial', 'Campanha Inicial', 'Sua jornada começa em Ellia. Descubra seu destino e desperte sua Ressonância.', 10)
on conflict (slug) do nothing;

-- Helper variable for FK
do $$
declare
  _cid uuid;
begin
  select id into _cid from campaigns where slug = 'inicial';

  insert into campaign_chapters (campaign_id, chapter_number, title, narrative_text, has_combat, npc_name, npc_stat_pct, choices, xp_reward, libras_reward, unlocks_resonance)
  values
  -- Cap 1: Introdução narrativa pura
  (_cid, 1, 'O Despertar',
   'Você acorda numa encruzilhada de Ellia sem memórias claras. O vento carrega sussurros de um passado esquecido. Um viajante encapuzado observa você de longe.',
   false, null, 0.8, null, 50, 100, false),

  -- Cap 2: Primeira escolha de facção
  (_cid, 2, 'A Encruzilhada',
   'O viajante se revela como um emissário. Duas facções disputam sua lealdade: a Ordem de Thar e os Nômades do Véu.',
   false, null, 0.8,
   '[{"label":"Jurar à Ordem de Thar","reputation_faction":"thar","reputation_delta":30,"narrative_result":"Você empunha o juramento de Thar. A disciplina será seu caminho."},{"label":"Seguir os Nômades do Véu","reputation_faction":"veu","reputation_delta":30,"narrative_result":"Você aceita o convite dos Nômades. A liberdade será sua bússola."}]'::jsonb,
   60, 80, false),

  -- Cap 3: Primeiro combate
  (_cid, 3, 'Sombras na Estrada',
   'Um bando de saqueadores bloqueia a estrada. Não há como evitar o confronto.',
   true, 'Saqueador de Ellia', 0.5, null, 80, 120, false),

  -- Cap 4: Escolha moral
  (_cid, 4, 'O Prisioneiro',
   'Após a batalha, encontram um prisioneiro acorrentado. Ele alega ser inocente, mas carrega marcas de um culto proibido.',
   false, null, 0.8,
   '[{"label":"Libertar o prisioneiro","reputation_faction":"veu","reputation_delta":20,"narrative_result":"O prisioneiro agradece e desaparece na névoa. Talvez se reencontrem."},{"label":"Entregá-lo às autoridades","reputation_faction":"thar","reputation_delta":20,"narrative_result":"Os guardas de Thar levam o prisioneiro. A lei foi cumprida."}]'::jsonb,
   70, 100, false),

  -- Cap 5: Ressonância desperta
  (_cid, 5, 'O Despertar Interior',
   'No santuário antigo, uma energia latente pulsa dentro de você. É hora de despertar sua Ressonância — a essência do seu Arquétipo.',
   false, null, 0.8, null, 100, 150, true),

  -- Cap 6: Combate intermediário
  (_cid, 6, 'O Guardião do Portão',
   'O caminho ao norte exige que você prove seu valor contra o Guardião do Portão de Pedra.',
   true, 'Guardião de Pedra', 0.7, null, 100, 150, false),

  -- Cap 7: Escolha política
  (_cid, 7, 'Alianças e Traições',
   'Dois líderes buscam sua ajuda. Um promete poder, o outro promete sabedoria. Ambos escondem segredos.',
   false, null, 0.8,
   '[{"label":"Apoiar o Líder Militar","reputation_faction":"thar","reputation_delta":25,"narrative_result":"O exército de Thar recebe sua lealdade. O poder flui em suas mãos."},{"label":"Apoiar a Sábia do Véu","reputation_faction":"veu","reputation_delta":25,"narrative_result":"A sabedoria ancestral dos Nômades agora guia seus passos."}]'::jsonb,
   90, 120, false),

  -- Cap 8: Combate difícil
  (_cid, 8, 'O Cavaleiro Negro',
   'Nas ruínas de Thar-Halum, um cavaleiro corrompido pela Ruína bloqueia sua passagem. Este será seu maior teste até agora.',
   true, 'Cavaleiro da Ruína', 0.9, null, 120, 200, false),

  -- Cap 9: Escolha final
  (_cid, 9, 'O Julgamento',
   'Diante do Conselho de Ellia, você deve declarar sua verdadeira lealdade. Esta decisão moldará seu futuro.',
   false, null, 0.8,
   '[{"label":"Declarar-se pela Ordem","reputation_faction":"thar","reputation_delta":40,"narrative_result":"A Ordem de Thar o reconhece como aliado fiel. Seu nome será lembrado."},{"label":"Declarar-se pelo Véu","reputation_faction":"veu","reputation_delta":40,"narrative_result":"Os Nômades do Véu acolhem seu espírito livre. A estrada é sua."}]'::jsonb,
   100, 150, false),

  -- Cap 10: Boss final + conclusão
  (_cid, 10, 'O Arauto da Ruína',
   'O grande vilão emerge das sombras. O Arauto da Ruína ameaça destruir tudo o que você construiu. É hora do confronto final.',
   true, 'Arauto da Ruína', 1.0, null, 200, 500, false)

  on conflict (campaign_id, chapter_number) do nothing;
end;
$$;
