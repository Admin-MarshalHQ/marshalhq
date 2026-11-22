import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0F172A", muted: "#475569", soft: "#526176" },
        surface: {
          DEFAULT: "#FFFFFF",
          page: "#FFF7F2",
          subtle: "#FCFAF8",
          sunken: "#F8F6F4",
        },
        line: { DEFAULT: "#E7E3E0", strong: "#D7D2CE", control: "#8B7C75" },
        coral: { DEFAULT: "#FF6B5F", action: "#B74136", ink: "#9F342B", soft: "#FFF0EA" },
        accent: { DEFAULT: "#3730A3", soft: "#EEF2FF" },
        booked: { DEFAULT: "#1E40AF", soft: "#DBEAFE" },
        neutral: { DEFAULT: "#475569", soft: "#F1F5F9" },
        gold: { DEFAULT: "#92400E", soft: "#FEF3C7", ink: "#92400E" },
        ok: { DEFAULT: "#166534", soft: "#D1FAE5" },
        warn: { DEFAULT: "#92400E", soft: "#FEF3C7" },
        danger: { DEFAULT: "#991B1B", soft: "#FEE2E2" },
        brand: {
          navy: "#0F172A",
          gold: "#B74136",
          forest: "#166534",
          cream: "#FFF7F2",
          hairline: "#E7E3E0",
          mute: "#64748B",
        },
      },
      borderRadius: { md: "12px", lg: "16px" },
      boxShadow: {
        card: "0 2px 8px rgb(15 23 42 / 0.05)",
        panel: "0 8px 24px rgb(15 23 42 / 0.07)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "Helvetica", "sans-serif"],
        serif: ["var(--font-inter)", "Arial", "Helvetica", "sans-serif"],
        editorial: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-inter)", "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
