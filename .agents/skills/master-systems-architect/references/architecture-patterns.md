# Architecture Patterns Reference

Detailed guidance for monoliths, modular monoliths, microservices, and microfrontends.

## Monolith Pattern

### When to Choose

- Single bounded context
- Team size: 1-5 developers
- Timeline: < 6 months to MVP
- Rapid iteration is priority
- Clear domain, low uncertainty

### Directory Structure

```
myapp/
├── src/
│   ├── config/              # Configuration management
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── app.ts
│   ├── domain/              # Business logic
│   │   ├── entities/        # Domain models
│   │   ├── services/        # Business operations
│   │   └── repositories/    # Data access interfaces
│   ├── api/                 # HTTP layer
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── validators/
│   ├── infrastructure/      # External concerns
│   │   ├── persistence/     # Database implementations
│   │   ├── cache/
│   │   └── external/        # Third-party integrations
│   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── infrastructure/          # Deployment configs
└── docs/
```

### Key Principles

**1. Internal Boundaries**
Even in a monolith, maintain clear boundaries:

```typescript
// Good: Clear separation
// src/domain/user/user.service.ts
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}
  
  async registerUser(data: RegisterUserDTO): Promise<User> {
    // Business logic here
  }
}

// src/api/user/user.routes.ts
router.post('/users', validate(RegisterUserSchema), async (req, res) => {
  const user = await userService.registerUser(req.body);
  res.status(201).json(user);
});
```

**2. Dependency Rule**
Dependencies point inward:
- API → Domain → Infrastructure
- Never: Infrastructure → Domain

**3. Test Strategy**
- Unit tests for domain logic
- Integration tests for API endpoints
- E2E tests for critical user journeys

### Scaling Monoliths

**Vertical Scaling:**
- Database optimization
- Caching layers (Redis)
- CDN for static assets
- Read replicas

**When to Extract:**
- Feature deployment causes full-app regression testing
- Different scaling needs for different features
- Team size exceeds monolith efficiency (10+ devs)
- Specific service needs different tech stack

---

## Modular Monolith Pattern

### When to Choose

- Multiple bounded contexts
- Team size: 5-15 developers
- Timeline: 6-18 months
- Need separation without operational complexity
- Single deployment unit acceptable

### Directory Structure

```
myapp/
├── modules/                 # Each module = potential future service
│   ├── billing/
│   │   ├── domain/          # Entities, value objects, domain events
│   │   ├── application/     # Use cases, DTOs
│   │   ├── infrastructure/  # DB access, external APIs
│   │   ├── interfaces/      # API controllers, event handlers
│   │   └── tests/
│   ├── inventory/
│   │   └── ...same structure
│   ├── shipping/
│   │   └── ...same structure
│   └── _shared/             # Shared kernel (minimal!)
│       ├── events/          # Integration events
│       └── types/
├── shared-kernel/           # Cross-cutting concerns
│   ├── authentication/
│   ├── authorization/
│   ├── logging/
│   └── validation/
├── app/                     # Composition root
│   ├── server.ts
│   └── di-container.ts
└── tests/
    ├── integration/         # Cross-module integration tests
    └── e2e/
```

### Module Structure (Clean Architecture)

```
module/
├── domain/                  # Enterprise business rules
│   ├── entities/
│   ├── value-objects/
│   ├── domain-events/
│   └── repositories/        # Interfaces only
├── application/             # Application business rules
│   ├── ports/               # Interfaces for infrastructure
│   ├── services/            # Use cases
│   └── dto/
├── infrastructure/          # Frameworks, drivers
│   ├── persistence/
│   ├── messaging/
│   └── external-services/
└── interfaces/              # Interface adapters
    ├── http/
    ├── events/
    └── cli/
```

### Module Communication

**Allowed:**
- Integration events (async)
- Explicit module API (typed interfaces)
- Shared kernel (minimal, stable)

**Forbidden:**
- Direct database access to other modules
- Direct imports of other module internals
- Shared mutable state

**Integration Events Pattern:**

```typescript
// Module A publishes event
// modules/billing/domain/events/invoice-paid.event.ts
export class InvoicePaidEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly amount: number,
    public readonly paidAt: Date
  ) {}
}

// In billing service
this.eventBus.publish(new InvoicePaidEvent(...));

// Module B subscribes
// modules/inventory/application/handlers/invoice-paid.handler.ts
@EventHandler(InvoicePaidEvent)
export class InvoicePaidHandler {
  async handle(event: InvoicePaidEvent) {
    // Update inventory or trigger fulfillment
  }
}
```

### Database Strategy

**Shared Database, Separate Schemas:**
```sql
-- Schema per module
CREATE SCHEMA billing;
CREATE SCHEMA inventory;

-- Tables in respective schemas
CREATE TABLE billing.invoices (...);
CREATE TABLE inventory.products (...);

-- No FK constraints across schemas
-- Enforce referential integrity in application layer
```

**Benefits:**
- Can extract to separate DB later
- Logical separation now
- Transaction support across modules (if needed)

**Trade-offs:**
- No DB-level FK constraints across modules
- Potential for data inconsistency (mitigated by events)

### Module Extraction Path

When extracting a module to a microservice:

1. **Extract API contract** - Define OpenAPI spec
2. **Create anti-corruption layer** - Adapter for new service
3. **Migrate data** - ETL scripts for data migration
4. **Switch traffic** - Feature flag gradual rollout
5. **Remove old code** - After successful migration

---

## Microservices Pattern

### When to Choose

- Multiple teams (15+ developers)
- Independent deployment requirements
- Different scaling needs per service
- Polyglot persistence needs
- Organizational alignment (Conway's Law)

### Service Boundaries

**Good boundaries:**
- Align with business capabilities
- Single responsibility
- Loosely coupled, highly cohesive
- Own their data

**Bad boundaries:**
- CRUD-only services
- Too granular (nanoservices)
- Shared databases
- Chatty synchronous calls

### Service Types

**1. Core Services (Domain)**
- User Service
- Order Service
- Inventory Service
- Each owns business logic + data

**2. Supporting Services**
- Notification Service
- Search Service
- Analytics Service
- Derived data, no business rules

**3. Infrastructure Services**
- API Gateway
- Service Discovery
- Configuration Service
- Cross-cutting concerns

### Communication Patterns

**Synchronous (REST/gRPC):**
- User-initiated operations
- Immediate response required
- Use sparingly (coupling)

```typescript
// API Gateway aggregates
gateway.get('/orders/:id', async (req, res) => {
  const [order, user, items] = await Promise.all([
    orderService.get(req.params.id),
    userService.get(order.userId),
    inventoryService.getItems(order.itemIds)
  ]);
  res.json({ order, user, items });
});
```

**Asynchronous (Events/Messages):**
- Background processing
- Decoupled operations
- Eventual consistency

```typescript
// Order service publishes
orderService.create(order);
eventBus.publish('OrderCreated', { orderId: order.id });

// Inventory service subscribes
@OnEvent('OrderCreated')
async reserveInventory(event: OrderCreatedEvent) {
  await this.inventory.reserve(event.orderId, event.items);
  this.eventBus.publish('InventoryReserved', { ... });
}

// Notification service subscribes
@OnEvent('InventoryReserved')
async sendConfirmation(event: InventoryReservedEvent) {
  await this.notifications.sendOrderConfirmed(event.orderId);
}
```

### Data Management

**Database Per Service:**
```
order-service/     → PostgreSQL (ACID transactions)
inventory-service/ → PostgreSQL (ACID transactions)
search-service/    → Elasticsearch (full-text)
analytics-service/ → ClickHouse (time-series)
```

**SAGA Pattern - Distributed Transactions:**

**Choreography:** Services react to events
```
OrderCreated → InventoryReserved → PaymentProcessed → OrderConfirmed
     ↓               ↓                  ↓
 (compensate)  (release stock)   (refund)
```

**Orchestration:** Central coordinator
```
OrderSagaOrchestrator:
  1. Create order
  2. Reserve inventory
  3. Process payment
  4. Confirm order
  
  On failure: Execute compensating transactions
```

### API Gateway Pattern

**Responsibilities:**
- Request routing
- Authentication/Authorization
- Rate limiting
- SSL termination
- Request/Response transformation
- Protocol translation (REST ↔ gRPC)

**Implementation:**
```typescript
// Kong, AWS API Gateway, or custom
const gateway = new APIGateway();

gateway.use(authMiddleware);
gateway.use(rateLimiter);

gateway.route('/users/*', userService);
gateway.route('/orders/*', orderService);
gateway.route('/inventory/*', inventoryService);
```

### Service Discovery

**Client-Side:**
- Service registry (Consul, etcd)
- Client loads balances
- More performant, more complex

**Server-Side:**
- Load balancer (AWS ALB, NGINX)
- Central routing
- Simpler, slight latency overhead

### Resilience Patterns

**Circuit Breaker:**
```typescript
const breaker = new CircuitBreaker(userService, {
  failureThreshold: 5,
  timeout: 60000,
  resetTimeout: 30000
});

// After 5 failures, circuit opens
// Returns fallback or error immediately
```

**Bulkhead:**
- Isolate thread pools per service
- Prevent cascade failures

**Retry with Exponential Backoff:**
```typescript
const retry = new RetryPolicy({
  maxAttempts: 3,
  backoff: exponentialBackoff(1000, 2)
});
```

**Timeout:**
- Always set timeouts on external calls
- Fail fast, don't hang

### Deployment Strategies

**Blue-Green:**
- Two identical environments
- Instant switch over
- Easy rollback
- Double infrastructure cost

**Canary:**
- Route small % of traffic to new version
- Gradual increase based on metrics
- Risk mitigation
- Requires good observability

**Rolling:**
- Replace instances gradually
- No extra infrastructure
- Slower rollback
- Version compatibility required

---

## Microfrontends Pattern

### When to Choose

- Multiple frontend teams
- Large application (100+ components)
- Different tech stacks needed
- Independent deployment of UI features

### Integration Approaches

**1. Build-Time Integration (Shared Library)**
```
packages/
├── shell/
├── components/          # Shared component library
├── auth-module/
├── dashboard-module/
└── settings-module/

# All built together
# Tight coupling
# Simplest implementation
```

**2. Run-Time Integration (Module Federation)**
```
# Shell app loads remote modules
const Dashboard = React.lazy(() => import('dashboard/App'));

# Each module is independent deployable
# Webpack Module Federation or similar
```

**3. Web Components**
```typescript
// Framework-agnostic
class UserProfile extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `...`;
  }
}
customElements.define('user-profile', UserProfile);

// Used in any framework
<user-profile user-id="123"></user-profile>
```

**4. Iframe (Legacy)**
- Complete isolation
- Performance overhead
- SEO challenges

### Recommended: Module Federation

```javascript
// webpack.config.js (Shell)
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      remotes: {
        dashboard: 'dashboard@https://dashboard.app/remoteEntry.js',
        settings: 'settings@https://settings.app/remoteEntry.js',
      },
      shared: ['react', 'react-dom', 'shared-components'],
    }),
  ],
};

// Usage in shell
const Dashboard = React.lazy(() => import('dashboard/DashboardModule'));
```

### Shared Dependencies

**Shared Kernel (Single Source of Truth):**
- Design system components
- Authentication utilities
- API client
- Utility functions

**Version Strategy:**
- Shared libs use semantic versioning
- Apps specify compatible versions
- Module Federation resolves conflicts

### Communication Between Microfrontends

**Recommended: Event Bus (Loose Coupling)**
```typescript
// Shared event bus (in shared kernel)
export const eventBus = {
  emit: (event: string, data: any) => { ... },
  on: (event: string, handler: Function) => { ... },
};

// Module A emits
eventBus.emit('user:loggedIn', { userId: '123' });

// Module B listens
eventBus.on('user:loggedIn', (data) => {
  // Update UI accordingly
});
```

**Avoid:**
- Direct imports between modules
- Shared state (except auth)
- Tight coupling

### Routing Strategy

**Shell-Owned Routing:**
```typescript
// Shell handles top-level routes
<Switch>
  <Route path="/dashboard/*" component={DashboardMFE} />
  <Route path="/settings/*" component={SettingsMFE} />
</Switch>

// Modules handle sub-routes internally
```

**Deep Linking:**
- URL structure: `app.com/module/feature/resource`
- Each module owns its URL space
- Shell just delegates

### Performance Considerations

**Bundle Optimization:**
- Aggressive code splitting
- Lazy load modules on route
- Shared dependencies in common chunk

**Loading Strategy:**
```typescript
// Show skeleton while loading
<Suspense fallback={<Skeleton />}>
  <DashboardModule />
</Suspense>
```

**Error Boundaries:**
- Isolate module failures
- Don't let one broken module crash entire app

---

## Pattern Comparison Matrix

| Factor | Monolith | Modular Monolith | Microservices | Microfrontends |
|--------|----------|------------------|---------------|----------------|
| **Team Size** | 1-5 | 5-15 | 15+ | 10+ frontend |
| **Deploy Complexity** | Low | Low | High | Medium |
| **Ops Overhead** | Minimal | Low | High | Medium |
| **Scaling** | All-or-nothing | Gradual | Per-service | Per-module |
| **Tech Diversity** | Low | Low | High | High |
| **Data Consistency** | Strong | Strong | Eventual | N/A |
| **Testing** | Simple | Module + Integration | Complex (contract) | Module + E2E |
| **Time to Production** | Fast | Fast | Slower | Medium |
| **Extraction Path** | → Modular | → Microservices | N/A | N/A |

---

## Migration Paths

### Monolith → Modular Monolith

1. Identify bounded contexts
2. Create module structure
3. Move code incrementally
4. Establish module APIs
5. Migrate to integration events
6. Database schema per module

### Modular Monolith → Microservices

1. Identify extraction candidate (high change rate, scaling needs)
2. Define service contract (OpenAPI)
3. Create anti-corruption layer
4. Extract database
5. Deploy as separate service
6. Gradual traffic shift

### Frontend Monolith → Microfrontends

1. Establish shared component library
2. Define module boundaries
3. Set up Module Federation
4. Extract first module
5. Gradual migration
6. Deprecate old code

---

## Decision Checklist

Before choosing a pattern, validate:

- [ ] Team structure supports the choice (Conway's Law)
- [ ] Operations capability matches complexity
- [ ] Real scaling needs justify distribution
- [ ] Security model works with pattern
- [ ] Monitoring/observability can support it
- [ ] Rollback strategy is defined
- [ ] Team has experience with pattern
- [ ] Migration path is clear if wrong
