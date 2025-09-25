/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2BB3FF',
          green: '#2ECC71',
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
}


