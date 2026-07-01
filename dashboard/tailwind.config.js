/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Keep capability, but we will mostly use light defaults
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──────────────────────────────────────────
        background:       '#F7F9F8', // App canvas
        surface:          '#FFFFFF', // Cards, panels
        surfaceHighlight: '#EEF2F0', // Subtle hover tint
        sidebar:          '#0F1B1A', // Dark sidebar

        // ── Brand ────────────────────────────────────────────────
        primary:     '#14B891', // Brand teal – active states, charts
        primaryDark: '#0E7C66', // Brand teal dark – active nav bg

        // ── Semantic ─────────────────────────────────────────────
        critical:   '#DC2626', // Critical alert
        criticalBg: '#FDECEC', // Critical chip bg
        warning:    '#D97706', // Warning alert
        warningBg:  '#FDF3E2', // Warning chip bg
        info:       '#0284C7', // Info/neutral
        infoBg:     '#E6F2FA', // Info chip bg
        success:    '#14B891', // Success / healthy (same as brand teal)
        successBg:  '#E5F7F1', // Success chip bg
        secondary:  '#0284C7', // Alias → info blue

        // ── Typography ───────────────────────────────────────────
        textMain:    '#101816', // Headings, values
        textMuted:   '#667370', // Labels, subtext
        sidebarText: '#9FB3AE', // Inactive sidebar nav items

        // ── Borders ──────────────────────────────────────────────
        border:          '#E6EBE9',
        borderHighlight: '#E6EBE9',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Courier New', 'monospace'],
      },
      boxShadow: {
        // Replace glow shadows with subtle realistic elevation shadows
        'glow-primary': '0 4px 14px 0 rgba(13, 148, 136, 0.2)',
        'glow-critical': '0 4px 14px 0 rgba(239, 68, 68, 0.2)',
        'glow-warning': '0 4px 14px 0 rgba(245, 158, 11, 0.2)',
        'glow-success': '0 4px 14px 0 rgba(16, 185, 129, 0.2)',
        'glass': '0 4px 20px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
