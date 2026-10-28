// ABOUTME: The contract every accounting connector honours: one export per documented target, each citing
// ABOUTME: the documentation it was written against, each declaring the fields it could not confirm, and
// ABOUTME: none of them ever reaching a network - an export produces a file, it posts nothing.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ACCOUNTING_EXPORTS, ACCOUNTING_TARGET_IDS, accountingExportFor, exportJournal } from '../index';
import type { AccountingTargetId } from '../types';
import { batchFor, mappingFor } from './fixtures';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('the accounting connectors', () => {
  it('implements every documented target exactly once', () => {
    expect(ACCOUNTING_EXPORTS.map((connector) => connector.id).sort()).toEqual(
      [...ACCOUNTING_TARGET_IDS].sort()
    );
    for (const connector of ACCOUNTING_EXPORTS) {
      expect(connector.label).not.toBe('');
      expect(connector.render).toBeTypeOf('function');
    }
  });

  it('cites the documentation it was written against, over https', () => {
    for (const connector of ACCOUNTING_EXPORTS) {
      expect(connector.documentation.length).toBeGreaterThan(0);
      for (const url of connector.documentation) {
        expect(url.startsWith('https://')).toBe(true);
      }
      expect(Array.isArray(connector.draftFields)).toBe(true);
    }
  });

  it('declares which identifiers a mapping must carry', () => {
    expect(accountingExportFor('odoo')?.mappingRequirements).toEqual(['journal']);
    expect(accountingExportFor('erpnext')?.mappingRequirements).toEqual(['company']);
    expect(accountingExportFor('quickbooks')?.mappingRequirements).toEqual([]);
    expect(accountingExportFor('xero')?.mappingRequirements).toEqual([]);
  });

  it('answers null for a target no connector implements', () => {
    expect(accountingExportFor('sage' as AccountingTargetId)).toBeNull();
  });

  it('posts nothing: no export calls fetch', () => {
    const calls: string[] = [];
    globalThis.fetch = ((input: RequestInfo | URL) => {
      calls.push(String(input));
      throw new Error('an export must not reach the network');
    }) as typeof fetch;

    for (const target of ACCOUNTING_TARGET_IDS) {
      const result = exportJournal(batchFor(target), mappingFor(target));
      expect(result.ok, target).toBe(true);
      if (!result.ok) continue;
      expect(result.file.content.length).toBeGreaterThan(0);
      expect(result.file.target).toBe(target);
    }

    expect(calls).toEqual([]);
  });

  it('refuses without a file when the batch cannot be exported', () => {
    const result = exportJournal(
      { ...batchFor('quickbooks'), entries: [] },
      mappingFor('quickbooks')
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toHaveLength(1);
    expect('file' in result).toBe(false);
  });
});
