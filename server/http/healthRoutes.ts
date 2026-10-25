// ABOUTME: The health API: the hub's health report and the downloadable diagnostic bundle an
// ABOUTME: operator hands to support, both over the health service.

import { buildDiagnosticBundle, type HealthService } from '../health';
import type { Router } from './router';

export interface HealthRouteOptions {
  readonly service: HealthService;
}

/** Registers the health API under `/api/health`. */
export function addHealthRoutes(router: Router, options: HealthRouteOptions): void {
  router.add('GET', '/api/health/report', async () => ({ body: await options.service.report() }));

  router.add('GET', '/api/health/diagnostics', async (request) => {
    const report = await options.service.report();
    const bundle = buildDiagnosticBundle(report, await options.service.diagnostics());
    const stamp = bundle.generatedAt.replace(/[:.]/g, '-');
    request.res.setHeader(
      'content-disposition',
      `attachment; filename="schoolpilot-diagnostics-${stamp}.json"`
    );
    return { body: bundle };
  });
}
