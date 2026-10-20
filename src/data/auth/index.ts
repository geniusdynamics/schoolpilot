// ABOUTME: Public surface of the permission module: the role catalogue, the permission context, the
// ABOUTME: authorizer of the repository hook and the scoped repository a limited actor works through.

export {
  ENTITY_PERMISSIONS,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  ROLE_SCOPE_KINDS,
  hasPermission,
  permissionFor,
  scopeKindsFor,
  type Permission,
  type PermissionPair,
  type Role,
  type ScopeKind,
} from './roles';

export {
  CLASS_SCOPE_ENTITIES,
  FINANCE_SCOPE_ENTITIES,
  TEACHING_SCOPE_ENTITIES,
  coversInstitution,
  coversRow,
  refinesRows,
  resolveScope,
  scopeFilterFor,
  type ClassGroupScope,
  type PermissionScope,
  type ResolveScopeInput,
  type ScopeFilter,
  type ScopeGrant,
  type ScopeReader,
  type TeachingGroupScope,
} from './scope';

export {
  ScopePermissionError,
  createAuthorizer,
  resolvePermissionContext,
  type PermissionContext,
  type PermissionDenialReason,
  type ResolvePermissionContextOptions,
} from './authorizer';

export {
  ScopedRepository,
  createAuthorizedRepository,
  type AuthorizedRepository,
  type AuthorizedRepositoryOptions,
  type ScopedRepositoryOptions,
} from './scopedRepository';
