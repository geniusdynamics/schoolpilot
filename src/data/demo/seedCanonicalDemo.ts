// ABOUTME: Installs the demo school over the canonical database the app itself uses, so a fresh
// ABOUTME: installation is seeded through the repository rather than through the legacy collections.

import { logger } from '@/utils/logging';

import { shippedPackDocument } from '@/components/setup/packs/packLibrary';
import { openCanonicalRepository } from '@/data/canonicalRepository';
import { Repository } from '@/data/repository';
import {
  defaultDemoSchool,
  seedDemoSchool,
  type DemoSchoolInput,
  type DemoSchoolResult,
} from '@/domain/demo';
import { databaseService } from '@/services/database/databaseService';

/**
 * Records the school profile the header, receipts and reports read.
 *
 * The canonical seed writes the institution; `school_details` is the single legacy row those
 * surfaces read, and nothing else creates it for a demo database. Without it the header shows the
 * product name and the setup nag counts the profile as missing on an otherwise complete school.
 */
async function writeSchoolDetails(input: DemoSchoolInput): Promise<void> {
  const collection = databaseService.getCollection('school_details');
  if (!collection) return;
  const profile = input.school;
  const fields: Record<string, string> = { name: profile.name };
  if (profile.motto?.trim()) fields.motto = profile.motto.trim();
  if (profile.address?.trim()) fields.postal_address = profile.address.trim();
  if (profile.phone?.trim()) fields.telephone = profile.phone.trim();
  const existing = ((await collection.find({})) as Array<{ id?: string }>)[0];
  if (existing?.id) {
    await collection.update(existing.id, fields);
    return;
  }
  await collection.insert({ ...fields, updated_at: new Date().toISOString() });
}

/**
 * Seeds a school over the canonical database the pages read.
 *
 * The repository is the one the pages share, so the seed writes into the same database they read
 * and a page mounted beside it never sees a second connection. The seed is idempotent: a second
 * call reuses the school it found instead of duplicating it.
 */
export async function seedCanonicalDemoSchool(
  input: DemoSchoolInput = defaultDemoSchool()
): Promise<DemoSchoolResult> {
  try {
    const repository = await openCanonicalRepository();
    if (!(repository instanceof Repository)) {
      throw new Error('the canonical provider handed a read-only repository, so the demo cannot be written');
    }
    const result = await seedDemoSchool(repository, input, { packDocument: shippedPackDocument });
    await writeSchoolDetails(input);
    return result;
  } catch (error) {
    logger.error('[demo] the canonical demo school could not be seeded:', error);
    throw error;
  }
}
