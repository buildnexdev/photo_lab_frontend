import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:4000';
    return {
        plugins: [react(), tailwindcss()],
        server: {
            host: '127.0.0.1',
            port: 5173,
            proxy: {
                '/api': { target: apiTarget, changeOrigin: false },
                '/socket.io': { target: apiTarget, ws: true },
            },
        },
        preview: { host: '127.0.0.1', port: 4173 },
        build: {
            sourcemap: false,
            chunkSizeWarningLimit: 900,
            rollupOptions: {
                output: {
                    manualChunks(id: string) {
                        if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
                        if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
                        return undefined;
                    },
                },
            },
        },
        test: {
            environment: 'jsdom',
            include: ['src/**/*.test.{ts,tsx}'],
        },
    };
});
