// ABOUTME: Behavior tab settings
import React from 'react';
import { useTranslation } from 'react-i18next';
import { default as Card } from '../../../../components/ui/Card';
import { useUnifiedConfig } from '../../../../hooks/useUnifiedConfig';

const BehaviorTab: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { config, updateTabsConfig } = useUnifiedConfig();
  const behaviorConfig = config.tabs?.behavior || { closeButtonVisibility: 'hover', tabScrolling: 'smooth', activationOnHoverTiming: 0, muteUnmuteBehavior: 'click' };

  const handleChange = (key: string, value: string | number) => {
    updateTabsConfig({
      behavior: {
        ...behaviorConfig,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card title="Tab Behavior" className="shadow-sm">
        <div className="space-y-4 p-4">
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Close Button Visibility</label>
            <select 
              className="border border-gray-300 rounded-md p-2"
              value={behaviorConfig.closeButtonVisibility}
              onChange={(e) => handleChange('closeButtonVisibility', e.target.value)}
            >
              <option value="always">Always Show</option>
              <option value="hover">Show on Hover</option>
              <option value="never">Never Show</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Tab Scrolling</label>
            <select 
              className="border border-gray-300 rounded-md p-2"
              value={behaviorConfig.tabScrolling}
              onChange={(e) => handleChange('tabScrolling', e.target.value)}
            >
              <option value="smooth">Smooth Scroll</option>
              <option value="auto">Auto</option>
              <option value="buttons">Scroll Buttons</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label htmlFor="activationOnHoverTiming" className="font-medium text-gray-900">Activation on Hover Timing (ms)</label>
            <input 
              id="activationOnHoverTiming"
              type="number" 
              className="border border-gray-300 rounded-md p-2"
              value={behaviorConfig.activationOnHoverTiming}
              onChange={(e) => handleChange('activationOnHoverTiming', parseInt(e.target.value) || 0)}
              min="0"
            />
            <p className="text-sm text-gray-500">Set to 0 to disable</p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="font-medium text-gray-900">Mute/Unmute Behavior</label>
            <select 
              className="border border-gray-300 rounded-md p-2"
              value={behaviorConfig.muteUnmuteBehavior}
              onChange={(e) => handleChange('muteUnmuteBehavior', e.target.value)}
            >
              <option value="click">Click on Audio Icon</option>
              <option value="context-menu">Context Menu Only</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BehaviorTab;
