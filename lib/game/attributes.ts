import { type CharacterAttributes, type ProfessionBaseAttributes } from '@/types'

// ---------------------------------------------------------------------------
// Cálculos de atributos derivados
// ---------------------------------------------------------------------------

/** HP máximo = 80 + Vitalidade × 5 */
export function calcHpMax(vitalidade: number): number {
  return 80 + vitalidade * 5
}

/** Éter máximo base = definido pela classe + pontos distribuídos */
export function calcEterMax(eterBase: number): number {
  return eterBase
}

/** Atributos base padrão quando a Classe não define um valor */
const ATTRIBUTE_DEFAULTS: Required<Omit<CharacterAttributes, 'character_id' | 'updated_at' | 'hp_max' | 'hp_atual' | 'eter_atual' | 'moral' | 'attribute_points'>> = {
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

// Tabela de atributos iniciais por classe (nível 1, sem bônus racial)
// Referência: GDD_Balanceamento §2
const CLASS_BASE_ATTRIBUTES: Record<string, Partial<Record<string, number>>> = {
  'Lanceiro':   { ataque: 20, magia: 10, defesa: 10, vitalidade: 10, velocidade: 20, precisao: 15, tenacidade: 10, capitania: 10, eter_max: 50 },
  'Espadachim': { ataque: 20, magia: 10, defesa: 10, vitalidade: 10, velocidade: 10, precisao: 20, tenacidade: 15, capitania: 10, eter_max: 50 },
  'Lutador':    { ataque: 20, magia: 10, defesa: 10, vitalidade: 20, velocidade: 10, precisao: 10, tenacidade: 15, capitania: 10, eter_max: 40 },
  'Bardo':      { ataque: 10, magia: 20, defesa: 10, vitalidade: 10, velocidade: 10, precisao: 15, tenacidade: 10, capitania: 10, eter_max: 80 },
  'Atirador':   { ataque: 20, magia: 10, defesa: 10, vitalidade: 10, velocidade: 15, precisao: 20, tenacidade: 10, capitania: 10, eter_max: 50 },
  'Arqueiro':   { ataque: 20, magia: 10, defesa: 10, vitalidade: 10, velocidade: 15, precisao: 20, tenacidade: 10, capitania: 10, eter_max: 50 },
  'Assassino':  { ataque: 20, magia: 10, defesa: 10, vitalidade: 10, velocidade: 20, precisao: 15, tenacidade: 10, capitania: 10, eter_max: 45 },
  'Druida':     { ataque: 20, magia: 15, defesa: 10, vitalidade: 20, velocidade: 10, precisao: 10, tenacidade: 10, capitania: 10, eter_max: 55 },
  'Destruidor': { ataque: 20, magia: 10, defesa: 15, vitalidade: 20, velocidade: 10, precisao: 10, tenacidade: 10, capitania: 10, eter_max: 45 },
  'Escudeiro':  { ataque: 10, magia: 10, defesa: 20, vitalidade: 20, velocidade: 10, precisao: 10, tenacidade: 10, capitania: 10, eter_max: 45 },
  'Mago':       { ataque: 10, magia: 20, defesa: 10, vitalidade: 10, velocidade: 10, precisao: 15, tenacidade: 10, capitania: 10, eter_max: 90 },
}

/**
 * Constrói os atributos iniciais de um personagem a partir da Classe escolhida.
 * Referência: GDD_Personagem §3 e §4
 */
export function buildInitialAttributesFromClass(
  characterId: string,
  classScaling: Record<string, number>,
  className?: string
): Omit<CharacterAttributes, 'updated_at'> {
  // Tenta usar a tabela base por nome de classe
  const base = className ? (CLASS_BASE_ATTRIBUTES[className] ?? {}) : {}

  const ataque     = base.ataque     ?? classScaling.ataque     ?? ATTRIBUTE_DEFAULTS.ataque
  const magia      = base.magia      ?? classScaling.magia      ?? ATTRIBUTE_DEFAULTS.magia
  const eterMax    = base.eter_max   ?? classScaling.eter_max   ?? ATTRIBUTE_DEFAULTS.eter_max
  const defesa     = base.defesa     ?? classScaling.defesa     ?? ATTRIBUTE_DEFAULTS.defesa
  const vitalidade = base.vitalidade ?? classScaling.vitalidade ?? ATTRIBUTE_DEFAULTS.vitalidade
  const velocidade = base.velocidade ?? classScaling.velocidade ?? ATTRIBUTE_DEFAULTS.velocidade
  const precisao   = base.precisao   ?? classScaling.precisao   ?? ATTRIBUTE_DEFAULTS.precisao
  const tenacidade = base.tenacidade ?? classScaling.tenacidade ?? ATTRIBUTE_DEFAULTS.tenacidade
  const capitania  = base.capitania  ?? classScaling.capitania  ?? ATTRIBUTE_DEFAULTS.capitania

  const hpMax = calcHpMax(vitalidade)

  return {
    character_id: characterId,
    ataque, magia,
    eter_max: eterMax, eter_atual: eterMax,
    defesa, vitalidade,
    hp_max: hpMax, hp_atual: hpMax,
    velocidade, precisao, tenacidade, capitania,
    moral: 100, attribute_points: 0,
  }
}

/** @deprecated Use buildInitialAttributesFromClass. Mantido para compatibilidade com código da Fase 1. */
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

// ---------------------------------------------------------------------------
// Ressonância — fórmulas de Éter e custo
// ---------------------------------------------------------------------------

/** Éter adicional por nível de Ressonância: 30n + 5n² */
export function calcResonanceEter(resonanceLevel: number): number {
  return 30 * resonanceLevel + 5 * resonanceLevel ** 2
}

/** Custo em Essências para upar Ressonância: 50n + 10n² */
export function calcResonanceCost(targetLevel: number): number {
  return 50 * targetLevel + 10 * targetLevel ** 2
}

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
