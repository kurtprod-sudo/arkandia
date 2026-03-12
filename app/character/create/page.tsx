import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateCharacterForm from '@/components/character/CreateCharacterForm'
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
    <main className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-amber-400 text-center mb-2">
          Forja do Destino
        </h1>
        <p className="text-neutral-400 text-center mb-8">
          Quem você é neste mundo?
        </p>
        <CreateCharacterForm professions={(professions ?? []) as Profession[]} />
      </div>
    </main>
  )
}
