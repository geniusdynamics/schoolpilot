// ABOUTME: Data layer configuration for dual database architecture
// ABOUTME: Defines configuration options for different database providers

export interface DataLayerConfig {
  development: {
    provider: 'sqlite' | 'pouchdb' | 'livestore' | 'mock';
    options: Record<string, any>;
  };
  production: {
    provider: 'pouchdb' | 'rxdb' | 'livestore';
    options: Record<string, any>;
  };
  demo: {
    provider: 'livestore' | 'pouchdb' | 'mock';
    options: Record<string, any>;
  };
}

export const DATA_LAYER_CONFIG: DataLayerConfig = {
  development: {
    provider: 'sqlite',
    options: {
      persistence: true,
      cacheSize: 1000
    }
  },
  production: {
    provider: 'livestore',
    options: {
      sync: true,
      offlineSupport: true,
      wasmSqlite: true,
      opfsStorage: true,
      crossTabPersistence: true
    }
  },
  demo: {
    provider: 'livestore',
    options: {
      sync: false,
      offlineSupport: true,
      wasmSqlite: true,
      opfsStorage: true,
      crossTabPersistence: false
    }
  }
};