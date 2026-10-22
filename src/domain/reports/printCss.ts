// ABOUTME: Emits the per-template `@page` rule: the measured page box, its margins, and the page
// ABOUTME: furniture in margin boxes (never `position: fixed`, whose counters print "Page 0 of 0").

import { pageMarginShorthand, pageSizeKeyword } from './page';
import type { ReportPageFurniture, ReportPageGeometry } from './types';

/** Escapes a literal for a CSS string. Templates and school names reach this from pack JSON. */
export function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`;
}

const FURNITURE_FONT = ["'Inter Print'", "'Segoe UI'", 'sans-serif'].join(', ');

/**
 * The `@page` block for one document. `counter(page)`/`counter(pages)` only exist inside a page
 * margin box, so the page numbers live here and nowhere in the sheet content.
 *
 * Cards are separate documents in a batch, so `furniture.pageNumbers` is false for a one-sheet card:
 * a batch-wide counter would number across learners. A flow document (transcript, statement) turns
 * it on and gets "Page 1 of 2".
 */
export function pageRuleCss(page: ReportPageGeometry, furniture: ReportPageFurniture): string {
  const rules: string[] = [`  size: ${pageSizeKeyword(page)};`, `  margin: ${pageMarginShorthand(page)};`];
  const font = `font-family: ${FURNITURE_FONT}; font-size: ${furniture.fontPt}pt; color: ${furniture.color};`;
  if (furniture.leftText) {
    rules.push(`  @bottom-left { content: ${cssString(furniture.leftText)}; ${font} }`);
  }
  if (furniture.pageNumbers) {
    rules.push(`  @bottom-right { content: "Page " counter(page) " of " counter(pages); ${font} }`);
  }
  return `@page {\n${rules.join('\n')}\n}\n`;
}
