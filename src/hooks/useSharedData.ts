/**
 * useSharedData - Cross-Module Data Access Hook
 * 
 * This hook provides a clean, type-safe way for modules to access shared entities
 * from other modules without direct imports. It replaces the problematic pattern
 * of importing mockData directly from other modules.
 * 
 * ## Problem Solved
 * 
 * Before (❌ cross-module import):
 * ```typescript
 * import { initialMockUsers } from '../../administration/data/mockData';
 * const [users] = useState(initialMockUsers);
 * ```
 * 
 * After (✅ via hook):
 * ```typescript
 * import { useSharedData } from '@/hooks/useSharedData';
 * const { users } = useSharedData(['users']);
 * ```
 * 
 * ## Usage Patterns
 * 
 * ### Single Entity
 * ```typescript
 * const { users } = useSharedData(['users']);
 * ```
 * 
 * ### Multiple Entities
 * ```typescript
 * const { users, students, staff } = useSharedData(['users', 'students', 'staff']);
 * ```
 * 
 * ### With Loading State
 * ```typescript
 * const { data, isLoading, error } = useSharedData(['users'], { loading: true });
 * if (isLoading) return <Spinner />;
 * return <UserList users={data.users} />;
 * ```
 * 
 * ### Convenience Hooks
 * ```typescript
 * import { useSharedUsers, useSharedStudents } from '@/hooks/useSharedData';
 * const { data: users } = useSharedUsers();
 * const { data: students } = useSharedStudents();
 * ```
 * 
 * @module hooks/useSharedData
 */

/// <reference types="../vite-env.d.ts" />
import { useMemo, useCallback } from 'react';
import { useAppData } from './useAppData';
import type { AppDataContextType } from '../types';

/**
 * Entities that are considered "shared" across module boundaries.
 * These are entities that multiple modules depend on and should not
 * be imported directly from other modules.
 * 
 * To add a new shared entity:
 * 1. Add it to this array
 * 2. Ensure it's exported from AppDataContextType
 * 3. Update the corresponding domain hook
 */
export const SHARED_ENTITIES = [
  'users',
  'students',
  'staff',
  'classes',
  'classStreams',
  'departments',
  'designations',
  'academicYears',
  'schoolDetails',
  'roles',
  'parentsGuardians',
  'dormitories',
  'studentCategories',
  'partners',
  'clubs',
  'customers',
] as const;

/**
 * Type representing all valid shared entity names
 */
export type SharedEntity = typeof SHARED_ENTITIES[number];

/**
 * Type for shared data subset - picks only shared entities from AppDataContextType
 */
type SharedData = Pick<AppDataContextType, SharedEntity>;

/**
 * Options for useSharedData hook
 */
interface UseSharedDataOptions {
  /** Include loading states for requested entities */
  loading?: boolean;
  /** Include error states */
  errors?: boolean;
}

/**
 * Result type for useSharedData hook
 */
type SharedDataResult<T extends SharedEntity> = Pick<SharedData, T> & {
  /** Whether any requested entity is loading */
  isLoading: boolean;
  /** Error object if any request failed */
  error: Error | null;
  /** Function to refresh all requested entities */
  refresh: () => Promise<void>;
};

/**
 * Hook to access shared entities from AppDataContext.
 * 
 * This is the primary mechanism for cross-module data access. Modules should
 * use this hook instead of directly importing data from other modules.
 * 
 * @param entities - Array of shared entity names to access
 * @param options - Optional configuration for loading/error states
 * @returns Object with requested entities plus loading/error state
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { users } = useSharedData(['users']);
 * 
 * // Multiple entities
 * const { users, students } = useSharedData(['users', 'students']);
 * 
 * // With loading state
 * const { data, isLoading } = useSharedData(['users'], { loading: true });
 * ```
 * 
 * @throws Error if requested entity is not in SHARED_ENTITIES (development only)
 */
export function useSharedData<T extends SharedEntity>(
  entities: T[],
  options: UseSharedDataOptions = {}
): SharedDataResult<T> {
  const appData = useAppData();
  
  // Validate all requested entities are shared (development only)
  if (typeof import.meta.env !== 'undefined' && import.meta.env.DEV) {
    const invalidEntities = entities.filter(
      e => !SHARED_ENTITIES.includes(e as SharedEntity)
    );
    if (invalidEntities.length > 0) {
      console.warn(
        `[useSharedData] Requested non-shared entities: ${invalidEntities.join(', ')}. ` +
        `Available shared entities: ${SHARED_ENTITIES.join(', ')}. ` +
        `Consider adding to SHARED_ENTITIES if this should be shared.`
      );
    }
  }
  
  // Memoize the data subset - only recalculate when entity data changes
  const data = useMemo(() => {
    const result = {} as Pick<SharedData, T>;
    for (const entity of entities) {
      result[entity] = appData[entity];
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, entities.map(e => appData[e]));
  
  // Determine loading state
  const isLoading = useMemo(() => {
    if (!options.loading) return false;
    // Check if any requested entity has a loading flag
    return entities.some(entity => {
      // Try to find loading state for this entity
      const loadingKey = `loading${capitalize(entity)}` as keyof typeof appData;
      return appData[loadingKey] === true;
    });
  }, [appData, entities, options.loading]);
  
  // Error aggregation
  const error = useMemo(() => {
    if (!options.errors) return null;
    // Check for errors in requested entities
    for (const entity of entities) {
      const errorKey = `${entity}Error` as keyof typeof appData;
      const entityError = appData[errorKey];
      if (entityError instanceof Error) return entityError;
    }
    return null;
  }, [appData, entities, options.errors]);
  
  // Refresh function - triggers refresh for all requested entities
  const refresh = useCallback(async () => {
    for (const entity of entities) {
      const refreshKey = `refresh${capitalize(entity)}` as keyof typeof appData;
      const refreshFn = appData[refreshKey];
      if (typeof refreshFn === 'function') {
        try {
          await refreshFn();
        } catch (err) {
          console.error(`[useSharedData] Failed to refresh ${entity}:`, err);
        }
      }
    }
  }, [appData, entities]);
  
  return {
    ...data,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for accessing a single shared entity.
 * Convenience wrapper around useSharedData.
 * 
 * @param entity - Name of the shared entity to access
 * @returns Object with data, loading state, error, and refresh function
 * 
 * @example
 * ```typescript
 * const { data: users, isLoading } = useSharedEntity('users');
 * ```
 */
export function useSharedEntity<T extends SharedEntity>(
  entity: T
): { data: SharedData[T] | undefined; isLoading: boolean; error: Error | null; refresh: () => Promise<void> } {
  const result = useSharedData([entity], { loading: true, errors: true });
  
  return {
    data: result[entity] as SharedData[T] | undefined,
    isLoading: result.isLoading,
    error: result.error,
    refresh: result.refresh,
  };
}

// ============================================
// Convenience Hooks for Common Shared Entities
// ============================================

/**
 * Hook for accessing users data
 * @returns Users data with loading/error states
 */
export function useSharedUsers() {
  return useSharedEntity('users');
}

/**
 * Hook for accessing students data
 * @returns Students data with loading/error states
 */
export function useSharedStudents() {
  return useSharedEntity('students');
}

/**
 * Hook for accessing staff data
 * @returns Staff data with loading/error states
 */
export function useSharedStaff() {
  return useSharedEntity('staff');
}

/**
 * Hook for accessing classes data
 * @returns Classes data with loading/error states
 */
export function useSharedClasses() {
  return useSharedEntity('classes');
}

/**
 * Hook for accessing class streams data
 * @returns Class streams data with loading/error states
 */
export function useSharedClassStreams() {
  return useSharedEntity('classStreams');
}

/**
 * Hook for accessing departments data
 * @returns Departments data with loading/error states
 */
export function useSharedDepartments() {
  return useSharedEntity('departments');
}

/**
 * Hook for accessing academic years data
 * @returns Academic years data with loading/error states
 */
export function useSharedAcademicYears() {
  return useSharedEntity('academicYears');
}

/**
 * Hook for accessing school details
 * @returns School details with loading/error states
 */
export function useSharedSchoolDetails() {
  return useSharedEntity('schoolDetails');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Type guard to check if a string is a valid SharedEntity
 */
export function isSharedEntity(entity: string): entity is SharedEntity {
  return SHARED_ENTITIES.includes(entity as SharedEntity);
}

export default useSharedData;
