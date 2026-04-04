import React, { useState, useMemo } from 'react';
import { Student } from '@/types';
import { AdminStudentHealthRecordType } from '@/modules/administration/data/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';

import Input from '@/components/ui/Input';
import { EditIcon, ClipboardDocumentListIcon } from '@/components/ui/icons';
import { useStudentHealthRecordData } from '@/modules/administration/data/useStudentHealthRecordData';
import { useAppData } from '@/hooks/useAppData'; // For students data only
import Spinner from '@/components/ui/Spinner';
import Textarea from '@/components/ui/Textarea';
import { useTranslation } from 'react-i18next';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormSection from '../../../components/ui/forms/FormSection';
import FormField from '../../../components/ui/forms/FormField';
import FormActions from '../../../components/ui/forms/FormActions';

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

  const studentColumns: DataGridColumn<Student>[] = [
    { 
      key: 'admission_no',
      header: 'Adm No', 
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, item) => item.admission_no
    },
    { 
      key: 'name',
      header: 'Name', 
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => `${item.first_name} ${item.last_name}`
    },
    { 
      key: 'current_class_name',
      header: 'Class', 
      sortable: true,
      filterable: true,
      width: 150,
      render: (value, item) => item.current_class_name
    },
    { 
      key: 'health_record_status',
      header: 'Health Record Status', 
      sortable: true,
      filterable: true,
      width: 180,
      render: (value, item) => {
        const hasRecord = (studentHealthRecords || []).some(hr => hr.student_id === item.id);
        return hasRecord ? 
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Record Exists</span> : 
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">No Record</span>;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (value, item) => (
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
        <DataGrid 
          columns={studentColumns} 
          data={students}
          sortable
          filterable
          emptyState={
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">No students are currently enrolled in the system.</p>
            </div>
          }
        />
      </Card>

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Manage Health Record for ${selectedStudent?.first_name} ${selectedStudent?.last_name}`}
        size="lg"
        onSubmit={handleSubmit}
      >
        <FormSection columns={2}>
          <FormField label="Blood Type">
            <Input 
                name="blood_type" 
                value={formData.blood_type || ''} 
                onChange={handleInputChange} 
                placeholder="e.g., A+, O-"
            />
          </FormField>
          <FormField label="Emergency Contact Override (Phone)">
            <Input 
                name="emergency_contact_override" 
                value={formData.emergency_contact_override || ''} 
                onChange={handleInputChange} 
                placeholder="Optional: Alt. emergency phone"
            />
          </FormField>
        </FormSection>
        <FormSection>
          <FormField label="Allergies">
            <Textarea
                name="allergies"
                value={formData.allergies || ''}
                onChange={handleInputChange}
                rows={3}
                placeholder="List any known allergies..."
            />
          </FormField>
          <FormField label="Medical Conditions">
            <Textarea
                name="medical_conditions"
                value={formData.medical_conditions || ''}
                onChange={handleInputChange}
                rows={3}
                placeholder="List any pre-existing medical conditions..."
            />
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleSubmit}>
            Save Health Record
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default StudentHealthRecordsPage;
