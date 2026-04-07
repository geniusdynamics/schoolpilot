// ABOUTME: Public barrel export for the src/routing module
// ABOUTME: Consumers import AppInner (and optionally other routing primitives) from here

export { AppInner } from './AppContent';
export { AppContent } from './AppContent';
export { DynamicRoutes } from './moduleRoutes';
export { getPageComponent, pageModules, dashboardModules } from './pageLoader';
export * from './routeConfig';
