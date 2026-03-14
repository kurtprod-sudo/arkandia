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
  | 'jornal'
  | 'treino'
  | 'coletar'
  | 'desafio'
  | 'faccao'
  | 'mercado_volatil'
  | 'eco_arquetipo'

export interface DailyTask {
  type: TaskType
  label: string
  description: string
  completed: boolean
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

// Database type is in types/database.types.ts (follows Supabase generated format)
// export type { Database } from './database.types'
