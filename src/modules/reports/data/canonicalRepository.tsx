// ABOUTME: Re-exports the shared canonical repository provider the module's pages read and write through.
// ABOUTME: The implementation lives in @/data/canonicalRepository, so every module shares one database.

export { CanonicalRepositoryProvider, useCanonicalRepository } from '@/data/canonicalRepository';
