/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4a6741',      // olive green
        'primary-dark': '#3d5a2e',
        'primary-light': '#6b8f5e',
        cream: '#f5f0e8',
        'cream-dark': '#ede8dc',
        'sidebar-bg': '#f0ebe0',
        secondary: '#8b7355',    // warm brown
        accent: '#c8a96e',       // gold/amber
        success: '#4a6741',
        warning: '#e8a838',
        danger: '#c0392b',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.07)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
