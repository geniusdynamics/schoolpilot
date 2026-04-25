import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Only enable PWA plugin in production mode
    const pwaPlugin = mode === 'production' ? VitePWA({
      registerType: 'prompt',
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
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
                maxAgeSeconds: 60 * 60 * 24 * 365
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
                maxAgeSeconds: 60 * 5
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
      }
    }) : null;
    
    return {
      plugins: [
        react(),
        ...(pwaPlugin ? [pwaPlugin] : []),
        // livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' })
      ],
      server: {
        port: parseInt(env.VITE_PORT || '5200', 10),
        host: env.VITE_HOST || '0.0.0.0',
        strictPort: env.VITE_STRICT_PORT === 'true',
        fs: { strict: false },
        watch: {
          ignored: [
            '**/.git_disabled/**',
            '**/AkademicoNotes/**',
            '**/.git/**',
          ],
        },
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
          input: {
            main: resolve(__dirname, 'index.html')
          },
          output: {
            manualChunks(id) {
              // Vendor chunks - node_modules packages
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'react-vendor';
                }
                if (id.includes('react-router-dom')) {
                  return 'router-vendor';
                }
                if (id.includes('pouchdb')) {
                  return 'pouchdb-vendor';
                }
                if (id.includes('@mui')) {
                  return 'mui-vendor';
                }
                if (id.includes('recharts')) {
                  return 'charts-vendor';
                }
                if (id.includes('@livestore')) {
                  return 'livestore-vendor';
                }
                if (id.includes('framer-motion')) {
                  return 'animation-vendor';
                }
                if (id.includes('lodash')) {
                  return 'lodash-vendor';
                }
                if (id.includes('rxjs')) {
                  return 'rxjs-vendor';
                }
                // Catch-all for remaining node_modules
                return 'vendor';
              }

              // Module-specific chunks for per-module code splitting
              if (id.includes('/modules/academics/')) return 'module-academics';
              if (id.includes('/modules/administration/')) return 'module-administration';
              if (id.includes('/modules/admissions/')) return 'module-admissions';
              if (id.includes('/modules/audit/')) return 'module-audit';
              if (id.includes('/modules/dashboard/')) return 'module-dashboard';
              if (id.includes('/modules/finance/')) return 'module-finance';
              if (id.includes('/modules/hr/')) return 'module-hr';
              if (id.includes('/modules/inventory/')) return 'module-inventory';
              if (id.includes('/modules/library/')) return 'module-library';
              if (id.includes('/modules/nutrition/')) return 'module-nutrition';
              if (id.includes('/modules/portal/')) return 'module-portal';
              if (id.includes('/modules/reports/')) return 'module-reports';
              if (id.includes('/modules/settings/')) return 'module-settings';

              // Shared application chunks
              if (id.includes('/components/ui/')) return 'ui-components';
              if (id.includes('/hooks/data/')) return 'data-hooks';
              if (id.includes('/contexts/data/')) return 'data-contexts';
              if (id.includes('/services/database/')) return 'database-services';
              if (id.includes('/services/sync/')) return 'sync-services';
              if (id.includes('/core/')) return 'core';
              if (id.includes('/routing/')) return 'routing';
            }
          }
        },
        chunkSizeWarningLimit: 1000
      },
      worker: { format: 'es' },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          'rxjs',
          'pouchdb',
          'pouchdb-browser',
          'pouchdb-find',
          'semver',
        ],
        exclude: ['@sqlite.org/sqlite-wasm']
      }
    };
});
