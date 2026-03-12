// ---------------------------------------------------------------------------
// Sistema de XP e progressão de nível
// ---------------------------------------------------------------------------

/** XP necessário para subir do nível atual para o próximo.
 *  Fórmula: 100 * (level ^ 1.5) — cresce de forma suave */
export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

/** Pontos de atributo concedidos por level up */
export function attributePointsPerLevel(level: number): number {
  // A cada 5 níveis, concede um ponto bônus
  return level % 5 === 0 ? 3 : 2
}

/** Marcos de progressão que desbloqueiam sistemas */
export const PROGRESSION_MILESTONES = {
  ARCHETYPE: 5,
  CLASS: 10,
  SOCIETY: 1, // qualquer nível
} as const

export function canChooseArchetype(level: number): boolean {
  return level >= PROGRESSION_MILESTONES.ARCHETYPE
}

export function canChooseClass(level: number): boolean {
  return level >= PROGRESSION_MILESTONES.CLASS
}

/** Calcula se um personagem subiu de nível e quantas vezes */
export function checkLevelUp(
  currentLevel: number,
  currentXp: number,
  addedXp: number
): { newLevel: number; newXp: number; levelsGained: number } {
  let level = currentLevel
  let xp = currentXp + addedXp

  while (xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level)
    level++
  }

  return {
    newLevel: level,
    newXp: xp,
    levelsGained: level - currentLevel,
  }
}
