import React, { useState, useMemo, useEffect } from 'react';
import { StudentMealPlan, Student, MealPlan, SchoolPeriod, StudentMealPlanStatus, StudentStatus } from '@/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, UsersIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type AssignmentFormData = Omit<Partial<StudentMealPlan>, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'school_period_name' | 'meal_plan_name' | 'status'> & {
    status: StudentMealPlanStatus;
};

const StudentMealAssignmentsPage: React.FC = () => {
  const { 
    studentMealPlans, 
    students,
    mealPlans,
    schoolPeriods,
    loading, 
    addStudentMealPlan, 
    updateStudentMealPlan,
    deleteStudentMealPlan // Assuming this will be added
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StudentMealPlan | null>(null);
  
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>(
    (schoolPeriods || []).find(sp => sp.is_active)?.id || ((schoolPeriods || []).length > 0 ? (schoolPeriods || [])[0].id : undefined)
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
    return (studentMealPlans || []).filter(smp => smp.school_period_id === selectedSchoolPeriodId);
  }, [studentMealPlans, selectedSchoolPeriodId]);


  const openModal = (assignment?: StudentMealPlan, student?: Student) => {
    setEditingAssignment(assignment || null);
    setFormData(assignment ? 
      { 
        student_id: assignment.student_id, 
        school_period_id: assignment.school_period_id,
        meal_plan_id: assignment.meal_plan_id,
        status: assignment.status,
      } : 
      { ...initialFormData, student_id: student?.id, school_period_id: selectedSchoolPeriodId } // Pre-fill student and period if adding for a specific student
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
    setFormData(prev => ({ ...prev, [name]: (name.endsWith('_id') ? (value ? (name === 'student_id' ? value : parseInt(value)) : undefined) : value) }));
  };
  
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.school_period_id || !formData.meal_plan_id || !formData.status) {
      alert("Student, School Period, Meal Plan, and Status are required.");
      return;
    }
    
    const payload: Omit<StudentMealPlan, 'id'|'created_at'|'updated_at'|'student_name'|'school_period_name'|'meal_plan_name'> = {
      student_id: formData.student_id!,
      school_period_id: Number(formData.school_period_id!),
      meal_plan_id: Number(formData.meal_plan_id!),
      status: formData.status,
    };

    if (editingAssignment) {
      await updateStudentMealPlan({ ...editingAssignment, ...payload });
    } else {
      // Check if student already has an active assignment for this period
      const existingActive = (studentMealPlans || []).find(smp =>
        smp.student_id === payload.student_id &&
        smp.school_period_id === payload.school_period_id &&
        smp.status === StudentMealPlanStatus.ACTIVE
      );
      if (existingActive && payload.status === StudentMealPlanStatus.ACTIVE) {
        alert("This student already has an active meal plan for this period. Please edit the existing assignment or set it to inactive first.");
        return;
      }
      await addStudentMealPlan(payload);
    }
    closeModal();
  };

  const studentAssignmentColumns = [
    { header: 'Student Name', accessor: (item: Student) => `${item.first_name} ${item.last_name} (${item.admission_no})` },
    { header: 'Class', accessor: 'current_class_stream_name' as keyof Student},
    { header: 'Assigned Meal Plan', 
      accessor: (item: Student) => {
        const assignment = (assignmentsForSelectedPeriod || []).find(smp => smp.student_id === item.id);
        return assignment ? (mealPlans || []).find(mp => mp.id === assignment.meal_plan_id)?.name || 'N/A' : 'Not Assigned';
      }
    },
    { header: 'Status', 
      accessor: (item: Student) => {
        const assignment = (assignmentsForSelectedPeriod || []).find(smp => smp.student_id === item.id);
        return assignment?.status || '-';
      },
      render: (item: Student) => {
        const assignment = (assignmentsForSelectedPeriod || []).find(smp => smp.student_id === item.id);
        if (!assignment) return <span className="text-xs text-gray-500">Not Assigned</span>;
        return <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
            assignment.status === StudentMealPlanStatus.ACTIVE ? 'bg-green-100 text-green-800' :
            assignment.status === StudentMealPlanStatus.INACTIVE ? 'bg-gray-100 text-gray-700' :
            'bg-red-100 text-red-800' // Cancelled
        }`}>{assignment.status}</span>
      }
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof Student,
      render: (item: Student) => {
        const assignment = (assignmentsForSelectedPeriod || []).find(smp => smp.student_id === item.id);
        return (
          <Button size="sm" variant="ghost" onClick={() => openModal(assignment, item)} leftIcon={<EditIcon className="w-4 h-4" />}>
            {assignment ? 'Edit Assignment' : 'Assign Plan'}
          </Button>
        );
      }
    },
  ];
  
  const isLoadingPageData = loading.studentMealPlans || loading.students || loading.mealPlans || loading.schoolPeriods;

  if (isLoadingPageData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Meal Plan Assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Meal Plan Assignments">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-gray-50">
            <Select 
                label="Filter by School Period" 
                value={selectedSchoolPeriodId || ''} 
                onChange={e => setSelectedSchoolPeriodId(Number(e.target.value) || undefined)}
                required
            >
                <option value="">-- Select School Period --</option>
                {(schoolPeriods || []).map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </Select>
        </div>
        {selectedSchoolPeriodId ? (
             <Table columns={studentAssignmentColumns} data={activeStudents} isLoading={loading.studentMealPlans && isModalOpen} />
        ) : (
            <p className="text-center text-gray-500 py-4">Please select a school period to view and manage assignments.</p>
        )}
       
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAssignment ? 'Edit Meal Plan Assignment' : 'Assign Meal Plan to Student'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.studentMealPlans}>
              {loading.studentMealPlans ? <Spinner size="sm"/> : (editingAssignment ? 'Save Changes' : 'Assign Plan')}
            </Button>
          </>
        }
      >
        <Select name="student_id" label="Student" value={formData.student_id || ''} onChange={handleInputChange} required disabled={!!editingAssignment}>
            <option value="">Select Student</option>
            {(activeStudents || []).map((student: Student) => (<option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.admission_no})</option>))}
        </Select>
        <Select name="school_period_id" label="School Period" value={formData.school_period_id || ''} onChange={handleInputChange} required disabled={!!editingAssignment}>
            <option value="">Select School Period</option>
            {(schoolPeriods || []).map((period: SchoolPeriod) => (<option key={period.id} value={period.id}>{period.name}</option>))}
        </Select>
        <Select name="meal_plan_id" label="Meal Plan" value={formData.meal_plan_id || ''} onChange={handleInputChange} required>
            <option value="">Select Meal Plan</option>
            {(mealPlans || []).map((plan: MealPlan) => (<option key={plan.id} value={plan.id}>{plan.name} (Cost: {plan.cost_per_period?.toFixed(2) || 'N/A'})</option>))}
        </Select>
        <Select name="status" label="Assignment Status" value={formData.status} onChange={handleInputChange} required>
            {Object.values(StudentMealPlanStatus).map(status => (<option key={status} value={status}>{status}</option>))}
        </Select>
      </Modal>
    </div>
  );
};

export default StudentMealAssignmentsPage;
