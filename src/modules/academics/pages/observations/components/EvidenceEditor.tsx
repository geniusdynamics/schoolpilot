// ABOUTME: The evidence note attached to one observation cell: free text bounded by the entity's
// ABOUTME: 2000-character limit, editable, and written with the observation on save.

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';

import { EVIDENCE_MAX_LENGTH } from '../data/draft';

export interface EvidenceTarget {
  readonly cellKey: string;
  readonly learnerName: string;
  readonly targetLabel: string;
  /** The note that was there when the editor opened, restored by Cancel. */
  readonly originalValue: string;
}

export interface EvidenceEditorProps {
  readonly target: EvidenceTarget;
  /** The draft note when one is pending, otherwise the saved note. */
  readonly initialValue: string;
  /** Called on every keystroke so an in-progress note survives a navigation or a reload. */
  readonly onDraftChange: (cellKey: string, evidence: string) => void;
  readonly onSave: (cellKey: string, evidence: string) => void;
  readonly onClose: () => void;
}

export const EvidenceEditor: React.FC<EvidenceEditorProps> = ({
  target,
  initialValue,
  onDraftChange,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation('academics');
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(initialValue);
    setError('');
  }, [target.cellKey, initialValue]);

  const save = () => {
    if (value.length > EVIDENCE_MAX_LENGTH) {
      setError(
        t('observations.evidenceTooLong', 'Keep the note to {{max}} characters or fewer.', {
          max: EVIDENCE_MAX_LENGTH,
        })
      );
      return;
    }
    onSave(target.cellKey, value);
    onClose();
  };

  return (
    <section
      data-testid="evidence-editor"
      aria-labelledby="observation-evidence-heading"
      className="rounded-lg border border-surface-border bg-surface p-4"
    >
      <h3 id="observation-evidence-heading" className="text-sm font-semibold text-surface-foreground">
        {t('observations.evidenceFor', 'Evidence for {{learner}} · {{target}}', {
          learner: target.learnerName,
          target: target.targetLabel,
        })}
      </h3>
      <label htmlFor="observation-evidence" className="mt-3 block text-sm font-medium text-surface-foreground">
        {t('observations.evidenceNote', 'Evidence note')}
      </label>
      <textarea
        id="observation-evidence"
        className="mt-1 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        rows={4}
        maxLength={EVIDENCE_MAX_LENGTH}
        value={value}
        autoFocus
        onChange={(event) => {
          setValue(event.target.value);
          onDraftChange(target.cellKey, event.target.value);
          if (error) setError('');
        }}
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-surface-muted-fg">
        <span>
          {t('observations.evidenceHint', 'What did you see or hear? It travels with the observation.')}
        </span>
        <span aria-live="polite">
          {value.length} / {EVIDENCE_MAX_LENGTH}
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="lg" onClick={save}>
          {t('observations.saveEvidence', 'Save evidence')}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => {
          onDraftChange(target.cellKey, target.originalValue);
          onClose();
        }}>
          {t('observations.cancel', 'Cancel')}
        </Button>
      </div>
    </section>
  );
};

export default EvidenceEditor;
