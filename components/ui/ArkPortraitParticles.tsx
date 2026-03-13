export function ArkPortraitParticles() {
  return (
    <div className="absolute inset-0 overflow-visible pointer-events-none -m-4">
      {/* Losango top-left */}
      <div
        className="absolute top-2 left-2 w-1.5 h-1.5 opacity-60 animate-rune-pulse"
        style={{
          background: 'rgba(211,165,57,0.5)',
          transform: 'rotate(45deg)',
          animationDelay: '0s',
        }}
      />
      {/* Ponto top-right */}
      <div
        className="absolute top-4 right-2 w-1 h-1 rounded-full opacity-50 animate-float-idle"
        style={{
          background: '#d3a539',
          animationDelay: '0.5s',
        }}
      />
      {/* Losango mid-left */}
      <div
        className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-1 opacity-70 animate-rune-pulse"
        style={{
          background: 'rgba(211,165,57,0.6)',
          transform: 'rotate(45deg)',
          animationDelay: '1s',
        }}
      />
      {/* Losango mid-right */}
      <div
        className="absolute top-1/2 -translate-y-1/2 right-0 w-1.5 h-1.5 opacity-50 animate-float-idle"
        style={{
          background: 'rgba(211,165,57,0.5)',
          transform: 'rotate(45deg)',
          animationDelay: '1.5s',
        }}
      />
      {/* Ponto bottom-left */}
      <div
        className="absolute bottom-4 left-3 w-1 h-1 rounded-full opacity-60 animate-rune-pulse"
        style={{
          background: '#d3a539',
          animationDelay: '0.8s',
        }}
      />
      {/* Losango bottom-right */}
      <div
        className="absolute bottom-2 right-4 w-1.5 h-1.5 opacity-55 animate-float-idle"
        style={{
          background: 'rgba(211,165,57,0.55)',
          transform: 'rotate(45deg)',
          animationDelay: '0.3s',
        }}
      />
    </div>
  )
}
