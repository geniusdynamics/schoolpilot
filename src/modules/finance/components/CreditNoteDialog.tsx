// ABOUTME: The credit-note dialog: the canonical correction for a charge. It is used by the fee
// ABOUTME: adjustments page and offered beside every posted invoice, never as an edit of that invoice.

import React, { useMemo, useState } from 'react';

import Modal from '@/components/ui/Modal';
import { SchemaEntityForm } from '@/components/ui/forms';
import { createSchemaFor, type CreateInput } from '@/data/repository';
import { useToast } from '@/hooks/useToast';
import type { Money } from '@/domain/schema/common';

import { money, toFormLookup, useCanonicalFinance, useFinanceRepository } from '../data/canonicalFinance';
import { nextDocumentNumber } from '../services/canonicalFinanceService';

const CURRENCY = 'KES';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface CreditNoteDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly learnerId?: string;
  readonly invoiceId?: string;
  readonly amount?: Money;
}

/** Raises a draft credit note for a learner, optionally against one invoice. */
export const CreditNoteDialog: React.FC<CreditNoteDialogProps> = ({
  isOpen,
  onClose,
  learnerId,
  invoiceId,
  amount,
}) => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const { showSuccess } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const number = useMemo(
    () => nextDocumentNumber('CNT', finance.creditNotes.map((note) => note.number)),
    [finance.creditNotes]
  );

  const defaultLearner = learnerId ?? finance.learners[0]?.id ?? '';

  const save = async (values: Record<string, unknown>) => {
    setFormError(null);
    try {
      const selectedLearner = values.learner_id;
      if (typeof selectedLearner !== 'string' || !selectedLearner) {
        throw new Error('Select the learner the credit note belongs to.');
      }
      const learner = finance.learners.find((row) => row.id === selectedLearner);
      if (!learner) throw new Error('The selected learner no longer exists.');
      const input: CreateInput<'credit_note'> = {
        ...(values as unknown as CreateInput<'credit_note'>),
        institution_id: learner.institution_id,
        number,
        learner_id: learner.id,
        status: 'draft',
      };
      await repository.create('credit_note', input);
      showSuccess(`Credit note ${number} raised as a draft.`);
      onClose();
    } catch (error) {
      setFormError(errorMessage(error));
      throw error;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise credit note" size="lg">
      <SchemaEntityForm
        schema={createSchemaFor('credit_note')}
        recordKey={`credit-note-${learnerId ?? 'new'}-${invoiceId ?? ''}`}
        initialValues={{
          institution_id: finance.learners[0]?.institution_id ?? '',
          number,
          learner_id: defaultLearner,
          ...(invoiceId ? { invoice_id: invoiceId } : {}),
          amount: amount ?? money(0, CURRENCY),
          reason: '',
          issue_date: new Date().toISOString().slice(0, 10),
          status: 'draft' as const,
        }}
        fields={[
          {
            path: 'learner_id',
            label: 'Learner',
            order: 1,
            widget: 'entity',
            lookupKey: 'learner',
            required: true,
          },
          {
            path: 'invoice_id',
            label: 'Invoice (optional)',
            order: 2,
            widget: 'entity',
            lookupKey: 'invoice',
          },
          {
            path: 'amount',
            label: 'Amount',
            order: 3,
            widget: 'money',
            required: true,
            currency: CURRENCY,
          },
          { path: 'reason', label: 'Reason', order: 4, widget: 'textarea', required: true },
          { path: 'issue_date', label: 'Issue date', order: 5, widget: 'date', required: true },
        ]}
        lookups={{
          learner: toFormLookup(finance.lookups.learner),
          invoice: toFormLookup(finance.lookups.invoice),
        }}
        serverError={formError}
        submitLabel="Raise credit note"
        onCancel={onClose}
        onSubmit={save}
      />
    </Modal>
  );
};

export default CreditNoteDialog;
