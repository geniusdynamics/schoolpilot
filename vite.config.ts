import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
// import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [
        react(),
        // livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' })
      ],
      server: {
        port: 5200,
        host: true,
        fs: { strict: false },
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        },
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, './src')
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        global: 'globalThis'
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'router-vendor': ['react-router-dom'],
              'pouchdb-vendor': ['pouchdb', 'pouchdb-find']
            }
          }
        },
        chunkSizeWarningLimit: 1000
      },
      worker: { format: 'es' },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'rxjs', 'rxdb', 'pouchdb', 'pouchdb-find'],
        exclude: ['@sqlite.org/sqlite-wasm']
      }
    };
});
