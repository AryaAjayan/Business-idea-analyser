/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--bg-color)",
        panel: "var(--panel-bg)",
        theme: "var(--border-color)",
        main: "var(--text-main)",
        muted: "var(--text-muted)",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        display: ["var(--font-space-grotesk)"],
      },
    },
  },
  plugins: [],
};
