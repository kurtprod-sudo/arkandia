// =============================================================================
// ARKANDIA — Tipos TypeScript centrais
// Espelham exatamente o schema do banco de dados
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type UserRole = 'player' | 'gm'

export type CharacterStatus = 'active' | 'injured' | 'dead'

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

export type SkillType = 'active' | 'passive'

export type RangeState = 'curto' | 'medio' | 'longo' | 'all'

export type SocietyMemberRole = 'leader' | 'officer' | 'member'

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

// ---------------------------------------------------------------------------
// Tabelas do banco
// ---------------------------------------------------------------------------

export interface Profile {
  id: string
  username: string
  role: UserRole
  created_at: string
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

export interface Profession {
  id: string
  name: ProfessionType
  description: string
  base_attributes: ProfessionBaseAttributes
  bonuses: ProfessionBonuses
}

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
  penetracao_defesa?: number
  dano_bonus_percent?: number
  hp_bonus_percent?: number
  eter_bonus_percent?: number
  velocidade_bonus?: number
  moral_bonus?: number
  [key: string]: number | undefined
}

export interface GameClass {
  id: string
  name: string
  description: string
  allowed_professions: ProfessionType[]
  base_skill_ids: string[]
}

export interface Skill {
  id: string
  name: string
  description: string
  type: SkillType
  damage_formula: DamageFormula | null
  is_true_damage: boolean
  defense_penetration: number
  eter_cost: number
  cooldown_turns: number
  effect_duration_turns: number | null
  range_state: RangeState
  created_at: string
}

export interface DamageFormula {
  base: number
  ataque_factor?: number
  magia_factor?: number
  defesa_factor?: number
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

export interface CreateCharacterFormData {
  name: string
  profession: ProfessionType
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
