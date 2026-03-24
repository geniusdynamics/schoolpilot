import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../../../components/ui/Card';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const SyncRulesEditor: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { config, updateDatabaseConfig } = useUnifiedConfig();
  
  const syncConfig = config.database?.sync || {
    enabled: true,
    interval: 30000,
    batchSize: 100,
    retryAttempts: 3,
    timeout: 60000,
    conflictResolution: 'manual'
  };

  const handleChange = (field: string, value: any) => {
    updateDatabaseConfig({
      sync: {
        ...syncConfig,
        [field]: value
      }
    });
  };

  return (
    <Card title="Synchronization Rules" className="shadow-sm mt-6">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-2">
            <label htmlFor="syncInterval" className="font-medium text-gray-900">Sync Interval (ms)</label>
            <input 
              id="syncInterval"
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={syncConfig.interval}
              onChange={(e) => handleChange('interval', parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Batch Size</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={syncConfig.batchSize}
              onChange={(e) => handleChange('batchSize', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Retry Attempts</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={syncConfig.retryAttempts}
              onChange={(e) => handleChange('retryAttempts', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Sync Timeout (ms)</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={syncConfig.timeout}
              onChange={(e) => handleChange('timeout', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-col space-y-2 md:col-span-2">
            <label className="font-medium text-gray-900">Conflict Resolution Strategy</label>
            <select 
              className="border border-gray-300 rounded-md p-2"
              value={syncConfig.conflictResolution}
              onChange={(e) => handleChange('conflictResolution', e.target.value)}
            >
              <option value="local">Local Wins (Overwrite server)</option>
              <option value="remote">Remote Wins (Overwrite local)</option>
              <option value="manual">Manual (Ask user)</option>
              <option value="merge">Merge (Attempt auto-merge)</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SyncRulesEditor;