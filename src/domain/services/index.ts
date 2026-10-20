// ABOUTME: The module index of the domain services: the four services of P1-B04, the errors they
// ABOUTME: raise themselves and the shapes they share. A caller imports from here, never from
// ABOUTME: the files behind it.

export {
  AdmissionService,
  type AdmissionEnrolmentInput,
  type AdmissionGuardianInput,
  type AdmissionIdentifierInput,
  type AdmissionInput,
  type AdmissionLearnerInput,
  type AdmissionResult,
  type AdmissionServiceOptions,
  type LearnerMedicalInput,
} from './admissionService';

export {
  AttendanceService,
  type AttendanceScope,
  type AttendanceServiceOptions,
  type OpenRegisterInput,
  type RecordConductIncidentInput,
  type RecordHealthVisitInput,
  type RecordLeaveOutInput,
  type RecordMarkInput,
} from './attendanceService';

export {
  EnrolmentService,
  type EndEnrolmentInput,
  type EndEnrolmentResult,
  type EnrolmentInput,
  type EnrolmentPlacement,
  type EnrolmentServiceOptions,
  type PreparedEnrolment,
  type TransferInput,
  type TransferResult,
} from './enrolmentService';

export {
  GuardianService,
  type GuardianContact,
  type GuardianInput,
  type GuardianPatch,
  type GuardianServiceOptions,
  type IdentifierInput,
  type IdentifierOwner,
  type LinkGuardianInput,
} from './guardianService';

export {
  ServiceError,
  isServiceError,
  type ServiceErrorCode,
  type ServiceErrorOptions,
} from './errors';

export {
  ATTENDANCE_ABSENCE_STATUSES,
  KEMIS_UPI_SCHEME,
  asServiceError,
  claimIdentifier,
  inTransaction,
  normalisePhone,
  personFields,
  type AddressInput,
  type AttendanceReason,
  type AttendanceSessionKind,
  type AttendanceStatus,
  type ConductIncidentCategory,
  type EmailInput,
  type EnrolmentStatus,
  type EntryReason,
  type ExitReason,
  type Gender,
  type GuardianRelationship,
  type IdentifierClaim,
  type IdentifierOwnerType,
  type LeaveOutKind,
  type LearnerStatus,
  type NameOrder,
  type PersonFields,
  type PersonInput,
  type PhoneInput,
  type PreferredChannel,
  type ResidenceStatus,
  type ServiceDependencies,
} from './common';
