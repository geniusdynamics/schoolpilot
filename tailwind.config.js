/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Semantic surface tokens backed by CSS custom properties so components
        // follow the active theme (light/dark) without dark: variant clutter.
        surface: {
          DEFAULT: 'var(--color-card)',
          background: 'var(--color-background)',
          foreground: 'var(--color-foreground)',
          card: 'var(--color-card)',
          popover: 'var(--color-popover)',
          muted: 'var(--color-muted)',
          'muted-fg': 'var(--color-muted-foreground)',
          accent: 'var(--color-accent)',
          border: 'var(--color-border)',
          input: 'var(--color-input)',
          'input-hover': 'var(--color-input-hover)',
          ring: 'var(--color-ring)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-delay': 'fadeIn 0.5s ease-out 0.1s both',
        'fade-in-delay-2': 'fadeIn 0.5s ease-out 0.2s both',
        'fade-in-delay-3': 'fadeIn 0.5s ease-out 0.3s both',
        'fade-in-delay-4': 'fadeIn 0.5s ease-out 0.4s both',
        'slide-in-left': 'slideInLeft 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'staggered': 'staggered 0.5s ease-out both',
        'modal-in': 'modalIn 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'backdrop-in': 'fadeIn 160ms ease-out both',
      },
      keyframes: {
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        staggered: {
          '0%': { 
            opacity: '0', 
            transform: 'translateX(-20px)',
            animationDelay: 'calc(var(--item-index) * 0.05s)'
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateX(0)',
            animationDelay: 'calc(var(--item-index) * 0.05s)'
          },
        },
      },
      transitionDuration: {
        '500': '500ms',
      },
      transitionTimingFunction: {
        'bounce-subtle': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
