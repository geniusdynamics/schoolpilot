// ABOUTME: Postgres reachability for the spike: the local server the canonical candidate is
// ABOUTME: measured against, probed so the suite skips rather than fails when it is absent.

import { createTestContext, type TestContext } from '@/data/__tests__/harness';

/**
 * The connection string the spike uses.
 *
 * It defaults to the local PostgreSQL service the repository's own Postgres harness targets,
 * and takes `DATABASE_URL` when the environment names another server.
 */
export const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';

/** True when a Postgres server answers; false when it is absent or refuses the connection. */
export async function postgresAvailable(
  connectionString: string = DEFAULT_DATABASE_URL,
  timeoutMs = 3000
): Promise<boolean> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: timeoutMs });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** A canonical context on Postgres, with the canonical schema and the fixtures in place. */
export async function openPostgresContext(seed = true): Promise<TestContext> {
  return createTestContext({
    database: { kind: 'postgres', connectionString: DEFAULT_DATABASE_URL },
    seed,
  });
}

/** The round-trip time of a trivial query, the baseline every Postgres number is read against. */
export async function measureRoundTrip(samples = 20): Promise<number[]> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DEFAULT_DATABASE_URL });
  await client.connect();

  try {
    const timings: number[] = [];
    for (let index = 0; index < samples; index += 1) {
      const start = performance.now();
      await client.query('SELECT 1');
      timings.push(performance.now() - start);
    }
    return timings;
  } finally {
    await client.end();
  }
}
