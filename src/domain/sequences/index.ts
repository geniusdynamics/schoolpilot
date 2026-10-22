// ABOUTME: Public surface of the sequence module: named sequences with formats, scopes and resets,
// ABOUTME: the store-backed issuer, offline device blocks, and parsing a number back.

export * from './types';
export * from './errors';
export * from './format';
export * from './scope';
export * from './catalog';
export * from './store';
export * from './service';

// The single-file helpers this module replaces. They stay exported so existing callers keep
// working while they migrate to the named sequences; see `legacy.ts` for why they are unsafe.
export * from './legacy';
