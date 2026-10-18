// ABOUTME: Type-level contract for the AppData context value: every declared member is required.
// ABOUTME: Pins that sync queue/history belong to SyncContext, not useAppData().

import { describe, expectTypeOf, it } from 'vitest';
import type { EnhancedAppDataContextType } from '@/contexts/AppDataContext';
import type { SyncContextType } from '@/contexts/SyncContext';

describe('AppData context value contract', () => {
  it('is a concrete value type rather than any', () => {
    expectTypeOf<EnhancedAppDataContextType>().not.toBeAny();
    expectTypeOf<EnhancedAppDataContextType['refreshData']>().toBeFunction();
    expectTypeOf<EnhancedAppDataContextType['students']>().toBeArray();
  });

  it('keeps the sync queue and history on SyncContext', () => {
    expectTypeOf<EnhancedAppDataContextType>().not.toHaveProperty('getQueueStatus');
    expectTypeOf<EnhancedAppDataContextType>().not.toHaveProperty('getSyncHistory');
    expectTypeOf<SyncContextType['getQueueStatus']>().toBeFunction();
    expectTypeOf<SyncContextType['getSyncHistory']>().toBeFunction();
  });

  it('rejects a context value that is missing a declared function', () => {
    type MissingRefreshData = Omit<EnhancedAppDataContextType, 'refreshData'>;
    const incomplete = {} as MissingRefreshData;
    // @ts-expect-error - the provider must implement every function the context declares.
    const complete: EnhancedAppDataContextType = incomplete;
    expectTypeOf(complete).toEqualTypeOf<EnhancedAppDataContextType>();
  });
});
