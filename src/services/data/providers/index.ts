/**
 * Data Provider Exports
 * 
 * All data provider implementations.
 */

export { SQLiteProvider } from './SQLiteProvider';
export { PouchDBProvider } from './PouchDBProvider';

// Factory function to create appropriate provider
import type { DeploymentMode, DataProvider } from '../types';
import { SQLiteProvider } from './SQLiteProvider';
import { PouchDBProvider } from './PouchDBProvider';

interface ProviderFactoryOptions {
  mode: DeploymentMode;
  sqlite?: {
    filename?: string;
    encryptionKey?: string;
  };
  pouchdb?: {
    localDbName?: string;
    remoteUrl?: string;
    auth?: {
      username: string;
      password: string;
    };
  };
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

    default:
      throw new Error(`No provider available for mode: ${options.mode}`);
  }
}
