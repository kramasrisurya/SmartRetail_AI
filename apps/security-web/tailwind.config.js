/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A1628",
          dark: "#060D18",
          light: "#16253D",
          50: "#F0F4F8",
          100: "#D9E2EC",
          200: "#BCCCDC",
          700: "#1E3048",
          800: "#0F1E33",
          900: "#0A1628",
        },
        secondary: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          light: "#3B82F6",
          dark: "#1E40AF",
        },
        accent: {
          DEFAULT: "#F59E0B",
          hover: "#D97706",
          light: "#FBBF24",
        },
        success: {
          DEFAULT: "#10B981",
          hover: "#059669",
        },
        navy: {
          950: "#050B14",
          900: "#0A1628",
          850: "#0E1C33",
          800: "#13233F",
          750: "#192D4E",
          700: "#1E365E",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--font-sora)", "var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(10, 22, 40, 0.08)',
        'card-hover': '0 12px 30px -4px rgba(10, 22, 40, 0.16)',
        'glow-blue': '0 0 25px rgba(37, 99, 235, 0.35)',
        'glow-amber': '0 0 25px rgba(245, 158, 11, 0.35)',
        'header': '0 4px 20px 0 rgba(0, 0, 0, 0.06)',
      },
      maxWidth: {
        'container': '1280px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        }
      }
    },
  },
  plugins: [],
};
