// ABOUTME: Logging utilities for debugging and development
// ABOUTME: Provides consistent logging interface across the application

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const resolveLogLevel = (): LogLevel => {
  const configuredLevel = import.meta.env?.VITE_LOG_LEVEL as LogLevel | undefined;
  if (configuredLevel && ['debug', 'info', 'warn', 'error'].includes(configuredLevel)) {
    return configuredLevel;
  }
  return import.meta.env?.DEV ? 'debug' : 'warn';
};

const currentLogLevel = resolveLogLevel();
const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const shouldLog = (targetLevel: LogLevel): boolean =>
  levelPriority[targetLevel] >= levelPriority[currentLogLevel];

export const logger = {
  debug: (message: string, ...data: any[]): void => {
    if (shouldLog('debug')) {
      console.debug(message, ...data);
    }
  },
  info: (message: string, ...data: any[]): void => {
    if (shouldLog('info')) {
      console.info(message, ...data);
    }
  },
  warn: (message: string, ...data: any[]): void => {
    if (shouldLog('warn')) {
      console.warn(message, ...data);
    }
  },
  error: (message: string, ...data: any[]): void => {
    if (shouldLog('error')) {
      console.error(message, ...data);
    }
  }
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
