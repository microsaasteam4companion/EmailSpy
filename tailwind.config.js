/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#ffffff",
        primary: "#3b82f6",
        secondary: "#111827",
        accent: "#22d3ee",
      },
    },
  },
  plugins: [],
}
