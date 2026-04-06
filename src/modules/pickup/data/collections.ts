// ABOUTME: Defines the database collection configurations for the Pickup module
// ABOUTME: This structure is imported by the central rxdbService to add module-specific collections

import * as schemas from './schema';

export const pickupCollections = {
  pickup_codes: {
    schema: schemas.pickupCodeSchema,
  },
  authorized_persons: {
    schema: schemas.authorizedPersonSchema,
  },
  student_authorizations: {
    schema: schemas.studentAuthorizationSchema,
  },
  pickup_logs: {
    schema: schemas.pickupLogSchema,
  },
};

export type PickupCollections = typeof pickupCollections;
