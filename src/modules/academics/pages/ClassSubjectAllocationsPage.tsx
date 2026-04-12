import React, { useState, useMemo } from 'react';
import { ClassStream, AcademicYear } from '@/types';
import { ClassSubjectAllocation } from '@/modules/academics/data/types';
import Card from '@/components/ui/Card';

import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Select from '@/components/ui/Select';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import { 
  PlusIcon, 
  EditIcon, 
  BookOpenIcon, 
  FolderIcon,
  CogIcon
} from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { Subject as CoreSubject } from '@/core/types';
import { useNavigate } from 'react-router-dom';

type AllocationFormData = Omit<Partial<ClassSubjectAllocation>, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name'>;

const ClassSubjectAllocationsPage: React.FC = () => {
  const { t } = useTranslation(['academics', 'common']);
  const navigate = useNavigate();
  const { 
    classSubjectAllocations, 
    classStreams,
    subjects,
    academicYears,
    loading,
    addClassSubjectAllocation, 
    updateClassSubjectAllocation 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ClassSubjectAllocation | null>(null);
  const [activeTab, setActiveTab] = useState('subject-classes');
  
  const initialFormData: AllocationFormData = { 
    class_stream_id: undefined, 
    subject_id: undefined,
    academic_year_id: undefined,
  };
  const [formData, setFormData] = useState<AllocationFormData>(initialFormData);


  const openModal = (allocation?: ClassSubjectAllocation) => {
    setEditingAllocation(allocation || null);
    setFormData(allocation ? 
      { 
        class_stream_id: allocation.class_stream_id, 
        subject_id: allocation.subject_id,
        academic_year_id: allocation.academic_year_id,
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAllocation(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
  };

  const handleSubmit = async () => {
    if (!formData.class_stream_id || !formData.subject_id || !formData.academic_year_id) {
      alert(t('validation.classStreamSubjectAcademicYearRequired'));
      return;
    }

    const isDuplicate = (classSubjectAllocations || []).some(
        alloc => alloc.id !== editingAllocation?.id &&
                 alloc.class_stream_id === Number(formData.class_stream_id) &&
                 alloc.subject_id === Number(formData.subject_id) &&
                 alloc.academic_year_id === Number(formData.academic_year_id)
    );

    if (isDuplicate) {
        alert(t('validation.subjectAlreadyAllocated'));
        return;
    }

    const payload: Omit<ClassSubjectAllocation, 'id' | 'class_stream_name' | 'subject_name' | 'academic_year_name'> = { 
        class_stream_id: Number(formData.class_stream_id!), 
        subject_id: Number(formData.subject_id!),
        academic_year_id: Number(formData.academic_year_id!),
    };

    if (editingAllocation) {
      await updateClassSubjectAllocation({ ...editingAllocation, ...payload });
    } else {
      await addClassSubjectAllocation(payload);
    }
    closeModal();
  };



  // Transform data for the modern table view
  const tableData = useMemo(() => {
    return (classSubjectAllocations || []).map((allocation, index) => ({
      id: index + 1,
      name: `${allocation.class_stream_name} - ${allocation.subject_name}`,
      className: allocation.class_stream_name,
      subjectName: allocation.subject_name,
      academicYear: allocation.academic_year_name,
      raw: allocation,
    }));
  }, [classSubjectAllocations]);

  const isLoadingPage = loading.classSubjectAllocations || loading.classStreams || loading.subjects || loading.academicYears;

  if (isLoadingPage && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Class Subject Allocations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Compact Header with Tabs */}
      <PageHeaderWithTabs 
        title="Class Subject Allocations"
        subtitle="Manage subject assignments to classes and streams"
        tabs={[
          { id: 'my-classes', label: 'My Classes' },
          { id: 'manage-classes', label: 'Manage Classes' },
          { id: 'add-new-class', label: 'Add New Class' },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          if (tabId === 'manage-classes') navigate('/administration/classes');
          else if (tabId === 'add-new-class') navigate('/administration/classes/new');
          else setActiveTab(tabId);
        }}
        action={
          <Button 
            onClick={() => openModal()} 
            leftIcon={<PlusIcon className="w-4 h-4" />}
            size="sm"
          >
            Add Allocation
          </Button>
        }
        variant="compact"
        colorScheme="blue"
      />

      {/* Subject Classes Section */}
      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Subject Classes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.map((row) => (
                <tr key={row.raw.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => openModal(row.raw)}
                        leftIcon={<EditIcon className="w-3.5 h-3.5" />}
                      >
                        Manage
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tableData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BookOpenIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p>No subject class allocations found.</p>
            <p className="text-sm mt-1">Click "Add Allocation" to create one.</p>
          </div>
        )}
      </Card>

      {/* Streams Section */}
      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <FolderIcon className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Streams</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Teacher
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(classStreams || []).slice(0, 10).map((stream, index) => (
                <tr key={stream.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {stream.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {stream.class_teacher_name || 'Not Assigned'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => navigate(`/administration/classes?stream=${stream.id}`)}
                      leftIcon={<CogIcon className="w-3.5 h-3.5" />}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DialogForm 
        open={isModalOpen} 
        onClose={closeModal} 
        title={editingAllocation ? t('classSubjectAllocations.modalEditTitle') : t('classSubjectAllocations.modalAddTitle')} 
        size="lg"
        actions={
          <FormActions>
            <Button variant="secondary" onClick={closeModal}>{t('common:cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading.classSubjectAllocations}>
              {loading.classSubjectAllocations ? <Spinner size="sm"/> : t('common:save')}
            </Button>
          </FormActions>
        }
      >
        <FormSection>
          <FormField label={t('classSubjectAllocations.classStreamLabel')}>
            <Select 
              name="class_stream_id" 
              value={formData.class_stream_id || ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectClassStreamOption')}</option>
              {(classStreams || []).map((cs: ClassStream) => (
                <option key={cs.id} value={cs.id}>{cs.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('classSubjectAllocations.subjectLabel')}>
            <Select 
              name="subject_id" 
              value={formData.subject_id || ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectSubjectOption')}</option>
              {(subjects || []).map((subject: CoreSubject) => (
                <option key={subject.id} value={subject.id}>{subject.name} ({subject.subject_code})</option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('classSubjectAllocations.academicYearLabel')}>
            <Select 
              name="academic_year_id" 
              value={formData.academic_year_id || ''} 
              onChange={handleInputChange}
              required
            >
              <option value="">{t('classSubjectAllocations.selectAcademicYearOption')}</option>
              {(academicYears || []).map((ay: AcademicYear) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
      </DialogForm>
    </div>
  );
};

export default ClassSubjectAllocationsPage;
