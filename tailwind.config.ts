import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'ark-bg': {
          void:      'var(--color-bg-void)',
          primary:   'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary:  'var(--color-bg-tertiary)',
          overlay:   'var(--color-bg-overlay)',
        },
        // Gold / Bronze accent
        gold: {
          pure:   'var(--color-gold-pure)',
          bright: 'var(--color-gold-bright)',
          mid:    'var(--color-gold-mid)',
          dim:    'var(--color-gold-dim)',
          ghost:  'var(--color-gold-ghost)',
        },
        // Crimson accent
        crimson: {
          bright: 'var(--color-crimson-bright)',
          mid:    'var(--color-crimson-mid)',
          dark:   'var(--color-crimson-dark)',
        },
        // Text
        'ark-text': {
          hero:      'var(--color-text-hero)',
          primary:   'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          label:     'var(--color-text-label)',
          muted:     'var(--color-text-muted)',
          ghost:     'var(--color-text-ghost)',
          disabled:  'var(--color-text-disabled)',
          gold:      'var(--color-text-gold)',
          'gold-soft':'var(--color-text-gold-soft)',
        },
        // Status
        status: {
          alive:   'var(--color-status-alive)',
          injured: 'var(--color-status-injured)',
          dead:    'var(--color-status-dead)',
        },
        // Attribute colors
        attr: {
          ataque:     'var(--color-attr-ataque)',
          magia:      'var(--color-attr-magia)',
          eter:       'var(--color-attr-eter)',
          defesa:     'var(--color-attr-defesa)',
          vitalidade: 'var(--color-attr-vitalidade)',
          velocidade: 'var(--color-attr-velocidade)',
          precisao:   'var(--color-attr-precisao)',
          tenacidade: 'var(--color-attr-tenacidade)',
          capitania:  'var(--color-attr-capitania)',
          moral:      'var(--color-attr-moral)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)',    'serif'],
        data:    ['var(--font-data)',    'sans-serif'],
      },
      boxShadow: {
        'glow-gold':    '0 0 20px rgba(200,134,10,0.35), 0 0 50px rgba(200,134,10,0.12)',
        'glow-crimson': '0 0 20px rgba(232,64,64,0.35), 0 0 50px rgba(232,64,64,0.12)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%':      { opacity: '1' },
        },
        'float-idle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'bar-reveal': {
          from: { width: '0' },
          to:   { width: 'var(--bar-target)' },
        },
      },
      animation: {
        shimmer:      'shimmer-sweep 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'float-idle': 'float-idle 5s ease-in-out infinite',
        'bar-reveal': 'bar-reveal 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
export default config;
