/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 24px 80px rgba(15, 23, 42, 0.18)",
      },
      colors: {
        ink: {
          50: "#eef2ff",
          100: "#dbe4ff",
          200: "#b9c9ff",
          300: "#90a9ff",
          400: "#6484ff",
          500: "#3f63ff",
          600: "#2f4ae4",
          700: "#273cb8",
          800: "#1f2f8a",
          900: "#18235e",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};