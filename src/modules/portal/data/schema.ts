// ABOUTME: Defines database-agnostic schemas for the Portal module
// ABOUTME: 'announcements' is portal-owned; other portal views read from existing collections

import {
  createDatabaseSchema,
  SchemaHelpers,
  type DatabaseSchema,
} from '@/utils/databaseAgnosticSchema';

// Property names intentionally mirror the PortalAnnouncement interface - documents
// are stored exactly as written by the portal (camelCase).
export const announcementSchema: DatabaseSchema = createDatabaseSchema({
  title: 'announcements',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.id({ description: 'Unique identifier' }),
    title: SchemaHelpers.string({ description: 'Announcement title', maxLength: 200 }),
    content: SchemaHelpers.string({ description: 'Announcement body', maxLength: 5000 }),
    priority: SchemaHelpers.string({
      description: 'Display priority',
      enum: ['low', 'medium', 'high', 'urgent'],
      maxLength: 20,
    }),
    audience: SchemaHelpers.string({
      description: 'Target audience',
      enum: ['all', 'students', 'parents', 'staff', 'specific_class'],
      maxLength: 30,
    }),
    targetClassId: { type: 'number', description: 'Class scoped to when audience is specific_class' },
    authorId: SchemaHelpers.string({ description: 'Author user id', maxLength: 100 }),
    authorName: SchemaHelpers.string({ description: 'Author display name (denormalized)', maxLength: 200 }),
    publishedAt: SchemaHelpers.timestamp({ description: 'Publication timestamp' }),
    expiresAt: SchemaHelpers.timestamp({ description: 'Expiry timestamp' }),
    isPublished: SchemaHelpers.boolean({ description: 'Whether visible to the audience' }),
    kind: SchemaHelpers.string({
      description: 'Announcement kind; a newsletter is printable and personalised',
      enum: ['announcement', 'newsletter'],
      maxLength: 20,
    }),
    eventId: SchemaHelpers.string({
      description: 'The school event a newsletter belongs to',
      nullable: true,
      maxLength: 100,
    }),
    alumniRelated: SchemaHelpers.boolean({
      description: 'Whether the newsletter or event concerns alumni',
    }),
    createdAt: SchemaHelpers.timestamp({ description: 'Creation timestamp' }),
    updatedAt: SchemaHelpers.timestamp({ description: 'Last update timestamp' }),
    readBy: SchemaHelpers.array(SchemaHelpers.string({ maxLength: 100 }), {
      description: 'Ids of users who have read this announcement',
    }),
    attachmentUrl: SchemaHelpers.string({ description: 'Optional attachment URL', maxLength: 500 }),
  },
  required: [
    'id',
    'title',
    'content',
    'priority',
    'audience',
    'authorId',
    'authorName',
    'publishedAt',
    'isPublished',
    'createdAt',
    'updatedAt',
  ],
  indexes: ['audience', 'priority', 'publishedAt'],
});
