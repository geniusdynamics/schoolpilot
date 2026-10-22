// ABOUTME: The setup wizard's pack selection: the packs the registry discovers, each with its country,
// ABOUTME: levels, locales and verification status, the calendar variant when a pack declares one, and
// ABOUTME: an honest note when a pack's curriculum content has not been reviewed.

import React from 'react';

import Badge from '@/components/ui/Badge';
import Checkbox from '@/components/ui/Checkbox';

import { hasCalendarVariants, type AvailablePack } from './packLibrary';

export interface PackSelectionProps {
  readonly packs: readonly AvailablePack[];
  /** The codes of the packs the school has chosen. */
  readonly selected: readonly string[];
  /** pack code → the calendar variant code the school chose. */
  readonly calendars: Readonly<Record<string, string>>;
  readonly onToggle: (code: string, selected: boolean) => void;
  readonly onCalendar: (packCode: string, variant: string) => void;
}

/** The verification badge and the sentence that must accompany an unreviewed pack. */
export const VerificationNotice: React.FC<{ readonly pack: AvailablePack }> = ({ pack }) => {
  const { status, verified_by: verifiedBy } = pack.verification;
  if (status === 'draft') {
    return (
      <span className="block text-xs text-amber-700 dark:text-amber-400" data-testid={`pack-draft-${pack.code}`}>
        Draft: the curriculum content has not been reviewed by a curriculum officer. You can pilot it, but treat it
        as unverified.
      </span>
    );
  }
  const label = status === 'verified' ? 'Verified' : 'Reviewed';
  return (
    <span className="block text-xs text-surface-muted-fg" data-testid={`pack-verified-${pack.code}`}>
      {label}
      {verifiedBy.length > 0 ? ` by ${verifiedBy.join(', ')}` : ''}.
    </span>
  );
};

/** The level span a pack offers, for the summary line. */
export function levelSpan(pack: AvailablePack): string {
  if (pack.levelNames.length === 0) return 'no levels';
  const first = pack.levelNames[0];
  const last = pack.levelNames[pack.levelNames.length - 1];
  return first === last ? first : `${first} to ${last}`;
}

/**
 * The packs a school can install.
 *
 * The list comes from the pack registry, never from a hard-coded menu, so a pack that is added
 * to the installation appears here. A school may run more than one pack: the choice is a set,
 * and each chosen pack becomes its own programme.
 */
export const PackSelection: React.FC<PackSelectionProps> = ({
  packs,
  selected,
  calendars,
  onToggle,
  onCalendar,
}) => {
  if (packs.length === 0) {
    return <p className="text-sm text-surface-muted-fg">No curriculum packs are installed.</p>;
  }

  return (
    <div className="space-y-3">
      {packs.map((pack) => {
        const chosen = selected.includes(pack.code);
        const variant = calendars[pack.code] ?? pack.defaultCalendar.code ?? '';
        return (
          <div
            key={pack.code}
            data-testid={`pack-card-${pack.code}`}
            className={`border rounded-lg p-4 transition-colors ${
              chosen ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-surface-border hover:bg-surface-muted'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={chosen}
                onChange={(next) => onToggle(pack.code, next)}
                aria-label={pack.name}
              />
              <span className="flex-1" data-testid={`pack-option-${pack.code}`}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-surface-foreground">{pack.name}</span>
                  <Badge variant="secondary">{pack.code}</Badge>
                  <Badge variant="secondary">{pack.country}</Badge>
                </span>
                <span className="block text-sm text-surface-muted-fg">
                  {pack.levels.length} level{pack.levels.length === 1 ? '' : 's'} ({levelSpan(pack)}) ·{' '}
                  {pack.learningAreas} learning areas · {pack.gradingScales} grading scale
                  {pack.gradingScales === 1 ? '' : 's'} · {pack.schemes} scheme{pack.schemes === 1 ? '' : 's'}
                </span>
                <span className="block text-xs text-surface-muted-fg">
                  {pack.locales.length > 0 ? `Languages: ${pack.locales.join(', ')}` : 'No locales declared'}
                  {pack.issuers.length > 0 ? ` · Issuer: ${pack.issuers.join(', ')}` : ''}
                </span>
                <VerificationNotice pack={pack} />
              </span>
            </label>

            {chosen && hasCalendarVariants(pack) && (
              <div className="mt-3 ml-9">
                <label className="block text-sm font-medium text-surface-foreground" htmlFor={`pack-calendar-${pack.code}`}>
                  Academic year variant
                </label>
                <select
                  id={`pack-calendar-${pack.code}`}
                  data-testid={`pack-calendar-${pack.code}`}
                  className="mt-1 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
                  value={variant}
                  onChange={(event) => onCalendar(pack.code, event.target.value)}
                >
                  {pack.calendars.map((calendar) => (
                    <option key={calendar.code ?? 'default'} value={calendar.code ?? ''}>
                      {calendar.name ?? calendar.code ?? 'Default'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-xs text-surface-muted-fg">
        Each chosen pack becomes its own programme. A school may run several, for example a primary and a secondary
        curriculum side by side.
      </p>
    </div>
  );
};

export default PackSelection;
