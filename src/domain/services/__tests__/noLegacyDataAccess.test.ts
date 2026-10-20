// ABOUTME: Guards the domain services against the legacy data layer: no service may import the
// ABOUTME: collections or the AppDataContext, and every service has to read and write through the
// ABOUTME: repository of P1-B02.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SERVICES = path.resolve(__dirname, '..');

/** The service files, without the tests. */
function serviceFiles(): string[] {
  return fs
    .readdirSync(SERVICES)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));
}

describe('the domain services', () => {
  it('never import the legacy collections or the AppDataContext', () => {
    const files = serviceFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(path.join(SERVICES, file), 'utf8');
      const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);

      for (const specifier of imports) {
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/collections/);
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/AppDataContext/);
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/@\/contexts\//);
        expect(specifier, `${file} imports ${specifier}`).not.toMatch(/@\/modules\//);
      }
    }
  });

  it('read and write through the repository of P1-B02', () => {
    const services = [
      'admissionService.ts',
      'attendanceService.ts',
      'enrolmentService.ts',
      'guardianService.ts',
    ];

    for (const file of services) {
      const source = fs.readFileSync(path.join(SERVICES, file), 'utf8');
      const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);

      expect(imports, `${file} does not use the repository`).toContain('@/data/repository');
    }
  });
});
