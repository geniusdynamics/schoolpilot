import React, { useState, useMemo } from 'react';
import { FinStudentTransportAssignmentType as StudentTransportAssignment, Student, FinTransportRouteType as TransportRoute, SchoolPeriod, FinTransportAssignmentStatusEnum as TransportAssignmentStatus, StudentStatus } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, TruckIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type AssignmentFormData = Omit<Partial<StudentTransportAssignment>, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'route_name' | 'school_period_name' | 'status' | 'invoice_id'> & {
    status: TransportAssignmentStatus;
};

const StudentTransportAssignmentsPage: React.FC = () => {
  const appData = useAppData();
  const studentTransportAssignments = appData.studentTransportAssignments || [];
  const students = appData.students || [];
  const transportRoutes = appData.transportRoutes || [];
  const schoolPeriods = appData.schoolPeriods || [];
  const loading = appData.loading || {};
  const addStudentTransportAssignment = appData.addStudentTransportAssignment;
  const updateStudentTransportAssignment = appData.updateStudentTransportAssignment;
  const deleteStudentTransportAssignment = appData.deleteStudentTransportAssignment;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StudentTransportAssignment | null>(null);
  
  const initialFormData: AssignmentFormData = { 
    student_id: undefined, 
    route_id: undefined,
    school_period_id: undefined,
    status: TransportAssignmentStatus.ACTIVE,
  };
  const [formData, setFormData] = useState<AssignmentFormData>(initialFormData);

  const activeStudents = useMemo(() => students.filter(s => s.status === StudentStatus.ACTIVE), [students]);
  const activeSchoolPeriods = useMemo(() => schoolPeriods.filter(sp => sp.is_active), [schoolPeriods]);


  const openModal = (assignment?: StudentTransportAssignment) => {
    setEditingAssignment(assignment || null);
    setFormData(assignment ? 
      { 
        student_id: assignment.student_id, 
        route_id: assignment.route_id, 
        school_period_id: assignment.school_period_id,
        status: assignment.status || TransportAssignmentStatus.ACTIVE,
      } : 
      initialFormData
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
    if (!formData.student_id || !formData.route_id || !formData.school_period_id) {
      alert("Student, Route, and School Period are required.");
      return;
    }
    const payload: Omit<StudentTransportAssignment, 'id'|'created_at'|'updated_at'|'student_name'|'route_name'|'school_period_name'|'invoice_id'> = {
      student_id: formData.student_id!,
      route_id: Number(formData.route_id!),
      school_period_id: Number(formData.school_period_id!),
      status: formData.status,
    };

    if (editingAssignment) {
      await updateStudentTransportAssignment({ ...editingAssignment, ...payload });
    } else {
      await addStudentTransportAssignment(payload as any); // Cast to any to bypass strict CreatePayload check for demo
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transport assignment?')) {
      await deleteStudentTransportAssignment(id);
    }
  };

  const columns: DataGridColumn<StudentTransportAssignment>[] = [
    { 
      key: 'student_name', 
      header: 'Student Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'route_name', 
      header: 'Route', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (value, row) => <span className="text-blue-600">{value}</span>
    },
    { 
      key: 'school_period_name', 
      header: 'School Period', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="text-purple-600">{value}</span>
    },
    { 
      key: 'status', 
      header: 'Status', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.status === TransportAssignmentStatus.ACTIVE ? 'bg-green-100 text-green-800' :
        row.status === TransportAssignmentStatus.INACTIVE ? 'bg-gray-100 text-gray-800' :
        'bg-red-100 text-red-800'
      }`}>{value}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const isLoadingData = loading.studentTransportAssignments || loading.students || loading.transportRoutes || loading.schoolPeriods;

  if (isLoadingData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Transport Assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Transport Assignments" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Assign Student to Route
        </Button>
      }>
        <DataGrid 
          columns={columns} 
          data={studentTransportAssignments} 
          isLoading={loading.studentTransportAssignments && isModalOpen}
          sortable
          filterable
          emptyState={{
            icon: <TruckIcon className="w-12 h-12 text-gray-400" />,
            title: "No Transport Assignments",
            description: "No students have been assigned to transport routes yet. Start by assigning students to available routes.",
            action: (
              <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                Assign Student to Route
              </Button>
            )
          }}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAssignment ? 'Edit Transport Assignment' : 'Assign Student to Transport Route'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.studentTransportAssignments}>
              {loading.studentTransportAssignments ? <Spinner size="sm"/> : (editingAssignment ? 'Save Changes' : 'Assign')}
            </Button>
          </>
        }
      >
        <Select name="student_id" label="Student" value={formData.student_id || ''} onChange={handleInputChange} required>
            <option value="">Select Student</option>
            {activeStudents.map((student: Student) => (<option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.admission_no})</option>))}
        </Select>
        <Select name="route_id" label="Transport Route" value={formData.route_id}>
            {/* Options for routes will go here */}
          </Select>
      </Modal>
    </div>
  );
};

export default StudentTransportAssignmentsPage;
