import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to '/mewseum-foundation/' for GitHub Pages deployment.
// Change to '/' for local / custom domain deployments.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three'],
          'r3f-vendor':   ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing', 'postprocessing'],
          'react-vendor':  ['react', 'react-dom'],
        },
      },
    },
  },
})
