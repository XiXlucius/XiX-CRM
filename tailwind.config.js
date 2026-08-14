import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Nocturne — repiel del CRM XiX Tech.
 * Este archivo reasigna los nombres de color/rol que el proyecto ya usa
 * (obsidian, cyber, neon, metal, ink, accent, success, warning, danger,
 * más los "cyan"/"violet" nativos de Tailwind que el código usa en línea)
 * a las rampas de Nocturne. Ningún .tsx necesita tocarse para el cambio
 * de piel base: las clases se quedan igual, solo cambia lo que pintan.
 */

// La escala de espaciado de Tailwind se multiplica por 0.7 — pero SOLO en
// padding, margin, gap y space. width/height quedan en la escala original
// para que iconos y avatares no se deformen (ver README §"Espaciado").
const scaleSpacing = (factor) =>
  Object.fromEntries(
    Object.entries(defaultTheme.spacing).map(([key, value]) => {
      if (value === '1px') return [key, value];
      const num = parseFloat(value);
      const unit = value.replace(String(num), '');
      const scaled = +(num * factor).toFixed(4);
      return [key, `${scaled}${unit}`];
    }),
  );

const spacing07 = scaleSpacing(0.7);

const accent = {
  100: '#f5f4ff',
  200: '#e7e5fe',
  300: '#d2cefd',
  400: '#b5abfc',
  500: '#968ae0',
  600: '#796cbf',
  700: '#5d5294',
  800: '#423a6a',
  900: '#2b2741',
};

const accentFullRamp = {
  50: '#f5f4ff',
  100: '#f5f4ff',
  200: '#e7e5fe',
  300: '#d2cefd',
  400: '#b5abfc',
  500: '#968ae0',
  600: '#796cbf',
  700: '#5d5294',
  800: '#423a6a',
  900: '#2b2741',
  950: '#1c1930',
};

const neutral = {
  100: '#f3f5fe',
  200: '#e4e7f5',
  300: '#cfd3e5',
  400: '#b2b6ca',
  500: '#9397ab',
  600: '#75798c',
  700: '#595d6c',
  800: '#3f424d',
  900: '#292b31',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondos — antes casi negro puro, ahora azul-gris casi neutro.
        obsidian: {
          950: '#161826', // --color-bg
          900: '#161826',
          850: '#1c1e2b',
          800: '#232532', // --color-surface
          750: '#292b31',
          700: '#3f424d',
          600: '#595d6c',
          500: '#75798c',
        },
        ink: {
          950: '#161826',
          900: '#161826',
          850: '#1c1e2b',
          800: '#232532',
          700: '#292b31',
        },
        // Texto y bordes — rampa neutral, de claro a oscuro.
        metal: {
          50:  neutral[100],
          100: neutral[200],
          200: neutral[300],
          300: neutral[400],
          400: neutral[500],
          500: neutral[600],
          600: neutral[700],
          700: neutral[800],
          800: neutral[900],
        },
        // Acento único blurple — usado como línea/resplandor, nunca relleno.
        accent,
        cyber: {
          50:  accent[100],
          100: accent[100],
          200: accent[200],
          300: accent[300],
          400: accent[400],
          500: accent[500],
          600: accent[600],
        },
        // Antes 7 neones distintos; ahora todo converge al acento único
        // (o al semántico correspondiente para verde/ámbar/rojo).
        neon: {
          cyan:   accent[500],
          violet: accent[500],
          purple: accent[500],
          blue:   accent[500],
          green:  '#86b298',
          amber:  '#c9ae7d',
          rose:   '#d09090',
        },
        // Tailwind trae su propio cyan/violet; el código los usa en línea
        // (from-cyan-400, text-violet-500, etc). Los remapeamos al acento
        // para que esas clases sigan funcionando sin editar cada .tsx.
        cyan: accentFullRamp,
        violet: accentFullRamp,
        // Semánticos — se conservan pero desaturados a la misma escala.
        success: { 300: '#a9cdb6', 400: '#86b298', 500: '#6b9880', 600: '#557a67' },
        warning: { 300: '#e0cba3', 400: '#c9ae7d', 500: '#ab9163', 600: '#8a744e' },
        danger:  { 300: '#e8b4b4', 400: '#d09090', 500: '#b47575', 600: '#935e5e' },
        // Tinte neutro que reemplaza el blanco puro (bg-white/5 → bg-tint/5).
        tint: '#e9e9ed',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '4px',
        md: '8px',
        lg: '8px',
        xl: '8px',
        '2xl': '14px',
        '3xl': '14px',
        // full no se toca — Tailwind ya la deja en 9999px.
      },
      boxShadow: {
        // Resplandores reales restaurados. Nocturne los habia reducido a un
        // filo de 1px sin brillo — es lo que hacia que todo se viera apagado.
        'glow-cyan':   '0 0 0 1px rgba(0,212,255,0.35),   0 0 20px -2px rgba(0,212,255,0.45)',
        'glow-violet': '0 0 0 1px rgba(124,58,237,0.4),   0 0 22px -2px rgba(124,58,237,0.5)',
        'glow-blue':   '0 0 0 1px rgba(150,138,224,0.4),  0 0 20px -2px rgba(150,138,224,0.45)',
        'glow':        '0 0 0 1px rgba(150,138,224,0.4),  0 0 18px -2px rgba(150,138,224,0.45)',
        'glow-lg':     '0 0 0 1px rgba(150,138,224,0.5),  0 0 34px -4px rgba(150,138,224,0.6)',
        'card':        '0 0 0 1px #3f424d',
        'card-hover':  '0 0 0 1px #595d6c, 0 6px 18px rgba(0,0,0,0.55)',
        'sidebar':     '1px 0 0 #3f424d',
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
      // Espaciado a densidad 0.7x — solo estas cuatro, width/height intactos.
      padding: spacing07,
      margin: spacing07,
      gap: spacing07,
      space: spacing07,
    },
  },
  plugins: [],
};
