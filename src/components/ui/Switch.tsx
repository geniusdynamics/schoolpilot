// ABOUTME: Premium toggle switch with token-based theming and smooth knob animation

import React, { useId } from 'react';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  /** Receives the new checked state. */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Accessible name when no visible label is provided. */
  'aria-label'?: string;
  label?: React.ReactNode;
  description?: string;
  id?: string;
  name?: string;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel,
  label,
  description,
  id,
  name,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  // Literal classes only — Tailwind's JIT must see every variant in source.
  // The knob is the track's ::after pseudo-element, hence the after: prefixes.
  const trackSize = size === 'sm' ? 'h-[18px] w-8' : 'h-[22px] w-10';
  const knobSize = size === 'sm' ? 'after:h-3 after:w-3' : 'after:h-4 after:w-4';
  const knobShift = size === 'sm'
    ? 'peer-checked:after:translate-x-[14px]'
    : 'peer-checked:after:translate-x-[18px]';

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-2.5 select-none ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          aria-label={!label ? ariaLabel : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`
            relative inline-flex flex-shrink-0 items-center rounded-full bg-surface-input
            transition-colors duration-200
            after:absolute after:left-[2px] after:top-1/2 after:-translate-y-1/2
            after:rounded-full after:bg-surface-card after:shadow
            after:transition-transform after:duration-200 after:ease-out
            ${trackSize} ${knobSize} ${knobShift}
            peer-checked:bg-primary-600
            peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-500/30
          `}
        />
        {(label || description) && (
          <span className="flex flex-col">
            {label && <span className="text-sm font-medium text-surface-foreground">{label}</span>}
            {description && <span className="mt-0.5 text-xs text-surface-muted-fg">{description}</span>}
          </span>
        )}
      </label>
    </div>
  );
};

export default Switch;
