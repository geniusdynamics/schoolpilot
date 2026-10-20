// ABOUTME: Defines the RxDB collection configurations for alumni management
// ABOUTME: Imported by the central rxdbService to register alumni collections

import * as alumniSchemas from './alumniSchema';

export const alumniCollections = {
  alumni_records: {
    schema: alumniSchemas.alumniRecordSchema,
  },
  alumni_engagements: {
    schema: alumniSchemas.alumniEngagementSchema,
  },
  alumni_donations: {
    schema: alumniSchemas.alumniDonationSchema,
  },
  alumni_events: {
    schema: alumniSchemas.alumniEventSchema,
  },
};

export type AlumniCollections = typeof alumniCollections;
