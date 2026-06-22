/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gymBg: '#faf7f6',            // Warm light bg
        gymCard: '#ffffff',          // White for panels/cards
        gymCardHover: '#f5f0ee',     // Warm hover bg
        gymBorder: '#e0d3cf',        // Warm border
        gymPrimary: '#8B1A1A',       // Brand bordeaux (from logo)
        gymPrimaryHover: '#6B1414',  // Darker bordeaux hover
        gymPrimaryLight: '#FDE8E4',  // Light pink bg tint
        gymAccent: '#D4442A',        // Red-orange accent (from logo)
        gymAccentHover: '#B83820',   // Darker accent hover
        gymCoral: '#F07050',         // Coral for badges/notifications
      }
    },
  },
  plugins: [],
}
