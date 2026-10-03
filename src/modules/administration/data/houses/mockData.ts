import { House, PointCategory, PointTransaction, TransactionType, TransactionStatus } from './types';

export const initialMockHouses: House[] = [
  {
    id: 'HOUS001',
    name: 'Unity',
    description: 'House of Unity - Strength through togetherness',
    color: '#6366f1',
    motto: 'Unity is Strength',
    patronTeacherId: 'STAFF001',
    patronTeacherName: 'Mr. James Wilson',
    captainId: 'STU001',
    captainName: 'Alice Johnson',
    viceCaptainId: 'STU002',
    viceCaptainName: 'Bob Smith',
    totalPoints: 1250,
    meritPoints: 1450,
    demeritPoints: 200,
    memberCount: 45,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-04-01T10:30:00Z',
  },
  {
    id: 'HOUS002',
    name: 'Courage',
    description: 'House of Courage - Brave in all endeavors',
    color: '#EF4444',
    motto: 'Fortune Favors the Brave',
    patronTeacherId: 'STAFF002',
    patronTeacherName: 'Ms. Sarah Chen',
    captainId: 'STU003',
    captainName: 'Charlie Brown',
    viceCaptainId: 'STU004',
    viceCaptainName: 'Diana Prince',
    totalPoints: 1180,
    meritPoints: 1380,
    demeritPoints: 200,
    memberCount: 42,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-04-01T10:30:00Z',
  },
  {
    id: 'HOUS003',
    name: 'Wisdom',
    description: 'House of Wisdom - Knowledge is power',
    color: '#10B981',
    motto: 'Knowledge is Power',
    patronTeacherId: 'STAFF003',
    patronTeacherName: 'Dr. Robert Kim',
    captainId: 'STU005',
    captainName: 'Eve Davis',
    viceCaptainId: 'STU006',
    viceCaptainName: 'Frank Miller',
    totalPoints: 1320,
    meritPoints: 1520,
    demeritPoints: 200,
    memberCount: 48,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-04-01T10:30:00Z',
  },
  {
    id: 'HOUS004',
    name: 'Excellence',
    description: 'House of Excellence - Strive for the best',
    color: '#F59E0B',
    motto: 'Excellence in All Things',
    patronTeacherId: 'STAFF004',
    patronTeacherName: 'Mrs. Grace Lee',
    captainId: 'STU007',
    captainName: 'George Harris',
    viceCaptainId: 'STU008',
    viceCaptainName: 'Hannah White',
    totalPoints: 1290,
    meritPoints: 1490,
    demeritPoints: 200,
    memberCount: 46,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-04-01T10:30:00Z',
  },
];

export const initialMockPointCategories: PointCategory[] = [
  { id: 'PCAT001', name: 'Academic Excellence', type: TransactionType.MERIT, defaultPoints: 10, description: 'Outstanding academic performance', requiresApproval: false, evidenceRequired: false, isActive: true },
  { id: 'PCAT002', name: 'Sports Achievement', type: TransactionType.MERIT, defaultPoints: 15, description: 'Excellence in sports competitions', requiresApproval: false, evidenceRequired: false, isActive: true },
  { id: 'PCAT003', name: 'Leadership', type: TransactionType.MERIT, defaultPoints: 12, description: 'Demonstrating leadership qualities', requiresApproval: true, approverRole: 'house_master', evidenceRequired: false, isActive: true },
  { id: 'PCAT004', name: 'Community Service', type: TransactionType.MERIT, defaultPoints: 8, description: 'Volunteering and community service', requiresApproval: false, evidenceRequired: true, isActive: true },
  { id: 'PCAT005', name: 'Good Behavior', type: TransactionType.MERIT, defaultPoints: 5, description: 'Consistently good behavior', requiresApproval: false, evidenceRequired: false, maxDailyAwards: 1, isActive: true },
  { id: 'PCAT006', name: 'Late Coming', type: TransactionType.DEMERIT, defaultPoints: -3, description: 'Arriving late to school or class', requiresApproval: false, evidenceRequired: false, isActive: true },
  { id: 'PCAT007', name: 'Uniform Violation', type: TransactionType.DEMERIT, defaultPoints: -2, description: 'Not wearing proper uniform', requiresApproval: false, evidenceRequired: false, isActive: true },
  { id: 'PCAT008', name: 'Misconduct', type: TransactionType.DEMERIT, defaultPoints: -10, description: 'Serious misconduct', requiresApproval: true, approverRole: 'administrator', evidenceRequired: true, isActive: true },
];

export const initialMockPointTransactions: PointTransaction[] = [
  { id: 'PTRX001', studentId: 'STU001', studentName: 'Alice Johnson', className: 'Grade 8A', houseId: 'HOUS001', houseName: 'Unity', categoryId: 'PCAT001', categoryName: 'Academic Excellence', type: TransactionType.MERIT, points: 10, reason: 'Scored highest marks in mathematics exam', status: TransactionStatus.APPROVED, awardedBy: 'STAFF001', awardedByName: 'Mr. James Wilson', awardedAt: '2024-03-15T10:00:00Z' },
  { id: 'PTRX002', studentId: 'STU003', studentName: 'Charlie Brown', className: 'Grade 8B', houseId: 'HOUS002', houseName: 'Courage', categoryId: 'PCAT002', categoryName: 'Sports Achievement', type: TransactionType.MERIT, points: 15, reason: 'Won inter-school athletics competition', status: TransactionStatus.APPROVED, awardedBy: 'STAFF002', awardedByName: 'Ms. Sarah Chen', awardedAt: '2024-03-20T14:00:00Z' },
  { id: 'PTRX003', studentId: 'STU005', studentName: 'Eve Davis', className: 'Grade 7A', houseId: 'HOUS003', houseName: 'Wisdom', categoryId: 'PCAT004', categoryName: 'Community Service', type: TransactionType.MERIT, points: 8, reason: 'Volunteered at local charity event', status: TransactionStatus.APPROVED, awardedBy: 'STAFF003', awardedByName: 'Dr. Robert Kim', awardedAt: '2024-03-22T09:00:00Z' },
  { id: 'PTRX004', studentId: 'STU007', studentName: 'George Harris', className: 'Grade 9A', houseId: 'HOUS004', houseName: 'Excellence', categoryId: 'PCAT006', categoryName: 'Late Coming', type: TransactionType.DEMERIT, points: 3, reason: 'Arrived 30 minutes late to school', status: TransactionStatus.APPROVED, awardedBy: 'STAFF004', awardedByName: 'Mrs. Grace Lee', awardedAt: '2024-03-25T08:30:00Z' },
  { id: 'PTRX005', studentId: 'STU002', studentName: 'Bob Smith', className: 'Grade 8A', houseId: 'HOUS001', houseName: 'Unity', categoryId: 'PCAT003', categoryName: 'Leadership', type: TransactionType.MERIT, points: 12, reason: 'Led house charity drive successfully', status: TransactionStatus.PENDING, awardedBy: 'STAFF001', awardedByName: 'Mr. James Wilson', awardedAt: '2024-03-28T11:00:00Z' },
];

// -- Seedable exports ---------------------------------------------
// Non-'initialMock*' aliases are picked up by seedProviderWithDemoData
// (demoDataSeed.ts) and inserted into the real database collections.
export const houses = initialMockHouses;
export const pointCategories = initialMockPointCategories;
export const pointTransactions = initialMockPointTransactions;
