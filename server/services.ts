// ABOUTME: Builds the domain services the hub serves from one repository, exactly as the browser
// ABOUTME: builds them: same constructors, same interface, no server-side fork of the domain layer.

import type { Repository } from '@/data/repository';
import { BillingRunService } from '@/domain/finance/billing';
import { AdmissionService, AttendanceService } from '@/domain/services';

export interface HubServices {
  readonly repository: Repository;
  /** The actor the service writes are stamped with when the request does not name one. */
  readonly actor?: string;
  /** The clock; injectable so a test pins what a registration stamps. */
  readonly now?: () => Date;
}

/**
 * The admission service of the hub.
 *
 * The constructor is the browser's constructor: the repository is the only dependency, so the
 * service runs here without a single change to its code.
 */
export function admissionServiceOf(services: HubServices): AdmissionService {
  return new AdmissionService({
    repository: services.repository,
    ...(services.actor !== undefined ? { actor: services.actor } : {}),
    ...(services.now !== undefined ? { now: services.now } : {}),
  });
}

/** The attendance service of the hub, built the same way. */
export function attendanceServiceOf(services: HubServices): AttendanceService {
  return new AttendanceService({
    repository: services.repository,
    ...(services.actor !== undefined ? { actor: services.actor } : {}),
    ...(services.now !== undefined ? { now: services.now } : {}),
  });
}

/**
 * The billing-run service of the hub.
 *
 * Its store is the canonical repository itself: the `BillingRunStore` the service declares is
 * the repository's own get, list, create and transaction, so a billing run posts server-side
 * through the same code path the browser uses.
 */
export function billingRunServiceOf(services: HubServices): BillingRunService {
  return new BillingRunService({
    store: services.repository,
    ...(services.actor !== undefined ? { actor: services.actor } : {}),
    ...(services.now !== undefined ? { now: services.now } : {}),
  });
}
