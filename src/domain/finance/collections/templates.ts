// ABOUTME: Reminder templates: the message per channel and category, the variables it may use and
// ABOUTME: the locale it is written for. The placeholder convention is the one the app's
// ABOUTME: communication templates and built-in SMS mock already use, `{{variable}}`.

import { formatMoney, type Money } from '@/domain/money';

import { CollectionsError } from './errors';
import {
  REMINDER_VARIABLES,
  type ReminderCategory,
  type ReminderChannel,
  type ReminderTemplate,
  type ReminderVariables,
} from './types';

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** The placeholders a template body or subject names. */
export function templatePlaceholders(text: string): readonly string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) found.add(match[1]);
  return [...found];
}

/**
 * Renders a template.
 *
 * Every placeholder must be a variable the module knows and must have a value: an unknown name or
 * an empty value is refused rather than rendered as a stray brace or a blank, because a reminder
 * that reaches a parent with `{{amont}}` in it is worse than one that is not sent.
 */
export function renderTemplate(
  template: ReminderTemplate,
  variables: ReminderVariables
): { readonly subject?: string; readonly body: string } {
  const render = (text: string): string =>
    text.replace(PLACEHOLDER, (_match, name: string) => {
      if (!REMINDER_VARIABLES.includes(name as keyof ReminderVariables)) {
        throw new CollectionsError(
          'template_unknown_variable',
          `the template "${template.id}" names "{{${name}}}", which is not a reminder variable`,
          { detail: { templateId: template.id, variable: name, known: REMINDER_VARIABLES } }
        );
      }
      const value = variables[name as keyof ReminderVariables];
      if (value === undefined || value === '') {
        throw new CollectionsError(
          'template_missing_variable',
          `the template "${template.id}" names "{{${name}}}" but no value was supplied for it`,
          { detail: { templateId: template.id, variable: name } }
        );
      }
      return value;
    });

  const body = render(template.body);
  return template.subject === undefined
    ? { body }
    : { subject: render(template.subject), body };
}

/** How a template is chosen for a reminder. */
export interface TemplateQuery {
  readonly channel: ReminderChannel;
  readonly category: ReminderCategory;
  /** The payer's locale; a template written for it is preferred. */
  readonly locale?: string;
  /** A template pinned to a channel, which wins over locale preference. */
  readonly templateIds?: Readonly<Partial<Record<ReminderChannel, string>>>;
}

/**
 * The template to use, or undefined when none matches.
 *
 * A template pinned by id wins. Otherwise the templates for the channel and category are ranked:
 * the payer's exact locale, then the same language (`en` for `en-KE`), then the wildcard `*`.
 */
export function pickTemplate(
  templates: readonly ReminderTemplate[],
  query: TemplateQuery
): ReminderTemplate | undefined {
  const pinnedId = query.templateIds?.[query.channel];
  if (pinnedId !== undefined) {
    const pinned = templates.find((template) => template.id === pinnedId);
    if (pinned && pinned.channel === query.channel && pinned.category === query.category) return pinned;
  }

  const candidates = templates.filter(
    (template) => template.channel === query.channel && template.category === query.category
  );
  if (candidates.length === 0) return undefined;

  const locale = query.locale;
  const language = locale?.split('-')[0];
  return (
    (locale === undefined ? undefined : candidates.find((template) => template.locale === locale)) ??
    (language === undefined
      ? undefined
      : candidates.find((template) => template.locale.split('-')[0] === language)) ??
    candidates.find((template) => template.locale === '*') ??
    candidates[0]
  );
}

/** What a run states to fill a template's variables. */
export interface ReminderVariableInput {
  readonly payerName: string;
  readonly learnerName: string;
  readonly householdName?: string;
  readonly amount: Money;
  readonly dueDate: string | null;
  readonly invoiceNumber?: string;
  readonly daysPastDue: number;
  readonly payLink: string;
  readonly school: string;
  /** The locale the amount is formatted in; the payer's own. */
  readonly locale?: string;
}

/** Builds a template's variables from what a run knows. */
export function reminderVariables(input: ReminderVariableInput): ReminderVariables {
  return {
    payer: input.payerName,
    learner: input.learnerName,
    household: input.householdName ?? '',
    amount: formatMoney(input.amount, input.locale),
    currency: input.amount.currency,
    dueDate: input.dueDate ?? '',
    invoiceNumber: input.invoiceNumber ?? '',
    daysPastDue: String(Math.max(0, input.daysPastDue)),
    payLink: input.payLink,
    school: input.school,
  };
}
