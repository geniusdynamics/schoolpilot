// ABOUTME: The measurement collector the spike's tests write: every number DR-02 cites lands in
// ABOUTME: spikes/sync/results/*.json next to the code that produced it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** One measured fact. */
export interface Measurement {
  readonly name: string;
  readonly value: number | string | boolean;
  readonly unit: string;
  readonly note?: string;
}

/** The spread of a set of timings. */
export interface LatencySummary {
  readonly samples: number;
  readonly p50: number;
  readonly p95: number;
  readonly min: number;
  readonly max: number;
}

/** Milliseconds at the given percentile, on the sorted samples. */
export function percentile(samples: readonly number[], fraction: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))));
  return sorted[index] as number;
}

/** The p50/p95 spread of a set of millisecond timings. */
export function latency(samples: readonly number[]): LatencySummary {
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    samples: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

/** Rounds a millisecond number for the record, keeping it readable. */
export function ms(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** The directory the spike's result files live in. */
export const RESULTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../results');

/** Collects measurements and writes them as one JSON file. */
export class Results {
  private readonly measurements: Measurement[] = [];

  constructor(private readonly name: string) {}

  /** Adds a fact. */
  add(name: string, value: Measurement['value'], unit: string, note?: string): this {
    this.measurements.push(note === undefined ? { name, value, unit } : { name, value, unit, note });
    return this;
  }

  /** Adds a timing spread under one name. */
  addLatency(name: string, samples: readonly number[], note?: string): this {
    const summary = latency(samples);
    this.add(`${name}.p50`, ms(summary.p50), 'ms', note);
    this.add(`${name}.p95`, ms(summary.p95), 'ms', note);
    this.add(`${name}.samples`, summary.samples, 'count', note);
    return this;
  }

  /** The measurements collected so far, for a test that asserts on them. */
  entries(): readonly Measurement[] {
    return this.measurements;
  }

  /** Writes the file and returns its path. */
  write(): string {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const target = path.join(RESULTS_DIR, `${this.name}.json`);
    const document = {
      name: this.name,
      generatedAt: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      measurements: this.measurements,
    };
    fs.writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    return target;
  }
}
