import type { Config } from "tailwindcss";

// MarshalHQ design tokens — "the production office, not the job board".
// The app shares its palette with the public landing page (see the
// .mhq-public-home variables in globals.css): warm paper surfaces, hairline
// rules, navy for interactive elements, gold reserved for attention cues and
// the contact-release moment. Status colours live here as *-soft/-DEFAULT
// pairs so badges and alerts never hardcode hex values in markup.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1c1915",
          muted: "#57503f",
          soft: "#8a8270",
        },
        surface: {
          DEFAULT: "#ffffff",
          page: "#f5f2ea",
          subtle: "#f6f2e7",
          sunken: "#ece6d8",
        },
        line: {
          DEFAULT: "#dcd4c0",
          strong: "#c2b9a4",
        },
        accent: {
          DEFAULT: "#1f3b5a",
          soft: "#e9edf2",
        },
        gold: {
          DEFAULT: "#c8881f",
          soft: "#f3e7cd",
          ink: "#7c5714",
        },
        ok: { DEFAULT: "#1a7f5a", soft: "#e5efe4" },
        warn: { DEFAULT: "#a15c00", soft: "#f6ecd9" },
        danger: { DEFAULT: "#a1302b", soft: "#f6e7e4" },
        brand: {
          navy: "#06142E",
          gold: "#F5A400",
          forest: "#1F7A3A",
          cream: "#FAFAF7",
          hairline: "#E6E8EC",
          mute: "#5F6673",
        },
      },
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
        serif: ["Newsreader", "Georgia", "serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
