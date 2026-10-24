// ABOUTME: The hybrid logical clock a change carries: fixed-width, so a plain string compare is
// ABOUTME: the total order, in JavaScript and in a SQL `WHERE excluded.hlc > hlc` alike.

export interface HlcParts {
  readonly wall: number;
  readonly counter: number;
  readonly device: string;
}

const WALL_WIDTH = 15;
const COUNTER_WIDTH = 6;

/** Renders a clock reading as the sortable string every change carries. */
export function formatHlc(parts: HlcParts): string {
  if (!Number.isSafeInteger(parts.wall) || parts.wall < 0) {
    throw new RangeError(`an HLC wall time must be a non-negative safe integer, got ${parts.wall}`);
  }
  if (!Number.isSafeInteger(parts.counter) || parts.counter < 0) {
    throw new RangeError(`an HLC counter must be a non-negative safe integer, got ${parts.counter}`);
  }
  if (parts.device.length === 0 || parts.device.includes(':')) {
    throw new RangeError(`an HLC device id must be non-empty and free of ":", got "${parts.device}"`);
  }
  return `${String(parts.wall).padStart(WALL_WIDTH, '0')}:${String(parts.counter).padStart(COUNTER_WIDTH, '0')}:${parts.device}`;
}

/** Reads a clock string back into its parts. */
export function parseHlc(value: string): HlcParts {
  const match = /^(\d+):(\d+):(.+)$/.exec(value);
  if (!match) throw new RangeError(`"${value}" is not an HLC string`);
  return {
    wall: Number(match[1]),
    counter: Number(match[2]),
    device: match[3] as string,
  };
}

/** The device that wrote a clock reading. */
export function deviceOf(value: string): string {
  return parseHlc(value).device;
}

/**
 * The total order of two clock strings.
 *
 * The format puts the wall time and the counter at a fixed width before the device, so
 * comparing the rendered strings compares the readings; the device breaks a tie.
 */
export function compareHlc(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** The later of two readings, ignoring an absent one. */
export function laterHlc(left: string | undefined, right: string | undefined): string {
  if (left === undefined) return right ?? '';
  if (right === undefined) return left;
  return compareHlc(left, right) >= 0 ? left : right;
}

/** The latest reading in a clock map, or the empty string when it holds none. */
export function latestHlc(clock: Readonly<Record<string, string>>): string {
  let best = '';
  for (const value of Object.values(clock)) best = laterHlc(best, value);
  return best;
}

/**
 * A device's clock.
 *
 * `tick` is called once per local write; `observe` is called for every remote reading the
 * device accepts, so a device that has been asleep still orders its next write after what
 * it has seen.
 */
export class HlcClock {
  private wall = 0;
  private counter = 0;

  constructor(
    private readonly device: string,
    private readonly physical: () => number = Date.now
  ) {
    if (device.length === 0 || device.includes(':')) {
      throw new RangeError(`a clock device id must be non-empty and free of ":", got "${device}"`);
    }
  }

  /** The last reading issued, without advancing the clock. */
  peek(): string {
    return formatHlc({ wall: this.wall, counter: this.counter, device: this.device });
  }

  /** Advances the clock for a local write. */
  tick(): string {
    const now = this.physical();
    if (now > this.wall) {
      this.wall = now;
      this.counter = 0;
    } else {
      this.counter += 1;
    }
    return this.peek();
  }

  /** Folds a remote reading in, so the next local write sorts after it. */
  observe(remote: string): void {
    if (remote === '') return;
    const parts = parseHlc(remote);
    const now = this.physical();
    const wall = Math.max(now, this.wall, parts.wall);

    if (wall === this.wall && wall === parts.wall) {
      this.counter = Math.max(this.counter, parts.counter) + 1;
    } else if (wall === this.wall) {
      this.counter += 1;
    } else if (wall === parts.wall) {
      this.counter = parts.counter + 1;
    } else {
      this.counter = 0;
    }

    this.wall = wall;
  }
}
