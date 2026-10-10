// ABOUTME: Guards the collection registry: every collection name used in src must be registered in collectionsDefinition.
// ABOUTME: Also pins the CollectionName union and the collections added for audit finding SO-24 (P0-B01).

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  collectionNames,
  collectionsDefinition,
  HOUSES_COLLECTION_NAMES,
  type CollectionName,
} from '../collections';
import { housesCollections } from '@/modules/administration/data/houses/collections';
import type { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

const SRC = path.resolve(__dirname, '..', '..', '..');

// Names still referenced in code that are resolved by renaming the call site, not by registering them.
// Each entry names the task that removes the literal; delete the entry when that task lands.
const PENDING_CALL_SITE_RENAMES: Record<string, { target: string; task: string }> = {
  settings: { target: 'school_details', task: 'P0-D06 / P0-A05' },
  period_definitions: { target: 'academic_period_definitions', task: 'P0-A05' },
  timetable_period_defs: { target: 'timetable_period_definitions', task: 'P0-B02' },
  exam_paper_settings: { target: 'exam_sessions', task: 'P0-B02 (nested in exam_sessions)' },
  fee_template_items: { target: 'fee_templates', task: 'P0-B02 (nested in fee_templates)' },
};

const NEWLY_REGISTERED = [
  'student_class_history',
  'library_members',
  'health_incident_reports',
  'staff_salary_components',
  'book_loans',
] as const;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (!/^(node_modules|__tests__|tests|stories|__demos__)$/.test(name)) sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function referencedCollectionNames(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  const pattern = /(?:useDatabaseCollection|getCollection|useEntityCrud|useCrudFactory)(?:<[^>()]*>)?\(\s*['"]([a-z][a-z0-9_]*)['"]/g;
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      const users = refs.get(match[1]) ?? [];
      users.push(path.relative(SRC, file));
      refs.set(match[1], users);
    }
  }
  return refs;
}

describe('collection registry', () => {
  const registered = new Set(collectionNames);

  it('registers every collection name referenced by a data hook or getCollection call', () => {
    const references = referencedCollectionNames();
    expect(references.size).toBeGreaterThan(20);

    const unregistered = [...references.entries()]
      .filter(([name]) => !registered.has(name) && !(name in PENDING_CALL_SITE_RENAMES))
      .map(([name, users]) => `${name} (${[...new Set(users)].join(', ')})`);

    expect(unregistered).toEqual([]);
  });

  it('keeps pending call-site renames out of the registry and points them at registered targets', () => {
    for (const [name, { target }] of Object.entries(PENDING_CALL_SITE_RENAMES)) {
      expect(registered.has(name), `${name} should be renamed at the call site, not registered`).toBe(false);
      expect(registered.has(target), `rename target ${target} must be registered`).toBe(true);
    }
  });

  it.each(NEWLY_REGISTERED)('defines %s with an id primary key', (name) => {
    const definition = collectionsDefinition[name];
    expect(definition, `${name} missing from collectionsDefinition`).toBeDefined();
    expect(definition.schema.primaryKey).toBe('id');
    expect(definition.schema.properties).toHaveProperty('id');
  });

  it('defines book_loans as an alias of the loans schema', () => {
    expect(collectionsDefinition.book_loans.schema).toBe(collectionsDefinition.loans.schema);
  });

  it('records student class history with the fields the promotion service writes', () => {
    const properties = collectionsDefinition.student_class_history.schema.properties;
    for (const field of ['student_id', 'class_stream_id', 'academic_year_id', 'start_date', 'end_date', 'created_at']) {
      expect(properties).toHaveProperty(field);
    }
  });

  it('stores staff salary components with the fields the salary settings page writes', () => {
    const properties = collectionsDefinition.staff_salary_components.schema.properties;
    for (const field of ['staff_id', 'component_name', 'component_type', 'amount', 'is_active', 'effective_from', 'effective_to']) {
      expect(properties).toHaveProperty(field);
    }
  });

  it('lists the houses collection names used by the CollectionName union', () => {
    expect([...HOUSES_COLLECTION_NAMES].sort()).toEqual(Object.keys(housesCollections).sort());
  });

  it('exposes CollectionName as a union of registered names accepted by useDatabaseCollection', () => {
    const name: CollectionName = 'student_class_history';
    const hookArgument: Parameters<typeof useDatabaseCollection>[0] = name;
    // @ts-expect-error unknown collection names are not CollectionName members
    const unknown: CollectionName = 'not_a_registered_collection';

    expect(registered.has(hookArgument)).toBe(true);
    expect(registered.has(unknown)).toBe(false);
    expect(registered.has('point_transactions' satisfies CollectionName)).toBe(true);
  });
});
