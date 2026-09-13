// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF6B00",
          50: "#FFF3EB",
          100: "#FFE6D5",
          200: "#FFCCAA",
          300: "#FFB380",
          400: "#FF9955",
          500: "#FF6B00",
          600: "#E66000",
          700: "#CC5500",
          800: "#B34A00",
          900: "#993F00",
          950: "#802F00",
        },
        dark: {
          DEFAULT: "#000000",
          50: "#F2F2F2",
          100: "#E6E6E6",
          200: "#CCCCCC",
          300: "#B3B3B3",
          400: "#999999",
          500: "#808080",
          600: "#666666",
          700: "#4D4D4D",
          800: "#333333",
          900: "#1A1A1A",
          950: "#0D0D0D",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
