// ABOUTME: Example of using useSharedData for cross-module data access
// ABOUTME: This demonstrates the recommended pattern for accessing shared entities

import React from 'react';
import { useSharedStudents, useSharedStaff, useSharedAcademicYears, useSharedData } from '@/hooks/useSharedData';

/**
 * Example component demonstrating cross-module data access
 * using the useSharedData pattern instead of direct imports.
 */
export const SharedDataExample: React.FC = () => {
  const { students, isLoading: studentsLoading, error: studentsError } = useSharedStudents();
  const { staff, isLoading: staffLoading } = useSharedStaff();
  const { academicYears } = useSharedAcademicYears();

  if (studentsLoading || staffLoading) {
    return <div>Loading shared data...</div>;
  }

  if (studentsError) {
    return <div>Error loading shared data: {studentsError}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Shared Data Access Example</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Students (from Administration Module)</h3>
        <p className="text-sm text-surface-muted-fg mb-2">
          Accessed via useSharedStudents() - no direct import from administration module
        </p>
        <ul className="list-disc pl-5">
          {students.slice(0, 3).map((student: any) => (
            <li key={student.id}>{student.name} - {student.studentId}</li>
          ))}
          {students.length > 3 && <li>...and {students.length - 3} more</li>}
        </ul>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Staff (from Administration Module)</h3>
        <p className="text-sm text-surface-muted-fg mb-2">
          Accessed via useSharedStaff() - no direct import from administration module
        </p>
        <ul className="list-disc pl-5">
          {staff.slice(0, 3).map((staffMember: any) => (
            <li key={staffMember.id}>{staffMember.name} - {staffMember.position}</li>
          ))}
          {staff.length > 3 && <li>...and {staff.length - 3} more</li>}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Academic Years (from Core Module)</h3>
        <p className="text-sm text-surface-muted-fg mb-2">
          Accessed via useSharedAcademicYears() - no direct import from core module
        </p>
        <ul className="list-disc pl-5">
          {academicYears.map((year: any) => (
            <li key={year.id}>{year.name} ({year.status})</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Example of using useSharedData directly for multiple entities
 */
export const MultiEntityExample: React.FC = () => {
  const { data, isLoading, error } = useSharedData(['students', 'staff', 'classes']);

  if (isLoading) {
    return <div>Loading shared data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Multi-Entity Access Example</h2>
      <p className="text-sm text-surface-muted-fg mb-4">
        Using useSharedData(['students', 'staff', 'classes']) for batch access
      </p>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="border p-3 rounded">
          <h4 className="font-semibold">Students</h4>
          <p className="text-2xl font-bold">{data.students?.length || 0}</p>
        </div>
        <div className="border p-3 rounded">
          <h4 className="font-semibold">Staff</h4>
          <p className="text-2xl font-bold">{data.staff?.length || 0}</p>
        </div>
        <div className="border p-3 rounded">
          <h4 className="font-semibold">Classes</h4>
          <p className="text-2xl font-bold">{data.classes?.length || 0}</p>
        </div>
      </div>
    </div>
  );
};
