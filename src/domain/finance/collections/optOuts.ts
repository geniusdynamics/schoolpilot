// ABOUTME: Opt-outs: a payer's standing instruction not to be reminded, scoped to a channel, a
// ABOUTME: category or everything, and the check that silences a reminder. An opt-out is stored on
// ABOUTME: its own, so editing a schedule cannot clear it.

import type { ReminderCategory, ReminderChannel, ReminderOptOut, ReminderOptOutScope } from './types';

/** The scope, in the words a screen shows. */
export function optOutScopeLabel(scope: ReminderOptOutScope): string {
  switch (scope.kind) {
    case 'all':
      return 'All reminders';
    case 'channel':
      return `The ${scope.channel} channel`;
    case 'category':
      return `The ${scope.category.replace(/_/g, ' ')} category`;
  }
}

/** A stable key for one scope, so the same instruction is recorded once. */
export function optOutScopeKey(scope: ReminderOptOutScope): string {
  switch (scope.kind) {
    case 'all':
      return 'all';
    case 'channel':
      return `channel:${scope.channel}`;
    case 'category':
      return `category:${scope.category}`;
  }
}

/** A stable key for one opt-out row: the payer and the scope it silences. */
export function optOutKey(optOut: ReminderOptOut): string {
  return `${optOut.payerId}|${optOutScopeKey(optOut.scope)}`;
}

/**
 * The opt-out that silences a reminder, or null.
 *
 * `all` silences anything; a `channel` opt-out silences that channel; a `category` opt-out
 * silences that category across every channel. The first match in the list wins, so a caller that
 * wants `all` reported ahead of a narrower one orders the list that way.
 */
export function optOutBlocks(
  optOuts: readonly ReminderOptOut[],
  payerId: string,
  channel: ReminderChannel,
  category: ReminderCategory
): ReminderOptOut | null {
  for (const optOut of optOuts) {
    if (optOut.payerId !== payerId) continue;
    if (optOut.scope.kind === 'all') return optOut;
    if (optOut.scope.kind === 'channel' && optOut.scope.channel === channel) return optOut;
    if (optOut.scope.kind === 'category' && optOut.scope.category === category) return optOut;
  }
  return null;
}
