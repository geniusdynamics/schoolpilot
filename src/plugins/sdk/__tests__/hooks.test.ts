// ABOUTME: Hook-contract tests for the plug-in SDK: service-hook delivery through the core hook system,
// ABOUTME: unsubscribing, and the refusal of hook names the SDK does not publish.

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ENGINE_HOOK_NAMES,
  KNOWN_HOOK_NAMES,
  SERVICE_HOOK_NAMES,
  ServiceHookBus,
  UI_HOOK_NAMES,
  UnknownHookError,
  isKnownHook,
  unknownHooks,
} from '../index';
import type { InvoicePostedEvent, LearnerAdmittedEvent } from '../index';
import { PluginHookSystem } from '../../PluginHookSystem';

const PLUGIN = 'com.example.birthday-notices';

const ADMISSION: LearnerAdmittedEvent = {
  learnerId: '0190f3a4-0000-7000-8000-000000000001',
  institutionId: '0190f3a4-0000-7000-8000-0000000000aa',
  admittedAt: '2026-01-12T08:30:00.000Z',
  dateOfBirth: '2011-03-04',
};

describe('the hook catalogue', () => {
  it('names the three service hooks of spec 06 §10', () => {
    expect([...SERVICE_HOOK_NAMES]).toEqual([
      'learner.admitted',
      'invoice.posted',
      'report.published',
    ]);
  });

  it('includes the UI hooks the builtin white-label plug-in subscribes to', () => {
    expect(UI_HOOK_NAMES).toContain('ui.branding.header');
    expect(UI_HOOK_NAMES).toContain('ui.label.resolve');
  });

  it('includes the engine hooks the builtin engines publish', () => {
    expect(ENGINE_HOOK_NAMES).toContain('grading.afterCalculate');
    expect(ENGINE_HOOK_NAMES).toContain('fees.afterCalculate');
  });

  it('knows every catalogued name and reports the rest', () => {
    for (const name of KNOWN_HOOK_NAMES) {
      expect(isKnownHook(name)).toBe(true);
    }
    expect(unknownHooks(['learner.admitted', 'learner.expelled'])).toEqual(['learner.expelled']);
  });
});

describe('ServiceHookBus', () => {
  it('delivers a published admission to a subscriber', () => {
    const bus = new ServiceHookBus();
    const seen: LearnerAdmittedEvent[] = [];
    bus.subscribe('learner.admitted', PLUGIN, (event) => {
      seen.push(event);
    });

    bus.publish('learner.admitted', ADMISSION);

    expect(seen).toEqual([ADMISSION]);
  });

  it('delivers to every subscriber, in priority order', () => {
    const bus = new ServiceHookBus();
    const order: string[] = [];
    bus.subscribe('invoice.posted', 'com.example.late', () => order.push('late'), 20);
    bus.subscribe('invoice.posted', 'com.example.early', () => order.push('early'), 5);

    const invoice: InvoicePostedEvent = {
      invoiceId: '0190f3a4-0000-7000-8000-000000000002',
      institutionId: '0190f3a4-0000-7000-8000-0000000000aa',
      learnerId: '0190f3a4-0000-7000-8000-000000000001',
      totalMinor: 250_000,
      currency: 'KES',
      postedAt: '2026-01-31T10:00:00.000Z',
    };
    bus.publish('invoice.posted', invoice);

    expect(order).toEqual(['early', 'late']);
  });

  it('stops delivering once the subscriber unsubscribes', () => {
    const bus = new ServiceHookBus();
    let calls = 0;
    const unsubscribe = bus.subscribe('report.published', PLUGIN, () => {
      calls += 1;
    });

    bus.publish('report.published', {
      reportId: '0190f3a4-0000-7000-8000-000000000003',
      institutionId: '0190f3a4-0000-7000-8000-0000000000aa',
      reportType: 'termly-results',
      publishedAt: '2026-04-02T09:00:00.000Z',
    });
    unsubscribe();
    bus.publish('report.published', {
      reportId: '0190f3a4-0000-7000-8000-000000000004',
      institutionId: '0190f3a4-0000-7000-8000-0000000000aa',
      reportType: 'termly-results',
      publishedAt: '2026-04-02T09:05:00.000Z',
    });

    expect(calls).toBe(1);
  });

  it('refuses to subscribe to a hook the SDK does not publish', () => {
    const bus = new ServiceHookBus();
    expect(() => bus.subscribe('learner.expelled' as never, PLUGIN, () => undefined)).toThrow(
      UnknownHookError
    );
    expect(() => bus.subscribe('learner.expelled' as never, PLUGIN, () => undefined)).toThrow(
      /learner\.expelled/
    );
  });

  it('refuses to publish a hook the SDK does not publish', () => {
    const bus = new ServiceHookBus();
    expect(() => bus.publish('learner.expelled' as never, ADMISSION as never)).toThrow(
      UnknownHookError
    );
  });

  it('runs on the core hook system the host already owns', () => {
    const hookSystem = new PluginHookSystem();
    const bus = new ServiceHookBus(hookSystem);
    const seen: string[] = [];
    bus.subscribe('learner.admitted', PLUGIN, (event) => seen.push(event.learnerId));

    bus.publish('learner.admitted', ADMISSION);

    expect(bus.getHookSystem()).toBe(hookSystem);
    expect(hookSystem.getRegisteredHooks()).toContain('learner.admitted');
    expect(seen).toEqual([ADMISSION.learnerId]);
  });

  it('types the event a handler receives', () => {
    const bus = new ServiceHookBus();
    bus.subscribe('invoice.posted', PLUGIN, (event) => {
      expectTypeOf(event).toEqualTypeOf<InvoicePostedEvent>();
      expectTypeOf(event.totalMinor).toEqualTypeOf<number>();
    });
  });
});
