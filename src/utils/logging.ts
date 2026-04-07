// ABOUTME: Logging utilities for debugging and development
// ABOUTME: Provides consistent logging interface across the application

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const resolveLogLevel = (): LogLevel => {
  const configuredLevel = import.meta.env?.VITE_LOG_LEVEL as LogLevel | undefined;
  if (configuredLevel && ['debug', 'info', 'warn', 'error', 'none'].includes(configuredLevel)) {
    return configuredLevel;
  }
  return import.meta.env?.DEV ? 'debug' : 'warn';
};

const currentLogLevel = resolveLogLevel();
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

const shouldLog = (targetLevel: LogLevel): boolean =>
  levelPriority[targetLevel] >= levelPriority[currentLogLevel];

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) console.log('[DEBUG]', ...args);
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) console.error('[ERROR]', ...args);
  },
  group: (label: string): void => {
    if (shouldLog('debug')) console.group(label);
  },
  groupEnd: (): void => {
    if (shouldLog('debug')) console.groupEnd();
  },
  time: (label: string): void => {
    if (shouldLog('debug')) console.time(label);
  },
  timeEnd: (label: string): void => {
    if (shouldLog('debug')) console.timeEnd(label);
  },
};

/**
 * Debug logging utility that only logs in development mode
 * @param message - The message to log
 * @param data - Optional data to log alongside the message
 */
export const debugLog = (message: string, ...data: any[]): void => {
  logger.debug(message, ...data);
};

/**
 * Error logging utility
 * @param message - The error message
 * @param error - Optional error object
 */
export const errorLog = (message: string, error?: Error | any): void => {
  if (error) {
    logger.error(message, error);
  } else {
    logger.error(message);
  }
};

/**
 * Warning logging utility
 * @param message - The warning message
 * @param data - Optional data to log alongside the message
 */
export const warnLog = (message: string, ...data: any[]): void => {
  logger.warn(message, ...data);
};

/**
 * Info logging utility
 * @param message - The info message
 * @param data - Optional data to log alongside the message
 */
export const infoLog = (message: string, ...data: any[]): void => {
  logger.info(message, ...data);
};
