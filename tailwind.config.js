/** @type {import('tailwindcss').Config} */
export default {
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
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#64748b',
          600: '#475569',
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
      },
      keyframes: {
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
