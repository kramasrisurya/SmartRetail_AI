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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--card))",
          elevated: "hsl(var(--surface-elevated))",
        },
        text: {
          primary: "hsl(var(--foreground))",
          secondary: "hsl(var(--muted-foreground))",
          tertiary: "hsl(var(--text-tertiary))",
        },
        status: {
          ok: "hsl(var(--success))",
          warning: "hsl(var(--warning))",
          critical: "hsl(var(--destructive))",
          info: "hsl(var(--info))",
        }
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "10px",
        md: "8px",
        sm: "6px",
        card: "10px",
        button: "8px",
        badge: "6px",
        input: "8px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
        card: "0 1px 2px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.08)",
        popover: "0 8px 24px rgba(0, 0, 0, 0.12)",
        modal: "0 16px 36px rgba(0, 0, 0, 0.16)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
}
