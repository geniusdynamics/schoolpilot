// ABOUTME: Index file for error boundary components
// ABOUTME: Exports the boundaries that are actually mounted in the app.

export { default as ErrorBoundary } from '../ErrorBoundary';
export { default as DatabaseInitializationFallback } from '../DatabaseInitializationFallback';
export { default as DatabaseToastProvider, useDatabaseToast } from '../DatabaseToastProvider';

// Consolidated hook-error boundary (Phase 1d.5 — single implementation)
export { default, HookErrorBoundary, withHookErrorBoundary, useErrorHandler } from '../HookErrorBoundary';
export { default as PageErrorBoundary } from '../PageErrorBoundary';
