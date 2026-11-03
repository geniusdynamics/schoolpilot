// ABOUTME: The form a school uses to create or edit a grading scale of its own: the identity
// ABOUTME: fields plus the bands, validated with the same rules the canonical schema enforces.

import React, { useState } from 'react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { GRADING_SCALE_KINDS } from '@/domain/schema/assessment';
import type { GradingScaleBand } from '@/domain/schema/assessment';

import type { GradingScaleRow, ProgrammeRow } from '../../data/useCanonicalAcademics';

export type GradingScaleKind = (typeof GRADING_SCALE_KINDS)[number];

/** The values the form submits; the tab turns them into a create or an update. */
export interface GradingScaleDraft {
  readonly programme_id: string;
  readonly code: string;
  readonly kind: GradingScaleKind;
  readonly version: string;
  readonly bands: readonly GradingScaleBand[];
}

interface BandDraft {
  code: string;
  label: string;
  min: string;
  max: string;
  points: string;
  descriptor: string;
}

const DUPLICATE_SCALE_CODE =
  'A grading scale with this code already exists for this programme and version.';

export interface GradingScaleFormProps {
  readonly programmes: readonly ProgrammeRow[];
  readonly scales: readonly GradingScaleRow[];
  readonly initial: GradingScaleRow | null;
  readonly onSubmit: (draft: GradingScaleDraft) => Promise<void>;
  readonly onCancel: () => void;
}

function blankBand(): BandDraft {
  return { code: '', label: '', min: '', max: '', points: '', descriptor: '' };
}

function bandDraftOf(band: GradingScaleBand): BandDraft {
  return {
    code: band.code,
    label: band.label,
    min: String(band.min),
    max: String(band.max),
    points: band.points === undefined ? '' : String(band.points),
    descriptor: band.descriptor ?? '',
  };
}

function numberOrNull(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** The first rule the draft breaks, in the schema's own terms. */
function validateScaleDraft(
  draft: GradingScaleDraft,
  bands: readonly BandDraft[],
  scales: readonly GradingScaleRow[],
  editingId: string | null
): string | null {
  if (!draft.programme_id) return 'Choose the programme this scale belongs to.';
  if (!draft.code.trim()) return 'Enter the scale code.';
  if (!draft.version.trim()) return 'Enter the scale version.';
  if (draft.bands.length === 0) return 'Add at least one band.';

  for (const [index, band] of bands.entries()) {
    const position = index + 1;
    if (!band.code.trim() || !band.label.trim()) {
      return `Band ${position} needs a code and a label.`;
    }
    const min = numberOrNull(band.min);
    const max = numberOrNull(band.max);
    if (min === null || max === null) {
      return `Band ${position} needs a numeric minimum and maximum.`;
    }
    if (min > max) return `Band ${position} has a minimum above its maximum.`;
  }

  const duplicate = scales.some(
    (scale) =>
      scale.id !== editingId &&
      scale.programme_id === draft.programme_id &&
      scale.code === draft.code.trim() &&
      scale.version === draft.version.trim()
  );
  if (duplicate) return DUPLICATE_SCALE_CODE;

  return null;
}

export const GradingScaleForm: React.FC<GradingScaleFormProps> = ({
  programmes,
  scales,
  initial,
  onSubmit,
  onCancel,
}) => {
  const [programmeId, setProgrammeId] = useState(initial?.programme_id ?? programmes[0]?.id ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [kind, setKind] = useState<GradingScaleKind>(initial?.kind ?? 'numeric_bands');
  const [version, setVersion] = useState(initial?.version ?? '1');
  const [bands, setBands] = useState<BandDraft[]>(() =>
    initial ? initial.bands.map(bandDraftOf) : [blankBand()]
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changeBand = (index: number, patch: Partial<BandDraft>) => {
    setBands((current) =>
      current.map((band, position) => (position === index ? { ...band, ...patch } : band))
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const draft: GradingScaleDraft = {
      programme_id: programmeId,
      code: code.trim(),
      kind,
      version: version.trim(),
      bands: bands.map((band) => {
        const points = numberOrNull(band.points);
        return {
          code: band.code.trim(),
          label: band.label.trim(),
          min: Number(band.min),
          max: Number(band.max),
          ...(points === null ? {} : { points }),
          ...(band.descriptor.trim() === '' ? {} : { descriptor: band.descriptor.trim() }),
        };
      }),
    };

    const refusal = validateScaleDraft(draft, bands, scales, initial?.id ?? null);
    if (refusal !== null) {
      setError(refusal);
      return;
    }

    setBusy(true);
    try {
      await onSubmit(draft);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The grading scale could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-surface-foreground">Programme</span>
          <select
            aria-label="Programme"
            className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
            value={programmeId}
            onChange={(event) => setProgrammeId(event.target.value)}
            disabled={busy}
          >
            <option value="">Choose a programme…</option>
            {programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.name}
              </option>
            ))}
          </select>
        </label>

        <Input
          name="grading-scale-code"
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={busy}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-surface-foreground">Kind</span>
          <select
            aria-label="Kind"
            className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
            value={kind}
            onChange={(event) => setKind(event.target.value as GradingScaleKind)}
            disabled={busy}
          >
            {GRADING_SCALE_KINDS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <Input
          name="grading-scale-version"
          label="Version"
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          disabled={busy}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-surface-foreground">Bands</legend>
        {bands.map((band, index) => (
          <div
            key={`${index}-${bands.length}`}
            className="grid grid-cols-2 items-end gap-2 rounded-md border border-surface-border p-2 md:grid-cols-6"
          >
            <input
              aria-label={`Band ${index + 1} code`}
              placeholder="Code"
              className="rounded-md border border-surface-border bg-surface px-2 py-1 text-sm"
              value={band.code}
              onChange={(event) => changeBand(index, { code: event.target.value })}
              disabled={busy}
            />
            <input
              aria-label={`Band ${index + 1} label`}
              placeholder="Label"
              className="rounded-md border border-surface-border bg-surface px-2 py-1 text-sm"
              value={band.label}
              onChange={(event) => changeBand(index, { label: event.target.value })}
              disabled={busy}
            />
            <input
              aria-label={`Band ${index + 1} minimum`}
              placeholder="Min"
              type="number"
              className="rounded-md border border-surface-border bg-surface px-2 py-1 text-sm"
              value={band.min}
              onChange={(event) => changeBand(index, { min: event.target.value })}
              disabled={busy}
            />
            <input
              aria-label={`Band ${index + 1} maximum`}
              placeholder="Max"
              type="number"
              className="rounded-md border border-surface-border bg-surface px-2 py-1 text-sm"
              value={band.max}
              onChange={(event) => changeBand(index, { max: event.target.value })}
              disabled={busy}
            />
            <input
              aria-label={`Band ${index + 1} points`}
              placeholder="Points"
              type="number"
              className="rounded-md border border-surface-border bg-surface px-2 py-1 text-sm"
              value={band.points}
              onChange={(event) => changeBand(index, { points: event.target.value })}
              disabled={busy}
            />
            <div className="flex gap-2">
              <input
                aria-label={`Band ${index + 1} descriptor`}
                placeholder="Descriptor"
                className="min-w-0 flex-1 rounded-md border border-surface-border bg-surface px-2 py-1 text-sm"
                value={band.descriptor}
                onChange={(event) => changeBand(index, { descriptor: event.target.value })}
                disabled={busy}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove band ${index + 1}`}
                disabled={busy || bands.length === 1}
                onClick={() => setBands((current) => current.filter((_, position) => position !== index))}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => setBands((current) => [...current, blankBand()])}
        >
          Add band
        </Button>
      </fieldset>

      {error !== null && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-surface-border pt-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy}>
          {initial ? 'Save grading scale' : 'Create grading scale'}
        </Button>
      </div>
    </form>
  );
};
