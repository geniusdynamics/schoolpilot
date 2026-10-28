// ABOUTME: The plug-in SDK's hook contract: the service hooks with typed payloads (learner admitted,
// ABOUTME: invoice posted, report published), the host's UI and engine hooks, and a bus over the hook system.

import { PluginHookSystem } from '../PluginHookSystem';

/** A learner has been admitted: the record exists and the admission is complete. */
export interface LearnerAdmittedEvent {
  readonly learnerId: string;
  readonly institutionId: string;
  /** ISO-8601 timestamp of the admission. */
  readonly admittedAt: string;
  readonly programmeId?: string;
  /** The learner's display name, so a plug-in need not re-read the learner to address them. */
  readonly learnerName?: string;
  /** `YYYY-MM-DD`; present when the admission captured it, so birthday features can use the event. */
  readonly dateOfBirth?: string;
}

/** An invoice has been posted to a learner's account and is payable. */
export interface InvoicePostedEvent {
  readonly invoiceId: string;
  readonly institutionId: string;
  readonly learnerId: string;
  /** Amount in minor units of `currency`, the way the ledger stores money. */
  readonly totalMinor: number;
  readonly currency: string;
  /** ISO-8601 timestamp of posting. */
  readonly postedAt: string;
}

/** A report has been generated and published to its audience. */
export interface ReportPublishedEvent {
  readonly reportId: string;
  readonly institutionId: string;
  readonly reportType: string;
  /** ISO-8601 timestamp of publication. */
  readonly publishedAt: string;
  readonly publishedBy?: string;
}

/** The service hooks and the payload each one carries. */
export interface ServiceHookPayloads {
  'learner.admitted': LearnerAdmittedEvent;
  'invoice.posted': InvoicePostedEvent;
  'report.published': ReportPublishedEvent;
}

export type ServiceHookName = keyof ServiceHookPayloads;

export interface ServiceHookDefinition {
  readonly name: ServiceHookName;
  readonly purpose: string;
}

/** The service hooks of spec 06 §10: on admitted, on invoice posted, on report published. */
export const SERVICE_HOOK_DEFINITIONS: readonly ServiceHookDefinition[] = [
  {
    name: 'learner.admitted',
    purpose: 'Fires once an admission is complete; a plug-in can start whatever it does for a new learner.',
  },
  {
    name: 'invoice.posted',
    purpose: 'Fires when an invoice is posted; accounting and messaging plug-ins react to it.',
  },
  {
    name: 'report.published',
    purpose: 'Fires when a generated report is published; digest and archival plug-ins react to it.',
  },
];

export const SERVICE_HOOK_NAMES: readonly ServiceHookName[] = SERVICE_HOOK_DEFINITIONS.map(
  (definition) => definition.name
);

/**
 * The UI hooks the host applies to filter rendered values. These are the hooks the builtin
 * white-label plug-in subscribes to; a plug-in manifest may name them.
 */
export const UI_HOOK_NAMES: readonly string[] = [
  'ui.branding.header',
  'ui.branding.title',
  'ui.branding.logo',
  'ui.branding.colors',
  'ui.label.resolve',
  'ui.menu.beforeRender',
  'ui.footer.render',
];

/** The hooks the builtin computation engines publish around their own calculations. */
export const ENGINE_HOOK_NAMES: readonly string[] = [
  'grading.beforeCalculate',
  'grading.afterCalculate',
  'grading.validateConfig',
  'fees.beforeCalculate',
  'fees.afterCalculate',
  'fees.applyDiscounts',
  'fees.generateSchedule',
];

/**
 * The hooks backend-provider plug-ins subscribe to: registering a data provider, running around a sync,
 * and the per-record and realtime notifications a connector reacts to.
 */
export const INTEGRATION_HOOK_NAMES: readonly string[] = [
  'backend.provider.register',
  'sync.before',
  'sync.after',
  'data.beforeSave',
  'data.afterLoad',
  'realtime.document.update',
  'realtime.update',
];

/** Every hook name a manifest may declare. Anything else is refused. */
export const KNOWN_HOOK_NAMES: readonly string[] = [
  ...SERVICE_HOOK_NAMES,
  ...UI_HOOK_NAMES,
  ...ENGINE_HOOK_NAMES,
  ...INTEGRATION_HOOK_NAMES,
];

/** True when `name` is a hook the SDK publishes. */
export function isKnownHook(name: string): boolean {
  return KNOWN_HOOK_NAMES.includes(name);
}

/** The hook names the SDK does not publish, in the order they were declared. */
export function unknownHooks(names: readonly string[]): string[] {
  return names.filter((name) => !isKnownHook(name));
}

/** Thrown when a plug-in subscribes to or publishes a hook the SDK does not define. */
export class UnknownHookError extends Error {
  constructor(name: string) {
    super(`unknown hook "${name}"; the SDK publishes: ${KNOWN_HOOK_NAMES.join(', ')}`);
    this.name = 'UnknownHookError';
  }
}

export type ServiceHookHandler<K extends ServiceHookName> = (
  event: ServiceHookPayloads[K]
) => void;

/**
 * Subscribes plug-ins to the service hooks and publishes events to them, on top of the core hook
 * system (timeouts, failure counting and the per-plug-in circuit breaker live there).
 *
 * Hook names are checked on the way in and on the way out: a plug-in that subscribes to a hook the
 * SDK does not publish is refused instead of silently never firing.
 */
export class ServiceHookBus {
  constructor(private readonly hookSystem: PluginHookSystem = new PluginHookSystem()) {}

  /** Subscribes `handler` to one service hook; returns the unsubscribe function. */
  subscribe<K extends ServiceHookName>(
    name: K,
    pluginId: string,
    handler: ServiceHookHandler<K>,
    priority = 10
  ): () => void {
    if (!isKnownHook(name)) throw new UnknownHookError(String(name));

    const wrapped = (event: ServiceHookPayloads[K]) => {
      handler(event);
    };
    this.hookSystem.registerHook(name, wrapped, pluginId, priority);
    return () => this.hookSystem.removeHook(name, wrapped);
  }

  /** Publishes an event to every subscriber of one service hook. */
  publish<K extends ServiceHookName>(name: K, event: ServiceHookPayloads[K]): void {
    if (!isKnownHook(name)) throw new UnknownHookError(String(name));
    this.hookSystem.doHook(name, event);
  }

  /** The hook system this bus runs on, for a host that already owns one. */
  getHookSystem(): PluginHookSystem {
    return this.hookSystem;
  }
}
