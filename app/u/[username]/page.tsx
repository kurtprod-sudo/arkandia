import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ username: string }>
}

export default async function UserProfileRedirectPage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', profile.id)
    .single()

  if (!character) notFound()

  redirect(`/character/${character.id}`)
}
