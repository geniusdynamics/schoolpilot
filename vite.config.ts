import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [
        react(),
        VitePWA({
          registerType: 'prompt',
          workbox: {
            // Keep precaching enabled for build assets while allowing larger JS chunks.
            // Default Workbox cap is 2 MiB, which can fail production builds.
            maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /\/api\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 5 // 5 minutes
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          manifest: {
            name: 'SchoolPilot3',
            short_name: 'SchoolPilot',
            description: 'Complete school management system',
            theme_color: '#4f46e5',
            background_color: '#ffffff',
            display: 'standalone',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          },
          devOptions: {
            enabled: mode === 'development'
          }
        }),
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
