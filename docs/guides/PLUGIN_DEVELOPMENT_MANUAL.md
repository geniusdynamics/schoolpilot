# Plugin Development Manual

## Complete Guide to Building Plugins for SchoolPilot3

This manual provides comprehensive guidance for developing plugins that extend SchoolPilot3's functionality. It covers everything from basic plugin structure to advanced topics like Go WASM integration.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Structure](#plugin-structure)
3. [Plugin Manifest](#plugin-manifest)
4. [Plugin Lifecycle](#plugin-lifecycle)
5. [The Plugin API](#the-plugin-api)
6. [Hook System](#hook-system)
7. [UI Integration](#ui-integration)
8. [Data Access](#data-access)
9. [Settings & Configuration](#settings--configuration)
10. [Testing Plugins](#testing-plugins)
11. [Publishing to Marketplace](#publishing-to-marketplace)
12. [Advanced Topics](#advanced-topics)
13. [Examples](#examples)
14. [API Reference](#api-reference)

---

## Getting Started

### Prerequisites

- Node.js 18+
- TypeScript 5.0+
- Familiarity with React hooks
- Understanding of SchoolPilot3's module system

### Quick Start

1. **Create plugin directory**
```bash
mkdir -p src/plugins/my-awesome-plugin
cd src/plugins/my-awesome-plugin
```

2. **Create the entry file**
```typescript
// index.ts
import type { PluginManifest, PluginModule, PluginContext } from '../types';

export const manifest: PluginManifest = {
  id: 'com.mycompany.my-awesome-plugin',
  name: 'My Awesome Plugin',
  version: '1.0.0',
  type: 'module',
  entry: './index.ts',
  description: 'An awesome plugin that does something great',
};

const module: PluginModule = {
  async activate(context: PluginContext) {
    console.log('Plugin activated!');
    // Your plugin logic here
  },
};

export default { manifest, module };
```

3. **Test your plugin**
```typescript
// In your app initialization
import { getPlugins } from '../plugins';
import myPlugin from '../plugins/my-awesome-plugin';

const manager = getPlugins();
await manager.loadPlugin(myPlugin.manifest);
```

---

## Plugin Structure

### Recommended Directory Layout

```
my-plugin/
├── index.ts              # Entry point and manifest
├── components/           # React components
│   ├── MainPage.tsx
│   └── SettingsPanel.tsx
├── hooks/               # Custom hooks
│   └── usePluginData.ts
├── utils/               # Utility functions
│   └── helpers.ts
├── types.ts             # Plugin-specific types
├── api/                 # API integrations
│   └── externalApi.ts
├── assets/              # Static assets
│   ├── icon.svg
│   └── logo.png
└── tests/               # Test files
    └── plugin.test.ts
```

---

## Plugin Manifest

### Required Fields

```typescript
const manifest: PluginManifest = {
  // Unique identifier - use reverse domain notation
  id: 'com.company.plugin-name',
  
  // Human-readable name
  name: 'My Plugin',
  
  // Semantic version
  version: '1.0.0',
  
  // Plugin type
  type: 'module',
  
  // Entry point relative to plugin directory
  entry: './index.ts',
};
```

### Complete Manifest Example

```typescript
const manifest: PluginManifest = {
  id: 'com.schoolpilot.advanced-reports',
  name: 'Advanced Reports',
  version: '2.0.0',
  type: 'module',
  entry: './index.ts',
  
  // Metadata
  description: 'Generate custom reports with templates',
  author: 'SchoolPilot3 Team',
  license: 'MIT',
  homepage: 'https://schoolpilot3.com/plugins/advanced-reports',
  repository: 'https://github.com/schoolpilot3/advanced-reports',
  icon: './assets/icon.svg',
  category: 'verified',
  
  // Compatibility
  minAppVersion: '1.0.0',
  maxAppVersion: '2.0.0',
  requires: ['reports@^1.0.0', 'academics@^1.0.0'],
  conflicts: ['basic-reports'],
  
  // Permissions
  permissions: ['data:read', 'data:export'],
  privileges: {
    dataRead: ['students', 'grades', 'attendance'],
    dataWrite: [],
    uiInject: true,
    menuModify: true,
    networkAccess: true,
  },
  
  // Hooks
  hooks: ['report.generate', 'data.export'],
  provides: ['report.template.custom'],
  
  // UI Integration
  routes: [
    {
      path: '/reports/advanced',
      component: 'AdvancedReportsPage',
      title: 'Advanced Reports',
      icon: 'DocumentChartBarIcon',
      permissions: ['reports.view'],
    },
  ],
  
  menuItems: [
    {
      id: 'advanced-reports',
      label: 'Advanced Reports',
      icon: 'DocumentChartBarIcon',
      route: '/reports/advanced',
      order: 50,
      parent: 'reports',
    },
  ],
  
  widgets: [
    {
      id: 'report-summary-widget',
      name: 'Report Summary',
      description: 'Shows recent report summary',
      component: 'ReportSummaryWidget',
      defaultSize: { w: 2, h: 2 },
      category: 'reports',
    },
  ],
  
  // Settings
  settings: [
    {
      key: 'defaultFormat',
      label: 'Default Export Format',
      type: 'select',
      defaultValue: 'pdf',
      options: [
        { label: 'PDF', value: 'pdf' },
        { label: 'Excel', value: 'xlsx' },
        { label: 'CSV', value: 'csv' },
      ],
    },
    {
      key: 'includeHeader',
      label: 'Include Header Logo',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'customTemplate',
      label: 'Custom Template',
      type: 'file',
      description: 'Upload a custom report template',
    },
  ],
  
  // Marketplace
  marketplace: {
    price: 29.99,
    currency: 'USD',
    featured: true,
  },
};
```

---

## Plugin Lifecycle

### Lifecycle Hooks

```typescript
const module: PluginModule = {
  // Called when plugin is first installed
  async install(context: PluginContext) {
    // Initialize database tables
    // Create default settings
    // Run migrations
  },
  
  // Called when plugin is activated
  async activate(context: PluginContext) {
    // Register hooks
    // Start services
    // Initialize state
  },
  
  // Called when plugin is deactivated
  async deactivate(context: PluginContext) {
    // Unregister hooks
    // Stop services
    // Clean up resources
  },
  
  // Called when plugin is uninstalled
  async uninstall(context: PluginContext) {
    // Remove data
    // Clean up settings
  },
};
```

### Lifecycle Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Install   │────►│   Load      │────►│   Activate  │
│             │     │             │     │             │
│ install()   │     │ (manifest)  │     │ activate()  │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Uninstall  │◄────│   Unload    │◄────│  Deactivate │
│             │     │             │     │             │
│ uninstall() │     │ (cleanup)   │     │ deactivate()│
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## The Plugin API

### Context Object

The `PluginContext` provides access to the plugin's environment:

```typescript
interface PluginContext {
  pluginId: string;              // Your plugin ID
  manifest: PluginManifest;      // Your manifest
  settings: Record<string, any>; // Current settings
  api: PluginAPI;                // API interface
}
```

### PluginAPI Methods

#### Data Access

```typescript
// Read data from collections
const students = await context.api.getData('students', {
  grade: '10A',
  status: 'active',
});

// Write data to collections
await context.api.setData('students', 'student-123', {
  name: 'John Doe',
  grade: '10A',
});
```

#### UI Integration

```typescript
// Register routes dynamically
context.api.registerRoute({
  path: '/my-plugin/custom',
  component: 'CustomPage',
  title: 'Custom Page',
});

// Register menu items
context.api.registerMenuItem({
  id: 'my-menu-item',
  label: 'My Feature',
  icon: 'StarIcon',
  route: '/my-plugin/custom',
});

// Show notifications
context.api.showNotification('Operation successful!', 'success');
context.api.showNotification('Something went wrong', 'error');
```

#### Settings Management

```typescript
// Get a setting value
const apiKey = context.api.getSetting('apiKey');
const maxRetries = context.api.getSetting('maxRetries') ?? 3;

// Update a setting
await context.api.setSetting('lastSync', new Date().toISOString());
```

#### Utilities

```typescript
// Translation
const label = context.api.translate('plugins.myPlugin.welcome');

// Date formatting
const formatted = context.api.formatDate(new Date());

// Number formatting
const formatted = context.api.formatNumber(1234.56);
```

---

## Hook System

### Registering Hooks

```typescript
const module: PluginModule = {
  async activate(context: PluginContext) {
    // Register a hook with priority
    context.api.addHook('grading.beforeCalculate', (students, config) => {
      console.log(`Processing ${students.length} students`);
      return students; // Return modified or original data
    }, 10); // Priority: lower runs first
    
    // Multiple hooks
    context.api.addHook('data.beforeSave', validateData, 5);
    context.api.addHook('data.beforeSave', transformData, 10);
  },
};
```

### Hook Types and Behavior

#### Action Hooks
Execute side effects without returning data:

```typescript
context.api.addHook('plugin.activate', (pluginId) => {
  console.log(`Plugin ${pluginId} was activated`);
  // No return value needed
});
```

#### Filter Hooks
Transform data and return the modified version:

```typescript
context.api.addHook('ui.menu.beforeRender', (menuItems) => {
  // Add a new menu item
  return [
    ...menuItems,
    { id: 'my-item', label: 'My Item', route: '/my' },
  ];
});
```

#### Apply Hooks
First non-null result wins (for overriding):

```typescript
context.api.addHook('ui.branding.logo', (theme) => {
  if (theme === 'dark') {
    return '/my-dark-logo.png';
  }
  return null; // Let other hooks handle light theme
});
```

### Available Hooks

| Hook | Type | Parameters | Return |
|------|------|------------|--------|
| `ui.branding.header` | filter | defaultBranding | BrandingState |
| `ui.branding.title` | filter | defaultTitle | string |
| `ui.branding.logo` | apply | theme | string \| null |
| `ui.label.resolve` | filter | key, defaultLabel | string |
| `ui.menu.beforeRender` | filter | menuItems | MenuItem[] |
| `data.beforeSave` | filter | collection, data | data |
| `data.afterLoad` | filter | collection, data | data |
| `grading.beforeCalculate` | filter | students, config | students |
| `grading.afterCalculate` | filter | results | results |
| `fees.beforeCalculate` | filter | input | input |
| `fees.afterCalculate` | filter | result | result |
| `report.generate` | filter | template, data | report |

---

## UI Integration

### Registering Routes

```typescript
// In manifest
routes: [
  {
    path: '/my-plugin/dashboard',
    component: 'DashboardPage',  // Component name
    title: 'My Dashboard',
    icon: 'HomeIcon',
    permissions: ['my-plugin.view'],
    parent: '/my-plugin',  // Optional parent route
  },
],
```

### Creating Components

```typescript
// components/DashboardPage.tsx
import React from 'react';
import { usePlugins } from '../../../plugins/usePlugins';

export const DashboardPage: React.FC = () => {
  const { getPlugin } = usePlugins();
  const plugin = getPlugin('com.mycompany.my-plugin');
  const settings = plugin?.settings || {};
  
  return (
    <div className="p-6">
      <h1>My Plugin Dashboard</h1>
      <p>Setting value: {settings.mySetting}</p>
    </div>
  );
};
```

### Registering Widgets

```typescript
// In manifest
widgets: [
  {
    id: 'my-widget',
    name: 'My Widget',
    description: 'Displays important information',
    component: 'MyWidget',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    category: 'general',
  },
],
```

### Widget Component

```typescript
// components/MyWidget.tsx
import React from 'react';

interface MyWidgetProps {
  isEditing?: boolean;
  onConfigure?: () => void;
}

export const MyWidget: React.FC<MyWidgetProps> = ({ isEditing, onConfigure }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">My Widget</h3>
        {isEditing && (
          <button onClick={onConfigure} className="text-sm text-primary-600">
            Configure
          </button>
        )}
      </div>
      <div className="text-gray-600 dark:text-gray-300">
        Widget content here
      </div>
    </div>
  );
};
```

---

## Data Access

### Reading Data

```typescript
// Get all students
const students = await context.api.getData('students');

// Query with filters
const activeStudents = await context.api.getData('students', {
  status: 'active',
  grade: '10A',
});

// Access grades
const grades = await context.api.getData('grades', {
  studentId: 'student-123',
  term: 'Term 1',
});
```

### Writing Data

```typescript
// Create new record
await context.api.setData('attendance', 'record-456', {
  studentId: 'student-123',
  date: '2024-01-15',
  status: 'present',
});

// Update existing record
await context.api.setData('students', 'student-123', {
  ...existingStudent,
  grade: '10B',
});
```

### Data Collections

Available collections for plugin access:

| Collection | Description |
|------------|-------------|
| `students` | Student records |
| `teachers` | Teacher records |
| `grades` | Grade entries |
| `attendance` | Attendance records |
| `fees` | Fee records |
| `classes` | Class/section records |
| `subjects` | Subject definitions |
| `users` | User accounts |
| `settings` | Application settings |

---

## Settings & Configuration

### Defining Settings

```typescript
settings: [
  // String input
  {
    key: 'apiKey',
    label: 'API Key',
    type: 'string',
    required: true,
    description: 'Your external API key',
  },
  
  // Number input
  {
    key: 'retryCount',
    label: 'Retry Attempts',
    type: 'number',
    defaultValue: 3,
    validation: { min: 0, max: 10 },
  },
  
  // Boolean toggle
  {
    key: 'enableSync',
    label: 'Enable Auto Sync',
    type: 'boolean',
    defaultValue: true,
  },
  
  // Select dropdown
  {
    key: 'syncInterval',
    label: 'Sync Interval',
    type: 'select',
    defaultValue: 'hourly',
    options: [
      { label: 'Every 15 minutes', value: '15min' },
      { label: 'Hourly', value: 'hourly' },
      { label: 'Daily', value: 'daily' },
    ],
  },
  
  // Multi-select
  {
    key: 'enabledFeatures',
    label: 'Enabled Features',
    type: 'multiselect',
    options: [
      { label: 'Import', value: 'import' },
      { label: 'Export', value: 'export' },
      { label: 'Sync', value: 'sync' },
    ],
  },
  
  // Color picker
  {
    key: 'brandColor',
    label: 'Brand Color',
    type: 'color',
    defaultValue: '#3B82F6',
  },
  
  // File upload
  {
    key: 'logo',
    label: 'Custom Logo',
    type: 'file',
    description: 'Upload a logo (PNG, max 500KB)',
  },
  
  // JSON editor
  {
    key: 'customConfig',
    label: 'Custom Configuration',
    type: 'json',
    defaultValue: { enabled: true },
    description: 'Advanced JSON configuration',
  },
],
```

### Validation

```typescript
{
  key: 'studentLimit',
  label: 'Student Limit',
  type: 'number',
  validation: {
    min: 1,
    max: 10000,
    pattern: '^[0-9]+$', // Regex pattern
  },
},
```

---

## Testing Plugins

### Unit Tests

```typescript
// tests/plugin.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager } from '../PluginManager';
import myPlugin from '../index';

describe('My Plugin', () => {
  let manager: PluginManager;
  
  beforeEach(() => {
    manager = new PluginManager();
  });
  
  it('should load successfully', async () => {
    const plugin = await manager.loadPlugin(myPlugin.manifest);
    expect(plugin.status).toBe('active');
  });
  
  it('should register hooks on activate', async () => {
    await manager.loadPlugin(myPlugin.manifest);
    const results = manager.doHook('grading.beforeCalculate', [{ id: 1 }]);
    expect(results).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// tests/integration.test.tsx
import { render, screen } from '@testing-library/react';
import { PluginsProvider } from '../PluginsProvider';
import { MyComponent } from '../components/MyComponent';

describe('My Plugin Integration', () => {
  it('should render plugin UI', () => {
    render(
      <PluginsProvider>
        <MyComponent />
      </PluginsProvider>
    );
    
    expect(screen.getByText('My Plugin')).toBeInTheDocument();
  });
});
```

---

## Publishing to Marketplace

### Prepare Package

1. **Build your plugin**
```bash
npm run build
```

2. **Create package manifest**
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "files": ["dist/", "assets/", "README.md"]
}
```

3. **Sign the package**
```bash
sp3 sign --key ~/.sp3/private.key
```

### Submit to Marketplace

```bash
# Using CLI
sp3 publish --registry https://marketplace.schoolpilot3.com

# Or via API
curl -X POST https://marketplace.schoolpilot3.com/api/v1/plugins \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "package=@my-plugin.tar.gz"
```

### Marketplace Requirements

- [ ] Valid manifest with all required fields
- [ ] Semantic versioning
- [ ] Signed package
- [ ] README with usage instructions
- [ ] License specified
- [ ] Minimum SchoolPilot version declared

---

## Advanced Topics

### Go WASM Integration

For high-performance computations, create a Go-based engine plugin:

1. **Create Go module**
```go
// internal/myengine/calculator.go
package myengine

type Calculator struct {
    config Config
}

func (c *Calculator) Process(input []Data) []Result {
    // High-performance calculation
}
```

2. **Export to WASM**
```go
// cmd/wasm/main.go
package main

import (
    "syscall/js"
    "myplugin/internal/myengine"
)

func main() {
    calc := myengine.NewCalculator()
    
    js.Global().Set("myPluginProcess", js.FuncOf(
        func(this js.Value, args []js.Value) interface{} {
            input := parseInput(args[0].String())
            result := calc.Process(input)
            return js.ValueOf(toJSON(result))
        },
    ))
    
    select {} // Keep running
}
```

3. **Build for WASM**
```bash
GOOS=wasip1 GOARCH=wasm go build -o myplugin.wasm ./cmd/wasm
```

4. **Configure in manifest**
```typescript
engine: {
  wasmFile: '/wasm/myplugin.wasm',
  exports: ['myPluginProcess'],
  fallbackBehavior: 'fallback',
}
```

### React Hooks

Create custom hooks for your plugin:

```typescript
// hooks/useMyPlugin.ts
import { useMemo } from 'react';
import { usePlugins } from '../../plugins/usePlugins';

export function useMyPlugin() {
  const { getPlugin, doHook } = usePlugins();
  const plugin = getPlugin('com.mycompany.my-plugin');
  
  return useMemo(() => ({
    isLoaded: !!plugin,
    isActive: plugin?.status === 'active',
    settings: plugin?.settings || {},
    process: async (data: any) => {
      // Use plugin API
      return doHook('myplugin.process', data);
    },
  }), [plugin, doHook]);
}
```

---

## Examples

### Complete Plugin Example: Attendance Tracker

```typescript
// index.ts
import type { PluginManifest, PluginModule, PluginContext } from '../types';

export const manifest: PluginManifest = {
  id: 'com.example.attendance-tracker',
  name: 'Attendance Tracker',
  version: '1.0.0',
  type: 'module',
  entry: './index.ts',
  description: 'Track and analyze student attendance',
  
  hooks: ['data.afterLoad', 'attendance.calculate'],
  
  routes: [
    {
      path: '/attendance/tracker',
      component: 'AttendanceTrackerPage',
      title: 'Attendance Tracker',
      icon: 'ClipboardDocumentCheckIcon',
    },
  ],
  
  menuItems: [
    {
      id: 'attendance-tracker',
      label: 'Attendance Tracker',
      icon: 'ClipboardDocumentCheckIcon',
      route: '/attendance/tracker',
      order: 30,
      parent: 'academics',
    },
  ],
  
  settings: [
    {
      key: 'alertThreshold',
      label: 'Alert Threshold (%)',
      type: 'number',
      defaultValue: 80,
      validation: { min: 0, max: 100 },
      description: 'Alert when attendance falls below this threshold',
    },
    {
      key: 'notifyParents',
      label: 'Notify Parents',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

const module: PluginModule = {
  async activate(context: PluginContext) {
    // Register attendance calculation hook
    context.api.addHook('attendance.calculate', async (studentId, period) => {
      const records = await context.api.getData('attendance', { studentId, period });
      const present = records.filter(r => r.status === 'present').length;
      const total = records.length;
      
      const percentage = (present / total) * 100;
      const threshold = context.api.getSetting('alertThreshold') ?? 80;
      
      if (percentage < threshold && context.api.getSetting('notifyParents')) {
        context.api.showNotification(
          `Low attendance alert for student ${studentId}`,
          'warning'
        );
      }
      
      return { present, total, percentage };
    });
  },
  
  async deactivate() {
    console.log('Attendance Tracker deactivated');
  },
  
  api: {
    calculateAttendance: async (studentId: string, period: string) => {
      // Exposed API for other plugins
    },
  },
};

export default { manifest, module };
```

---

## API Reference

### PluginManager

```typescript
class PluginManager {
  // Load a plugin
  async loadPlugin(manifest: PluginManifest): Promise<LoadedPlugin>;
  
  // Load multiple plugins
  async loadPlugins(manifests: PluginManifest[]): Promise<LoadedPlugin[]>;
  
  // Activate/deactivate
  async activatePlugin(pluginId: string): Promise<void>;
  async deactivatePlugin(pluginId: string): Promise<void>;
  
  // Unload
  async unloadPlugin(pluginId: string): Promise<void>;
  
  // Access
  getPlugin(pluginId: string): LoadedPlugin | undefined;
  getAllPlugins(): LoadedPlugin[];
  getActivePlugins(): LoadedPlugin[];
  getPluginsByType(type: PluginType): LoadedPlugin[];
  
  // Hooks
  addHook(name: string, handler: Function, priority?: number): void;
  removeHook(name: string, handler: Function): void;
  doHook<T>(name: string, ...args: any[]): T[];
  applyHook<T>(name: string, ...args: any[]): T | undefined;
  
  // Settings
  getPluginSettings(pluginId: string): Record<string, any>;
  async setPluginSetting(pluginId: string, key: string, value: any): Promise<void>;
}
```

### PluginAPI

```typescript
interface PluginAPI {
  // Data
  getData(collection: string, query?: any): Promise<any[]>;
  setData(collection: string, id: string, data: any): Promise<void>;
  
  // UI
  registerRoute(route: PluginRoute): void;
  registerMenuItem(item: PluginMenuItem): void;
  registerWidget(widget: PluginWidget): void;
  showNotification(message: string, type?: NotificationType): void;
  
  // Hooks
  addHook(name: string, handler: Function, priority?: number): void;
  removeHook(name: string, handler: Function): void;
  doHook(name: string, ...args: any[]): any[];
  
  // Settings
  getSetting(key: string): any;
  setSetting(key: string, value: any): Promise<void>;
  
  // Utils
  translate(key: string, options?: any): string;
  formatDate(date: Date | string): string;
  formatNumber(num: number): string;
}
```

---

## Support & Resources

- **Documentation**: [docs.schoolpilot3.com/plugins](https://docs.schoolpilot3.com/plugins)
- **API Reference**: [api.schoolpilot3.com/docs](https://api.schoolpilot3.com/docs)
- **Community**: [github.com/schoolpilot3/discussions](https://github.com/schoolpilot3/discussions)
- **Issue Tracker**: [github.com/schoolpilot3/issues](https://github.com/schoolpilot3/issues)

---

*Last updated: April 2026*
*Version: 1.0*

```typescript
// hooks/useMyPlugin.ts
import { useMemo } from 'react';
import { usePlugins } from '../../plugins/usePlugins';

export function useMyPlugin() {
  const { getPlugin, doHook } = usePlugins();
  const plugin = getPlugin('com.mycompany.my-plugin');
  
  return useMemo(() => ({
    isLoaded: !!plugin,
    isActive: plugin?.status === 'active',
    settings: plugin?.settings || {},
    process: async (data: any) => {
      // Use plugin API
      return doHook('myplugin.process', data);
    },
  }), [plugin, doHook]);
}
```

---

## Examples

### Complete Plugin Example: Attendance Tracker

```typescript
// index.ts
import type { PluginManifest, PluginModule, PluginContext } from '../types';

export const manifest: PluginManifest = {
  id: 'com.example.attendance-tracker',
  name: 'Attendance Tracker',
  version: '1.0.0',
  type: 'module',
  entry: './index.ts',
  description: 'Track and analyze student attendance',
  
  hooks: ['data.afterLoad', 'attendance.calculate'],
  
  routes: [
    {
      path: '/attendance/tracker',
      component: 'AttendanceTrackerPage',
      title: 'Attendance Tracker',
      icon: 'ClipboardDocumentCheckIcon',
    },
  ],
  
  menuItems: [
    {
      id: 'attendance-tracker',
      label: 'Attendance Tracker',
      icon: 'ClipboardDocumentCheckIcon',
      route: '/attendance/tracker',
      order: 30,
      parent: 'academics',
    },
  ],
  
  settings: [
    {
      key: 'alertThreshold',
      label: 'Alert Threshold (%)',
      type: 'number',
      defaultValue: 80,
      validation: { min: 0, max: 100 },
      description: 'Alert when attendance falls below this threshold',
    },
    {
      key: 'notifyParents',
      label: 'Notify Parents',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};

const module: PluginModule = {
  async activate(context: PluginContext) {
    // Register attendance calculation hook
    context.api.addHook('attendance.calculate', async (studentId, period) => {
      const records = await context.api.getData('attendance', { studentId, period });
      const present = records.filter(r => r.status === 'present').length;
      const total = records.length;
      
      const percentage = (present / total) * 100;
      const threshold = context.api.getSetting('alertThreshold') ?? 80;
      
      if (percentage < threshold && context.api.getSetting('notifyParents')) {
        context.api.showNotification(
          `Low attendance alert for student ${studentId}`,
          'warning'
        );
      }
      
      return { present, total, percentage };
    });
  },
  
  async deactivate() {
    console.log('Attendance Tracker deactivated');
  },
  
  api: {
    calculateAttendance: async (studentId: string, period: string) => {
      // Exposed API for other plugins
    },
  },
};

export default { manifest, module };
```

---

## API Reference

### PluginManager

```typescript
class PluginManager {
  // Load a plugin
  async loadPlugin(manifest: PluginManifest): Promise<LoadedPlugin>;
  
  // Load multiple plugins
  async loadPlugins(manifests: PluginManifest[]): Promise<LoadedPlugin[]>;
  
  // Activate/deactivate
  async activatePlugin(pluginId: string): Promise<void>;
  async deactivatePlugin(pluginId: string): Promise<void>;
  
  // Unload
  async unloadPlugin(pluginId: string): Promise<void>;
  
  // Access
  getPlugin(pluginId: string): LoadedPlugin | undefined;
  getAllPlugins(): LoadedPlugin[];
  getActivePlugins(): LoadedPlugin[];
  getPluginsByType(type: PluginType): LoadedPlugin[];
  
  // Hooks
  addHook(name: string, handler: Function, priority?: number): void;
  removeHook(name: string, handler: Function): void;
  doHook<T>(name: string, ...args: any[]): T[];
  applyHook<T>(name: string, ...args: any[]): T | undefined;
  
  // Settings
  getPluginSettings(pluginId: string): Record<string, any>;
  async setPluginSetting(pluginId: string, key: string, value: any): Promise<void>;
}
```

### PluginAPI

```typescript
interface PluginAPI {
  // Data
  getData(collection: string, query?: any): Promise<any[]>;
  setData(collection: string, id: string, data: any): Promise<void>;
  
  // UI
  registerRoute(route: PluginRoute): void;
  registerMenuItem(item: PluginMenuItem): void;
  registerWidget(widget: PluginWidget): void;
  showNotification(message: string, type?: NotificationType): void;
  
  // Hooks
  addHook(name: string, handler: Function, priority?: number): void;
  removeHook(name: string, handler: Function): void;
  doHook(name: string, ...args: any[]): any[];
  
  // Settings
  getSetting(key: string): any;
  setSetting(key: string, value: any): Promise<void>;
  
  // Utils
  translate(key: string, options?: any): string;
  formatDate(date: Date | string): string;
  formatNumber(num: number): string;
}
```

---

## Support & Resources

- **Documentation**: [docs.schoolpilot3.com/plugins](https://docs.schoolpilot3.com/plugins)
- **API Reference**: [api.schoolpilot3.com/docs](https://api.schoolpilot3.com/docs)
- **Community**: [github.com/schoolpilot3/discussions](https://github.com/schoolpilot3/discussions)
- **Issue Tracker**: [github.com/schoolpilot3/issues](https://github.com/schoolpilot3/issues)

---

*Last updated: April 2026*
*Version: 1.0*
*Last updated: April 2026*
*Version: 1.0*
