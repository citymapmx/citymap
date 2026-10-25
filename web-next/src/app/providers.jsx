'use client';

import { useEffect, useState } from 'react';
import { initializeTheme } from '../lib/theme.js';
import { useUIStore } from '../store/useUIStore.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GlobalAuthInit from '../components/GlobalAuthInit';

/**
 * Global client-side providers for the Next.js unified app.
 * Add new providers here as the migration progresses.
 */
export function Providers({ children }) {
  useEffect(() => initializeTheme(useUIStore), []);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalAuthInit />
      {children}
    </QueryClientProvider>
  );
}
