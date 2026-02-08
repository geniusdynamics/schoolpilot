# SchoolPilot3 Resolution Roadmap

## Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| [MASTER_ROADMAP.md](./MASTER_ROADMAP.md) | Complete 12-week roadmap | Project Managers, Tech Leads |
| [../implementation/tab-system/ARCHITECTURE.md](../implementation/tab-system/ARCHITECTURE.md) | Tab system technical design | Frontend Developers |
| [../architecture/deployment-modes/DEPLOYMENT_SPECIFICATION.md](../architecture/deployment-modes/DEPLOYMENT_SPECIFICATION.md) | Deployment mode specs | DevOps, Architects |
| [../architecture/DATA_LAYER_STRATEGY.md](../architecture/DATA_LAYER_STRATEGY.md) | Unified data layer design | Backend Developers |
| [../implementation/IMPLEMENTATION_GUIDELINES.md](../implementation/IMPLEMENTATION_GUIDELINES.md) | Coding standards & examples | All Developers |

---

## Executive Summary

This roadmap addresses critical issues in SchoolPilot3's tab management system while establishing a foundation for the multi-deployment architecture. The project will support:

1. **Standalone Mode** - Single laptop schools
2. **Networked Mode** - Small school LAN setups
3. **Hosted Mode** - School server deployment
4. **SaaS Backend** - Multi-tenant cloud
5. **ERPNext Integration** - Existing ERPNext users
6. **Mobile Mode** - Teachers on-field (future)

**Timeline:** 12 weeks (3 phases)

---

## Current Issues Being Resolved

### Tab System Problems
- ❌ State sync drift between React Router and TabStore
- ❌ LocalStorage corruption causing tab loss
- ❌ Limited multi-tasking capabilities
- ❌ Broken browser back/forward integration

### Data Layer Problems
- ❌ 4 competing technologies (RxDB, PouchDB, SQLite, LiveStore)
- ❌ Parallel implementations with different APIs
- ❌ Confusing deployment mode configuration
- ❌ Unclear migration paths

---

## Solution Highlights

### URL-Driven Tab System
```
Before: TabStore maintains state separately from URL
After:  URL is single source of truth, tab state derived from URL

Example URL:
/academics/students?tabs=[...]&active=tab-1&view=detail&id=123
```

### Unified Data Service
```
Before: Different APIs for each provider
After:  One unified API, multiple backends

uds.find('students', { filter: { class: '10A' }})
// Works with SQLite, PouchDB, or Backend API
```

---

## Phase Breakdown

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Working tab system with stable data layer

**Key Deliverables:**
- URL-driven tab architecture
- Multi-tasking workflow support
- SQLite provider for standalone mode
- Comprehensive test suite

**Entry Criteria:**
- All existing tests passing
- No critical bugs in production

**Exit Criteria:**
- [ ] Tab sync errors < 1%
- [ ] Page load time < 2s
- [ ] All navigation flows working

---

### Phase 2: Enhancement (Weeks 5-8)
**Goal:** Multi-deployment support with sync capabilities

**Key Deliverables:**
- Offline-first sync engine
- Networked mode with LAN discovery
- Hosted mode with real-time updates
- SaaS backend foundation

**Entry Criteria:**
- Phase 1 exit criteria met
- Security review passed

**Exit Criteria:**
- [ ] Sync works across all modes
- [ ] Auto-discovery functional
- [ ] Performance benchmarks met

---

### Phase 3: Expansion (Weeks 9-12)
**Goal:** ERPNext integration and mobile preparation

**Key Deliverables:**
- ERPNext connector
- SaaS multi-tenancy
- React Native migration path
- Documentation & training

**Entry Criteria:**
- Phase 2 exit criteria met
- Beta testing completed

**Exit Criteria:**
- [ ] ERPNext sync validated
- [ ] SaaS onboarding flow complete
- [ ] Mobile architecture documented

---

## Critical Decisions

### 1. Tab System Architecture
**Decision:** URL-driven state instead of separate store

**Rationale:**
- URLs are naturally persistent and shareable
- Browser back/forward works automatically
- Multiple windows can share state via URL
- Simpler mental model for developers

### 2. Data Provider Selection
**Decision:** PouchDB for networked/SaaS, SQLite for standalone

**Rationale:**
- PouchDB: Mature sync protocol, no collection limits
- SQLite: File-based, easy backup, full SQL support
- Both have excellent browser support
- RxDB eliminated due to collection limits

### 3. React Native Strategy
**Decision:** PWA first, then React Native

**Rationale:**
- PWA provides immediate mobile value
- Code sharing architecture enables gradual migration
- Lower risk than full rewrite
- Teachers can use existing devices

---

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| Tab Sync Failures | ~15% | <1% | <0.5% | <0.1% |
| Page Load Time | 4s | 2s | 1.5s | 1.5s |
| Offline Coverage | 60% | 80% | 95% | 100% |
| Data Loss | Occasional | Zero | Zero | Zero |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration breaks data | Medium | High | Comprehensive backups, rollback plan, gradual rollout |
| Performance degradation | Low | High | Load testing, profiling, code splitting |
| ERPNext API changes | Medium | Medium | Abstraction layer, version pinning |
| Team capacity issues | Medium | Medium | Phased approach, clear priorities |

---

## Team Structure

### Phase 1
- **Frontend Lead:** Tab system implementation
- **Architecture Lead:** Data layer consolidation
- **QA Lead:** Test suite development

### Phase 2
- **Backend Lead:** Sync engine, server components
- **DevOps Lead:** Deployment automation
- **Security Lead:** Authentication, encryption

### Phase 3
- **Integration Lead:** ERPNext connector
- **Mobile Lead:** PWA optimization, React Native prep
- **Tech Writer:** Documentation, training materials

---

## Communication Plan

### Weekly
- Sprint planning (Mondays)
- Stand-ups (daily)
- Demo Fridays

### Milestones
- Phase 1 completion: All-hands demo
- Phase 2 completion: Beta release announcement
- Phase 3 completion: Public launch

### Documentation
- Technical specs in `/docs`
- API docs auto-generated
- Changelog maintained

---

## Getting Started

### For Developers
1. Read [IMPLEMENTATION_GUIDELINES.md](../implementation/IMPLEMENTATION_GUIDELINES.md)
2. Review [tab system architecture](../implementation/tab-system/ARCHITECTURE.md)
3. Check out `feature/new-tab-system` branch
4. Run `npm run test:watch` during development

### For Architects
1. Review [DATA_LAYER_STRATEGY.md](../architecture/DATA_LAYER_STRATEGY.md)
2. Study [DEPLOYMENT_SPECIFICATION.md](../architecture/deployment-modes/DEPLOYMENT_SPECIFICATION.md)
3. Attend architecture review meetings

### For Project Managers
1. Track progress in MASTER_ROADMAP.md
2. Monitor success metrics dashboard
3. Coordinate cross-team dependencies

---

## Frequently Asked Questions

**Q: Why not keep the current tab system and fix bugs?**

A: The current dual-state system (React Router + TabStore) has fundamental architectural issues. Patching would be temporary and accumulate more technical debt. The URL-driven approach is simpler, more robust, and aligns with web standards.

**Q: Can we skip Phase 1 and go directly to Phase 2?**

A: No. Phase 1 establishes the foundation (tab system + data layer) that Phases 2 and 3 depend on. Attempting to skip would cause integration issues.

**Q: How do we ensure zero data loss during migration?**

A: Multiple strategies:
1. Comprehensive backup before any migration
2. Dry-run migrations in staging
3. Gradual rollout (1% → 10% → 50% → 100%)
4. One-click rollback capability
5. Data validation checks at each step

**Q: What happens to the old RxDB/PouchDB code?**

A: Gradual deprecation:
- Phase 1: New code runs alongside old code (feature flags)
- Phase 2: Old code marked deprecated
- Phase 3: Old code removed

**Q: How does this support the mobile future?**

A: The unified data layer abstracts storage details. Mobile apps use the same hooks but with SQLite provider. Sync engine works across all platforms.

---

## Support & Resources

- **Slack:** #schoolpilot3-roadmap
- **Wiki:** https://wiki.company.com/schoolpilot3
- **Issues:** GitHub Issues with `roadmap` label
- **Meetings:** Architecture review - Thursdays 2pm

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-08  
**Next Review:** Weekly on Mondays
