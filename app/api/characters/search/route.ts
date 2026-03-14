import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const { data } = await supabase
    .from('characters')
    .select('id, name, title')
    .ilike('name', `%${q}%`)
    .limit(10)

  return NextResponse.json({ results: data ?? [] })
}
