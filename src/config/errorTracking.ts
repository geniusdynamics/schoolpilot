import { logger } from '@/utils/logging';

// ABOUTME: Error tracking configuration for Bugsink integration
// ABOUTME: Configures Sentry SDK to work with self-hosted Bugsink instance

import * as Sentry from '@sentry/react';

import { runtimeBugsinkDsn, runtimeAppVersion } from './runtimeConfig';

// Bugsink DSN - compatible with Sentry SDK
// A deployment sets it at run time (the container writes /config.js); the build-time variable is the
// fallback. No hardcoded value.
const BUGSINK_DSN: string | undefined = runtimeBugsinkDsn(import.meta.env.VITE_BUGSINK_DSN);

// Warn at module load time if the DSN environment variable is not set
if (!BUGSINK_DSN) {
  logger.warn(
    '[Bugsink] No DSN is configured (set /config.js or VITE_BUGSINK_DSN). ' +
    'Error tracking will be disabled.'
  );
}

// Environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Error tracking configuration
export const errorTrackingConfig: Sentry.BrowserOptions = {
  dsn: BUGSINK_DSN,

  // Environment settings
  environment: isDevelopment ? 'development' : 'production',

  // Since Bugsink is self-hosted, we can safely send PII for better debugging
  sendDefaultPii: true,

  // Sample rate for error tracking (100% for self-hosted)
  sampleRate: 1.0,

  // Disable traces as Bugsink doesn't support them
  tracesSampleRate: 0,

  // Suppress verbose debug logging to prevent console flooding
  debug: false,

  // Release information
  release: runtimeAppVersion(import.meta.env.VITE_APP_VERSION),

  // Integration configuration
  integrations: [
    // Basic browser integration for error capture
    Sentry.browserTracingIntegration({
      // Disable tracing since Bugsink doesn't support it
      enableLongTask: false,
      enableInp: false,
    }),
  ],

  // Error filtering
  beforeSend(event, hint) {
    // Filter out development-only errors in production
    if (isProduction) {
      // Skip React DevTools errors
      if (event.exception?.values?.[0]?.value?.includes('React DevTools')) {
        return null;
      }

      // Skip extension-related errors
      if (event.exception?.values?.[0]?.value?.includes('extension')) {
        return null;
      }
    }

    // Log errors in development for debugging
    if (isDevelopment) {
      console.group('🛡 Error captured by Bugsink:');
      logger.error('Error:', hint.originalException || event.exception);
      logger.info('Event:', event);
      console.groupEnd();
    }

    return event;
  },

  // Additional context
  initialScope: {
    tags: {
      component: 'school-management-system',
      platform: 'web',
    },
    contexts: {
      app: {
        name: 'SchoolPilot',
        version: runtimeAppVersion(import.meta.env.VITE_APP_VERSION),
      },
    },
  },
};

// Custom transport that silently handles network errors
const createSilentTransport = (options: any) => {
  const fetchTransport = Sentry.makeFetchTransport(options);
  return {
    send: async (envelope: Parameters<typeof fetchTransport.send>[0]) => {
      try {
        return await fetchTransport.send(envelope);
      } catch (error) {
        // Silently ignore network errors to prevent console flooding
        // when Bugsink endpoint is unreachable
        if (error instanceof TypeError && error.message.includes('fetch')) {
          return { statusCode: 0 };
        }
        throw error;
      }
    },
    flush: (timeout?: number) => fetchTransport.flush(timeout),
  };
};

// Initialize error tracking
export const initializeErrorTracking = (): void => {
  if (!BUGSINK_DSN) {
    logger.warn('⚠️ Bugsink DSN not configured - error tracking disabled');
    return;
  }

  // Check if Bugsink endpoint is reachable (development only)
  if (isDevelopment) {
    const dsnUrl = new URL(BUGSINK_DSN);
    fetch(`${dsnUrl.protocol}//${dsnUrl.host}`, { mode: 'no-cors', cache: 'no-store' })
      .catch(() => {
        logger.warn('⚠️ Bugsink endpoint unreachable - error tracking will fail silently');
      });
  }

  try {
    Sentry.init({
      ...errorTrackingConfig,
      // Use silent transport to prevent console spam on network errors
      transport: createSilentTransport,
      beforeSendTransaction(transaction) {
        // Suppress transaction logging
        return transaction;
      },
    });

    // Set user context if available
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.username,
        });
      } catch {
        // Ignore JSON parse errors
      }
    }

    logger.info('✅ Bugsink error tracking initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize error tracking:', error);
  }
};

// Manual error reporting utilities
export const reportError = (error: Error, context?: Record<string, any>): void => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
};

export const reportMessage = (message: string, level: Sentry.SeverityLevel = 'info'): void => {
  Sentry.captureMessage(message, level);
};

// Performance monitoring (disabled for Bugsink). The name is accepted so call sites keep one shape
// whichever tracker is configured; Bugsink has no transaction to carry it, so it is ignored here.
export const startTransaction = (name: string): null => {
  void name;
  return null;
};

// Export Sentry for direct usage
export { Sentry };
