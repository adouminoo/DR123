/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554'
        },
        clinic: {
          ink: '#0f172a',
          mist: '#f8fafc',
          line: '#dbe3ef',
          teal: '#0f766e',
          cyan: '#0891b2'
        }
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 23, 42, 0.08)',
        lift: '0 18px 40px rgba(15, 23, 42, 0.14)'
      }
    }
  },
  plugins: []
};
