/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#6D23B4',
          darkblue: '#005BE2',
          blue: '#007DF4',
          lightblue: '#0098EA',
          teal: '#00ADCD',
          green: '#00BFA6',
        }
      }
    },
  },
  plugins: [],
}
