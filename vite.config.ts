import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isCapacitor = process.env.CAPACITOR_BUILD === 'true' || mode === 'production';

  const manualChunks = (id: string): string | undefined => {
    if (!id.includes('node_modules')) return undefined;

    if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
    if (id.includes('/motion/')) return 'vendor-motion';
    if (id.includes('/socket.io-client/') || id.includes('/engine.io-client/')) return 'vendor-socket';
    if (id.includes('/@google/genai/')) return 'vendor-ai';
    if (id.includes('/react-hook-form/') || id.includes('/@hookform/')) return 'vendor-forms';
    if (id.includes('/axios/')) return 'vendor-http';

    return undefined;
  };

  return {
    plugins: [react(), tailwindcss()],
    // Capacitor requires relative paths for assets (no leading /)
    base: isCapacitor ? './' : '/',
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: [
        'localhost',
        'peter-adel.taila6a2b4.ts.net',
        '.ngrok-free.dev',
      ],
      proxy: {
        '/api': {
          target: 'https://peter-adel.taila6a2b4.ts.net',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'https://peter-adel.taila6a2b4.ts.net',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
