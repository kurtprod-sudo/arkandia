// ---------------------------------------------------------------------------
// Fórmulas puramente matemáticas — importável por Client e Server Components
// Sem dependência de Supabase, next/headers ou qualquer módulo server-only
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

/** Éter adicional por nível de Ressonância: 30n + 5n² */
export function calcResonanceEter(resonanceLevel: number): number {
  return 30 * resonanceLevel + 5 * resonanceLevel ** 2
}

/** Custo em Essências para upar Ressonância: 50n + 10n² */
export function calcResonanceCost(targetLevel: number): number {
  return 50 * targetLevel + 10 * targetLevel ** 2
}
