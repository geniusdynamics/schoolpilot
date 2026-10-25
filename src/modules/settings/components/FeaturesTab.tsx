// ABOUTME: The Features tab of Settings: the switches that change something the user sees - the two header indicators, the
// ABOUTME: connection notices and the performance monitor. Each is read by something; a flag nothing reads is not offered.

import React from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import type { UnifiedAppConfig } from '@/config/configManager';
import { useUnifiedConfig } from '@/hooks/useUnifiedConfig';

import { useSettingsAccess } from '../hooks/useSettingsAccess';

/**
 * The flags offered, each read where it says. The configuration holds more than these, but
 * nothing reads the others, so a switch for them would do nothing.
 */
type FeatureKey =
  | 'networkStatusIndicator' // components/Header: the online indicator
  | 'moduleHealthIndicator' // components/Header: the module health indicator
  | 'globalNotifications' // routing/AppContent: the connection and sync notices
  | 'performanceMonitorWidget'; // routing/AppContent: the floating performance monitor

const CHECKBOX_CLASS = 'mt-1 h-4 w-4 shrink-0 text-primary-600 border-surface-border rounded focus:ring-primary-500';

export const FeaturesTab: React.FC = () => {
  const { t } = useTranslation('settings');
  const { config, updateConfig } = useUnifiedConfig();
  const { can } = useSettingsAccess();
  const mayChange = can('settings.manage');

  // The configuration's declared type lags the flags it really holds; this reads only the four above.
  const flags = config.features as Partial<Record<FeatureKey, boolean>>;

  const switches: ReadonlyArray<{ key: FeatureKey; label: string; description: string }> = [
    {
      key: 'networkStatusIndicator',
      label: t('features.networkStatus.label', 'Network status in the header'),
      description: t('features.networkStatus.description', 'Shows in the header whether this device is online.'),
    },
    {
      key: 'moduleHealthIndicator',
      label: t('features.moduleHealth.label', 'Module health in the header'),
      description: t('features.moduleHealth.description', 'Shows in the header how the modules are loading, and whether any has failed.'),
    },
    {
      key: 'globalNotifications',
      label: t('features.notices.label', 'Connection and sync notices'),
      description: t(
        'features.notices.description',
        'Tells people when the device goes offline or sync needs attention. Not shown in demo mode.'
      ),
    },
    {
      key: 'performanceMonitorWidget',
      label: t('features.performance.label', 'Performance monitor'),
      description: t(
        'features.performance.description',
        'A floating panel showing how the app is performing, for finding out why it is slow.'
      ),
    },
  ];

  // updateConfig replaces whole sections of the configuration, so the section is written whole.
  const change = (key: FeatureKey, value: boolean) =>
    updateConfig({ features: { ...config.features, [key]: value } as UnifiedAppConfig['features'] });

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-muted-fg">
        {t('features.intro', 'Switches that change what people see. A change applies straight away, on this installation.')}
      </p>

      {!mayChange && (
        <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {t('features.readOnly', 'You can see these switches but not change them. Ask an administrator.')}
        </p>
      )}

      <Card>
        <ul className="divide-y divide-surface-border">
          {switches.map(({ key, label, description }) => (
            <li key={key} className="flex items-start justify-between gap-4 py-3">
              <div>
                <label htmlFor={`feature-${key}`} className="text-sm font-medium text-surface-foreground">
                  {label}
                </label>
                <p className="text-xs text-surface-muted-fg">{description}</p>
              </div>
              <input
                id={`feature-${key}`}
                type="checkbox"
                checked={Boolean(flags[key])}
                disabled={!mayChange}
                onChange={(event) => change(key, event.target.checked)}
                className={CHECKBOX_CLASS}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default FeaturesTab;
