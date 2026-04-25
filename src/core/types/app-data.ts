// src/core/types/app-data.ts
// ABOUTME: Base AppData interfaces — extensible via TypeScript declaration merging
// ABOUTME: Modules augment AppDataType and AppDataContextType in their own appDataAugmentation.ts files

import type { SchoolDetails, Role, User, AuditLog, Workflow, Permission, UserRole } from './common';

// ── Base AppDataType (before module augmentation) ───────────────────────────
/**
 * Base AppDataType with only core system properties.
 * Feature modules augment this interface with their collections via:
 *
 *   declare module '@/core/types' {
 *     interface AppDataType {
 *       myCollection: MyEntity[];
 *     }
 *   }
 */
export interface AppDataType {
  // Core properties present in all configurations
  schoolDetails: SchoolDetails | null;
  users: User[];
  roles: Role[];
}

/**
 * Loading states mapped over all AppDataType keys.
 * Automatically expands when AppDataType is augmented by modules.
 */
export type AppDataLoadingStates = {
  [K in keyof AppDataType]: boolean;
} & { all: boolean };

/**
 * Base context type. Feature modules augment this with CRUD operations
 * and their data collections via declaration merging.
 */
export interface AppDataContextType extends AppDataType {
  loading: AppDataLoadingStates;
  rawInitialData: any;
  initializationError?: Error | null;
  triggerSeedRxDB?: () => Promise<void>;
  triggerClearRxDB?: () => Promise<void>;
  isUsingRxDBDummyData?: boolean;
  // Cross-domain helpers (stable, core-defined)
  getStudentDetailsById: (id: string) => Promise<any | null>;
  getStudentFinancialDetailsById: (id: string) => Promise<any | null>;
  // RBAC (core system)
  permissions: Permission[];
  userRoles: UserRole[];
  addPermission: (p: Permission) => Promise<void>;
  updatePermission: (p: Permission) => Promise<void>;
  deletePermission: (id: string) => Promise<void>;
  addRole: (r: Role) => Promise<void>;
  updateRole: (r: Role) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  assignRoleToUser: (userRole: UserRole) => Promise<void>;
  removeRoleFromUser: (userId: string, roleId: string) => Promise<void>;
}
