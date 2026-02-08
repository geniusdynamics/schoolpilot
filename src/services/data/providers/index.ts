/**
 * Data Provider Exports
 * 
 * All data provider implementations.
 */

export { SQLiteProvider } from './SQLiteProvider';
export { PouchDBProvider } from './PouchDBProvider';
export { BackendProvider, type BackendProviderConfig } from '../../backend/BackendProvider';
export { ERPNextProvider, type ERPNextProviderConfig } from '../../erpnext/ERPNextProvider';

// Factory function to create appropriate provider
import type { DeploymentMode, DataProvider } from '../types';
import { SQLiteProvider } from './SQLiteProvider';
import { PouchDBProvider } from './PouchDBProvider';
import { BackendProvider, type BackendProviderConfig } from '../../backend/BackendProvider';
import { ERPNextProvider, type ERPNextProviderConfig } from '../../erpnext/ERPNextProvider';

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
  erpnext?: ERPNextProviderConfig;
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
      if (!options.backend) {
        throw new Error(`Backend configuration required for mode: ${options.mode}`);
      }
      const backend = new BackendProvider(options.backend);
      await backend.initialize();
      return backend;

    case 'erpnext':
      if (!options.erpnext) {
        throw new Error(`ERPNext configuration required for mode: erpnext`);
      }
      const erpnext = new ERPNextProvider(options.erpnext);
      await erpnext.initialize();
      return erpnext;

    default:
      throw new Error(`No provider available for mode: ${options.mode}`);
  }
}
