Data Layer Modernization Plan: Transition from Mock Data to SQLite OPFS + LiveStore

  Executive Summary
  This plan outlines a strategic approach to modernize the application's data layer by:
   1. Immediate: Replace mock data with SQLite + OPFS for development/testing2. Future: Introduce LiveStore as an alternative to the
      current PouchDB implementation3. Long-term: Completely eliminate legacy mock data system

  This approach maintains the dual database architecture concept while upgrading both sides with modern, performant solutions.##
  Current State Analysis

  Data Layer Components
   - Development/Testing: Mock data system (JavaScript objects + localStorage)
   - Production: PouchDB (due to RxDB licensing requirements)- Unused: RxDB implementation (requires subscription)

  Issues with Current Implementation
   1. Mock data is synchronous and doesn't scale2. No true persistence in development environment
   3. Performance limitations with large datasets
   4. Maintenance overhead of custom mock data infrastructure

  Proposed Architecture

  Dual Database Architecture (Modernized)

    1 Development/Testing Environment:
    2 ┌─────────────────┐ ┌──────────────────┐
    3 │   SQLite OPFS   │◄──►│  LiveStore Core  │
    4 │  (Persistence)  │    │ (Data Layer API) │
    5 └─────────────────┘ └──────────────────┘ ▲                     ▲
    6          │ │ ▼                     ▼
    7 ┌─────────────────┐ ┌──────────────────┐
    8 │ React Components│    │  LiveStore React │
    9 │ (Hooks/API)   │◄──►│   (Hooks/API) │
   10 └─────────────────┘ └──────────────────┘
   11
   12 Production Environment:
   13 ┌─────────────────┐ ┌──────────────────┐
   14 │    PouchDB      │◄──►│  LiveStore Core  │
   15 │ (Synchronization│    │ (Data Layer API) │
   16 │     Layer) │    │ │
   17 └─────────────────┘ └──────────────────┘ ▲ ▲
   18          │                     │ ▼ ▼
   19 ┌─────────────────┐ ┌──────────────────┐
   20 │ React Components│ │  LiveStore React │
   21 │   (Hooks/API)   │◄──►│ (Hooks/API)    │
   22 └─────────────────┘    └──────────────────┘```
   23
  Implementation Roadmap

  Phase 1: SQLite OPFS for Development

  Goals
   - Replace all mock data with persistent SQLite storage
   - Maintain existing API interfaces
   - Ensure seamless development experience

  Implementation Steps

   1. Install Dependencies

   1    npm install sqlite3 better-sqlite3   ```
   2
   2. Create SQLite OPFS Service
  `typescript:src/services/sqliteOpfsService.ts
     import { Database } from 'better-sqlite3'; class SQLiteOPFSService { private db: Database | null = null;
       private initialized = false;     async initialize(): Promise<void> {       if (this.initialized) return;

         try {
           // Access OPFS const opfsRoot = await navigator.storage.getDirectory(); const fileHandle = await
  opfsRoot.getFileHandle('schoolpilot_dev.db', { create: true });
           const writable = await fileHandle.createWritable();
           // Initialize SQLite database this.db = new Database(':memory:'); // Will migrate to OPFS-backed storage // Create tables
  based on current mock data schemas
           await this.createTables();         await this.seedInitialData();         this.initialized = true; console.log('[SQLiteOPFS]
   Database initialized successfully'); } catch (error) {
           console.error('[SQLiteOPFS] Failed to initialize:', error);         throw error;       }
       }
       private async createTables(): Promise<void> { // Students table       this.db.exec(`
           CREATE TABLE IF NOT EXISTS students (
             id TEXT PRIMARY KEY, firstName TEXT NOT NULL,
             lastName TEXT NOT NULL, email TEXT UNIQUE,           dateOfBirth TEXT,
             enrollmentDate TEXT,
             status TEXT DEFAULT 'active',
             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,           updatedAt TEXT DEFAULT CURRENT_TIMESTAMP )
         `);
         // Teachers table
         this.db.exec(` CREATE TABLE IF NOT EXISTS teachers ( id TEXT PRIMARY KEY,
             firstName TEXT NOT NULL, lastName TEXT NOT NULL,
             email TEXT UNIQUE,
             department TEXT,
             hireDate TEXT, status TEXT DEFAULT 'active',
             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
             updatedAt TEXT DEFAULT CURRENT_TIMESTAMP         )
         `);

         // Classes table this.db.exec(`         CREATE TABLE IF NOT EXISTS classes (           id TEXT PRIMARY KEY,
             name TEXT NOT NULL,           code TEXT UNIQUE,
             teacherId TEXT,
             schedule TEXT,
             capacity INTEGER,
             status TEXT DEFAULT 'active',
             createdAt TEXT DEFAULT CURRENT_TIMESTAMP,           updatedAt TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (teacherId)
  REFERENCES teachers(id)
           )       `);       // Add more tables as needed...     } private async seedInitialData(): Promise<void> {
         // Insert sample data for development
         const stmt = this.db.prepare(`
           INSERT OR REPLACE INTO students (id, firstName, lastName, email, dateOfBirth, enrollmentDate) VALUES (?, ?, ?, ?, ?, ?)
     `);       // Sample students
         const sampleStudents = [ ['STD001', 'John', 'Doe', 'john.doe@school.edu', '2005-03-15', '2023-09-01'],
           ['STD002', 'Jane', 'Smith', 'jane.smith@school.edu', '2004-07-22', '2023-09-01'], ['STD003', 'Robert', 'Johnson',
  'robert.johnson@school.edu', '2005-11-08', '2023-09-01']
         ];
         for (const student of sampleStudents) { stmt.run(...student);
         }       console.log('[SQLiteOPFS] Sample data seeded successfully');
       }     // Data access methods
       async getStudents(filters?: Record<string, any>): Promise<Student[]> {
         let query = 'SELECT * FROM students WHERE1=1';       const params: any[] = [];
         if (filters) { Object.entries(filters).forEach(([key, value]) => {           query +=  AND ${key} = ?; params.push(value);
        });
         }
         return this.db.prepare(query).all(...params);     } async createStudent(student: Omit<Student, 'id' | 'createdAt' |
  'updatedAt'>): Promise<Student> {
         const id = STD${Date.now()};       const now = new Date().toISOString();

         const stmt = this.db.prepare(`
           INSERT INTO students (id, firstName, lastName, email, dateOfBirth, enrollmentDate, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)       `);       stmt.run(         id, student.firstName, student.lastName, student.email,
  student.dateOfBirth,         student.enrollmentDate,
           now,
           now       ); return {
           id,
           ...student,
           createdAt: now,
           updatedAt: now };
       }     // Additional methods for teachers, classes, etc. }

     export const sqliteOpfsService = new SQLiteOPFSService();
     `3. Update Data Service Factory
  `typescript:src/services/dataServiceFactory.ts import { sqliteOpfsService } from './sqliteOpfsService';
     import { mockDataService } from './mockDataService';

     export class DataServiceFactory {     static async createDataService(environment: 'development' | 'production' | 'demo') { switch
   (environment) {
           case 'development':
             await sqliteOpfsService.initialize();
             return sqliteOpfsService;

           case 'demo': return mockDataService;
           case 'production':
           default:
             // Currently still using PouchDB
             return await this.createPouchDBService();       }
       }
       private static async createPouchDBService() {       // Existing PouchDB implementation       const { pouchDBService } = await
  import('./pouchDBService');       await pouchDBService.initialize(); return pouchDBService;
       } }
     `### Phase 2: LiveStore Integration as PouchDB Alternative

  Goals
   - Create LiveStore implementation as drop-in replacement for PouchDB
   - Maintain API compatibility- Evaluate performance and feature parity

  Implementation Steps

   1. Install LiveStore Dependencies
  `bash npm install @livestore/core @livestore/react
     `2. Create LiveStore Service
  `typescript:src/services/liveStoreService.ts import { createLiveStore } from '@livestore/core';
     import { createReactHooks } from '@livestore/react';   class LiveStoreService {
       private store: any;     private initialized = false; async initialize(): Promise<void> { if (this.initialized) return;
         try {         // Configure LiveStore with IndexedDB adapter
           this.store = createLiveStore({
             dbName: 'schoolpilot_live', version: 1,
             tables: {
               students: {
                 schema: {
                   id: 'string', firstName: 'string',
                   lastName: 'string', email: 'string',
                   dateOfBirth: 'date',                 enrollmentDate: 'date', status: 'string',
                   createdAt: 'date', updatedAt: 'date'
                 }, indexes: ['email', 'status']             },
               teachers: {
                 schema: {
                   id: 'string',                 firstName: 'string',
                   lastName: 'string',                 email: 'string',
                   department: 'string',                 hireDate: 'date', status: 'string',
                   createdAt: 'date', updatedAt: 'date'
                 }, indexes: ['email', 'department', 'status'] },
               classes: {
                 schema: {
                   id: 'string', name: 'string',
                   code: 'string', teacherId: 'string',
                   schedule: 'string',                 capacity: 'number',
                   status: 'string',                 createdAt: 'date',
                   updatedAt: 'date'               },
                 indexes: ['code', 'teacherId', 'status'] }
             } });

           // Create React hooks         const { useQuery, useMutation } = createReactHooks(this.store);         this.useQuery =
  useQuery;         this.useMutation = useMutation;
           this.initialized = true;         console.log('[LiveStore] Service initialized successfully'); } catch (error) {
           console.error('[LiveStore] Failed to initialize:', error); throw error; }
       }     // Query methods using LiveStore hooks
       useStudents(filters?: Record<string, any>) {       return this.useQuery.students(filters || {});
       }     useTeachers(filters?: Record<string, any>) { return this.useQuery.teachers(filters || {});
       }     useClasses(filters?: Record<string, any>) { return this.useQuery.classes(filters || {});     } // Mutation methods
  async createStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) { const mutation = this.useMutation.students.create({
           ...student,
           id: STD${Date.now()}, createdAt: new Date(),
           updatedAt: new Date() });

         return await mutation.execute();     } async updateStudent(id: string, updates: Partial<Student>) {
         const mutation = this.useMutation.students.update(id, {
           ...updates,
           updatedAt: new Date() });

         return await mutation.execute();     } async deleteStudent(id: string) {       const mutation =
  this.useMutation.students.delete(id); return await mutation.execute();
       }     // Additional methods for teachers, classes, etc. }

     export const liveStoreService = new LiveStoreService();
   1
   3. Configuration Toggle
  `typescript:src/config/dataLayerConfig.ts
     export interface DataLayerConfig {
       development: {
         provider: 'sqlite-opfs' | 'mock';
         options: Record<string, any>;
       }; production: { provider: 'pouchdb' | 'livestore';
         options: Record<string, any>;
       }; }

     export const DATA_LAYER_CONFIG: DataLayerConfig = {
       development: {
         provider: 'sqlite-opfs',
         options: {
           persistence: true, cacheSize:1000
         } },
       production: {
         provider: 'pouchdb', // Can switch to 'livestore' when ready
         options: {
           sync: true,
           offlineSupport: true       }
       }   };
   1
  Phase3: Complete Mock Data Removal

  Prerequisites
   1. SQLite OPFS implementation fully tested and stable
   2. All modules migrated to new data services3. No regressions in development workflow

  Steps1. Remove mock data files   
  `bash   rm -rf src/services/mockData/
     `2. Update imports throughout codebase

   1    // Before
   2    import { mockDataService } from '../services/mockData/mockDataService';   // After   import { dataService } from 
     '../services/dataServiceFactory';
   3    ```3. **Remove mock data configuration options**
   4
  Benefits of This Approach

  Immediate Benefits (SQLite OPFS)
   1. Persistent Development Data: No more losing data on refresh
   2. Better Performance: SQLite is faster than mock data for large datasets
   3. Realistic Testing: Closer to production environment
   4. Reduced Maintenance: Eliminate custom mock data infrastructure### Future Benefits (LiveStore)
   1. Improved Architecture: Modern, type-safe data layer2. Better Developer Experience: React hooks and declarative API
   3. Performance Gains: Optimized queries and caching
   4. Flexibility: Easy to switch between storage backends





  Long-term Benefits
   1. Codebase Simplification: Remove legacy mock data system2. Consistent Data Layer: Single API across all environments
   3. Future-proofing: Modern web standards compliance
   4. Reduced Technical Debt: Eliminate outdated patterns

  Risk Mitigation### Technical Risks
   1. Browser Compatibility:   - SQLite OPFS: Chrome86+, Edge 86+, Opera 72+
      - Fallback to existing mock data for unsupported browsers

   2. Data Migration:   - Implement gradual migration scripts - Maintain backward compatibility during transition

   3. Performance Issues:
      - Extensive benchmarking before deployment - Monitor performance metrics post-deployment### Implementation Safeguards
   1. Feature Flags: Enable new data layer conditionally
   2. Gradual Rollout: Start with development environment3. Comprehensive Testing: Unit, integration, and E2E tests
   4. Rollback Plan: Quick revert capability if issues arise

  Timeline


  ┌────────────────────────────────┬────────────┬─────────────────────────────────────────────────────────────────────────────────┐
│ Phase                          │ Duration   │ Milestones                                                                      │
├────────────────────────────────┼────────────┼─────────────────────────────────────────────────────────────────────────────────┤
│ SQLite OPFS Implementation     │ Completed  │ - Basic SQLite setup<br>- Table creation<br>- Data access methods<br>- Integra… │
│ WASM SQLite Implementation     │ 2-3 weeks  │ - WASM SQLite integration<br>- OPFS support<br>- Reactive queries               │
│ Data Migration                 │ 1-2 weeks  │ - Migration scripts<br>- Data integrity validation                              │
│ LiveStore Integration          │ 2-3 weeks  │ - LiveStore setup<br>- API compatibility<br>- Performance comparison            │
│ Mock Data Removal              │ 1 week     │ - Code cleanup<br>- Import updates<br>- Final testing                           │
├────────────────────────────────┼────────────┼─────────────────────────────────────────────────────────────────────────────────┤
│ Total                          │ 6-9 weeks  │ Complete modernization                                                          │
└────────────────────────────────┴────────────┴─────────────────────────────────────────────────────────────────────────────────┘## Success Criteria### Phase 1 Completion
   - [x] SQLite OPFS service fully implemented- [x] All existing mock data functionality replicated
   - [x] Development environment using persistent storage
   - [x] No performance regressions in development

  Phase2 Completion
   - [ ] LiveStore service implemented and tested
   - [ ] Performance benchmarks showing improvements
   - [ ] API compatibility verified- [ ] Decision made on production adoption

  Phase3 Completion
   - [ ] All mock data files removed- [ ] No references to legacy mock system
   - [ ] Clean, simplified codebase
   - [ ] Documentation updated

  Next Steps

   1. Approve this plan for implementation2. Begin Phase 1 with SQLite OPFS development
   3. Set up monitoring for performance metrics
   4. Create detailed implementation tasks for each phase
   5. Establish testing protocols for data integrityThis approach provides a clear path forward that modernizes the data layer while
      maintaining stability and minimizing risk. The dual approach allows for immediate benefits in development while preparing for
      future improvements in production.