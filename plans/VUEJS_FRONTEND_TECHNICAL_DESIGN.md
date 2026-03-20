# SchoolPilot3 Vue.js Frontend Technical Design
## Micro-Frontend Architecture with Unified Shell

**Document Version:** 1.0.0  
**Date:** February 17, 2026  
**Architecture:** Micro-Frontend with Module Federation

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Micro-Frontend Design](#3-micro-frontend-design)
4. [Module Shell (Host)](#4-module-shell-host)
5. [Remote Modules](#5-remote-modules)
6. [Shared Infrastructure](#6-shared-infrastructure)
7. [Component Library](#7-component-library)
8. [State Management](#8-state-management)
9. [API Integration](#9-api-integration)
10. [Routing & Navigation](#10-routing--navigation)
11. [Authentication Flow](#11-authentication-flow)
12. [Internationalization](#12-internationalization)
13. [Module Communication](#13-module-communication)
14. [Deployment Strategy](#14-deployment-strategy)
15. [Performance Optimization](#15-performance-optimization)

---

# 1. EXECUTIVE SUMMARY

## 1.1 Design Goals

1. **Modular Architecture**: Each functional module independently deployable
2. **Unified User Experience**: Single interface despite distributed backend
3. **Technology Agnostic Backends**: Go backend, but abstracted API layer
4. **Scalability**: Add new modules without affecting existing ones
5. **Team Autonomy**: Different teams can work on different modules
6. **Shared Resources**: Common components, utilities, and design system

## 1.2 Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED SHELL (Host)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Layout, Navigation, Auth Shell                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   academics   │    │    finance    │    │      hr      │
│   (Remote)    │    │   (Remote)    │    │   (Remote)   │
│               │    │               │    │               │
│ 独立部署      │    │  独立部署     │    │  独立部署     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                               ▼
                    ┌───────────────────────┐
                    │   Shared Remotes     │
                    │  (Components, Utils) │
                    └───────────────────────┘
```

---

# 2. ARCHITECTURE OVERVIEW

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SHELL APPLICATION (Host)                          │   │
│  │  ┌─────────┬──────────┬──────────┬──────────┬────────────────┐  │   │
│  │  │  Header │  Sidebar │  Content │  Footer  │   Shell Router │  │   │
│  │  │         │          │  (Mount) │          │                │  │   │
│  │  └────┬────┴────┬─────┴────┬─────┴────┬─────┴───────┬────────┘  │   │
│  │       │         │          │          │             │           │   │
│  │  ┌────┴─────────┴──────────┴──────────┴─────────────┴────────┐  │   │
│  │  │                   Event Bus / Shared State               │  │   │
│  │  └────────────────────────────┬─────────────────────────────┘  │   │
│  └───────────────────────────────┼───────────────────────────────┘   │
│                                  │                                        │
│         ┌────────────────────────┼────────────────────────┐           │
│         │                        │                        │           │
│         ▼                        ▼                        ▼           │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐      │
│  │  academics  │         │   finance   │         │     hr      │      │
│  │   remote    │         │   remote    │         │   remote    │      │
│  └─────────────┘         └─────────────┘         └─────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                         DEPLOYMENT INFRASTRUCTURE

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Shell     │  │  academics   │  │   finance   │  │     hr      │
│  (Vercel)   │  │ (Vercel/CDN) │  │(Vercel/CDN) │  │(Vercel/CDN) │
│              │  │              │  │             │  │             │
│  shell.app   │  │ academics.app│  │ finance.app │  │   hr.app    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        │                                                                
        └──────────────────────┐                                          
                               │                                          
                    ┌───────────┴───────────┐                              
                    │    CDN / JAMstack   │                              
                    │   (CloudFront)      │                              
                    └─────────────────────┘                              
```

## 2.2 Module List

| Module | Remote Name | Route | Description |
|--------|-------------|-------|-------------|
| **Shell** | - | / | Host application |
| **Dashboard** | dashboard | /dashboard | Overview & KPIs |
| **Administration** | administration | /admin | Students, Staff, Attendance |
| **Academics** | academics | /academics | Classes, Subjects, Exams |
| **Finance** | finance | /finance | Fees, Invoices, Payments |
| **HR** | hr | /hr | Payroll, Leaves |
| **Library** | library | /library | Books, Loans |
| **Inventory** | inventory | /inventory | Stock, Assets |
| **Nutrition** | nutrition | /nutrition | Meal Plans, Wallets |
| **Admissions** | admissions | /admissions | Applications |
| **Reports** | reports | /reports | Analytics, Reports |
| **Settings** | settings | /settings | System Configuration |

---

# 3. MICRO-FRONTEND DESIGN

## 3.1 Module Federation Configuration

### 3.1.1 Shell (Host) Webpack Config

```javascript
// shell/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');
const deps = require('./package.json').dependencies;

module.exports = {
  mode: 'development',
  devServer: {
    port: 3000,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  resolve: {
    extensions: ['.vue', '.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new ModuleFederationPlugin({
      name: 'shell',
      filename: 'remoteEntry.js',
      
      // Expose shell components and utilities
      exposes: {
        './Layout': './src/components/layout/index.ts',
        './Router': './src/router/index.ts',
        './Store': './src/store/index.ts',
        './Auth': './src/composables/useAuth.ts',
        './Api': './src/api/client.ts',
        './Config': './src/config/index.ts',
      },
      
      // Shared dependencies
      shared: {
        vue: {
          singleton: true,
          requiredVersion: deps.vue,
        },
        'vue-router': {
          singleton: true,
          requiredVersion: deps['vue-router'],
        },
        pinia: {
          singleton: true,
          requiredVersion: deps.pinia,
        },
        '@vueuse/core': {
          singleton: true,
        },
        axios: {
          singleton: true,
        },
        i18next: {
          singleton: true,
        },
        'vue-i18n': {
          singleton: true,
        },
      },
    }),
  ],
};
```

### 3.1.2 Remote Module (Academics) Webpack Config

```javascript
// academics/webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const { VueLoaderPlugin } = require('vue-loader');
const deps = require('./package.json').dependencies;

module.exports = {
  mode: 'development',
  devServer: {
    port: 3001,
    historyApiFallback: true,
  },
  resolve: {
    extensions: ['.vue', '.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new ModuleFederationPlugin({
      name: 'academics',
      filename: 'remoteEntry.js',
      
      // Expose module components
      exposes: {
        './Views': './src/views/index.ts',
        './Components': './src/components/index.ts',
        './Composables': './src/composables/index.ts',
        './Store': './src/stores/academics.ts',
        './Router': './src/router/academics.ts',
        './Types': './src/types/index.ts',
      },
      
      // Share dependencies
      shared: {
        vue: {
          singleton: true,
          requiredVersion: deps.vue,
        },
        'vue-router': {
          singleton: true,
          requiredVersion: deps['vue-router'],
        },
        pinia: {
          singleton: true,
          requiredVersion: deps.pinia,
        },
      },
    }),
  ],
};
```

## 3.2 Module Structure

```
academics/                          # Remote Module
├── public/
│   └── index.html
├── src/
│   ├── App.vue
│   ├── main.ts
│   │
│   ├── views/                     # Module pages
│   │   ├── index.ts              # View exports
│   │   ├── AcademicYears.vue
│   │   ├── Classes.vue
│   │   ├── Subjects.vue
│   │   ├── Timetable.vue
│   │   ├── Exams.vue
│   │   └── Results.vue
│   │
│   ├── components/               # Module components
│   │   ├── index.ts
│   │   ├── AcademicYearForm.vue
│   │   ├── ClassCard.vue
│   │   ├── SubjectList.vue
│   │   ├── TimetableGrid.vue
│   │   └── ExamScheduler.vue
│   │
│   ├── composables/              # Module composables
│   │   ├── index.ts
│   │   ├── useAcademicYears.ts
│   │   ├── useClasses.ts
│   │   ├── useSubjects.ts
│   │   └── useExams.ts
│   │
│   ├── stores/                   # Pinia stores
│   │   └── academics.ts
│   │
│   ├── services/                  # API services
│   │   └── api.ts
│   │
│   ├── types/                     # TypeScript types
│   │   └── index.ts
│   │
│   ├── i18n/                      # Translations
│   │   ├── en.json
│   │   └── index.ts
│   │
│   └── router/
│       └── academics.ts           # Module routes
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── webpack.config.js              # Module Federation
```

---

# 4. MODULE SHELL (HOST)

## 4.1 Shell Application Structure

```
shell/                             # Host Application
├── public/
│   └── index.html
├── src/
│   ├── App.vue                   # Root component
│   ├── main.ts                   # Entry point
│   │
│   ├── bootstrap.ts              # Dynamic module loading
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.vue    # Main layout
│   │   │   ├── AppHeader.vue    # Top navigation
│   │   │   ├── AppSidebar.vue   # Module navigation
│   │   │   ├── AppFooter.vue    # Footer
│   │   │   └── ModuleLoader.vue # Dynamic loader
│   │   │
│   │   ├── common/
│   │   │   ├── LoadingSpinner.vue
│   │   │   ├── ErrorBoundary.vue
│   │   │   └── NotFound.vue
│   │   │
│   │   └── shared/              # Shared from remotes
│   │
│   ├── composables/
│   │   ├── useAuth.ts          # Authentication
│   │   ├── useModules.ts       # Module management
│   │   ├── useNavigation.ts    # Navigation
│   │   └── useShared.ts        # Shared utilities
│   │
│   ├── stores/
│   │   ├── auth.ts              # Auth state
│   │   ├── modules.ts          # Module registry
│   │   └── ui.ts               # UI state
│   │
│   ├── router/
│   │   ├── index.ts            # Main router
│   │   ├── routes/             # Route definitions
│   │   └── guards/             # Route guards
│   │
│   ├── api/
│   │   ├── client.ts           # Axios instance
│   │   ├── interceptors.ts      # Request/response interceptors
│   │   └── endpoints.ts         # API definitions
│   │
│   ├── config/
│   │   └── modules.ts          # Module configuration
│   │
│   ├── i18n/
│   │   ├── index.ts
│   │   └── locales/
│   │
│   └── styles/
│       ├── main.css
│       └── variables.css
│
├── package.json
├── vite.config.ts
└── webpack.config.js             # Module Federation Host
```

## 4.2 Dynamic Module Loading

```typescript
// src/bootstrap.ts
import { createApp } from 'vue';
import App from './App.vue';
import { loadRemoteModule } from './composables/useModules';

async function bootstrap() {
  // Register all remote modules
  const moduleConfig = {
    academics: {
      remoteEntry: 'https://academics.schoolpilot.edu/remoteEntry.js',
      exposed: './Views',
    },
    finance: {
      remoteEntry: 'https://finance.schoolpilot.edu/remoteEntry.js',
      exposed: './Views',
    },
    hr: {
      remoteEntry: 'https://hr.schoolpilot.edu/remoteEntry.js',
      exposed: './Views',
    },
    // ... other modules
  };

  // Preload critical modules
  await Promise.all([
    loadRemoteModule('dashboard', moduleConfig.dashboard),
  ]);

  const app = createApp(App);
  app.mount('#app');
}

bootstrap();
```

## 4.3 Module Registry Configuration

```typescript
// src/config/modules.ts

export interface ModuleConfig {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  remoteEntry: string;
  exposed: string;
  routes: ModuleRoute[];
  permissions?: string[];
  isEnabled: boolean;
}

export interface ModuleRoute {
  path: string;
  name: string;
  meta: {
    title: string;
    icon?: string;
    requiresAuth?: boolean;
    permission?: string;
  };
}

export const moduleRegistry: ModuleConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    slug: 'dashboard',
    icon: 'DashboardIcon',
    color: '#4F46E5',
    description: 'Overview and analytics',
    remoteEntry: 'https://dashboard.schoolpilot.edu/remoteEntry.js',
    exposed: './Views',
    routes: [
      { path: '/dashboard', name: 'dashboard', meta: { title: 'Dashboard' } },
    ],
    isEnabled: true,
  },
  {
    id: 'administration',
    name: 'Administration',
    slug: 'admin',
    icon: 'UsersIcon',
    color: '#10B981',
    description: 'Student and staff management',
    remoteEntry: 'https://administration.schoolpilot.edu/remoteEntry.js',
    exposed: './Views',
    routes: [
      { path: '/admin/students', name: 'students', meta: { title: 'Students' } },
      { path: '/admin/staff', name: 'staff', meta: { title: 'Staff' } },
      { path: '/admin/attendance', name: 'attendance', meta: { title: 'Attendance' } },
    ],
    isEnabled: true,
  },
  {
    id: 'academics',
    name: 'Academics',
    slug: 'academics',
    icon: 'BookOpenIcon',
    color: '#F59E0B',
    description: 'Academic management',
    remoteEntry: 'https://academics.schoolpilot.edu/remoteEntry.js',
    exposed: './Views',
    routes: [
      { path: '/academics/years', name: 'academic-years', meta: { title: 'Academic Years' } },
      { path: '/academics/classes', name: 'classes', meta: { title: 'Classes' } },
      { path: '/academics/subjects', name: 'subjects', meta: { title: 'Subjects' } },
      { path: '/academics/timetable', name: 'timetable', meta: { title: 'Timetable' } },
      { path: '/academics/exams', name: 'exams', meta: { title: 'Exams' } },
      { path: '/academics/results', name: 'results', meta: { title: 'Results' } },
    ],
    permissions: ['academics:read'],
    isEnabled: true,
  },
  {
    id: 'finance',
    name: 'Finance',
    slug: 'finance',
    icon: 'WalletIcon',
    color: '#EF4444',
    description: 'Fee management and payments',
    remoteEntry: 'https://finance.schoolpilot.edu/remoteEntry.js',
    exposed: './Views',
    routes: [
      { path: '/finance/fees', name: 'fee-templates', meta: { title: 'Fee Templates' } },
      { path: '/finance/invoices', name: 'invoices', meta: { title: 'Invoices' } },
      { path: '/finance/payments', name: 'payments', meta: { title: 'Payments' } },
      { path: '/finance/ledger', name: 'ledger', meta: { title: 'General Ledger' } },
    ],
    permissions: ['finance:read'],
    isEnabled: true,
  },
  {
    id: 'hr',
    name: 'Human Resources',
    slug: 'hr',
    icon: 'UserGroupIcon',
    color: '#8B5CF6',
    description: 'Payroll and leave management',
    remoteEntry: 'https://hr.schoolpilot.edu/remoteEntry.js',
    exposed: './Views',
    routes: [
      { path: '/hr/staff', name: 'hr-staff', meta: { title: 'Staff' } },
      { path: '/hr/payroll', name: 'payroll', meta: { title: 'Payroll' } },
      { path: '/hr/leave', name: 'leave', meta: { title: 'Leave' } },
    ],
    permissions: ['hr:read'],
    isEnabled: true,
  },
  // ... more modules
];
```

---

# 5. REMOTE MODULES

## 5.1 Finance Module Example

```typescript
// finance/src/views/index.ts - Exposed module views
export { default as FeeTemplates } from './FeeTemplates.vue';
export { default as Invoices } from './Invoices.vue';
export { default as Payments } from './Payments.vue';
export { default as Ledger } from './Ledger.vue';
export { default as Transport } from './Transport.vue';
export { default as Reports } from './Reports.vue';

// Module configuration
export const moduleConfig = {
  id: 'finance',
  name: 'Finance',
  icon: 'WalletIcon',
  color: '#EF4444',
};
```

## 5.2 Remote Module Entry Point

```typescript
// finance/src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// Create module app (exposed to shell)
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#finance-root');

// For federation, expose a bootstrap function
export async function mount(props: any) {
  const app = createApp(App);
  app.use(createPinia());
  app.mount('#finance-root');
  return app;
}
```

---

# 6. SHARED INFRASTRUCTURE

## 6.1 Shared Component Library

```
shared-components/                # Shared Component Library
├── src/
│   ├── components/
│   │   ├── ui/                  # Base UI components
│   │   │   ├── Button.vue
│   │   │   ├── Input.vue
│   │   │   ├── Select.vue
│   │   │   ├── Modal.vue
│   │   │   ├── Table.vue
│   │   │   ├── Card.vue
│   │   │   ├── Badge.vue
│   │   │   ├── Avatar.vue
│   │   │   ├── Spinner.vue
│   │   │   └── ...
│   │   │
│   │   ├── forms/               # Form components
│   │   │   ├── Form.vue
│   │   │   ├── FormField.vue
│   │   │   ├── FormGroup.vue
│   │   │   ├── DatePicker.vue
│   │   │   ├── DateRangePicker.vue
│   │   │   ├── FileUpload.vue
│   │   │   └── RichTextEditor.vue
│   │   │
│   │   ├── data/                # Data display
│   │   │   ├── DataTable.vue
│   │   │   ├── DataGrid.vue
│   │   │   ├── TreeView.vue
│   │   │   ├── KanbanBoard.vue
│   │   │   ├── Timeline.vue
│   │   │   └── Chart.vue
│   │   │
│   │   ├── layout/              # Layout components
│   │   │   ├── PageHeader.vue
│   │   │   ├── PageContent.vue
│   │   │   ├── PageFooter.vue
│   │   │   ├── Tabs.vue
│   │   │   └── Accordion.vue
│   │   │
│   │   └── feedback/            # Feedback components
│   │       ├── Toast.vue
│   │       ├── Alert.vue
│   │       ├── ConfirmDialog.vue
│   │       └── LoadingOverlay.vue
│   │
│   ├── composables/             # Shared composables
│   │   ├── useApi.ts
│   │   ├── useForm.ts
│   │   ├── useTable.ts
│   │   ├── useModal.ts
│   │   ├── useToast.ts
│   │   └── usePermission.ts
│   │
│   ├── utils/                   # Utilities
│   │   ├── date.ts
│   │   ├── currency.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   │
│   ├── types/                   # Shared types
│   │   ├── common.ts
│   │   ├── api.ts
│   │   └── forms.ts
│   │
│   └── index.ts                 # Exports
│
├── package.json
└── webpack.config.js
```

## 6.2 Design Tokens

```typescript
// shared-components/src/styles/tokens.css

:root {
  /* Colors */
  --color-primary: #4F46E5;
  --color-primary-hover: #4338CA;
  --color-primary-light: #EEF2FF;
  
  --color-secondary: #64748B;
  --color-secondary-hover: #475569;
  
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
  
  /* Module Colors */
  --color-admin: #10B981;
  --color-academics: #F59E0B;
  --color-finance: #EF4444;
  --color-hr: #8B5CF6;
  --color-library: #06B6D4;
  --color-inventory: #F97316;
  --color-nutrition: #84CC16;
  --color-admissions: #EC4899;
  
  /* Typography */
  --font-family: 'Inter', system-ui, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  
  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;
  
  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  
  /* Transitions */
  --transition-fast: 150ms;
  --transition-base: 200ms;
  --transition-slow: 300ms;
}
```

---

# 7. COMPONENT LIBRARY

## 7.1 Component Categories

| Category | Components | Purpose |
|----------|------------|---------|
| **Base** | Button, Input, Select, Checkbox, Radio, Toggle | Form inputs |
| **Display** | Table, Card, Badge, Avatar, Tag, List | Data display |
| **Layout** | Container, Grid, Stack, Divider, Spacer | Layout |
| **Navigation** | Breadcrumb, Tabs, Menu, Pagination | Navigation |
| **Feedback** | Alert, Toast, Modal, Dialog, Loading | User feedback |
| **Data** | DataTable, Tree, Chart, Timeline | Complex data |
| **Overlay** | Popover, Tooltip, Dropdown | Overlays |

## 7.2 Component Usage in Modules

```vue
<!-- Example: Using shared components in Finance module -->
<template>
  <PageContent>
    <PageHeader title="Fee Templates" subtitle="Manage fee structures">
      <template #actions>
        <Button variant="primary" @click="showCreateModal">
          <PlusIcon />
          Create Template
        </Button>
      </template>
    </PageHeader>
    
    <DataTable
      :columns="columns"
      :data="templates"
      :loading="loading"
      @row-click="editTemplate"
    >
      <template #cell(name)="{ value, row }">
        <div class="flex items-center gap-2">
          <Badge :color="row.statusColor">{{ row.status }}</Badge>
          {{ value }}
        </div>
      </template>
      
      <template #cell(amount)="{ value }">
        {{ formatCurrency(value) }}
      </template>
      
      <template #cell(actions)="{ row }">
        <Dropdown>
          <DropdownItem @click="editTemplate(row)">Edit</DropdownItem>
          <DropdownItem @click="duplicateTemplate(row)">Duplicate</DropdownItem>
          <DropdownItem variant="danger" @click="deleteTemplate(row)">
            Delete
          </DropdownItem>
        </Dropdown>
      </template>
    </DataTable>
  </PageContent>
</template>
```

---

# 8. STATE MANAGEMENT

## 8.1 Global State Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SHELL STATE (Pinia)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Auth    │  │   User   │  │   UI    │  │  Module  │        │
│  │  Store   │  │  Store   │  │  Store   │  │  Store   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│       │             │             │             │                  │
│       └─────────────┴─────────────┴─────────────┘                  │
│                         │                                            │
│                    Event Bus                                        │
│                         │                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Finance  │  │   HR     │  │Academics│  │ Library │        │
│  │  Store   │  │  Store   │  │  Store   │  │  Store   │        │
│  │ (Remote) │  │ (Remote) │  │ (Remote) │  │ (Remote) │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 8.2 Auth Store

```typescript
// shell/src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Role, Permission } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const permissions = ref<Permission[]>([]);
  const isLoading = ref(false);
  
  // Getters
  const isAuthenticated = computed(() => !!token.value);
  const userFullName = computed(() => 
    user.value ? `${user.value.first_name} ${user.value.last_name}` : ''
  );
  const userInitials = computed(() =>
    user.value ? `${user.value.first_name[0]}${user.value.last_name[0]}` : ''
  );
  
  const hasPermission = (permission: string) => {
    if (!permissions.value.length) return true; // Super admin
    return permissions.value.some(p => 
      p.resource === '*' || p.action === '*' ||
      `${p.resource}:${p.action}` === permission ||
      p.permissions?.includes(permission)
    );
  };
  
  const hasRole = (roleName: string) => {
    return user.value?.role?.name === roleName;
  };
  
  // Actions
  async function login(username: string, password: string) {
    isLoading.value = true;
    try {
      const response = await api.auth.login({ username, password });
      token.value = response.access_token;
      refreshToken.value = response.refresh_token;
      user.value = response.user;
      permissions.value = response.permissions || [];
      
      // Store tokens
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      return response;
    } finally {
      isLoading.value = false;
    }
  }
  
  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      user.value = null;
      token.value = null;
      permissions.value = [];
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    }
  }
  
  async function refreshAccessToken() {
    const refresh = refreshToken.value || localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token');
    
    const response = await api.auth.refresh({ refresh_token: refresh });
    token.value = response.access_token;
    localStorage.setItem('token', response.access_token);
    
    return response.access_token;
  }
  
  return {
    user,
    token,
    permissions,
    isLoading,
    isAuthenticated,
    userFullName,
    userInitials,
    hasPermission,
    hasRole,
    login,
    logout,
    refreshAccessToken,
  };
});
```

## 8.3 Module Store (Remote State Management)

```typescript
// finance/src/stores/finance.ts - Remote module store
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Invoice, Payment, FeeTemplate } from '@/types';

export const useFinanceStore = defineStore('finance', () => {
  // State
  const invoices = ref<Invoice[]>([]);
  const payments = ref<Payment[]>([]);
  const feeTemplates = ref<FeeTemplate[]>([]);
  const loading = ref(false);
  const currentInvoice = ref<Invoice | null>(null);
  
  // Getters
  const pendingInvoices = computed(() => 
    invoices.value.filter(i => i.status === 'due' || i.status === 'overdue')
  );
  
  const totalOutstanding = computed(() =>
    pendingInvoices.value.reduce((sum, inv) => sum + inv.balance, 0)
  );
  
  // Actions
  async function fetchInvoices(params?: QueryParams) {
    loading.value = true;
    try {
      const response = await api.finance.invoices.list(params);
      invoices.value = response.data;
      return response;
    } finally {
      loading.value = false;
    }
  }
  
  async function createInvoice(data: CreateInvoiceDto) {
    loading.value = true;
    try {
      const response = await api.finance.invoices.create(data);
      invoices.value.unshift(response.data);
      return response;
    } finally {
      loading.value = false;
    }
  }
  
  async function processPayment(invoiceId: string, data: PaymentDto) {
    loading.value = true;
    try {
      const response = await api.finance.payments.create({
        ...data,
        invoice_id: invoiceId,
      });
      
      // Update invoice status
      const invoice = invoices.value.find(i => i.id === invoiceId);
      if (invoice) {
        invoice.amount_paid += data.amount;
        invoice.status = response.data.invoice_status;
      }
      
      return response;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    invoices,
    payments,
    feeTemplates,
    loading,
    currentInvoice,
    pendingInvoices,
    totalOutstanding,
    fetchInvoices,
    createInvoice,
    processPayment,
  };
});
```

---

# 9. API INTEGRATION

## 9.1 API Client Configuration

```typescript
// shell/src/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const authStore = useAuthStore();
    
    if (error.response?.status === 401) {
      // Token expired, try refresh
      if (!error.config?.url?.includes('/auth/refresh')) {
        try {
          await authStore.refreshAccessToken();
          
          // Retry original request
          const token = localStorage.getItem('token');
          error.config!.headers.Authorization = `Bearer ${token}`;
          return apiClient(error.config!);
        } catch (refreshError) {
          // Refresh failed, logout
          await authStore.logout();
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

## 9.2 API Service Modules

```typescript
// shell/src/api/services.ts
import apiClient from './client';

// Generic CRUD factory
function createCrudService<T>(resource: string) {
  return {
    list: (params?: Record<string, any>) => 
      apiClient.get<ApiResponse<T[]>>(`/${resource}`, { params }),
    
    get: (id: string) => 
      apiClient.get<ApiResponse<T>>(`/${resource}/${id}`),
    
    create: (data: Partial<T>) => 
      apiClient.post<ApiResponse<T>>(`/${resource}`, data),
    
    update: (id: string, data: Partial<T>) => 
      apiClient.put<ApiResponse<T>>(`/${resource}/${id}`, data),
    
    delete: (id: string) => 
      apiClient.delete(`/${resource}/${id}`),
  };
}

// Auth API
export const authApi = {
  login: (credentials: LoginDto) => 
    apiClient.post<AuthResponse>('/auth/login', credentials),
  
  logout: () => 
    apiClient.post('/auth/logout'),
  
  refresh: (data: { refresh_token: string }) => 
    apiClient.post<AuthResponse>('/auth/refresh', data),
  
  me: () => 
    apiClient.get<User>('/auth/me'),
};

// Students API
export const studentsApi = {
  ...createCrudService<Student>('students'),
  
  profile: (id: string) => 
    apiClient.get<StudentProfile>(`/students/${id}/profile`),
  
  finance: (id: string) => 
    apiClient.get<StudentFinance>(`/students/${id}/finance`),
  
  academics: (id: string) => 
    apiClient.get<StudentAcademics>(`/students/${id}/academics`),
  
  attendance: (id: string, params?: Record<string, any>) => 
    apiClient.get(`/students/${id}/attendance`, { params }),
};

// Finance API
export const financeApi = {
  invoices: {
    ...createCrudService<Invoice>('invoices'),
    
    generate: (templateId: string, data: GenerateInvoicesDto) =>
      apiClient.post(`/fee-templates/${templateId}/generate-invoices`, data),
    
    pdf: (id: string) => 
      apiClient.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  },
  
  payments: {
    ...createCrudService<Payment>('payments'),
    
    apply: (paymentId: string, applications: PaymentApplication[]) =>
      apiClient.post(`/payments/${paymentId}/apply`, { applications }),
    
    receipt: (id: string) => 
      apiClient.get(`/payments/${id}/receipt`, { responseType: 'blob' }),
  },
  
  feeTemplates: createCrudService<FeeTemplate>('fee-templates'),
  ledger: {
    entries: (params?: Record<string, any>) => 
      apiClient.get('/ledger/entries', { params }),
    
    trialBalance: (params: TrialBalanceParams) => 
      apiClient.get('/ledger/trial-balance', { params }),
    
    balanceSheet: (params: ReportParams) => 
      apiClient.get('/ledger/balance-sheet', { params }),
    
    incomeStatement: (params: ReportParams) => 
      apiClient.get('/ledger/income-statement', { params }),
  },
};

// Export all APIs
export const api = {
  auth: authApi,
  students: studentsApi,
  staff: createCrudService<Staff>('staff'),
  subjects: createCrudService<Subject>('subjects'),
  classes: createCrudService<Class>('classes'),
  finance: financeApi,
  hr: {
    payroll: createCrudService<Payroll>('payroll'),
    leaves: createCrudService<Leave>('leave-requests'),
    payslips: createCrudService<Payslip>('payslips'),
  },
  library: createCrudService<Book>('books'),
  inventory: createCrudService<Item>('items'),
  admissions: createCrudService<Application>('applications'),
  dashboard: {
    summary: () => apiClient.get('/dashboard/summary'),
    enrollment: () => apiClient.get('/dashboard/enrollment'),
    finance: () => apiClient.get('/dashboard/finance'),
  },
};
```

---

# 10. ROUTING & NAVIGATION

## 10.1 Shell Router Configuration

```typescript
// shell/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useModuleStore } from '@/stores/modules';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => loadRemoteView('dashboard', 'Dashboard'),
    meta: { 
      title: 'Dashboard', 
      icon: 'DashboardIcon',
      requiresAuth: true,
    },
  },
  // Module routes are added dynamically from module registry
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

// Dynamic route loading from modules
function loadRemoteView(moduleId: string, viewName: string) {
  return async () => {
    const moduleStore = useModuleStore();
    const module = moduleStore.getModule(moduleId);
    
    if (!module || !module.isEnabled) {
      return import('@/views/NotFound.vue');
    }
    
    try {
      const moduleApp = await moduleStore.loadModule(moduleId);
      return moduleApp[viewName];
    } catch (error) {
      console.error(`Failed to load ${moduleId} view:`, error);
      return import('@/views/ModuleError.vue');
    }
  };
}

// Add module routes dynamically
export function addModuleRoutes() {
  const moduleStore = useModuleStore();
  
  moduleStore.modules
    .filter(m => m.isEnabled)
    .forEach(module => {
      module.routes?.forEach(route => {
        router.addRoute('shell', {
          path: route.path,
          name: route.name,
          component: loadRemoteView(module.id, route.component),
          meta: {
            ...route.meta,
            moduleId: module.id,
          },
        });
      });
    });
}

export default router;
```

## 10.2 Sidebar Navigation

```vue
<!-- shell/src/components/layout/AppSidebar.vue -->
<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <img src="/logo.svg" class="logo" alt="SchoolPilot" />
      <span v-if="!isCollapsed" class="logo-text">SchoolPilot</span>
    </div>
    
    <nav class="sidebar-nav">
      <div class="nav-section">
        <template v-for="module in enabledModules" :key="module.id">
          <div 
            class="nav-item"
            :class="{ active: isActiveModule(module) }"
            @click="toggleModule(module)"
          >
            <component :is="module.icon" class="nav-icon" />
            <span v-if="!isCollapsed" class="nav-label">{{ module.name }}</span>
            <ChevronDownIcon 
              v-if="!isCollapsed" 
              class="nav-chevron"
              :class="{ expanded: isExpanded(module) }"
            />
          </div>
          
          <Transition name="slide">
            <div v-if="!isCollapsed && isExpanded(module)" class="nav-subitems">
              <router-link
                v-for="route in module.routes"
                :key="route.path"
                :to="route.path"
                class="nav-subitem"
                active-class="active"
              >
                {{ route.meta.title }}
              </router-link>
            </div>
          </Transition>
        </template>
      </div>
    </nav>
    
    <div class="sidebar-footer">
      <Button 
        variant="ghost" 
        size="sm"
        @click="isCollapsed = !isCollapsed"
      >
        <MenuIcon v-if="isCollapsed" />
        <MenuCloseIcon v-else />
      </Button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useModuleStore } from '@/stores/modules';

const moduleStore = useModuleStore();
const isCollapsed = ref(false);
const expandedModules = ref<string[]>([]);

const enabledModules = computed(() => 
  moduleStore.modules.filter(m => m.isEnabled)
);

const isActiveModule = (module: ModuleConfig) => {
  return false; // Implementation depends on current route
};

const isExpanded = (module: ModuleConfig) => {
  return expandedModules.value.includes(module.id);
};

const toggleModule = (module: ModuleConfig) => {
  const index = expandedModules.value.indexOf(module.id);
  if (index > -1) {
    expandedModules.value.splice(index, 1);
  } else {
    expandedModules.value.push(module.id);
  }
};
</script>
```

---

# 11. AUTHENTICATION FLOW

## 11.1 Login Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User  │     │  Shell  │     │   Go   │     │ Surreal │
│        │     │         │     │  API   │     │   DB    │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │                │                │                │
     │ 1. Enter       │                │                │
     │ credentials   │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 2. POST        │                │
     │                │ /auth/login    │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │                │ 3. Verify      │
     │                │                │ credentials    │
     │                │                │───────────────>│
     │                │                │                │
     │                │                │ 4. User data   │
     │                │                │<───────────────│
     │                │                │                │
     │                │ 5. JWT tokens │                │
     │                │ + permissions  │                │
     │                │<───────────────│                │
     │                │                │                │
     │ 6. Redirect + │                │                │
     │    store user │                │                │
     │<──────────────│                │                │
     │                │                │                │
     │ 7. Load       │                │                │
     │    modules    │                │                │
     │───────────────>│                │                │
     │                │                │                │
     │                │ 8. Fetch       │                │
     │                │ modules config │                │
     │                │───────────────>│                │
     │                │                │                │
     │                │ 9. Module     │                │
     │                │    list        │                │
     │                │<──────────────│                │
```

---

# 12. INTERNATIONALIZATION

## 12.1 Translation Structure

```
src/
├── i18n/
│   ├── index.ts                 # i18n setup
│   │
│   ├── shell/                   # Shell translations
│   │   ├── en.json
│   │   └── sw.json
│   │
│   └── shared/                  # Shared translations
│       ├── en.json
│       └── sw.json
│
├── modules/                      # Each module has translations
│   ├── academics/
│   │   └── i18n/
│   │       ├── en.json
│   │       └── sw.json
│   │
│   ├── finance/
│   │   └── i18n/
│   │       ├── en.json
│   │       └── sw.json
│   └── ...
```

## 12.2 i18n Configuration

```typescript
// shell/src/i18n/index.ts
import { createI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

// Import shared messages
import enShell from './locales/shell/en.json';
import swShell from './locales/shell/sw.json';
import enShared from './locales/shared/en.json';
import swShared from './locales/shared/sw.json';

const messages = {
  en: {
    ...enShell,
    ...enShared,
  },
  sw: {
    ...swShell,
    ...swShared,
  },
};

export const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'en',
  fallbackLocale: 'en',
  messages,
  numberFormats: {
    en: {
      currency: {
        style: 'currency',
        currency: 'KES',
        currencyDisplay: 'symbol',
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    },
    sw: {
      currency: {
        style: 'currency',
        currency: 'KES',
        currencyDisplay: 'symbol',
      },
    },
  },
  datetimeFormats: {
    en: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' },
    },
    sw: {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' },
    },
  },
});

export default i18n;
```

---

# 13. MODULE COMMUNICATION

## 13.1 Event Bus

```typescript
// shell/src/composables/useModuleEvents.ts
import { ref, readonly } from 'vue';

// Event types
export interface ModuleEvent {
  type: string;
  module: string;
  payload?: any;
  timestamp: number;
}

// Global event bus
const events = ref<ModuleEvent[]>([]);

// Subscribe to events
export function useModuleEvents() {
  const subscribe = (callback: (event: ModuleEvent) => void) => {
    const handler = (event: ModuleEvent) => callback(event);
    
    // Listen to custom events from iframes/windows
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  };
  
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type?.startsWith('module:')) {
      const moduleEvent: ModuleEvent = {
        type: event.data.type,
        module: event.data.module,
        payload: event.data.payload,
        timestamp: Date.now(),
      };
      events.value.push(moduleEvent);
      callback(moduleEvent);
    }
  };
  
  // Emit event
  const emit = (type: string, module: string, payload?: any) => {
    const event: ModuleEvent = {
      type: `module:${type}`,
      module,
      payload,
      timestamp: Date.now(),
    };
    
    // Store event
    events.value.push(event);
    
    // Broadcast to all windows/frames
    window.parent.postMessage(event, '*');
  };
  
  return {
    events: readonly(events),
    subscribe,
    emit,
  };
}

// Predefined event types
export const ModuleEvents = {
  // User events
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_UPDATED: 'user:updated',
  
  // Data events
  DATA_CREATED: 'data:created',
  DATA_UPDATED: 'data:updated',
  DATA_DELETED: 'data:deleted',
  
  // Navigation events
  NAVIGATE: 'navigate',
  MODULE_LOADED: 'module:loaded',
  MODULE_ERROR: 'module:error',
  
  // Finance events
  INVOICE_CREATED: 'invoice:created',
  PAYMENT_RECEIVED: 'payment:received',
  
  // Academic events
  STUDENT_ENROLLED: 'student:enrolled',
  RESULTS_PUBLISHED: 'results:published',
};
```

## 13.2 Cross-Module Data Sharing

```vue
<!-- Example: Finance module showing student info from Admin module -->
<template>
  <div>
    <h3>Student Fee Details</h3>
    
    <!-- Cross-module component -->
    <StudentCard 
      :student-id="studentId"
      @loaded="handleStudentLoaded"
    />
    
    <InvoiceList :student-id="studentId" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useModuleEvents } from '@shell/composables/useModuleEvents';

const props = defineProps<{
  studentId: string;
}>();

const { subscribe } = useModuleEvents();

// Listen for student updates from admin module
onMounted(() => {
  subscribe((event) => {
    if (event.type === 'module:student:updated' && 
        event.payload?.studentId === props.studentId) {
      // Refresh data
      refreshData();
    }
  });
});

// Emit events when we create invoices
const handleInvoiceCreated = (invoice: Invoice) => {
  useModuleEvents().emit('invoice:created', 'finance', {
    studentId: props.studentId,
    invoiceId: invoice.id,
    amount: invoice.amount,
  });
};
</script>
```

---

# 14. DEPLOYMENT STRATEGY

## 14.1 Independent Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CI/CD PIPELINE                                    │
│                                                                          │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│   │   Shell     │   │  Academics   │   │   Finance   │                │
│   │   Build     │   │   Build      │   │   Build     │                │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│          │                  │                  │                         │
│          ▼                  ▼                  ▼                         │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│   │    Test     │   │    Test     │   │    Test     │                │
│   │  (Jest)    │   │  (Jest)    │   │  (Jest)    │                │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│          │                  │                  │                         │
│          ▼                  ▼                  ▼                         │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│   │   Deploy    │   │   Deploy    │   │   Deploy    │                │
│   │  (Vercel)   │   │  (Vercel)   │   │  (Vercel)   │                │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│          │                  │                  │                         │
└──────────┼──────────────────┼──────────────────┼──────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
      ┌─────────┐       ┌─────────┐       ┌─────────┐
      │  Shell  │       │Academics│       │ Finance │
      │   App   │       │  App    │       │   App   │
      │ (CDN)   │       │ (CDN)   │       │ (CDN)   │
      └────┬────┘       └────┬────┘       └────┬────┘
           │                  │                  │
           └──────────────────┴──────────────────┘
                              │
                    ┌────────┴────────┐
                    │  CloudFront CDN │
                    │  (Unified URL) │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │    Browser     │
                    │   (User)      │
                    └────────────────┘
```

## 14.2 Deployment Configuration

### Shell (Host) - Vercel

```json
// shell/vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vue",
  "routes": [
    { "handle": "filesystem" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "VITE_API_URL": "@api-url",
    "VITE_SHELL_VERSION": "@shell-version"
  }
}
```

### Remote Module - Vercel

```json
// academics/vercel.json
{
  "buildCommand": "npm run build:remote",
  "outputDirectory": "dist",
  "framework": "vue",
  "routes": [
    { "handle": "filesystem" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": {
    "VITE_API_URL": "@api-url",
    "VITE_MODULE_NAME": "academics"
  }
}
```

## 14.3 Docker (Alternative)

```yaml
# docker-compose.yml
version: '3.8'

services:
  shell:
    build: ./shell
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:8080
    depends_on:
      - api

  academics:
    build: ./academics
    ports:
      - "3001:3001"
    
  finance:
    build: ./finance
    ports:
      - "3002:3002"

  api:
    build: ./api
    ports:
      - "8080:8080"
    environment:
      - SURREALDB_HOST=surrealdb

  surrealdb:
    image: surrealdb/surrealdb:2.1
    ports:
      - "8000:8000"
```

---

# 15. PERFORMANCE OPTIMIZATION

## 15.1 Loading Strategies

| Strategy | Use Case | Implementation |
|----------|----------|-----------------|
| **Eager** | Dashboard, Auth | Preload on app init |
| **Lazy** | Module pages | Load on navigation |
| **Prefetch** | Likely routes | Link rel="prefetch" |
| **Preload** | Critical CSS | Link rel="preload" |

## 15.2 Code Splitting

```typescript
// Dynamic imports with prefetch hints
const FeeTemplates = () => import(
  /* webpackChunkName: "finance-fees" */
  /* webpackPrefetch: true */
  './views/FeeTemplates.vue'
);
```

## 15.3 Module Prefetching

```typescript
// Prefetch modules on idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    moduleRegistry
      .filter(m => m.isEnabled && !loadedModules.has(m.id))
      .forEach(m => prefetchModule(m));
  });
} else {
  setTimeout(() => {
    moduleRegistry
      .filter(m => m.isEnabled && !loadedModules.has(m.id))
      .forEach(m => prefetchModule(m));
  }, 3000);
}
```

---

# APPENDIX

## A. Module Metadata

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name |
| `slug` | string | URL slug |
| `icon` | string | Icon component name |
| `color` | string | Module color (hex) |
| `description` | string | Brief description |
| `remoteEntry` | string | Remote entry URL |
| `exposed` | string | Exposed module path |
| `routes` | ModuleRoute[] | Module routes |
| `permissions` | string[] | Required permissions |
| `isEnabled` | boolean | Module enabled status |

## B. Error Codes

| Code | Description |
|------|-------------|
| MODULE_NOT_FOUND | Module not registered |
| MODULE_LOAD_FAILED | Failed to load remote |
| MODULE_CSS_CONFLICT | Style conflicts detected |
| AUTH_REQUIRED | Authentication needed |
| PERMISSION_DENIED | Insufficient permissions |

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026
