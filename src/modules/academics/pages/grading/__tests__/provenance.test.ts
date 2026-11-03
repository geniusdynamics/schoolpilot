// ABOUTME: Unit tests for reading a grading row's provenance: the pack pin and the codes the
// ABOUTME: pack's assessment document declares decide whether a scale or scheme is the pack's.

import { describe, expect, it } from 'vitest';

import type { AvailablePack } from '@/components/setup/packs/packLibrary';

import {
  declarationOfPack,
  schemeCodeOf,
  scaleSource,
  schemeSource,
  type PackGradingDeclaration,
  type ProgrammePin,
} from '../provenance';

const PROGRAMME: ProgrammePin = { curriculum_pack_code: 'ke-cbe', pack_version: '1.0.0' };

const DECLARATION: PackGradingDeclaration = {
  code: 'ke-cbe',
  version: '1.0.0',
  ref: 'ke-cbe@1.0.0',
  gradingScaleCodes: ['cbe_8_level'],
  schemeCodes: ['ke-cbe-terminal'],
};

describe('declarationOfPack', () => {
  it('reads the scale and scheme codes from the assembled pack document', () => {
    const pack = {
      code: 'ke-cbe',
      version: '1.0.0',
      ref: 'ke-cbe@1.0.0',
      document: {
        assessment: {
          grading_scales: [{ code: 'cbe_8_level' }, { code: 'cbe_4_level' }],
          schemes: [{ code: 'ke-cbe-terminal' }],
        },
      },
    } as unknown as AvailablePack;

    expect(declarationOfPack(pack)).toEqual({
      code: 'ke-cbe',
      version: '1.0.0',
      ref: 'ke-cbe@1.0.0',
      gradingScaleCodes: ['cbe_8_level', 'cbe_4_level'],
      schemeCodes: ['ke-cbe-terminal'],
    });
  });

  it('declares nothing when the document has no assessment section', () => {
    const pack = {
      code: 'ke-cbe',
      version: '1.0.0',
      ref: 'ke-cbe@1.0.0',
      document: {},
    } as unknown as AvailablePack;

    expect(declarationOfPack(pack).gradingScaleCodes).toEqual([]);
    expect(declarationOfPack(pack).schemeCodes).toEqual([]);
  });
});

describe('scaleSource', () => {
  it('attributes a scale at the pack version under a declared code to the pack', () => {
    expect(scaleSource({ code: 'cbe_8_level', version: '1.0.0' }, PROGRAMME, DECLARATION)).toEqual({
      kind: 'pack',
      packRef: 'ke-cbe@1.0.0',
    });
  });

  it("treats another version or code as the school's own", () => {
    expect(scaleSource({ code: 'cbe_8_level', version: '2' }, PROGRAMME, DECLARATION)).toEqual({
      kind: 'school',
    });
    expect(scaleSource({ code: 'school_letter', version: '1.0.0' }, PROGRAMME, DECLARATION)).toEqual(
      { kind: 'school' }
    );
  });

  it('treats a scale with no programme as the school\'s own', () => {
    expect(scaleSource({ code: 'cbe_8_level', version: '1.0.0' }, null, DECLARATION)).toEqual({
      kind: 'school',
    });
  });
});

describe('schemeSource and schemeCodeOf', () => {
  it('reads a pack scheme at <pack version>+<code>', () => {
    const scheme = { version: '1.0.0+ke-cbe-terminal' };
    expect(schemeSource(scheme, PROGRAMME, DECLARATION)).toEqual({
      kind: 'pack',
      packRef: 'ke-cbe@1.0.0',
    });
    expect(schemeCodeOf(scheme)).toBe('ke-cbe-terminal');
  });

  it("treats a scheme at another version or undeclared code as the school's own", () => {
    expect(schemeSource({ version: '2+ke-cbe-terminal' }, PROGRAMME, DECLARATION)).toEqual({
      kind: 'school',
    });
    expect(schemeSource({ version: '1.0.0+own-scheme' }, PROGRAMME, DECLARATION)).toEqual({
      kind: 'school',
    });
  });

  it('keeps a version with no scheme marker readable', () => {
    expect(schemeCodeOf({ version: 'school-v1' })).toBe('school-v1');
  });
});
