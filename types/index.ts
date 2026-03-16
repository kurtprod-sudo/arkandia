// =============================================================================
// ARKANDIA — Tipos TypeScript centrais
// Espelham exatamente o schema do banco de dados
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = 'player' | 'gm'

export type CharacterStatus = 'active' | 'injured' | 'dead'

/** @deprecated Profissões foram removidas no redesign de Março 2026. Mantido para compatibilidade. */
export type ProfessionType =
  | 'comerciante'
  | 'militar'
  | 'clerigo'
  | 'explorador'
  | 'artesao'
  | 'erudito'
  | 'nobre'
  | 'mercenario'

export type ArchetypeType =
  | 'ordem'
  | 'caos'
  | 'tempo'
  | 'espaco'
  | 'materia'
  | 'vida'
  | 'morte'
  | 'vontade'
  | 'sonho'
  | 'guerra'
  | 'vinculo'
  | 'ruina'

export type SkillType = 'ativa' | 'passiva' | 'reativa'

export type RangeState = 'curto' | 'medio' | 'longo' | 'qualquer'

export type SocietyMemberRole = 'leader' | 'officer' | 'member'

export type MaestriaCategory = 'prestígio' | 'ressonância' | 'lendária'

export type MaestriaFlavor = 'bestial' | 'mítica' | 'singular'

export type EventType =
  | 'level_up'
  | 'battle_result'
  | 'item_crafted'
  | 'narrative_action'
  | 'character_created'
  | 'attribute_distributed'
  | 'archetype_chosen'
  | 'class_chosen'
  | 'society_founded'
  | 'society_joined'
  | 'currency_granted'
  | 'gm_override'
  | 'skill_acquired'
  | 'resonance_unlocked'
  | 'resonance_upgraded'
  | 'maestria_acquired'
  | 'building_updated'
  | 'reputation_changed'
  | 'expedition_started'
  | 'expedition_completed'
  | 'expedition_failed'
  | 'daily_task_completed'
  | 'daily_ticket_granted'
  | 'streak_milestone'
  | 'combat_started'
  | 'combat_finished'
  | 'avatar_generated'
  | 'scenario_joined'
  | 'scenario_left'
  | 'society_dissolved'
  | 'territory_captured'
  | 'production_collected'
  | 'war_declared'
  | 'war_finished'
  | 'item_sold'
  | 'item_crafted'
  | 'auction_finished'
  | 'summon_performed'
  | 'title_granted'
  | 'letter_sent'
  | 'payment_created'
  | 'payment_approved'
  | 'dungeon_created'
  | 'dungeon_finished'
  | 'hunting_completed'
  | 'hunting_died'

// ---------------------------------------------------------------------------
// Tabelas do banco
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  username: string
  role: UserRole
  created_at: string
}

export interface Race {
  id: string
  name: string
  archetype_origin: string[]
  geo_affinity: string
  lore_text: string
  passives: RacePassives
  created_at: string
}

export interface RacePassives {
  descricao_bonus: string
  adaptacao?: boolean
  versatilidade?: boolean
  eter_bonus?: boolean
  percepcao_sonho?: boolean
  defesa_bonus?: boolean
  vitalidade_bonus?: boolean
  bonus_forja?: boolean
  ataque_bonus?: boolean
  resistencia_fogo?: boolean
  eco_do_ciclo?: boolean
  tenacidade_bonus?: boolean
  bonus_impacto?: boolean
  magia_bonus?: boolean
  eter_regeneracao?: boolean
  bonus_maritimo?: boolean
}

export interface Character {
  id: string
  user_id: string
  name: string
  level: number
  xp: number
  xp_to_next_level: number
  status: CharacterStatus
  title: string | null
  profession: ProfessionType
  archetype: ArchetypeType | null
  class_id: string | null
  society_id: string | null
  avatar_url?: string | null
  race_id?: string | null
  resonance_archetype?: ArchetypeType | null
  resonance_level?: number
  is_resonance_unlocked?: boolean
  injured_until?: string | null
  recovery_until?: string | null
  physical_traits?: string | null
  race?: Race
  created_at: string
}

export interface CharacterAttributes {
  character_id: string
  ataque: number
  magia: number
  eter_max: number
  eter_atual: number
  defesa: number
  vitalidade: number
  hp_max: number
  hp_atual: number
  velocidade: number
  precisao: number
  tenacidade: number
  capitania: number
  moral: number
  attribute_points: number
  updated_at: string
}

export interface CharacterWallet {
  character_id: string
  libras: number
  essencia: number
  premium_currency: number
  summon_tickets: number
  updated_at: string
}

/** @deprecated Profissões foram removidas no redesign de Março 2026. Use Race + GameClass. */
export interface Profession {
  id: string
  name: ProfessionType
  description: string
  base_attributes: ProfessionBaseAttributes
  bonuses: ProfessionBonuses
}

/** @deprecated Parte do sistema de Profissões removido no redesign. */
export interface ProfessionBaseAttributes {
  ataque?: number
  magia?: number
  eter_max?: number
  defesa?: number
  vitalidade?: number
  velocidade?: number
  precisao?: number
  tenacidade?: number
  capitania?: number
}

/** @deprecated Parte do sistema de Profissões removido no redesign. */
export interface ProfessionBonuses {
  economic_multiplier?: number
  capitania_bonus?: number
  crafting_discount?: number
  exploration_bonus?: number
  [key: string]: number | undefined
}

export interface Archetype {
  id: string
  name: ArchetypeType
  description: string
  lore_text: string
  passives: ArchetypePassives
}

export interface ArchetypePassives {
  tendencia?: string
  culturas?: string[]
  [key: string]: string | string[] | number | undefined
}

export interface GameClass {
  id: string
  name: string
  description: string
  allowed_professions: ProfessionType[]
  base_skill_ids: string[]
  weapon_type?: string
  primary_attributes?: string[]
  secondary_attribute?: string
  lore_text?: string
  scaling?: Record<string, string>
}

export interface Skill {
  id: string
  name: string
  class_id: string | null
  skill_type: SkillType
  tree_position: number | null
  formula: SkillFormula
  eter_cost: number
  cooldown_turns: number
  effect_duration_turns: number | null
  range_state: RangeState
  description: string
  is_starting_skill: boolean
  created_at: string
}

export interface SkillFormula {
  base?: number
  ataque_factor?: number
  magia_factor?: number
  defesa_factor?: number
  is_true_damage?: boolean
  defense_penetration_percent?: number
  effect_type?: string
  effect_duration?: number
  element?: string
  tags?: string[]
}

/** @deprecated Usava o schema antigo de skills. Mantido para compatibilidade. */
export interface DamageFormula {
  base: number
  ataque_factor?: number
  magia_factor?: number
  defesa_factor?: number
}

export interface CharacterSkill {
  id: string
  character_id: string
  skill_id: string
  acquired_at: string
  skill?: Skill
}

export interface CharacterBuildingSlot {
  id: string
  character_id: string
  slot: 1 | 2 | 3 | 4 | 5 | 6
  skill_id: string | null
  equipment_item_id: string | null
  updated_at: string
  skill?: Skill
}

export interface Maestria {
  id: string
  name: string
  category: MaestriaCategory
  flavor: MaestriaFlavor | null
  description: string
  restrictions: MaestriaRestrictions
  cost: MaestriaCost
  skill_ids: string[]
  is_exhaustible: boolean
  exhausted_by: string | null
  exhausted_at: string | null
  is_active: boolean
  created_at: string
}

export interface MaestriaRestrictions {
  class_id?: string
  class_ids?: string[]
  resonance_type?: ArchetypeType
  min_level?: number
  min_resonance_level?: number
}

export interface MaestriaCost {
  essencia?: number
  gema?: number
  requires_item?: string
}

export interface CharacterMaestria {
  id: string
  character_id: string
  maestria_id: string
  acquired_at: string
  maestria?: Maestria
}

export type ReputationStage =
  'hostil' | 'neutro' | 'reconhecido' | 'aliado' | 'venerado'

export interface Faction {
  id: string
  name: string
  slug: string
  type: string
  alignment: string
  description: string
  is_hidden: boolean
  conflict_faction_slugs: string[]
  created_at: string
}

export interface CharacterReputation {
  id: string
  character_id: string
  faction_id: string
  points: number
  stage: ReputationStage
  updated_at: string
  factions?: Faction
}

export type ReputationSource =
  | 'expedition'
  | 'war'
  | 'narrative'
  | 'gm'
  | 'quest'

export interface ReputationEvent {
  id: string
  character_id: string
  faction_id: string
  delta: number
  reason: string
  source: ReputationSource
  created_at: string
}

export interface ExpeditionType {
  id: string
  name: string
  subtype: 'exploracao' | 'caca' | 'investigacao' | 'missao_faccao'
  risk_level: 'seguro' | 'moderado' | 'perigoso' | 'extremo'
  duration_hours: number
  description: string
  loot_table: Record<string, unknown>
  success_formula: Record<string, unknown>
  required_faction_slug: string | null
  is_active: boolean
  created_at: string
}

export interface Expedition {
  id: string
  character_id: string
  type_id: string
  status: 'active' | 'completed' | 'failed'
  risk_level: string
  started_at: string
  ends_at: string
  result: Record<string, unknown> | null
  resolved_at: string | null
  created_at: string
  expedition_types?: ExpeditionType
}

export interface Society {
  id: string
  name: string
  description: string
  leader_id: string
  level: number
  treasury_libras: number
  tax_percent: number
  recruitment_open: boolean
  manifesto: string | null
  dissolved_at: string | null
  inactive_since: string | null
  created_at: string
}

export interface SocietyMember {
  society_id: string
  character_id: string
  role: SocietyMemberRole
  title: string | null
  joined_at: string
}

export type TerritoryCategory = 'forja' | 'arcano' | 'comercial' | 'militar' | 'reliquia' | 'estrategico'

export interface Territory {
  id: string
  name: string
  region: string
  category: TerritoryCategory
  controlling_society_id: string | null
  safezone_until: string | null
  base_production: Record<string, unknown>
  description: string
  created_at: string
}

export interface TerritoryProduction {
  id: string
  territory_id: string
  society_id: string
  last_collected: string
  reinvestment_level: number
  created_at: string
}

export interface GameEvent {
  id: string
  type: EventType | string
  actor_id: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  is_public: boolean
  narrative_text: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Views compostas (joins usados na UI)
// ---------------------------------------------------------------------------

export interface CharacterPublicView {
  id: string
  name: string
  level: number
  status: CharacterStatus
  title: string | null
  society_name: string | null
  profession: ProfessionType
}

export interface CharacterPrivateView extends Character {
  attributes: CharacterAttributes
  wallet: CharacterWallet
  society: Society | null
}

export interface CharacterWithAttributes extends Character {
  character_attributes: CharacterAttributes
  character_wallet: CharacterWallet
}

// ---------------------------------------------------------------------------
// Payloads de formulários e API
// ---------------------------------------------------------------------------

export interface RegisterFormData {
  email: string
  password: string
  username: string
}

/** @deprecated Usa ProfessionType. Para o novo sistema, use CreateCharacterFormDataV2. */
export interface CreateCharacterFormData {
  name: string
  profession: ProfessionType
}

export interface CreateCharacterFormDataV2 {
  name: string
  race_id: string
  class_id: string
}

export interface DistributeAttributePayload {
  character_id: string
  attribute: keyof Omit<CharacterAttributes, 'character_id' | 'updated_at' | 'attribute_points' | 'hp_max' | 'eter_max'>
  amount: number
}

export interface GMGrantCurrencyPayload {
  character_id: string
  currency: 'libras' | 'essencia' | 'premium_currency'
  amount: number
}

export interface GMEditAttributePayload {
  character_id: string
  attributes: Partial<Omit<CharacterAttributes, 'character_id' | 'updated_at'>> & Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Daily Tasks e Login Streak
// ---------------------------------------------------------------------------

export type TaskType =
  | 'complete_expedition'
  | 'win_pvp'
  | 'hunting_kills'
  | 'complete_dungeon'
  | 'send_letter'
  | 'write_diary'
  | 'join_scenario'
  | 'craft_item'
  | 'login_streak'
  | 'use_summon'
  | 'mercado_volatil'
  | 'eco_arquetipo'

export interface DailyTask {
  type: TaskType
  label: string
  description: string
  completed: boolean
  xp_reward: number
  essencia_reward: number
  libras_reward: number
}

export interface DailyTaskRecord {
  id: string
  character_id: string
  task_date: string
  tasks: DailyTask[]
  completed_count: number
  ticket_granted: boolean
  created_at: string
  updated_at: string
}

export interface LoginStreak {
  id: string
  character_id: string
  current_streak: number
  longest_streak: number
  last_login_date: string | null
  total_logins: number
  updated_at: string
}

// ---------------------------------------------------------------------------
// Jornal do Mundo (Gazeta do Horizonte)
// ---------------------------------------------------------------------------

export interface JournalSection {
  tipo: 'manchete' | 'olhos_viram' | 'rumores' | 'mesa_editora'
  conteudo: string
}

export interface JournalEdition {
  id: string
  edition_date: string
  sections: JournalSection[]
  status: 'draft' | 'published' | 'archived'
  generated_by: 'ai' | 'gm'
  published_at: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Combate PvP
// ---------------------------------------------------------------------------

export type CombatModality =
  'duelo_livre' | 'duelo_ranqueado' | 'emboscada' | 'torneio'

export type CombatStatus =
  'pending' | 'active' | 'finished' | 'cancelled'

export interface CombatSession {
  id: string
  challenger_id: string
  defender_id: string
  modality: CombatModality
  status: CombatStatus
  current_turn: number
  active_player_id: string | null
  turn_expires_at: string | null
  winner_id: string | null
  finished_at: string | null
  created_at: string
}

export interface CombatTurn {
  id: string
  session_id: string
  turn_number: number
  actor_id: string
  action_type: string
  skill_id: string | null
  range_state: string | null
  damage_dealt: number
  effect_applied: string | null
  narrative_text: string | null
  created_at: string
}

export interface CombatEffect {
  id: string
  session_id: string
  character_id: string
  effect_type: string
  stacks: number
  duration_turns: number
  applied_at_turn: number
  expires_at_turn: number
  source_skill_id: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Avatar Visual (IA)
// ---------------------------------------------------------------------------

export interface AvatarHistory {
  id: string
  character_id: string
  image_url: string
  prompt_used: string
  trigger_type: 'creation' | 'rework' | 'maestria_lendaria' | 'item_especial'
  gemas_spent: number
  created_at: string
}

// ---------------------------------------------------------------------------
// Cenários Sociais
// ---------------------------------------------------------------------------

export interface SocialScenario {
  id: string
  name: string
  description: string
  location: string
  max_players: number
  is_active: boolean
  is_private: boolean
  created_by: string | null
  created_at: string
}

export interface ScenarioPresence {
  id: string
  scenario_id: string
  character_id: string
  joined_at: string
}

export interface ScenarioMessage {
  id: string
  scenario_id: string
  character_id: string
  content: string
  is_ooc: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Guerra de Territórios
// ---------------------------------------------------------------------------

export type TroopType = 'infantaria' | 'cavalaria' | 'arquearia' | 'cerco'

export type WarSide = 'attacker' | 'defender'

export type WarStatus = 'preparation' | 'active' | 'finished' | 'cancelled'

export interface Troop {
  id: string
  society_id: string
  troop_type: TroopType
  quantity: number
  updated_at: string
}

export interface WarDeclaration {
  id: string
  attacker_id: string
  defender_id: string | null
  target_territory_id: string
  status: WarStatus
  phase: number
  declared_at: string
  preparation_ends: string
  finished_at: string | null
  winner_id: string | null
  created_at: string
}

export interface WarParticipant {
  id: string
  war_id: string
  society_id: string
  character_id: string
  troops_committed: Partial<Record<TroopType, number>>
  side: WarSide
  created_at: string
}

export interface WarBattle {
  id: string
  war_id: string
  phase: number
  status: 'pending' | 'active' | 'finished'
  attacker_power: number
  defender_power: number
  winner_side: WarSide | 'draw' | null
  casualties: Record<string, Record<TroopType, number>>
  narrative_text: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Mercado e Economia
// ---------------------------------------------------------------------------

export type ItemType = 'material' | 'equipamento' | 'consumivel' | 'especial' | 'pergaminho'

export type ItemRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'

export interface Item {
  id: string
  name: string
  description: string
  item_type: ItemType
  rarity: ItemRarity
  is_tradeable: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface InventoryEntry {
  id: string
  character_id: string
  item_id: string
  quantity: number
  updated_at: string
  items?: Item
}

export interface MarketListing {
  id: string
  seller_id: string
  item_id: string
  quantity: number
  price_libras: number
  status: 'active' | 'sold' | 'cancelled'
  sold_at: string | null
  created_at: string
  items?: Item
}

export interface AuctionListing {
  id: string
  seller_id: string
  item_id: string
  quantity: number
  starting_price: number
  current_bid: number
  current_bidder: string | null
  ends_at: string
  status: 'active' | 'finished' | 'cancelled'
  created_at: string
  items?: Item
}

export interface AuctionBid {
  id: string
  auction_id: string
  bidder_id: string
  amount: number
  created_at: string
}

export interface CraftingRecipe {
  id: string
  name: string
  result_item_id: string
  result_quantity: number
  ingredients: Array<{ item_id: string; quantity: number }>
  required_level: number
  is_active: boolean
  created_at: string
  items?: Item
}

// ---------------------------------------------------------------------------
// Summon / Gacha
// ---------------------------------------------------------------------------

export type SummonCostType = 'gemas' | 'ticket'

export interface SummonCatalog {
  id: string
  name: string
  description: string
  is_active: boolean
  cost_gemas: number
  cost_tickets: number
  pity_threshold: number
  created_at: string
  updated_at: string
}

export interface SummonCatalogItem {
  id: string
  catalog_id: string
  item_id: string
  quantity: number
  weight: number
  is_pity_eligible: boolean
  created_at: string
  items?: Item
}

export interface SummonHistory {
  id: string
  character_id: string
  catalog_id: string
  item_id: string
  quantity: number
  cost_type: SummonCostType
  cost_amount: number
  was_pity: boolean
  created_at: string
  items?: Item
}

export interface SummonPity {
  id: string
  character_id: string
  catalog_id: string
  pulls_since_rare: number
  total_pulls: number
  updated_at: string
}

// ---------------------------------------------------------------------------
// Rankings e Títulos
// ---------------------------------------------------------------------------

export type RankingCategory =
  | 'maiores_guerreiros'
  | 'sociedades_dominantes'
  | 'exploradores'
  | 'primeiros_maestria'
  | 'herois_guerra'

export interface TitleDefinition {
  id: string
  name: string
  description: string
  category: 'progressao' | 'guerra' | 'exploracao' | 'maestria' | 'especial' | 'gm'
  trigger_type: 'automatico' | 'gm_manual' | 'primeiro_a'
  trigger_condition: Record<string, unknown>
  is_unique: boolean
  created_at: string
}

export interface CharacterTitle {
  id: string
  character_id: string
  title_id: string
  granted_by: 'system' | 'gm'
  granted_at: string
  title_definitions?: TitleDefinition
}

export interface RankingEntry {
  id: string
  category: RankingCategory
  entity_id: string
  entity_type: 'character' | 'society'
  entity_name: string
  score: number
  rank_position: number | null
  metadata: Record<string, unknown>
  updated_at: string
}

// ---------------------------------------------------------------------------
// Diário e Correspondência
// ---------------------------------------------------------------------------

export type DiaryReactionSymbol = 'chama' | 'espada' | 'estrela' | 'lacre' | 'corvo'

export interface DiaryEntry {
  id: string
  character_id: string
  title: string
  content: string
  is_lore_confirmed: boolean
  lore_confirmed_by: string | null
  lore_confirmed_at: string | null
  created_at: string
  updated_at: string
}

export interface DiaryReaction {
  id: string
  entry_id: string
  character_id: string
  symbol: DiaryReactionSymbol
  created_at: string
}

export interface Letter {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  content: string
  parent_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Pagamentos (Gemas)
// ---------------------------------------------------------------------------

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'

export interface Payment {
  id: string
  character_id: string
  mp_payment_id: string | null
  status: PaymentStatus
  amount_brl: number
  gemas_amount: number
  qr_code: string | null
  qr_code_base64: string | null
  ticket_url: string | null
  approved_at: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Painel GM — Views compostas
// ---------------------------------------------------------------------------

export interface GmCharacterView {
  id: string
  name: string
  level: number
  status: string
  race_name: string
  class_name: string
  society_name: string | null
  title: string | null
  libras: number
  essencia: number
  gemas: number
  tickets: number
  ataque: number
  defesa: number
  magia: number
  vitalidade: number
  recovery_until: string | null
}

export interface GmPaymentView {
  id: string
  character_name: string
  status: string
  amount_brl: number
  gemas_amount: number
  created_at: string
}

// ---------------------------------------------------------------------------
// Dungeons em Grupo
// ---------------------------------------------------------------------------

export type DungeonDifficulty = 'normal' | 'dificil' | 'lendario'
export type DungeonStatus = 'recruiting' | 'active' | 'finished' | 'failed' | 'cancelled'
export type DungeonResult = 'success' | 'partial' | 'failure'
export type ParticipantStatus = 'invited' | 'ready' | 'active' | 'fallen' | 'survived'

export interface DungeonType {
  id: string
  name: string
  description: string
  difficulty: DungeonDifficulty
  min_players: number
  max_players: number
  min_level: number
  duration_minutes: number
  phases: number
  base_xp_reward: number
  base_libras_reward: number
  loot_table: unknown[]
  is_active: boolean
  created_at: string
}

export interface DungeonSession {
  id: string
  dungeon_type_id: string
  leader_id: string
  status: DungeonStatus
  difficulty: DungeonDifficulty
  current_phase: number
  started_at: string | null
  finished_at: string | null
  result: DungeonResult | null
  phase_log: unknown[]
  created_at: string
  updated_at: string
}

export interface DungeonParticipant {
  id: string
  session_id: string
  character_id: string
  status: ParticipantStatus
  hp_final: number | null
  joined_at: string
}

export interface DungeonReward {
  id: string
  session_id: string
  character_id: string
  xp_granted: number
  libras_granted: number
  items_granted: unknown[]
  created_at: string
}

// ---------------------------------------------------------------------------
// Hunting (Missões PvE)
// ---------------------------------------------------------------------------

export type HuntingRiskLevel = 'baixo' | 'medio' | 'alto' | 'extremo'
export type NpcTier = 'fraco' | 'medio' | 'forte' | 'elite'
export type HuntingSessionStatus = 'active' | 'finished' | 'died'

export interface HuntingZone {
  id: string
  name: string
  description: string
  location: string
  min_level: number
  max_level: number | null
  risk_level: HuntingRiskLevel
  cooldown_minutes: number
  is_active: boolean
  created_at: string
}

export interface NpcType {
  id: string
  zone_id: string
  name: string
  tier: NpcTier
  level: number
  base_hp: number
  base_ataque: number
  base_magia: number
  base_defesa: number
  base_velocidade: number
  base_eter: number
  skills: unknown[]
  loot_table: unknown[]
  behavior: 'balanced' | 'aggressive' | 'defensive' | 'support'
  xp_reward: number
  narrative_text: string | null
  created_at: string
}

export interface HuntingSession {
  id: string
  character_id: string
  zone_id: string
  mode: 'manual' | 'auto'
  status: HuntingSessionStatus
  kills: number
  max_kills: number
  loot_accumulated: unknown[]
  xp_accumulated: number
  libras_accumulated: number
  essencia_accumulated: number
  started_at: string
  finished_at: string | null
  current_npc_id: string | null
  current_npc_hp: number | null
  created_at: string
  updated_at: string
  hunting_zones?: HuntingZone
}

export interface HuntingCombatTurn {
  id: string
  session_id: string
  npc_kill_number: number
  turn_number: number
  actor: 'player' | 'npc'
  action_type: string
  damage_dealt: number
  effect_applied: string | null
  narrative_text: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'expedition_done'
  | 'duel_received'
  | 'letter_received'
  | 'dungeon_invite'
  | 'society_invite'
  | 'war_declared'
  | 'level_up'
  | 'hunting_done'
  | 'resonance_unlocked'
  | 'general'

export interface Notification {
  id: string
  character_id: string
  type: NotificationType
  title: string
  body: string
  is_read: boolean
  action_url: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Equipamentos
// ---------------------------------------------------------------------------

export type EquipmentSlotKey =
  | 'arma_principal'
  | 'arma_secundaria'
  | 'elmo'
  | 'armadura'
  | 'calca'
  | 'bota'
  | 'acessorio_1'
  | 'acessorio_2'

export interface EquipmentSlotDefinition {
  id: string
  slot_key: EquipmentSlotKey
  label: string
  slot_order: number
  is_locked: boolean
}

export interface CharacterEquipment {
  id: string
  character_id: string
  slot_key: EquipmentSlotKey
  item_id: string
  enhancement: number
  equipped_at: string
  items?: Item
}

export interface ItemEnhancement {
  id: string
  character_id: string
  item_id: string
  inventory_id: string
  enhancement: number
  updated_at: string
}

// ---------------------------------------------------------------------------
// Moderação
// ---------------------------------------------------------------------------

export interface ModerationLog {
  id: string
  moderator_id: string
  target_user_id: string
  action: 'ban' | 'unban' | 'silence' | 'unsilence' | 'warn'
  reason: string
  duration_hours: number | null
  expires_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Loja NPC, Eco do Arquétipo, Temporadas, Fragmentos
// ---------------------------------------------------------------------------

export interface NpcShopItem {
  id: string
  name: string
  description: string
  item_id: string | null
  reward_type: 'item' | 'libras' | 'essencia' | 'ticket' | 'xp'
  reward_amount: number | null
  price_libras: number
  price_gemas: number
  rarity: string
  is_active: boolean
  created_at: string
}

export interface DailyNpcShop {
  id: string
  character_id: string
  shop_date: string
  item_id: string
  purchased: boolean
  purchased_at: string | null
  created_at: string
  npc_shop_items?: NpcShopItem
}

export interface ArchetypeEcho {
  id: string
  character_id: string
  echo_date: string
  archetype: string
  content: string
  essencia_reward: number
  claimed: boolean
  claimed_at: string | null
  created_at: string
}

export interface Season {
  id: string
  name: string
  theme: string
  lore_text: string | null
  starts_at: string
  ends_at: string
  is_active: boolean
  created_at: string
}

export interface SeasonalLegendary {
  id: string
  season_id: string
  maestria_id: string
  price_gemas: number
  is_exclusive: boolean
  purchased_by: string | null
  purchased_at: string | null
  created_at: string
  maestrias?: Maestria
}

export interface MaestriaFragment {
  id: string
  character_id: string
  fragment_type: string
  quantity: number
  updated_at: string
}

// ---------------------------------------------------------------------------
// Torneios
// ---------------------------------------------------------------------------

export type TournamentStatus =
  'open' | 'closed' | 'bracket_generated' | 'in_progress' | 'finished'

export type TournamentMatchStatus = 'pending' | 'waiting_combat' | 'finished'

export interface PrizeTier {
  libras?: number
  gemas?: number
  itemId?: string
}

export interface PrizePool {
  first: PrizeTier
  second: PrizeTier
  third: PrizeTier
}

export interface Tournament {
  id: string
  name: string
  description: string | null
  status: TournamentStatus
  maxParticipants: 8 | 16 | 32
  registrationEndsAt: string
  startsAt: string | null
  finishedAt: string | null
  prizePool: PrizePool
  createdBy: string
  createdAt: string
}

export interface TournamentParticipant {
  id: string
  tournamentId: string
  characterId: string
  seed: number | null
  registeredAt: string
  eliminatedAt: string | null
  finalPosition: number | null
  character?: { name: string; level: number }
}

export interface TournamentMatch {
  id: string
  tournamentId: string
  round: number
  matchNumber: number
  participantAId: string | null
  participantBId: string | null
  winnerId: string | null
  combatSessionId: string | null
  isBye: boolean
  status: TournamentMatchStatus
}

// ---------------------------------------------------------------------------
// Tropas (estoque, deployment, recrutamento)
// ---------------------------------------------------------------------------

export interface TroopStock {
  infantaria: number
  arquearia: number
  cavalaria: number
  cerco: number
}

export interface TroopDeployment {
  infantaria?: number
  arquearia?: number
  cavalaria?: number
  cerco?: number
}

export interface RecruitmentQueueItem {
  id: string
  troopType: TroopType
  quantity: number
  startsAt: string
  endsAt: string
}

// ---------------------------------------------------------------------------
// Eventos de Mundo e Desafio Diário
// ---------------------------------------------------------------------------

export type WorldEventType =
  | 'monolito' | 'invasao_faccao' | 'passagem_imperador'
  | 'torneio' | 'crise_politica' | 'catalogo_lendario'

export type WorldEventStatus = 'active' | 'ended'

export interface WorldEvent {
  id: string
  type: WorldEventType
  title: string
  description: string
  status: WorldEventStatus
  startsAt: string
  endsAt: string | null
  metadata: Record<string, unknown>
  createdBy: string
  createdAt: string
}

export interface DailyChallenge {
  id: string
  characterId: string
  challengeDate: string
  npcSnapshot: {
    name: string
    challengePhrase: string
    attributes: Record<string, number>
  }
  combatSessionId: string | null
  completed: boolean
  won: boolean | null
  rewardClaimed: boolean
  currentStreak: number
}

// ---------------------------------------------------------------------------
// Conquistas
// ---------------------------------------------------------------------------

export type AchievementRarity = 'comum' | 'raro' | 'epico' | 'lendario'
export type AchievementCategory =
  'progressao' | 'combate' | 'exploracao' | 'social' | 'economia' | 'marco'

export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  icon: string
  target: number | null
  titleRewardName: string | null
}

export interface AchievementWithProgress extends Achievement {
  progress: number
  unlockedAt: string | null
}

// ---------------------------------------------------------------------------
// Missões Semanais
// ---------------------------------------------------------------------------

export type WeeklyMissionType =
  | 'complete_dungeons' | 'win_pvp_ranked' | 'complete_expeditions'
  | 'hunting_kills' | 'send_letters' | 'complete_daily_tasks'
  | 'bazaar_trades' | 'win_war_battle' | 'recruit_troops'
  | 'complete_troop_expedition'

export type WeeklyMissionDifficulty = 'facil' | 'medio' | 'dificil'

export interface WeeklyMissionEntry {
  type: WeeklyMissionType
  label: string
  description: string
  difficulty: WeeklyMissionDifficulty
  target: number
  progress: number
  completed: boolean
  reward_claimed: boolean
  xp_reward: number
  essencias_reward: number
  libras_reward: number
}

export interface WeeklyMissionsRecord {
  id: string
  characterId: string
  weekStart: string
  missions: WeeklyMissionEntry[]
  completedCount: number
  ticketGranted: boolean
  earlyBonusClaimed: boolean
}

// ---------------------------------------------------------------------------
// Coliseu
// ---------------------------------------------------------------------------

export type ColiseuResult = 'win' | 'loss' | 'draw'
export type ColiseuTier = 'Iniciante' | 'Guerreiro' | 'Veterano' | 'Elite' | 'Lendário'

export interface MirrorAttrsSnapshot {
  ataque: number; magia: number; defesa: number; vitalidade: number
  velocidade: number; precisao: number; tenacidade: number
  hp_max: number; eter_max: number
}

export interface MirrorSkillSnapshot {
  slot: number; skill_id: string; skill_name: string
  formula: Record<string, number>; eter_cost: number; skill_type: string
}

export interface CharacterMirror {
  characterId: string; attrsSnapshot: MirrorAttrsSnapshot
  buildingSnapshot: MirrorSkillSnapshot[]; coliseuPoints: number
  wins: number; losses: number; dailyChallengesUsed: number
  lastChallengeDate: string | null; updatedAt: string
}

export interface CombatLogEntry {
  turn: number; actor: 'challenger' | 'defender'
  action: string; damage: number; hpAfter: number
}

export interface ColiseuSeason {
  id: string; startsAt: string; endsAt: string
  status: 'active' | 'finished'; rewardsDistributed: boolean
}

// ---------------------------------------------------------------------------
// Bestiário
// ---------------------------------------------------------------------------

export interface BestiaryEntry {
  npcTypeId: string; npcName: string; npcTier: string
  zoneName: string; zoneId: string; totalDefeated: number
  firstDefeatedAt: string; loreText: string | null
  firstDiscovererName: string | null; knownDrops: string[]
}

export interface ZoneBestiaryProgress {
  zoneId: string; zoneName: string
  discovered: number; total: number; completed: boolean
}

// ---------------------------------------------------------------------------
// Battle Pass + Ranking Sazonal
// ---------------------------------------------------------------------------

export interface TierReward {
  libras: number; essencias: number; gemas: number; tickets: number
}

export interface CharacterBattlePass {
  id: string; characterId: string; seasonId: string
  seasonXp: number; currentTier: number; isPremium: boolean
  purchasedAt: string | null
}

export interface BattlePassStatus extends CharacterBattlePass {
  seasonName: string; seasonTheme: string; seasonEndsAt: string
  xpToNextTier: number
  claimedTiers: Array<{ tier: number; track: 'free' | 'premium' }>
}

export interface SeasonRankingSnapshot {
  seasonId: string; category: string; entityId: string
  entityType: string; entityName: string; score: number
  rankPosition: number; snapshottedAt: string
}

// Database type is in types/database.types.ts (follows Supabase generated format)
// export type { Database } from './database.types'
