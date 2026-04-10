# Module Development Guide

This guide explains how to create and modify modules in SchoolPilot3.

## Module Overview

Modules are self-contained feature areas that encapsulate related functionality. Each module typically includes:

- **Pages** - Route-level components
- **Data hooks** - Data fetching and manipulation
- **Components** - Reusable UI elements
- **Types** - TypeScript type definitions

## Creating a New Module

### 1. Create Module Structure

Create the following directory structure under `src/modules/{module-name}/`:

```
src/modules/students/
├── index.ts                 # Module definition
├── routes.tsx               # Route definitions
├── pages/
│   ├── index.tsx            # Page router
│   ├── StudentListPage.tsx  # List view
│   └── StudentDetailPage.tsx # Detail view
├── data/
│   ├── index.ts             # Hook exports
│   ├── useStudentData.ts    # Data fetching
│   └── types.ts             # Type definitions
├── components/
│   ├── StudentCard.tsx      # Reusable components
│   └── StudentForm.tsx      # Forms
└── __tests__/
    └── StudentListPage.test.tsx
```

### 2. Define Module (index.ts)

```typescript
// ABOUTME: Students module definition and registration

import type { ModuleDefinition } from '../../core/moduleRegistry';

export const studentsModule: ModuleDefinition = {
  id: 'students',
  name: 'Students',
  description: 'Student management and enrollment',
  version: '1.0.0',

  routes: [
    {
      path: '/students',
      component: () => import('./pages/StudentListPage'),
      exact: true,
      meta: {
        title: 'Students',
        icon: 'Users',
        permission: 'view_students',
      },
    },
    {
      path: '/students/:id',
      component: () => import('./pages/StudentDetailPage'),
      meta: {
        title: 'Student Details',
        permission: 'view_students',
      },
    },
  ],

  navigationItems: [
    {
      label: 'Students',
      path: '/students',
      icon: 'Users',
      permission: 'view_students',
    },
  ],

  collections: ['students', 'student_enrollments', 'student_attendance'],
};

export default studentsModule;
```

### 3. Register the Module

In your module's entry point or a registration file:

```typescript
// Register the module
import { registerModule } from '../../core/moduleRegistry';
import { studentsModule } from './index';

registerModule(studentsModule);
```

## Data Hooks Pattern

### useStudentData.ts

```typescript
// ABOUTME: Hook for accessing and managing student data

import { useCallback } from 'react';
import { useAppData } from '../../../hooks/useAppData';
import type { Student, StudentCreateInput } from './types';

export interface UseStudentDataReturn {
  students: Student[];
  isLoading: boolean;
  error: Error | null;
  addStudent: (data: StudentCreateInput) => Promise<void>;
  updateStudent: (id: number, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: number) => Promise<void>;
  getStudentById: (id: number) => Student | undefined;
}

export const useStudentData = (): UseStudentDataReturn => {
  const { students, addRecord, updateRecord, deleteRecord, isLoading, error } = useAppData();

  const addStudent = useCallback(async (data: StudentCreateInput) => {
    await addRecord('students', data);
  }, [addRecord]);

  const updateStudent = useCallback(async (id: number, data: Partial<Student>) => {
    await updateRecord('students', id, data);
  }, [updateRecord]);

  const deleteStudent = useCallback(async (id: number) => {
    await deleteRecord('students', id);
  }, [deleteRecord]);

  const getStudentById = useCallback((id: number) => {
    return students.find(s => s.id === id);
  }, [students]);

  return {
    students,
    isLoading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudentById,
  };
};
```

### types.ts

```typescript
// ABOUTME: Type definitions for students module

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  enrollmentDate: string;
  classId?: number;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentCreateInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email?: string;
  phone?: string;
  address?: string;
  enrollmentDate: string;
  classId?: number;
}

export interface StudentFilters {
  classId?: number;
  status?: Student['status'];
  search?: string;
}
```

## Page Components

### StudentListPage.tsx

```typescript
// ABOUTME: Student list page component

import React, { useMemo } from 'react';
import { useStudentData, StudentFilters } from '../data/useStudentData';
import { StudentCard } from '../components/StudentCard';
import { Spinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export const StudentListPage: React.FC = () => {
  const { students, isLoading, error } = useStudentData();
  const [filters, setFilters] = useState<StudentFilters>({});

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      if (filters.classId && student.classId !== filters.classId) {
        return false;
      }
      if (filters.status && student.status !== filters.status) {
        return false;
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          student.firstName.toLowerCase().includes(search) ||
          student.lastName.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [students, filters]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading students: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={() => navigate('/students/new')}>
          Add Student
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <Input
          placeholder="Search students..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(student => (
          <StudentCard
            key={student.id}
            student={student}
            onClick={() => navigate(`/students/${student.id}`)}
          />
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No students found
        </div>
      )}
    </div>
  );
};

export default StudentListPage;
```

## Component Pattern

### StudentCard.tsx

```typescript
// ABOUTME: Reusable student card component

import React from 'react';
import type { Student } from '../data/types';

export interface StudentCardProps {
  student: Student;
  onClick?: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onClick }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="flex items-center gap-4">
        <div className="bg-blue-100 rounded-full p-3">
          <span className="text-2xl">👤</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            {student.firstName} {student.lastName}
          </h3>
          <p className="text-gray-600 text-sm">
            {student.email || 'No email'}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <span className={`font-medium ${
            student.status === 'active' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {student.status}
          </span>
        </div>
      </div>
    </div>
  );
};
```

## Testing Modules

### StudentListPage.test.tsx

```typescript
// ABOUTME: Tests for student list page

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { StudentListPage } from '../StudentListPage';
import { MockAppDataProvider } from '../../../tests/MockAppDataProvider';

describe('StudentListPage', () => {
  const mockStudents = [
    {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      status: 'active',
    },
    {
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      status: 'active',
    },
  ];

  it('should display loading spinner initially', () => {
    render(
      <MockAppDataProvider isLoading={true}>
        <StudentListPage />
      </MockAppDataProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display students when loaded', async () => {
    render(
      <MockAppDataProvider students={mockStudents}>
        <StudentListPage />
      </MockAppDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should display empty state when no students', () => {
    render(
      <MockAppDataProvider students={[]}>
        <StudentListPage />
      </MockAppDataProvider>
    );

    expect(screen.getByText('No students found')).toBeInTheDocument();
  });
});
```

## Best Practices

### 1. Lazy Load Pages

```typescript
// Good - Lazy load pages for better performance
routes: [
  {
    path: '/students',
    component: () => import('./pages/StudentListPage'),
  },
];

// Avoid - Eager loading
import { StudentListPage } from './pages/StudentListPage';
```

### 2. Use Custom Hooks for Data Access

```typescript
// Good - Encapsulated data logic
const { students, addStudent } = useStudentData();

// Avoid - Direct context access
const { data } = useAppData();
const students = data.students || [];
```

### 3. Handle Loading and Error States

```typescript
// Good - Proper loading/error handling
const { students, isLoading, error } = useStudentData();

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <StudentList students={students} />;
```

### 4. Use TypeScript Properly

```typescript
// Good - Proper typing
interface StudentCardProps {
  student: Student;
  onClick?: () => void;
}

// Avoid - Any type
interface StudentCardProps {
  student: any;
  onClick: any;
}
```

### 5. Keep Components Small

```typescript
// Good - Small, focused components
export const StudentCard: React.FC<StudentCardProps> = ({ student }) => {
  return (
    <div className="card">
      <StudentName name={student.name} />
      <StudentStatus status={student.status} />
    </div>
  );
};
```

## Module Communication

### Using Events

```typescript
// In your module
import { eventBus } from '../../core/eventBus';

eventBus.emit('student:created', { studentId: 1 });
eventBus.on('class:updated', handleClassUpdate);
```

### Using Shared Context

```typescript
// For cross-module state
const { students } = useAppData();
const { currentClass } = useClassContext();
```

## Troubleshooting

### Module Not Appearing

1. Check module is registered in `moduleRegistry`
2. Verify route path is correct
3. Check user has required permissions

### Data Not Loading

1. Check collection name is correct
2. Verify database provider is working
3. Check for errors in browser console

### Navigation Issues

1. Verify routes are defined in module
2. Check path parameters match route definition
3. Ensure navigation permissions are set correctly
