import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { JournalSection } from '@/types'

export default async function JournalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: editions } = await supabase
    .from('journal_editions')
    .select('id, edition_date, sections, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  return (
    <main className="min-h-screen px-4 py-8 relative bg-[var(--ark-void)]">
      {/* Background effects */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[var(--ark-gold)]/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--ark-red)]/6 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-[var(--text-label)] text-xs font-data tracking-[0.2em] uppercase hover:text-[var(--text-secondary)] transition-colors"
          >
            &larr; Dashboard
          </Link>
          <h1 className="font-display text-2xl text-[var(--ark-gold-bright)] mt-4 mb-1">
            A Gazeta do Horizonte
          </h1>
          <p className="font-body text-sm text-[var(--text-secondary)] italic">
            &ldquo;Tudo que o Conselho n&atilde;o quer que voc&ecirc; saiba. E algumas coisas que ele quer.&rdquo;
          </p>
        </div>

        {/* Editions */}
        {editions && editions.length > 0 ? (
          <div className="space-y-6">
            {editions.map((edition) => {
              const sections = edition.sections as unknown as JournalSection[]
              const manchete = sections.find((s) => s.tipo === 'manchete')
              const published = edition.published_at
                ? new Date(edition.published_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : edition.edition_date

              return (
                <article
                  key={edition.id}
                  className="bg-[var(--ark-bg)] rounded-md border border-[#2a1008] p-6"
                >
                  {/* Edition date */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase">
                      {published}
                    </span>
                  </div>

                  {/* Manchete */}
                  {manchete && (
                    <h2 className="font-display text-lg text-[var(--text-primary)] mb-4 leading-snug">
                      {manchete.conteudo}
                    </h2>
                  )}

                  {/* Other sections */}
                  <div className="space-y-4">
                    {sections
                      .filter((s) => s.tipo !== 'manchete')
                      .map((section, i) => (
                        <SectionBlock key={i} section={section} />
                      ))}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="bg-[var(--ark-bg)] rounded-md border border-[#2a1008] p-8 text-center">
            <p className="font-body text-sm text-[var(--text-ghost)] italic">
              A Gazeta ainda n&atilde;o publicou sua primeira edi&ccedil;&atilde;o.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function SectionBlock({ section }: { section: JournalSection }) {
  switch (section.tipo) {
    case 'olhos_viram':
      return (
        <div>
          <h3 className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-2">
            O Que os Olhos Viram
          </h3>
          <div className="space-y-1">
            {section.conteudo.split('\n').map((line, i) => (
              <p key={i} className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
                <span className="text-[var(--ark-red-glow)] mr-2">&diams;</span>
                {line.replace(/^[-•◆]\s*/, '')}
              </p>
            ))}
          </div>
        </div>
      )

    case 'rumores':
      return (
        <div>
          <h3 className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-2">
            Rumores do Continente
          </h3>
          <div className="space-y-1">
            {section.conteudo.split('\n').map((line, i) => (
              <p key={i} className="font-body text-sm text-[var(--text-secondary)] italic leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      )

    case 'mesa_editora':
      return (
        <div className="border-t border-[#1a0808]/50 pt-4 mt-4">
          <h3 className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase mb-2">
            Da Mesa da Editora
          </h3>
          <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
            {section.conteudo}
          </p>
          <p className="font-data text-xs text-[var(--text-ghost)] mt-2 text-right">
            &mdash; Mara Voss
          </p>
        </div>
      )

    default:
      return (
        <p className="font-body text-sm text-[var(--text-secondary)] leading-relaxed">
          {section.conteudo}
        </p>
      )
  }
}
