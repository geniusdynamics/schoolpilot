// ABOUTME: Centralized module-to-color-scheme mapping
// ABOUTME: Ensures consistent color schemes across all hub pages per module

import { ColorScheme } from '@/core/types/hub';

export const MODULE_COLOR_SCHEMES: Record<string, ColorScheme> = {
  administration: 'blue',
  academics: 'emerald',
  finance: 'amber',
  reports: 'purple',
  hr: 'indigo',
  inventory: 'teal',
  library: 'cyan',
  nutrition: 'green',
  admissions: 'violet',
  settings: 'slate',
  dashboard: 'blue',
};

export function getModuleColorScheme(moduleId: string): ColorScheme {
  return MODULE_COLOR_SCHEMES[moduleId] || 'blue';
}
