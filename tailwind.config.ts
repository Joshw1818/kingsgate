import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f172a",
          accent: "#10b981",
        },
        severity: {
          high: "#ef4444",
          medium: "#f59e0b",
          low: "#eab308",
          ok: "#10b981",
        },
        housd: {
          ink: "#0b1d2a",
          navy: "#14304a",
          sand: "#f5efe6",
          cream: "#fbf7f0",
          accent: "#c58a46",
          accentDark: "#a8723a",
          line: "#e5ddd0",
        },
      },
      fontFamily: {
        housd: [
          'ui-serif',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'Times',
          'serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
