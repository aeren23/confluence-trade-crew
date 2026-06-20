import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    // Proxy API calls to the .NET backend during local development
    // (avoids CORS issues when running frontend with `npm run dev`)
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 3000,
    // Required for SPA routing — serve index.html for all unknown paths
    historyApiFallback: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    // RollupOptions removed for Vite 8 compatibility
  },
})
