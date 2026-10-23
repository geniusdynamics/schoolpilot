// ABOUTME: Reminder templates: the {{variable}} rendering (and the refusal of an unknown or empty
// ABOUTME: one), the locale preference of the picker, and the variables a run fills.

import { describe, expect, it } from 'vitest';

import { fromMinor } from '@/domain/money';

import {
  isCollectionsError,
  pickTemplate,
  reminderVariables,
  renderTemplate,
  templatePlaceholders,
  type ReminderTemplate,
} from '..';

const template = (overrides: Partial<ReminderTemplate> = {}): ReminderTemplate => ({
  id: 'tpl-sms-gentle',
  name: 'Gentle SMS',
  channel: 'sms',
  category: 'fee_reminder',
  tone: 'gentle',
  locale: 'en-KE',
  body: 'Dear {{payer}}, {{amount}} for {{learner}} is due on {{dueDate}}. Pay: {{payLink}}',
  ...overrides,
});

const variables = {
  payer: 'Grace Wekesa',
  learner: 'Amani Wekesa',
  household: '',
  amount: 'KSh 5,000.00',
  currency: 'KES',
  dueDate: '2027-02-05',
  invoiceNumber: '',
  daysPastDue: '0',
  payLink: 'https://pay.example.test/fees?t=abc',
  school: 'Mwangaza Secondary',
};

describe('rendering a template', () => {
  it('substitutes every placeholder, and a subject too', () => {
    const rendered = renderTemplate(template({ subject: 'Fees for {{learner}}' }), variables);
    expect(rendered.subject).toBe('Fees for Amani Wekesa');
    expect(rendered.body).toBe(
      'Dear Grace Wekesa, KSh 5,000.00 for Amani Wekesa is due on 2027-02-05. Pay: https://pay.example.test/fees?t=abc'
    );
  });

  it('refuses a placeholder that is not a variable', () => {
    let caught: unknown;
    try {
      renderTemplate(template({ body: 'You owe {{amont}}' }), variables);
    } catch (error) {
      caught = error;
    }
    expect(isCollectionsError(caught) && caught.code).toBe('template_unknown_variable');
  });

  it('refuses a variable the run has no value for', () => {
    let caught: unknown;
    try {
      renderTemplate(template({ body: 'Fees for the {{household}} household' }), variables);
    } catch (error) {
      caught = error;
    }
    expect(isCollectionsError(caught) && caught.code).toBe('template_missing_variable');
  });

  it('names the placeholders a template uses', () => {
    expect(templatePlaceholders('{{a}} and {{ b }} and {{a}}')).toEqual(['a', 'b']);
  });
});

describe('picking a template', () => {
  const templates: readonly ReminderTemplate[] = [
    template({ id: 'sms-en', locale: 'en-KE' }),
    template({ id: 'sms-sw', locale: 'sw-KE' }),
    template({ id: 'sms-any', locale: '*' }),
    template({ id: 'sms-firm', category: 'overdue_notice', tone: 'firm' }),
  ];

  it('prefers the payer locale, then the language, then the wildcard', () => {
    expect(pickTemplate(templates, { channel: 'sms', category: 'fee_reminder', locale: 'en-KE' })?.id).toBe(
      'sms-en'
    );
    expect(pickTemplate(templates, { channel: 'sms', category: 'fee_reminder', locale: 'sw-KE' })?.id).toBe(
      'sms-sw'
    );
    expect(pickTemplate(templates, { channel: 'sms', category: 'fee_reminder', locale: 'en-GB' })?.id).toBe(
      'sms-en'
    );
    expect(pickTemplate(templates, { channel: 'sms', category: 'fee_reminder', locale: 'fr-FR' })?.id).toBe(
      'sms-any'
    );
    expect(pickTemplate(templates, { channel: 'sms', category: 'fee_reminder' })?.id).toBe('sms-any');
  });

  it('honours a pinned template, and finds nothing for a category with no template', () => {
    expect(
      pickTemplate(templates, {
        channel: 'sms',
        category: 'fee_reminder',
        templateIds: { sms: 'sms-sw' },
      })?.id
    ).toBe('sms-sw');
    expect(pickTemplate(templates, { channel: 'email', category: 'fee_reminder' })).toBeUndefined();
    expect(pickTemplate(templates, { channel: 'sms', category: 'final_notice' })).toBeUndefined();
  });
});

describe('the variables a run fills', () => {
  it('formats the amount in the payer locale and states the arrears', () => {
    const filled = reminderVariables({
      payerName: 'Grace Wekesa',
      learnerName: 'Amani Wekesa',
      amount: fromMinor(150_000, 'KES'),
      dueDate: '2027-02-05',
      daysPastDue: 11,
      payLink: 'https://pay.example.test/fees?t=abc',
      school: 'Mwangaza Secondary',
      locale: 'en-KE',
    });
    expect(filled.currency).toBe('KES');
    expect(filled.amount).toContain('1,500');
    expect(filled.dueDate).toBe('2027-02-05');
    expect(filled.daysPastDue).toBe('11');
    expect(filled.learner).toBe('Amani Wekesa');
    expect(filled.household).toBe('');
  });
});
