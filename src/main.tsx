import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { ToastProvider } from './components/toast';
import './index.css';
import { ApiError } from './lib/api';
import { AuthProvider } from './lib/auth';
import { router } from './routes';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
        },
    },
    mutationCache: new MutationCache(),
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <RouterProvider router={router} />
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>
    </StrictMode>,
);
