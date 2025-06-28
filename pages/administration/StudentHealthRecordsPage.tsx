
import React, { useState, useMemo } from 'react';
import { Student, StudentHealthRecord } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { EditIcon, ClipboardDocumentListIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import Textarea from '../../components/ui/Textarea';

type HealthRecordFormData = Omit<Partial<StudentHealthRecord>, 'id' | 'student_id' | 'created_at' | 'updated_at'>;

const StudentHealthRecordsPage: React.FC = () => {
  const { 
    students, 
    studentHealthRecords,
    loading, 
    addStudentHealthRecord, 
    updateStudentHealthRecord,
  } = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentHealthRecord, setCurrentHealthRecord] = useState<StudentHealthRecord | null>(null);
  
  const initialFormData: HealthRecordFormData = { 
    blood_type: '', 
    allergies: '', 
    medical_conditions: '', 
    emergency_contact_override: '' 
  };
  const [formData, setFormData] = useState<HealthRecordFormData>(initialFormData);

  const openModal = (student: Student) => {
    setSelectedStudent(student);
    const existingRecord = studentHealthRecords.find(hr => hr.student_id === student.id);
    setCurrentHealthRecord(existingRecord || null);
    setFormData(existingRecord ? 
      { 
        blood_type: existingRecord.blood_type, 
        allergies: existingRecord.allergies, 
        medical_conditions: existingRecord.medical_conditions, 
        emergency_contact_override: existingRecord.emergency_contact_override 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
    setCurrentHealthRecord(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedStudent) return;

    const payload: Omit<StudentHealthRecord, 'id' | 'created_at' | 'updated_at'> = {
      student_id: selectedStudent.id,
      blood_type: formData.blood_type || undefined,
      allergies: formData.allergies || undefined,
      medical_conditions: formData.medical_conditions || undefined,
      emergency_contact_override: formData.emergency_contact_override || undefined,
    };

    if (currentHealthRecord) {
      await updateStudentHealthRecord({ ...currentHealthRecord, ...payload });
    } else {
      await addStudentHealthRecord(payload);
    }
    closeModal();
  };

  const studentColumns = [
    { header: 'Adm No', accessor: 'admission_no' as keyof Student },
    { header: 'Name', accessor: ((item: Student) => `${item.first_name} ${item.last_name}`) },
    { header: 'Class', accessor: 'current_class_name' as keyof Student },
    { header: 'Health Record Status', 
      accessor: 'id' as keyof Student, 
      render: (item: Student) => {
        const hasRecord = studentHealthRecords.some(hr => hr.student_id === item.id);
        return hasRecord ? 
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Record Exists</span> : 
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">No Record</span>;
      }
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof Student,
      render: (item: Student) => (
        <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>
          Manage Health Record
        </Button>
      ),
    },
  ];

  const isLoadingPage = loading.students || loading.studentHealthRecords;

  if (isLoadingPage && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Student Health Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Student Health Records Management">
        <p className="text-sm text-gray-600 mb-4">
          Manage health records for each student, including blood type, allergies, medical conditions, and emergency contact overrides.
        </p>
        <Table columns={studentColumns} data={students} isLoading={isLoadingPage && !isModalOpen} />
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={`Manage Health Record for ${selectedStudent?.first_name} ${selectedStudent?.last_name}`} 
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.studentHealthRecords}>
              {loading.studentHealthRecords ? <Spinner size="sm"/> : 'Save Health Record'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
                name="blood_type" 
                label="Blood Type" 
                value={formData.blood_type || ''} 
                onChange={handleInputChange} 
                placeholder="e.g., A+, O-"
            />
            <Input 
                name="emergency_contact_override" 
                label="Emergency Contact Override (Phone)" 
                value={formData.emergency_contact_override || ''} 
                onChange={handleInputChange} 
                placeholder="Optional: Alt. emergency phone"
            />
        </div>
        <Textarea
            name="allergies"
            label="Allergies"
            value={formData.allergies || ''}
            onChange={handleInputChange}
            rows={3}
            placeholder="List any known allergies..."
            containerClassName="mt-4"
        />
        <Textarea
            name="medical_conditions"
            label="Medical Conditions"
            value={formData.medical_conditions || ''}
            onChange={handleInputChange}
            rows={3}
            placeholder="List any pre-existing medical conditions..."
            containerClassName="mt-4"
        />
      </Modal>
    </div>
  );
};

export default StudentHealthRecordsPage;
