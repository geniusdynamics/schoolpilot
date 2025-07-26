// ABOUTME: Main data hook export for inventory modules
// ABOUTME: Re-exports the standardized data hook factory and common interfaces

export { createDataHook, type DataHookResult, type DataHookConfig, type EntityData } from './useDataHookFactory';

// Also export the factory function as useDataHook for backward compatibility
export { createDataHook as useDataHook } from './useDataHookFactory';
