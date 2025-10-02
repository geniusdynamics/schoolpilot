// ABOUTME: Index file for error boundary components
// ABOUTME: Exports all error boundary components for easy importing

export { default as ErrorBoundary } from '../ErrorBoundary';
export { default as ApplicationErrorBoundary } from '../ApplicationErrorBoundary';
export { default as ModuleErrorBoundary } from '../ModuleErrorBoundary';
export { default as DatabaseErrorBoundary } from '../DatabaseErrorBoundary';
export { default as DatabaseInitializationFallback } from '../DatabaseInitializationFallback';
export { default as DatabaseToastProvider, useDatabaseToast } from '../DatabaseToastProvider';

// Re-export existing error boundaries for compatibility
export { HookErrorBoundary, withHookErrorBoundary, useErrorHandler } from './HookErrorBoundary';
export { default as PageErrorBoundary } from '../PageErrorBoundary';
export { default as NavigationErrorBoundary } from '../NavigationErrorBoundary';