// ABOUTME: The number grammar of a sequence: compiling a `{TOKEN}` pattern, rendering a number
// ABOUTME: from a scope and a counter, and parsing a number back into its counter and scope.

import { SequenceFormatError } from './errors';
import type { ParsedNumber, ScopeSegment, ScopeValues, SequenceDefinition } from './types';

/** A run of literal text between tokens. */
export interface LiteralPart {
  readonly kind: 'literal';
  readonly text: string;
}

/** A scope segment rendered into the number, e.g. `{YYYY}`. */
export interface SegmentPart {
  readonly kind: 'segment';
  readonly segment: ScopeSegment;
  readonly token: string;
}

/** The counter, zero-padded to `width` digits, e.g. `{SEQ:3}`. */
export interface CounterPart {
  readonly kind: 'counter';
  readonly width: number;
}

export type FormatPart = LiteralPart | SegmentPart | CounterPart;

/** A pattern compiled once and reused for every number of a sequence. */
export interface CompiledFormat {
  readonly pattern: string;
  readonly parts: readonly FormatPart[];
  /** The scope segments the pattern renders, in the order they appear. */
  readonly segments: readonly ScopeSegment[];
  /** The minimum number of digits of the counter. */
  readonly width: number;
  /** The anchored expression a number of this sequence matches, built once. */
  readonly matcher: RegExp;
}

const SEGMENT_BY_TOKEN: Readonly<Record<string, ScopeSegment>> = {
  YYYY: 'year',
  MM: 'month',
  INST: 'institution',
  CAMPUS: 'campus',
  TERM: 'term',
  CASHIER: 'cashier',
  DEVICE: 'device',
};

/** A free-form scope value: no slash or brace, so a rendered number stays parseable. */
const SCOPE_VALUE_PATTERN = /^[^/{}]+$/;

const TOKEN_PATTERN = /^([A-Z]+)(?::(\d+))?$/;

/** Compiles `pattern`; throws a {@link SequenceFormatError} when it is not a valid pattern. */
export function compileFormat(pattern: string): CompiledFormat {
  if (typeof pattern !== 'string' || pattern.length === 0) {
    throw new SequenceFormatError('a number pattern must be a non-empty string');
  }

  const parts = scanParts(pattern);
  const counters = parts.filter((part): part is CounterPart => part.kind === 'counter');
  if (counters.length !== 1) {
    throw new SequenceFormatError(
      `the pattern "${pattern}" must contain exactly one {SEQ} token, found ${counters.length}`
    );
  }

  const segments = parts.filter((part): part is SegmentPart => part.kind === 'segment');
  const seen = new Set<ScopeSegment>();
  for (const segment of segments) {
    if (seen.has(segment.segment)) {
      throw new SequenceFormatError(`the pattern "${pattern}" renders "${segment.segment}" twice`);
    }
    seen.add(segment.segment);
  }

  return {
    pattern,
    parts,
    segments: segments.map((part) => part.segment),
    width: counters[0].width,
    matcher: new RegExp(toPattern(parts)),
  };
}

/** Compiles the format of a definition. */
export function compileDefinition(definition: SequenceDefinition): CompiledFormat {
  return compileFormat(definition.pattern);
}

/**
 * Renders `seq` for `scope` through `format`.
 *
 * Every scope segment the pattern renders must be present, and a free-form value may not contain
 * the literal that follows it: that is what keeps {@link parseNumber} unambiguous.
 */
export function formatNumber(format: CompiledFormat, scope: ScopeValues, seq: number): string {
  if (!Number.isSafeInteger(seq) || seq < 1) {
    throw new SequenceFormatError(`a counter must be a positive integer, got ${seq}`);
  }

  let rendered = '';
  for (let index = 0; index < format.parts.length; index++) {
    const part = format.parts[index];
    if (part.kind === 'literal') {
      rendered += part.text;
      continue;
    }
    if (part.kind === 'counter') {
      rendered += String(seq).padStart(part.width, '0');
      continue;
    }
    rendered += renderSegment(part, scope, nextLiteral(format, index));
  }
  return rendered;
}

/**
 * Reads `value` back through `format`.
 *
 * Returns the counter and the scope segments the pattern renders, or null when the value is not
 * a number of this sequence. A value that is too short for the counter's width is refused, so a
 * manual number that happens to share the prefix does not pass for an issued one.
 */
export function parseNumber(format: CompiledFormat, value: string | null | undefined): ParsedNumber | null {
  if (typeof value !== 'string') return null;
  const match = format.matcher.exec(value.trim());
  const groups = match?.groups;
  if (!groups) return null;

  const seq = Number(groups.counter);
  if (!Number.isSafeInteger(seq) || seq < 1) return null;

  const scope: ScopeValues = {};
  for (const segment of format.segments) {
    const captured = groups[segment];
    if (captured === undefined) return null;
    scope[segment] = segment === 'year' || segment === 'month' ? Number(captured) : captured;
  }
  return { seq, scope };
}

/** Parses a number for a definition; a thin wrapper over {@link parseNumber}. */
export function parseNumberForDefinition(
  definition: SequenceDefinition,
  value: string | null | undefined
): ParsedNumber | null {
  return parseNumber(compileDefinition(definition), value);
}

/** The token bodies of a pattern, so a definition can name the segments its pattern renders. */
export function patternSegments(pattern: string): readonly ScopeSegment[] {
  return compileFormat(pattern).segments;
}

function renderSegment(part: SegmentPart, scope: ScopeValues, following: string | null): string {
  const value = scope[part.segment];
  if (value === undefined || value === null || value === '') {
    throw new SequenceFormatError(`the pattern needs a "${part.segment}" scope value for ${part.token}`);
  }

  if (part.segment === 'year') {
    const year = asInteger(value, part.token);
    if (year < 1 || year > 9999) throw new SequenceFormatError(`a year must be between 1 and 9999, got ${year}`);
    return String(year).padStart(4, '0');
  }

  if (part.segment === 'month') {
    const month = asInteger(value, part.token);
    if (month < 1 || month > 12) throw new SequenceFormatError(`a month must be between 1 and 12, got ${month}`);
    return String(month).padStart(2, '0');
  }

  const text = String(value);
  if (!SCOPE_VALUE_PATTERN.test(text)) {
    throw new SequenceFormatError(
      `the "${part.segment}" scope value "${text}" may not contain "/" or braces`
    );
  }
  if (following !== null && text.includes(following)) {
    throw new SequenceFormatError(
      `the "${part.segment}" scope value "${text}" contains the "${following}" separator that follows it, so the number could not be parsed back`
    );
  }
  return text;
}

function asInteger(value: string | number, token: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) throw new SequenceFormatError(`${token} must be an integer, got "${value}"`);
  return parsed;
}

/** The literal that immediately follows `index`, or null when the next part is not literal. */
function nextLiteral(format: CompiledFormat, index: number): string | null {
  const next = format.parts[index + 1];
  return next !== undefined && next.kind === 'literal' ? next.text : null;
}

/** Scans a pattern into literal, segment and counter parts. */
function scanParts(pattern: string): FormatPart[] {
  const parts: FormatPart[] = [];
  let literal = '';
  let index = 0;

  const flush = () => {
    if (literal.length > 0) parts.push({ kind: 'literal', text: literal });
    literal = '';
  };

  while (index < pattern.length) {
    const open = pattern.indexOf('{', index);
    const close = pattern.indexOf('}', index);
    if (close !== -1 && (open === -1 || close < open)) {
      throw new SequenceFormatError(`the pattern "${pattern}" has a "}" with no matching "{", at ${close}`);
    }
    if (open === -1) {
      literal += pattern.slice(index);
      break;
    }

    literal += pattern.slice(index, open);
    const end = pattern.indexOf('}', open + 1);
    if (end === -1) {
      throw new SequenceFormatError(`the pattern "${pattern}" has a "{" with no matching "}", at ${open}`);
    }

    const body = pattern.slice(open + 1, end);
    if (body.includes('{')) {
      throw new SequenceFormatError(`the pattern "${pattern}" has a "{" with no matching "}", at ${open}`);
    }
    flush();
    parts.push(tokenPart(body, pattern));
    index = end + 1;
  }
  flush();

  for (let position = 1; position < parts.length; position++) {
    if (parts[position - 1].kind !== 'literal' && parts[position].kind !== 'literal') {
      throw new SequenceFormatError(
        `the pattern "${pattern}" has two tokens next to each other; separate them with literal text so a number can be parsed back`
      );
    }
  }

  return parts;
}

function tokenPart(body: string, pattern: string): SegmentPart | CounterPart {
  const match = TOKEN_PATTERN.exec(body);
  if (!match) {
    throw new SequenceFormatError(`the pattern "${pattern}" has an unknown token "{${body}}"`);
  }

  if (match[1] === 'SEQ') {
    const width = match[2] === undefined ? 1 : Number(match[2]);
    if (width < 1) throw new SequenceFormatError(`the pattern "${pattern}" pads the counter to ${width} digits`);
    return { kind: 'counter', width };
  }

  const segment = SEGMENT_BY_TOKEN[match[1]];
  if (!segment) throw new SequenceFormatError(`the pattern "${pattern}" has an unknown token "{${body}}"`);
  if (match[2] !== undefined) {
    throw new SequenceFormatError(`the pattern "${pattern}" gives a padding width to "{${body}}", which is not the counter`);
  }
  return { kind: 'segment', segment, token: `{${body}}` };
}

/** The regular expression a compiled pattern matches against, anchored. */
function toPattern(parts: readonly FormatPart[]): string {
  let source = '^';
  for (const part of parts) {
    if (part.kind === 'literal') {
      source += escapeRegExp(part.text);
    } else if (part.kind === 'counter') {
      source += `(?<counter>\\d{${part.width},})`;
    } else if (part.segment === 'year') {
      source += '(?<year>\\d{4})';
    } else if (part.segment === 'month') {
      source += '(?<month>\\d{2})';
    } else {
      source += `(?<${part.segment}>[^/{}]+?)`;
    }
  }
  return `${source}$`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
