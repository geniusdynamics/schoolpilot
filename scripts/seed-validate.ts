#!/usr/bin/env tsx
// CI validation – runs RelationshipManager against seeded mock data without DB
import { validateRelationships } from '../src/services/database/demoDataSeed';

const run = async () => {
  const { isValid, errors, warnings } = await validateRelationships(undefined, 'medium');
  if (warnings.length) console.warn(`[seed-validate] warnings (${warnings.length}):`, warnings.slice(0, 20));
  if (!isValid) {
    console.error(`[seed-validate] FAILED with ${errors.length} errors:`);
    for (const e of errors.slice(0, 100)) console.error(' ', e);
    process.exit(1);
  }
  console.log('[seed-validate] PASSED – all relationships valid');
};

run().catch((e) => {
  console.error('[seed-validate] error', e);
  process.exit(1);
});
