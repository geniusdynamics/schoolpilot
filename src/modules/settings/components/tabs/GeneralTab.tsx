// ABOUTME: General tab settings
import React from 'react';
import { useTranslation } from 'react-i18next';
import { default as Card } from '../../../../components/ui/Card';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const GeneralTab: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { config, updateTabsConfig } = useUnifiedConfig();
  const generalConfig = config.tabs?.general || { openingDirection: 'ltr', newTabPlacement: 'end', defaultPage: 'dashboard' };

  const handleChange = (key: string, value: string) => {
    updateTabsConfig({
      general: {
        ...generalConfig,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card title="General Tab Settings" className="shadow-sm">
        <div className="space-y-4 p-4">
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Tab Opening Direction</label>
            <select 
              className="border border-gray-300 rounded-md p-2"
              value={generalConfig.openingDirection}
              onChange={(e) => handleChange('openingDirection', e.target.value)}
            >
              <option value="ltr">Left to Right</option>
              <option value="rtl">Right to Left</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">New Tab Placement</label>
            <select 
              className="border border-gray-300 rounded-md p-2"
              value={generalConfig.newTabPlacement}
              onChange={(e) => handleChange('newTabPlacement', e.target.value)}
            >
              <option value="end">At the end</option>
              <option value="next">Next to current tab</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Default Page for New Tabs</label>
            <input 
              type="text" 
              className="border border-gray-300 rounded-md p-2"
              value={generalConfig.defaultPage}
              onChange={(e) => handleChange('defaultPage', e.target.value)}
              placeholder="e.g., dashboard"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GeneralTab;
