import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider, type DataRouter } from 'react-router';
import { createQueryClient } from '@/lib/queryClient';

export function App({ router }: { router: DataRouter }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
