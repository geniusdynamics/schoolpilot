// ABOUTME: Tests for the anchored-popup geometry: a popup pinned to its trigger must flip above
// ABOUTME: it when the space below is short, stay inside the viewport, and report the height left.

import { describe, expect, it } from 'vitest';

import { computeAnchorPosition } from '../popper';

const trigger = (top: number, left = 100, width = 200, height = 40) => ({
  top,
  left,
  bottom: top + height,
  right: left + width,
  width,
  height,
});

describe('computeAnchorPosition', () => {
  it('places the popup below the trigger when the space is ample', () => {
    const result = computeAnchorPosition(
      trigger(200),
      { width: 200, height: 150 },
      { width: 1280, height: 800 }
    );
    expect(result.placement).toBe('bottom');
    expect(result.top).toBe(246); // trigger.bottom 240 + margin 6
    expect(result.left).toBe(100);
    expect(result.maxHeight).toBe(800 - 246 - 8);
  });

  it('flips above the trigger when the popup cannot fit below', () => {
    const result = computeAnchorPosition(
      trigger(700),
      { width: 200, height: 200 },
      { width: 1280, height: 800 }
    );
    expect(result.placement).toBe('top');
    expect(result.top).toBe(700 - 6 - 200);
    // The reported height is the room on the chosen side: an upper bound the popup is capped to.
    expect(result.maxHeight).toBe(700 - 6 - 8);
    expect(result.maxHeight).toBeGreaterThanOrEqual(200);
  });

  it('clamps the popup inside the viewport horizontally', () => {
    const result = computeAnchorPosition(
      trigger(100, 1200),
      { width: 300, height: 120 },
      { width: 1280, height: 800 }
    );
    expect(result.left).toBe(1280 - 8 - 300);
  });

  it('keeps a popup wider than the viewport at the padding edge', () => {
    const result = computeAnchorPosition(
      trigger(100, 10),
      { width: 1400, height: 120 },
      { width: 1280, height: 800 }
    );
    expect(result.left).toBe(8);
  });

  it('caps the height to the room left when neither side fits the full popup', () => {
    const result = computeAnchorPosition(
      trigger(400),
      { width: 200, height: 700 },
      { width: 1280, height: 800 }
    );
    // Below has 800-446-8 = 346px, above has 400-6-8 = 386px: flip up wins, clamped to its room.
    expect(result.placement).toBe('top');
    expect(result.maxHeight).toBe(400 - 6 - 8);
  });

  it('never returns a negative top when the trigger is at the very top', () => {
    const result = computeAnchorPosition(
      trigger(0),
      { width: 200, height: 500 },
      { width: 1280, height: 800 }
    );
    expect(result.top).toBeGreaterThanOrEqual(8);
  });
});
