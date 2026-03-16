import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--ark-void)] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-display font-bold text-[var(--text-primary)] mb-1">
          Termos de Uso
        </h1>
        <p className="text-xs font-data text-[var(--text-label)] mb-8 uppercase tracking-wider">
          Arkandia — Última atualização: Março 2026
        </p>

        <div className="space-y-6 text-sm font-body text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Aceitação dos Termos</h2>
            <p>Ao criar uma conta e acessar o Arkandia, você concorda com estes Termos de Uso. Se não concordar, não utilize o serviço.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">O Serviço</h2>
            <p>Arkandia é um RPG online de texto e combate por turnos. O serviço é fornecido no estado em que se encontra, sujeito a mudanças, interrupções e atualizações sem aviso prévio.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Conta e Personagem</h2>
            <p>Cada conta corresponde a um único personagem. Não é permitido criar múltiplas contas para obter vantagens. Contas inativas por mais de 180 dias podem ser removidas.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Moedas Virtuais</h2>
            <p>Gemas, Libras e Essências são moedas virtuais sem valor monetário real. Gemas adquiridas por compra não são reembolsáveis após crédito, exceto em casos previstos pelo Código de Defesa do Consumidor (CDC — Lei nº 8.078/90).</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Condutas Proibidas</h2>
            <p>São proibidos: exploração de bugs, uso de automação (bots), assédio a outros jogadores, conteúdo ofensivo nos campos de texto e qualquer tentativa de comprometer a segurança do sistema.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Moderação</h2>
            <p>O GM (Game Master) tem autoridade para suspender ou banir contas que violem estes termos. Decisões de moderação podem ser contestadas por e-mail.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Propriedade Intelectual</h2>
            <p>Todo o conteúdo do Arkandia — textos, sistemas, arte e narrativa — é propriedade do desenvolvedor. Conteúdo criado pelos jogadores (diários, cartas) permanece de responsabilidade do próprio jogador.</p>
          </section>

          <section>
            <h2 className="text-sm font-data font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">Limitação de Responsabilidade</h2>
            <p>O Arkandia não se responsabiliza por perda de progresso decorrente de falhas técnicas, interrupções de serviço ou ações de moderação aplicadas conforme estes termos.</p>
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
