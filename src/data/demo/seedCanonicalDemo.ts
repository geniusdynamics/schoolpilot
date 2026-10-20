// ABOUTME: Installs the demo school over the canonical database the app itself uses, so a fresh
// ABOUTME: installation is seeded through the repository rather than through the legacy collections.

import { logger } from '@/utils/logging';

import { openCanonicalRepository } from '@/data/canonicalRepository';
import { Repository } from '@/data/repository';
import {
  defaultDemoSchool,
  seedDemoSchool,
  type DemoSchoolInput,
  type DemoSchoolResult,
} from '@/domain/demo';

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
    return await seedDemoSchool(repository, input);
  } catch (error) {
    logger.error('[demo] the canonical demo school could not be seeded:', error);
    throw error;
  }
}
