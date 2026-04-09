# Modularity Examples

## Complete Module Example

Here's a complete example of a module following the new architecture:

### 1. Module Structure

```
src/modules/analytics/
├── module.json           # Module metadata
├── index.ts             # Module registration
├── components/
│   ├── Dashboard.tsx    # Main component
│   └── Reports.tsx      # Sub-component
├── hooks/
│   └── useAnalytics.ts  # Module-specific hook
├── services/
│   └── AnalyticsService.ts
└── types.ts             # Module types
```

### 2. Module Metadata (module.json)

```json
{
  "$schema": "../../schemas/module-schema.json",
  "id": "analytics",
  "name": "Analytics & Reporting",
  "version": "1.0.0",
  "description": "Provides analytics dashboards and reports for school data",
  "dependencies": [
    {
      "moduleId": "administration",
      "version": "^1.0.0",
      "required": true,
      "reason": "Requires students, staff, and class data",
      "imports": ["students", "staff", "classes"]
    },
    {
      "moduleId": "academics",
      "version": "^1.0.0",
      "required": false,
      "reason": "Academic performance analytics"
    }
  ],
  "provides": {
    "entities": ["Dashboard", "Report", "Metric"],
    "services": ["AnalyticsService", "ReportGenerator"],
    "hooks": ["useAnalytics", "useReports"],
    "routes": ["/analytics/*"]
  },
  "capabilities": {
    "offlineSupport": true,
    "requiresBackend": false,
    "multiTenant": false
  },
  "config": {
    "defaultDashboard": "overview",
    "refreshInterval": 300,
    "enableRealTime": false
  }
}
```

### 3. Service Implementation

```typescript
// src/modules/analytics/services/AnalyticsService.ts
import { sharedDataStore } from '@/services/data/SharedDataStore';
import type { Student, Staff } from '@/core/types/shared';

export interface AnalyticsData {
  studentCount: number;
  staffCount: number;
  classCount: number;
  averageAttendance: number;
}

export class AnalyticsService {
  private cache: Map<string, AnalyticsData> = new Map();
  
  async getOverview(): Promise<AnalyticsData> {
    const cacheKey = 'overview';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const students = sharedDataStore.getStudents();
    const staff = sharedDataStore.getStaff();
    
    const data: AnalyticsData = {
      studentCount: students.length,
      staffCount: staff.length,
      classCount: 0, // Would come from shared data
      averageAttendance: this.calculateAverageAttendance(students)
    };
    
    this.cache.set(cacheKey, data);
    return data;
  }
  
  private calculateAverageAttendance(students: Student[]): number {
    if (students.length === 0) return 0;
    // Calculate attendance logic
    return 95.5; // Placeholder
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

### 4. React Hooks

```typescript
// src/modules/analytics/hooks/useAnalytics.ts
import { useState, useEffect, useCallback } from 'react';
import { useService } from '@/hooks/useService';
import { useSharedStudents, useSharedStaff } from '@/hooks/useSharedData';
import type { AnalyticsData } from '../services/AnalyticsService';

export function useAnalytics() {
  const { service, isReady } = useService<import('../services/AnalyticsService').AnalyticsService>({
    moduleId: 'analytics',
    name: 'AnalyticsService'
  });
  
  const { students } = useSharedStudents();
  const { staff } = useSharedStaff();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const refresh = useCallback(async () => {
    if (!service) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const overview = await service.getOverview();
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [service]);
  
  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, students, staff, refresh]);
  
  return {
    data,
    isLoading,
    error,
    refresh
  };
}
```

### 5. React Components

```typescript
// src/modules/analytics/components/Dashboard.tsx
import { useModule } from '@/hooks/useModule';
import { useAnalytics } from '../hooks/useAnalytics';

export function AnalyticsDashboard() {
  const { isEnabled, isLoading: moduleLoading } = useModule('analytics', {
    autoEnable: true
  });
  
  const { data, isLoading, error, refresh } = useAnalytics();
  
  if (moduleLoading) return <div>Initializing analytics...</div>;
  if (!isEnabled) return <div>Analytics module is disabled</div>;
  if (isLoading) return <div>Loading data...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No data available</div>;
  
  return (
    <div className="analytics-dashboard">
      <h1>School Analytics</h1>
      <div className="metrics-grid">
        <MetricCard 
          title="Total Students" 
          value={data.studentCount} 
        />
        <MetricCard 
          title="Total Staff" 
          value={data.staffCount} 
        />
        <MetricCard 
          title="Avg Attendance" 
          value={`${data.averageAttendance}%`} 
        />
      </div>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <p className="metric-value">{value}</p>
    </div>
  );
}
```

### 6. Module Registration

```typescript
// src/modules/analytics/index.ts
import { modularSystem } from '@/core/ModularSystem';
import { AnalyticsService } from './services/AnalyticsService';
import { useAnalytics } from './hooks/useAnalytics';
import { AnalyticsDashboard } from './components/Dashboard';
import moduleMetadata from './module.json';

export * from './components/Dashboard';
export * from './hooks/useAnalytics';
export * from './services/AnalyticsService';

export function registerAnalyticsModule() {
  modularSystem.registerModule({
    module: {
      id: moduleMetadata.id,
      metadata: moduleMetadata,
      definition: null
    },
    hooks: {
      onEnable: async (ctx) => {
        console.log('Analytics module enabled');
        // Initialize analytics tracking
      },
      onDisable: async (ctx) => {
        console.log('Analytics module disabled');
        // Cleanup tracking
      }
    },
    services: [
      {
        name: 'AnalyticsService',
        moduleId: moduleMetadata.id,
        factory: () => new AnalyticsService(),
        singleton: true
      }
    ],
    exports: {
      services: new Map([['AnalyticsService', AnalyticsService]]),
      hooks: new Map([['useAnalytics', useAnalytics]]),
      components: new Map([['AnalyticsDashboard', AnalyticsDashboard]])
    }
  });
}

// Auto-register if module is enabled
if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
  registerAnalyticsModule();
}
```

### 7. Lazy Loading Example

```typescript
// src/App.tsx
import { useLazyModule } from '@/hooks/useLazyModule';
import { Suspense, lazy } from 'react';

// Lazy load the analytics module
const AnalyticsDashboard = lazy(() => 
  import('@/modules/analytics').then(m => ({ 
    default: m.AnalyticsDashboard 
  }))
);

function App() {
  const { 
    load, 
    isLoaded, 
    isLoading, 
    progress 
  } = useLazyModule('analytics', {
    preload: true,
    preloadDelay: 2000
  });
  
  return (
    <div>
      <nav>
        <button onClick={() => load()} disabled={isLoading}>
          {isLoading ? `Loading ${progress}%` : 'Open Analytics'}
        </button>
      </nav>
      
      {isLoaded && (
        <Suspense fallback={<div>Loading component...</div>}>
          <AnalyticsDashboard />
        </Suspense>
      )}
    </div>
  );
}
```

### 8. Feature Flags Integration

```typescript
// src/config/features.ts
export const features = {
  // Existing flags
  useSharedDataHook: import.meta.env?.VITE_USE_SHARED_DATA_HOOK === 'true',
  
  // New module flags
  enableAnalytics: import.meta.env?.VITE_ENABLE_ANALYTICS === 'true',
  enableAdvancedReports: import.meta.env?.VITE_ENABLE_ADVANCED_REPORTS === 'true',
};

// src/modules/analytics/index.ts
import { features } from '@/config/features';

export function registerAnalyticsModule() {
  if (!features.enableAnalytics) {
    console.log('Analytics module disabled by feature flag');
    return;
  }
  
  modularSystem.registerModule({
    // ... registration
  });
}
```

### 9. Testing the Module

```typescript
// src/modules/analytics/__tests__/AnalyticsService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../services/AnalyticsService';
import { sharedDataStore } from '@/services/data/SharedDataStore';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  
  beforeEach(() => {
    service = new AnalyticsService();
    
    // Mock shared data
    vi.spyOn(sharedDataStore, 'getStudents').mockReturnValue([
      { id: '1', name: 'Student 1', admno: '001', class: '10A' },
      { id: '2', name: 'Student 2', admno: '002', class: '10B' }
    ] as any);
    
    vi.spyOn(sharedDataStore, 'getStaff').mockReturnValue([
      { id: '1', name: 'Teacher 1' }
    ] as any);
  });
  
  it('should calculate student count', async () => {
    const data = await service.getOverview();
    expect(data.studentCount).toBe(2);
  });
  
  it('should cache results', async () => {
    const data1 = await service.getOverview();
    const data2 = await service.getOverview();
    expect(data1).toBe(data2); // Same reference
  });
});
```

```typescript
// src/modules/analytics/__tests__/useAnalytics.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../hooks/useAnalytics';
import { modularSystem } from '@/core/ModularSystem';

describe('useAnalytics', () => {
  it('should return analytics data', async () => {
    // Register module first
    modularSystem.registerService({
      name: 'AnalyticsService',
      moduleId: 'analytics',
      factory: () => ({
        getOverview: async () => ({
          studentCount: 100,
          staffCount: 20,
          classCount: 10,
          averageAttendance: 95
        })
      }),
      singleton: true
    });
    
    const { result } = renderHook(() => useAnalytics());
    
    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
    
    expect(result.current.data?.studentCount).toBe(100);
  });
});
```

## More Examples

### Example: Module with Dependencies

```typescript
// Finance module depends on Administration
const financeModule = {
  module: {
    id: 'finance',
    metadata: {
      id: 'finance',
      name: 'Finance',
      version: '1.0.0',
      dependencies: [
        { moduleId: 'administration', version: '^1.0.0', required: true }
      ]
    },
    definition: null
  },
  services: [
    {
      name: 'PaymentService',
      moduleId: 'finance',
      factory: () => new PaymentService(),
      dependencies: ['administration.StudentService']
    }
  ]
};
```

### Example: Conditional Module Loading

```typescript
// Load module only if user has permission
function useConditionalModule(moduleId: string, hasPermission: boolean) {
  const { load, isLoaded } = useLazyModule(moduleId);
  
  useEffect(() => {
    if (hasPermission && !isLoaded) {
      load();
    }
  }, [hasPermission, isLoaded, load]);
  
  return { isLoaded };
}

// Usage
function AdminPanel({ user }) {
  const { isLoaded } = useConditionalModule(
    'advanced-reports', 
    user.role === 'admin'
  );
  
  return isLoaded ? <AdvancedReports /> : <BasicReports />;
}
```

### Example: Module Chunks

```typescript
// Register chunks for progressive loading
moduleBundler.registerChunks([
  {
    id: 'analytics-core',
    moduleId: 'analytics',
    url: '/chunks/analytics-core.js',
    size: 50000,
    priority: 'critical',
    dependencies: []
  },
  {
    id: 'analytics-charts',
    moduleId: 'analytics',
    url: '/chunks/analytics-charts.js',
    size: 100000,
    priority: 'normal',
    dependencies: ['analytics-core']
  }
]);

// Load critical chunks first
await moduleBundler.loadModuleChunks('analytics');
```

## See Also

- [Migration Guide](./modularity-migration-guide.md)
- [Architecture Overview](./modularity-improvements-progress.md)
- [API Reference](./modularity-api-reference.md)
