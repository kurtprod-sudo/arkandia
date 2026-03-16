import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--ark-void)] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">
          Política de Privacidade
        </h1>
        <p className="text-xs font-data text-[var(--text-label)] mb-8 uppercase tracking-wider">
          Arkandia — Última atualização: Março 2026
        </p>

        <div className="space-y-6 text-sm font-body text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Dados Coletados</h2>
            <p>Coletamos: endereço de e-mail (para autenticação), dados de jogo (personagem, progresso, transações), e logs de acesso (IP, data/hora).</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Uso dos Dados</h2>
            <p>Os dados são usados exclusivamente para: autenticação, funcionamento do jogo, processamento de pagamentos e comunicações relacionadas ao serviço.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Compartilhamento</h2>
            <p>Não vendemos nem compartilhamos dados pessoais com terceiros, exceto: Supabase (infraestrutura de banco de dados e autenticação) e Mercado Pago (processamento de pagamentos PIX). Ambos possuem políticas de privacidade próprias.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Pagamentos</h2>
            <p>Transações PIX são processadas pelo Mercado Pago. Não armazenamos dados bancários. O histórico de pagamentos (valor, data, status) é armazenado para controle de Gemas creditadas.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Retenção</h2>
            <p>Dados de conta são mantidos enquanto a conta existir. Contas removidas têm dados excluídos em até 30 dias, exceto logs de pagamento (obrigação legal de 5 anos).</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Direitos do Usuário</h2>
            <p>Você pode solicitar: acesso aos seus dados, correção de dados incorretos, exclusão da conta e portabilidade. Solicitações por e-mail serão respondidas em até 15 dias úteis.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Cookies</h2>
            <p>Utilizamos apenas cookies essenciais para autenticação de sessão. Não utilizamos cookies de rastreamento ou publicidade.</p>
          </section>

          <section>
            <p className="text-xs font-data text-[var(--text-label)]">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>
        </div>

        <div className="mt-8 pt-4 border-t border-[var(--ark-border)]">
          <Link href="/" className="text-xs font-data text-[var(--text-label)] hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wider">
            ← Voltar
          </Link>
        </div>
      </div>
    </main>
  )
}
