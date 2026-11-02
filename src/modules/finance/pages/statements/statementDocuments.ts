// ABOUTME: The documents a statement movement names, resolved from the canonical rows so the page
// ABOUTME: prints receipt, invoice and credit-note numbers instead of internal ids.

import { CHANNEL_LABELS, type PaymentChannel } from '@/domain/finance/payments';

/** What a statement movement carries: its kind, its source document and its ledger memo. */
export interface StatementMovementDocument {
  readonly kind: string;
  readonly source: {
    readonly kind: string;
    readonly id: string;
    readonly number?: string;
  };
  readonly description: string;
}

/** The canonical rows a movement's document number is read from. */
export interface StatementDocumentLookup {
  readonly invoiceNumberById: ReadonlyMap<string, string>;
  readonly receiptNumberByPaymentId: ReadonlyMap<string, string>;
  readonly paymentById: ReadonlyMap<
    string,
    { readonly channel: string; readonly reference: string }
  >;
  readonly creditNoteNumberById: ReadonlyMap<string, string>;
  readonly refundNumberById: ReadonlyMap<string, string>;
}

/** What the page prints in the movement's document and description columns. */
export interface ResolvedMovementDocument {
  readonly document: string;
  readonly description: string;
}

const NONE = '\u2014';

/** The channel in words, or the stored value when it is one the module does not label. */
function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel as PaymentChannel] ?? channel;
}

/** An internal UUIDv7-style id, which a page must never print. */
function looksLikeInternalId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** The invoice an allocation memo names, when the memo was written with its id. */
function allocatedInvoiceId(description: string): string | null {
  const match = /^allocated to invoice (.+)$/i.exec(description.trim());
  return match ? (match[1] as string) : null;
}

/**
 * Resolves one movement to the numbers a person recognises.
 *
 * A payment movement shows its receipt number and channel; an allocation shows the invoice number
 * it settled; an invoice, credit note or refund shows its own number. An internal id is never
 * printed: when no document number can be resolved the page shows a dash instead.
 */
export function resolveStatementDocument(
  movement: StatementMovementDocument,
  lookup: StatementDocumentLookup
): ResolvedMovementDocument {
  const { source } = movement;

  if (source.kind === 'payment') {
    const payment = lookup.paymentById.get(source.id);
    const receipt =
      lookup.receiptNumberByPaymentId.get(source.id) || source.number || payment?.reference || '';

    if (movement.kind === 'credit') {
      return {
        document: receipt || NONE,
        description: payment
          ? `Unallocated credit · ${channelLabel(payment.channel)}`
          : 'Unallocated credit',
      };
    }

    if (movement.kind === 'allocation') {
      const settledId = allocatedInvoiceId(movement.description);
      const resolvedSettled = settledId ? lookup.invoiceNumberById.get(settledId) : undefined;
      const settled =
        resolvedSettled ?? (settledId && !looksLikeInternalId(settledId) ? settledId : null);
      const base = settled ? `Allocated to invoice ${settled}` : 'Allocated to invoice';
      return {
        document: receipt || NONE,
        description: payment ? `${base} · ${channelLabel(payment.channel)}` : base,
      };
    }

    return {
      document: receipt || NONE,
      description: payment
        ? `${movement.description} · ${channelLabel(payment.channel)}`
        : movement.description,
    };
  }

  if (source.kind === 'invoice') {
    return {
      document: source.number || lookup.invoiceNumberById.get(source.id) || NONE,
      description: movement.description,
    };
  }

  if (source.kind === 'credit_note') {
    return {
      document:
        source.number || lookup.creditNoteNumberById.get(source.id) || NONE,
      description: movement.description,
    };
  }

  if (source.kind === 'refund') {
    return {
      document: source.number || lookup.refundNumberById.get(source.id) || NONE,
      description: movement.description,
    };
  }

  if (source.kind === 'opening_balance') {
    return {
      document: source.number || 'Opening balance',
      description: movement.description,
    };
  }

  return { document: source.number || NONE, description: movement.description };
}
