# Next Steps Roadmap - EduGen Development
**Date:** December 29, 2024  
**Purpose:** Concrete short-term tasks for immediate implementation  
**Context:** Following successful application setup and initial data architecture implementation

## Immediate Priority Tasks

### 1. Implement `useRxDBData.ts` CRUD Parity with Mocks
**Location:** `src/composables/useRxDBData.ts`
**Status:** Not Started
**Priority:** High

**Objectives:**
- Ensure complete CRUD operation parity between RxDB implementation and existing mock data system
- Maintain consistent API interface for components
- Preserve all existing functionality during transition

**Specific Tasks:**
- [ ] Review current mock CRUD operations in existing composables
- [ ] Implement matching create operations in RxDB composable
- [ ] Implement matching read/query operations with proper filtering
- [ ] Implement matching update operations with validation
- [ ] Implement matching delete operations with cascade handling
- [ ] Add proper error handling and loading states
- [ ] Test data transformation between mock format and RxDB schema

**Success Criteria:**
- All existing components work seamlessly with RxDB backend
- No breaking changes to component interfaces
- Performance matches or exceeds mock implementation

### 2. Guarded Seeding/Clearing Logic
**Location:** `src/services/dataService.ts` and related seed utilities
**Status:** Not Started
**Priority:** High

**Objectives:**
- Implement intelligent data seeding that respects existing user data
- Prevent accidental data loss during development/testing
- Provide clear distinction between demo and production data states

**Specific Tasks:**
- [ ] Create data state detection mechanism
- [ ] Implement "has user data" check before seeding
- [ ] Add confirmation prompts for destructive operations
- [ ] Create safe demo data reset functionality
- [ ] Implement data backup before major operations
- [ ] Add logging for all seeding/clearing operations
- [ ] Create migration utilities for data schema changes

**Business Rules:**
- Never automatically re-import seed data if user has entered custom data
- Always prompt before clearing existing data
- Maintain audit trail of data operations
- Distinguish between demo mode and production mode operations

**Success Criteria:**
- No accidental data loss during normal operations
- Clear user feedback for all data operations
- Reliable demo mode reset capability

### 3. Minimal Unit Test Scaffolding (TDD)
**Location:** `tests/unit/` directory structure
**Status:** Not Started  
**Priority:** Medium-High

**Representative CRUD Path:** Student Management Operations
**Focus:** Create → Read → Update → Delete flow for Student entity

**Specific Tasks:**
- [ ] Set up Jest/Vitest testing framework configuration
- [ ] Create test utilities for RxDB database setup/teardown
- [ ] Write failing tests for student creation flow
- [ ] Implement minimal code to pass student creation tests
- [ ] Write failing tests for student retrieval operations
- [ ] Implement code to pass student retrieval tests
- [ ] Write failing tests for student update operations
- [ ] Implement code to pass student update tests
- [ ] Write failing tests for student deletion operations
- [ ] Implement code to pass student deletion tests
- [ ] Add integration tests for complete CRUD cycle

**Test Coverage Goals:**
- 100% coverage for selected CRUD path
- Error handling scenarios
- Edge cases (empty data, invalid inputs)
- Performance benchmarks

**Success Criteria:**
- All tests pass consistently
- Clear test structure for future expansion
- TDD workflow established and documented

### 4. Manual Smoke Test Checklist
**Location:** `docs/testing/smoke_test_checklist.md`
**Status:** Not Started
**Priority:** Medium

**Demo Mode Tests:**
- [ ] Application loads with sample data
- [ ] All navigation routes accessible
- [ ] Sample students, teachers, classes visible
- [ ] CRUD operations work on sample data
- [ ] Data resets properly between demo sessions
- [ ] No data persistence beyond session

**Production Mode Tests:**
- [ ] Application loads with empty/user data
- [ ] User can create new entities from scratch
- [ ] Data persists between sessions
- [ ] No sample data interference
- [ ] Backup/export functionality works
- [ ] Data integrity maintained across operations

**Cross-Mode Tests:**
- [ ] Mode switching works without corruption
- [ ] Clear indicators of current mode
- [ ] Appropriate warnings for destructive operations
- [ ] Performance acceptable in both modes

**Browser Compatibility:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Success Criteria:**
- All smoke tests pass in both modes
- Clear documentation for manual testing procedures
- Reliable mode detection and switching

## Implementation Timeline

**Week 1:** Focus on useRxDBData.ts CRUD parity
**Week 2:** Implement guarded seeding/clearing logic
**Week 3:** Establish TDD workflow with unit tests
**Week 4:** Create and validate smoke test checklist

## Dependencies and Risks

**Dependencies:**
- RxDB schema definitions must be stable
- Mock data structure documentation
- Component interface contracts

**Risks:**
- Data migration complexity
- Performance degradation during transition
- Breaking changes to existing functionality

**Mitigation Strategies:**
- Incremental implementation with feature flags
- Comprehensive backup procedures
- Parallel mock system maintenance during transition

## Success Metrics

1. **Functionality:** 100% feature parity between mock and RxDB systems
2. **Reliability:** Zero data loss incidents during implementation
3. **Testing:** Complete TDD coverage for selected CRUD path
4. **Usability:** Smooth demo vs production mode experience

## Next Review Date
**Scheduled:** January 5, 2025
**Participants:** Development team
**Agenda:** Progress review and timeline adjustment
