// ============================================================================
// DEPRECATED: This file is deprecated and will be removed in a future version.
// Please import from '@/components/settings' instead.
// ============================================================================

import { useEffect } from 'react';
import { FeatureSettings as FeatureSettingsNew } from './settings';

export interface FeatureSettingsProps {
  className?: string;
}

/**
 * @deprecated Use FeatureSettings from '@/components/settings' instead.
 * This export is kept for backward compatibility and will be removed in v3.0.
 */
export function FeatureSettings(props: FeatureSettingsProps) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn(
        '[DEPRECATED] Importing FeatureSettings from "@/components/FeatureSettings" is deprecated. ' +
        'Please import from "@/components/settings" instead. ' +
        'This export will be removed in v3.0.'
      );
    }
  }, []);

  return <FeatureSettingsNew {...props} />;
}

export default FeatureSettings;
