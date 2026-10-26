// ABOUTME: Validates the payroll pack JSON Schema: it accepts the Kenya pack and a fictional pack, and
// ABOUTME: refuses broken documents (floats, percent text, unknown kinds, contradictory entries).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import { describe, expect, it } from 'vitest';

import { cloneFakePack } from './fakePack';

// vitest runs with the repository root as cwd; the schema is read from disk like the curriculum schemas.
const SCHEMA_PATH = resolve(process.cwd(), 'packs', 'payroll', 'schema.json');
const KE_PACK_PATH = resolve(process.cwd(), 'packs', 'payroll', 'ke', 'pack.json');
const SCHEMA_ID = 'https://schemas.schoolpilot.app/payroll-pack/v1/payroll.schema.json';

type Shape = Record<string, unknown>;

function readJson(path: string): Shape {
  return JSON.parse(readFileSync(path, 'utf8')) as Shape;
}

// strictRequired is off because required properties inside `allOf` branches refer to the parent's properties.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addSchema(readJson(SCHEMA_PATH));

function errorsFor(document: unknown): string[] {
  const validator = ajv.getSchema(SCHEMA_ID);
  if (!validator) throw new Error(`schema not registered: ${SCHEMA_ID}`);
  const valid = validator(document) === true;
  return valid ? [] : (validator.errors ?? []).map((e) => `${e.instancePath} ${e.message ?? ''}`);
}

function kePack(): Shape {
  return readJson(KE_PACK_PATH);
}

/** The first rule entry of a pack with the given ruleId. */
function firstRule(pack: Shape, ruleId: string): Shape {
  const rules = pack.rules as Shape[];
  const found = rules.find((rule) => rule.ruleId === ruleId && rule.params !== undefined);
  if (!found) throw new Error(`no modelled rule ${ruleId}`);
  return found;
}

describe('the payroll pack schema', () => {
  it('compiles under strict Ajv 2020-12', () => {
    expect(ajv.getSchema(SCHEMA_ID)).toBeTypeOf('function');
  });

  it('accepts the Kenya payroll pack', () => {
    expect(errorsFor(kePack())).toEqual([]);
  });

  it('accepts a fictional pack with other rates', () => {
    expect(errorsFor(cloneFakePack())).toEqual([]);
  });

  it('refuses a pack with no sources', () => {
    const pack = kePack();
    pack.sources = [];
    expect(errorsFor(pack)).not.toEqual([]);
  });

  it('refuses a missing top-level field', () => {
    for (const field of ['id', 'country', 'currency', 'version', 'verification', 'rounding', 'order', 'rules']) {
      const pack = kePack();
      delete pack[field];
      expect(errorsFor(pack), `without ${field}`).not.toEqual([]);
    }
  });

  it('refuses a verification value other than verified or draft', () => {
    const pack = kePack();
    pack.verification = 'official';
    expect(errorsFor(pack)).not.toEqual([]);
  });

  it('refuses a rate written as a percentage, a float or a negative', () => {
    for (const bad of ['10%', 0.1, '-0.1', '2.5', '.1']) {
      const pack = kePack();
      const params = firstRule(pack, 'shif').params as Shape;
      params.rate = bad;
      expect(errorsFor(pack), `rate ${String(bad)}`).not.toEqual([]);
    }
  });

  it('refuses an amount written as a float or with a currency symbol', () => {
    for (const bad of [300, 'KSh 300', '1,000.00', '-5.00']) {
      const pack = kePack();
      const params = firstRule(pack, 'shif').params as Shape;
      params.minimum = bad;
      expect(errorsFor(pack), `amount ${String(bad)}`).not.toEqual([]);
    }
  });

  it('refuses an unknown rule kind', () => {
    const pack = kePack();
    (pack.rules as Shape[])[0].kind = 'stamp_duty';
    expect(errorsFor(pack)).not.toEqual([]);
  });

  it('refuses a rule entry without a source reference or a verification flag', () => {
    for (const field of ['sourceRef', 'verification', 'effectiveFrom', 'effectiveTo']) {
      const pack = kePack();
      delete (pack.rules as Shape[])[1][field];
      expect(errorsFor(pack), `without ${field}`).not.toEqual([]);
    }
  });

  it('refuses an entry that carries both parameters and a not-modelled note', () => {
    const pack = kePack();
    (firstRule(pack, 'nssf') as Shape).notModelled = 'also not modelled';
    expect(errorsFor(pack)).not.toEqual([]);
  });

  it('refuses a not-modelled entry that still carries parameters', () => {
    const pack = kePack();
    const entry = (pack.rules as Shape[]).find((rule) => rule.notModelled !== undefined);
    if (!entry) throw new Error('the Kenya pack has no not-modelled entry');
    entry.params = firstRule(pack, 'shif').params;
    expect(errorsFor(pack)).not.toEqual([]);
  });

  it('refuses an unknown property on a rule entry', () => {
    const pack = kePack();
    (pack.rules as Shape[])[1].surcharge = '0.1';
    expect(errorsFor(pack)).not.toEqual([]);
  });

  it('refuses a malformed date and a malformed source reference in a return layout', () => {
    const badDate = kePack();
    (badDate.rules as Shape[])[1].effectiveFrom = '1 July 2023';
    expect(errorsFor(badDate)).not.toEqual([]);

    const badColumn = kePack();
    const layout = (badColumn.returns as Shape[])[0];
    ((layout.columns as Shape[])[0] as Shape).source = 'salary';
    expect(errorsFor(badColumn)).not.toEqual([]);
  });

  it('refuses a band without a rate and an input without its pay flag', () => {
    const noRate = kePack();
    const bands = (firstRule(noRate, 'paye').params as Shape).bands as Shape[];
    delete bands[0].rate;
    expect(errorsFor(noRate)).not.toEqual([]);

    const noFlag = kePack();
    delete ((noFlag.inputs as Shape[])[0] as Shape).deductedFromPay;
    expect(errorsFor(noFlag)).not.toEqual([]);
  });
});
