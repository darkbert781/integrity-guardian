/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8f9fa',
        surface: '#ffffff',
        sidebar: '#232f3e',
        primary: '#0052cc',
        success: '#0a6640',
        warning: '#d97706',
        critical: '#d12223',
        textMain: '#0f172a',
        textMuted: '#64748b',
        border: '#e2e8f0'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
