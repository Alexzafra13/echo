import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Note: WebSocket connections go directly to backend (http://localhost:3000)
      // via websocket.service.ts to avoid Vite proxy issues with Socket.IO
    },
  },
  build: {
    // Enable source maps for production debugging (optional)
    sourcemap: false,
    // Minify with esbuild (faster) or terser (smaller)
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-utils': ['axios', 'zustand', 'zod', 'clsx'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Report chunk sizes
    chunkSizeWarningLimit: 500,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', 'axios', 'zustand'],
  },
});
