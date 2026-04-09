import { 
  createDatabaseSchema, 
  SchemaHelpers,
  type DatabaseSchema, 
} from '@/utils/databaseAgnosticSchema';

// Houses schema - for school house system (like Gryffindor, Slytherin, etc.)
export const housesSchema: DatabaseSchema = createDatabaseSchema({
  title: 'houses',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ maxLength: 100 }),
    name: SchemaHelpers.string({ maxLength: 200 }),
    description: SchemaHelpers.string({ maxLength: 500, nullable: true }),
    color: SchemaHelpers.string({ maxLength: 50 }),
    motto: SchemaHelpers.string({ maxLength: 500, nullable: true }),
    patronTeacherId: SchemaHelpers.string({ maxLength: 100, nullable: true }),
    patronTeacherName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    captainId: SchemaHelpers.string({ maxLength: 100, nullable: true }),
    captainName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    viceCaptainId: SchemaHelpers.string({ maxLength: 100, nullable: true }),
    viceCaptainName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    totalPoints: SchemaHelpers.number({ default: 0 }),
    meritPoints: SchemaHelpers.number({ default: 0 }),
    demeritPoints: SchemaHelpers.number({ default: 0 }),
    memberCount: SchemaHelpers.number({ default: 0 }),
    createdAt: SchemaHelpers.timestamp(),
    updatedAt: SchemaHelpers.timestamp(),
  },
  required: ['id', 'name', 'color', 'totalPoints', 'meritPoints', 'demeritPoints', 'memberCount', 'createdAt', 'updatedAt'],
  indexes: ['name', 'createdAt'],
});

// Point categories schema - defines types of points that can be awarded (merit/demerit)
export const pointCategoriesSchema: DatabaseSchema = createDatabaseSchema({
  title: 'point_categories',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ maxLength: 100 }),
    name: SchemaHelpers.string({ maxLength: 200 }),
    type: SchemaHelpers.string({ enum: ['merit', 'demerit'], maxLength: 50 }),
    defaultPoints: SchemaHelpers.number({ default: 1 }),
    description: SchemaHelpers.string({ maxLength: 500, nullable: true }),
    requiresApproval: SchemaHelpers.boolean({ default: false }),
    approverRole: SchemaHelpers.string({ maxLength: 100, nullable: true }),
    evidenceRequired: SchemaHelpers.boolean({ default: false }),
    maxDailyAwards: SchemaHelpers.number({ nullable: true }),
    isActive: SchemaHelpers.boolean({ default: true }),
  },
  required: ['id', 'name', 'type', 'defaultPoints', 'requiresApproval', 'evidenceRequired', 'isActive'],
  indexes: ['name', 'type', 'isActive'],
});

// Point transactions schema - records points awarded/deducted from students
export const pointTransactionsSchema: DatabaseSchema = createDatabaseSchema({
  title: 'point_transactions',
  primaryKey: 'id',
  properties: {
    id: SchemaHelpers.string({ maxLength: 100 }),
    studentId: SchemaHelpers.string({ maxLength: 100 }),
    studentName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    className: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    houseId: SchemaHelpers.string({ maxLength: 100 }),
    houseName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    categoryId: SchemaHelpers.string({ maxLength: 100 }),
    categoryName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    type: SchemaHelpers.string({ enum: ['merit', 'demerit'], maxLength: 50 }),
    points: SchemaHelpers.number(),
    reason: SchemaHelpers.string({ maxLength: 1000 }),
    eventName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    eventId: SchemaHelpers.string({ maxLength: 100, nullable: true }),
    evidenceUrl: SchemaHelpers.string({ maxLength: 500, nullable: true }),
    evidenceDescription: SchemaHelpers.string({ maxLength: 500, nullable: true }),
    status: SchemaHelpers.string({ enum: ['pending', 'approved', 'rejected'], default: 'approved', maxLength: 50 }),
    approvedBy: SchemaHelpers.string({ maxLength: 100, nullable: true }),
    approvedAt: SchemaHelpers.timestamp({ nullable: true }),
    awardedBy: SchemaHelpers.string({ maxLength: 100 }),
    awardedByName: SchemaHelpers.string({ maxLength: 200, nullable: true }),
    awardedAt: SchemaHelpers.timestamp(),
  },
  required: ['id', 'studentId', 'houseId', 'categoryId', 'type', 'points', 'reason', 'status', 'awardedBy', 'awardedAt'],
  indexes: ['studentId', 'houseId', 'categoryId', 'type', 'status', 'awardedAt'],
});

// Export collections in the format expected by collections.ts
export const housesCollections: Record<string, { schema: DatabaseSchema }> = {
  houses: { schema: housesSchema },
  point_categories: { schema: pointCategoriesSchema },
  point_transactions: { schema: pointTransactionsSchema },
};
