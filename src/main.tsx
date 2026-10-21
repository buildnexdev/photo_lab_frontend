// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ToastProvider } from './components/ui/Toast';
import './index.css';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { ApiError } from './services/api';
import { store } from './store';

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
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </ToastProvider>
            </QueryClientProvider>
        </Provider>
    </StrictMode>,
);
