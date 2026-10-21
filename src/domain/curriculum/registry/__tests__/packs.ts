// ABOUTME: Test data for the pack registry: the documented example pack read from disk, the
// ABOUTME: candidate versions the upgrade tests compare, and the pack library they are served from.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { packRef, type PackSource } from '@/domain/curriculum/registry';

/** A pack document as the tests mutate it. */
export type PackDocument = Record<string, unknown>;

/** The documented example pack, `ke-cbe@2026.1.0` (packs/schema/examples). */
export function examplePack(): PackDocument {
  const text = readFileSync(resolve(process.cwd(), 'packs', 'schema', 'examples', 'ke-cbe.pack.json'), 'utf8');
  const document: PackDocument = JSON.parse(text);
  return document;
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function child(parent: PackDocument, ...keys: string[]): PackDocument {
  let node = parent;
  for (const key of keys) {
    const next = node[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      throw new Error(`the fixture has no object at ${keys.join('.')}`);
    }
    node = next as PackDocument;
  }
  return node;
}

export function list(parent: PackDocument, key: string): unknown[] {
  const value = parent[key];
  if (!Array.isArray(value)) throw new Error(`the fixture has no array at ${key}`);
  return value;
}

function objects(parent: PackDocument, key: string): PackDocument[] {
  return list(parent, key) as PackDocument[];
}

export function packCode(pack: PackDocument): string {
  return String(child(pack, 'pack').code);
}

export function packVersion(pack: PackDocument): string {
  return String(child(pack, 'pack').version);
}

export function refOf(pack: PackDocument): string {
  return packRef(packCode(pack), packVersion(pack));
}

/** The example pack with another version and an optional change applied to its clone. */
export function versionOf(version: string, change?: (pack: PackDocument) => void): PackDocument {
  const pack = clone(examplePack());
  child(pack, 'pack').version = version;
  change?.(pack);
  return pack;
}

/** The next minor version: one learning area more and one band label fixed. */
export function upgradedPack(): PackDocument {
  return versionOf('2026.2.0', (pack) => {
    objects(child(pack, 'learning_areas'), 'learning_areas').push({
      code: 'DES',
      name: 'Design',
      short_name: 'Des',
      kind: 'elective',
      group: 'arts',
      levels: ['G7', 'G8', 'G9'],
      national_code: null,
      components: [],
    });
    const scale = objects(child(pack, 'assessment'), 'grading_scales')[0];
    objects(scale, 'bands')[0].label = 'Exceeding Expectations 1 (revised)';
  });
}

/** The next major version, minus one learning area an existing row uses. */
export function packWithoutLearningArea(
  code: string,
  version = '2027.0.0'
): PackDocument {
  return versionOf(version, (pack) => {
    const areas = child(pack, 'learning_areas');
    areas.learning_areas = objects(areas, 'learning_areas').filter((area) => area.code !== code);
    for (const rule of objects(areas, 'combination_rules')) {
      if (Array.isArray(rule.of)) {
        rule.of = rule.of.filter((entry) => !String(entry).split('|').includes(code));
      }
    }
  });
}

/** The next major version, minus one level; every reference to it is dropped so it stays valid. */
export function packWithoutLevel(code: string): PackDocument {
  return versionOf('2027.0.0', (pack) => {
    const structure = child(pack, 'structure');
    for (const stage of objects(structure, 'stages')) {
      stage.levels = list(stage, 'levels').filter((level) => level !== code);
    }
    structure.levels = objects(structure, 'levels').filter((level) => level.code !== code);
    for (const level of objects(structure, 'levels')) {
      if (level.next === code) level.next = null;
    }
    for (const area of objects(child(pack, 'learning_areas'), 'learning_areas')) {
      area.levels = list(area, 'levels').filter((level) => level !== code);
    }
    for (const report of objects(pack, 'reports')) {
      report.levels = list(report, 'levels').filter((level) => level !== code);
    }
    for (const scheme of objects(child(pack, 'assessment'), 'schemes')) {
      scheme.levels = list(scheme, 'levels').filter((level) => level !== code);
    }
    for (const rule of objects(child(pack, 'learning_areas'), 'combination_rules')) {
      rule.levels = list(rule, 'levels').filter((level) => level !== code);
    }
    for (const rule of objects(child(pack, 'progression'), 'progression')) {
      rule.levels = list(rule, 'levels').filter((level) => level !== code);
    }
    for (const rule of objects(child(pack, 'progression'), 'graduation')) {
      rule.levels = list(rule, 'levels').filter((level) => level !== code);
    }
  });
}

/** The next minor version that drops the page setup of every report. */
export function packWithoutReportPage(): PackDocument {
  return versionOf('2026.3.0', (pack) => {
    for (const report of objects(pack, 'reports')) delete report.page;
  });
}

/** The next minor version that no longer allows a school to override the report page. */
export function packWithoutReportOverride(): PackDocument {
  return versionOf('2026.4.0', (pack) => {
    child(pack, 'pack').overridable = ['grading_scales.cbe_8_level.bands'];
  });
}

/** A library of pack documents, keyed by `code@version`. */
export function library(...packs: readonly PackDocument[]): PackSource {
  const documents = new Map(packs.map((pack) => [refOf(pack), pack]));
  return ({ code, version }) => documents.get(packRef(code, version));
}
