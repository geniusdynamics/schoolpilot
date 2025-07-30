// ABOUTME: Logger utility for migration operations
// ABOUTME: Provides structured logging with different levels and error tracking

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  error?: Error;
}

class MigrationLogger {
  private logEntries: LogEntry[] = [];
  private level: LogLevel;

  constructor(private module: string, level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      data,
      error
    };

    this.logEntries.push(entry);

    // Console output with colors
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.module}]`;
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, data || '');
        break;
      case 'info':
        console.info(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, error || data || '');
        if (error) {
          console.error(error.stack);
        }
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      this.log('error', message, undefined, error);
    } else {
      this.log('error', message, error);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logEntries.filter(entry => entry.level === level);
    }
    return [...this.logEntries];
  }

  getErrorLogs(): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === 'error');
  }

  clearLogs(): void {
    this.logEntries = [];
  }

  getSummary(): { total: number; debug: number; info: number; warn: number; error: number } {
    const summary = { total: 0, debug: 0, info: 0, warn: 0, error: 0 };
    
    this.logEntries.forEach(entry => {
      summary.total++;
      summary[entry.level]++;
    });

    return summary;
  }

  exportLogs(): string {
    return this.logEntries
      .map(entry => {
        let line = `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
        if (entry.data) {
          line += ` | Data: ${JSON.stringify(entry.data)}`;
        }
        if (entry.error) {
          line += ` | Error: ${entry.error.message}`;
          if (entry.error.stack) {
            line += `\nStack: ${entry.error.stack}`;
          }
        }
        return line;
      })
      .join('\n');
  }

  // Timer functionality for performance tracking
  private timers: Map<string, number> = new Map();

  startTimer(name: string): void {
    this.timers.set(name, Date.now());
    this.debug(`Timer started: ${name}`);
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.warn(`Timer not found: ${name}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);
    this.info(`Timer ended: ${name} took ${duration}ms`);
    return duration;
  }

  // Progress tracking
  private progress: Map<string, { current: number; total: number }> = new Map();

  initProgress(name: string, total: number): void {
    this.progress.set(name, { current: 0, total });
    this.info(`Progress initialized: ${name} (0/${total})`);
  }

  updateProgress(name: string, current: number): void {
    const prog = this.progress.get(name);
    if (!prog) {
      this.warn(`Progress tracker not found: ${name}`);
      return;
    }

    prog.current = current;
    const percentage = Math.round((current / prog.total) * 100);
    this.info(`Progress update: ${name} (${current}/${prog.total}) ${percentage}%`);
  }

  completeProgress(name: string): void {
    const prog = this.progress.get(name);
    if (prog) {
      this.info(`Progress completed: ${name} (${prog.total}/${prog.total}) 100%`);
      this.progress.delete(name);
    }
  }
}

export function createLogger(module: string, level: LogLevel = 'info'): MigrationLogger {
  return new MigrationLogger(module, level);
}
