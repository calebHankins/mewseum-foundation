import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mewseum-foundation/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
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
