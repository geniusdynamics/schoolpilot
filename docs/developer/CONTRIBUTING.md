# Contributing to SchoolPilot3

Thank you for your interest in contributing to SchoolPilot3! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- **Be respectful** - Treat others with respect and kindness
- **Be inclusive** - Welcome diverse perspectives
- **Be constructive** - Provide feedback that helps improve the project
- **Be patient** - Remember that everyone is learning

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- A code editor (VS Code recommended)
- Chrome/Firefox/Safari for browser testing

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/your-org/schoolpilot3.git
cd schoolpilot3

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

### Development Workflow

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** for your changes
4. **Make your changes** following the coding guidelines
5. **Add tests** for your changes
6. **Ensure all tests pass**
7. **Commit your changes** with clear commit messages
8. **Push to your fork**
9. **Open a Pull Request**

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use proper typing
- Use interfaces for object shapes
- Use type aliases for unions and intersections

```typescript
// Good
interface Student {
  id: number;
  name: string;
  classId: number;
}

// Avoid
const student: any = { ... };
```

### React Components

- Use functional components with hooks
- Use named exports for components
- Keep components small and focused (single responsibility)
- Extract custom hooks for reusable logic

```typescript
// Good - Named export, small component
export const StudentCard: React.FC<StudentCardProps> = ({ student }) => {
  return (
    <div className="card">
      <h3>{student.name}</h3>
    </div>
  );
};

// Avoid - Default export, large component doing too much
export default ({ data }) => { /* 500 lines */ };
```

### File Organization

```
src/
├── components/          # Shared UI components
│   └── ui/            # Base UI components
├── contexts/          # React contexts
├── hooks/             # Custom hooks
├── modules/           # Feature modules
│   └── {domain}/
│       ├── pages/     # Page components
│       ├── data/      # Data hooks
│       └── components/# Feature-specific components
├── services/         # Service layer
└── utils/            # Utilities
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `StudentCard.tsx` |
| Hooks | camelCase starting with `use` | `useStudentData.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `StudentProps.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_STUDENTS` |
| Files | kebab-case | `student-card.tsx` |

### State Management

Follow the state management hierarchy:

1. **Component state** - `useState` for local UI state
2. **Context** - For shared state across components
3. **URL state** - For shareable, history-backed state
4. **External state** - For server data (React Query, etc.)

```typescript
// Prefer context for shared state
const { students, addStudent } = useAppData();

// Use URL params for filterable lists
const [filter, setFilter] = useSearchParams();

// Use component state for UI-only state
const [isModalOpen, setIsModalOpen] = useState(false);
```

### Error Handling

- Handle errors gracefully with user-friendly messages
- Log errors for debugging (use the logger utility)
- Provide fallback UIs when possible

```typescript
// Good
try {
  await saveStudent(data);
  showToast('Student saved successfully', 'success');
} catch (error) {
  errorLog('Failed to save student:', error);
  showToast('Failed to save student. Please try again.', 'error');
}

// Avoid - Silent failures
try {
  await saveStudent(data);
} catch (e) {}
```

## Testing Guidelines

### Unit Tests

- Test each function in isolation
- Use meaningful test descriptions
- Cover happy path and edge cases

```typescript
describe('formatStudentName', () => {
  it('should format name with first and last name', () => {
    expect(formatStudentName('John', 'Doe')).toBe('John Doe');
  });

  it('should handle missing last name', () => {
    expect(formatStudentName('John', '')).toBe('John');
  });
});
```

### Integration Tests

- Test component interactions
- Test data flow through contexts
- Test user interactions

### E2E Tests

- Test critical user flows
- Test authentication
- Test data creation and retrieval

## Commit Message Guidelines

Follow the conventional commits specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

Examples:
```
feat(students): add student profile page

Added new page for viewing and editing student profiles
with contact information and academic history.

Closes #123
```

```
fix(exams): correct attendance calculation

Fixed edge case where attendance percentage was incorrect
for students with no attendance records.
```

## Pull Request Process

### Before Submitting

1. Ensure all tests pass
2. Run the linter: `npm run lint`
3. Run type checking: `npm run typecheck`
4. Update documentation if needed
5. Add tests for new functionality

### PR Description Template

```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
[Describe testing performed]

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix works
- [ ] New and existing tests pass locally
```

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Error messages and stack traces

### Feature Requests

Include:
- Clear description of the feature
- Use case / motivation
- Potential alternatives considered

## Questions?

- Open an issue for bugs and features
- Join our community forum/discord
- Check the documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the project's open source license.
