import React from 'react';
import Card from '../../../../components/ui/Card';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const PerformancePanel: React.FC = () => {
  const { config, updateDatabaseConfig } = useUnifiedConfig();
  const perfConfig = config.database?.performance || {
    enableIndexing: true,
    enableCaching: true,
    cacheSize: 100,
    queryTimeout: 30000,
    batchSize: 1000
  };

  const handleChange = (field: string, value: any) => {
    updateDatabaseConfig({
      performance: {
        ...perfConfig,
        [field]: value
      }
    });
  };

  return (
    <Card title="Performance Tuning" className="shadow-sm mt-6">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <h4 className="font-medium text-gray-900">Enable Caching</h4>
              <p className="text-sm text-gray-500">Cache frequent queries in memory</p>
            </div>
            <input 
              type="checkbox" 
              className="h-5 w-5 text-blue-600"
              checked={perfConfig.enableCaching}
              onChange={(e) => handleChange('enableCaching', e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <h4 className="font-medium text-gray-900">Enable Indexing</h4>
              <p className="text-sm text-gray-500">Auto-create indexes for foreign keys</p>
            </div>
            <input 
              type="checkbox" 
              className="h-5 w-5 text-blue-600"
              checked={perfConfig.enableIndexing}
              onChange={(e) => handleChange('enableIndexing', e.target.checked)}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="cacheSize" className="font-medium text-gray-900">Cache Size (MB)</label>
            <input 
              id="cacheSize"
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={perfConfig.cacheSize}
              onChange={(e) => handleChange('cacheSize', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Query Timeout (ms)</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={perfConfig.queryTimeout}
              onChange={(e) => handleChange('queryTimeout', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PerformancePanel;