// ABOUTME: The report label lookup chain (pack locale → pack default locale → pack `en` → built-in
// ABOUTME: English) and the built-in English dictionary that guarantees a label is never blank.

import type { ReportBlockKind, ReportLocaleBundles, ReportLabels, ReportTableColumnKind } from './types';

export type { ReportLabels } from './types';

/**
 * English defaults for every key the surface asks for. A pack may override any of them in its
 * locale files; a pack that ships no locale file at all still renders readable English.
 */
const BUILT_IN: Readonly<Record<string, string>> = {
  'block.header': 'School report',
  'block.learner': 'Learner',
  'block.attendance': 'Attendance',
  'block.results': 'Results',
  'block.rubric': 'Learning areas and levels',
  'block.competencies': 'Core competencies and values',
  'block.affective_psychomotor': 'Affective and psychomotor ratings',
  'block.co_curricular': 'Co-curricular activities',
  'block.summary': 'Summary',
  'block.progression': 'Progression',
  'block.comments': 'Comments',
  'block.fees': 'Fees',
  'block.calendar': 'Calendar',
  'block.signatures': 'Signatures',
  'block.verification': 'Verification',

  'column.components': 'Components',
  'column.slots': 'Assessments',
  'column.total': 'Total',
  'column.grade': 'Grade',
  'column.points': 'Pts',
  'column.position': 'Pos.',
  'column.class_mean': 'Class mean',
  'column.highest': 'Highest',
  'column.lowest': 'Lowest',
  'column.teacher_initials': 'Teacher',
  'column.remark': 'Remark',

  'rubric.area': 'Learning area',
  'rubric.strand': 'Strand',
  'rubric.level': 'Level',
  'rubric.descriptor': 'Descriptor',

  'learner.name': 'Learner',
  'learner.admission_no': 'Adm. no.',
  'learner.class': 'Level / class',
  'learner.house': 'House',
  'learner.photo': 'Photo',
  'learner.gender': 'Sex',
  'learner.identifier': 'Identifier',

  'attendance.days_open': 'Days open',
  'attendance.present': 'Present',
  'attendance.absent': 'Absent',
  'attendance.late': 'Late',

  'summary.total': 'Total',
  'summary.mean': 'Mean',
  'summary.mean_grade': 'Mean grade',
  'summary.division': 'Division',
  'summary.position': 'Position',
  'summary.average': 'Average',
  'summary.points': 'Points',
  'summary.mention': 'Mention',

  'comment.class_teacher': "Class teacher's comment",
  'comment.head_teacher': "Head teacher's comment",
  'comment.boarding': 'Boarding comment',
  'comment.guidance': 'Guidance comment',

  'signature.class_teacher': 'Class teacher',
  'signature.head_teacher': 'Head teacher',
  'signature.bursar': 'Bursar',
  'signature.parent': 'Parent / guardian',

  'progression.decision': 'Decision',
  'progression.note': 'Note',

  'fees.balance': 'Balance',
  'fees.next_term': 'Next term fees',
  'fees.note': 'Note',

  'calendar.closing': 'Closing date',
  'calendar.opening': 'Next term opens',

  'table.name': 'Learning area',
  'table.total': 'Total for the period',

  'verification.scan': 'Scan to verify this document',
  'verification.preview': 'PREVIEW — not valid for verification',
  'verification.unpublished': 'This document has not been published for verification.',
  'verification.document_id': 'Document',
  'verification.issued': 'Issued',
  'verification.url': 'Verification address',

  'document.issued': 'Issued',
  'document.id': 'Document',

  'empty.header': 'School details are not set.',
  'empty.learner': 'No learner details recorded.',
  'empty.attendance': 'No attendance recorded for this term.',
  'empty.results_table': 'No results recorded for this term.',
  'empty.rubric_table': 'No learning-area levels recorded.',
  'empty.competencies': 'No competency ratings recorded.',
  'empty.affective_psychomotor': 'No affective or psychomotor ratings recorded.',
  'empty.co_curricular': 'No co-curricular activities recorded.',
  'empty.summary': 'No summary figures available.',
  'empty.comments': 'No comments recorded.',
  'empty.progression': 'No progression decision recorded.',
  'empty.fees': 'No fee information available.',
  'empty.calendar': 'No calendar dates recorded.',
  'empty.signatures': 'No signature lines configured.',
  'empty.verification': 'No verification address configured.',
};

/** The English default for a key, or null when the key is not one of the built-ins. */
export function builtInLabel(key: string): string | null {
  return BUILT_IN[key] ?? null;
}

/** `learner.foo_bar` → `Foo bar`. The last resort, so a missing label is never an empty string. */
export function humaniseKey(key: string): string {
  const tail = key.split('.').pop() ?? key;
  const words = tail.replace(/[_-]+/g, ' ').trim();
  if (!words) return key;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface ReportLabelSource {
  readonly bundles: ReportLocaleBundles;
  readonly locale: string;
  readonly defaultLocale: string;
}

/**
 * The chain is pack locale → pack default locale → pack `en` → built-in English → the humanised key.
 * Blank strings are treated as absent: a locale file with `"block.header": ""` falls through rather
 * than printing nothing.
 */
export function resolveLabels(source: ReportLabelSource): ReportLabels {
  const order = [source.locale, source.defaultLocale, 'en'].filter(
    (value, index, all) => value !== '' && all.indexOf(value) === index
  );
  const own = new Set<string>();
  for (const locale of order) {
    const labels = source.bundles[locale]?.labels ?? {};
    for (const key of Object.keys(labels)) {
      if (typeof labels[key] === 'string' && labels[key].trim() !== '') own.add(key);
    }
  }
  const lookup = (key: string): string | null => {
    for (const locale of order) {
      const value = source.bundles[locale]?.labels?.[key];
      if (typeof value === 'string' && value.trim() !== '') return value;
    }
    return null;
  };
  return {
    locale: source.locale,
    has: (key) => own.has(key),
    get: (key) => lookup(key) ?? builtInLabel(key) ?? humaniseKey(key),
  };
}

/** The block heading: the template's `label_key`, then `block.<kind>`, then the built-in. */
export function blockHeading(labels: ReportLabels, kind: ReportBlockKind, labelKey?: string): string {
  if (labelKey) return labels.get(labelKey);
  return labels.get(`block.${kind}`);
}

export function columnLabel(labels: ReportLabels, kind: ReportTableColumnKind): string {
  if (kind === 'name') return labels.get('table.name');
  return labels.get(`column.${kind}`);
}

/** Resolves `comment.<role>` and `signature.<role>` without ever showing a bare key. */
export function roleLabel(labels: ReportLabels, group: 'comment' | 'signature', role: string): string {
  return labels.get(`${group}.${role}`);
}

export function emptyText(labels: ReportLabels, kind: ReportBlockKind): string {
  return labels.get(`empty.${kind}`);
}
