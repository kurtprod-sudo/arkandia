import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateCharacterForm from '@/components/character/CreateCharacterForm'
import ArkDivider from '@/components/ui/ArkDivider'
import { type Race, type GameClass } from '@/types'

export default async function CreateCharacterPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Se já tem personagem, vai direto para a ficha
  const { data: existing } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/character')

  // Busca raças e classes disponíveis
  const { data: races } = await supabase
    .from('races')
    .select('*')
    .order('name')

    // DEBUG TEMPORÁRIO — remover depois
    console.log('[CREATE] races:', races?.length, 'error:', racesError?.message, 'code:', racesError?.code)
    

  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name')

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#6e160f]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-[#3A2A18]/30 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 py-12">
        <h1 className="font-display text-3xl font-bold text-[var(--ark-gold-bright)] text-glow-gold text-center mb-1">
          Despertar em Ellia
        </h1>
        <p className="text-[var(--text-secondary)] text-center font-body text-sm mb-2">
          Quem você é neste mundo?
        </p>
        <ArkDivider className="w-48 mx-auto mb-8" />

        <div className="bg-[var(--ark-surface)] backdrop-blur-xl border border-[var(--ark-border)] rounded-sm p-6">
          <CreateCharacterForm
            races={(races ?? []) as unknown as Race[]}
            classes={(classes ?? []) as unknown as GameClass[]}
          />
        </div>
      </div>
    </main>
  )
}
