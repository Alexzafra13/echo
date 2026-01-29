// Import polyfills first to ensure they're loaded before any other code
import './polyfills/crypto.polyfill';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@shared/contexts';
import { PlayerProvider } from '@features/player';
import App from './app/App';
import '@shared/styles/global.css';

// Create React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 15, // 15 minutes - keep unused data in cache longer
      retry: 1,
      refetchOnWindowFocus: false,
      // Reduce unnecessary network requests
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
