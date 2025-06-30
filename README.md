# SchoolPilot3 - Education Management System

A comprehensive education management system built with React, TypeScript, and Vite featuring modular architecture.

## Project Structure

```
schoolpilot3/
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts
│   ├── core/              # Core types and utilities
│   ├── hooks/             # Custom React hooks
│   ├── modules/           # Feature modules (administration, academics, finance, etc.)
│   ├── pages/             # Page components
│   └── services/          # Service layer
├── docs/                  # Documentation and project reports
│   ├── workflows/         # Workflow documentation
│   ├── AkademicoNotes/    # Development notes
│   └── *.md              # Various documentation files
├── scripts/               # Utility scripts
│   ├── page_issue_analysis.ps1
│   ├── page_validation_check.ps1
│   └── README.md
└── public/                # Static assets
```

## Quick Start

**Prerequisites:** Node.js 16+

1. **Install dependencies:**
   ```bash
   npm install
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

## Features

- **Modular Architecture**: Organized by feature modules (administration, academics, finance, HR, library, etc.)
- **TypeScript**: Full type safety throughout the application
- **Mock Data Mode**: Complete mock data layer for development and demos
- **RxDB Ready**: Prepared for local database integration
- **Responsive Design**: Built with Tailwind CSS
- **Component Library**: Reusable UI components

## Development

### Scripts

Utility scripts are located in the `scripts/` directory:

- **Page Analysis**: `./scripts/page_issue_analysis.ps1` - Analyzes React pages for issues
- **Route Validation**: `./scripts/page_validation_check.ps1` - Validates all routes exist

### Documentation

Comprehensive documentation is available in the `docs/` directory:

- **Architecture Guide**: `docs/architecture.md`
- **Development Guides**: Various `*-dev-guide.md` files
- **Project Reports**: Recap files and workflow documentation

### Module Structure

Each module follows a consistent structure:
```
modules/{module-name}/
├── data/
│   ├── types.ts          # Module-specific types
│   ├── mockData.ts       # Mock data
│   └── schema.ts         # Database schema
└── README.md             # Module documentation
```

## Building

```bash
npm run build
```

## Contributing

This project follows modular architecture principles. Please refer to the documentation in the `docs/` directory for detailed development guidelines.
