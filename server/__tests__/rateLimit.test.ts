// ABOUTME: The hub's rate limits: the fixed window, the bucket a request falls under, and the 429
// ABOUTME: a refused caller reads, proved through the router and a real HTTP server.

import http from 'node:http';
import { createServer, type Server } from 'node:http';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Router } from '../http/router';
import {
  AUTH_RATE_LIMIT,
  RateLimiter,
  WRITE_RATE_LIMIT,
  clientKeyOf,
  type RateLimitRule,
} from '../http/rateLimit';

interface Response {
  readonly status: number;
  readonly headers: http.IncomingHttpHeaders;
  readonly body: unknown;
}

describe('the rate-limit rules', () => {
  const limiter = new RateLimiter();

  it('limits nothing that reads', () => {
    expect(limiter.ruleFor('GET', '/api/entities/learner')).toBeUndefined();
    expect(limiter.ruleFor('HEAD', '/api/entities/learner')).toBeUndefined();
    expect(limiter.ruleFor('OPTIONS', '/api/entities/learner')).toBeUndefined();
  });

  it('limits every write', () => {
    expect(limiter.ruleFor('POST', '/api/entities/learner')).toBe(WRITE_RATE_LIMIT);
    expect(limiter.ruleFor('PATCH', '/api/entities/learner/l1')).toBe(WRITE_RATE_LIMIT);
    expect(limiter.ruleFor('DELETE', '/api/entities/learner/l1')).toBe(WRITE_RATE_LIMIT);
  });

  it('limits the authentication surface whatever the method', () => {
    expect(limiter.ruleFor('POST', '/api/auth/login')).toBe(AUTH_RATE_LIMIT);
    expect(limiter.ruleFor('GET', '/api/auth/session')).toBe(AUTH_RATE_LIMIT);
    // The authentication bucket wins over the write bucket, because a login is where a caller
    // is guessing a secret.
    expect(limiter.ruleFor('POST', '/api/auth')).toBe(AUTH_RATE_LIMIT);
  });

  it('allows the limit and refuses the request after it', () => {
    const rule: RateLimitRule = { name: 'test', limit: 3, windowMs: 60_000 };
    const clock = new RateLimiter({ auth: AUTH_RATE_LIMIT, write: WRITE_RATE_LIMIT }, () => 1_000);

    for (let index = 0; index < rule.limit; index += 1) {
      const decision = clock.check(rule, '10.0.0.1');
      expect(decision.allowed, `request ${index + 1}`).toBe(true);
      expect(decision.retryAfterSeconds).toBe(0);
    }

    const refused = clock.check(rule, '10.0.0.1');
    expect(refused.allowed).toBe(false);
    expect(refused.remaining).toBe(0);
    expect(refused.retryAfterSeconds).toBe(60);
  });

  it('forgives a caller once the window has passed', () => {
    const rule: RateLimitRule = { name: 'test', limit: 1, windowMs: 1_000 };
    let now = 0;
    const clock = new RateLimiter({ auth: AUTH_RATE_LIMIT, write: WRITE_RATE_LIMIT }, () => now);

    expect(clock.check(rule, 'key').allowed).toBe(true);
    expect(clock.check(rule, 'key').allowed).toBe(false);

    now = 1_000;
    expect(clock.check(rule, 'key').allowed).toBe(true);
  });

  it('counts each caller separately', () => {
    const rule: RateLimitRule = { name: 'test', limit: 1, windowMs: 60_000 };
    const clock = new RateLimiter({ auth: AUTH_RATE_LIMIT, write: WRITE_RATE_LIMIT }, () => 0);

    expect(clock.check(rule, '10.0.0.1').allowed).toBe(true);
    expect(clock.check(rule, '10.0.0.1').allowed).toBe(false);
    expect(clock.check(rule, '10.0.0.2').allowed).toBe(true);
  });

  it('counts a caller with no address under a single key', () => {
    expect(clientKeyOf({ socket: {} } as unknown as http.IncomingMessage)).toBe('unknown');
  });
});

describe('the router with a rate limiter', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    const limiter = new RateLimiter({
      auth: { name: 'auth', limit: 3, windowMs: 300_000 },
      write: { name: 'write', limit: 2, windowMs: 60_000 },
    });
    const router = new Router(limiter);
    router.add('GET', '/api/auth/session', () => ({ body: { actor: 'someone' } }));
    router.add('POST', '/api/entities/learner', () => ({ status: 201, body: { id: 'l1' } }));
    router.add('GET', '/api/entities/learner', () => ({ body: { items: [] } }));

    server = createServer((req, res) => void router.handle(req, res));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    port = address && typeof address !== 'string' ? address.port : 0;
  });

  afterAll(async () => {
    if (server?.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('serves the limit and refuses the next authentication request with a Retry-After', async () => {
    for (let index = 0; index < 3; index += 1) {
      const allowed = await request(port, 'GET', '/api/auth/session');
      expect(allowed.status, `request ${index + 1}`).toBe(200);
    }

    const refused = await request(port, 'GET', '/api/auth/session');
    expect(refused.status).toBe(429);
    expect(errorCodeOf(refused)).toBe('rate_limited');
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    expect(refused.headers['content-type']).toContain('application/json');
  });

  it('limits writes without limiting the reads between them', async () => {
    expect((await request(port, 'POST', '/api/entities/learner')).status).toBe(201);
    expect((await request(port, 'GET', '/api/entities/learner')).status).toBe(200);
    expect((await request(port, 'POST', '/api/entities/learner')).status).toBe(201);

    const refused = await request(port, 'POST', '/api/entities/learner');
    expect(refused.status).toBe(429);
    expect(errorCodeOf(refused)).toBe('rate_limited');
  });

  it('refuses a limited request before asking whether the route exists', async () => {
    const limiter = new RateLimiter({
      auth: { name: 'auth', limit: 1, windowMs: 60_000 },
      write: { name: 'write', limit: 1, windowMs: 60_000 },
    });
    const router = new Router(limiter);
    router.add('POST', '/api/entities/learner', () => ({ status: 201, body: { id: 'l1' } }));

    const own = createServer((req, res) => void router.handle(req, res));
    await new Promise<void>((resolve) => own.listen(0, '127.0.0.1', resolve));
    const address = own.address();
    const ownPort = address && typeof address !== 'string' ? address.port : 0;

    try {
      expect((await request(ownPort, 'POST', '/api/entities/learner')).status).toBe(201);
      // The path has no route; the limiter answers first, so the surface cannot be probed for free.
      expect((await request(ownPort, 'POST', '/api/nowhere')).status).toBe(429);
    } finally {
      await new Promise<void>((resolve) => own.close(() => resolve()));
    }
  });
});

/** A request against a server on a port. */
function request(port: number, method: string, pathname: string): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathname, method }, (res) => {
      res.setEncoding('utf8');
      let text = '';
      res.on('data', (chunk: string) => {
        text += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          body: text.length > 0 ? (JSON.parse(text) as unknown) : null,
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/** The error code of a refusal. */
function errorCodeOf(response: Response): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}
