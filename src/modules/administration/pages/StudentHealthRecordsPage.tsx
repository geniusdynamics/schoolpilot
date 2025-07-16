import React, { useState, useMemo } from 'react';
import { Student } from '@/types';
import { AdminStudentHealthRecordType } from '@/modules/administration/data/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { EditIcon, ClipboardDocumentListIcon } from '@/components/ui/icons';
import { useStudentHealthRecordData } from '@/modules/administration/data/useStudentHealthRecordData';
import { useAppData } from '@/contexts/AppDataContext'; // For students data only
import Spinner from '@/components/ui/Spinner';
import Textarea from '@/components/ui/Textarea';
import { useTranslation } from 'react-i18next';

type HealthRecordFormData = Omit<Partial<AdminStudentHealthRecordType>, 'id' | 'student_id' | 'created_at' | 'updated_at'>;

const StudentHealthRecordsPage: React.FC = () => {
  const { studentHealthRecords, addStudentHealthRecord, updateStudentHealthRecord } = useStudentHealthRecordData();
  const { students = [] } = useAppData(); // Only for students data
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentHealthRecord, setCurrentHealthRecord] = useState<AdminStudentHealthRecordType | null>(null);
  
  const initialFormData: HealthRecordFormData = {
    blood_type: '',
    allergies: '',
    medical_conditions: '',
    emergency_contact_override: ''
  };
  const [formData, setFormData] = useState<HealthRecordFormData>(initialFormData);

  const openModal = (student: Student) => {
    setSelectedStudent(student);
    const existingRecord = (studentHealthRecords || []).find(hr => hr.student_id === student.id);
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

    const payload: Omit<AdminStudentHealthRecordType, 'id' | 'created_at' | 'updated_at'> = {
      student_id: selectedStudent.id,
      blood_type: formData.blood_type || undefined,
      allergies: formData.allergies || undefined,
      medical_conditions: formData.medical_conditions || undefined,
      emergency_contact_override: formData.emergency_contact_override || undefined,
    };

    if (currentHealthRecord) {
      updateStudentHealthRecord({ ...currentHealthRecord, ...payload });
    } else {
      addStudentHealthRecord(payload);
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
        const hasRecord = (studentHealthRecords || []).some(hr => hr.student_id === item.id);
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

  return (
    <div className="space-y-6">
      <Card title="Student Health Records Management">
        <p className="text-sm text-gray-600 mb-4">
          Manage health records for each student, including blood type, allergies, medical conditions, and emergency contact overrides.
        </p>
        <Table columns={studentColumns} data={students} />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Manage Health Record for ${selectedStudent?.first_name} ${selectedStudent?.last_name}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>
              Save Health Record
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
