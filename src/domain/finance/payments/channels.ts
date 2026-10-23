// ABOUTME: The payment channels of spec 05 §5.1: the canonical six, their labels, which of them the
// ABOUTME: drawer holds as cash, and which need a slip or provider reference with them.

import { PAYMENT_CHANNELS } from '@/domain/schema';

import type { PaymentChannel } from './types';

/** The six channels a payment arrives through. The canonical list, not a second vocabulary. */
export const PAYMENT_CHANNEL_VALUES = PAYMENT_CHANNELS;

/** The label a channel renders as. */
export const CHANNEL_LABELS: Readonly<Record<PaymentChannel, string>> = {
  cash: 'Cash',
  bank_deposit: 'Bank deposit / transfer',
  cheque: 'Cheque',
  mobile_money: 'Mobile money',
  card: 'Card',
  in_kind: 'In-kind',
};

/**
 * The channels whose money sits in the cashier's drawer.
 *
 * Only cash does. A cheque is a promise until it clears, a mobile-money or card payment settles
 * into its own clearing account, and an in-kind payment is goods. Counting any of them as cash
 * would make the drawer's reconciliation a fiction, so the reconciliation counts the cash channel
 * and reports every other channel beside it.
 */
export const CASH_CHANNELS: readonly PaymentChannel[] = ['cash'];

/**
 * The channels that carry a slip, a cheque number or a provider transaction id.
 *
 * A cash payment needs no reference; everything else arrives with one, and the receipt prints it
 * (spec 05 §5.2: "channel and reference").
 */
export const REFERENCED_CHANNELS: readonly PaymentChannel[] = [
  'bank_deposit',
  'cheque',
  'mobile_money',
  'card',
  'in_kind',
];

/** True when `value` is one of the six channels. */
export function isPaymentChannel(value: unknown): value is PaymentChannel {
  return typeof value === 'string' && (PAYMENT_CHANNELS as readonly string[]).includes(value);
}

/** True when the channel's money is counted in the drawer. */
export function isCashChannel(channel: PaymentChannel): boolean {
  return CASH_CHANNELS.includes(channel);
}

/** True when a payment of the channel must carry a reference. */
export function requiresReference(channel: PaymentChannel): boolean {
  return REFERENCED_CHANNELS.includes(channel);
}

/** The label of a channel, falling back to the raw value for a row written before this vocabulary. */
export function channelLabel(channel: PaymentChannel | string): string {
  return isPaymentChannel(channel) ? CHANNEL_LABELS[channel] : String(channel);
}
