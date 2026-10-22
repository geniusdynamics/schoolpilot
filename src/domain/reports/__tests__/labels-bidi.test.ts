// ABOUTME: Label fallbacks, direction and RTL isolation: the pack-locale chain and the run isolation
// ABOUTME: that keeps a date or a URL readable inside an Arabic paragraph.

import { describe, expect, it } from 'vitest';
import { builtInLabel, humaniseKey, resolveLabels } from '../labels';
import { directionOf, hasRtlText, isLtrRun, isolateLtr, isolateRuns } from '../bidi';
import { LOCALES } from '../__fixtures__/cards';

describe('label lookup chain', () => {
  it('prefers the pack locale, then the pack default, then English', () => {
    const ar = resolveLabels({ bundles: LOCALES, locale: 'ar', defaultLocale: 'en' });
    expect(ar.get('block.learner')).toBe('الطالب');
    // `block.results` exists in ar; `block.progression` does not, so it falls through to English.
    expect(ar.get('block.progression')).toBe('Progression');

    const swahili = resolveLabels({ bundles: LOCALES, locale: 'sw', defaultLocale: 'en' });
    expect(swahili.get('block.learner')).toBe('Mwanafunzi');
    // Swahili has column.grade but not column.remark.
    expect(swahili.get('column.grade')).toBe('Daraja');
    expect(swahili.get('column.remark')).toBe('Remark');
  });

  it('falls back to the pack default locale before en when the locale file is missing', () => {
    const labels = resolveLabels({ bundles: LOCALES, locale: 'fr', defaultLocale: 'sw' });
    expect(labels.get('block.learner')).toBe('Mwanafunzi');
    expect(labels.get('block.calendar')).toBe('Calendar');
  });

  it('treats a blank translation as absent rather than printing nothing', () => {
    const labels = resolveLabels({
      bundles: { ...LOCALES, sw: { labels: { 'block.learner': '   ', 'block.attendance': 'Mahudhurio' } } },
      locale: 'sw',
      defaultLocale: 'en',
    });
    expect(labels.get('block.learner')).toBe('Learner');
    expect(labels.get('block.attendance')).toBe('Mahudhurio');
  });

  it('never returns an empty string for an unknown key', () => {
    const labels = resolveLabels({ bundles: {}, locale: 'en', defaultLocale: 'en' });
    expect(labels.get('block.unknown_thing')).toBe('Unknown thing');
    expect(labels.get('summary.total')).toBe('Total');
    expect(builtInLabel('nope')).toBeNull();
    expect(humaniseKey('some.deep_key')).toBe('Deep key');
  });

  it('knows whether the pack supplied a key itself', () => {
    const labels = resolveLabels({ bundles: LOCALES, locale: 'en', defaultLocale: 'en' });
    expect(labels.has('block.header')).toBe(true);
    expect(labels.has('block.affective_psychomotor')).toBe(false);
  });
});

describe('direction', () => {
  it('reads the direction from the locale tag', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('ar-KE')).toBe('rtl');
    expect(directionOf('he')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
    expect(directionOf('sw')).toBe('ltr');
  });

  it('detects RTL text and Latin/digit-only runs', () => {
    expect(hasRtlText('31 Oct 2026')).toBe(false);
    expect(hasRtlText('أمينة 2026')).toBe(true);
    expect(isLtrRun('31 Oct 2026')).toBe(true);
    expect(isLtrRun('ADM-2026142')).toBe(true);
    expect(isLtrRun('—')).toBe(false);
    expect(isLtrRun('أمينة')).toBe(false);
  });

  it('isolates a Latin run inside an RTL paragraph', () => {
    expect(isolateLtr('31 Oct 2026')).toBe('\u206631 Oct 2026\u2069');
    expect(isLtrRun('https://verify.schoolpilot.app/v1/RC-1?sig=abc')).toBe(true);
    // Pure RTL text is left alone, and a pure LTR string is not wrapped twice.
    expect(isolateLtr('أمينة')).toBe('أمينة');
    expect(isolateRuns('31 Oct 2026')).toBe('31 Oct 2026');
  });

  it('isolates every Latin run inside mixed text without touching the Arabic', () => {
    const isolated = isolateRuns('يغلق 31 Oct 2026 ثم يفتح 4 Jan 2027');
    expect(isolated).toContain('\u206631 Oct 2026\u2069');
    expect(isolated).toContain('\u20664 Jan 2027\u2069');
    expect(isolated).toContain('يغلق');
    // The Arabic run itself is not wrapped.
    expect(isolated.startsWith('\u2066')).toBe(false);
  });

  it('keeps a URL inside Arabic prose a single isolated run', () => {
    const isolated = isolateRuns('تحقق عبر https://verify.schoolpilot.app/v1/RC-1?sig=abc الآن');
    expect(isolated).toContain('\u2066https://verify.schoolpilot.app/v1/RC-1?sig=abc\u2069');
  });
});
