import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateCharacterForm from '@/components/character/CreateCharacterForm'
import ArkDivider from '@/components/ui/ArkDivider'
import { type Profession } from '@/types'

export default async function CreateCharacterPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Se já tem personagem, vai direto para a ficha
  const { data: existing } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) redirect('/character')

  // Busca profissões disponíveis
  const { data: professions } = await supabase
    .from('professions')
    .select('*')
    .order('name')

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-wine-dark/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-bronze-dark/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 py-12">
        <h1 className="font-display text-3xl font-bold text-gold-pure text-glow-bronze text-center mb-1">
          Forja do Destino
        </h1>
        <p className="text-ark-text-secondary text-center font-body text-sm mb-2">
          Quem você é neste mundo?
        </p>
        <ArkDivider className="w-48 mx-auto mb-8" />

        <div className="bg-ark-bg-secondary border border-bronze-dark/25 rounded-xl p-6">
          <CreateCharacterForm professions={(professions ?? []) as Profession[]} />
        </div>
      </div>
    </main>
  )
}
