// ---------------------------------------------------------------------------
// Sistema de XP e progressão de nível
// ---------------------------------------------------------------------------

/** XP necessário para subir do nível atual para o próximo.
 *  Níveis 1–15: tabela calibrada. 16+: 500 × level². */
export function xpToNextLevel(level: number): number {
  if (level <= 15) {
    const XP_TABLE: Record<number, number> = {
      1: 50, 2: 100, 3: 180, 4: 270, 5: 400,
      6: 600, 7: 900, 8: 1300, 9: 1800, 10: 2800,
      11: 4000, 12: 5500, 13: 7200, 14: 9200, 15: 11500,
    }
    return XP_TABLE[level] ?? 11500
  }
  return 500 * level * level
}

/** Pontos de atributo concedidos por level up */
export function attributePointsPerLevel(level: number): number {
  // A cada 5 níveis, concede um ponto bônus
  return level % 5 === 0 ? 3 : 2
}

/** Marcos de progressão que desbloqueiam sistemas.
 *  Referência: GDD_Personagem §5 */
export const PROGRESSION_MILESTONES = {
  RESONANCE: 5,      // Ressonância desperta (evento narrativo)
  FULL_UNLOCK: 10,   // Jogo completo desbloqueado
  SOCIETY: 1,        // Qualquer nível
} as const

/** Ressonância desperta no nível 5 — evento narrativo, não escolha de menu */
export function isResonanceLevel(level: number): boolean {
  return level >= PROGRESSION_MILESTONES.RESONANCE
}

/** Jogo completo desbloqueado no nível 10 */
export function isFullUnlockLevel(level: number): boolean {
  return level >= PROGRESSION_MILESTONES.FULL_UNLOCK
}

/** Maestrias desbloqueadas após completar as 8 skills da árvore básica */
export function hasMaestriasUnlocked(totalSkillsAcquired: number): boolean {
  return totalSkillsAcquired >= 8
}

/** @deprecated Use isResonanceLevel. Mantido para compatibilidade. */
export function canChooseArchetype(level: number): boolean {
  return isResonanceLevel(level)
}

/** @deprecated Use isFullUnlockLevel. Mantido para compatibilidade. */
export function canChooseClass(level: number): boolean {
  return isFullUnlockLevel(level)
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
