'use client'

import { Lock, CheckCircle, MapPin } from 'lucide-react'

interface ChapterNode {
  chapterNumber: number
  nation: string
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  stagesCompleted: number
}

interface CampaignWorldMapProps {
  chapters: ChapterNode[]
  onChapterClick: (chapterNumber: number) => void
}

const NATION_COORDS: Record<string, { cx: number; cy: number; label: string }> = {
  valoria:   { cx: 500, cy: 320, label: 'Valoria' },
  eryuell:   { cx: 200, cy: 360, label: 'Eryuell' },
  duren:     { cx: 460, cy: 140, label: 'Düren' },
  // Future nations (always locked)
  norrheim:  { cx: 380, cy: 100, label: 'Norrheim' },
  ryugakure: { cx: 820, cy: 260, label: 'Ryugakure' },
  ogygia:    { cx: 280, cy: 440, label: 'Ogygia' },
  shenzhou:  { cx: 880, cy: 200, label: 'Shenzhou' },
  indravaar: { cx: 760, cy: 400, label: 'Indravaar' },
  urgath:    { cx: 600, cy: 200, label: 'Urgath' },
  kastulle:  { cx: 680, cy: 460, label: 'Kastulle' },
}

const STATUS_COLORS: Record<string, string> = {
  locked:      '#4a4a4a',
  available:   '#c9a84c',
  in_progress: '#a33',
  completed:   '#2d8a4e',
}

const ROUTE_LINES: Array<[string, string]> = [
  ['valoria', 'eryuell'],
  ['eryuell', 'duren'],
]

export default function CampaignWorldMap({ chapters, onChapterClick }: CampaignWorldMapProps) {
  const chapterMap = new Map(chapters.map((c) => [c.nation, c]))

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 1000 600"
        className="w-full min-w-[600px] h-auto"
        style={{ maxHeight: '400px' }}
      >
        {/* Background */}
        <defs>
          <pattern id="mapTexture" patternUnits="userSpaceOnUse" width="40" height="40">
            <rect width="40" height="40" fill="var(--ark-bg)" />
            <circle cx="20" cy="20" r="0.5" fill="rgba(255,255,255,0.03)" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="1000" height="600" fill="url(#mapTexture)" />

        {/* Ocean vibe */}
        <ellipse cx="500" cy="300" rx="450" ry="260" fill="rgba(20,30,50,0.3)" stroke="rgba(100,120,160,0.1)" strokeWidth="1" />

        {/* Continent shape */}
        <path
          d="M 160,300 Q 200,200 350,150 Q 500,80 650,160 Q 800,220 850,350 Q 820,450 680,480 Q 500,520 300,470 Q 180,420 160,300 Z"
          fill="rgba(40,35,30,0.5)"
          stroke="rgba(120,100,80,0.2)"
          strokeWidth="1.5"
        />

        {/* Route lines */}
        {ROUTE_LINES.map(([from, to], i) => {
          const a = NATION_COORDS[from]
          const b = NATION_COORDS[to]
          if (!a || !b) return null
          const fromChapter = chapterMap.get(from)
          const toChapter = chapterMap.get(to)
          const isActive = fromChapter && fromChapter.status !== 'locked' &&
            toChapter && toChapter.status !== 'locked'
          return (
            <line
              key={i}
              x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
              stroke={isActive ? 'rgba(201,168,76,0.4)' : 'rgba(100,100,100,0.15)'}
              strokeWidth="2"
              strokeDasharray="8 4"
            />
          )
        })}

        {/* Future nation nodes (always locked) */}
        {Object.entries(NATION_COORDS)
          .filter(([key]) => !['valoria', 'eryuell', 'duren'].includes(key))
          .map(([key, coords]) => (
            <g key={key} data-nation={key} opacity={0.25}>
              <circle cx={coords.cx} cy={coords.cy} r={16} fill="#333" stroke="#555" strokeWidth="1" />
              <text
                x={coords.cx} y={coords.cy + 30}
                textAnchor="middle" fontSize="10"
                fill="#666" fontFamily="var(--font-data)"
              >
                {coords.label}
              </text>
            </g>
          ))}

        {/* Active nation nodes */}
        {chapters.map((ch) => {
          const coords = NATION_COORDS[ch.nation]
          if (!coords) return null
          const color = STATUS_COLORS[ch.status]
          const isClickable = ch.status !== 'locked'

          return (
            <g
              key={ch.nation}
              data-nation={ch.nation}
              className={isClickable ? 'cursor-pointer' : ''}
              onClick={() => isClickable && onChapterClick(ch.chapterNumber)}
              opacity={ch.status === 'locked' ? 0.4 : 1}
            >
              {/* Pulse animation for available */}
              {ch.status === 'available' && (
                <circle cx={coords.cx} cy={coords.cy} r={24} fill="none" stroke={color} strokeWidth="1.5" opacity={0.5}>
                  <animate attributeName="r" from="24" to="34" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* In-progress glow */}
              {ch.status === 'in_progress' && (
                <circle cx={coords.cx} cy={coords.cy} r={28} fill="none" stroke="#c33" strokeWidth="2" opacity={0.4} filter="url(#glow)">
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Main circle */}
              <circle
                cx={coords.cx} cy={coords.cy} r={22}
                fill={`${color}33`}
                stroke={color}
                strokeWidth="2"
              />

              {/* Progress ring */}
              {ch.stagesCompleted > 0 && ch.status !== 'locked' && (
                <circle
                  cx={coords.cx} cy={coords.cy} r={22}
                  fill="none"
                  stroke={ch.status === 'completed' ? '#2d8a4e' : '#c9a84c'}
                  strokeWidth="3"
                  strokeDasharray={`${(ch.stagesCompleted / 10) * 138.2} 138.2`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${coords.cx} ${coords.cy})`}
                />
              )}

              {/* Icon */}
              <foreignObject x={coords.cx - 8} y={coords.cy - 8} width={16} height={16}>
                {ch.status === 'locked' && <Lock size={16} color="#666" />}
                {ch.status === 'completed' && <CheckCircle size={16} color="#2d8a4e" />}
                {(ch.status === 'available' || ch.status === 'in_progress') && (
                  <MapPin size={16} color={color} />
                )}
              </foreignObject>

              {/* Label */}
              <text
                x={coords.cx} y={coords.cy + 38}
                textAnchor="middle" fontSize="12"
                fill="var(--text-primary)" fontFamily="var(--font-display)"
                fontWeight="bold"
              >
                {coords.label}
              </text>

              {/* Progress text */}
              {ch.status !== 'locked' && (
                <text
                  x={coords.cx} y={coords.cy + 52}
                  textAnchor="middle" fontSize="9"
                  fill="var(--text-label)" fontFamily="var(--font-data)"
                >
                  {ch.stagesCompleted}/10
                </text>
              )}
            </g>
          )
        })}

        {/* Map title */}
        <text x={500} y={30} textAnchor="middle" fontSize="14" fill="var(--text-label)" fontFamily="var(--font-display)" fontWeight="bold" letterSpacing="3">
          ARKANDIA
        </text>
      </svg>
    </div>
  )
}
