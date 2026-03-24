import React from 'react';
import Card from '../../../../components/ui/Card';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const QuotaRetentionPanel: React.FC = () => {
  const { config, updateDatabaseConfig } = useUnifiedConfig();
  const storageConfig = config.database?.storage || {
    maxSize: 500,
    compressionEnabled: true,
    encryptionEnabled: false,
    backupEnabled: true,
    retentionDays: 30
  };

  const handleChange = (field: string, value: any) => {
    updateDatabaseConfig({
      storage: {
        ...storageConfig,
        [field]: value
      }
    });
  };

  return (
    <Card title="Quota & Retention Policies" className="shadow-sm mt-6">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Maximum Size (MB)</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={storageConfig.maxSize}
              onChange={(e) => handleChange('maxSize', parseInt(e.target.value) || 0)}
            />
            <p className="text-sm text-gray-500">0 for unlimited</p>
          </div>

          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Data Retention (Days)</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={storageConfig.retentionDays}
              onChange={(e) => handleChange('retentionDays', parseInt(e.target.value) || 0)}
            />
            <p className="text-sm text-gray-500">Auto-prune records older than this</p>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <h4 className="font-medium text-gray-900">Compression</h4>
              <p className="text-sm text-gray-500">Compress large JSON blobs</p>
            </div>
            <input 
              type="checkbox" 
              className="h-5 w-5 text-blue-600"
              checked={storageConfig.compressionEnabled}
              onChange={(e) => handleChange('compressionEnabled', e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <h4 className="font-medium text-gray-900">Encryption at Rest</h4>
              <p className="text-sm text-gray-500">Encrypt local database file</p>
            </div>
            <input 
              type="checkbox" 
              className="h-5 w-5 text-blue-600"
              checked={storageConfig.encryptionEnabled}
              onChange={(e) => handleChange('encryptionEnabled', e.target.checked)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QuotaRetentionPanel;