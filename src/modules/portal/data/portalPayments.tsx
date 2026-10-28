// ABOUTME: The payment provider a portal pay action may use, handed down by whatever configures the
// ABOUTME: school's provider. The default is none, so the fees page says so rather than failing silently.

import { createContext, useContext, type ReactNode } from 'react';

import type { PaymentProvider } from '@/domain/finance/payments/providers/types';

/** What the portal needs to request a payment: the provider, and where its callbacks land. */
export interface PortalPayments {
  readonly provider: PaymentProvider | null;
  readonly callbackUrl: string;
}

const NO_PROVIDER: PortalPayments = { provider: null, callbackUrl: '' };

const PortalPaymentsContext = createContext<PortalPayments>(NO_PROVIDER);

/**
 * Supplies the school's payment provider to the portal.
 *
 * A deployment that configures a provider mounts this around the portal; nothing in the portal
 * invents one, and the fees page shows the not-configured state when none is mounted.
 */
export const PortalPaymentsProvider: React.FC<{
  readonly payments: PortalPayments;
  readonly children: ReactNode;
}> = ({ payments, children }) => (
  <PortalPaymentsContext.Provider value={payments}>{children}</PortalPaymentsContext.Provider>
);

/** The payment configuration in force, or the empty one when the portal was mounted without it. */
export function usePortalPayments(): PortalPayments {
  return useContext(PortalPaymentsContext);
}
