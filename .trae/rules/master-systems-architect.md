---
name: master-systems-architect
description: Master-level systems solutions architecture for enterprise web applications. Use when designing systems requiring enterprise-grade security, RBAC, modularity, and maintainability. Handles architecture decisions across monoliths, modular monoliths, microservices, and microfrontends. Produces technical specifications, Architecture Decision Records (ADRs), and Architecture Assessment Reports (AARs) with strong focus on technical debt prevention and maintenance planning.
---

# Master Systems Architect

Design production-ready web applications with enterprise-grade security, modularity, and long-term maintainability.

## Architecture Philosophy

**"Ship fast, maintain forever, scale when needed."**

The best architecture is the one that solves today's problems while not becoming tomorrow's burden. Every decision is a trade-off between:

1. **Velocity vs. Sustainability** - How fast can we ship vs. how long can we maintain
2. **Complexity vs. Capability** - What do we need vs. what can we afford to maintain
3. **Standard vs. Custom** - Battle-tested patterns vs. bespoke solutions

## Project Size Decision Matrix

| Project Size | Architecture Pattern | Team Size | When to Choose |
|--------------|---------------------|-----------|----------------|
| **Simple** (< 6 months, < 5 devs) | Monolith | 1-3 | Single bounded context, rapid MVP, known domain |
| **Medium** (6-18 months, 5-15 devs) | Modular Monolith | 5-10 | Multiple domains, need separation without ops overhead |
| **Large** (18+ months, 15+ devs) | Microservices | 10+ | Multiple teams, independent deploy needs, scale requirements |
| **Complex UI** (Multiple frontend teams) | Microfrontends | 5+ | Multiple frontend teams, tech diversity needs |

**Golden Rule:** Start as simple as possible. Complexity is extracted when pain is felt, not anticipated.

## Core Principles

### 1. Security-First Design
- Zero-trust architecture by default
- Defense in depth at every layer
- RBAC as foundation, not afterthought
- Principle of least privilege

### 2. Modularity Over Distribution
- Clear module boundaries before service boundaries
- Internal APIs before external APIs
- Shared nothing within modules, explicit contracts between

### 3. Maintainability as Feature
- Code is read 10x more than written
- Operability > elegance
- Monitoring and observability built-in, not bolted-on

### 4. Technical Debt Strategy
- Quantify debt, don't just feel it
- Intentional vs. accidental debt
- Payback plans with interest calculations
- Debt ceilings per sprint/release

## Architecture Process

### Phase 1: Discovery & Constraints

Understand before architecting:

```
1. Business Context
   - Core domain and bounded contexts
   - Business capabilities required
   - Regulatory/compliance requirements
   - Growth projections (users, data, features)

2. Technical Constraints
   - Team size and expertise
   - Existing systems to integrate
   - Infrastructure constraints
   - Budget (CAPEX vs OPEX)

3. Non-Functional Requirements
   - Availability SLAs
   - Performance requirements (p50, p95, p99)
   - Data residency requirements
   - Security classifications
```

### Phase 2: Architecture Selection

Use the pattern catalog in [references/architecture-patterns.md](references/architecture-patterns.md):

**Decision Flow:**
1. Can a monolith serve the bounded contexts? → Monolith
2. Need separation but single deployment unit? → Modular Monolith
3. Need independent deployment or scaling? → Microservices
4. Multiple frontend teams or tech stacks? → Microfrontends

**Validate with:**
- Team topology (Conway's Law)
- Deployment frequency requirements
- Scaling vectors (which parts scale independently?)
- Data consistency requirements

### Phase 3: Security & RBAC Design

Reference [references/security-rbac-patterns.md](references/security-rbac-patterns.md):

**Layers to secure:**
1. **Edge** - WAF, DDoS, TLS termination
2. **Authentication** - Identity provider, SSO, MFA
3. **Authorization** - RBAC/ABAC at API gateway and service level
4. **Network** - VPC segmentation, service mesh
5. **Data** - Encryption at rest/transit, field-level encryption
6. **Application** - Input validation, output encoding, CSRF/XSS protection

### Phase 4: Technical Debt Planning

Use [references/tech-debt-management.md](references/tech-debt-management.md):

**Questions to answer:**
- What's our debt ceiling? (e.g., 20% of sprint capacity)
- How do we quantify debt? (complexity, risk, maintenance cost)
- What's the interest rate on existing debt?
- When do we pay it down vs. accept it?

### Phase 5: Maintenance Planning

Reference [references/maintenance-planning.md](references/maintenance-planning.md):

**Create:**
- Runbook templates for every critical path
- Health check definitions
- Alerting thresholds
- Dependency update cadence
- Deprecation strategies

### Phase 6: Documentation

**Required Deliverables:**

| Document | Template | Purpose | Audience |
|----------|----------|---------|----------|
| Technical Specification | [assets/technical-spec-template.md](assets/technical-spec-template.md) | Complete system design | Engineering team |
| Architecture Decision Record | [assets/adr-template.md](assets/adr-template.md) | Why we chose X over Y | Future maintainers |
| Architecture Assessment Report | [assets/aar-template.md](assets/aar-template.md) | Risk assessment & recommendations | Stakeholders, architects |

## Architecture Patterns Quick Reference

### Monolith (Simple Projects)

**When:** Single domain, <5 devs, <6 months, rapid iteration needed

**Structure:**
```
├── src/
│   ├── domain/           # Business logic
│   ├── api/              # HTTP layer
│   ├── persistence/      # Database access
│   └── config/
├── tests/
└── infrastructure/
```

**Pros:** Simple deployment, easy refactoring, low overhead
**Cons:** Tech stack lock-in, scaling is all-or-nothing, coupling risk

**Mitigations:**
- Strict internal module boundaries (prepare for future extraction)
- Feature flags for gradual rollout
- Comprehensive test coverage

### Modular Monolith (Medium Projects)

**When:** Multiple domains, 5-15 devs, need separation without ops complexity

**Structure:**
```
├── modules/
│   ├── billing/          # Own models, services, API
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── interfaces/
│   ├── inventory/        # Same structure
│   └── shipping/         # Same structure
├── shared-kernel/        # Cross-cutting concerns
└── app/                  # Composition root
```

**Module Contract:**
- No direct database access between modules
- Communication via internal events or explicit APIs
- Each module: own tests, can be extracted to service

**Pros:** Clear boundaries, single deployment, easier testing
**Cons:** Database shared (scaling bottleneck), tech stack shared

### Microservices (Large Projects)

**When:** 15+ devs, multiple teams, independent deployment/scaling required

**Structure:**
```
services/
├── api-gateway/          # Routing, auth, rate limiting
├── user-service/         # User management, auth
├── order-service/        # Order processing
├── inventory-service/    # Stock management
└── notification-service/ # Email, SMS, push
```

**Per Service:**
- Own database (Database per Service pattern)
- Own deployment pipeline
- Own team ownership
- API contract (OpenAPI/AsyncAPI)

**Critical Patterns:**
- **Saga Pattern** - Distributed transactions
- **CQRS** - Separate read/write models when needed
- **API Gateway** - Edge aggregation, auth
- **Service Discovery** - Dynamic routing
- **Circuit Breaker** - Failure isolation

**Pros:** Independent scaling/deployment, tech diversity, team autonomy
**Cons:** Distributed complexity, network latency, eventual consistency, ops overhead

### Microfrontends (Complex UI)

**When:** Multiple frontend teams, tech diversity, independent deployment

**Structure:**
```
frontend/
├── shell/                # Container app (routing, auth)
├── team-a-module/        # Independent deployable
├── team-b-module/        # Independent deployable
└── shared-components/    # Design system
```

**Integration Patterns:**
- **Build-time** - Shared library (tight coupling)
- **Run-time (Module Federation)** - Dynamic loading (loose coupling)
- **Web Components** - Framework agnostic

**Pros:** Team autonomy, tech diversity, independent deployment
**Cons:** Bundle size, complexity, consistency challenges

## Security & RBAC Patterns

See [references/security-rbac-patterns.md](references/security-rbac-patterns.md) for detailed patterns.

**RBAC Levels:**

1. **System Roles** (Super Admin, Auditor, Service Account)
2. **Organization Roles** (Org Admin, Manager, Member)
3. **Resource Roles** (Owner, Editor, Viewer on specific resources)

**Implementation Strategy:**
```
[User] → [AuthN] → [JWT with claims] → [API Gateway AuthZ] → [Service-level AuthZ]
```

**Claims Structure:**
```json
{
  "sub": "user-id",
  "roles": ["org:admin:org-123", "resource:editor:doc-456"],
  "permissions": ["billing:read", "users:write"],
  "org": "org-123"
}
```

## Technical Debt Management

See [references/tech-debt-management.md](references/tech-debt-management.md) for complete framework.

**Debt Categories:**

| Type | Example | Interest Rate | Payback Strategy |
|------|---------|---------------|------------------|
| **Intentional (Strategic)** | Quick MVP with known refactoring path | High if not addressed | Scheduled in roadmap |
| **Prudent (Unavoidable)** | Legacy integration, evolving requirements | Medium | Continuous refactoring |
| **Reckless (Careless)** | No tests, no docs, shortcuts without reason | Very high | Immediate halt, fix or accept |

**Quantification Formula:**
```
Debt Score = (Complexity × Risk × Maintenance_Cost) / Business_Value

Interest Rate = Hours spent working around the debt per sprint
```

**Debt Ceiling Policy:**
- Maximum 20% of sprint capacity on debt service
- Track debt items in backlog with estimates
- Review debt register monthly
- Require debt justification for new items

## Maintenance Planning

See [references/maintenance-planning.md](references/maintenance-planning.md) for complete framework.

**Maintenance Categories:**

1. **Corrective** - Bug fixes (unplanned)
2. **Adaptive** - Dependency updates, environment changes
3. **Perfective** - Performance improvements, refactoring
4. **Preventive** - Monitoring, proactive fixes

**Operational Readiness Checklist:**

- [ ] Health check endpoints for all services
- [ ] Structured logging with correlation IDs
- [ ] Distributed tracing configured
- [ ] Alerting on SLIs/SLOs
- [ ] Runbooks for common failures
- [ ] Database backup/restore tested
- [ ] Rollback procedures documented
- [ ] Security patching process defined

**Dependency Management:**
- Automated dependency updates (patch/minor)
- Quarterly major version review
- Security vulnerability scanning
- License compliance check

## Deliverable Templates

### 1. Technical Specification

Use [assets/technical-spec-template.md](assets/technical-spec-template.md)

**Sections:**
- Overview & Goals
- Architecture Diagram
- Component Details
- Data Model
- API Specifications
- Security Design
- Deployment Architecture
- Testing Strategy
- Migration Plan
- Risk Assessment
- Maintenance Plan

### 2. Architecture Decision Record (ADR)

Use [assets/adr-template.md](assets/adr-template.md)

**When to write:**
- Any decision with significant trade-offs
- Technology selection
- Architecture pattern choice
- Integration approach
- Security approach

**Format:** Context → Decision → Consequences → Status

### 3. Architecture Assessment Report (AAR)

Use [assets/aar-template.md](assets/aar-template.md)

**Purpose:** Review existing architecture for risks, debt, improvement opportunities

**Sections:**
- Executive Summary
- Current State Analysis
- Risk Assessment Matrix
- Technical Debt Inventory
- Performance Analysis
- Security Review
- Recommendations
- Roadmap

## Anti-Patterns to Avoid

See [references/anti-patterns.md](references/anti-patterns.md) for detailed explanations.

**Common Traps:**

1. **Premature Microservices** - Extracting before understanding boundaries
2. **Distributed Monolith** - Microservices with tight coupling
3. **Golden Hammer** - Using favorite tech for every problem
4. **Over-engineering** - Solving problems you don't have
5. **Ignore-It Security** - Security review at the end
6. **No Observability** - Production blind flying
7. **Magic Framework** - Heavy frameworks that own your code
8. **Big Bang Rewrite** - Complete rewrites instead of incremental improvement

## Decision Framework

When facing an architectural decision, ask:

1. **What problem are we solving?** (Not what technology is cool)
2. **What are the constraints?** (Budget, time, team, legacy)
3. **What are the options?** (At least 3 alternatives)
4. **What's the simplest thing that could work?** (Start there)
5. **What's the cost of being wrong?** (And how easily can we change?)
6. **What happens in 2 years?** (Maintenance, scaling, team changes)
7. **Who owns this decision?** (And who needs to agree?)

## Quick Start: New System Design

```
1. Gather requirements (functional + non-functional)
2. Identify bounded contexts
3. Choose architecture pattern (monolith → modular → microservices)
4. Design security model (RBAC levels)
5. Create data model
6. Define APIs (interfaces before implementations)
7. Plan deployment topology
8. Document in Technical Spec
9. Write ADRs for key decisions
10. Define maintenance plan
11. Create risk assessment
12. Review with stakeholders
```

## Resources

- [references/architecture-patterns.md](references/architecture-patterns.md) - Detailed pattern guidance
- [references/security-rbac-patterns.md](references/security-rbac-patterns.md) - Security implementation
- [references/tech-debt-management.md](references/tech-debt-management.md) - Debt quantification
- [references/maintenance-planning.md](references/maintenance-planning.md) - Long-term maintenance
- [references/anti-patterns.md](references/anti-patterns.md) - What not to do

## Templates

- [assets/technical-spec-template.md](assets/technical-spec-template.md) - Full system design
- [assets/adr-template.md](assets/adr-template.md) - Decision records
- [assets/aar-template.md](assets/aar-template.md) - Architecture assessments

---

**Remember:** Architecture is the art of making decisions that are hard to reverse. Choose wisely, document thoroughly, and always have a migration path.
