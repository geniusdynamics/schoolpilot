import { describe, expect, it } from 'vitest';
import {
  createAppDataLoadingState,
  normalizeAppDataCollections
} from '../AppDataContext';

describe('AppDataContext collection normalization', () => {
  it('maps snake_case collection keys to camelCase data keys with safe defaults', () => {
    const normalized = normalizeAppDataCollections({
      academic_year_structures: [{ id: 's1', name: 'Structure A' }],
      academic_period_definitions: undefined,
      academic_years: [{ id: 'y1', name: '2024/2025' }],
      class_streams: [{ id: 'cs1', name: 'Stream A' }]
    });

    expect(normalized.academicYearStructures).toEqual([{ id: 's1', name: 'Structure A' }]);
    expect(normalized.academicPeriodDefinitions).toEqual([]);
    expect(normalized.academicYears).toEqual([{ id: 'y1', name: '2024/2025' }]);
    expect(normalized.classStreams).toEqual([{ id: 'cs1', name: 'Stream A' }]);
    expect(normalized.departments).toEqual([]);
  });

  it('maps ID-card collections to their camelCase data keys', () => {
    const normalized = normalizeAppDataCollections({
      staff_id_cards: [{ id: 'sic-1' }],
      student_id_cards: [{ id: 'stic-1' }]
    });

    expect(normalized.staffIDCards).toEqual([{ id: 'sic-1' }]);
    expect(normalized.studentIDCards).toEqual([{ id: 'stic-1' }]);
  });

  it('provides a stable loading map for collection-specific lookups', () => {
    const loading = createAppDataLoadingState(false);

    expect(loading.all).toBe(false);
    expect(loading.academicYears).toBe(false);
    expect(loading.academicYearStructures).toBe(false);
    expect(loading.academicPeriodDefinitions).toBe(false);
  });
});
