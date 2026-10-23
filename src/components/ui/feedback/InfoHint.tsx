// ABOUTME: The one info affordance the whole app uses: a small bordered circle beside a heading that
// ABOUTME: reveals the heading's explanation on hover or focus. Replaces permanent description rows.

import { Tooltip } from './Tooltip';

export interface InfoHintProps {
  /** The explanation. Rendered inside the tooltip, never inline. */
  text: string;
  /** The accessible name of the button. Says what the hint is about. */
  label?: string;
  className?: string;
  /**
   * `onColor` is for a heading that sits on a gradient hero — the default light-surface ring and
   * muted ink disappear there, so the button takes the surrounding ink and a translucent ring.
   */
  tone?: 'default' | 'onColor';
}

/**
 * A heading's explanation, on demand.
 *
 * Every page used to spend a row — often two — on a sentence that explains the heading and is read
 * once. That row, plus the tabs and the card header under it, is what left a third of a short
 * screen above the actual content. The sentence now lives here, one click away, and the heading
 * costs a single line.
 */
export function InfoHint({
  text,
  label = 'About this section',
  className = '',
  tone = 'default',
}: InfoHintProps) {
  const ring =
    tone === 'onColor'
      ? 'border-white/50 text-white/90 hover:border-white hover:text-white focus:ring-white'
      : 'border-surface-border text-surface-muted-fg hover:border-primary-400 hover:text-primary-600 focus:ring-primary-500';

  return (
    <Tooltip content={text} maxWidth="420px">
      <button
        type="button"
        aria-label={label}
        className={`
          inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full
          border transition-colors
          focus:outline-none focus:ring-2
          ${ring}
          ${className}
        `}
      >
        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </Tooltip>
  );
}
