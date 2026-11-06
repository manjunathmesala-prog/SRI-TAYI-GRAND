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
        hotel: {
          espresso: "#382216",
          chocolate: "#25150F",
          gold: "#D8AD56",
          goldHover: "#C69940",
          goldBorder: "#E5CF9F",
          goldLight: "#F8F3EA",
          ivory: "#F8F1E9",
          beige: "#EFE3D6",
          beigeLight: "#F6EFE7",
          textPrimary: "#241912",
          textSecondary: "#786B61",
          white: "#FFFFFF",
          surface: "#FDFBF7",
          cardBg: "#FFFFFF",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 10px 30px -5px rgba(56, 34, 22, 0.08), 0 4px 6px -2px rgba(56, 34, 22, 0.04)",
        luxuryHover: "0 20px 40px -10px rgba(56, 34, 22, 0.14), 0 8px 12px -4px rgba(56, 34, 22, 0.06)",
        goldGlow: "0 0 25px rgba(216, 173, 86, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
