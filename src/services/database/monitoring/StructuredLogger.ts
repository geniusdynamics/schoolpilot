/**
 * StructuredLogger - JSON-structured logging for database operations
 *
 * Provides consistent log format with context, timing, and metadata.
 * Supports multiple output destinations and log levels.
 *
 * Requirements: 8.1 (Structured Logging)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module: string;
  operation?: string;
  duration?: number; // ms
  provider?: string;
  collection?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  module: string;
  includeStack: boolean;
  includeMetadata: boolean;
  maxMetadataSize: number; // Maximum size for metadata before truncation
}

export class StructuredLogger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
      module: config.module ?? 'database',
      includeStack: config.includeStack ?? process.env.NODE_ENV === 'development',
      includeMetadata: config.includeMetadata ?? true,
      maxMetadataSize: config.maxMetadataSize ?? 10_000,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): StructuredLogger {
    const childLogger = new StructuredLogger({
      ...this.config,
      module: `${this.config.module}:${Object.values(context).join(':')}`,
    });
    return childLogger;
  }

  /**
   * Log at debug level
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  /**
   * Log at info level
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  /**
   * Log at warn level
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const errorMetadata = error instanceof Error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: this.config.includeStack ? error.stack : undefined,
          },
        }
      : {};

    this.log('error', message, { ...errorMetadata, ...metadata });
  }

  /**
   * Time an operation and log the result
   */
  async time<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.log('debug', `${operation} completed`, {
        ...metadata,
        operation,
        duration,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log('error', `${operation} failed`, {
        ...metadata,
        operation,
        duration,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
      });
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  timeSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>,
  ): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.log('debug', `${operation} completed`, {
        ...metadata,
        operation,
        duration,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.log('error', `${operation} failed`, {
        ...metadata,
        operation,
        duration,
        error: error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
      });
      throw error;
    }
  }

  /**
   * Export log entry as JSON string
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (this.shouldSkip(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module: this.config.module,
      metadata: this.config.includeMetadata
        ? this.truncateMetadata(metadata)
        : undefined,
    };

    // Output to console in development, or structured format in production
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(level, entry);
    } else {
      // Structured JSON output for production log aggregation
      console.log(JSON.stringify(entry));
    }
  }

  private shouldSkip(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
    const levelIndex = levels.indexOf(level);
    const configuredIndex = levels.indexOf(this.config.level);
    return levelIndex < configuredIndex;
  }

  private truncateMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const json = JSON.stringify(metadata);
    if (json.length <= this.config.maxMetadataSize) return metadata;

    // Truncate large values
    const truncated: Record<string, any> = {};
    let currentSize = 0;

    for (const [key, value] of Object.entries(metadata)) {
      const valueStr = JSON.stringify(value);
      if (currentSize + valueStr.length > this.config.maxMetadataSize) {
        truncated[key] = valueStr.substring(0, 100) + '...(truncated)';
        break;
      }
      truncated[key] = value;
      currentSize += valueStr.length;
    }

    return truncated;
  }

  private logToConsole(level: LogLevel, entry: LogEntry): void {
    const prefix = `[${entry.module}]`;
    const suffix = entry.duration ? ` (${entry.duration.toFixed(1)}ms)` : '';

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${entry.message}${suffix}`, entry.metadata ?? '');
        break;
      case 'info':
        console.info(`${prefix} ${entry.message}${suffix}`, entry.metadata ?? '');
        break;
      case 'warn':
        console.warn(`${prefix} ${entry.message}${suffix}`, entry.metadata ?? '');
        break;
      case 'error':
        console.error(`${prefix} ${entry.message}${suffix}`, entry.error ?? entry.metadata ?? '');
        break;
    }
  }
}

/**
 * Create a structured logger for a specific module
 */
export function createLogger(module: string, config?: Partial<LoggerConfig>): StructuredLogger {
  return new StructuredLogger({ ...config, module });
}
