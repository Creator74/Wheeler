/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: { DEFAULT: '#F4640A', 500: '#F4640A' },
        surface: '#1A1A1A',
        cream: '#F5F0E8',
        danger: '#E63946',
        safe: '#2DC653',
      },
      fontFamily: {
        heading: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
