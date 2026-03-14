'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildInitialAttributes, buildInitialAttributesFromClass } from '@/lib/game/attributes'
import { xpToNextLevel } from '@/lib/game/xp'
import { createEvent } from '@/lib/game/events'
import { generateAvatar } from '@/lib/narrative/avatar'
import { type ProfessionType, type ProfessionBaseAttributes, type ProfessionBonuses } from '@/types'

export async function createCharacter(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const name = (formData.get('name') as string)?.trim()
  const raceId = formData.get('race_id') as string
  const classId = formData.get('class_id') as string
  const physicalTraits = (formData.get('physical_traits') as string)?.trim() || null

  if (!name || name.length < 2 || name.length > 32) {
    return { error: 'Nome deve ter entre 2 e 32 caracteres.' }
  }

  if (!raceId) {
    return { error: 'Escolha uma raça.' }
  }

  if (!classId) {
    return { error: 'Escolha uma classe.' }
  }

  // Verifica se já tem personagem
  const { data: existingChar } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingChar) {
    redirect('/character')
  }

  // Valida que a raça existe
  const { data: raceData, error: raceError } = await supabase
    .from('races')
    .select('id, name')
    .eq('id', raceId)
    .single()

  if (raceError || !raceData) {
    return { error: 'Raça inválida.' }
  }

  // Valida que a classe existe e busca scaling
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, weapon_type, scaling')
    .eq('id', classId)
    .single()

  if (classError || !classData) {
    return { error: 'Classe inválida.' }
  }

  // Cria o personagem
  const { data: character, error: charError } = await supabase
    .from('characters')
    .insert({
      user_id: user.id,
      name,
      race_id: raceId,
      class_id: classId,
      profession: 'militar' as const, // legacy field — será removido em migration futura
      physical_traits: physicalTraits,
      level: 1,
      xp: 0,
      xp_to_next_level: xpToNextLevel(1),
      status: 'active' as const,
    })
    .select()
    .single()

  if (charError || !character) {
    if (charError?.code === '23505') {
      return { error: 'Este nome já está em uso.' }
    }
    return { error: charError?.message ?? 'Erro ao criar personagem.' }
  }

  // Aplica atributos da classe (o trigger já criou o registro zerado)
  const classScaling = (classData.scaling as Record<string, number>) ?? {}
  const attrs = buildInitialAttributesFromClass(character.id, classScaling)

  const { error: attrError } = await supabase
    .from('character_attributes')
    .update({
      ataque: attrs.ataque,
      magia: attrs.magia,
      eter_max: attrs.eter_max,
      eter_atual: attrs.eter_atual,
      defesa: attrs.defesa,
      vitalidade: attrs.vitalidade,
      hp_max: attrs.hp_max,
      hp_atual: attrs.hp_atual,
      velocidade: attrs.velocidade,
      precisao: attrs.precisao,
      tenacidade: attrs.tenacidade,
      capitania: attrs.capitania,
    })
    .eq('character_id', character.id)

  if (attrError) {
    return { error: 'Erro ao aplicar atributos da classe.' }
  }

  // Busca as 2 skills iniciais da classe (is_starting_skill = true)
  const { data: startingSkills } = await supabase
    .from('skills')
    .select('id')
    .eq('class_id', classId)
    .eq('is_starting_skill', true)
    .order('skill_type')
    .limit(2)

  if (startingSkills && startingSkills.length > 0) {
    // Insere as skills adquiridas
    const skillInserts = startingSkills.map((s) => ({
      character_id: character.id,
      skill_id: s.id,
    }))
    await supabase.from('character_skills').insert(skillInserts)

    // Equipa nos slots 1 e 2 da building
    const buildingInserts = startingSkills.map((s, i) => ({
      character_id: character.id,
      slot: i + 1,
      skill_id: s.id,
    }))
    await supabase.from('character_building').insert(buildingInserts)
  }

  // Registra evento
  const weaponType = (classData.weapon_type as string) ?? 'arma desconhecida'
  await createEvent(supabase, {
    type: 'character_created',
    actorId: character.id,
    metadata: { name, race: raceData.name, class: classData.name, weapon_type: weaponType },
    isPublic: true,
    narrativeText: `${name} desperta em Arkandia como ${classData.name}, portando ${weaponType}.`,
  })

  // Gera avatar em background — não await para não bloquear
  const raceName = raceData.name as string
  const classNameStr = classData.name as string
  generateAvatar({
    characterId: character.id,
    raceName,
    className: classNameStr,
    physicalTraits,
    triggerType: 'creation',
    gemasSpent: 0,
  }).catch((err) => console.error('[creation] avatar generation failed:', err))

  revalidatePath('/character')
  redirect('/character')
}

/** @deprecated Versão antiga baseada em Profissões. Mantida para referência. */
export async function createCharacterLegacy(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const name = (formData.get('name') as string).trim()
  const profession = formData.get('profession') as ProfessionType

  if (!name || name.length < 2 || name.length > 32) {
    return { error: 'Nome deve ter entre 2 e 32 caracteres.' }
  }

  const { data: existingChar } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existingChar) {
    redirect('/character')
  }

  const { data: professionData, error: profError } = await supabase
    .from('professions')
    .select('*')
    .eq('name', profession)
    .single()

  if (profError || !professionData) {
    return { error: 'Profissão inválida.' }
  }

  const { data: character, error: charError } = await supabase
    .from('characters')
    .insert({
      user_id: user.id,
      name,
      profession,
      level: 1,
      xp: 0,
      xp_to_next_level: xpToNextLevel(1),
      status: 'active' as const,
    })
    .select()
    .single()

  if (charError || !character) {
    if (charError?.code === '23505') {
      return { error: 'Este nome já está em uso.' }
    }
    return { error: charError?.message ?? 'Erro ao criar personagem.' }
  }

  const baseAttrs = professionData.base_attributes as ProfessionBaseAttributes
  const attrs = buildInitialAttributes(character.id, baseAttrs)

  const { error: attrError } = await supabase
    .from('character_attributes')
    .update({
      ataque: attrs.ataque,
      magia: attrs.magia,
      eter_max: attrs.eter_max,
      eter_atual: attrs.eter_atual,
      defesa: attrs.defesa,
      vitalidade: attrs.vitalidade,
      hp_max: attrs.hp_max,
      hp_atual: attrs.hp_atual,
      velocidade: attrs.velocidade,
      precisao: attrs.precisao,
      tenacidade: attrs.tenacidade,
      capitania: attrs.capitania,
    })
    .eq('character_id', character.id)

  if (attrError) {
    return { error: 'Erro ao aplicar atributos da profissão.' }
  }

  const bonuses = professionData.bonuses as ProfessionBonuses
  if (bonuses.starting_libras) {
    await supabase
      .from('character_wallet')
      .update({ libras: bonuses.starting_libras })
      .eq('character_id', character.id)
  }

  await createEvent(supabase, {
    type: 'character_created',
    actorId: character.id,
    metadata: { name, profession },
    isPublic: true,
    narrativeText: `${name} desperta no mundo de Arkandia como ${profession}.`,
  })

  revalidatePath('/character')
  redirect('/character')
}

type DistributableAttr =
  | 'ataque'
  | 'magia'
  | 'eter_max'
  | 'defesa'
  | 'vitalidade'
  | 'velocidade'
  | 'precisao'
  | 'tenacidade'
  | 'capitania'

export async function distributeAttribute(payload: {
  character_id: string
  attribute: DistributableAttr
  amount: number
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autenticado.' }

  // Verifica ownership
  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('id', payload.character_id)
    .eq('user_id', user.id)
    .single()

  if (!character) return { error: 'Personagem não encontrado.' }

  // Busca estado atual dos atributos
  const { data: attrs } = await supabase
    .from('character_attributes')
    .select('attribute_points, vitalidade, eter_max, ataque, magia, defesa, velocidade, precisao, tenacidade, capitania')
    .eq('character_id', payload.character_id)
    .single()

  if (!attrs || attrs.attribute_points < payload.amount) {
    return { error: 'Pontos insuficientes.' }
  }

  // Calcula novo valor
  const currentVal = attrs[payload.attribute] as number
  const newVal = currentVal + payload.amount

  const update: Record<string, number> = {
    [payload.attribute]: newVal,
    attribute_points: attrs.attribute_points - payload.amount,
  }

  // Se distribuiu em vitalidade, recalcula hp_max
  if (payload.attribute === 'vitalidade') {
    update.hp_max = newVal * 10
  }

  const { error } = await supabase
    .from('character_attributes')
    .update(update)
    .eq('character_id', payload.character_id)

  if (error) return { error: error.message }

  await createEvent(supabase, {
    type: 'attribute_distributed',
    actorId: payload.character_id,
    metadata: { attribute: payload.attribute, amount: payload.amount },
  })

  revalidatePath('/character')
  return { success: true }
}
