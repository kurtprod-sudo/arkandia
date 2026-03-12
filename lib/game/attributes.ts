import { type CharacterAttributes, type ProfessionBaseAttributes } from '@/types'

// ---------------------------------------------------------------------------
// Cálculos de atributos derivados
// ---------------------------------------------------------------------------

/** HP máximo = Vitalidade * 10 */
export function calcHpMax(vitalidade: number): number {
  return vitalidade * 10
}

/** Éter máximo base = definido pela profissão + pontos distribuídos */
export function calcEterMax(eterBase: number): number {
  return eterBase
}

/** Atributos base padrão quando profissão não define um valor */
const ATTRIBUTE_DEFAULTS: Required<ProfessionBaseAttributes> = {
  ataque: 5,
  magia: 5,
  eter_max: 20,
  defesa: 5,
  vitalidade: 10,
  velocidade: 5,
  precisao: 5,
  tenacidade: 5,
  capitania: 0,
}

/** Constrói os atributos iniciais de um personagem a partir da profissão */
export function buildInitialAttributes(
  characterId: string,
  professionBase: ProfessionBaseAttributes
): Omit<CharacterAttributes, 'updated_at'> {
  const ataque = professionBase.ataque ?? ATTRIBUTE_DEFAULTS.ataque
  const magia = professionBase.magia ?? ATTRIBUTE_DEFAULTS.magia
  const eterMax = professionBase.eter_max ?? ATTRIBUTE_DEFAULTS.eter_max
  const defesa = professionBase.defesa ?? ATTRIBUTE_DEFAULTS.defesa
  const vitalidade = professionBase.vitalidade ?? ATTRIBUTE_DEFAULTS.vitalidade
  const velocidade = professionBase.velocidade ?? ATTRIBUTE_DEFAULTS.velocidade
  const precisao = professionBase.precisao ?? ATTRIBUTE_DEFAULTS.precisao
  const tenacidade = professionBase.tenacidade ?? ATTRIBUTE_DEFAULTS.tenacidade
  const capitania = professionBase.capitania ?? ATTRIBUTE_DEFAULTS.capitania

  const hpMax = calcHpMax(vitalidade)

  return {
    character_id: characterId,
    ataque,
    magia,
    eter_max: eterMax,
    eter_atual: eterMax,
    defesa,
    vitalidade,
    hp_max: hpMax,
    hp_atual: hpMax,
    velocidade,
    precisao,
    tenacidade,
    capitania,
    moral: 100,
    attribute_points: 0,
  }
}

// ---------------------------------------------------------------------------
// Cálculos de dano (base para combate futuro)
// ---------------------------------------------------------------------------

export interface DamageCalculationInput {
  baseDamage: number
  ataqueFactor?: number
  magiaFactor?: number
  defensaFactor?: number
  attackerAtaque: number
  attackerMagia: number
  targetDefesa: number
  defensePenetration?: number
  isTrueDamage?: boolean
}

export interface DamageResult {
  raw: number
  afterDefense: number
  isTrueDamage: boolean
}

/** Calcula o dano final de uma skill */
export function calcSkillDamage(input: DamageCalculationInput): DamageResult {
  const {
    baseDamage,
    ataqueFactor = 0,
    magiaFactor = 0,
    defensaFactor = 0,
    attackerAtaque,
    attackerMagia,
    targetDefesa,
    defensePenetration = 0,
    isTrueDamage = false,
  } = input

  const raw =
    baseDamage +
    attackerAtaque * ataqueFactor +
    attackerMagia * magiaFactor +
    targetDefesa * defensaFactor

  if (isTrueDamage) {
    return { raw, afterDefense: raw, isTrueDamage: true }
  }

  const effectiveDefesa = targetDefesa * (1 - defensePenetration / 100)
  const afterDefense = Math.max(0, raw - effectiveDefesa)

  return { raw, afterDefense, isTrueDamage: false }
}

// ---------------------------------------------------------------------------
// Esquiva passiva baseada em Velocidade
// ---------------------------------------------------------------------------

/** Chance de esquiva (%) baseada em Velocidade. Cap: 40% */
export function calcDodgeChance(velocidade: number): number {
  return Math.min(40, velocidade * 0.5)
}

// ---------------------------------------------------------------------------
// Precisão vs Tenacidade (aplicação de efeitos negativos)
// ---------------------------------------------------------------------------

/** Chance de aplicar efeito negativo (%) */
export function calcEffectApplyChance(
  attackerPrecisao: number,
  targetTenacidade: number
): number {
  const base = 50 + (attackerPrecisao - targetTenacidade) * 2
  return Math.min(95, Math.max(5, base))
}
