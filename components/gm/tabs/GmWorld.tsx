'use client'

import { useState } from 'react'
import ArkButton from '@/components/ui/ArkButton'
import ArkBadge from '@/components/ui/ArkBadge'
import {
  gmAssignTerritory, gmSetSocietyLevel, gmToggleRecruitment,
  gmResolveBattle, gmCancelWar,
} from '@/app/gm/actions'

interface Props {
  territories: Array<{ id: string; name: string; region: string; category: string; controlling_society_id: string | null; safezone_until: string | null; societies: { name: string } | null }>
  societies: Array<{ id: string; name: string; level: number; treasury_libras: number; recruitment_open: boolean; dissolved_at: string | null }>
  activeWars: Array<{ id: string; status: string; created_at: string; attacker: { name: string } | null; defender: { name: string } | null; territories: { name: string } | null }>
}

export default function GmWorld({ territories, societies, activeWars }: Props) {
  const [section, setSection] = useState<'territories' | 'societies' | 'wars'>('territories')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [assignSociety, setAssignSociety] = useState<Record<string, string>>({})
  const [societyLevel, setSocietyLevel] = useState<Record<string, string>>({})

  async function runAction(fn: () => Promise<{ success?: boolean; error?: string }>) {
    setLoading(true)
    setMsg('')
    try {
      const result = await fn()
      setMsg(result.error ?? 'OK')
    } catch (err) {
      setMsg(String(err))
    }
    setLoading(false)
  }

  const sections = [
    { key: 'territories' as const, label: 'Territorios' },
    { key: 'societies' as const, label: 'Sociedades' },
    { key: 'wars' as const, label: 'Guerras' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-3 py-1.5 text-xs font-data uppercase tracking-wider rounded-sm transition-colors ${
              section === s.key
                ? 'bg-[var(--ark-red)]/30 text-[var(--ark-red-glow)] border border-[var(--ark-border-bright)]'
                : 'text-[var(--text-label)] border border-[var(--ark-border)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {msg && <p className={`text-xs font-data ${msg === 'OK' ? 'text-status-alive' : 'text-[var(--ark-red-glow)]'}`}>{msg}</p>}

      {/* Territories */}
      {section === 'territories' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-data">
            <thead>
              <tr className="border-b border-[var(--ark-border)] text-[var(--text-label)] uppercase tracking-wider">
                <th className="text-left py-2 px-2">Nome</th>
                <th className="text-left py-2 px-2">Regiao</th>
                <th className="text-left py-2 px-2">Categoria</th>
                <th className="text-left py-2 px-2">Controlador</th>
                <th className="text-left py-2 px-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {territories.map((t) => (
                <tr key={t.id} className="border-b border-[var(--ark-border)]/50 hover:bg-[var(--ark-surface-hover)]">
                  <td className="py-2 px-2 text-[var(--text-primary)]">{t.name}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{t.region}</td>
                  <td className="py-2 px-2 text-[var(--text-label)]">{t.category}</td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{t.societies?.name ?? '—'}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={assignSociety[t.id] ?? ''}
                        onChange={(e) => setAssignSociety((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        className="px-1 py-0.5 text-[10px] bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)]"
                      >
                        <option value="">Sociedade...</option>
                        {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <ArkButton size="sm" disabled={loading || !assignSociety[t.id]} onClick={() => runAction(() => gmAssignTerritory(t.id, assignSociety[t.id]))}>
                        Atribuir
                      </ArkButton>
                      {t.controlling_society_id && (
                        <ArkButton size="sm" variant="ghost" disabled={loading} onClick={() => runAction(() => gmAssignTerritory(t.id, null))}>
                          Liberar
                        </ArkButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Societies */}
      {section === 'societies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {societies.map((s) => (
            <div key={s.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[var(--text-primary)]">{s.name}</span>
                <ArkBadge color={s.recruitment_open ? 'alive' : 'crimson'} className="text-[9px]">
                  {s.recruitment_open ? 'Aberta' : 'Fechada'}
                </ArkBadge>
              </div>
              <div className="flex gap-4 text-xs font-data text-[var(--text-label)]">
                <span>Nv {s.level}</span>
                <span>{s.treasury_libras} Libras</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={societyLevel[s.id] ?? ''}
                  onChange={(e) => setSocietyLevel((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  placeholder="Nivel"
                  className="px-2 py-1 text-xs bg-[var(--ark-void)] border border-[var(--ark-border)] rounded-sm text-[var(--text-primary)] w-16 font-data"
                  min="1"
                />
                <ArkButton size="sm" disabled={loading || !societyLevel[s.id]} onClick={() => runAction(() => gmSetSocietyLevel(s.id, Number(societyLevel[s.id])))}>
                  Set Nivel
                </ArkButton>
                <ArkButton
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => runAction(() => gmToggleRecruitment(s.id, !s.recruitment_open))}
                >
                  {s.recruitment_open ? 'Fechar' : 'Abrir'} Recrutamento
                </ArkButton>
              </div>
            </div>
          ))}
          {societies.length === 0 && (
            <p className="text-[var(--text-label)] text-sm font-body italic col-span-2">Nenhuma sociedade ativa.</p>
          )}
        </div>
      )}

      {/* Wars */}
      {section === 'wars' && (
        <div className="space-y-3">
          {activeWars.map((w) => (
            <div key={w.id} className="bg-[var(--ark-surface)] border border-[var(--ark-border)] rounded-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-display text-sm text-[var(--text-primary)]">
                  {w.attacker?.name ?? '?'} <span className="text-[var(--ark-red-glow)]">vs</span> {w.defender?.name ?? '?'}
                </div>
                <ArkBadge color="injured" className="text-[9px]">{w.status}</ArkBadge>
              </div>
              <p className="text-xs font-data text-[var(--text-label)] mb-2">
                Territorio: {w.territories?.name ?? '?'}
              </p>
              <div className="flex gap-2">
                <ArkButton size="sm" disabled={loading} onClick={() => runAction(() => gmResolveBattle(w.id))}>
                  Resolver Batalha
                </ArkButton>
                <ArkButton size="sm" variant="danger" disabled={loading} onClick={() => runAction(() => gmCancelWar(w.id))}>
                  Cancelar Guerra
                </ArkButton>
              </div>
            </div>
          ))}
          {activeWars.length === 0 && (
            <p className="text-[var(--text-label)] text-sm font-body italic">Nenhuma guerra ativa.</p>
          )}
        </div>
      )}
    </div>
  )
}
