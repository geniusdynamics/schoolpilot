// ABOUTME: Tests the free-text search clause: OR across fields, literal wildcards, real columns.
import { describe, expect, it } from 'vitest';

import { buildWhere } from '../query';

describe('the list search', () => {
  it('ORs the fields and binds the substring once per field', () => {
    const where = buildWhere('learner', {
      search: { term: '12', fields: ['admission_number', 'given_name'] },
    });

    expect(where.clause).toContain('LOWER(CAST("admission_number" AS TEXT)) LIKE ? ESCAPE');
    expect(where.clause).toContain('LOWER(CAST("given_name" AS TEXT)) LIKE ? ESCAPE');
    expect(where.clause).toContain(' OR ');
    expect(where.params).toEqual(['%12%', '%12%']);
  });

  it('treats LIKE wildcards in the term as literal characters', () => {
    const where = buildWhere('learner', {
      search: { term: '50%_', fields: ['given_name'] },
    });

    expect(where.params).toEqual(['%50\\%\\_%']);
  });

  it('rejects a field that is not a column instead of guessing', () => {
    expect(() =>
      buildWhere('learner', { search: { term: 'x', fields: ['not_a_column'] } })
    ).toThrow(/not a column/);
  });

  it('ignores a blank term and an empty field list', () => {
    expect(buildWhere('learner', { search: { term: '   ', fields: ['given_name'] } }).clause).not.toContain(
      'LIKE'
    );
    expect(buildWhere('learner', { search: { term: 'x', fields: [] } }).clause).not.toContain('LIKE');
  });
});
