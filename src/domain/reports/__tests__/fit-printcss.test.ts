// ABOUTME: Fit-check arithmetic and the emitted `@page` rule: the density that fits, the overflow that
// ABOUTME: is surfaced, and the margin-box furniture DR-05 measured.

import { describe, expect, it } from 'vitest';
import { DENSITY_SPACING, FIT_DENSITIES, resolveFit } from '../fit';
import { cssString, pageRuleCss } from '../printCss';
import { resolvePageGeometry } from '../page';

describe('fit check', () => {
  const box = 267;

  it('accepts the measured A4 baseline exactly at the content box', () => {
    const fit = resolveFit([{ density: 'full', heightMm: 267 }], box);
    expect(fit).toMatchObject({ density: 'full', heightMm: 267, overflow: false, overflowMm: 0, passes: 1 });
  });

  it('keeps the full density when the card is shorter than the box', () => {
    expect(resolveFit([{ density: 'full', heightMm: 240.4 }], box).density).toBe('full');
  });

  it('falls to compact before declaring an overflow', () => {
    const fit = resolveFit(
      [
        { density: 'full', heightMm: 275.1 },
        { density: 'compact', heightMm: 264.2 },
      ],
      box
    );
    expect(fit.density).toBe('compact');
    expect(fit.overflow).toBe(false);
    expect(fit.passes).toBe(2);
    expect(fit.heightMm).toBe(264.2);
  });

  it('reports the overflow when even compact does not fit', () => {
    const fit = resolveFit(
      [
        { density: 'full', heightMm: 275.1 },
        { density: 'compact', heightMm: 270.8 },
      ],
      box
    );
    expect(fit.density).toBe('compact');
    expect(fit.overflow).toBe(true);
    expect(fit.overflowMm).toBe(3.8);
    expect(fit.heightMm).toBe(270.8);
  });

  it('tolerates the 0.1 mm Chromium rounding without calling it an overflow', () => {
    expect(resolveFit([{ density: 'full', heightMm: 267.04 }], box).overflow).toBe(false);
    expect(resolveFit([{ density: 'full', heightMm: 267.2 }], box).overflow).toBe(true);
  });

  it('chooses the first density that fits, in declaration order', () => {
    const fit = resolveFit(
      [
        { density: 'full', heightMm: 300 },
        { density: 'compact', heightMm: 280 },
      ],
      290
    );
    expect(fit.density).toBe('compact');
    expect(fit.measured).toHaveLength(2);
  });

  it('compacts spacing, never the type', () => {
    expect(FIT_DENSITIES).toEqual(['full', 'compact']);
    expect(DENSITY_SPACING.compact).toBeLessThan(DENSITY_SPACING.full);
    expect(DENSITY_SPACING.compact).toBeGreaterThan(0);
  });

  it('does not invent a fit when nothing was measured', () => {
    expect(resolveFit([], box)).toMatchObject({ passes: 0, overflow: false, heightMm: 0 });
  });
});

describe('@page emission', () => {
  const a4 = resolvePageGeometry();
  const furniture = { leftText: 'Term report card · 2026', pageNumbers: true, fontPt: 7.5, color: '#4b5563' };

  it('emits the measured page box, margins and both page counters', () => {
    const css = pageRuleCss(a4, furniture);
    expect(css).toContain('size: A4 portrait;');
    expect(css).toContain('margin: 14mm 12mm 16mm 12mm;');
    expect(css).toContain('@bottom-left');
    expect(css).toContain('content: "Term report card · 2026";');
    expect(css).toContain('@bottom-right');
    expect(css).toContain('"Page " counter(page) " of " counter(pages)');
  });

  it('omits the page counter for a one-sheet card', () => {
    const css = pageRuleCss(a4, { ...furniture, pageNumbers: false });
    expect(css).not.toContain('counter(pages)');
    expect(css).toContain('@bottom-left');
  });

  it('emits A5 and landscape values from the template', () => {
    const a5 = pageRuleCss(resolvePageGeometry({ size: 'A5' }), furniture);
    expect(a5).toContain('size: A5 portrait;');
    expect(a5).toContain('margin: 10mm 9mm 12mm 9mm;');

    const landscape = pageRuleCss(resolvePageGeometry({ orientation: 'landscape' }), furniture);
    expect(landscape).toContain('size: A4 landscape;');
    expect(landscape).toContain('margin: 12mm 14mm 12mm 14mm;');
  });

  it('escapes a school name so it cannot break out of the CSS string', () => {
    expect(cssString('St "Mary\'s" \\ Academy\nNairobi')).toBe('"St \\"Mary\'s\\" \\\\ Academy Nairobi"');
    const css = pageRuleCss(a4, { ...furniture, leftText: 'St "Mary\'s" Academy' });
    expect(css).toContain('content: "St \\"Mary\'s\\" Academy";');
  });
});
