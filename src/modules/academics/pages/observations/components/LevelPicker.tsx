// ABOUTME: The level control for one observation cell. A native select in the wide matrix and a
// ABOUTME: 44 px button group in the narrow layout, both offering only the pack's rubric levels.

import React from 'react';
import { useTranslation } from 'react-i18next';

import type { ObservationLevel } from '../data/pack';

export interface LevelPickerProps {
  readonly levels: readonly ObservationLevel[];
  /** The level the cell currently shows, or an empty string for no observation. */
  readonly value: string;
  /** The saved level, or null when the cell has never been observed. */
  readonly savedValue: string | null;
  /** The accessible name of the control. */
  readonly label: string;
  readonly variant: 'select' | 'buttons';
  readonly onChange: (code: string) => void;
  readonly onClear: () => void;
}

const fieldClass =
  'w-full min-h-[44px] rounded-md border border-surface-border bg-surface px-2 py-2 text-sm text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

export const LevelPicker: React.FC<LevelPickerProps> = ({
  levels,
  value,
  savedValue,
  label,
  variant,
  onChange,
  onClear,
}) => {
  const { t } = useTranslation('academics');
  const known = levels.some((level) => level.code === value);

  if (variant === 'select') {
    return (
      <select
        aria-label={label}
        className={fieldClass}
        value={known ? value : value === '' ? '' : value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === '') onClear();
          else onChange(next);
        }}
      >
        {savedValue === null ? (
          <option value="">{t('observations.notObserved', 'Not observed')}</option>
        ) : null}
        {!known && value !== '' ? (
          <option value={value}>{t('observations.unknownLevel', '{{code}} (not in the pack scale)', { code: value })}</option>
        ) : null}
        {levels.map((level) => (
          <option key={level.code} value={level.code}>
            {level.code} — {level.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
      {levels.map((level) => {
        const selected = value === level.code;
        return (
          <button
            key={level.code}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(level.code)}
            className={[
              'min-h-[44px] min-w-[44px] rounded-md border px-2 py-2 text-sm font-medium',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              selected
                ? 'border-primary-600 bg-primary-50 text-primary-800'
                : 'border-surface-border bg-surface text-surface-foreground',
            ].join(' ')}
          >
            <span className="block font-semibold">{level.code}</span>
            <span className="block text-xs font-normal">{level.label}</span>
          </button>
        );
      })}
      {savedValue === null ? (
        <button
          type="button"
          aria-pressed={value === ''}
          onClick={onClear}
          className={[
            'min-h-[44px] min-w-[44px] rounded-md border px-2 py-2 text-sm',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            value === ''
              ? 'border-surface-border bg-surface-accent text-surface-foreground'
              : 'border-surface-border bg-surface text-surface-muted-fg',
          ].join(' ')}
        >
          {t('observations.notObserved', 'Not observed')}
        </button>
      ) : null}
    </div>
  );
};

export default LevelPicker;
