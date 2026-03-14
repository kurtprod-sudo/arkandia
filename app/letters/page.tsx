import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LettersPanel from '@/components/letters/LettersPanel'

export default async function LettersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: myChar } = await supabase
    .from('characters')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myChar) redirect('/character/create')

  const characterId = myChar.id

  const [{ data: inboxRaw }, { data: sentRaw }] = await Promise.all([
    supabase
      .from('letters')
      .select('*, sender:characters!sender_id(id, name, title, avatar_url)')
      .eq('recipient_id', characterId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('letters')
      .select('*, recipient:characters!recipient_id(id, name, title, avatar_url)')
      .eq('sender_id', characterId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const inbox = (inboxRaw ?? []).map((l) => {
    const sender = l.sender as Record<string, unknown> | null
    return {
      id: l.id as string,
      subject: l.subject as string,
      content: l.content as string,
      isRead: (l.is_read as boolean) ?? false,
      parentId: (l.parent_id as string) ?? null,
      createdAt: (l.created_at as string) ?? '',
      senderName: (sender?.name as string) ?? 'Desconhecido',
      senderTitle: (sender?.title as string) ?? null,
      senderId: (sender?.id as string) ?? '',
    }
  })

  const sent = (sentRaw ?? []).map((l) => {
    const recipient = l.recipient as Record<string, unknown> | null
    return {
      id: l.id as string,
      subject: l.subject as string,
      content: l.content as string,
      isRead: (l.is_read as boolean) ?? false,
      createdAt: (l.created_at as string) ?? '',
      recipientName: (recipient?.name as string) ?? 'Desconhecido',
      recipientTitle: (recipient?.title as string) ?? null,
    }
  })

  return (
    <main className="min-h-screen px-4 py-8 relative bg-[var(--ark-void)]">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[var(--ark-red)]/8 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <LettersPanel
          characterId={characterId}
          characterName={myChar.name}
          inbox={inbox}
          sent={sent}
        />
      </div>
    </main>
  )
}
