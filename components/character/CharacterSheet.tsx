'use client'

import { useEffect, useState } from 'react'
import { xpToNextLevel } from '@/lib/game/xp'
import AttributeDistributor from './AttributeDistributor'
import PortraitUpload from './PortraitUpload'
import { ArkPortraitParticles } from '@/components/ui/ArkPortraitParticles'
import {
  SwordIcon, MagicIcon, ShieldIcon, HeartIcon,
  ZapIcon, TargetIcon, AnchorIcon, CrownIcon,
  CoinIcon, CrystalIcon, DiamondIcon, FlameIcon,
} from '@/components/ui/ArkIcons'
import ArkBuildingSlots, { type BuildingSlotData } from './ArkBuildingSlots'
import ArkResonanceCard from './ArkResonanceCard'
import ArkReputationList from './ArkReputationList'
import type { Character, CharacterAttributes, CharacterWallet, CharacterReputation } from '@/types'

interface CharacterSheetProps {
  character: Character
  attrs: CharacterAttributes
  wallet: CharacterWallet
  societyName: string | null
  raceName: string | null
  className: string | null
  building: BuildingSlotData[]
  reputations: CharacterReputation[]
}

const ATTR_ROWS: { key: keyof CharacterAttributes; label: string; abbr: string; color: string; Icon: typeof SwordIcon }[] = [
  { key: 'ataque',     label: 'Ataque',     abbr: 'ATQ', color: 'text-attr-ataque',     Icon: SwordIcon  },
  { key: 'magia',      label: 'Magia',      abbr: 'MAG', color: 'text-attr-magia',      Icon: MagicIcon  },
  { key: 'defesa',     label: 'Defesa',     abbr: 'DEF', color: 'text-attr-defesa',     Icon: ShieldIcon },
  { key: 'vitalidade', label: 'Vitalidade', abbr: 'VIT', color: 'text-attr-vitalidade', Icon: HeartIcon  },
  { key: 'velocidade', label: 'Velocidade', abbr: 'VEL', color: 'text-attr-velocidade', Icon: ZapIcon    },
  { key: 'precisao',   label: 'Precisão',   abbr: 'PRE', color: 'text-attr-precisao',   Icon: TargetIcon },
  { key: 'tenacidade', label: 'Tenacidade', abbr: 'TEN', color: 'text-attr-tenacidade', Icon: AnchorIcon },
  { key: 'capitania',  label: 'Capitania',  abbr: 'CAP', color: 'text-attr-capitania',  Icon: CrownIcon  },
]

/* ── Animated Bars ── */

function CharacterHpBar({ current, max }: { current: number; max: number }) {
  const [mounted, setMounted] = useState(false)
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
  useEffect(() => setMounted(true), [])

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-data text-[11px] tracking-[0.25em] text-[var(--text-label)] uppercase">HP</span>
        <span className="font-data text-sm text-[var(--text-primary)]">{current} / {max}</span>
      </div>
      <div className="h-2.5 rounded-sm bg-[#0f0505] border border-[#1a0808] overflow-hidden">
        <div className="relative h-full overflow-hidden rounded-sm">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#6e160f] to-[#c42a1e] transition-all duration-500 ease-out"
            style={{ width: mounted ? `${percent}%` : '0%' }}
          />
          <div
            className="absolute top-0 left-0 h-1/2 bg-white opacity-30 transition-all duration-500 ease-out rounded-sm"
            style={{ width: mounted ? `${percent}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  )
}

function CharacterEterBar({ current, max }: { current: number; max: number }) {
  const [mounted, setMounted] = useState(false)
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
  useEffect(() => setMounted(true), [])

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-data text-[11px] tracking-[0.25em] text-[var(--text-label)] uppercase">Éter</span>
        <span className="font-data text-sm text-[var(--text-primary)]">{current} / {max}</span>
      </div>
      <div className="h-2.5 rounded-sm bg-[#0f0505] border border-[#1a0808] overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: mounted ? `${percent}%` : '0%', background: 'linear-gradient(to right, #2a2a35, #c8ccd8)' }}
        />
      </div>
    </div>
  )
}

function CharacterXpBar({ current, max }: { current: number; max: number }) {
  const [mounted, setMounted] = useState(false)
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
  useEffect(() => setMounted(true), [])

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-data text-[11px] tracking-[0.2em] text-[var(--text-label)] uppercase">Experiência</span>
        <span className="font-data text-sm text-[var(--text-secondary)]">{current} / {max}</span>
      </div>
      <div className="w-full h-1.5 rounded-sm bg-[#0f0a05] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#5a3a08] to-[#d3a539] transition-all duration-500 ease-out"
          style={{ width: mounted ? `${percent}%` : '0%' }}
        />
      </div>
    </div>
  )
}

/* ── Section Card with SVG ornamental corners ── */

function SectionCard({ children, label, icon }: { children: React.ReactNode; label: string; icon?: React.ReactNode }) {
  return (
    <div className="relative bg-[var(--ark-bg)] rounded-md p-5 border border-[#2a1008]">
      {/* Corner ornaments */}
      <svg className="absolute top-0 left-0 w-4 h-4 pointer-events-none" viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 0 L8 0" stroke="var(--ark-gold)" strokeWidth="1" />
        <path d="M2 5 L2 2 L5 2" stroke="var(--ark-gold-dim)" strokeWidth="0.75" />
      </svg>
      <svg className="absolute top-0 right-0 w-4 h-4 pointer-events-none scale-x-[-1]" viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 0 L8 0" stroke="var(--ark-gold)" strokeWidth="1" />
        <path d="M2 5 L2 2 L5 2" stroke="var(--ark-gold-dim)" strokeWidth="0.75" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none scale-y-[-1]" viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 0 L8 0" stroke="var(--ark-gold)" strokeWidth="1" />
        <path d="M2 5 L2 2 L5 2" stroke="var(--ark-gold-dim)" strokeWidth="0.75" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none scale-x-[-1] scale-y-[-1]" viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 0 L8 0" stroke="var(--ark-gold)" strokeWidth="1" />
        <path d="M2 5 L2 2 L5 2" stroke="var(--ark-gold-dim)" strokeWidth="0.75" />
      </svg>

      <div className="ark-section-header">
        {icon}
        <span className="ark-section-title">{label}</span>
        <div className="ark-section-line" />
      </div>

      {children}
    </div>
  )
}

/* ── Main Sheet ── */

export default function CharacterSheet({
  character,
  attrs,
  wallet,
  societyName,
  raceName,
  className: charClassName,
  building,
  reputations,
}: CharacterSheetProps) {
  const xpNeeded = xpToNextLevel(character.level)
  const moralColor = attrs.moral > 150 ? 'text-[var(--text-gold)]' : attrs.moral >= 50 ? 'text-status-injured' : 'text-[var(--ark-red-glow)]'

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto">
      {/* ── Left Column — Portrait + Identity ── */}
      <div className="w-full lg:w-[300px] flex-shrink-0 space-y-6 px-4">
        {/* Portrait */}
        <div className="relative w-full max-w-[280px] mx-auto aspect-[2/3]">
          {/* Photo area — exact inner bounds of the 1024×1536 frame */}
          <div
            className="absolute overflow-hidden"
            style={{ top: '25.1%', left: '14.3%', right: '14.3%', bottom: '9.8%', zIndex: 1 }}
          >
            <PortraitUpload
              characterInitial={character.name[0]}
              currentUrl={character.avatar_url ?? null}
            />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/frames/portrait-default.png"
            alt=""
            className="absolute inset-0 w-full h-full object-contain portrait-glow pointer-events-none z-20"
            style={{
              filter: `
                drop-shadow(0 0 8px rgba(110,22,15,0.9))
                drop-shadow(0 0 20px rgba(110,22,15,0.6))
                drop-shadow(0 0 50px rgba(110,22,15,0.3))
                drop-shadow(0 0 80px rgba(110,22,15,0.1))
              `
            }}
          />
          <ArkPortraitParticles />
        </div>

        {/* Identity */}
        <div className="text-center">
          <h1 className="name-shimmer leading-tight">
            {character.name}
          </h1>
          {character.title && (
            <p className="font-body italic text-sm text-[var(--text-label)] mt-1 text-readable">
              &quot;{character.title}&quot;
            </p>
          )}

          {/* Ornamental divider */}
          <div className="flex items-center gap-0 my-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--text-gold)] to-transparent opacity-60" />
            <div className="mx-3 flex-shrink-0">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <rect x="1" y="1" width="6" height="6" fill="#2a1808" stroke="#d3a539" strokeWidth="0.5" transform="rotate(45 4 4)" />
              </svg>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--text-gold)] to-transparent opacity-60" />
          </div>

          {/* HUD */}
          <div className="ark-hud">
            {/* Camada 1 — Arquétipo */}
            <div style={{ position: 'relative', padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
              <div className="ark-chip-archetype">
                {character.archetype
                  ? character.archetype.charAt(0).toUpperCase() + character.archetype.slice(1)
                  : 'N/A'}
              </div>
            </div>

            {/* Camada 2 — Classe + Status */}
            <div className="ark-hud-row">
              <div className="ark-chip ark-chip-class">
                {charClassName ?? 'N/A'}
              </div>
              <div className="ark-hud-dot" />
              <div className={`ark-chip ark-chip-status-${character.status === 'dead' ? 'dead' : 'alive'}`}>
                ● {character.status === 'dead' ? 'Morto' : character.status === 'injured' ? 'Ferido' : 'Vivo'}
              </div>
            </div>

            {/* Camada 3 — Metadados finos */}
            <div className="ark-hud-meta">
              <span>Nível {character.level}</span>
              <span className="ark-hud-meta-sep">·</span>
              <span>{raceName ?? 'Raça desconhecida'}</span>
              <span className="ark-hud-meta-sep">·</span>
              <span>{societyName ?? 'Sem sociedade'}</span>
            </div>
          </div>

          {/* Resonance Card */}
          <ArkResonanceCard
            archetype={character.resonance_archetype ?? null}
            resonanceLevel={character.resonance_level ?? 0}
            isUnlocked={character.is_resonance_unlocked ?? false}
            characterLevel={character.level}
          />
        </div>
      </div>

      {/* ── Right Column ── */}
      <div className="flex-1 min-w-0 space-y-4 pt-6">
        {/* Society */}
        {societyName && (
          <p className="font-data tracking-[0.25em] text-[11px] text-[var(--text-label)] uppercase">
            {societyName}
          </p>
        )}

        {/* XP Bar */}
        <CharacterXpBar current={character.xp} max={xpNeeded} />

        {/* Vitals */}
        <SectionCard label="VITAIS" icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L8.5 5.5H13L9.5 8.5L11 13L7 10L3 13L4.5 8.5L1 5.5H5.5Z"
              fill="#6e160f" stroke="#d3a539" strokeWidth="0.6"/>
          </svg>
        }>
          <div className="space-y-4">
            <CharacterHpBar current={attrs.hp_atual} max={attrs.hp_max} />
            <CharacterEterBar current={attrs.eter_atual} max={attrs.eter_max} />
            <div className="h-px bg-[#1a0808] opacity-40 my-3" />
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 font-body text-base text-[var(--text-primary)] text-readable">
                <FlameIcon className={moralColor} size={16} />
                Moral
              </span>
              <span className={`font-data font-bold text-lg ${moralColor} text-readable-gold`}>
                {attrs.moral}/200
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Attributes */}
        <SectionCard label="ATRIBUTOS" icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="#6e160f" stroke="#d3a539" strokeWidth="0.6"/>
            <rect x="8" y="1" width="5" height="5" rx="1" fill="#6e160f" stroke="#d3a539" strokeWidth="0.6"/>
            <rect x="1" y="8" width="5" height="5" rx="1" fill="#6e160f" stroke="#d3a539" strokeWidth="0.6"/>
            <rect x="8" y="8" width="5" height="5" rx="1" fill="#6e160f" stroke="#d3a539" strokeWidth="0.6"/>
          </svg>
        }>
          <div className="space-y-0">
            {ATTR_ROWS.map(({ key, label, abbr, color, Icon }, i) => (
              <div key={key}>
                {i > 0 && <div className="h-px bg-[#1a0808] opacity-30 my-2" />}
                <div className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2">
                    <Icon className={color} size={16} />
                    <span className="ark-attr-name">{label} <span className="ark-attr-abbr">({abbr})</span></span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-data font-bold text-xl ${color} text-readable-gold`}>
                      {attrs[key]}
                    </span>
                    {attrs.attribute_points > 0 && (
                      <a
                        href="#attr-distributor"
                        className="w-[18px] h-[18px] rounded-full border border-[var(--text-gold)] text-[var(--text-gold)] flex items-center justify-center text-xs font-bold hover:bg-[var(--text-gold)] hover:text-[#050203] transition-colors no-underline"
                        title="Distribuir pontos"
                      >
                        +
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Building Slots */}
        <SectionCard label="BUILDING" icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 1h8v12H3z" stroke="#d3a539" strokeWidth="0.6" fill="#6e160f"/>
            <path d="M5 4h4M5 7h4M5 10h4" stroke="#d3a539" strokeWidth="0.5"/>
          </svg>
        }>
          <ArkBuildingSlots slots={building} />
        </SectionCard>

        {/* Reputations */}
        <SectionCard label="REPUTAÇÕES" icon={
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L9 5L13 5.5L10 8.5L11 13L7 10.5L3 13L4 8.5L1 5.5L5 5Z"
              fill="#6e160f" stroke="#d3a539" strokeWidth="0.6"/>
          </svg>
        }>
          <ArkReputationList reputations={reputations} />
        </SectionCard>

        {/* Wallet */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--ark-bg)] border border-[#2a1008] rounded-md p-4 text-center hover:border-[#6e160f] transition-colors duration-200">
            <CoinIcon className="text-[var(--text-gold)] mx-auto" size={20} />
            <p className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase mt-1">Libras</p>
            <p className="font-data font-bold text-2xl text-[var(--text-primary)] text-readable-gold">
              {wallet.libras.toLocaleString()}
            </p>
          </div>
          <div className="bg-[var(--ark-bg)] border border-[#2a1008] rounded-md p-4 text-center hover:border-[#6e160f] transition-colors duration-200">
            <CrystalIcon className="text-attr-magia mx-auto" size={20} />
            <p className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase mt-1">Essência</p>
            <p className="font-data font-bold text-2xl text-attr-magia text-readable-gold">
              {wallet.essencia.toLocaleString()}
            </p>
          </div>
          <div className="bg-[var(--ark-bg)] border border-[#2a1008] rounded-md p-4 text-center hover:border-[#6e160f] transition-colors duration-200">
            <DiamondIcon className="text-attr-eter mx-auto" size={20} />
            <p className="font-data text-[10px] tracking-[0.2em] text-[var(--text-label)] uppercase mt-1">Premium</p>
            <p className="font-data font-bold text-2xl text-attr-eter text-readable-gold">
              {wallet.premium_currency.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Attribute Distributor */}
        {attrs.attribute_points > 0 && (
          <div id="attr-distributor">
            <AttributeDistributor
              characterId={character.id}
              availablePoints={attrs.attribute_points}
              currentAttributes={attrs}
            />
          </div>
        )}
      </div>
    </div>
  )
}
