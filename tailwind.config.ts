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
      },
    },
  },
  plugins: [],
};

export default config;
