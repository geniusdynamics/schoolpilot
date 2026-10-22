// ABOUTME: The render-time fit check: whether a measured sheet fits its page content box, which
// ABOUTME: density was needed, and the overflow that must be surfaced rather than hidden.

/** Densities in the order the surface tries them. Compact tightens spacing, never type size. */
export const FIT_DENSITIES = ['full', 'compact'] as const;

export type FitDensity = (typeof FIT_DENSITIES)[number];

/**
 * The spacing multiplier of each density. Compact pulls the vertical rhythm (block gaps, cell
 * padding, line height) to 62% so a long comment can still fit at 8.5 pt — the type floor is never
 * traded for space, because DR-05 treats anything under 8 pt body as a failure.
 */
export const DENSITY_SPACING: Readonly<Record<FitDensity, number>> = { full: 1, compact: 0.62 };

/** Chromium's point→millimetre rounding is 0.1 mm; anything inside this is a fit. */
export const FIT_TOLERANCE_MM = 0.05;

export interface FitReading {
  readonly density: FitDensity;
  /** Measured sheet height in millimetres. */
  readonly heightMm: number;
}

export interface FitResult {
  readonly density: FitDensity;
  readonly heightMm: number;
  /** Positive when the sheet is taller than the content box, zero when it fits. */
  readonly overflowMm: number;
  readonly overflow: boolean;
  /** How many densities were measured before the decision. */
  readonly passes: number;
  readonly measured: readonly FitReading[];
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Picks the first measured density that fits the content box. When none fits, reports the most
 * compact reading as an overflow — the renderer marks the sheet `data-overflow` and lets it break,
 * because a two-page card must be visible as a defect, not hidden.
 */
export function resolveFit(readings: readonly FitReading[], contentHeightMm: number): FitResult {
  if (readings.length === 0) {
    return { density: 'full', heightMm: 0, overflowMm: 0, overflow: false, passes: 0, measured: [] };
  }
  const fits = readings.find((reading) => reading.heightMm <= contentHeightMm + FIT_TOLERANCE_MM);
  if (fits) {
    return {
      density: fits.density,
      heightMm: round1(fits.heightMm),
      overflowMm: 0,
      overflow: false,
      passes: readings.length,
      measured: readings,
    };
  }
  const last = readings[readings.length - 1];
  const overflowMm = round1(Math.max(0, last.heightMm - contentHeightMm));
  return { density: last.density, heightMm: round1(last.heightMm), overflowMm, overflow: true, passes: readings.length, measured: readings };
}

/** The spacing multiplier the surface applies for a density. */
export function densitySpacing(density: FitDensity): number {
  return DENSITY_SPACING[density];
}
