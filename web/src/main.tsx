// Import polyfills first to ensure they're loaded before any other code
import './polyfills/crypto.polyfill';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@shared/contexts';
import { PlayerProvider } from '@features/player';
import App from './app/App';
import '@shared/styles/global.css';

// Create React Query client with optimized settings for better loading UX
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'response' in error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
        }
        // Retry once for network/server errors
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      // Don't throw errors - let components handle loading states gracefully
      throwOnError: false,
      // Network mode: always try to fetch, even if offline (will use cache)
      networkMode: 'offlineFirst',
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
