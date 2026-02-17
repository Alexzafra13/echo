// Polyfills antes de cualquier otro código
import './polyfills/crypto.polyfill';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@shared/contexts';
import { PlayerProvider } from '@features/player';
import App from './app/App';
import '@shared/styles/global.css';

// Caché agresivo: la biblioteca musical cambia poco
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
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
