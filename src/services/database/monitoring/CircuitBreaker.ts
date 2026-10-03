import { logger } from '@/utils/logging';

/**
 * CircuitBreaker - Protects against cascading failures in database providers
 *
 * Implements the circuit breaker pattern to prevent repeated calls to a failing service.
 * States: closed (normal), open (failing), half-open (testing recovery).
 *
 * Requirements: 8.2 (Circuit Breaker)
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitorWindow: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public state: CircuitState,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private lastStateChange: Date = new Date();
  private readonly failures: Array<{ timestamp: number; error: Error }> = [];

  private readonly config: Required<CircuitBreakerConfig>;
  private readonly onStateChange?: (state: CircuitState, previousState: CircuitState) => void;

  constructor(
    private readonly name: string,
    config: Partial<CircuitBreakerConfig> = {},
    onStateChange?: (state: CircuitState, previousState: CircuitState) => void,
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 30_000,
      monitorWindow: config.monitorWindow ?? 60_000,
    };
    this.onStateChange = onStateChange;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === 'open') {
      if (!this.shouldAttemptReset()) {
        const retryAfter = this.getRetryAfter();
        throw new CircuitBreakerError(
          `Circuit breaker '${this.name}' is open. Requests are blocked.`,
          'open',
          retryAfter,
        );
      }
      this.transitionTo('half-open');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  executeSync<T>(operation: () => T): T {
    this.totalRequests++;

    if (this.state === 'open') {
      if (!this.shouldAttemptReset()) {
        const retryAfter = this.getRetryAfter();
        throw new CircuitBreakerError(
          `Circuit breaker '${this.name}' is open. Requests are blocked.`,
          'open',
          retryAfter,
        );
      }
      this.transitionTo('half-open');
    }

    try {
      const result = operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveFailures: this.failureCount,
      consecutiveSuccesses: this.successCount,
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    const previousState = this.state;
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.failures.length = 0;
    this.lastStateChange = new Date();
    this.onStateChange?.('closed', previousState);
  }

  forceOpen(): void {
    const previousState = this.state;
    this.state = 'open';
    this.lastStateChange = new Date();
    this.onStateChange?.('open', previousState);
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();
    this.successCount++;

    if (this.state === 'half-open') {
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo('closed');
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(error: Error): void {
    this.totalFailures++;
    this.lastFailureTime = new Date();
    this.failureCount++;
    this.successCount = 0;

    const now = Date.now();
    this.failures.push({ timestamp: now, error });

    while (
      this.failures.length > 0 &&
      this.failures[0].timestamp < now - this.config.monitorWindow
    ) {
      this.failures.shift();
    }

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.failures.length >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private shouldAttemptReset(): boolean {
    const timeSinceStateChange = Date.now() - this.lastStateChange.getTime();
    return timeSinceStateChange >= this.config.timeout;
  }

  private getRetryAfter(): number {
    const elapsed = Date.now() - this.lastStateChange.getTime();
    return Math.max(0, this.config.timeout - elapsed);
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    if (previousState === newState) return;

    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === 'closed') {
      this.failureCount = 0;
      this.successCount = 0;
    }

    logger.info(
      `[CircuitBreaker:${this.name}] State changed: ${previousState} -> ${newState}`,
    );

    this.onStateChange?.(newState, previousState);
  }
}

export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();
  private defaultConfig: Partial<CircuitBreakerConfig>;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, {
        ...this.defaultConfig,
        ...config,
      });
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  getAll(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  getHealthStatus(): {
    total: number;
    open: number;
    halfOpen: number;
    closed: number;
  } {
    let open = 0;
    let halfOpen = 0;
    let closed = 0;

    for (const breaker of this.breakers.values()) {
      const state = breaker.getState();
      if (state === 'open') open++;
      else if (state === 'half-open') halfOpen++;
      else closed++;
    }

    return {
      total: this.breakers.size,
      open,
      halfOpen,
      closed,
    };
  }
}

let circuitBreakerRegistryInstance: CircuitBreakerRegistry | null = null;

export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  if (!circuitBreakerRegistryInstance) {
    circuitBreakerRegistryInstance = new CircuitBreakerRegistry();
  }
  return circuitBreakerRegistryInstance;
}
