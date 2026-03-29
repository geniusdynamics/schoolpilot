# Architecture Anti-Patterns

Common architectural mistakes and how to avoid them.

## 1. Premature Microservices

**Description:** Breaking into microservices before understanding the domain boundaries.

**Symptoms:**
- Services with 100 lines of code (nanoservices)
- Constant changes across multiple services for single feature
- More time spent on DevOps than features
- Distributed transactions everywhere

**Root Cause:** Hype-driven architecture, ignoring Conway's Law

**Impact:**
- Velocity collapses
- Debugging becomes nightmare
- Deployment complexity
- Network latency issues

**Solution:**
- Start with modular monolith
- Extract services when pain is felt, not anticipated
- Services should align with team boundaries
- Services should have independent deployment needs

**Detection:**
- More than 50% of PRs touch multiple services
- Services communicate synchronously in chains
- Database joins across services

---

## 2. Distributed Monolith

**Description:** Services that are deployed separately but tightly coupled.

**Symptoms:**
- Can't deploy service A without updating service B
- Services share database
- Synchronous calls in chains (A→B→C→D)
- Shared libraries that change frequently

**Root Cause:** Extracting services without decoupling

**Impact:**
- Worst of both worlds: distributed complexity + monolith coupling
- Cascading failures
- Difficult to scale independently
- Testing nightmare

**Solution:**
- Database per service
- Asynchronous communication
- Loose coupling through events
- Versioned API contracts

**Detection:**
- Deployment dependencies between services
- Circular dependencies in service graph
- Shared database schemas

---

## 3. Golden Hammer

**Description:** Using a favorite technology for every problem.

**Symptoms:**
- "We use MongoDB for everything"
- "Everything must be Kubernetes"
- "We only do microservices"
- Technology choice precedes problem understanding

**Root Cause:** Comfort zone, lack of breadth

**Impact:**
- Suboptimal solutions
- Forcing round pegs in square holes
- Team skill gaps
- Higher costs

**Solution:**
- Choose technology based on requirements
- Polyglot persistence when justified
- Evaluate alternatives objectively
- "Right tool for the job"

**Detection:**
- Same stack for every new project
- Dismissing alternatives without evaluation
- Technology answers before problem questions

---

## 4. Over-Engineering

**Description:** Solving problems you don't have yet.

**Symptoms:**
- "What if we have 10 million users?" (current: 1000)
- Abstractions for future flexibility that's never used
- Complex caching for data that fits in memory
- Event sourcing for simple CRUD

**Root Cause:** Future-proofing anxiety, resume-driven development

**Impact:**
- Unnecessary complexity
- Slower development
- Harder to change (ironically)
- Maintenance burden

**Solution:**
- YAGNI (You Ain't Gonna Need It)
- Solve today's problems
- Build for current scale + 10x
- Simpler is easier to change later

**Detection:**
- "What if..." questions without data
- Abstractions with single implementation
- Complex solutions to simple problems

---

## 5. Ignore-It Security

**Description:** Security as an afterthought.

**Symptoms:**
- Security review at end of project
- No authentication in prototypes that become production
- Hardcoded secrets
- "We'll add HTTPS later"

**Root Cause:** Security seen as blocker, not enabler

**Impact:**
- Data breaches
- Compliance violations
- Reputational damage
- Expensive retrofits

**Solution:**
- Security from day one
- Shift-left security
- Automated security testing
- Security champions in teams

**Detection:**
- Security tickets created late in cycle
- No security requirements in specs
- Secrets in code repositories

---

## 6. No Observability

**Description:** Flying blind in production.

**Symptoms:**
- "It works on my machine"
- No logging in production
- Dashboards are green while users complain
- Debugging requires adding logs and redeploying

**Root Cause:** Observability seen as optional

**Impact:**
- Long MTTR (Mean Time To Recovery)
- Customer-impacting bugs discovered late
- Reactive not proactive
- Difficult performance optimization

**Solution:**
- Instrumentation as first-class citizen
- Structured logging
- Distributed tracing
- Business metrics, not just tech metrics

**Detection:**
- No dashboards
- Logs are printf debugging
- No correlation IDs
- Metrics are infrastructure-only

---

## 7. Magic Framework

**Description:** Heavy frameworks that own your codebase.

**Symptoms:**
- Framework dictates architecture
- Hard to test without full framework boot
- Upgrades are massive undertakings
- Business logic mixed with framework code

**Root Cause:** Framework selection before architecture

**Impact:**
- Vendor lock-in
- Testing difficulties
- Upgrade nightmares
- Inability to change frameworks

**Solution:**
- Framework at edges (ports and adapters)
- Domain code is framework-agnostic
- Dependency inversion
- Test business logic in isolation

**Detection:**
- Business logic in controllers
- Framework imports in domain code
- Testing requires full app context

---

## 8. Big Bang Rewrite

**Description:** Complete system rewrites instead of incremental improvement.

**Symptoms:**
- "Let's start fresh"
- 18-month rewrite projects
- Parallel maintenance of old and new
- Feature freeze on old system

**Root Cause:** Underestimating complexity, frustration with legacy

**Impact:**
- Never delivers (second system syndrome)
- Business stops getting features
- Team burnout
- Usually repeats mistakes

**Solution:**
- Strangler Fig pattern
- Incremental extraction
- Feature-by-feature migration
- Keep shipping during transition

**Detection:**
- Rewrite projects > 6 months
- No incremental delivery plan
- "Just one more month"

---

## 9. Database as Integration Point

**Description:** Multiple apps reading/writing same database.

**Symptoms:**
- Shared database across services
- Schema changes break multiple apps
- Can't optimize queries for one app without affecting others
- No clear data ownership

**Root Cause:** Database seen as neutral territory

**Impact:**
- Coupling through schema
- Change resistance
- Performance conflicts
- No single source of truth for logic

**Solution:**
- Database per service
- APIs as integration point
- Data ownership clear
- Event sourcing for shared data

**Detection:**
- Multiple apps with DB credentials
- Schema changes require coordination
- Direct DB reads from other teams' apps

---

## 10. God Service/Object

**Description:** One service/object that does everything.

**Symptoms:**
- 10K+ line service classes
- Handles all business logic
- No clear responsibilities
- Everyone modifies it

**Root Cause:** Lack of refactoring, unclear boundaries

**Impact:**
- Merge conflicts
- Regression risk
- Testing difficulty
- Knowledge silos

**Solution:**
- Single Responsibility Principle
- Extract cohesive modules
- Clear interfaces
- Incremental decomposition

**Detection:**
- Files with > 1000 lines
- Classes with > 20 methods
- High churn rate
- Many authors

---

## 11. Leaky Abstractions

**Description:** Abstractions that expose implementation details.

**Symptoms:**
- Repository exposes SQL details
- API returns internal IDs
- Error messages expose stack traces
- Clients need to know internal structure

**Root Cause:** Shallow abstractions, lazy interface design

**Impact:**
- Clients coupled to implementation
- Can't change internals
- Security issues
- Confusing APIs

**Solution:**
- Abstract completely or not at all
- DTOs for API boundaries
- Meaningful error messages
- Hide internals

**Detection:**
- Implementation-specific parameters
- Internal IDs in APIs
- Technology names in domain code

---

## 12. Reinventing the Wheel

**Description:** Building what you can buy/use.

**Symptoms:**
- Custom authentication instead of Auth0
- Homegrown message queue
- DIY monitoring instead of Datadog
- Custom frameworks

**Root Cause:** NIH syndrome (Not Invented Here), underestimation

**Impact:**
- Diverted from core business
- Maintenance burden
- Security vulnerabilities
- Opportunity cost

**Solution:**
- Buy vs build analysis
- Focus on core competencies
- Open source first
- SaaS for non-differentiating features

**Detection:**
- Building generic infrastructure
- "It's just a simple..." that takes months
- Not comparing with existing solutions

---

## 13. Chatty Services

**Description:** Excessive inter-service communication.

**Symptoms:**
- 50+ service calls per request
- Synchronous chains
- N+1 queries across services
- Services calling services calling services

**Root Cause:** Wrong service boundaries, eager loading

**Impact:**
- Latency cascades
- Brittle systems
- Hard to reason about
- Network saturation

**Solution:**
- API composition/aggregation
- CQRS for read models
- Bulk operations
- Caching at boundaries

**Detection:**
- Service call graphs > 3 levels deep
- Latency proportional to number of services
- Timeout cascades

---

## 14. Anemic Domain Model

**Description:** Domain objects with only getters/setters, no behavior.

**Symptoms:**
- Entities are data bags
- All logic in service classes
- Validation in controllers
- Rich services, poor models

**Root Cause:** ORM-focused thinking, procedural mindset

**Impact:**
- Logic scattered
- Duplication
- Hard to understand business rules
- Poor encapsulation

**Solution:**
- Rich domain models
- Encapsulate behavior with data
- Domain-driven design
- Value objects for validation

**Detection:**
- Classes with only properties
- Services that just orchestrate CRUD
- Validation not in domain

---

## 15. Layer Violations

**Description:** Dependencies pointing the wrong way.

**Symptoms:**
- Domain logic importing infrastructure
- Controllers calling repositories directly
- Business rules in database
- UI logic in backend

**Root Cause:** Lack of architecture enforcement

**Impact:**
- Can't test in isolation
- Hard to change technologies
- Circular dependencies
- Technical debt

**Solution:**
- Dependency Rule (Clean Architecture)
- Ports and Adapters
- Dependency injection
- Architecture tests

**Detection:**
- Domain imports framework
- Database queries in controllers
- UI logic in API

---

## 16. Soft Delete Obsession

**Description:** Soft deleting everything "just in case".

**Symptoms:**
- Every table has deleted_at
- Queries everywhere check deleted_at
- Database bloated with deleted data
- "What if we need to restore?"

**Root Cause:** Fear of data loss, no data lifecycle policy

**Impact:**
- Query complexity
- Performance degradation
- Storage costs
- Accidental inclusion of deleted data

**Solution:**
- Archive instead of soft delete
- Hard delete after retention period
- Separate audit log
- Data lifecycle policies

**Detection:**
- deleted_at on every table
- Complex query conditions
- Never purging old data

---

## 17. Logging for Debugging

**Description:** Using logs as printf debugging.

**Symptoms:**
- "Entering function X"
- "Variable Y = " + y
- Logs at DEBUG level in production
- No structured logging

**Root Cause:** Using logs as debugger replacement

**Impact:**
- Log noise
- Storage costs
- Hard to find useful information
- Security issues (logging secrets)

**Solution:**
- Structured logging (JSON)
- Log events, not statements
- Correlation IDs
- Different levels for different environments

**Detection:**
- Concatenated strings in logs
- Variable dumps
- DEBUG logs in production

---

## 18. Configuration in Code

**Description:** Hardcoding environment-specific values.

**Symptoms:**
- if (environment === 'production') { ... }
- URLs in source code
- Feature flags as constants
- Different branches per environment

**Root Cause:** Laziness, misunderstanding of config management

**Impact:**
- Can't deploy same artifact everywhere
- Environment-specific bugs
- Security risks (secrets in code)
- Branch divergence

**Solution:**
- External configuration
- Environment variables
- Feature flag services
- Single deployable artifact

**Detection:**
- Environment checks in code
- Hardcoded URLs
- Config files committed per env

---

## 19. Hope-Driven Development

**Description:** "It should work" without verification.

**Symptoms:**
- No tests for "simple" code
- "I didn't think that would break"
- Production as testing environment
- No local reproduction of bugs

**Root Cause:** Overconfidence, time pressure

**Impact:**
- Production bugs
- Regressions
- Fear of changes
- Firefighting culture

**Solution:**
- Automated testing
- CI/CD gates
- Test pyramid
- Local development that mirrors prod

**Detection:**
- "Works on my machine"
- Fixes without regression tests
- No automated test suite

---

## 20. Meeting-Driven Architecture

**Description:** Architecture by committee without decision makers.

**Symptoms:**
- 20-person architecture meetings
- Decisions made by least objection
- Analysis paralysis
- No documented decisions

**Root Cause:** Fear of wrong decision, lack of ownership

**Impact:**
- Slow progress
- Compromised solutions
- No accountability
- Revisiting same decisions

**Solution:**
- Architecture Decision Records (ADRs)
- Clear decision owners
- Time-boxed analysis
- "Disagree and commit"

**Detection:**
- Recurring architecture meetings without output
- Same topics discussed multiple times
- No clear decision maker

---

## Detection Checklist

**Review your system for:**

- [ ] Services with < 500 lines of code
- [ ] Services that can't deploy independently
- [ ] Same technology stack regardless of problem
- [ ] Complex solutions to simple requirements
- [ ] Security reviews only at end
- [ ] Production debugging requires adding logs
- [ ] Framework code mixed with business logic
- [ ] Rewrite projects in progress
- [ ] Multiple apps sharing database
- [ ] Files/classes with too many responsibilities
- [ ] Clients knowing implementation details
- [ ] Building infrastructure instead of using existing tools
- [ ] Chains of service calls
- [ ] Domain objects with no behavior
- [ ] Domain importing infrastructure
- [ ] Soft deletes on everything
- [ ] Debug-style logging
- [ ] Environment checks in code
- [ ] Code without tests
- [ ] Architecture by committee

**Count your anti-patterns:**
- 0-3: Healthy
- 4-6: Needs attention
- 7+: Significant refactoring needed
