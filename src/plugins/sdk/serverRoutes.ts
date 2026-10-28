// ABOUTME: The contract for a plug-in's server routes on hub/cloud: the request and response shapes, the
// ABOUTME: auth requirement and the path namespace. Types only — the server itself lives outside this SDK.

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Which tenant boundary a route answers for. */
export type RouteScope = 'institution' | 'platform';

/**
 * What a route requires before the handler runs. A route that touches school data must say
 * `required: true`; the server refuses to mount one that does not.
 */
export interface PluginRouteAuth {
  readonly required: boolean;
  readonly scope?: RouteScope;
  /** The roles allowed to call it; omitted means any authenticated role with the route's scope. */
  readonly roles?: readonly string[];
}

/** A request as the server hands it to a plug-in route. */
export interface PluginServerRequest {
  readonly method: HttpMethod;
  /** The request path as received, including the plugin namespace. */
  readonly path: string;
  readonly pluginId: string;
  readonly institutionId?: string;
  readonly query: Readonly<Record<string, string>>;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

/** A response a plug-in route returns. */
export interface PluginServerResponse {
  readonly status: number;
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}

export type PluginServerHandler = (
  request: PluginServerRequest
) => PluginServerResponse | Promise<PluginServerResponse>;

/** One HTTP route a plug-in serves from the hub or cloud server. */
export interface PluginServerRoute {
  readonly method: HttpMethod;
  /** Path relative to the plug-in's namespace, for example `/digest`. */
  readonly path: string;
  readonly auth: PluginRouteAuth;
  readonly handler: PluginServerHandler;
  readonly description?: string;
}

/** Every plug-in route is mounted under this namespace, keyed by plug-in id. */
export const PLUGIN_ROUTE_NAMESPACE = '/api/plugins';

/** The absolute path a plug-in route is mounted at. */
export function pluginRoutePath(pluginId: string, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${PLUGIN_ROUTE_NAMESPACE}/${pluginId}${suffix}`;
}

/** True when `path` belongs to `pluginId`'s namespace, so one plug-in cannot answer another's routes. */
export function isPluginRouteOwnedBy(pluginId: string, path: string): boolean {
  const prefix = `${PLUGIN_ROUTE_NAMESPACE}/${pluginId}`;
  return path === prefix || path.startsWith(`${prefix}/`);
}
