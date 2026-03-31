# Database Management System Documentation

## Architecture Overview
The system employs a dual-database architecture managed by the `UnifiedDatabaseManager` and `DataModeManager`. It abstracts the underlying storage engines through the `IDatabaseProvider` interface, allowing seamless switching between environments.

### Supported Providers
1. **SQLite WASM + OPFS** (Recommended for Production/Offline)
   - High performance, local-first.
   - Supports native ACID transactions.
   - Supports at-rest encryption via SQLCipher.
2. **PouchDB** (Recommended for CouchDB syncing)
   - Excellent network sync capabilities.
   - Transactions are simulated/best-effort.
3. **SQLite File** (Development only)
   - Uses local Node/Electron file system for easy debugging.

## Environment Switching
Switching between `development`, `demo`, and `production` is handled by `DataModeManager.switchMode()`.
- **Thread-Safety**: Mode switches are queued. Concurrent requests will not corrupt the provider state.
- **Rollback**: If a new provider fails to initialize, the system automatically rolls back to the previous configuration.

## Demo Data Management
Demo data is populated by directly invoking all 10 specialized module generators and writing their output into the application's real `ICollection` collections.

- **Invocation**: `dataModeManager.seedDemoData('tiny' | 'small' | 'medium' | 'large' | 'enterprise')`
- **Volume Presets**:
  | Preset | Students | Staff | Classes | Subjects | Books | Vehicles | Inventory | Dormitories | Clubs |
  |--------|---------|-------|---------|----------|-------|----------|-----------|-------------|-------|
  | Tiny   | 30      | 10    | 4       | 12       | 50    | 3        | 30        | 2           | 5     |
  | Small  | 150     | 30    | 8       | 20       | 300   | 8        | 100       | 5           | 12    |
  | Medium | 500     | 75    | 20      | 30       | 800   | 15       | 250       | 10          | 25    |
  | Large  | 1500    | 200   | 50      | 40       | 2000  | 30       | 600       | 20          | 50    |
  | Enterprise | 5000 | 500  | 120     | 50       | 5000  | 60       | 1200      | 40          | 80    |

### Supported Modules (10 Generators)
| Module | Entity Types |
|--------|-------------|
| **Academics** | students, subjects, classes, grades, exams, assignments |
| **Administration** | academic_years, semesters, departments, designations, houses |
| **Finance** | voteheads, fee_templates, student_fees, transactions, invoices, expenses, budgets |
| **Clubs** | club_categories, clubs, club_members, club_events, achievements |
| **Dormitory** | dormitory_blocks, dormitory_rooms, dormitory_assignments |
| **Library** | authors, publishers, book_categories, book_types, books, book_loans |
| **Nutrition** | meal_plans, dietary_requirements, meal_schedules, meal_assignments |
| **Payroll** | salary_grades, allowance_types, deduction_types, staff_salaries, payroll_periods |
| **Inventory** | suppliers, inventory_items, purchase_orders, stock_issues |
| **Transport** | transport_routes, vehicles, drivers, route_assignments, transport_fees |
| **Health** | medical_conditions, health_facilities, student_health_records, screenings |

- **Data lands in your real provider**: Records are inserted directly into the active `IDatabaseProvider`'s collections — not an isolated internal database.
- **Dynamic collection creation**: If a collection doesn't exist on the provider, it is automatically created before data is inserted.
- **Kenyan context**: All data (names, currency, locations, institutions) uses Kenyan/African realistic values.

## Secure Data Clearing
Data clearing (`clearAllData()`) drops all core collections.
- **Security Check**: By default, it will **throw an error** if executed in the `production` environment.
- **Overrides**: To clear production data, you must pass `{ force: true, confirmationToken: 'DANGER_CLEAR_PRODUCTION_DATA' }`.
- **Audit Logging**: Every clear operation is logged to the `audit_logs` collection with a timestamp and environment tag.

## Production CRUD & Transactions
All database operations use the `ICollection` interface.

```typescript
const provider = DatabaseProviderFactory.getActiveProvider();
const students = provider.getCollection('students');

// Standard CRUD
await students.insert({ id: '1', name: 'John' });
const student = await students.findById('1');

// Transactions (Native in SQLite WASM)
await provider.transaction(async (tx) => {
    try {
        await students.insert({ id: '2', name: 'Jane' });
        await classes.insert({ id: '101', name: 'Math' });
        // If no error is thrown, the transaction commits automatically.
    } catch (err) {
        // If an error is thrown, the transaction rolls back automatically.
        throw err;
    }
});
```

## Data Encryption
In production, sensitive data can be encrypted at rest using **SQLCipher**.
Provide an `encryptionKey` in the `DatabaseConfig` during initialization. The `SQLiteWASMProvider` will execute `PRAGMA key = 'your-key'` before any queries are executed.

## Schema Diagram

```mermaid
erDiagram
    STUDENT ||--o{ ENROLLMENT : has
    CLASS ||--o{ ENROLLMENT : contains
    TEACHER ||--o{ CLASS : teaches
    SUBJECT ||--o{ CLASS : categorizes
    STUDENT ||--o{ GRADE : receives
    STUDENT ||--o{ FEE_RECORD : pays
    LIBRARY_BOOK ||--o{ BOOK_LOAN : loaned_to
    VEHICLE ||--o{ ROUTE_ASSIGNMENT : assigned_to
    STAFF ||--o{ PAYROLL_RECORD : receives

    STUDENT {
        string id PK
        string firstName
        string lastName
        string email
        string gender
        date dateOfBirth
    }

    TEACHER {
        string id PK
        string firstName
        string department
        string email
    }

    CLASS {
        string id PK
        string className
        string formLevel
        string teacherId FK
    }

    SUBJECT {
        string id PK
        string subjectName
        string subjectCode
    }

    GRADE {
        string id PK
        string studentId FK
        string subjectId FK
        int marksObtained
        string gradeLetter
    }
```
