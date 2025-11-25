'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data is considered fresh for 5 minutes
            staleTime: 1000 * 60 * 5,
            // Cache time: data stays in cache for 10 minutes after being unused
            gcTime: 1000 * 60 * 10,
            // Retry failed requests 2 times
            retry: 2,
            // Refetch on window focus (optional, can disable if needed)
            refetchOnWindowFocus: false,
            // Refetch on reconnect
            refetchOnReconnect: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

