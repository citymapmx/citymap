'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GlobalAuthInit from '../components/GlobalAuthInit';

/**
 * Global client-side providers for the Next.js unified app.
 * Add new providers here as the migration progresses.
 */
export function Providers({ children }) {
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
