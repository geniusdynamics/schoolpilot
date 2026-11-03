// ABOUTME: Proves a refused canonical write reaches an academics page as a sentence, not as the
// ABOUTME: repository's internal wording, and that the other refusals keep their own message.

import { describe, expect, it } from 'vitest';

import { RepositoryConflictError, RepositoryPermissionError } from '@/data/repository';

import { messageOf } from '../errors';

describe('the message an academics page shows for a refused write', () => {
  it('tells the reader what they tried to do and who to ask', () => {
    expect(messageOf(new RepositoryPermissionError('learning_area', 'remove'))).toBe(
      "You don't have permission to delete a learning area. Ask an administrator if you need this."
    );
  });

  it('keeps a conflict its own message, so a duplicate is never mistaken for a permission problem', () => {
    expect(messageOf(new RepositoryConflictError('learning_area', 'unique', 'code'))).toContain(
      'same key already exists'
    );
  });
});
