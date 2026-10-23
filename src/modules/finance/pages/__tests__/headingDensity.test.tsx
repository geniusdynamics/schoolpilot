// ABOUTME: Guards the finance module's heading-density convention: the permanent coloured intro box
// ABOUTME: and the page-level space-y-6 wrapper are retired, and a moved explanation is reachable from
// ABOUTME: the InfoHint beside its heading instead of costing a row on every visit.

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { createFinanceRepositoryDouble } from '../../data/__tests__/canonicalRepositoryDouble';

import { FeeCollectionSummaryPageContent } from '../FeeCollectionSummaryPage';
import { StudentPaymentsPageContent } from '../StudentPaymentsPage';

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
  useToastHelpers: () => ({
    showToast: vi.fn(),
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const MODULE_ROOT = join(process.cwd(), 'src', 'modules', 'finance');

function walk(directory: string, found: string[]): void {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      if (entry === '__tests__') continue;
      walk(path, found);
      continue;
    }
    if (/\.tsx$/.test(entry)) found.push(path);
  }
}

const sources = (() => {
  const found: string[] = [];
  walk(MODULE_ROOT, found);
  return found.map((path) => ({
    modulePath: relative(MODULE_ROOT, path).split(sep).join('/'),
    text: readFileSync(path, 'utf8'),
  }));
})();

/**
 * The statement body is a set of stacked blocks inside one card, not a page heading region, so its
 * own space-y-6 is left alone. Every page-level wrapper was moved to space-y-3.
 */
const SPACE_Y6_ALLOWED = new Set(['pages/statements/StatementsPage.tsx']);

describe('the finance heading density convention', () => {
  it('leaves no permanent coloured intro box inside a card body', () => {
    const offenders = sources
      .filter((source) => /mb-6 p-4 bg-|mb-6 rounded-lg border border-/.test(source.text))
      .map((source) => source.modulePath);
    expect(offenders).toEqual([]);
  });

  it('keeps the page wrapper at space-y-3 rather than space-y-6', () => {
    const offenders = sources
      .filter((source) => /className="space-y-6"/.test(source.text))
      .filter((source) => !SPACE_Y6_ALLOWED.has(source.modulePath))
      .map((source) => source.modulePath);
    expect(offenders).toEqual([]);
  });

  it('finds the module sources it is meant to guard', () => {
    expect(sources.length).toBeGreaterThan(30);
  });
});

describe('a moved explanation is reachable from the InfoHint', () => {
  const renderPage = (ui: React.ReactElement) =>
    render(
      <MemoryRouter>
        <ConfirmProvider>
          <CanonicalRepositoryProvider repository={createFinanceRepositoryDouble()}>
            {ui}
          </CanonicalRepositoryProvider>
        </ConfirmProvider>
      </MemoryRouter>
    );

  it('keeps the fee collection summary sentence, reachable from the card info hint', async () => {
    renderPage(<FeeCollectionSummaryPageContent />);
    expect(await screen.findByRole('button', { name: 'About this section' })).toBeInTheDocument();
    // The sentence is preserved in the tooltip, off the heading row.
    expect(screen.getByText(/Billed is every posted invoice line/)).toBeInTheDocument();
  });

  it('puts the student payments sentence behind the card info hint', async () => {
    renderPage(<StudentPaymentsPageContent />);
    expect(await screen.findByRole('button', { name: 'About this section' })).toBeInTheDocument();
  });
});
