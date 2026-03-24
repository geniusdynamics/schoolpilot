import React from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../../../components/ui/Card';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const ModeSelector: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { config, updateDatabaseConfig } = useUnifiedConfig();
  
  const isOffline = config.database?.features?.enableOfflineMode ?? true;
  const isSyncEnabled = config.database?.sync?.enabled ?? true;

  // Derive mode: offline, online, hybrid
  let currentMode = 'hybrid';
  if (isOffline && !isSyncEnabled) currentMode = 'offline';
  if (!isOffline && isSyncEnabled) currentMode = 'online';
  if (isOffline && isSyncEnabled) currentMode = 'hybrid';

  const handleModeChange = (mode: string) => {
    let offline = true;
    let sync = true;
    if (mode === 'offline') { offline = true; sync = false; }
    if (mode === 'online') { offline = false; sync = true; }
    if (mode === 'hybrid') { offline = true; sync = true; }

    updateDatabaseConfig({
      features: { ...config.database.features, enableOfflineMode: offline },
      sync: { ...config.database.sync, enabled: sync }
    });
  };

  return (
    <Card title="Operational Mode" className="shadow-sm">
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-600">Select how the application handles data connectivity.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'offline', label: 'Offline Only', desc: 'Data is stored locally. No server sync.' },
            { id: 'online', label: 'Online Only', desc: 'Data is fetched from server directly. No local cache.' },
            { id: 'hybrid', label: 'Hybrid (Recommended)', desc: 'Offline capable with background synchronization.' }
          ].map((mode) => (
            <div 
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${currentMode === mode.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              <div className="flex items-center space-x-2">
                <input type="radio" checked={currentMode === mode.id} readOnly className="text-blue-600" />
                <h4 className="font-medium text-gray-900">{mode.label}</h4>
              </div>
              <p className="mt-2 text-sm text-gray-500 ml-6">{mode.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ModeSelector;