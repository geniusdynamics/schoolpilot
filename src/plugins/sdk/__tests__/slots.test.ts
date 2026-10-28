// ABOUTME: Slot-registry tests for the plug-in SDK: registration, ordering, per-plug-in ids and the
// ABOUTME: refusals for unknown slots and malformed contributions.

import { beforeEach, describe, expect, it } from 'vitest';

import {
  SLOT_NAMES,
  SlotRegistry,
  SlotRegistrationError,
  getSlots,
  pluginSlots,
  registerSlot,
  unknownSlots,
} from '../index';

const PLUGIN = 'com.example.birthday-notices';
const OTHER_PLUGIN = 'com.example.attendance-digest';

describe('the slot catalogue', () => {
  it('names the four extension points of spec 06 §10', () => {
    expect([...SLOT_NAMES]).toEqual([
      'learner-profile-tab',
      'dashboard-widget',
      'report-block',
      'payment-method',
    ]);
  });

  it('reports the names the host does not render', () => {
    expect(unknownSlots(['dashboard-widget', 'timetable-overlay'])).toEqual(['timetable-overlay']);
    expect(unknownSlots(['dashboard-widget'])).toEqual([]);
  });
});

describe('SlotRegistry', () => {
  let registry: SlotRegistry;

  beforeEach(() => {
    registry = new SlotRegistry();
  });

  it('registers a contribution and returns it with its plug-in and default order', () => {
    const registered = registry.registerSlot(PLUGIN, {
      slot: 'dashboard-widget',
      id: 'birthday-notices',
      title: 'Birthdays this week',
      component: 'BirthdayNoticesWidget',
    });

    expect(registered.pluginId).toBe(PLUGIN);
    expect(registered.order).toBe(100);
    expect(registry.getSlots('dashboard-widget')).toHaveLength(1);
    expect(registry.getSlots('dashboard-widget')[0].title).toBe('Birthdays this week');
  });

  it('returns an empty list for a slot nobody contributes to', () => {
    expect(registry.getSlots('payment-method')).toEqual([]);
  });

  it('orders contributions by order, then by id', () => {
    registry.registerSlot(PLUGIN, {
      slot: 'report-block',
      id: 'zeta',
      title: 'Zeta',
      component: 'ZetaBlock',
      order: 10,
    });
    registry.registerSlot(OTHER_PLUGIN, {
      slot: 'report-block',
      id: 'alpha',
      title: 'Alpha',
      component: 'AlphaBlock',
      order: 10,
    });
    registry.registerSlot(PLUGIN, {
      slot: 'report-block',
      id: 'first',
      title: 'First',
      component: 'FirstBlock',
      order: 5,
    });

    expect(registry.getSlots('report-block').map((item) => item.id)).toEqual([
      'first',
      'alpha',
      'zeta',
    ]);
  });

  it('lets two plug-ins contribute the same id, scoped by plug-in', () => {
    registry.registerSlot(PLUGIN, {
      slot: 'learner-profile-tab',
      id: 'overview',
      title: 'Overview',
      component: 'ExampleOverviewTab',
    });
    registry.registerSlot(OTHER_PLUGIN, {
      slot: 'learner-profile-tab',
      id: 'overview',
      title: 'Overview',
      component: 'OtherOverviewTab',
    });

    expect(registry.getSlots('learner-profile-tab').map((item) => item.pluginId)).toEqual([
      PLUGIN,
      OTHER_PLUGIN,
    ]);
  });

  it('refuses a slot the host does not render', () => {
    expect(() =>
      registry.registerSlot(PLUGIN, {
        slot: 'timetable-overlay' as never,
        id: 'birthday-notices',
        title: 'Birthdays',
        component: 'BirthdayNoticesWidget',
      })
    ).toThrow(SlotRegistrationError);
    expect(() =>
      registry.registerSlot(PLUGIN, {
        slot: 'timetable-overlay' as never,
        id: 'birthday-notices',
        title: 'Birthdays',
        component: 'BirthdayNoticesWidget',
      })
    ).toThrow(/timetable-overlay/);
  });

  it('refuses a repeat of the same contribution from one plug-in', () => {
    const contribution = {
      slot: 'dashboard-widget' as const,
      id: 'birthday-notices',
      title: 'Birthdays',
      component: 'BirthdayNoticesWidget',
    };
    registry.registerSlot(PLUGIN, contribution);

    expect(() => registry.registerSlot(PLUGIN, contribution)).toThrow(/already contributes/);
  });

  it('refuses a contribution without a component, a title or a usable id', () => {
    expect(() =>
      registry.registerSlot(PLUGIN, {
        slot: 'dashboard-widget',
        id: 'birthday-notices',
        title: 'Birthdays',
        component: '  ',
      })
    ).toThrow(/component/);
    expect(() =>
      registry.registerSlot(PLUGIN, {
        slot: 'dashboard-widget',
        id: 'birthday-notices',
        title: '   ',
        component: 'BirthdayNoticesWidget',
      })
    ).toThrow(/title/);
    expect(() =>
      registry.registerSlot(PLUGIN, {
        slot: 'dashboard-widget',
        id: 'Birthday Notices',
        title: 'Birthdays',
        component: 'BirthdayNoticesWidget',
      })
    ).toThrow(/id/);
  });

  it('refuses a contribution that names no plug-in', () => {
    expect(() =>
      registry.registerSlot('', {
        slot: 'dashboard-widget',
        id: 'birthday-notices',
        title: 'Birthdays',
        component: 'BirthdayNoticesWidget',
      })
    ).toThrow(/plug-in/);
  });

  it('removes every contribution of one plug-in on unregister', () => {
    registry.registerSlot(PLUGIN, {
      slot: 'dashboard-widget',
      id: 'birthday-notices',
      title: 'Birthdays',
      component: 'BirthdayNoticesWidget',
    });
    registry.registerSlot(OTHER_PLUGIN, {
      slot: 'dashboard-widget',
      id: 'attendance-digest',
      title: 'Attendance',
      component: 'AttendanceDigestWidget',
    });

    registry.unregisterPlugin(PLUGIN);

    expect(registry.getSlots('dashboard-widget').map((item) => item.pluginId)).toEqual([OTHER_PLUGIN]);
  });

  it('lists every slot in catalogue order', () => {
    registry.registerSlot(PLUGIN, {
      slot: 'payment-method',
      id: 'mobile-money',
      title: 'Mobile money',
      component: 'MobileMoneyMethod',
    });
    registry.registerSlot(PLUGIN, {
      slot: 'dashboard-widget',
      id: 'birthday-notices',
      title: 'Birthdays',
      component: 'BirthdayNoticesWidget',
    });

    expect(registry.getAllSlots().map((item) => item.slot)).toEqual([
      'dashboard-widget',
      'payment-method',
    ]);
  });
});

describe('the host registry', () => {
  beforeEach(() => {
    pluginSlots.clear();
  });

  it('registers and reads back through the module-level API a plug-in uses', () => {
    registerSlot(PLUGIN, {
      slot: 'dashboard-widget',
      id: 'birthday-notices',
      title: 'Birthdays this week',
      component: 'BirthdayNoticesWidget',
    });

    expect(getSlots('dashboard-widget')).toHaveLength(1);
    expect(getSlots('dashboard-widget')[0].pluginId).toBe(PLUGIN);
  });
});
