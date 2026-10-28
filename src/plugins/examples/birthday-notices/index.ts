// ABOUTME: An example third-party plug-in: a dashboard widget of upcoming learner birthdays that keeps its
// ABOUTME: roster current from the learner-admitted hook. It imports only the plug-in SDK.

import {
  parseManifest,
  pluginSlots,
  registerSlot,
  type PluginContext,
  type PluginModule,
  type SdkPluginManifest,
  type ServiceHookHandler,
} from '@/plugins/sdk';
import { upcomingBirthdays } from './birthdays';
import type { BirthdayNotice, LearnerBirthday } from './birthdays';

import manifestJson from './plugin.json';

/** The manifest the host validates: the JSON above, parsed by the SDK's own schema. */
export const manifest: SdkPluginManifest = parseManifest(manifestJson);

const DEFAULT_DAYS_AHEAD = 7;
const MAX_DAYS_AHEAD = 60;

/** Learners admitted while the plug-in is active, keyed by id so a re-admission replaces the record. */
const roster = new Map<string, LearnerBirthday>();

/**
 * Records an admitted learner when the admission captured a date of birth. The event carries a display
 * name, which this example splits into the two name fields its widget model uses.
 */
const onLearnerAdmitted: ServiceHookHandler<'learner.admitted'> = (event) => {
  if (!event.dateOfBirth) return;

  const displayName = event.learnerName ?? event.learnerId;
  const [firstName, ...rest] = displayName.split(' ');

  roster.set(event.learnerId, {
    learnerId: event.learnerId,
    firstName,
    lastName: rest.join(' '),
    dateOfBirth: event.dateOfBirth,
  });
};

function readDaysAhead(settings: Readonly<Record<string, unknown>>): number {
  const configured = settings.daysAhead;
  if (typeof configured !== 'number' || !Number.isFinite(configured)) return DEFAULT_DAYS_AHEAD;
  return Math.min(MAX_DAYS_AHEAD, Math.max(1, Math.round(configured)));
}

/**
 * The widget's data: the notices for the learners this plug-in has seen, using the school's settings.
 * The host renders `BirthdayNoticesWidget` from this model.
 */
export function buildWidgetModel(
  settings: Readonly<Record<string, unknown>>,
  from: Date
): BirthdayNotice[] {
  const noticeTemplate = settings.noticeTemplate;

  return upcomingBirthdays([...roster.values()], {
    from,
    daysAhead: readDaysAhead(settings),
    includeWeekends: settings.includeWeekends !== false,
    template: typeof noticeTemplate === 'string' ? noticeTemplate : undefined,
  });
}

const module: PluginModule = {
  activate(context: PluginContext) {
    registerSlot(context.pluginId, {
      slot: 'dashboard-widget',
      id: 'birthday-notices',
      title: 'Birthdays this week',
      component: 'BirthdayNoticesWidget',
      description: 'Learners with a birthday in the next few days.',
      order: 40,
    });

    context.api.addHook('learner.admitted', onLearnerAdmitted, 10);
  },

  deactivate(context: PluginContext) {
    pluginSlots.unregisterPlugin(context.pluginId);
    context.api.removeHook('learner.admitted', onLearnerAdmitted);
    roster.clear();
  },
};

export default { manifest, module };
