/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: {
        '2xl': '1320px',
      },
    },
    extend: {
      screens: {
        xs: '420px',
        '3xl': '1800px',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        /* ---- Console tokens ---- */
        chassis: 'hsl(var(--background))',
        panel: 'hsl(var(--card))',
        well: 'hsl(var(--well))',
        ink: 'hsl(var(--foreground))',
        paper: 'hsl(var(--background))',
        signal: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        live: {
          DEFAULT: 'hsl(var(--live))',
          foreground: 'hsl(var(--live-foreground))',
        },
        lcd: {
          DEFAULT: 'hsl(var(--lcd))',
          foreground: 'hsl(var(--lcd-foreground))',
          dim: 'hsl(var(--lcd-dim))',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 7px)',
      },
      fontFamily: {
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        dot: ['Doto', '"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        key: 'var(--shadow-key)',
        'key-pressed': 'var(--shadow-key-pressed)',
        panel: 'var(--shadow-panel)',
        well: 'var(--shadow-well)',
        lift: 'var(--shadow-lift)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'data-flow': {
          '0%': { left: '0%', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        'wave-bar': {
          '0%, 100%': { height: '20%' },
          '50%': { height: '100%' },
        },
        'speaking-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--live) / 0.45)' },
          '50%': { boxShadow: '0 0 0 6px hsl(var(--live) / 0)' },
        },
        'led-blink': {
          '0%, 60%': { opacity: '1' },
          '61%, 100%': { opacity: '0.25' },
        },
        'led-breathe': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'lcd-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'needle-sweep': {
          '0%, 100%': { transform: 'rotate(-28deg)' },
          '50%': { transform: 'rotate(18deg)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s infinite',
        'data-flow': 'data-flow 2s ease-in-out infinite',
        'wave-1': 'wave-bar 0.8s ease-in-out infinite',
        'wave-2': 'wave-bar 0.8s ease-in-out 0.2s infinite',
        'wave-3': 'wave-bar 0.8s ease-in-out 0.4s infinite',
        'speaking-glow': 'speaking-glow 1.6s ease-out infinite',
        'led-blink': 'led-blink 1.2s steps(1, end) infinite',
        'led-breathe': 'led-breathe 2.4s ease-in-out infinite',
        'lcd-scroll': 'lcd-scroll 18s linear infinite',
        'needle-sweep': 'needle-sweep 3.2s ease-in-out infinite',
        'rise-in': 'rise-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
