// ABOUTME: The hub's route table: method and path matching, one JSON result per handler and the
// ABOUTME: single place a refusal is turned into an HTTP response.

import type { IncomingMessage, ServerResponse } from 'node:http';

import { errorResponse } from './errors';
import { sendJson } from './http';

/** What a handler receives. */
export interface RouteRequest {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
}

/** What a handler returns: a status and a JSON body; `undefined` writes 204. */
export interface RouteResult {
  readonly status?: number;
  readonly body?: unknown;
}

export type RouteHandler = (request: RouteRequest) => Promise<RouteResult | void> | RouteResult | void;

interface CompiledRoute {
  readonly method: string;
  readonly pattern: RegExp;
  readonly keys: readonly string[];
  readonly handler: RouteHandler;
}

/** A small route table; the hub needs nothing a framework would add. */
export class Router {
  private readonly routes: CompiledRoute[] = [];

  /** Registers a route. A `:name` segment becomes a parameter. */
  add(method: string, path: string, handler: RouteHandler): void {
    const { pattern, keys } = compile(path);
    this.routes.push({ method: method.toUpperCase(), pattern, keys, handler });
  }

  /** Dispatches one request, turning every failure into a JSON refusal. */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const method = (req.method ?? 'GET').toUpperCase();
    const match = this.match(method, url.pathname);

    if (!match) {
      sendJson(res, 404, {
        error: { code: 'not_found', message: `no route for ${method} ${url.pathname}` },
      });
      return;
    }

    try {
      const result = await match.handler({ req, res, url, params: match.params });
      if (res.writableEnded) return;
      if (!result) {
        res.writeHead(204);
        res.end();
        return;
      }
      sendJson(res, result.status ?? 200, result.body ?? null);
    } catch (error) {
      const failure = errorResponse(error);
      if (failure.status >= 500) {
        console.error(`${method} ${url.pathname} failed:`, error);
      }
      sendJson(res, failure.status, failure.body);
    }
  }

  private match(
    method: string,
    pathname: string
  ): { handler: RouteHandler; params: Record<string, string> } | null {
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
      return { handler: route.handler, params };
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
