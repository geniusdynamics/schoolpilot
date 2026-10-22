// ABOUTME: Reads the bundled ke-cbe pack's report templates, locale files and version through Vite's
// ABOUTME: eager glob, so the publish page renders the pack's own template without a deep import.

import type { ReportLocaleBundle, ReportLocaleBundles, ReportTemplate } from '@/domain/reports/types';

const templateModules = import.meta.glob('../../../../../../packs/ke-cbe/reports/*.report.json', {
  eager: true,
  import: 'default',
});

const localeModules = import.meta.glob('../../../../../../packs/ke-cbe/locales/*.json', {
  eager: true,
  import: 'default',
});

const packModules = import.meta.glob('../../../../../../packs/ke-cbe/pack.json', {
  eager: true,
  import: 'default',
});

/** The locale a bundle file is keyed by: `locales/sw.json` → `sw`. */
function localeOf(path: string): string {
  const name = path.split('/').pop() ?? '';
  return name.replace(/\.json$/, '');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readTemplates(modules: Record<string, unknown>): ReportTemplate[] {
  const templates: ReportTemplate[] = [];
  for (const value of Object.values(modules)) {
    const record = asRecord(value);
    if (!record) continue;
    if (typeof record.code !== 'string' || !Array.isArray(record.blocks)) continue;
    templates.push(record as unknown as ReportTemplate);
  }
  return templates.sort((left, right) => left.code.localeCompare(right.code));
}

function readLocales(modules: Record<string, unknown>): ReportLocaleBundles {
  const bundles: Record<string, ReportLocaleBundle> = {};
  for (const [path, value] of Object.entries(modules)) {
    const record = asRecord(value);
    if (!record) continue;
    bundles[localeOf(path)] = record as unknown as ReportLocaleBundle;
  }
  return bundles;
}

function readPackVersion(modules: Record<string, unknown>): string {
  for (const value of Object.values(modules)) {
    const record = asRecord(value);
    if (record && typeof record.version === 'string') return record.version;
  }
  return 'unknown';
}

/** The pack's report templates, in code order. */
export const PACK_REPORT_TEMPLATES: readonly ReportTemplate[] = readTemplates(templateModules);

/** The pack's locale files keyed by locale. */
export const PACK_LOCALES: ReportLocaleBundles = readLocales(localeModules);

/** The pack version, recorded as the template version on every published snapshot. */
export const PACK_VERSION: string = readPackVersion(packModules);

/** The pack's default locale. The ke-cbe pack declares `en` and `sw`. */
export const PACK_DEFAULT_LOCALE = 'en';

/** The first template whose code matches, or the first declared template, or null. */
export function findTemplate(code: string | null): ReportTemplate | null {
  if (code === null) return PACK_REPORT_TEMPLATES[0] ?? null;
  return PACK_REPORT_TEMPLATES.find((template) => template.code === code) ?? null;
}
