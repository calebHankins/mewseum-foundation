import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mewseum-foundation/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three-vendor', test: /node_modules[\\/]three(?:[\\/]|$)/ },
            { name: 'r3f-vendor', test: /node_modules[\\/](@react-three[\\/](?:fiber|drei|postprocessing)|postprocessing)(?:[\\/]|$)/ },
            { name: 'react-vendor', test: /node_modules[\\/](?:react|react-dom)(?:[\\/]|$)/ },
          ],
        },
      },
    },
  },
})
