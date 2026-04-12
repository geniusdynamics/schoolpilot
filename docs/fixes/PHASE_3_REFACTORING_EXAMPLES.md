# Phase 3: Data Hook Refactoring Examples

> **Purpose**: Show how to refactor existing data hooks to use `useDataFetch`  
> **Goal**: Eliminate unstable dependencies and infinite loops

---

## Example 1: Simple Data Fetching Hook

### ❌ BEFORE (Problematic)

```typescript
// src/modules/academics/data/useStudentsData.ts
import { useState, useEffect } from 'react';

export function useStudentsData() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // PROBLEM: config is a new object every render!
  const config = { endpoint: '/api/students' };
  
  useEffect(() => {
    fetch(config.endpoint)  // INFINITE LOOP!
      .then(res => res.json())
      .then(setStudents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [config]); // config changes every render
  
  return { students, loading, error };
}
```

### ✅ AFTER (Fixed with useDataFetch)

```typescript
// src/modules/academics/data/useStudentsData.ts
import { useDataFetch } from '@/hooks/useDataFetch';
import type { Student } from './types';

export function useStudentsData() {
  return useDataFetch<Student[]>('/api/students');
}
```

**Benefits:**
- ✅ No unstable dependencies
- ✅ Automatic cleanup
- ✅ Proper loading/error states
- ✅ 90% less code

---

## Example 2: Data Hook with Parameters

### ❌ BEFORE (Problematic)

```typescript
export function useClassStudents(classId: string) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // PROBLEM: New object every render
  const params = { classId, active: true };
  
  useEffect(() => {
    const query = new URLSearchParams(params).toString();
    fetch(`/api/students?${query}`)
      .then(res => res.json())
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [params]); // params is new every render!
  
  return { students, loading };
}
```

### ✅ AFTER (Fixed)

```typescript
import { useDataFetchWithParams } from '@/hooks/useDataFetch';
import type { Student } from './types';

export function useClassStudents(classId: string) {
  return useDataFetchWithParams<Student[]>(
    '/api/students',
    { classId, active: true }
  );
}
```

**Benefits:**
- ✅ Parameters properly memoized internally
- ✅ Query string built automatically
- ✅ No manual dependency management

---

## Example 3: Conditional Fetching

### ❌ BEFORE (Problematic)

```typescript
export function useStudentDetails(studentId: string | null) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!studentId) return; // Guard clause
    
    setLoading(true);
    fetch(`/api/students/${studentId}`)
      .then(res => res.json())
      .then(setStudent)
      .finally(() => setLoading(false));
  }, [studentId]);
  
  return { student, loading };
}
```

### ✅ AFTER (Fixed)

```typescript
import { useDataFetch } from '@/hooks/useDataFetch';
import type { Student } from './types';

export function useStudentDetails(studentId: string | null) {
  return useDataFetch<Student>(
    `/api/students/${studentId}`,
    {
      skip: !studentId, // Built-in conditional fetching
    }
  );
}
```

**Benefits:**
- ✅ Clean conditional logic
- ✅ No manual loading state management
- ✅ Proper cleanup when condition changes

---

## Example 4: Data Hook with Transformation

### ❌ BEFORE (Problematic)

```typescript
export function useStudentsWithFullNames() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        // Transform data
        const transformed = data.map(s => ({
          ...s,
          fullName: `${s.firstName} ${s.lastName}`
        }));
        setStudents(transformed);
      })
      .finally(() => setLoading(false));
  }, []);
  
  return { students, loading };
}
```

### ✅ AFTER (Fixed)

```typescript
import { useDataFetch } from '@/hooks/useDataFetch';
import type { Student } from './types';

interface StudentWithFullName extends Student {
  fullName: string;
}

export function useStudentsWithFullNames() {
  return useDataFetch<StudentWithFullName[]>('/api/students', {
    transform: (data) => data.map(s => ({
      ...s,
      fullName: `${s.firstName} ${s.lastName}`
    }))
  });
}
```

**Benefits:**
- ✅ Transformation logic separated
- ✅ Type-safe
- ✅ Reusable pattern

---

## Example 5: Complex Data Hook (Current Pattern)

### ❌ BEFORE (From useAssignmentsData.ts)

```typescript
export function useAssignmentsData() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        setAssignments(mockAssignments);
        setSubmissions(mockSubmissions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []); // Empty deps - runs once

  const createAssignment = useCallback(async (data: Partial<Assignment>) => {
    const newAssignment = { /* ... */ };
    setAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  }, []);

  // ... more CRUD operations

  return {
    assignments,
    submissions,
    loading,
    error,
    createAssignment,
    // ... more operations
  };
}
```

### ✅ AFTER (Refactored)

```typescript
import { useDataFetch, useDataMutation } from '@/hooks/useDataFetch';
import { useCallback } from 'react';
import type { Assignment, AssignmentSubmission } from './types';

export function useAssignmentsData() {
  // Fetch assignments
  const {
    data: assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useDataFetch<Assignment[]>('/api/assignments');

  // Fetch submissions
  const {
    data: submissions,
    loading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions
  } = useDataFetch<AssignmentSubmission[]>('/api/submissions');

  // Create assignment mutation
  const { mutate: createAssignmentMutation } = useDataMutation<Assignment, Partial<Assignment>>(
    '/api/assignments',
    {
      onSuccess: () => {
        refetchAssignments(); // Refresh list after creation
      }
    }
  );

  // Update assignment mutation
  const updateAssignment = useCallback(async (id: string, data: Partial<Assignment>) => {
    const response = await fetch(`/api/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const updated = await response.json();
    refetchAssignments();
    return updated;
  }, [refetchAssignments]);

  // Delete assignment
  const deleteAssignment = useCallback(async (id: string) => {
    await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
    refetchAssignments();
  }, [refetchAssignments]);

  // Grade submission
  const gradeSubmission = useCallback(async (
    submissionId: string,
    score: number,
    feedback?: string
  ) => {
    await fetch(`/api/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, feedback })
    });
    refetchSubmissions();
  }, [refetchSubmissions]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([refetchAssignments(), refetchSubmissions()]);
  }, [refetchAssignments, refetchSubmissions]);

  return {
    assignments: assignments || [],
    submissions: submissions || [],
    loading: assignmentsLoading || submissionsLoading,
    error: assignmentsError || submissionsError,
    createAssignment: createAssignmentMutation,
    updateAssignment,
    deleteAssignment,
    gradeSubmission,
    refresh,
  };
}
```

**Benefits:**
- ✅ Separate concerns (fetch vs mutations)
- ✅ Automatic refetching after mutations
- ✅ Proper loading states for each operation
- ✅ No manual state management for fetching
- ✅ All callbacks properly memoized

---

## Example 6: Data Hook with Callbacks

### ❌ BEFORE (Problematic)

```typescript
export function useStudents(onLoad?: (students: Student[]) => void) {
  const [students, setStudents] = useState([]);
  
  // PROBLEM: onLoad in deps causes re-fetch when callback changes
  useEffect(() => {
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        setStudents(data);
        onLoad?.(data); // Call callback
      });
  }, [onLoad]); // onLoad is new every render!
  
  return { students };
}
```

### ✅ AFTER (Fixed)

```typescript
import { useDataFetch } from '@/hooks/useDataFetch';
import type { Student } from './types';

export function useStudents(onLoad?: (students: Student[]) => void) {
  return useDataFetch<Student[]>('/api/students', {
    onSuccess: onLoad, // Handled internally with ref
  });
}
```

**Benefits:**
- ✅ Callback stored in ref internally
- ✅ Doesn't trigger re-fetch when callback changes
- ✅ Clean API

---

## Migration Checklist

When refactoring a data hook:

### 1. Identify the Pattern
- [ ] Simple fetch? → Use `useDataFetch`
- [ ] With params? → Use `useDataFetchWithParams`
- [ ] POST/PUT/DELETE? → Use `useDataMutation`
- [ ] Multiple fetches? → Use multiple `useDataFetch` calls

### 2. Remove Manual State Management
- [ ] Remove `useState` for data, loading, error
- [ ] Remove manual `setLoading`, `setError` calls
- [ ] Remove try/catch blocks (handled by hook)

### 3. Fix Dependencies
- [ ] Remove object literals from dependencies
- [ ] Use `skip` option for conditional fetching
- [ ] Use `onSuccess`/`onError` for callbacks

### 4. Add Cleanup
- [ ] Remove manual cleanup (handled automatically)
- [ ] Remove `cancelled` flags (handled automatically)

### 5. Test
- [ ] Verify data loads correctly
- [ ] Check loading states
- [ ] Test error handling
- [ ] Verify no infinite loops

---

## Common Patterns

### Pattern 1: Master-Detail
```typescript
// Master list
const { data: students } = useDataFetch<Student[]>('/api/students');

// Detail (conditional)
const { data: selectedStudent } = useDataFetch<Student>(
  `/api/students/${selectedId}`,
  { skip: !selectedId }
);
```

### Pattern 2: Dependent Fetches
```typescript
// First fetch
const { data: class } = useDataFetch<Class>(`/api/classes/${classId}`);

// Second fetch depends on first
const { data: students } = useDataFetch<Student[]>(
  `/api/students?classId=${class?.id}`,
  { skip: !class?.id }
);
```

### Pattern 3: Polling
```typescript
const { data, refetch } = useDataFetch<Status>('/api/status');

useEffect(() => {
  const interval = setInterval(refetch, 5000);
  return () => clearInterval(interval);
}, [refetch]);
```

### Pattern 4: Optimistic Updates
```typescript
const { data: items, refetch } = useDataFetch<Item[]>('/api/items');
const { mutate: createItem } = useDataMutation<Item, CreateItemDto>(
  '/api/items',
  {
    onSuccess: (newItem) => {
      // Optimistically add to list
      // Then refetch to get server state
      refetch();
    }
  }
);
```

---

## Next Steps

1. Start with simple data hooks (single fetch, no params)
2. Move to parameterized hooks
3. Refactor complex hooks with multiple fetches
4. Add mutations for CRUD operations
5. Test thoroughly

---

## Files to Refactor

Priority order:

### High Priority (Simple, High Usage)
- `src/modules/administration/data/useStudentData.ts`
- `src/modules/administration/data/useStaffData.ts`
- `src/modules/administration/data/useClassData.ts`

### Medium Priority (Moderate Complexity)
- `src/modules/academics/data/useAssignmentsData.ts`
- `src/modules/academics/data/useSubjectData.ts`
- `src/modules/finance/data/useInvoiceData.ts`

### Low Priority (Complex, Lower Usage)
- Module-specific complex hooks
- Hooks with heavy business logic

---

**Estimated Impact**: Refactoring 50 data hooks will eliminate ~80% of infinite loop issues in the codebase.
