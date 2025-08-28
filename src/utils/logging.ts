// ABOUTME: Logging utilities for debugging and development
// ABOUTME: Provides consistent logging interface across the application

/**
 * Debug logging utility that only logs in development mode
 * @param message - The message to log
 * @param data - Optional data to log alongside the message
 */
export const debugLog = (message: string, ...data: any[]): void => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    if (data.length > 0) {
      console.log(message, ...data);
    } else {
      console.log(message);
    }
  }
};

/**
 * Error logging utility
 * @param message - The error message
 * @param error - Optional error object
 */
export const errorLog = (message: string, error?: Error | any): void => {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
};

/**
 * Warning logging utility
 * @param message - The warning message
 * @param data - Optional data to log alongside the message
 */
export const warnLog = (message: string, ...data: any[]): void => {
  if (data.length > 0) {
    console.warn(message, ...data);
  } else {
    console.warn(message);
  }
};

/**
 * Info logging utility
 * @param message - The info message
 * @param data - Optional data to log alongside the message
 */
export const infoLog = (message: string, ...data: any[]): void => {
  if (data.length > 0) {
    console.info(message, ...data);
  } else {
    console.info(message);
  }
};