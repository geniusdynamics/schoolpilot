// ABOUTME: TypeScript module augmentation for Admissions collections in AppData
// ABOUTME: Extends AppDataType and AppDataContextType with admissions-specific properties
// ABOUTME: This is the compile-time equivalent of Frappe's DocType self-registration

import type {
  Application,
} from './types';

declare module '@/core/types' {
  export interface AppDataType {
    applications: Application[];
  }

  export interface AppDataContextType {
    // Application CRUD
    addApplication: (data: any) => Promise<any>;
    updateApplication: (id: string, data: any) => Promise<any>;
    deleteApplication: (id: string) => Promise<void>;
  }
}
