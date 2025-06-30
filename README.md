# SchoolPilot3 - Education Management System

A comprehensive education management system built with React, TypeScript, and Vite featuring modular architecture and dual-mode data layer for both development and production environments.

## 🎯 Overview

SchoolPilot3 is an enterprise-grade school management system that handles all aspects of educational administration, from student management to financial operations. Built with modern web technologies, it features a sophisticated dual-mode architecture that supports both development (mock data) and production (local database) environments.

## 🏗️ Architecture Highlights

### Dual-Mode Data Layer
- **Demo Mode**: Rich mock data for development and demonstrations
- **Production Mode**: RxDB local database with IndexedDB persistence
- **Graceful Fallback**: Automatic fallback to mock data if database fails
- **Unified API**: Single interface regardless of data source

### Modular Design
- **Domain-Driven**: Each business module is self-contained
- **Type-Safe**: Comprehensive TypeScript coverage
- **Scalable**: Easy to add new modules and features
- **Maintainable**: Clear separation of concerns

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
│   │   └── types.ts       # Central type definitions
│   ├── hooks/             # Custom React hooks
│   │   ├── useCompleteMockData.ts  # Comprehensive mock data
│   │   ├── useMockData.ts          # Basic mock data
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
   Open [http://localhost:5173](http://localhost:5173) in your browser

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
- **Database**: RxDB (Reactive Database) with Dexie.js adapter
- **Internationalization**: i18next with react-i18next
- **Charts**: Recharts for data visualization

### Data Layer Architecture

#### Demo Mode (`APP_MODE = 'demo'`)
- Uses comprehensive mock data for all modules
- No RxDB code imported or initialized
- Perfect for development and demonstrations
- Data resets on page refresh

#### Production Mode (`APP_MODE = 'production'`)
- RxDB local database with IndexedDB persistence
- Dynamic module loading for database components
- Graceful fallback to mock data if initialization fails
- Data persistence across sessions

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
- Optimized assets
- Environment-specific configurations

## 🌐 Internationalization

The application supports multiple languages through i18next:
- **Supported Languages**: English (default), French
- **Namespace Organization**: Separate translation files per module
- **Dynamic Loading**: Translations loaded based on detected language
- **Fallback System**: Graceful fallback to English

## 📱 Responsive Design

Built with a mobile-first approach:
- **Mobile**: Collapsible sidebar with overlay
- **Tablet**: Adaptive layout with touch-friendly controls
- **Desktop**: Full sidebar with expanded navigation
- **Universal**: Consistent experience across all devices

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: API key for Gemini integration
- `APP_MODE`: Set to 'demo' or 'production' to control data layer

### Application Settings
- **Data Mode**: Controlled via `src/contexts/config.ts`
- **Database Name**: Configurable RxDB database name
- **Mock Data Delay**: Simulated API delay for realistic development

## 🤝 Contributing

This project follows modular architecture principles. Please refer to the documentation in the `docs/` directory for detailed development guidelines.

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
