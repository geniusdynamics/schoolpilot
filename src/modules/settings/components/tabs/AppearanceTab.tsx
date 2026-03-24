// ABOUTME: Appearance tab settings
import React from 'react';
import { useTranslation } from 'react-i18next';
import { default as Card } from '../../../../components/ui/Card';
import { default as Checkbox } from '../../../../components/ui/Checkbox';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const AppearanceTab: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { config, updateTabsConfig } = useUnifiedConfig();
  const appearanceConfig = config.tabs?.appearance || { minTabWidth: 120, maxTabWidth: 240, faviconVisibility: true, tabPreviewThumbnails: false, colorAccents: true };

  const handleChange = (key: string, value: string | number | boolean) => {
    updateTabsConfig({
      appearance: {
        ...appearanceConfig,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card title="Tab Appearance" className="shadow-sm">
        <div className="space-y-4 p-4">
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Minimum Tab Width (px)</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={appearanceConfig.minTabWidth}
              onChange={(e) => handleChange('minTabWidth', parseInt(e.target.value) || 0)}
              min="50"
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Maximum Tab Width (px)</label>
            <input 
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={appearanceConfig.maxTabWidth}
              onChange={(e) => handleChange('maxTabWidth', parseInt(e.target.value) || 0)}
              min="100"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Favicon Visibility</h4>
              <p className="text-sm text-gray-500 mt-1">Show website icons on tabs</p>
            </div>
            <Checkbox
              checked={appearanceConfig.faviconVisibility}
              onChange={(checked) => handleChange('faviconVisibility', checked)}
              aria-label="Favicon Visibility"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Tab Preview Thumbnails</h4>
              <p className="text-sm text-gray-500 mt-1">Show preview image when hovering over a tab</p>
            </div>
            <Checkbox
              checked={appearanceConfig.tabPreviewThumbnails}
              onChange={(checked) => handleChange('tabPreviewThumbnails', checked)}
              aria-label="Tab Preview Thumbnails"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
            <div>
              <h4 className="font-medium text-gray-900">Color Accents</h4>
              <p className="text-sm text-gray-500 mt-1">Apply module colors to tabs</p>
            </div>
            <Checkbox
              checked={appearanceConfig.colorAccents}
              onChange={(checked) => handleChange('colorAccents', checked)}
              aria-label="Color Accents"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AppearanceTab;
