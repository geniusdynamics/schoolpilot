// ABOUTME: Shared type definitions for hub-and-spoke page architecture
// ABOUTME: HubTab, HubConfig, and ColorScheme types used across all hub pages

import React from 'react';

export interface HubTab<T extends string = string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType<{}>;
}

export type ColorScheme = 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose' | 'green' | 'teal' | 'cyan' | 'purple' | 'orange' | 'slate';

export interface HubConfig<T extends string = string> {
  module: string;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  basePath: string;
  defaultTab: T;
  tabs: HubTab<T>[];
  colorScheme?: ColorScheme;
  persistKey?: string;
}
