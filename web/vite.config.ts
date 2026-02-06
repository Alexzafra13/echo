import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/**/*', 'fonts/**/*'],
      workbox: {
        // Immediately activate new service worker
        skipWaiting: true,
        clientsClaim: true,
        // Cache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Fallback to index.html for SPA navigation
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Runtime caching for API calls and images
        runtimeCaching: [
          {
            // Cache album covers and artist images
            urlPattern: /^.*\/api\/(images|albums\/.*\/cover)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Network first for API data (always fresh when online)
            // Exclude SSE streams and audio streaming endpoints
            urlPattern: /^.*\/api\/(?!.*\/stream)(?!.*\/radio\/)(?!tracks\/.*\/audio).*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Google Fonts are NOT cached by Workbox - the browser handles
          // font caching natively via HTTP cache headers, avoiding CORS issues
        ],
      },
      // Don't generate manifest - we already have one
      manifest: false,
    }),
  ],
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
        // Intelligent chunk splitting based on package boundaries
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Group React-related packages
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Group React Query
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            // Group utility libraries
            if (id.includes('axios') || id.includes('zustand') || id.includes('zod') || id.includes('clsx')) {
              return 'vendor-utils';
            }
            // Group icons (lucide-react is large)
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Group charts library
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-charts';
            }
          }
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Report chunk sizes
    chunkSizeWarningLimit: 500,
    // CSS code splitting for better performance
    cssCodeSplit: true,
    // Reduce bundle size by not including polyfills for very old browsers
    modulePreload: {
      polyfill: false,
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', 'axios', 'zustand'],
  },
});
