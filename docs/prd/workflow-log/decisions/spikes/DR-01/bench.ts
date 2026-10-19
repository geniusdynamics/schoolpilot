// ABOUTME: DR-01 benchmark: schema construction, runtime validation throughput, error output and
// ABOUTME: SQLite DDL for the zod and JSON Schema implementations. Writes results.json beside itself.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { z } from 'zod/v4';
import { SchemaConverter } from '@/services/database/SchemaConverter';
import { buildEnrolmentSchema, buildLearnerSchema, enrolmentSchema, enrolmentStorage, learnerSchema, learnerStorage } from './zod/entity';
import { toDatabaseSchema, uniqueIndexSql, type JsonSchemaObject } from './shared/to-storage';
import { validateEnrolment as validateEnrolmentZod, validateLearner as validateLearnerZod } from './zod/validate';
import { validateEnrolment as validateEnrolmentAjv, validateLearner as validateLearnerAjv } from './json-schema/validate';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const document = JSON.parse(fs.readFileSync(path.join(here, 'json-schema', 'entity.schema.json'), 'utf8'));

const N = 10_000;
const WARMUP = 2_000;
const RUNS = 9;
const pad = (n: number) => String(n).padStart(12, '0');
const uuid = (n: number) => `0190f0d0-0000-7000-8000-${pad(n)}`;
const isoDate = (n: number) => `2026-${String((n % 12) + 1).padStart(2, '0')}-${String((n % 28) + 1).padStart(2, '0')}`;

function makeLearner(i: number) {
  return {
    id: uuid(i + 1),
    institution_id: uuid(900_000_000),
    admission_number: `ADM-${String(i).padStart(5, '0')}`,
    given_name: `Given${i}`,
    family_name: `Family${i}`,
    gender: 'female' as const,
    status: 'enrolled' as const,
    residence_status: i % 2 === 0 ? ('day' as const) : ('boarder' as const),
    date_of_birth: isoDate(i),
    created_at: '2026-10-19T09:00:00Z',
    updated_at: '2026-10-19T09:00:00Z',
  };
}

function makeEnrolment(i: number) {
  return {
    id: uuid(i + 2_000_000),
    learner_id: uuid(i + 1),
    academic_year_id: uuid(800_000_000),
    programme_id: uuid(800_000_001),
    level_id: uuid(800_000_002),
    class_group_id: uuid(800_000_003),
    status: 'active' as const,
    start_date: isoDate(i),
    entry_reason: 'new_admission' as const,
    created_at: '2026-10-19T09:00:00Z',
    updated_at: '2026-10-19T09:00:00Z',
  };
}

const learners = Array.from({ length: N }, (_, i) => makeLearner(i));
const enrolments = Array.from({ length: N }, (_, i) => makeEnrolment(i));
const invalidLearners = learners.map((learner) => ({ ...learner, status: 'not_a_status' }));
const invalidEnrolments = enrolments.map((enrolment) => ({ ...enrolment, entry_reason: 'not_a_reason' }));
const mixedLearners = learners.map((learner, i) => ({
  ...learner,
  status: i % 2 === 0 ? 'not_a_status' : learner.status,
}));
const mixedEnrolments = enrolments.map((enrolment, i) => ({
  ...enrolment,
  entry_reason: i % 2 === 0 ? 'not_a_reason' : enrolment.entry_reason,
}));

function timeLoop(fn: (i: number) => unknown) {
  const started = performance.now();
  for (let i = 0; i < N; i++) fn(i);
  return performance.now() - started;
}

function stat(label: string, times: number[]) {
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  return {
    label,
    objects: N,
    runs: RUNS,
    medianMs: Number(median.toFixed(2)),
    q1Ms: Number(q1.toFixed(2)),
    q3Ms: Number(q3.toFixed(2)),
    spreadPct: Number((((q3 - q1) / median) * 100).toFixed(1)),
    usPerObject: Number(((median * 1000) / N).toFixed(3)),
    objectsPerSecond: Math.round(N / (median / 1000)),
  };
}

function medianDuration(fn: () => void) {
  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const started = performance.now();
    fn();
    times.push(performance.now() - started);
  }
  times.sort((a, b) => a - b);
  return Number(times[Math.floor(times.length / 2)].toFixed(3));
}

// Alternate which implementation runs first each round so CPU/JIT drift hits both.
function paired(label: string, zodFn: (i: number) => unknown, ajvFn: (i: number) => unknown) {
  for (let i = 0; i < WARMUP; i++) {
    zodFn(i);
    ajvFn(i);
  }
  const zodTimes: number[] = [];
  const ajvTimes: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    if (run % 2 === 0) {
      zodTimes.push(timeLoop(zodFn));
      ajvTimes.push(timeLoop(ajvFn));
    } else {
      ajvTimes.push(timeLoop(ajvFn));
      zodTimes.push(timeLoop(zodFn));
    }
  }
  return [stat(`${label} zod`, zodTimes), stat(`${label} ajv`, ajvTimes)];
}

const throughput = [
  ...paired('learner valid (0 defects)', (i) => validateLearnerZod(learners[i]).success, (i) => validateLearnerAjv(learners[i])),
  ...paired('learner invalid (1 defect: status)', (i) => validateLearnerZod(invalidLearners[i]).success, (i) => validateLearnerAjv(invalidLearners[i])),
  ...paired('learner mixed (50% invalid)', (i) => validateLearnerZod(mixedLearners[i]).success, (i) => validateLearnerAjv(mixedLearners[i])),
  ...paired('enrolment valid (0 defects)', (i) => validateEnrolmentZod(enrolments[i]).success, (i) => validateEnrolmentAjv(enrolments[i])),
  ...paired('enrolment invalid (1 defect: entry_reason)', (i) => validateEnrolmentZod(invalidEnrolments[i]).success, (i) => validateEnrolmentAjv(invalidEnrolments[i])),
  ...paired('enrolment mixed (50% invalid)', (i) => validateEnrolmentZod(mixedEnrolments[i]).success, (i) => validateEnrolmentAjv(mixedEnrolments[i])),
];

const zodSchemaBuildMs = medianDuration(() => {
  buildLearnerSchema();
  buildEnrolmentSchema();
});

const ajvCompileMs = medianDuration(() => {
  const instance = new Ajv({ allErrors: true, strict: false, logger: false });
  instance.compile(document.definitions.learner);
  instance.compile(document.definitions.enrolment);
});

const { family_name: _omitted, ...learnerWithoutFamily } = makeLearner(42);
void _omitted;
const learnerWithErrors = {
  ...learnerWithoutFamily,
  status: 'not_a_status',
  admission_number: '',
  date_of_birth: '2026-02-30',
};
const zodLearnerErrors = learnerSchema.safeParse(learnerWithErrors);
const ajvLearnerValid = validateLearnerAjv(learnerWithErrors);

const dateOrderSample = { ...makeEnrolment(43), start_date: '2026-05-01', end_date: '2026-04-01' };
const zodDateOrder = enrolmentSchema.safeParse(dateOrderSample);
const ajvDateOrder = validateEnrolmentAjv(dateOrderSample);

const leftWithoutExit = { ...makeEnrolment(44), status: 'left' as const };
const leftWithExit = { ...leftWithoutExit, exit_reason: 'withdrawn' as const };
const zodExitMissing = enrolmentSchema.safeParse(leftWithoutExit);
const ajvExitMissing = validateEnrolmentAjv(leftWithoutExit);
const zodExitPresent = enrolmentSchema.safeParse(leftWithExit);
const ajvExitPresent = validateEnrolmentAjv(leftWithExit);

const unknownKeySample = { ...makeLearner(45), unexpected_field: true };
const zodUnknownKey = learnerSchema.safeParse(unknownKeySample);
const ajvUnknownKey = validateLearnerAjv(unknownKeySample);

const attributesSample = { ...makeLearner(46), attributes: { 'ke.kemis_upi': 'UPI-1', nested: { a: 1 } } };
const zodAttributes = learnerSchema.safeParse(attributesSample);
const ajvAttributes = validateLearnerAjv(attributesSample);

const zodLearnerJson = z.toJSONSchema(learnerSchema, { io: 'output' }) as unknown as JsonSchemaObject;
const zodEnrolmentJson = z.toJSONSchema(enrolmentSchema, { io: 'output' }) as unknown as JsonSchemaObject;
const jsonLearner = document.definitions.learner as JsonSchemaObject;
const jsonEnrolment = document.definitions.enrolment as JsonSchemaObject;

function ddl(name: string, json: JsonSchemaObject, storage: typeof learnerStorage | typeof enrolmentStorage) {
  const databaseSchema = toDatabaseSchema(name, json, storage);
  const converted = SchemaConverter.convertRxDBToSQLite(name, databaseSchema);
  return {
    createTable: SchemaConverter.generateCreateTableSQL(converted.sqlSchema),
    indexes: SchemaConverter.generateCreateIndexSQL(converted.sqlSchema.tableName, converted.indexes),
    unique: uniqueIndexSql(name, storage.unique),
  };
}

const ddlZodLearner = ddl('learner', zodLearnerJson, learnerStorage);
const ddlJsonLearner = ddl('learner', jsonLearner, learnerStorage);
const ddlZodEnrolment = ddl('enrolment', zodEnrolmentJson, enrolmentStorage);
const ddlJsonEnrolment = ddl('enrolment', jsonEnrolment, enrolmentStorage);

function codeLines(relativePath: string) {
  return fs
    .readFileSync(path.join(here, relativePath), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'))
    .length;
}

function totalLines(relativePath: string) {
  return fs.readFileSync(path.join(here, relativePath), 'utf8').split('\n').length;
}

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    memoryGiB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
    zod: require('zod/package.json').version,
    ajv: require('ajv/package.json').version,
    typescript: require('typescript/package.json').version,
  },
  workload: { objects: N, warmup: WARMUP, runs: RUNS },
  notes: {
    timingSpread: 'IQR spread per row; across-run medians varied more on this throttling laptop',
    invalidBatch: 'every item carries exactly one defect',
    mixedBatch: 'every second item is valid, the rest carry one defect',
  },
  construction: { zodSchemaBuildMs, ajvCompileMs },
  throughput,
  errors: {
    learner: {
      zodIssues: zodLearnerErrors.error?.issues ?? [],
      ajvValid: ajvLearnerValid,
      ajvErrors: validateLearnerAjv.errors ?? [],
    },
    dateOrder: {
      zodValid: zodDateOrder.success,
      zodIssues: zodDateOrder.error?.issues ?? [],
      ajvValid: ajvDateOrder,
      ajvErrors: validateEnrolmentAjv.errors ?? [],
    },
    exitReason: {
      missing: { zodValid: zodExitMissing.success, ajvValid: ajvExitMissing },
      present: { zodValid: zodExitPresent.success, ajvValid: ajvExitPresent },
    },
    unknownKeys: { zodValid: zodUnknownKey.success, ajvValid: ajvUnknownKey },
    attributes: { zodValid: zodAttributes.success, ajvValid: ajvAttributes },
  },
  ddl: {
    learner: { identical: ddlZodLearner.createTable === ddlJsonLearner.createTable, zod: ddlZodLearner, json: ddlJsonLearner },
    enrolment: {
      identical: ddlZodEnrolment.createTable === ddlJsonEnrolment.createTable,
      zod: ddlZodEnrolment,
      json: ddlJsonEnrolment,
    },
  },
  schemaBytes: {
    zodLearner: Buffer.byteLength(JSON.stringify(zodLearnerJson)),
    jsonLearner: Buffer.byteLength(JSON.stringify(jsonLearner)),
    zodEnrolment: Buffer.byteLength(JSON.stringify(zodEnrolmentJson)),
    jsonEnrolment: Buffer.byteLength(JSON.stringify(jsonEnrolment)),
  },
  codeLines: {
    'zod/entity.ts': codeLines('zod/entity.ts'),
    'json-schema/entity.schema.json': codeLines('json-schema/entity.schema.json'),
    'json-schema/codegen.mjs': codeLines('json-schema/codegen.mjs'),
    'json-schema/entity.generated.ts': codeLines('json-schema/entity.generated.ts'),
    'shared/to-storage.ts': codeLines('shared/to-storage.ts'),
  },
  sourceTotals: {
    'zod/entity.ts': { total: totalLines('zod/entity.ts'), nonComment: codeLines('zod/entity.ts') },
    'json-schema/entity.schema.json': { total: totalLines('json-schema/entity.schema.json'), nonComment: codeLines('json-schema/entity.schema.json') },
    'json-schema/codegen.mjs': { total: totalLines('json-schema/codegen.mjs'), nonComment: codeLines('json-schema/codegen.mjs') },
    'json-schema/entity.generated.ts': { total: totalLines('json-schema/entity.generated.ts'), nonComment: codeLines('json-schema/entity.generated.ts') },
    'shared/to-storage.ts': { total: totalLines('shared/to-storage.ts'), nonComment: codeLines('shared/to-storage.ts') },
  },
};

fs.writeFileSync(path.join(here, 'results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(results, null, 2));
