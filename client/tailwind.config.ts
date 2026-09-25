import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#07090E',
          surface: '#0D111A',
          tertiary: '#151B28',
          card: 'rgba(21, 27, 40, 0.65)',
          'card-hover': 'rgba(28, 36, 53, 0.85)',
          glass: 'rgba(13, 17, 26, 0.78)',
        },
        brand: {
          primary: '#6366F1',
          hover: '#4F46E5',
          neon: '#818CF8',
          glow: 'rgba(99, 102, 241, 0.28)',
        },
        status: {
          success: '#10B981',
          'success-glow': 'rgba(16, 185, 129, 0.28)',
          warning: '#F59E0B',
          'warning-glow': 'rgba(245, 158, 11, 0.28)',
          danger: '#EF4444',
          'danger-glow': 'rgba(239, 68, 68, 0.28)',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          medium: 'rgba(255, 255, 255, 0.14)',
          hover: 'rgba(255, 255, 255, 0.22)',
          focus: 'rgba(99, 102, 241, 0.6)',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        'neon-brand': '0 0 24px rgba(99, 102, 241, 0.28)',
        'neon-success': '0 0 24px rgba(16, 185, 129, 0.28)',
        'neon-danger': '0 0 24px rgba(239, 68, 68, 0.28)',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config
