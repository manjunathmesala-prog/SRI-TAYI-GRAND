import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        anantha: {
          ivory: '#F8F3E9',
          cream: '#F2E8D8',
          gold: '#B18A4A',
          goldDark: '#8D672F',
          brown: '#422B19',
          text: '#33271D',
          textMuted: '#786A5B',
          border: '#E6D9C5',
          footer: '#21180F',
          white: '#FFFFFF',
        },
        tayi: {
          ivory: '#F8F3E9',
          cream: '#F2E8D8',
          gold: '#B18A4A',
          goldDark: '#8D672F',
          brown: '#422B19',
          text: '#33271D',
          textMuted: '#786A5B',
          border: '#E6D9C5',
          footer: '#21180F',
          white: '#FFFFFF',
        },
        hotel: {
          espresso: "#382216",
          chocolate: "#25150F",
          gold: "#8D672F",
          goldHover: "#6D4E21",
          goldBorder: "#E6D9C5",
          goldLight: "#F8F3E9",
          ivory: "#F8F3E9",
          cream: "#F2E8D8",
          beige: "#EFE3D6",
          beigeLight: "#F6EFE7",
          textPrimary: "#33271D",
          textSecondary: "#786A5B",
          white: "#FFFFFF",
          surface: "#FDFBF7",
          cardBg: "#FFFFFF",
          footer: "#21180F",
        },
        gold: {
          50: '#FBF8F2',
          100: '#F5EEDF',
          200: '#EADBBF',
          300: '#D9BE94',
          400: '#C7A266',
          500: '#B18A4A',
          600: '#8D672F',
          700: '#6D4E21',
          800: '#4D3615',
          900: '#32230D',
          DEFAULT: '#8D672F',
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "'Playfair Display'", "Georgia", "serif"],
        display: ["'Playfair Display'", "'Cormorant Garamond'", "serif"],
        cormorant: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'luxury': '0 4px 20px -2px rgba(66, 43, 25, 0.08), 0 2px 6px -1px rgba(66, 43, 25, 0.04)',
        'luxury-lg': '0 12px 32px -4px rgba(66, 43, 25, 0.12), 0 4px 12px -2px rgba(66, 43, 25, 0.06)',
        'luxuryHover': '0 16px 36px -6px rgba(66, 43, 25, 0.12), 0 6px 16px -2px rgba(66, 43, 25, 0.06)',
        'goldGlow': '0 0 25px rgba(177, 138, 74, 0.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'blur-in': {
          from: { opacity: '0', filter: 'blur(10px)', transform: 'scale(0.98)' },
          to: { opacity: '1', filter: 'blur(0)', transform: 'scale(1)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'lotus-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'shimmer-gold': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fade-in-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'blur-in': 'blur-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'lotus-float': 'lotus-float 4s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
