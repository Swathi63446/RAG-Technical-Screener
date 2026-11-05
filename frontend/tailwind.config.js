/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          50:  "#f0f0ff",
          100: "#e0e0ff",
          800: "#1a1a2e",
          850: "#16213e",
          900: "#0f0f1a",
          950: "#080810",
        },
        accent: {
          purple: "#8b5cf6",
          blue:   "#3b82f6",
          cyan:   "#06b6d4",
          pink:   "#ec4899",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass": "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float":      "float 3s ease-in-out infinite",
        "glow":       "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        glow: {
          from: { boxShadow: "0 0 10px rgba(139, 92, 246, 0.3)" },
          to:   { boxShadow: "0 0 30px rgba(139, 92, 246, 0.7)" },
        },
      },
    },
  },
  plugins: [],
};
