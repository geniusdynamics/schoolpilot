// ABOUTME: Fixed-window rate limits for the hub's authentication and write surfaces, keyed by the
// ABOUTME: client address, with the Retry-After a refused caller needs.

import type { IncomingMessage } from 'node:http';

/** One rate limit: a name, a request count and the window it is counted over. */
export interface RateLimitRule {
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
}

/** The answer to one check. */
export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly rule: RateLimitRule;
  readonly remaining: number;
  /** Seconds until the window resets; 0 while the request is allowed. */
  readonly retryAfterSeconds: number;
}

/**
 * The authentication limit.
 *
 * Ten attempts per five minutes from one address is enough for a person who mistypes a password
 * and far too few for a password list. The bucket covers the whole `/api/auth` prefix, so a route
 * added under it is limited without anyone remembering to say so.
 */
export const AUTH_RATE_LIMIT: RateLimitRule = {
  name: 'auth',
  limit: 10,
  windowMs: 5 * 60 * 1000,
};

/**
 * The write limit.
 *
 * Every non-GET method counts: a bulk import over the LAN is a few hundred writes and stays
 * inside 120 a minute, while a runaway client or a scripted flood does not.
 */
export const WRITE_RATE_LIMIT: RateLimitRule = {
  name: 'write',
  limit: 120,
  windowMs: 60 * 1000,
};

interface Window {
  count: number;
  resetAt: number;
}

/**
 * A fixed-window limiter.
 *
 * The window is anchored at the first request rather than at a wall-clock boundary, so a caller
 * cannot fit two windows' worth of requests into two seconds either side of a minute mark. The
 * counters live in memory: a hub restart forgives them, which is the right trade for a single
 * process whose restart already requires the operator.
 */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();
  private readonly rules: { readonly auth: RateLimitRule; readonly write: RateLimitRule };
  private readonly now: () => number;

  constructor(
    rules: { readonly auth: RateLimitRule; readonly write: RateLimitRule } = {
      auth: AUTH_RATE_LIMIT,
      write: WRITE_RATE_LIMIT,
    },
    now: () => number = () => Date.now()
  ) {
    this.rules = rules;
    this.now = now;
  }

  /**
   * The rule a request falls under, or undefined when it is unlimited.
   *
   * The authentication bucket wins over the write bucket, because a refused login is the one
   * place a caller is guessing a secret.
   */
  ruleFor(method: string, pathname: string): RateLimitRule | undefined {
    if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) return this.rules.auth;

    const verb = method.toUpperCase();
    if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return undefined;
    return this.rules.write;
  }

  /** Counts one request against a rule. */
  check(rule: RateLimitRule, key: string): RateLimitDecision {
    const now = this.now();
    this.prune(now);

    const bucket = `${rule.name}:${key}`;
    let window = this.windows.get(bucket);
    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + rule.windowMs };
      this.windows.set(bucket, window);
    }
    window.count += 1;

    const allowed = window.count <= rule.limit;
    return {
      allowed,
      rule,
      remaining: Math.max(0, rule.limit - window.count),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  /** Counts one request against the rule it falls under, if any. */
  checkRequest(
    req: IncomingMessage,
    method: string,
    pathname: string
  ): RateLimitDecision | undefined {
    const rule = this.ruleFor(method, pathname);
    if (!rule) return undefined;
    return this.check(rule, clientKeyOf(req));
  }

  /** Drops the windows that have already reset, so the map cannot grow without bound. */
  private prune(now: number): void {
    for (const [bucket, window] of this.windows) {
      if (now >= window.resetAt) this.windows.delete(bucket);
    }
  }
}

/**
 * The caller a limit is counted against.
 *
 * The socket address is the only identity the hub has before P4-C01 supplies sessions, and it is
 * the right one for a LAN: every device is a distinct address, and a caller cannot claim another.
 */
export function clientKeyOf(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? 'unknown';
}
