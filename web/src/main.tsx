// Import polyfills first to ensure they're loaded before any other code
import './polyfills/crypto.polyfill';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@shared/contexts';
import { PlayerProvider } from '@features/player';
import App from './app/App';
import '@shared/styles/global.css';

// Create React Query client optimized for self-hosted music server
// Music library data changes infrequently, so aggressive caching reduces server load
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache longer (library changes rarely)
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false, // Use cached data if fresh (reduces unnecessary requests)
      refetchOnReconnect: false, // Library doesn't change during brief disconnects
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
