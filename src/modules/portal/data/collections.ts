// ABOUTME: Exports collections for the Portal module
// ABOUTME: 'announcements' is portal-owned; other portal views read from existing collections

import * as schemas from './schema';

export const portalCollections = {
  announcements: {
    schema: schemas.announcementSchema,
  },
};

export type PortalCollections = typeof portalCollections;
