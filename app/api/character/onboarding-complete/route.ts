import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  await supabase
    .from('characters')
    .update({ onboarding_completed: true })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ completed: false })

  const { data: character } = await supabase
    .from('characters')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ completed: character?.onboarding_completed ?? false })
}
