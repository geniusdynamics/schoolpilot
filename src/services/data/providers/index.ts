/**
 * Data Provider Exports
 * 
 * All data provider implementations.
 */

export { SQLiteProvider } from './SQLiteProvider';
export { PouchDBProvider } from './PouchDBProvider';
export { BackendProvider, type BackendProviderConfig } from '../../backend/BackendProvider';

// Factory function to create appropriate provider
import type { DeploymentMode, DataProvider } from '../types';
import { SQLiteProvider } from './SQLiteProvider';
import { PouchDBProvider } from './PouchDBProvider';
import { BackendProvider, type BackendProviderConfig } from '../../backend/BackendProvider';

interface SQLiteOptions {
  filename?: string;
  encryptionKey?: string;
}

interface PouchDBOptions {
  localDbName?: string;
  remoteUrl?: string;
  auth?: {
    username: string;
    password: string;
  };
}

interface ProviderFactoryOptions {
  mode: DeploymentMode;
  sqlite?: SQLiteOptions;
  pouchdb?: PouchDBOptions;
  backend?: BackendProviderConfig;
}

export async function createProvider(options: ProviderFactoryOptions): Promise<DataProvider> {
  switch (options.mode) {
    case 'standalone':
      const sqlite = new SQLiteProvider();
      await sqlite.initialize({
        filename: options.sqlite?.filename || 'schoolpilot.db',
        encryptionKey: options.sqlite?.encryptionKey,
        enableChangeTracking: true
      });
      return sqlite;

    case 'networked':
    case 'saas':
      const pouchdb = new PouchDBProvider();
      await pouchdb.initialize({
        localDbName: options.pouchdb?.localDbName || 'schoolpilot_local',
        remoteUrl: options.pouchdb?.remoteUrl,
        auth: options.pouchdb?.auth,
        syncOptions: {
          live: true,
          retry: true,
          batch_size: 100
        }
      });
      return pouchdb;

    case 'hosted':
    case 'erpnext':
      if (!options.backend) {
        throw new Error(`Backend configuration required for mode: ${options.mode}`);
      }
      const backend = new BackendProvider(options.backend);
      await backend.initialize();
      return backend;

    default:
      throw new Error(`No provider available for mode: ${options.mode}`);
  }
}
