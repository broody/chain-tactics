/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blueprint: {
          blue: "#003366",
          dark: "#001a33",
          line: "#ffffff",
          grid: "rgba(255, 255, 255, 0.15)",
        },
      },
      fontFamily: {
        mono: ["'Roboto Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}
