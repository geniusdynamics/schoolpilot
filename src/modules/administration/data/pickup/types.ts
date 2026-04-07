// ABOUTME: TypeScript interfaces for the Pickup module

// --- Pickup Code Status Enum ---

export enum PickupCodeStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  USED = 'USED',
  REVOKED = 'REVOKED',
}

// --- Pickup Code Types ---

export interface PickupCode {
  id: string;
  studentId: string;
  studentName?: string | null;
  classStreamId?: number | null;
  classStreamName?: string | null;
  code: string; // Short alphanumeric code
  qrData?: string | null; // QR code data payload
  status: PickupCodeStatus;
  generatedAt: string;
  expiresAt: string;
  usedAt?: string | null;
  usedBy?: string | null; // Person who picked up
  verifiedBy?: string | null; // Staff member who verified
  verifiedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Authorized Person Types ---

export interface AuthorizedPerson {
  id: string;
  studentId: string;
  studentName?: string | null;
  firstName: string;
  lastName: string;
  relationship: string; // e.g., "Parent", "Guardian", "Uncle"
  phone: string;
  email?: string | null;
  photoUrl?: string | null;
  idDocumentType?: string | null; // e.g., "National ID", "Passport"
  idDocumentNumber?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Student Authorization Types ---

export interface StudentAuthorization {
  id: string;
  studentId: string;
  studentName?: string | null;
  classStreamId?: number | null;
  classStreamName?: string | null;
  authorizedPersonIds: string[]; // References to authorized_persons
  specialInstructions?: string | null;
  restrictions?: string | null;
  createdBy: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  // Denormalized
  authorizedPersons?: AuthorizedPerson[] | null;
}

// --- Pickup Log Types ---

export interface PickupLog {
  id: string;
  studentId: string;
  studentName?: string | null;
  classStreamId?: number | null;
  classStreamName?: string | null;
  pickupCodeId?: string | null;
  authorizedPersonId: string;
  authorizedPersonName: string;
  relationship: string;
  pickupTime: string;
  pickupDate: string;
  verifiedBy: string;
  verifiedByName: string;
  method: 'qr_scan' | 'code_entry' | 'manual';
  notes?: string | null;
  createdAt: string;
}

// Type aliases for schema compatibility
export type PickupCodeType = PickupCode;
export type AuthorizedPersonType = AuthorizedPerson;
export type StudentAuthorizationType = StudentAuthorization;
export type PickupLogType = PickupLog;
