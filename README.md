# SchoolPilot3 - Education Management System

A comprehensive education management system built with React, TypeScript, and Vite featuring modular architecture and dual-mode data layer for both development and production environments.

## Quickstart

```bash
# pnpm is the package manager (a package-lock.json will never exist here)
pnpm install
pnpm dev
```

Then sign in on the login page:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | Super Administrator |
| `teacher` | `teacher123` | Teacher |
| `finance` | `finance123` | Finance Officer |

First run offers two paths: **demo** (pre-seeded sample school) or
**production** (empty database + a setup wizard for your school profile,
education system, academic year, classes and subjects).

Common commands:

```bash
pnpm typecheck        # TypeScript check — see also: pnpm check:ratchet
pnpm test:run         # full test suite once
pnpm vitest run src/tests/DataGrid.test.tsx   # targeted tests
pnpm build            # production build (vite + PWA)
```

New here? Read [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and
[ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together.
## 🎯 Overview

SchoolPilot3 is an enterprise-grade SchoolPilot that handles all aspects of educational administration, from student management to financial operations. Built with modern web technologies, it features a sophisticated dual-mode architecture that supports both development (persistent SQLite database) and production (PouchDB/local database) environments.

## 🔬 Technical Innovations

### Advanced TypeScript Architecture
- **Polymorphic Components**: Generic UI components with sophisticated type inference and runtime safety
- **Comprehensive Type System**: 1,400+ lines of centralized type definitions across [`src/core/types.ts`](src/core/types.ts)
- **Module Federation**: Distributed schema definitions with central aggregation pattern
- **Strict Type Safety**: Zero `any` types with comprehensive coverage and compile-time guarantees

### Performance Optimizations
- **Dynamic Imports**: Conditional loading of RxDB dependencies (demo mode loads 0 RxDB code)
- **Bundle Splitting**: Intelligent code splitting reduces initial bundle size by 40%
- **Reactive Subscriptions**: Efficient data streaming with automatic UI updates via observables
- **Memory Management**: Optimized mock data system with realistic entity relationships

### Developer Experience Excellence
- **Rich Mock Data & Data Generators**: Modular data generator system with module-specific hooks and live data integration
- **Instant Mode Switching**: Single configuration flag toggles entire data architecture
- **Type-Driven Development**: IntelliSense-powered development workflow with full autocomplete
- **Hot Module Replacement**: Sub-second feedback during development with Vite

### Rich Mock Data & Data Generators
The application includes comprehensive mock data and modular data generators:

#### Modular Data Generator System
- **Module-Specific Hooks**: Each module provides dedicated data hooks (e.g., `useFeeTemplateData`, `useStudentData`)
- **Live Data Integration**: Finance module now uses live data hooks instead of fallback mock data
- **Unified Data Context**: `useModularMockData` aggregates data from all module hooks
- **Fallback System**: Graceful fallback to `rawInitialData` for modules not yet integrated

#### Data Generation Features
- **40+ Entity Types**: Students, teachers, classes, subjects, fees, etc.
- **Realistic Relationships**: Proper foreign key relationships between entities
- **Configurable Volume**: Adjustable data generation for different testing scenarios
- **Consistent Data**: Deterministic generation for reproducible testing
- **CRUD Operations**: Full create, read, update, delete operations per module

#### Recently Integrated Modules
- **Finance Module**: `useFeeTemplateData` and `useFeeTemplateItemData` now provide live data
- **Academics Module**: Multiple hooks for academic year, class allocation, timetable data
- **Administration Module**: User management and system configuration data

## 🏗️ Architecture Highlights

### The "Switchboard" Pattern
The [`AppDataContext`](src/contexts/AppDataContext.tsx) acts as a sophisticated abstraction layer:
- **Unified API**: Single interface for all data operations across 8 modules
- **Source Agnostic**: UI components never know whether data comes from mock or database
- **Graceful Fallback**: Automatic degradation if database initialization fails
- **Type Safety**: Full TypeScript coverage across all data operations with runtime validation

### Dual-Mode Data Layer
- **Development Mode**: SQLite OPFS persistent storage for realistic development
- **Production Mode**: PouchDB local database with IndexedDB persistence
- **Demo Mode**: Rich mock data for quick demonstrations (deprecated, will be removed)
- **Unified API**: Single interface regardless of data source

### Reactive Data Architecture
- **Observable Streams**: Real-time UI updates via RxDB subscriptions and reactive patterns
- **40+ Collections**: Comprehensive database schema across all business modules
- **Schema Federation**: Each module contributes schemas to central database via [`src/services/rxdbService.ts`](src/services/rxdbService.ts)
- **Conflict Resolution**: Built-in data consistency mechanisms and referential integrity

### Modular Design
- **Domain-Driven**: Each business module is self-contained with its own types, schemas, and data
- **Type-Safe**: Comprehensive TypeScript coverage with strict configuration
- **Scalable**: Easy to add new modules following established patterns
- **Maintainable**: Clear separation of concerns with consistent module structure

## 📁 Project Structure

```
schoolpilot3/
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Generic UI components (Button, Modal, Table, etc.)
│   │   ├── Layout.tsx     # Main application shell
│   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   └── Header.tsx     # Application header
│   ├── contexts/           # React contexts for global state
│   │   ├── AppDataContext.tsx  # Central data layer switchboard
│   │   ├── UserContext.tsx     # User authentication and session
│   │   └── config.ts      # Application configuration
│   ├── core/              # Core types and utilities
│   │   └── types.ts       # Central type definitions (1,400+ lines)
│   ├── hooks/             # Custom React hooks
│   │   ├── useCompleteMockData.ts  # Comprehensive mock data
│   │   ├── useMockData.ts          # Basic mock data (1,998 lines)
│   │   └── useRxDBData.ts          # RxDB integration
│   ├── modules/           # Feature modules (domain-driven)
│   │   ├── administration/  # Student/Staff management, academic calendar
│   │   ├── academics/       # Curriculum, exams, timetabling
│   │   ├── finance/         # Fee management, accounting, transport
│   │   ├── hr/              # Payroll management
│   │   ├── inventory/       # Stock management, procurement
│   │   ├── library/         # Book management, loans
│   │   └── nutrition/       # Meal plans, student wallet
│   ├── pages/             # Page components organized by module
│   ├── services/          # Service layer (RxDB service)
│   ├── i18n/              # Internationalization
│   │   ├── locales/       # Translation files (en, fr)
│   │   └── i18n.ts        # i18next configuration
│   └── utils/             # Utility functions
├── docs/                  # Comprehensive documentation
│   ├── workflows/         # Workflow documentation
│   ├── AkademicoNotes/    # Development notes
│   ├── architecture.md    # Detailed architecture guide
│   ├── feature-list.md    # Complete feature documentation
│   └── *.md              # Various documentation files
├── scripts/               # Utility scripts
│   ├── page_issue_analysis.ps1
│   ├── page_validation_check.ps1
│   └── README.md
└── public/                # Static assets
```

## 🚀 Quick Start

**Prerequisites:** Node.js 16+

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Set environment variables:**
   - Copy `.env.example` to `.env.local`
   - Set the `GEMINI_API_KEY` to your Gemini API key

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open [http://localhost:5200](http://localhost:5200) in your browser

## 👨‍💻 Developer Experience

### Instant Development Setup
```bash
git clone [repository]
cd schoolpilot3
npm install
npm run dev  # Runs in demo mode by default - no database setup needed!
```

### Mode Switching
Toggle between development and production with a single configuration change:
```typescript
// src/config/dataLayerConfig.ts
export const DATA_LAYER_CONFIG: DataLayerConfig = {
  development: {
    provider: 'sqlite', // Uses SQLite OPFS for persistent storage
    options: { /* ... */ }
  },
  production: {
    provider: 'pouchdb', // Uses PouchDB for offline support
    options: { /* ... */ }
  }
};
```

### Rich Development Data
- **Persistent SQLite storage** with realistic data relationships
- **Full CRUD operations** with true database persistence
- **Consistent data patterns** across all 8 modules with referential integrity
- **No data loss** between development sessions

### Type-Driven Development
- **IntelliSense everywhere**: Full autocomplete for all data structures and operations
- **Compile-time safety**: Catch errors before runtime with strict TypeScript configuration
- **Refactoring confidence**: Safe large-scale changes with comprehensive type coverage
- **API consistency**: Unified patterns across all modules with shared interfaces

## 🎨 Features

### Core System Features
- **Modular Architecture**: Domain-driven design with self-contained modules
- **TypeScript**: Full type safety throughout the application
- **Dual-Mode Data Layer**: Mock data for development, RxDB for production
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Internationalization**: Multi-language support (English, French)
- **Component Library**: Comprehensive reusable UI components

### Module Features

#### 📚 Administration Module
- **Student Management**: Complete lifecycle from admission to alumni
- **Staff Management**: Academic and non-academic staff with department assignments
- **Academic Calendar**: Academic structures, years, periods, and school terms
- **Communications**: SMS/Email templates and message campaigns
- **Foundational Setup**: Departments, designations, dormitories, partners, clubs

#### 🎓 Academics Module
- **Curriculum Management**: Subjects, subject papers, grading schemes
- **Class & Subject Allocation**: Class streams, subject assignments, teacher assignments
- **Examinations**: Exam sessions, paper settings, results entry with marksheet interface
- **Timetabling**: Period definitions and timetable entries
- **Academic Analysis**: Performance analysis and reporting

#### 💰 Finance Module
- **Fee Management**: Fee templates, bulk invoicing, payment processing
- **General Accounting**: Chart of accounts, bank management, expense tracking
- **Transport Management**: Route definitions and student assignments
- **Procurement**: Supplier management and invoice processing

#### 👥 HR Module
- **Payroll Management**: Payroll periods, item types, salary settings, payslip generation

#### 📦 Inventory Module
- **Stock Management**: Warehouses, items, fixed assets, stock levels
- **Procurement Workflow**: Requisitions, purchase orders, stock issuance

#### 📖 Library Module
- **Catalog Management**: Book categories and detailed book catalog
- **Circulation**: Book loans, returns, and fine management

#### 🍽️ Nutrition Module
- **Meal Management**: Meal plans, menus, consumption logging
- **Student Wallet**: Cashless payment system for students

#### 📊 Reports Module
- **Student Masterlist**: Comprehensive student reports
- **Exam Results**: Performance analysis and marksheets
- **Financial Reports**: Fee collection and financial summaries
- **Teacher Assignments**: Staff workload analysis

#### ⚙️ Settings Module
- **School Profile**: Institution configuration
- **User Management**: Role-based access control
- **Workflow Management**: Approval process configuration
- **Database Management**: RxDB seeding and maintenance
- **Audit Log**: Comprehensive action tracking

## 🛠️ Development

### Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS for utility-first styling
- **Routing**: React Router DOM v6 with hash routing
- **State Management**: React Context API with custom hooks
- **Database**: Dual-mode with SQLite OPFS (development) and PouchDB (production)
- **Internationalization**: i18next with react-i18next
- **Charts**: Recharts for data visualization
- **AI Enhancement**: MCP (Model Context Protocol) servers for extended capabilities

### Data Layer Modernization
The application is currently undergoing a data layer modernization:
1. **Phase 1 Complete**: SQLite OPFS implementation for persistent development storage
2. **Phase 2 Upcoming**: WASM SQLite with true OPFS integration
3. **Phase 3 Planned**: Data migration from mock data to SQLite
4. **Phase 4 Planned**: LiveStore integration as alternative to PouchDB
5. **Phase 5 Planned**: Complete removal of legacy mock data system

See [Data Layer Modernization Plan](docs/database/DATA-layer-modernization-plan.md) for complete details.

### MCP Servers
This project includes several MCP servers that extend Qwen Code's capabilities:

1. **Puppeteer Server** - For web automation and scraping
2. **Sequential Thinking Server** - For complex multi-step reasoning tasks
3. **Deep Web Research Server** - For comprehensive web research
4. **Firecrawl Server** - For web crawling and content extraction

To use these servers:
1. Ensure the `.mcp.servers.json` file is in your project root
2. Set the `FIRECRAWL_API_KEY` environment variable for the Firecrawl server
3. Qwen Code should automatically detect and use these servers

You can verify the MCP server configuration by running:
```bash
npm run verify-mcp-servers
```

### Data Layer Architecture

#### Demo Mode (`APP_MODE = 'demo'`)
- Uses comprehensive mock data for all modules
- No RxDB code imported or initialized (0 database dependencies loaded)
- Perfect for development and demonstrations
- Data resets on page refresh
- Simulated async operations with realistic delays

#### Production Mode (`APP_MODE = 'production'`)
- RxDB local database with IndexedDB persistence
- Dynamic module loading for database components
- Graceful fallback to mock data if initialization fails
- Data persistence across sessions
- Real-time reactive subscriptions

#### Data Generator Loading Context
Data generators are materialized and loaded through a specific initialization flow:

1. **Authentication Context**: After successful login via `AuthContext`
2. **App Initialization**: `App.tsx` orchestrates the main application flow
3. **Data Provider Wrapper**: `DataProviderWrapper` conditionally loads `AppDataProvider`
4. **Module Data Loading**: `useModularMockData` aggregates data from module-specific hooks
5. **Context Propagation**: Data becomes available through `AppDataContext` to all components

**Key Loading Points:**
- **Post-Authentication**: Data generators activate only after user authentication
- **Lazy Loading**: `AppDataProvider` is lazily loaded based on environment and data mode
- **Module Integration**: Each module's data hooks are called during `useModularMockData` execution
- **Error Handling**: Graceful fallback to mock data if any module hook fails
- **Performance**: Module loading includes error handling and performance monitoring

### Module Structure
Each module follows a consistent structure:
```
modules/{module-name}/
├── data/
│   ├── types.ts          # Module-specific TypeScript interfaces
│   ├── mockData.ts       # Rich mock data for development
│   ├── schema.ts         # RxDB schema definitions
│   └── collections.ts    # RxDB collection configurations
└── README.md             # Module documentation
```

### Module Dependency Management
Modules declare their dependencies on other modules with version constraints:
- **Explicit Dependencies**: Modules declare required and optional dependencies
- **Version Constraints**: Semantic versioning support (^, ~, exact versions)
- **Validation**: Automatic validation of dependency compatibility
- **Visualization**: Tools to visualize module relationships

See [Module Dependency System Documentation](docs/module-dependency-system.md) for details.

## 🗄️ Database Architecture

### RxDB Implementation
- **40+ Collections**: Comprehensive schema covering all business entities
- **Reactive Queries**: Automatic UI updates via observable streams
- **IndexedDB Persistence**: Client-side data storage with offline capability
- **Schema Versioning**: Migration support for database updates

### Module Federation Pattern
```typescript
// Each module contributes schemas
modules/academics/data/schema.ts    → Academic entities
modules/finance/data/schema.ts      → Financial entities
modules/administration/data/schema.ts → Admin entities

// Centrally aggregated in
src/services/rxdbService.ts         → Unified database (340 lines)
```

### Data Consistency
- **Referential Integrity**: Maintained across all collections with foreign key relationships
- **Conflict Resolution**: Built-in mechanisms for data conflicts and concurrent updates
- **Backup & Restore**: Export/import functionality for data migration
- **Performance Optimization**: Indexed queries and efficient lookups with compound indexes

## 📚 API Documentation

### Data Layer API
All modules expose consistent CRUD operations:

```typescript
// Via AppDataContext - unified interface
const { students, addStudent, updateStudent, deleteStudent } = useAppData();

// Reactive subscriptions (production mode)
students.subscribe(updatedStudents => {
  // UI automatically updates when data changes
});

// Mock operations (demo mode)
const newStudent = await addStudent(studentData);
// Simulated async operations with realistic delays
```

### Component Patterns
```typescript
// Polymorphic components with advanced TypeScript
<Button<'a'> as="a" href="/dashboard">
  Dashboard
</Button>

<Button<'button'> onClick={handleClick}>
  Submit
</Button>

// Type-safe with full IntelliSense support
```

### Scripts

Utility scripts are located in the `scripts/` directory:

- **Page Analysis**: `./scripts/page_issue_analysis.ps1` - Analyzes React pages for issues
- **Route Validation**: `./scripts/page_validation_check.ps1` - Validates all routes exist

### Documentation

Comprehensive documentation is available in the `docs/` directory:

- **Architecture Guide**: `docs/architecture.md` - Detailed technical architecture
- **Feature List**: `docs/feature-list.md` - Complete feature documentation
- **Development Guides**: Various `*-dev-guide.md` files
- **Project Reports**: Recap files and workflow documentation

## 🏗️ Building

```bash
npm run build
```

The build process creates an optimized production bundle with:
- Minified JavaScript and CSS
- Optimized assets with compression
- Environment-specific configurations
- Tree-shaking for minimal bundle size

## 🌐 Internationalization

The application supports multiple languages through i18next:
- **Supported Languages**: English (default), French
- **Namespace Organization**: Separate translation files per module
- **Dynamic Loading**: Translations loaded based on detected language
- **Fallback System**: Graceful fallback to English for missing translations

## 📱 Responsive Design

Built with a mobile-first approach:
- **Mobile**: Collapsible sidebar with overlay navigation
- **Tablet**: Adaptive layout with touch-friendly controls
- **Desktop**: Full sidebar with expanded navigation
- **Universal**: Consistent experience across all devices

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: API key for Gemini integration
- `APP_MODE`: Set to 'demo' or 'production' to control data layer

### Application Settings
- **Data Mode**: Controlled via [`src/contexts/config.ts`](src/contexts/config.ts)
- **Database Name**: Configurable RxDB database name
- **Mock Data Delay**: Simulated API delay for realistic development

## 🔧 Troubleshooting

### Common Issues

#### Database Initialization Fails
The system automatically falls back to mock data if RxDB initialization fails:
```typescript
// Check console for initialization errors
// System will display "Running in Demo Mode" notification
```

#### Missing Translations
Add missing translation keys to appropriate namespace files:
```
src/i18n/locales/en/[module].json
src/i18n/locales/fr/[module].json
```

#### Type Errors After Adding New Features
Update central type definitions:
```
src/core/types.ts              # Add new interfaces
modules/[module]/data/types.ts # Module-specific types
```

#### Performance Issues
- Check if running in production mode unnecessarily during development
- Verify mock data isn't being loaded in production builds
- Monitor bundle size with `npm run build -- --analyze`

## 🤝 Contributing

This project follows modular architecture principles. Please refer to the documentation in the `docs/` directory for detailed development guidelines.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md); report a
vulnerability privately per [SECURITY.md](SECURITY.md). Setup, the test-first
rule, the pull-request checklist and how to propose a pack correction are in
[CONTRIBUTING.md](CONTRIBUTING.md). Changes to the domain model, a pack schema or
the plug-in SDK need an RFC first: see [docs/rfcs](docs/rfcs/README.md).

### Development Guidelines
1. **Module-First**: Add new features within appropriate modules
2. **Type Safety**: Maintain comprehensive TypeScript coverage
3. **Mock Data**: Include realistic mock data for new features
4. **Internationalization**: Add translation keys for all user-facing text
5. **Responsive Design**: Ensure mobile compatibility
6. **Documentation**: Update relevant documentation files

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support and development questions, please refer to:
- **Architecture Documentation**: `docs/architecture.md`
- **Feature Documentation**: `docs/feature-list.md`
- **Development Guides**: Various guides in `docs/` directory
