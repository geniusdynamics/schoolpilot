# Comprehensive Database Management System Implementation Plan

## Summary
Design and implement a robust database management system that builds upon the existing dual-database architecture. The system will prioritize SQLite WASM (and LiveStore) for production environments while maintaining PouchDB compatibility. Key features include realistic demo data generation via `UniversalDataGenerator`, secure and auditable database clearing, thread-safe environment switching with rollback, ACID transaction support for SQLite, SQLCipher-based encryption, and comprehensive documentation and testing.

## Current State Analysis
- **Architecture**: The application currently uses `UnifiedDatabaseManager`, `DataModeManager`, and `DatabaseProviderFactory` to manage different storage engines (`sqlite-wasm`, `sqlite-file`, `pouchdb`, `backend-api`).
- **Demo Data**: `DataModeManager` has a hardcoded, simplistic `generateSeedData` method. A much more powerful `UniversalDataGenerator` exists but is not fully integrated into the standard mode-switching flow.
- **Clearing**: `clearAllData` drops collections but lacks strict environment safeguards, confirmation tokens, or audit logging.
- **Environment Switching**: `switchMode` works but lacks thread-safety guarantees under concurrent requests and comprehensive rollback mechanisms if a provider fails to initialize.
- **CRUD & Transactions**: `ICollection` defines standard CRUD, but lacks a formal `transaction` API. 
- **Security**: No native encryption at rest (SQLCipher) is currently implemented.

## Proposed Changes

### 1. Demo Database Implementation
- **File**: `src/services/dataModeManager.ts`
- **What/How**: 
  - Replace the hardcoded `generateSeedData` with the `UniversalDataGenerator`.
  - Implement a configuration parameter to specify the scale of demo data (e.g., `small`, `medium`, `large`).
  - Add data validation checks post-loading to ensure referential integrity (e.g., verifying foreign keys between students and classes).

### 2. Database Clearing Functionality
- **File**: `src/services/dataModeManager.ts`
- **What/How**:
  - Add a `securityToken` or `confirmationPhrase` requirement to `clearAllData`.
  - Implement a strict environment check: immediately reject clearing operations if `environment === 'production'` unless an explicit, highly privileged override is provided.
  - Create an `audit_logs` collection (or append to a secure file in Node environments) that records the timestamp, user ID (if available), and outcome of the clearing operation.

### 3. Environment Switching Mechanism
- **File**: `src/services/dataModeManager.ts` & `src/services/database/UnifiedDatabaseManager.ts`
- **What/How**:
  - Implement a mutex or queue in `DataModeManager` to ensure `switchMode` is thread-safe and prevents race conditions if called multiple times rapidly.
  - Enhance the rollback capability: if switching to a new provider fails, automatically restore the previous provider and its configuration.
  - Ensure all configuration changes synchronize seamlessly with `dataLayerConfig.ts`.

### 4. Production CRUD & Transaction Management
- **File**: `src/services/database/interfaces.ts` & Provider Implementations
- **What/How**:
  - Add a `transaction<T>(callback: (tx: ITransaction) => Promise<T>): Promise<T>` method to `IDatabaseProvider` and `ICollection`.
  - **SQLite WASM/LiveStore**: Implement native SQLite transactions using `BEGIN`, `COMMIT`, and `ROLLBACK`.
  - **PouchDB**: Implement a simulated application-level lock or throw a "Not Supported natively" warning depending on the operation strictness.
  - Integrate RBAC (Role-Based Access Control) checks into the core CRUD wrappers to ensure proper authorization.

### 5. Data Encryption & Performance (Technical Specs)
- **File**: `src/services/database/SQLiteWASMProvider.ts` & `src/services/database/ConnectionPool.ts`
- **What/How**:
  - **Encryption**: Integrate SQLCipher into the SQLite WASM build process. Add an `encryptionKey` parameter to `DatabaseConfig`.
  - **Connection Pooling**: Implement a Web Worker-based connection pool for SQLite WASM to handle concurrent read/write operations efficiently without blocking the main thread.
  - **Logging & Metrics**: Enhance `UnifiedDatabaseManager` to track query execution times, memory usage, and error rates, exposing these via `ProviderStatus`.

### 6. Documentation Requirements
- **File**: `docs/database/` (New and updated files)
- **What/How**:
  - Create Mermaid schema diagrams representing the core entities and their relationships.
  - Document the internal `IDatabaseProvider` APIs and external Backend API endpoints.
  - Provide a step-by-step deployment and maintenance guide (including how to rotate encryption keys and backup data).

### 7. Testing Requirements
- **File**: `src/services/database/__tests__/`
- **What/How**:
  - **Unit Tests**: Test the new `transaction` APIs and ensure rollbacks work when errors are thrown.
  - **Integration Tests**: Test the thread-safety of the environment switching mechanism under simulated concurrent load.
  - **Security Tests**: Verify that the database file is unreadable without the correct SQLCipher key.
  - **Load Tests**: Benchmark the SQLite connection pool with high-volume CRUD operations.

## Assumptions & Decisions
- **Primary Engine**: SQLite WASM (and LiveStore) will be the primary focus for advanced features like transactions and encryption, as PouchDB's architecture doesn't natively map to these in the same way.
- **PouchDB Support**: PouchDB will remain fully supported for users who require CouchDB synchronization, but they will accept limitations regarding native ACID transactions.
- **Encryption**: SQLCipher will be used for encryption at rest in production environments. Keys will be managed by the host application (e.g., derived from user passwords or secure environment variables).

## Verification Steps
1. **Demo Seeding**: Run `npm run dev`, switch to demo mode, and verify that the `UniversalDataGenerator` populates the UI with rich, realistic data without errors.
2. **Clearing Security**: Attempt to call `clearAllData()` while in production mode without a token and assert that it throws an error.
3. **Transactions**: Write a test that inserts a student, intentionally throws an error, and asserts that the student was rolled back and does not exist in the database.
4. **Encryption**: Initialize the SQLite provider with an encryption key, write data, close the connection, and attempt to read the raw OPFS file to ensure the data is ciphered.
5. **Load Testing**: Run the existing (or newly created) performance benchmark tests to ensure the connection pool maintains steady throughput under concurrent queries.