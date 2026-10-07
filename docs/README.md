# SchoolPilot3 Documentation

Welcome to the SchoolPilot3 documentation. This directory contains comprehensive guides, architectural documentation, API references, and developer resources for the SchoolPilot3 school management system.

## Quick Navigation

### Current status and direction
- [School Operations Audit (Oct 2026)](audit/2026-10-school-operations/README.md) - End-to-end test of school workflows, findings and root causes
- [Multi-Curriculum Platform Specification](specs/multi-curriculum-platform/README.md) - Stabilisation plan and target design (Kenya CBE, British, African systems)

### Getting Started
- [Developer Onboarding](guides/onboarding.md) - New developer setup and introduction
- [Code Structure Guide](guides/code-structure-dev-guide.md) - Project organization and conventions
- [Quick Start Guide](tabs/QUICK_START_TABBED_WORKSPACE.md) - Get started with the tabbed workspace

### Core Architecture
- [System Architecture](architecture/architecture.md) - High-level system overview
- [Plugin Architecture](architecture/PLUGIN_ARCHITECTURE_SPEC.md) - Plugin system and marketplace
- [Tab System Architecture](architecture/tab-system.md) - Tabbed workspace implementation
- [Database Architecture](architecture/advanced-database-handler-architecture.md) - Multi-provider database system
- [Unified Configuration](architecture/UNIFIED_CONFIGURATION.md) - Configuration management system

### Core Systems

#### Database System
- [Database README](database/README.md) - Complete database documentation
- [Provider Selection Guide](database/PROVIDER_SELECTION_GUIDE.md) - Choosing the right database provider
- [Data Migration Process](database/data-migration-process.md) - Migration procedures
- [SQLite OPFS Implementation](database/sqlite-opfs-implementation.md) - Browser-based SQLite
- [WASM SQLite Implementation](database/wasm-sqlite-implementation.md) - WebAssembly SQLite

#### Tabbed Workspace
- [Tabbed Workspace Overview](tabs/README_TABBED_WORKSPACE.md) - System introduction
- [Component Guide](tabs/TABBED_WORKSPACE_COMPONENT_GUIDE.md) - Component reference
- [Integration Guide](tabs/INTEGRATION_GUIDE.md) - Integrating with the tab system
- [Troubleshooting](tabs/TROUBLESHOOTING_TABBED_WORKSPACE_SYSTEM.md) - Common issues and solutions
- [User Guide](tabs/TABDED_MODE_USER_GUIDE.md) - End-user documentation

#### Plugin System
- [Plugin Architecture](architecture/PLUGIN_ARCHITECTURE_SPEC.md) - Technical specification
- [Plugin Development Manual](guides/PLUGIN_DEVELOPMENT_MANUAL.md) - Creating plugins
- [Plugin Settings](guides/feature-settings-developer-guide.md) - Feature flags and settings

### Developer Guides

#### Development
- [Backend Integration](guides/backend-integration-guide.md) - Backend API integration
- [Data Layer Guide](guides/data-dev-guide.md) - Working with the data layer
- [RxDB Data Guide](guides/rxdb-data-dev-guide.md) - RxDB-specific development
- [Mock Data Guide](guides/mock-data-dev-guide.md) - Development with mock data
- [MCP Development](guides/mcp-dev-guide.md) - MCP server development

#### UI Development
- [Navigation Components](guides/NAVIGATION_COMPONENTS_GUIDE.md) - Sidebar, menus, breadcrumbs
- [Dashboard Style Guide](guides/DASHBOARD_STYLE_GUIDE_AND_COMPONENT_LIBRARY.md) - UI components
- [Form Validation](guides/form-validation-framework-implementation.md) - Form handling
- [DataGrid Guide](guides/table-to-datagrid-implementation-guide.md) - DataGrid components
- [Responsive Design](enhancements/RESPONSIVE_ENHANCEMENTS.md) - Responsive patterns

#### Advanced Topics
- [Module Development](developer/MODULE_DEVELOPMENT.md) - Creating new modules
- [RBAC Implementation](guides/RBAC_IMPLEMENTATION_GUIDE.md) - Role-based access control
- [State Management](architecture/STATE_MANAGEMENT_GUIDELINES.md) - State management patterns
- [Performance Optimization](architecture/advanced-database-handler-architecture.md) - Performance tuning
- [Self-Hosting Deployment](SELF_HOSTING_DEPLOYMENT.md) - Deployment guide

### API Documentation
- [API Specification](specs/api-spec.md) - API reference
- [Education System API](api/education-system/) - Education module API
- [Grading Engine API](api/grading-engine/) - Grading calculations API

### Module-Specific Guides
- [Academics Module](guides/academics-module-guide.md) - Academic management
- [Finance Module](guides/finance-module-guide.md) - Financial operations
- [HR Module](guides/hr-module-guide.md) - Human resources
- [Inventory Module](guides/inventory-module-guide.md) - Inventory management
- [Library Module](guides/library-module-guide.md) - Library system
- [Settings Module](guides/settings-data-management-consolidation.md) - System settings

### Migration & Planning
- [Migration Plan](migration/akademico_to_sp3_migration_plan.md) - Akademico to SchoolPilot3
- [Feature Mapping](migration/akademico_to_schoolpilot3_feature_mapping.md) - Feature comparison
- [Master Roadmap](roadmap/MASTER_ROADMAP.md) - Development roadmap
- [Production Readiness](planning/production-readiness-assessment.md) - Production checklist

### Troubleshooting & Support
- [Common Fixes](fixes/FIX_EXECUTION_SUMMARY.md) - Common issues resolved
- [Login Error Tracking](fixes/LOGIN_ERROR_TRACKING_SUMMARY.md) - Authentication issues
- [Translation Fixes](fixes/translation_fixes_summary.md) - i18n troubleshooting
- [Testing Checklist](guides/TESTING_CHECKLIST.md) - Testing procedures

### Reference
- [Quick Reference](QUICK_REFERENCE.md) - Quick command and pattern reference
- [Feature List](specs/feature-list.md) - Complete feature inventory
- [User Stories](specs/user-stories.md) - User requirements
- [Contributing Guidelines](developer/CONTRIBUTING.md) - Contribution standards

## Documentation Structure

```
docs/
├── README.md                          # This file - documentation index
├── architecture/                      # System architecture documentation
│   ├── architecture.md               # Main architecture overview
│   ├── PLUGIN_ARCHITECTURE_SPEC.md   # Plugin system specification
│   ├── tab-system.md                 # Tab system architecture
│   ├── advanced-database-handler-architecture.md
│   └── UNIFIED_CONFIGURATION.md      # Configuration system
├── database/                          # Database documentation
│   ├── README.md                     # Complete database guide
│   ├── PROVIDER_SELECTION_GUIDE.md   # Provider selection
│   └── ...
├── tabs/                             # Tabbed workspace documentation
│   ├── README_TABBED_WORKSPACE.md    # Overview
│   ├── TABBED_WORKSPACE_COMPONENT_GUIDE.md
│   └── ...
├── guides/                           # Developer guides (20+ files)
├── developer/                        # Development standards
├── api/                              # API documentation
├── specs/                            # Specifications
├── migration/                        # Migration documentation
├── roadmap/                          # Roadmap and planning
├── planning/                         # Implementation planning
├── workflows/                        # Work logs (72+ files)
├── reports/                          # Analysis reports
├── fixes/                            # Bug fix documentation
├── enhancements/                     # Enhancement records
└── AkademicoNotes/                   # Legacy system reference
```

## Key Technologies

- **React 18+** - UI framework with hooks and concurrent features
- **TypeScript 5+** - Type-safe development
- **Zustand** - State management for tabs and global state
- **RxDB/PouchDB/SQLite** - Multi-provider database system
- **Tailwind CSS** - Utility-first styling
- **React Router v6** - Client-side routing
- **i18next** - Internationalization
- **Go WASM** - High-performance computation engines

## Quick Start for Developers

1. **Setup**: Follow [Developer Onboarding](guides/onboarding.md)
2. **Architecture**: Read [System Architecture](architecture/architecture.md)
3. **Data Layer**: Review [Data Layer Guide](guides/data-dev-guide.md)
4. **UI Components**: Check [Dashboard Style Guide](guides/DASHBOARD_STYLE_GUIDE_AND_COMPONENT_LIBRARY.md)
5. **Plugins**: Study [Plugin Development Manual](guides/PLUGIN_DEVELOPMENT_MANUAL.md)

## Contributing to Documentation

When adding new documentation:

1. Place in appropriate subdirectory
2. Update this README with link
3. Follow existing markdown formatting
4. Include code examples where applicable
5. Cross-reference related documents

## Support

- Technical questions: Check troubleshooting guides
- Architecture decisions: Review architecture documentation
- Development help: Consult developer guides
- API questions: Reference API documentation
