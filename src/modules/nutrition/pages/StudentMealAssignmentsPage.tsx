import React, { useState, useMemo, useEffect } from 'react';
import { StudentMealPlan, Student, MealPlan, SchoolPeriod, StudentMealPlanStatus, StudentStatus } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';

import { useAppData } from '@/hooks/useAppData';
import { useNutrition } from '../hooks/useNutrition';
import { EditIcon, UsersIcon } from '@/components/ui/icons';

// Foreign keys are opaque strings (UUIDs); they are never coerced to numbers (SO-22).
type AssignmentFormData = {
    student_id?: string;
    school_period_id?: string;
    meal_plan_id?: string;
    status: StudentMealPlanStatus;
};

const toId = (value: unknown): string | undefined =>
  value === null || value === undefined || value === '' ? undefined : String(value);

export const StudentMealAssignmentsPageContent: React.FC = () => {
  // Students and school periods are cross-domain read data; meal plan data and CRUD come from the module hook.
  const { students, schoolPeriods } = useAppData();
  const { studentMealPlans, mealPlans, addStudentMealPlan, updateStudentMealPlan } = useNutrition();
  const [saving, setSaving] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StudentMealPlan | null>(null);
  
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<string | undefined>(
    toId((schoolPeriods || []).find(sp => sp.is_active)?.id ?? (schoolPeriods || [])[0]?.id)
  );

  const initialFormData: AssignmentFormData = { 
    student_id: undefined, 
    school_period_id: selectedSchoolPeriodId,
    meal_plan_id: undefined,
    status: StudentMealPlanStatus.ACTIVE,
  };
  const [formData, setFormData] = useState<AssignmentFormData>(initialFormData);
  
  useEffect(() => { // Update form's school_period_id if global filter changes
    setFormData(prev => ({...prev, school_period_id: selectedSchoolPeriodId}));
  }, [selectedSchoolPeriodId]);

  const activeStudents = useMemo(() => (students || []).filter(s => s.status === StudentStatus.ACTIVE), [students]);
  
  const assignmentsForSelectedPeriod = useMemo(() => {
    if (!selectedSchoolPeriodId) return [];
    return (studentMealPlans || []).filter(smp => toId(smp.school_period_id) === selectedSchoolPeriodId);
  }, [studentMealPlans, selectedSchoolPeriodId]);

  const openModal = (assignment?: StudentMealPlan, student?: Student) => {
    setEditingAssignment(assignment || null);
    setFormData(assignment ? 
      { 
        student_id: toId(assignment.student_id), 
        school_period_id: toId(assignment.school_period_id),
        meal_plan_id: toId(assignment.meal_plan_id),
        status: assignment.status,
      } : 
      { ...initialFormData, student_id: toId(student?.id), school_period_id: selectedSchoolPeriodId } // Pre-fill student and period if adding for a specific student
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssignment(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.endsWith('_id') ? toId(value) : value }));
  };
  
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.school_period_id || !formData.meal_plan_id || !formData.status) {
      alert("Student, School Period, Meal Plan, and Status are required.");
      return;
    }
    
    const payload = {
      student_id: formData.student_id,
      school_period_id: formData.school_period_id,
      meal_plan_id: formData.meal_plan_id,
      status: formData.status,
    };

    if (editingAssignment) {
      setSaving(true);
      try {
        await updateStudentMealPlan(String(editingAssignment.id), payload);
      } finally {
        setSaving(false);
      }
    } else {
      // Check if student already has an active assignment for this period
      const existingActive = (studentMealPlans || []).find(smp =>
        toId(smp.student_id) === payload.student_id &&
        toId(smp.school_period_id) === payload.school_period_id &&
        smp.status === StudentMealPlanStatus.ACTIVE
      );
      if (existingActive && payload.status === StudentMealPlanStatus.ACTIVE) {
        alert("This student already has an active meal plan for this period. Please edit the existing assignment or set it to inactive first.");
        return;
      }
      setSaving(true);
      try {
        await addStudentMealPlan(payload);
      } finally {
        setSaving(false);
      }
    }
    closeModal();
  };

  const studentAssignmentColumns: DataGridColumn<Student>[] = [
    { 
      key: 'first_name', 
      header: 'Student Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => [row.first_name, row.last_name].filter(Boolean).join(' ') + (row.admission_no ? ` (${row.admission_no})` : '')
    },
    { 
      key: 'current_class_stream_name', 
      header: 'Class', 
      sortable: true, 
      filterable: true, 
      width: 150
    },
    {
      key: 'assigned_meal_plan',
      header: 'Assigned Meal Plan',
      sortable: false,
      filterable: true,
      width: 200,
      render: (value, row) => {
        const assignment = (assignmentsForSelectedPeriod || []).find(smp => toId(smp.student_id) === toId(row.id));
        return assignment ? (mealPlans || []).find(mp => toId(mp.id) === toId(assignment.meal_plan_id))?.name || 'N/A' : 'Not Assigned';
      }
    },
    {
      key: 'assignment_status',
      header: 'Status',
      sortable: false,
      filterable: true,
      width: 120,
      render: (value, row) => {
        const assignment = (assignmentsForSelectedPeriod || []).find(smp => toId(smp.student_id) === toId(row.id));
        if (!assignment) return <span className="text-xs text-surface-muted-fg">Not Assigned</span>;
        return <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
            assignment.status === StudentMealPlanStatus.ACTIVE ? 'bg-green-100 text-green-800' :
            assignment.status === StudentMealPlanStatus.INACTIVE ? 'bg-surface-accent text-surface-foreground' :
            'bg-red-100 text-red-800' // Cancelled
        }`}>{assignment.status}</span>
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, row) => {
        const assignment = (assignmentsForSelectedPeriod || []).find(smp => toId(smp.student_id) === toId(row.id));
        return (
          <Button size="sm" variant="ghost" onClick={() => openModal(assignment, row)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {assignment ? 'Edit Assignment' : 'Assign Plan'}
          </Button>
        );
      }
    },
  ];
  
  return (
    <div className="space-y-6">
      <Card title="Student Meal Plan Assignments">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-surface-muted">
            <Select 
                label="Filter by School Period" 
                value={selectedSchoolPeriodId || ''} 
                onChange={e => setSelectedSchoolPeriodId(toId(e.target.value))}
                required
            >
                <option value="">-- Select School Period --</option>
                {(schoolPeriods || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </Select>
        </div>
        {selectedSchoolPeriodId ? (
             <DataGrid 
               columns={studentAssignmentColumns} 
               data={activeStudents || []} 
               sortable
               filterable
               emptyState={{
                 icon: <UsersIcon className="w-12 h-12 text-surface-muted-fg" />,
                 title: "No students found",
                 description: "No active students available for meal plan assignments in the selected period.",
                 action: undefined
               }}
             />
        ) : (
            <p className="text-center text-surface-muted-fg py-4">Please select a school period to view and manage assignments.</p>
        )}
       
      </Card>

      <DialogForm 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingAssignment ? 'Edit Meal Plan Assignment' : 'Assign Meal Plan to Student'} 
        size="lg" 
        onSubmit={handleSubmit}
      >
        <FormSection columns={2}>
          <FormField label="Student" required>
            <Select name="student_id" value={formData.student_id || ''} onChange={handleInputChange} disabled={!!editingAssignment}>
              <option value="">Select Student</option>
              {(activeStudents || []).map((student: Student) => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.admission_no})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="School Period" required>
            <Select name="school_period_id" value={formData.school_period_id || ''} onChange={handleInputChange} disabled={!!editingAssignment}>
              <option value="">Select School Period</option>
              {(schoolPeriods || []).map((period: SchoolPeriod) => (
                <option key={period.id} value={period.id}>{period.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Meal Plan" required>
            <Select name="meal_plan_id" value={formData.meal_plan_id || ''} onChange={handleInputChange}>
              <option value="">Select Meal Plan</option>
              {(mealPlans || []).map((plan: MealPlan) => (
                <option key={plan.id} value={plan.id}>{plan.name} (Cost: {plan.cost_per_period?.toFixed(2) || 'N/A'})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Assignment Status" required>
            <Select name="status" value={formData.status} onChange={handleInputChange}>
              {Object.values(StudentMealPlanStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit" loading={saving}>
            {editingAssignment ? 'Save Changes' : 'Assign Plan'}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const StudentMealAssignmentsPage: React.FC = () => (
  <div className="space-y-6">
    <StudentMealAssignmentsPageContent />
  </div>
);

export default StudentMealAssignmentsPage;
