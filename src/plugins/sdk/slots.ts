// ABOUTME: The UI extension slots the host renders (learner profile tabs, dashboard widgets, report
// ABOUTME: blocks, payment methods) and the registry that validates what a plug-in contributes to them.

/** The slots a plug-in may extend. Any other slot name in a manifest or a registration is refused. */
export const SLOT_NAMES = [
  'learner-profile-tab',
  'dashboard-widget',
  'report-block',
  'payment-method',
] as const;

export type SlotName = (typeof SLOT_NAMES)[number];

export interface SlotDefinition {
  readonly name: SlotName;
  /** What the host renders in the slot, so a plug-in author knows what a contribution looks like. */
  readonly renders: string;
}

/** The slot catalogue, mirroring the extension points in spec 06 §10. */
export const SLOT_DEFINITIONS: readonly SlotDefinition[] = [
  {
    name: 'learner-profile-tab',
    renders: 'A tab on one learner\'s profile page.',
  },
  {
    name: 'dashboard-widget',
    renders: 'A card on the home dashboard.',
  },
  {
    name: 'report-block',
    renders: 'A section appended to a generated report.',
  },
  {
    name: 'payment-method',
    renders: 'A payment method a school can offer at checkout.',
  },
];

const DEFAULT_ORDER = 100;
const SLOT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** What a plug-in adds to a slot. `component` is the name the host resolves to a component. */
export interface SlotContribution {
  readonly slot: SlotName;
  /** Unique per plug-in within the slot; two plug-ins may each contribute an `overview` tab. */
  readonly id: string;
  /** The label the host shows for this contribution. */
  readonly title: string;
  readonly component: string;
  readonly description?: string;
  /** Lower numbers render first; defaults to 100. */
  readonly order?: number;
}

/** A contribution as the registry stores it: with its plug-in and its resolved order. */
export interface RegisteredSlotContribution extends SlotContribution {
  readonly pluginId: string;
  readonly order: number;
}

/** Thrown when a contribution names an unknown slot, repeats an id, or is missing required fields. */
export class SlotRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlotRegistrationError';
  }
}

/** True when `name` is a slot the host renders. */
export function isKnownSlot(name: string): name is SlotName {
  return (SLOT_NAMES as readonly string[]).includes(name);
}

/** The slot names the SDK does not define, in the order they were declared. */
export function unknownSlots(names: readonly string[]): string[] {
  return names.filter((name) => !isKnownSlot(name));
}

function compareContributions(a: RegisteredSlotContribution, b: RegisteredSlotContribution): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.id.localeCompare(b.id);
}

/**
 * Holds what plug-ins contribute to each slot. The host renders `getSlots(slot)`; a plug-in registers
 * through `registerSlot`. Contributions are validated on the way in, so an unknown slot, a bad id or a
 * duplicate never reaches the renderer.
 */
export class SlotRegistry {
  private readonly contributions = new Map<SlotName, RegisteredSlotContribution[]>();

  registerSlot(pluginId: string, contribution: SlotContribution): RegisteredSlotContribution {
    if (!pluginId) {
      throw new SlotRegistrationError('a slot contribution needs the id of the plug-in contributing it');
    }
    if (!isKnownSlot(contribution.slot)) {
      throw new SlotRegistrationError(
        `unknown slot "${String(contribution.slot)}"; the host renders: ${SLOT_NAMES.join(', ')}`
      );
    }
    if (!SLOT_ID_PATTERN.test(contribution.id)) {
      throw new SlotRegistrationError(
        `slot contribution id "${contribution.id}" must be lowercase letters, digits and hyphens, starting with a letter`
      );
    }
    if (contribution.title.trim().length === 0) {
      throw new SlotRegistrationError(`slot contribution "${contribution.id}" needs a title`);
    }
    if (contribution.component.trim().length === 0) {
      throw new SlotRegistrationError(`slot contribution "${contribution.id}" needs a component to render`);
    }

    const existing = this.contributions.get(contribution.slot) ?? [];
    if (existing.some((item) => item.pluginId === pluginId && item.id === contribution.id)) {
      throw new SlotRegistrationError(
        `plug-in "${pluginId}" already contributes "${contribution.id}" to slot "${contribution.slot}"`
      );
    }

    const registered: RegisteredSlotContribution = {
      ...contribution,
      pluginId,
      order: contribution.order ?? DEFAULT_ORDER,
    };
    this.contributions.set(contribution.slot, [...existing, registered]);
    return registered;
  }

  /** Everything contributed to one slot, ordered by `order` then id. */
  getSlots(slot: SlotName): RegisteredSlotContribution[] {
    if (!isKnownSlot(slot)) {
      throw new SlotRegistrationError(`unknown slot "${String(slot)}"`);
    }
    return [...(this.contributions.get(slot) ?? [])].sort(compareContributions);
  }

  /** Everything contributed to every slot, grouped in catalogue order. */
  getAllSlots(): RegisteredSlotContribution[] {
    return SLOT_NAMES.flatMap((slot) => this.getSlots(slot));
  }

  /** Removes every contribution a plug-in made, as happens when it is deactivated. */
  unregisterPlugin(pluginId: string): void {
    for (const [slot, contributions] of this.contributions) {
      const remaining = contributions.filter((item) => item.pluginId !== pluginId);
      if (remaining.length === 0) {
        this.contributions.delete(slot);
      } else {
        this.contributions.set(slot, remaining);
      }
    }
  }

  clear(): void {
    this.contributions.clear();
  }
}

/** The registry the running host renders from. */
export const pluginSlots = new SlotRegistry();

/** Registers a contribution on the host's registry. */
export function registerSlot(pluginId: string, contribution: SlotContribution): RegisteredSlotContribution {
  return pluginSlots.registerSlot(pluginId, contribution);
}

/** Everything contributed to one slot on the host's registry, ordered by `order` then id. */
export function getSlots(slot: SlotName): RegisteredSlotContribution[] {
  return pluginSlots.getSlots(slot);
}
