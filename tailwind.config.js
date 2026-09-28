/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Pixel-style fallback stack
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        sanctuary: {
          amber: '#D4955A',
          dust:  '#C8A882',
          teal:  '#5A8A8A',
          rose:  '#C47A7A',
          dark:  '#1A1410',
          warm:  '#2A1F14',
        },
      },
    },
  },
  plugins: [],
}
