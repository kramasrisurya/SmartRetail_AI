/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bespoke SmartRetail_AI Palette
        carbon: {
          DEFAULT: "#1B2021",
          deep: "#15191A",
          surface: "#222829",
          card: "#232B2C",
          border: "rgba(231, 231, 231, 0.08)",
        },
        alabaster: {
          DEFAULT: "#E7E7E7",
          muted: "rgba(231, 231, 231, 0.65)",
          faint: "rgba(231, 231, 231, 0.4)",
        },
        teal: {
          deep: "#517664",
          light: "#628d78",
          glow: "rgba(81, 118, 100, 0.2)",
        },
        lavender: {
          vintage: "#816E94",
          vivid: "#9D69A3",
          glow: "rgba(157, 105, 163, 0.25)",
        },
        // Semantic Tokens
        background: "#1B2021",
        foreground: "#E7E7E7",
        card: {
          DEFAULT: "#222829",
          foreground: "#E7E7E7",
        },
        primary: {
          DEFAULT: "#517664",
          hover: "#5f8974",
          foreground: "#E7E7E7",
        },
        secondary: {
          DEFAULT: "#816E94",
          hover: "#927da7",
          foreground: "#E7E7E7",
        },
        surface: {
          DEFAULT: "#1B2021",
          elevated: "#222829",
          card: "#232B2C",
        },
        accent: {
          DEFAULT: "#816E94",
          vivid: "#9D69A3",
          foreground: "#E7E7E7",
        },
        alert: {
          DEFAULT: "#9D69A3",
          hover: "#ad75b3",
          foreground: "#E7E7E7",
        },
        "text-main": "#E7E7E7",
        "text-muted": "rgba(231, 231, 231, 0.65)",
        "text-dim": "rgba(231, 231, 231, 0.4)",
        border: "rgba(231, 231, 231, 0.1)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        xl: "12px",
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        glowTeal: "0 0 20px -3px rgba(81, 118, 100, 0.25)",
        glowLavender: "0 0 20px -3px rgba(129, 110, 148, 0.25)",
        glowAlert: "0 0 24px -2px rgba(157, 105, 163, 0.35)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
}
