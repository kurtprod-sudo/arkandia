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

export interface Society {
  id: string
  name: string
  description: string
  leader_id: string
  created_at: string
}

export interface SocietyMember {
  society_id: string
  character_id: string
  role: SocietyMemberRole
  joined_at: string
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

// Database type is in types/database.types.ts (follows Supabase generated format)
// export type { Database } from './database.types'
