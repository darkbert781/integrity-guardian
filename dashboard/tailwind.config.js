/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1B2A',
        surface: '#1B3A5C',
        primary: '#1E6FBF',
        success: '#1A7A4A',
        warning: '#D97706',
        critical: '#C0392B',
        textMain: '#FFFFFF',
        textMuted: '#D0D7DE'
      }
    },
  },
  plugins: [],
}
