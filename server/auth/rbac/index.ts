// ABOUTME: Public surface of the hub's authorisation module: the role assignment store, the
// ABOUTME: permission context it resolves for a session, the maker-checker engine and their tables.

export { RbacError, type RbacErrorCode } from './errors';
export { applyRbacSchema, RBAC_DDL } from './tables';
export {
  RoleAssignmentStore,
  isRole,
  type RoleAssignment,
  type RoleAssignmentStoreOptions,
} from './roles';
export {
  RbacService,
  type ActorAccess,
  type ActorAccessOptions,
  type RbacServiceOptions,
} from './service';
export {
  APPROVAL_ACTIONS,
  ApprovalEngine,
  approvalAction,
  type ApprovalAction,
  type ApprovalActor,
  type ApprovalEngineOptions,
  type ApprovalEvent,
  type ApprovalRecord,
  type ApprovalStatus,
} from './approvals';
