# Enterprise Security & RBAC Patterns

Comprehensive guide for implementing enterprise-grade security and role-based access control.

## Security Layers

### Layer 1: Edge Security

**Web Application Firewall (WAF):**
- OWASP Top 10 protection
- Rate limiting by IP
- Geo-blocking if needed
- Custom rule sets

**DDoS Protection:**
- CloudFlare, AWS Shield, or Akamai
- Always-on protection
- Traffic scrubbing

**TLS/SSL:**
- TLS 1.3 minimum
- Certificate pinning for mobile
- Auto-renewal (Let's Encrypt or managed)
- HSTS headers

### Layer 2: Authentication

**Identity Providers:**
- **Enterprise:** Azure AD, Okta, Auth0, Keycloak
- **Consumer:** OAuth 2.0 (Google, GitHub, etc.)
- **Hybrid:** SAML for enterprise, OAuth for consumers

**Multi-Factor Authentication (MFA):**
- Mandatory for admin accounts
- TOTP (Google Authenticator)
- WebAuthn/FIDO2 (hardware keys)
- SMS as fallback only

**Session Management:**
```typescript
// JWT Access Token (short-lived)
{
  "sub": "user-123",
  "iss": "auth.myapp.com",
  "aud": "api.myapp.com",
  "exp": 1699900000,  // 15 minutes
  "iat": 1699899100,
  "jti": "unique-token-id",
  "org": "org-456",
  "roles": ["user", "billing:admin"]
}

// Refresh Token (long-lived, stored securely)
// Rotate on use
// Revoke on logout
```

**Security Best Practices:**
- Access tokens: 15-30 minutes
- Refresh tokens: 7-30 days
- Token binding (optional)
- Secure, httpOnly cookies
- CSRF protection for cookie-based auth

### Layer 3: Authorization (RBAC)

## RBAC Models

### Level 1: Flat RBAC

Simple role-to-permission mapping:

```typescript
const roles = {
  admin: ['users:*', 'billing:*', 'settings:*'],
  manager: ['users:read', 'users:write', 'billing:read'],
  user: ['users:read:self', 'billing:read:self'],
};

// Check
if (user.roles.includes('admin') || 
    user.permissions.includes('users:write')) {
  // Allow
}
```

### Level 2: Hierarchical RBAC

Role inheritance:

```typescript
const roleHierarchy = {
  superadmin: ['orgadmin', 'admin', 'manager', 'user'],
  orgadmin: ['admin', 'manager', 'user'],
  admin: ['manager', 'user'],
  manager: ['user'],
  user: [],
};

// Effective permissions cascade down
```

### Level 3: Resource-Based RBAC (ReBAC)

Permissions scoped to specific resources:

```typescript
// User has different roles on different resources
const grants = [
  { user: 'u1', resource: 'doc:123', role: 'owner' },
  { user: 'u1', resource: 'doc:456', role: 'viewer' },
  { user: 'u2', resource: 'doc:123', role: 'editor' },
];

// Role definitions per resource type
const resourceRoles = {
  document: {
    owner: ['read', 'write', 'delete', 'share', 'manage-permissions'],
    editor: ['read', 'write'],
    viewer: ['read'],
    commenter: ['read', 'comment'],
  },
};
```

### Level 4: Attribute-Based Access Control (ABAC)

Dynamic policies based on attributes:

```typescript
const policy = {
  subject: { role: 'manager', department: 'sales' },
  resource: { type: 'lead', region: 'europe' },
  action: 'read',
  condition: {
    'subject.department': 'resource.assignedDepartment',
    'resource.sensitivity': { $lte: 'internal' },
    'environment.time': { $between: ['09:00', '18:00'] },
  },
};
```

## Implementation Patterns

### Pattern 1: API Gateway Authorization

Centralized auth at the edge:

```typescript
// API Gateway
app.use(async (req, res, next) => {
  // 1. Verify JWT
  const token = extractBearerToken(req);
  const payload = await verifyJWT(token);
  
  // 2. Enrich with permissions
  const permissions = await getUserPermissions(payload.sub);
  
  // 3. Check route-specific permission
  const required = req.route.permissions; // ['billing:read']
  const hasPermission = required.some(p => permissions.includes(p));
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  req.user = { ...payload, permissions };
  next();
});
```

**Pros:** Single point of control, consistent enforcement
**Cons:** Gateway must know all permissions, latency to auth service

### Pattern 2: Service-Level Authorization

Each service validates permissions:

```typescript
// User Service
@Controller('/users')
@UseGuard(AuthGuard)
class UserController {
  
  @Get('/:id')
  @RequirePermission('users:read')
  async getUser(@Param('id') id: string, @User() user: UserContext) {
    // Additional resource-level check
    if (!await this.canAccess(user, id)) {
      throw new ForbiddenException();
    }
    return this.userService.findById(id);
  }
}

// Resource-level check
async canAccess(user: UserContext, resourceId: string): Promise<boolean> {
  // Owner can always access
  const resource = await this.userRepo.findById(resourceId);
  if (resource.ownerId === user.id) return true;
  
  // Check explicit grants
  return this.grantsRepo.hasPermission(user.id, resourceId, 'read');
}
```

**Pros:** Fine-grained control, services own their policies
**Cons:** Duplicated logic, consistency challenges

### Pattern 3: Policy Decision Point (PDP)

Centralized policy engine:

```typescript
// OPA (Open Policy Agent), Casbin, or custom
const pdp = new PolicyDecisionPoint();

// In service
const decision = await pdp.evaluate({
  subject: user,
  resource: { type: 'document', id: docId },
  action: 'read',
  environment: { time: new Date(), ip: req.ip },
});

if (decision === 'deny') {
  throw new ForbiddenException();
}
```

**Pros:** Centralized policies, audit trail, ABAC support
**Cons:** Additional hop, complexity

## Permission Schema Design

### Resource:Action Pattern

```
{resource}:{action}:{scope}

Examples:
- users:read:all           # Read all users
- users:read:self          # Read own profile
- users:write:self         # Update own profile
- billing:read:org         # Read org billing
- documents:delete:owned   # Delete own documents
- admin:impersonate        # Admin super-power
```

### Wildcards

```
users:*         # All user actions
*:read           # Read anything
users:read:*     # Read users at any scope
```

### Permission Hierarchy

```typescript
// Implied permissions
const permissionHierarchy = {
  'users:*': ['users:read', 'users:write', 'users:delete'],
  'users:write': ['users:read'],
  'admin:*': ['*:*'],  // Admin implies everything
};

// Expand wildcards before checking
function expandPermissions(permissions: string[]): string[] {
  const expanded = new Set(permissions);
  
  for (const perm of permissions) {
    if (permissionHierarchy[perm]) {
      permissionHierarchy[perm].forEach(p => expanded.add(p));
    }
  }
  
  return Array.from(expanded);
}
```

## Organization Multi-Tenancy

### Isolation Models

**1. Shared Database, Tenant Column:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,  -- Tenant isolation
  email VARCHAR(255),
  ...
);

-- Every query filtered by org_id
SELECT * FROM users WHERE org_id = $1;
```

**Pros:** Simple, efficient
**Cons:** Data leakage risk (if filters forgotten)

**2. Shared Database, Schema per Tenant:**
```sql
-- Schema per organization
CREATE SCHEMA org_123;
CREATE SCHEMA org_456;

-- Same tables, different schemas
CREATE TABLE org_123.users (...);
CREATE TABLE org_456.users (...);
```

**Pros:** Stronger isolation, schema customization per tenant
**Cons:** Schema migrations more complex

**3. Database per Tenant:**
```
org-123.postgres.internal
org-456.postgres.internal
```

**Pros:** Maximum isolation, independent scaling
**Cons:** Higher cost, complex management

### Tenant Context Propagation

```typescript
// Middleware extracts tenant from JWT
app.use((req, res, next) => {
  const token = verifyJWT(req.headers.authorization);
  req.tenant = {
    id: token.org,
    tier: token.orgTier,  // free, pro, enterprise
  };
  next();
});

// Repository automatically filters
class UserRepository {
  async findById(id: string) {
    return db.query(
      'SELECT * FROM users WHERE id = $1 AND org_id = $2',
      [id, this.tenantContext.id]
    );
  }
}
```

### Cross-Tenant Operations

**System Admin Operations:**
```typescript
// Super admin can access all tenants
@RequireRole('superadmin')
@BypassTenantIsolation()
async getGlobalStats() {
  // Query across all tenants
}
```

**Data Sharing (B2B):**
```typescript
// Org A shares resource with Org B
const share = {
  resourceType: 'document',
  resourceId: 'doc-123',
  ownerOrg: 'org-a',
  sharedWith: 'org-b',
  permissions: ['read'],
  expiresAt: '2024-12-31',
};

// Org B user queries with their token
// System checks share table for access
```

## Secrets Management

### Secrets Hierarchy

```
Level 1: Application Secrets
  - Database credentials
  - API keys for external services
  - JWT signing keys
  
Level 2: Infrastructure Secrets
  - TLS certificates
  - SSH keys
  - Cloud provider credentials
  
Level 3: CI/CD Secrets
  - Deployment tokens
  - Build signing keys
```

### Secrets Storage

**Development:**
```bash
# .env.local (gitignored)
DATABASE_URL=postgres://...
JWT_SECRET=dev-secret-do-not-use-in-prod
```

**Production:**
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- Kubernetes Secrets (with encryption at rest)

### Application Integration

```typescript
// secrets.service.ts
class SecretsService {
  constructor(private vault: VaultClient) {}
  
  async getDatabaseCredentials(): Promise<DBCreds> {
    // Auto-rotated credentials
    return this.vault.read('database/creds/app-role');
  }
  
  async getJWTSecret(): Promise<string> {
    return this.vault.read('secret/jwt-signing-key');
  }
}

// Usage
const creds = await secretsService.getDatabaseCredentials();
// creds valid for 1 hour, then rotated
```

## Input Validation & Output Encoding

### Validation Layers

**1. Schema Validation (API Layer):**
```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']),
});

app.post('/users', validate(CreateUserSchema), (req, res) => {
  // req.body is validated and typed
});
```

**2. Domain Validation:**
```typescript
class Email {
  private constructor(public readonly value: string) {}
  
  static create(value: string): Result<Email, Error> {
    if (!isValidEmail(value)) {
      return err(new InvalidEmailError());
    }
    return ok(new Email(value.toLowerCase().trim()));
  }
}
```

### Output Encoding

**HTML:**
```typescript
// Auto-escape in templates
<div>{{userInput}}</div>  // Safe

// Or explicit
import { escapeHtml } from 'lodash';
const safe = escapeHtml(userInput);
```

**SQL:**
```typescript
// Never concatenate
// Bad: `SELECT * FROM users WHERE id = ${userId}`

// Good: Parameterized queries
db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**JSON:**
```typescript
// Proper serialization handles escaping
res.json({ message: userInput });  // Safe
```

## Common Vulnerabilities & Mitigations

### OWASP Top 10

**A01: Broken Access Control**
- Deny by default
- Validate on server, not just client
- Disable CORS for sensitive operations
- Rate limit auth endpoints

**A02: Cryptographic Failures**
- Use strong algorithms (AES-256, RSA-4096)
- Rotate keys regularly
- Don't roll your own crypto
- Encrypt data at rest and in transit

**A03: Injection**
- Parameterized queries only
- Input validation
- ORM with safe defaults
- WAF rules

**A04: Insecure Design**
- Threat modeling
- Security requirements in design
- Defense in depth
- Fail securely

**A05: Security Misconfiguration**
- Remove default credentials
- Minimal necessary features enabled
- Security headers
- Regular audits

**A06: Vulnerable Components**
- Dependency scanning (Snyk, Dependabot)
- SBOM generation
- Update cadence
- Vulnerability monitoring

**A07: Auth Failures**
- MFA for sensitive accounts
- Strong password policies
- Account lockout
- Session management

**A08: Software Integrity Failures**
- Code signing
- Supply chain security
- Verified commits
- Reproducible builds

**A09: Logging Failures**
- Security event logging
- Tamper-proof logs
- SIEM integration
- Retention policies

**A10: SSRF**
- URL validation
- Network segmentation
- DNS rebinding protection
- Allowlists for external calls

## Security Headers

```typescript
// Express example
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Minimize unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'same-origin' },
}));

// Essential headers
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Strict-Transport-Security: max-age=31536000
```

## Audit & Compliance

### Audit Logging

**What to Log:**
- Authentication events (success/failure)
- Authorization failures
- Data access (read sensitive data)
- Data modification (create/update/delete)
- Permission changes
- Admin actions

**Log Format:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event": "user.data_access",
  "actor": {
    "id": "user-123",
    "ip": "192.168.1.1",
    "userAgent": "..."
  },
  "resource": {
    "type": "document",
    "id": "doc-456"
  },
  "action": "read",
  "result": "success",
  "metadata": {
    "sensitivity": "confidential"
  }
}
```

**Log Storage:**
- Immutable logs (WORM storage)
- Separate from application logs
- Retention: 1-7 years (compliance dependent)
- SIEM integration for real-time alerts

### Compliance Frameworks

**SOC 2:**
- Access controls
- Monitoring
- Incident response
- Regular audits

**GDPR:**
- Data minimization
- Right to erasure
- Consent management
- Data processing agreements

**HIPAA:**
- Encryption
- Audit logs
- Access controls
- Business associate agreements

---

## Security Checklist

### Design Phase
- [ ] Threat model completed
- [ ] Security requirements defined
- [ ] RBAC model designed
- [ ] Data classification (public, internal, confidential, restricted)
- [ ] Encryption strategy (at rest, in transit, field-level)

### Implementation Phase
- [ ] Input validation on all entry points
- [ ] Output encoding for all contexts
- [ ] Authentication implemented
- [ ] Authorization enforced at every layer
- [ ] Secrets externalized
- [ ] Security headers configured
- [ ] Dependency scan clean

### Deployment Phase
- [ ] TLS configured
- [ ] WAF enabled
- [ ] DDoS protection active
- [ ] Network segmentation
- [ ] Secrets rotation procedure
- [ ] Security monitoring enabled

### Maintenance Phase
- [ ] Regular dependency updates
- [ ] Security patch process
- [ ] Penetration testing schedule
- [ ] Incident response plan
- [ ] Security training for team
