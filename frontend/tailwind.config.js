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
        success: '#22C55E', // Calm Green
        warning: '#F59E0B', // Amber
        danger: '#DC2626', // Crimson
        // Map the light theme onto the existing dark/brand class names
        dark: {
          950: '#F6F3ED', // Background
          900: '#FFFFFF', // Card Background
          850: '#FDFCFB', // Alternate Detail Background
          800: '#E2E8F0', // Border
          700: '#CBD5E1'  // Darker Border
        },
        brand: {
          400: '#A78BFA', // Violet 400
          500: '#7C3AED', // Violet 600 (Primary)
          600: '#7C3AED', // Violet 600 (Primary)
          700: '#6D28D9', // Violet 700
        },
        gray: {
          50: '#F8FAFC',
          100: '#0F172A', // Map main text
          200: '#1E293B', // Map secondary text
          300: '#334155', // Map subtext
          400: '#6B7280', // Map muted text
          500: '#6B7280',
          600: '#475569',
          700: '#334155',
          800: '#E2E8F0', // Border color
          900: '#FFFFFF', // Card background
        }
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #F6F3ED, #F6F3ED)'
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
