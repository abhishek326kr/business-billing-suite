import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0f2460",
        accent: "#17388f",
        surface: "#f6f8fc",
        border: "#d8e0f1"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(15, 36, 96, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
