// ABOUTME: Proves a refused write reads as a sentence a person can act on, and that any other error
// ABOUTME: keeps its own message so a real failure is never disguised as a permission problem.

import { describe, expect, it } from 'vitest';

import { RepositoryPermissionError } from '@/data/repository';

import { messageForWriteError, permissionMessageFor } from '../permissionMessages';

describe('the permission message', () => {
  it('says what the person tried to do, and who to ask', () => {
    const error = new RepositoryPermissionError('learning_area', 'remove');
    expect(permissionMessageFor(error)).toBe(
      "You don't have permission to delete a learning area. Ask an administrator if you need this."
    );
  });

  it('reads the verb for a create and for an update', () => {
    expect(permissionMessageFor(new RepositoryPermissionError('fee_item', 'create'))).toContain(
      "permission to add a fee item"
    );
    expect(permissionMessageFor(new RepositoryPermissionError('mark', 'update'))).toContain(
      "permission to change a mark"
    );
  });

  it('says nothing about an error that is not a refusal', () => {
    expect(permissionMessageFor(new Error('the database is closed'))).toBeNull();
    expect(permissionMessageFor(null)).toBeNull();
  });

  it('falls back to the error it was given, so a real failure keeps its message', () => {
    expect(messageForWriteError(new Error('disk is full'), 'could not save')).toBe('disk is full');
    expect(messageForWriteError('a string', 'could not save')).toBe('could not save');
  });
});
