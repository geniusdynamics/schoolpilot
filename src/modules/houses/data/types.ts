export enum TransactionType {
  MERIT = 'merit',
  DEMERIT = 'demerit'
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface House {
  id: string;
  name: string;
  description?: string;
  color: string;
  motto?: string;
  patronTeacherId?: string;
  patronTeacherName?: string;
  captainId?: string;
  captainName?: string;
  viceCaptainId?: string;
  viceCaptainName?: string;
  totalPoints: number;
  meritPoints: number;
  demeritPoints: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PointCategory {
  id: string;
  name: string;
  type: TransactionType;
  defaultPoints: number;
  description?: string;
  requiresApproval: boolean;
  approverRole?: string;
  evidenceRequired: boolean;
  maxDailyAwards?: number;
  isActive: boolean;
}

export interface PointTransaction {
  id: string;
  studentId: string;
  studentName?: string;
  className?: string;
  houseId: string;
  houseName?: string;
  categoryId: string;
  categoryName?: string;
  type: TransactionType;
  points: number;
  reason: string;
  eventName?: string;
  eventId?: string;
  evidenceUrl?: string;
  evidenceDescription?: string;
  status: TransactionStatus;
  approvedBy?: string;
  approvedAt?: string;
  awardedBy: string;
  awardedByName?: string;
  awardedAt: string;
}

export interface StudentPointSummary {
  studentId: string;
  studentName: string;
  houseId: string;
  houseName?: string;
  className?: string;
  totalPoints: number;
  meritPoints: number;
  demeritPoints: number;
  netPoints: number;
  classRank?: number;
  houseRank?: number;
  overallRank?: number;
  recentTransactions: PointTransaction[];
}

export interface HouseLeaderboardEntry {
  houseId: string;
  houseName: string;
  color: string;
  totalPoints: number;
  meritPoints: number;
  demeritPoints: number;
  memberCount: number;
  rank: number;
}
