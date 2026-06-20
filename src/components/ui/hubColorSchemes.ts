// ABOUTME: Centralized module-to-color-scheme mapping for hub pages
// ABOUTME: Ensures consistent tab coloring per module identity

import type { ColorScheme } from '@/core/types/hub';

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
};

export function getModuleColorScheme(moduleId: string): ColorScheme {
  return MODULE_COLOR_SCHEMES[moduleId] ?? 'slate';
}
