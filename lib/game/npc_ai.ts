// ---------------------------------------------------------------------------
// NPC AI — Shared between Hunting, World Boss, and Daily Challenge
// ---------------------------------------------------------------------------

export interface NpcSkill {
  name: string
  base: number
  ataque_factor?: number
  magia_factor?: number
  eter_cost: number
  cooldown: number
  effect_type?: string
  effect_duration?: number
  type?: 'heal' | 'buff' | 'damage'
  is_true_damage?: boolean
}

/**
 * Decides which action an NPC/Boss takes based on HP, skills, and behavior.
 */
export function decideNpcAction(
  skills: NpcSkill[],
  currentHp: number,
  maxHp: number,
  behavior: string
): NpcSkill & { name: string; base: number } {
  const hpPercent = currentHp / maxHp

  if (hpPercent < 0.3) {
    const healSkill = skills.find((s) => s.type === 'heal')
    if (healSkill) return { ...healSkill, name: healSkill.name, base: healSkill.base ?? 30 }
  }

  const damageSkills = skills.filter(
    (s) => !s.type || s.type === 'damage' || (!s.type && (s.ataque_factor || s.magia_factor))
  )

  if (damageSkills.length === 0) {
    return { name: 'Ataque Básico', base: 5, ataque_factor: 0.6, eter_cost: 0, cooldown: 0 }
  }

  if (behavior === 'aggressive') {
    const strongest = damageSkills.reduce((a, b) =>
      ((a.base ?? 0) + (a.ataque_factor ?? 0) * 10 + (a.magia_factor ?? 0) * 10) >
      ((b.base ?? 0) + (b.ataque_factor ?? 0) * 10 + (b.magia_factor ?? 0) * 10)
        ? a : b
    )
    return { ...strongest, name: strongest.name, base: strongest.base ?? 5 }
  }

  const chosen = damageSkills[Math.floor(Math.random() * damageSkills.length)]
  return { ...chosen, name: chosen.name, base: chosen.base ?? 5 }
}
