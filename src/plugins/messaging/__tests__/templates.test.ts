// ABOUTME: Tests for message templates: merge-field discovery, strict rendering that names every
// ABOUTME: missing field, and the plain-text and WhatsApp variants of one template.

import { describe, expect, it } from 'vitest';

import {
  TemplateRenderError,
  renderTemplate,
  templateFields,
  type MessageTemplate,
} from '../templates';

const TEMPLATE: MessageTemplate = {
  id: 'fees-due',
  language: 'en',
  subject: 'Fees for {{learner.name}} are due',
  body: 'Dear {{ guardian.name }}, {{learner.name}} ({{learner.admissionNumber}}) owes {{amount}}.',
};

const VALUES = {
  learner: { name: 'Amina Otieno', admissionNumber: 'GA/2027/001' },
  guardian: { name: 'Mr Otieno' },
  amount: 'KES 1,500',
};

describe('template merge fields', () => {
  it('finds nested fields in subject and body, in first-appearance order, without repeats', () => {
    const template: MessageTemplate = {
      id: 'repeat',
      body: '{{learner.name}} and {{learner.name}} again, then {{amount}}',
      subject: 'Hi {{learner.name}}',
    };
    expect(templateFields(template)).toEqual(['learner.name', 'amount']);
  });

  it('tolerates whitespace inside the braces', () => {
    const template: MessageTemplate = { id: 'spaced', body: 'Hello {{  learner.name  }}' };
    expect(templateFields(template)).toEqual(['learner.name']);
  });
});

describe('template rendering', () => {
  it('renders the plain-text variant from nested values', () => {
    const rendered = renderTemplate(TEMPLATE, VALUES);

    expect(rendered.subject).toBe('Fees for Amina Otieno are due');
    expect(rendered.body).toBe(
      'Dear Mr Otieno, Amina Otieno (GA/2027/001) owes KES 1,500.'
    );
    expect(rendered.id).toBe('fees-due');
    expect(rendered.language).toBe('en');
  });

  it('renders numbers and booleans as text', () => {
    const rendered = renderTemplate(
      { id: 'numbers', body: '{{count}} of {{total}} — {{waived}}' },
      { count: 3, total: 4, waived: false }
    );
    expect(rendered.body).toBe('3 of 4 — false');
  });

  it('renders the WhatsApp variant with parameters in field order', () => {
    const rendered = renderTemplate(TEMPLATE, VALUES);
    expect(rendered.whatsapp).toEqual({
      name: 'fees-due',
      language: 'en',
      parameters: [
        { type: 'text', text: 'Mr Otieno' },
        { type: 'text', text: 'Amina Otieno' },
        { type: 'text', text: 'GA/2027/001' },
        { type: 'text', text: 'KES 1,500' },
      ],
    });
  });

  it('defaults the language to en and leaves an absent subject null', () => {
    const rendered = renderTemplate({ id: 'plain', body: 'No subject here' }, {});
    expect(rendered.subject).toBeNull();
    expect(rendered.language).toBe('en');
  });
});

describe('template missing values', () => {
  it('refuses to render and names every missing field', () => {
    let thrown: unknown;
    try {
      renderTemplate(TEMPLATE, { learner: { name: 'Amina Otieno' } });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TemplateRenderError);
    const error = thrown as TemplateRenderError;
    expect(error.missing).toEqual(['guardian.name', 'learner.admissionNumber', 'amount']);
    expect(error.message).toContain('guardian.name');
    expect(error.message).toContain('learner.admissionNumber');
    expect(error.message).toContain('amount');
  });

  it('treats an object or an empty path as missing rather than printing [object Object]', () => {
    let thrown: unknown;
    try {
      renderTemplate({ id: 'object', body: '{{learner}}' }, { learner: { name: 'Amina' } });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(TemplateRenderError);
    expect((thrown as TemplateRenderError).missing).toEqual(['learner']);
  });

  it('accepts an empty string as a value, because a blank field is a decision', () => {
    expect(renderTemplate({ id: 'blank', body: 'X{{middle}}Y' }, { middle: '' }).body).toBe('XY');
  });
});
