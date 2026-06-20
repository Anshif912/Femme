/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED', // Deep Violet
        secondary: '#9333EA', // Royal Purple
        accent: '#EC4899', // Soft Rose Pink
        success: '#10B981', // Emerald
        warning: '#F59E0B', // Amber
        danger: '#DC2626' // Crimson
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0F0B1A, #1A0F2B)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
      }
    }
  },
  plugins: []
};
