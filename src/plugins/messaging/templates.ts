// ABOUTME: Message templates with merge fields: field discovery, strict rendering that refuses a
// ABOUTME: missing value and names every one, and the plain-text and WhatsApp variants of a template.

/** A template a school writes once and sends many times. */
export interface MessageTemplate {
  readonly id: string;
  /** The language code the template is written in; WhatsApp wants one on the send. */
  readonly language?: string;
  /** The email subject, when the template is used for email. */
  readonly subject?: string;
  /** The plain-text body, with `{{merge.fields}}` where values go. */
  readonly body: string;
}

/** One parameter in the shape WhatsApp's documented template send payload uses. */
export interface WhatsAppParameter {
  readonly type: 'text';
  readonly text: string;
}

/** A rendered template, in both the variants this module produces. */
export interface RenderedTemplate {
  readonly id: string;
  readonly language: string;
  readonly subject: string | null;
  readonly body: string;
  /**
   * The WhatsApp template variant: the template's name, language and ordered body parameters.
   *
   * The parameters are positional, because a merge field such as `learner.name` is not a valid
   * WhatsApp parameter name (Meta allows lowercase letters and underscores). A template created
   * with named parameters needs each value's `parameter_name` added; this renderer does not yet
   * emit one, so named templates are a draft path rather than a supported one.
   */
  readonly whatsapp: {
    readonly name: string;
    readonly language: string;
    readonly parameters: readonly WhatsAppParameter[];
  };
}

/** Raised when a template cannot be rendered because a value it names is absent. */
export class TemplateRenderError extends Error {
  /** Every merge field with no value, in the order the template names them. */
  readonly missing: readonly string[];

  constructor(templateId: string, missing: readonly string[]) {
    super(
      `the template "${templateId}" has no value for ${missing.length === 1 ? 'the field' : 'the fields'}: ${missing.join(', ')}`
    );
    this.name = 'TemplateRenderError';
    this.missing = missing;
  }
}

/** The merge values a template is rendered with; nesting is expressed with dots. */
export type TemplateValues = Readonly<Record<string, unknown>>;

const MERGE_FIELD = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*\}\}/g;

/** The merge fields in one piece of text, in first-appearance order, without repeats. */
function fieldsIn(text: string | undefined): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const match of text.matchAll(MERGE_FIELD)) {
    const field = match[1]!;
    if (!found.includes(field)) found.push(field);
  }
  return found;
}

/** Every merge field a template names, subject first, without repeats. */
export function templateFields(template: MessageTemplate): string[] {
  return fieldsIn(`${template.subject ?? ''} ${template.body}`);
}

/** A value as text, or null when the path holds nothing a message can print. */
function scalarAt(values: TemplateValues, path: string): string | null {
  let current: unknown = values;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  if (typeof current === 'string') return current;
  if (typeof current === 'number' && Number.isFinite(current)) return String(current);
  if (typeof current === 'boolean') return String(current);
  return null;
}

/** Substitutes every merge field in `text` with the value resolved from `values`. */
function substitute(text: string | undefined, values: TemplateValues): string {
  if (!text) return '';
  return text.replace(MERGE_FIELD, (_match, field: string) => scalarAt(values, field) ?? '');
}

/**
 * Renders a template into the plain-text variant and the WhatsApp variant.
 *
 * Strict on purpose: a template that names a value the caller did not supply is refused, with every
 * missing field listed, rather than sent with a blank where a learner's name should be. An empty
 * string is a value - a caller may deliberately blank a field - but a missing path, null, an object
 * or an array is not.
 */
export function renderTemplate(template: MessageTemplate, values: TemplateValues): RenderedTemplate {
  const fields = templateFields(template);
  const missing = fields.filter((field) => scalarAt(values, field) === null);
  if (missing.length > 0) throw new TemplateRenderError(template.id, missing);

  const language = template.language ?? 'en';
  const bodyFields = fieldsIn(template.body);

  return {
    id: template.id,
    language,
    subject: template.subject ? substitute(template.subject, values) : null,
    body: substitute(template.body, values),
    whatsapp: {
      name: template.id,
      language,
      parameters: bodyFields.map((field) => ({ type: 'text', text: scalarAt(values, field) ?? '' })),
    },
  };
}
