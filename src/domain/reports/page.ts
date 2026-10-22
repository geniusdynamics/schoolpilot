// ABOUTME: The measured page geometries of DR-05, and the legibility floor each one carries. Every
// ABOUTME: margin, content box and baseline size here is a spike figure, not a design preference.

import type {
  ReportMargins,
  ReportOrientation,
  ReportPageGeometry,
  ReportPageSize,
  ReportPageSpec,
} from './types';

interface PageDefinition {
  readonly widthMm: number;
  readonly heightMm: number;
  readonly margins: ReportMargins;
  readonly baseFontPt: number;
}

/**
 * DR-05 §Page geometry: the four supported page boxes, measured through Chromium 140. The content
 * box is derived from the margins, exactly as the spike computed it; note that the DR's table prints
 * 184 mm for A4 landscape and 129 mm for A5 landscape, which contradicts its own margin list and its
 * measured "+58.5 mm" overflow (244.5 − 186 = 58.5; 244.5 − 184 = 60.5). The margins win.
 */
const PAGE_DEFINITIONS: Readonly<Record<`${ReportPageSize}-${ReportOrientation}`, PageDefinition>> = {
  'A4-portrait': { widthMm: 210, heightMm: 297, margins: { top: 14, right: 12, bottom: 16, left: 12 }, baseFontPt: 8.5 },
  'A4-landscape': { widthMm: 297, heightMm: 210, margins: { top: 12, right: 14, bottom: 12, left: 14 }, baseFontPt: 8.2 },
  'A5-portrait': { widthMm: 148, heightMm: 210, margins: { top: 10, right: 9, bottom: 12, left: 9 }, baseFontPt: 7.6 },
  'A5-landscape': { widthMm: 210, heightMm: 148, margins: { top: 9, right: 10, bottom: 9, left: 10 }, baseFontPt: 7.2 },
};

/** Body / table / metadata floor. Below 8.5 pt body the fit is a failure, not a design choice. */
export const TYPE_FLOOR_PT = { body: 8.5, table: 8, meta: 7.2 } as const;

/** The metadata floor is absolute: even a 7.2 pt A5 card may not print a smaller footer. */
export const META_FLOOR_PT = 7.2;

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Resolves `template.page` to a geometry. Unknown or absent members fall back to A4 portrait, which
 * is the schema's documented default.
 */
export function resolvePageGeometry(spec?: ReportPageSpec | null): ReportPageGeometry {
  const size: ReportPageSize = spec?.size === 'A5' ? 'A5' : 'A4';
  const orientation: ReportOrientation = spec?.orientation === 'landscape' ? 'landscape' : 'portrait';
  const definition = PAGE_DEFINITIONS[`${size}-${orientation}`];
  const { margins } = definition;
  // A reduced geometry (A5, landscape) prints a smaller baseline than the A4 floor because the page
  // cannot hold the card otherwise; the table and metadata sizes still respect their own floors.
  const tableFontPt = Math.max(TYPE_FLOOR_PT.meta, round(definition.baseFontPt - 0.5));
  return {
    size,
    orientation,
    widthMm: definition.widthMm,
    heightMm: definition.heightMm,
    margins,
    contentWidthMm: round(definition.widthMm - margins.left - margins.right),
    contentHeightMm: round(definition.heightMm - margins.top - margins.bottom),
    baseFontPt: definition.baseFontPt,
    tableFontPt,
    metaFontPt: META_FLOOR_PT,
  };
}

/** The `size` value the `@page` rule needs: `A4 portrait`, `A5 landscape`, … */
export function pageSizeKeyword(page: ReportPageGeometry): string {
  return `${page.size} ${page.orientation}`;
}

/** The CSS `margin` shorthand in the order CSS expects: top right bottom left. */
export function pageMarginShorthand(page: ReportPageGeometry): string {
  const { top, right, bottom, left } = page.margins;
  return `${top}mm ${right}mm ${bottom}mm ${left}mm`;
}

/**
 * True when this geometry cannot hold the full reference card at a legible size (DR-05 measured
 * +72.5 mm on A5 portrait and +58.5 mm on A4 landscape), so the resolver must reduce the block set.
 */
export function needsReducedLayout(page: ReportPageGeometry): boolean {
  return page.size === 'A5' || page.orientation === 'landscape';
}
