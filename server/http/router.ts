// ABOUTME: The hub's route table: method and path matching, the bearer session a protected route
// ABOUTME: requires, and the single place a refusal is turned into an HTTP response.

import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuthenticatedActor } from '../auth';
import { errorResponse } from './errors';
import { bearerToken, HttpError, sendJson } from './http';
import type { RateLimiter } from './rateLimit';

/** What a handler receives. */
export interface RouteRequest {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
  /** The verified actor; null only on a route that does not require one. */
  readonly session: AuthenticatedActor | null;
  /** The bearer token the request presented; null when it presented none. */
  readonly token: string | null;
}

/** What a handler returns: a status and a JSON body; `undefined` writes 204. */
export interface RouteResult {
  readonly status?: number;
  readonly body?: unknown;
}

export type RouteHandler = (request: RouteRequest) => Promise<RouteResult | void> | RouteResult | void;

/** Whether a route needs a signed-in actor. Protected is the default. */
export type RouteAuth = 'none' | 'session';

/** Per-route options. */
export interface RouteOptions {
  /** `session` (the default) refuses a request without a live bearer token. */
  readonly auth?: RouteAuth;
}

/** How the router turns a bearer token into an actor. */
export interface RouterOptions {
  readonly authenticate?: (token: string) => Promise<AuthenticatedActor | null>;
  /** Enforces the hub's rate limits when set. */
  readonly rateLimiter?: RateLimiter;
}

interface CompiledRoute {
  readonly method: string;
  readonly pattern: RegExp;
  readonly keys: readonly string[];
  readonly auth: RouteAuth;
  readonly handler: RouteHandler;
}

interface RouteMatch {
  readonly route: CompiledRoute;
  readonly params: Record<string, string>;
}

/** A small route table; the hub needs nothing a framework would add. */
export class Router {
  private readonly routes: CompiledRoute[] = [];
  private readonly authenticate: ((token: string) => Promise<AuthenticatedActor | null>) | undefined;
  private readonly rateLimiter: RateLimiter | undefined;

  constructor(options: RouterOptions = {}) {
    this.authenticate = options.authenticate;
    this.rateLimiter = options.rateLimiter;
  }

  /**
   * Registers a route. A `:name` segment becomes a parameter.
   *
   * A route is authenticated unless it says otherwise: forgetting an option must fail closed,
   * because the alternative silently exposes a new endpoint to the network.
   */
  add(method: string, path: string, handler: RouteHandler, options: RouteOptions = {}): void {
    const { pattern, keys } = compile(path);
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      keys,
      auth: options.auth ?? 'session',
      handler,
    });
  }

  /** Dispatches one request, turning every failure into a JSON refusal. */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const method = (req.method ?? 'GET').toUpperCase();

    // The limit is checked before the route is matched and before the session is verified, so an
    // unrouted path cannot probe the surface for free, a limited route stays limited however it is
    // spelled, and the public sign-in endpoints are bounded before they touch a password.
    const limit = this.rateLimiter?.checkRequest(req, method, url.pathname);
    if (limit && !limit.allowed) {
      sendJson(
        res,
        429,
        {
          error: {
            code: 'rate_limited',
            message: `too many requests on the ${limit.rule.name} surface; retry in ${limit.retryAfterSeconds}s`,
            retryAfterSeconds: limit.retryAfterSeconds,
          },
        },
        { 'retry-after': String(limit.retryAfterSeconds) }
      );
      return;
    }

    try {
      const match = this.match(method, url.pathname);
      if (!match) {
        sendJson(res, 404, {
          error: { code: 'not_found', message: `no route for ${method} ${url.pathname}` },
        });
        return;
      }

      const token = bearerToken(req) ?? null;
      let session: AuthenticatedActor | null = null;

      if (match.route.auth === 'session') {
        if (token === null) {
          res.setHeader('www-authenticate', 'Bearer');
          throw new HttpError(401, 'unauthenticated', 'this endpoint requires a bearer token');
        }
        if (this.authenticate === undefined) {
          throw new HttpError(
            503,
            'auth_unavailable',
            'this hub has no authentication configured, so it cannot accept requests'
          );
        }
        session = await this.authenticate(token);
        if (session === null) {
          res.setHeader('www-authenticate', 'Bearer');
          throw new HttpError(401, 'unauthenticated', 'the bearer token is not a live session');
        }
      }

      const result = await match.route.handler({
        req,
        res,
        url,
        params: match.params,
        session,
        token,
      });
      if (res.writableEnded) return;
      if (!result) {
        res.writeHead(204);
        res.end();
        return;
      }
      sendJson(res, result.status ?? 200, result.body ?? null);
    } catch (error) {
      const failure = errorResponse(error);
      if (failure.status === 423 && typeof failure.body === 'object' && failure.body !== null) {
        const retryAfter = (failure.body as { retryAfterSeconds?: unknown }).retryAfterSeconds;
        if (typeof retryAfter === 'number') res.setHeader('retry-after', String(retryAfter));
      }
      if (failure.status >= 500) {
        console.error(`${method} ${url.pathname} failed:`, error);
      }
      sendJson(res, failure.status, failure.body);
    }
  }

  private match(method: string, pathname: string): RouteMatch | null {
    // A trailing slash names the same resource as none.
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const found = route.pattern.exec(path);
      if (!found) continue;

      const params: Record<string, string> = {};
      for (const [index, key] of route.keys.entries()) {
        params[key] = decodeURIComponent(found[index + 1] ?? '');
      }
      return { route, params };
    }
    return null;
  }
}

/** Compiles `/api/entities/:entity/:id` into a regular expression and its parameter names. */
function compile(path: string): { pattern: RegExp; keys: readonly string[] } {
  const keys: string[] = [];
  const source = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return { pattern: new RegExp(`^${source}$`), keys };
}
