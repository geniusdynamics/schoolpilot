// ABOUTME: Turns a refused canonical write into a sentence a person can act on, so a role that may not
// ABOUTME: make a change is told why rather than shown an internal repository error.

import { RepositoryPermissionError } from '@/data/repository';

/** The verb a refusal names, in the words a reader expects. */
const ACTION_WORDS: Readonly<Record<string, string>> = {
  create: 'add',
  update: 'change',
  remove: 'delete',
  read: 'see',
  list: 'see',
  watch: 'see',
  audit: 'see',
};

/**
 * The message for a refused write, or null when the error is something else.
 *
 * A page shows this instead of the raw error: "Not allowed to create learning_area" is true and
 * useless to a teacher. The sentence names what they tried to do and tells them who to ask.
 */
export function permissionMessageFor(error: unknown): string | null {
  if (!(error instanceof RepositoryPermissionError)) return null;
  const action = ACTION_WORDS[error.action] ?? error.action;
  const entity = String(error.entity ?? 'record').replace(/_/g, ' ');
  const article = /^[aeiou]/.test(entity) ? 'an' : 'a';
  return `You don't have permission to ${action} ${article} ${entity}. Ask an administrator if you need this.`;
}

/**
 * The message for a refusal, or the error's own message when it is not a refusal.
 *
 * A page that has one error slot uses this: the refusal reads as a sentence, and anything else keeps
 * the message it already had.
 */
export function messageForWriteError(error: unknown, fallback: string): string {
  return permissionMessageFor(error) ?? (error instanceof Error ? error.message : fallback);
}
