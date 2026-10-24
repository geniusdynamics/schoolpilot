// ABOUTME: The hybrid logical clock proved on its own: the fixed-width format, the total order
// ABOUTME: a plain string compare gives, and what `tick` and `observe` do across a clock jump.

import { describe, expect, it } from 'vitest';

import {
  HlcClock,
  compareHlc,
  deviceOf,
  formatHlc,
  latestHlc,
  laterHlc,
  parseHlc,
} from '../hlc';

describe('the clock string', () => {
  it('renders every part at a fixed width, so string order is reading order', () => {
    expect(formatHlc({ wall: 1_800_000_000_000, counter: 7, device: 'device-a' })).toBe(
      '001800000000000:000007:device-a'
    );
    expect(formatHlc({ wall: 0, counter: 0, device: 'x' })).toBe('000000000000000:000000:x');
  });

  it('round-trips through parse', () => {
    const parts = { wall: 1_800_000_000_123, counter: 42, device: 'hub' };
    expect(parseHlc(formatHlc(parts))).toEqual(parts);
  });

  it('refuses a negative wall, a negative counter, and a device with a colon', () => {
    expect(() => formatHlc({ wall: -1, counter: 0, device: 'a' })).toThrow(RangeError);
    expect(() => formatHlc({ wall: 1, counter: -1, device: 'a' })).toThrow(RangeError);
    expect(() => formatHlc({ wall: 1, counter: 0, device: '' })).toThrow(RangeError);
    expect(() => formatHlc({ wall: 1, counter: 0, device: 'a:b' })).toThrow(RangeError);
  });

  it('refuses a string that is not a clock', () => {
    expect(() => parseHlc('not-a-clock')).toThrow(RangeError);
  });

  it('orders by wall, then counter, then device', () => {
    const early = formatHlc({ wall: 1_000, counter: 0, device: 'device-z' });
    const later = formatHlc({ wall: 1_001, counter: 0, device: 'device-a' });
    const sameWallLowerCounter = formatHlc({ wall: 1_000, counter: 0, device: 'device-a' });
    const sameWallHigherCounter = formatHlc({ wall: 1_000, counter: 1, device: 'device-a' });

    expect(compareHlc(early, later)).toBe(-1);
    expect(compareHlc(later, early)).toBe(1);
    expect(compareHlc(early, early)).toBe(0);
    expect(compareHlc(sameWallLowerCounter, early)).toBe(-1);
    expect(compareHlc(sameWallLowerCounter, sameWallHigherCounter)).toBe(-1);
  });

  it('names the device that wrote a reading', () => {
    expect(deviceOf(formatHlc({ wall: 5, counter: 1, device: 'device-b' }))).toBe('device-b');
  });

  it('takes the later of two readings, ignoring an absent one', () => {
    const early = formatHlc({ wall: 1, counter: 0, device: 'a' });
    const later = formatHlc({ wall: 2, counter: 0, device: 'a' });

    expect(laterHlc(early, later)).toBe(later);
    expect(laterHlc(later, early)).toBe(later);
    expect(laterHlc(undefined, later)).toBe(later);
    expect(laterHlc(early, undefined)).toBe(early);
    expect(laterHlc(undefined, undefined)).toBe('');
  });

  it('reads the latest reading of a clock map', () => {
    const clock = {
      given_name: formatHlc({ wall: 1, counter: 0, device: 'a' }),
      nationality: formatHlc({ wall: 3, counter: 0, device: 'b' }),
      status: formatHlc({ wall: 2, counter: 0, device: 'c' }),
    };

    expect(latestHlc(clock)).toBe(clock.nationality);
    expect(latestHlc({})).toBe('');
  });
});

describe('a device clock', () => {
  it('keeps one wall time and counts inside it', () => {
    const clock = new HlcClock('device-a', () => 1_000);
    const first = clock.tick();
    const second = clock.tick();

    expect(parseHlc(first)).toEqual({ wall: 1_000, counter: 0, device: 'device-a' });
    expect(parseHlc(second)).toEqual({ wall: 1_000, counter: 1, device: 'device-a' });
    expect(compareHlc(second, first)).toBe(1);
  });

  it('moves with the wall time and resets the counter when it advances', () => {
    let now = 1_000;
    const clock = new HlcClock('device-a', () => now);
    clock.tick();
    clock.tick();

    now = 2_000;
    expect(parseHlc(clock.tick())).toEqual({ wall: 2_000, counter: 0, device: 'device-a' });
  });

  it('sorts its next write after a remote reading it has seen', () => {
    const clock = new HlcClock('device-a', () => 1_000);
    const remote = formatHlc({ wall: 9_000, counter: 4, device: 'device-b' });

    clock.observe(remote);
    const next = clock.tick();

    expect(compareHlc(next, remote)).toBe(1);
    expect(parseHlc(next).wall).toBe(9_000);
  });

  it('counts past a remote reading that shares its wall time', () => {
    const clock = new HlcClock('device-a', () => 1_000);
    const remote = formatHlc({ wall: 1_000, counter: 9, device: 'device-b' });

    clock.observe(remote);

    expect(parseHlc(clock.tick())).toEqual({ wall: 1_000, counter: 11, device: 'device-a' });
  });

  it('ignores an empty reading', () => {
    const clock = new HlcClock('device-a', () => 1_000);
    clock.observe('');
    expect(parseHlc(clock.tick())).toEqual({ wall: 1_000, counter: 0, device: 'device-a' });
  });

  it('refuses a device id it could not parse back', () => {
    expect(() => new HlcClock('a:b')).toThrow(RangeError);
    expect(() => new HlcClock('')).toThrow(RangeError);
  });
});
