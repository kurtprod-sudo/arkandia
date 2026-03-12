interface Props {
  label: string
  current: number
  max: number
  color: 'red' | 'blue' | 'green'
}

const COLOR_MAP = {
  red: {
    bar: 'bg-red-500',
    text: 'text-red-400',
  },
  blue: {
    bar: 'bg-blue-500',
    text: 'text-blue-400',
  },
  green: {
    bar: 'bg-green-500',
    text: 'text-green-400',
  },
}

export default function StatBar({ label, current, max, color }: Props) {
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const colors = COLOR_MAP[color]

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-400">{label}</span>
        <span className={`font-mono font-semibold ${colors.text}`}>
          {current} / {max}
        </span>
      </div>
      <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
