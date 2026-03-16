import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Injeta pathname no header para o layout server component
  supabaseResponse.headers.set('x-next-pathname', pathname)

  // Rotas protegidas que requerem autenticação
  const protectedPaths = ['/home', '/dashboard', '/character', '/gm', '/world', '/battle', '/lobby', '/crafting', '/society', '/sanctuary', '/market', '/rankings', '/shop', '/events', '/notifications', '/expeditions', '/combat', '/dungeon', '/hunting', '/letters', '/diary', '/scenarios', '/journal', '/map', '/territories', '/summon', '/titles']
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Rota GM: verifica role na tabela profiles
  if (pathname.startsWith('/gm') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'gm') {
      const url = request.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  // Se autenticado e tentar acessar /auth, redireciona para home
  if (user && pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // Redireciona /dashboard para /home
  if (pathname === '/dashboard' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
