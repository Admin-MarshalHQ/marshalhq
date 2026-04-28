import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#111418",
          muted: "#4b5563",
          soft: "#6b7280",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f6f7f9",
          sunken: "#eceef2",
        },
        line: "#e2e4ea",
        accent: "#1f3b5a",
        ok: "#1a7f5a",
        warn: "#a15c00",
        danger: "#a1302b",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
