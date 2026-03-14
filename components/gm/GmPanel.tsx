'use client'

import { useState } from 'react'
import GmOverview from './tabs/GmOverview'
import GmCharacters from './tabs/GmCharacters'
import GmWorld from './tabs/GmWorld'
import GmNarrative from './tabs/GmNarrative'
import GmEconomy from './tabs/GmEconomy'
import GmModeration from './tabs/GmModeration'
import type { CharacterWithAttributes, GameEvent } from '@/types'

type GmTab = 'overview' | 'characters' | 'world' | 'narrative' | 'economy' | 'moderation'

const TAB_LABELS: Record<GmTab, string> = {
  overview: 'Visao Geral',
  characters: 'Personagens',
  world: 'Mundo',
  narrative: 'Narrativa',
  economy: 'Economia',
  moderation: 'Moderacao',
}

export interface GmPanelProps {
  characters: CharacterWithAttributes[]
  events: GameEvent[]
  societies: Array<{ id: string; name: string; level: number; treasury_libras: number; recruitment_open: boolean; dissolved_at: string | null }>
  territories: Array<{ id: string; name: string; region: string; category: string; controlling_society_id: string | null; safezone_until: string | null; societies: { name: string } | null }>
  activeWars: Array<{ id: string; status: string; created_at: string; attacker: { name: string } | null; defender: { name: string } | null; territories: { name: string } | null }>
  titleDefs: Array<{ id: string; name: string; category: string; is_unique: boolean }>
  summonCatalogs: Array<{ id: string; name: string; is_active: boolean; cost_gemas: number; pity_threshold: number }>
  unconfirmedLore: Array<{ id: string; title: string; character_id: string; characters: { name: string } | null }>
  recentPayments: Array<{ id: string; character_id: string; status: string; amount_brl: number; gemas_amount: number; created_at: string; characters: { name: string } | null }>
  allScenarios: Array<{ id: string; name: string; location: string; is_active: boolean; scenario_presence: Array<{ count: number }> }>
  journalEditions: Array<{ id: string; edition_date: string; status: string; published_at: string | null }>
  allItems: Array<{ id: string; name: string; item_type: string; rarity: string }>
  factions: Array<{ id: string; slug: string; name: string }>
}

export default function GmPanel(props: GmPanelProps) {
  const [tab, setTab] = useState<GmTab>('overview')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--ark-border)] mb-6 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as GmTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-data font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
              tab === t
                ? 'text-[var(--ark-red-glow)] border-b-2 border-[var(--ark-red-glow)]'
                : 'text-[var(--text-label)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <GmOverview
          characters={props.characters}
          events={props.events}
          societies={props.societies}
          territories={props.territories}
          activeWars={props.activeWars}
          recentPayments={props.recentPayments}
        />
      )}
      {tab === 'characters' && (
        <GmCharacters
          characters={props.characters}
          titleDefs={props.titleDefs}
          allItems={props.allItems}
          factions={props.factions}
        />
      )}
      {tab === 'world' && (
        <GmWorld
          territories={props.territories}
          societies={props.societies}
          activeWars={props.activeWars}
        />
      )}
      {tab === 'narrative' && (
        <GmNarrative
          journalEditions={props.journalEditions}
          allScenarios={props.allScenarios}
          unconfirmedLore={props.unconfirmedLore}
        />
      )}
      {tab === 'economy' && (
        <GmEconomy
          recentPayments={props.recentPayments}
          summonCatalogs={props.summonCatalogs}
          allItems={props.allItems}
          characterCount={props.characters.length}
        />
      )}
      {tab === 'moderation' && (
        <GmModeration events={props.events} />
      )}
    </div>
  )
}
