/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0a0a0c',
          900: '#0e0e11',
          850: '#121215',
          800: '#17171b',
          750: '#1c1c21',
          700: '#222228',
          600: '#2a2a32',
          500: '#35353f',
        },
        cyber: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        neon: {
          cyan:    '#00d4ff',
          violet:  '#7c3aed',
          purple:  '#a855f7',
          blue:    '#3b82f6',
          green:   '#10b981',
          amber:   '#f59e0b',
          rose:    '#f43f5e',
        },
        metal: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
        },
        // keep compat aliases
        ink: {
          950: '#0a0a0c',
          900: '#0e0e11',
          850: '#121215',
          800: '#17171b',
          700: '#1c1c21',
        },
        accent: {
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        success:  { 500: '#10b981', 400: '#34d399' },
        warning:  { 400: '#fbbf24', 500: '#f59e0b' },
        danger:   { 400: '#f87171', 500: '#ef4444' },
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'glow-cyan':   '0 0 0 1px rgba(0,212,255,0.2), 0 8px 32px -8px rgba(0,212,255,0.25)',
        'glow-violet': '0 0 0 1px rgba(124,58,237,0.3), 0 8px 32px -8px rgba(124,58,237,0.3)',
        'glow-blue':   '0 0 0 1px rgba(59,130,246,0.2), 0 8px 32px -8px rgba(59,130,246,0.25)',
        'card':        '0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px -8px rgba(0,0,0,0.7)',
        'card-hover':  '0 1px 0 rgba(255,255,255,0.06) inset, 0 0 0 1px rgba(255,255,255,0.08), 0 12px 40px -8px rgba(0,0,0,0.8)',
        'sidebar':     '1px 0 0 rgba(255,255,255,0.04)',
        'glow':        '0 0 0 1px rgba(14,165,233,0.25), 0 8px 32px -8px rgba(14,165,233,0.35)',
      },
      backgroundImage: {
        'grid-subtle': "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-in':    'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':    'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':     'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                          to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' },   to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
