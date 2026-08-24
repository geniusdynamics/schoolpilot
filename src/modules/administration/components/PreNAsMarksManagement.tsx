import React, { useState, useMemo, useCallback } from 'react';
import DataGrid from '../../../components/ui/data/DataGrid';
import Button from '../../../components/ui/Button';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormActions from '../../../components/ui/forms/FormActions';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Card from '../../../components/ui/Card';
import { PlusIcon, EditIcon, DeleteIcon, UploadIcon as DocumentArrowUpIcon, AcademicCapIcon, CheckBadgeIcon, XCircleIcon, MagnifyingGlassIcon, ArrowUpTrayIcon } from '../../../components/ui/icons';

import Spinner from '../../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../hooks/useToast';
import TabbedForm, { FormTab } from '../../../components/ui/forms/TabbedForm';
import { useConfirm } from '@/components/ui/ConfirmDialog';

// Types for PreNAs Marks Management
export interface PreNAsMarks {
  id: string;
  student_id?: string;
  application_id?: string;
  index_number: string;
  year: number;
  assessment_type: 'KCPE' | 'CBC' | 'Other';
  
  // Core Subject Marks
  english: number;
  kiswahili: number;
  mathematics: number;
  science: number;
  social_studies: number;
  
  // Additional CBC subjects (optional)
  integrated_science?: number;
  pre_technical_studies?: number;
  creative_arts?: number;
  
  // Calculated Fields
  total_marks: number;
  mean_grade: number;
  overall_grade: string;
  
  // Meta
  imported_date?: string;
  verified: boolean;
  verification_date?: string;
  verified_by?: string;
  
  created_at: string;
  updated_at: string;
  
  // Denormalized fields
  student_name?: string;
  applicant_name?: string;
}

interface PreNAsMarksFormData extends Omit<PreNAsMarks, 'id' | 'created_at' | 'updated_at' | 'total_marks' | 'mean_grade' | 'overall_grade'> {}

interface BulkImportData {
  file: File | null;
  preview: any[];
  mapping: { [key: string]: string };
  errors: string[];
}

const PreNAsMarksManagement: React.FC = () => {

  const { t } = useTranslation('administration');
  const { showToast } = useToast();
  
  // Mock data for now - replace with actual data hooks
  const [preNAsMarks, setPreNAsMarks] = useState<PreNAsMarks[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingMarks, setEditingMarks] = useState<PreNAsMarks | null>(null);
  
  // Form states
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssessmentType, setFilterAssessmentType] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterVerified, setFilterVerified] = useState<string>('all');
  
  // Bulk import state
  const [bulkImportData, setBulkImportData] = useState<BulkImportData>({
    file: null,
    preview: [],
    mapping: {},
    errors: []
  });

  const initialFormData: PreNAsMarksFormData = {
    index_number: '',
    year: new Date().getFullYear(),
    assessment_type: 'KCPE',
    english: 0,
    kiswahili: 0,
    mathematics: 0,
    science: 0,
    social_studies: 0,
    verified: false
  };
  
  const [formData, setFormData] = useState<PreNAsMarksFormData>(initialFormData);

  // Calculate total marks, mean grade, and overall grade
  const calculateMarks = useCallback((marks: Partial<PreNAsMarksFormData>) => {
    const coreSubjects = [
      marks.english || 0,
      marks.kiswahili || 0,
      marks.mathematics || 0,
      marks.science || 0,
      marks.social_studies || 0
    ];
    
    const additionalSubjects = [
      marks.integrated_science || 0,
      marks.pre_technical_studies || 0,
      marks.creative_arts || 0
    ].filter(mark => mark > 0);
    
    const allMarks = [...coreSubjects, ...additionalSubjects];
    const total_marks = allMarks.reduce((sum, mark) => sum + mark, 0);
    const mean_grade = total_marks / allMarks.length;
    
    // Calculate overall grade based on mean
    let overall_grade = 'E';
    if (mean_grade >= 80) overall_grade = 'A';
    else if (mean_grade >= 75) overall_grade = 'A-';
    else if (mean_grade >= 70) overall_grade = 'B+';
    else if (mean_grade >= 65) overall_grade = 'B';
    else if (mean_grade >= 60) overall_grade = 'B-';
    else if (mean_grade >= 55) overall_grade = 'C+';
    else if (mean_grade >= 50) overall_grade = 'C';
    else if (mean_grade >= 45) overall_grade = 'C-';
    else if (mean_grade >= 40) overall_grade = 'D+';
    else if (mean_grade >= 35) overall_grade = 'D';
    else if (mean_grade >= 30) overall_grade = 'D-';
    
    return { total_marks, mean_grade, overall_grade };
  }, []);

  // Filter and search functionality
  const filteredMarks = useMemo(() => {
    return preNAsMarks.filter(mark => {
      const matchesSearch = searchTerm === '' || 
        (mark.index_number?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        mark.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mark.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAssessmentType = filterAssessmentType === 'all' || mark.assessment_type === filterAssessmentType;
      const matchesYear = filterYear === 'all' || mark.year.toString() === filterYear;
      const matchesVerified = filterVerified === 'all' || 
        (filterVerified === 'verified' && mark.verified) ||
        (filterVerified === 'unverified' && !mark.verified);
      
      return matchesSearch && matchesAssessmentType && matchesYear && matchesVerified;
    });
  }, [preNAsMarks, searchTerm, filterAssessmentType, filterYear, filterVerified]);

  // Column definitions for marks grid
  const marksColumns = [
    {
      key: 'index_number',
      header: t('preNAsMarks.indexNumber'),
      render: (mark: PreNAsMarks) => (
        <span className="font-mono text-sm">{mark.index_number}</span>
      )
    },
    {
      key: 'student_name',
      header: t('preNAsMarks.studentName'),
      render: (mark: PreNAsMarks) => mark.student_name || mark.applicant_name || '-'
    },
    {
      key: 'year',
      header: t('preNAsMarks.year'),
      render: (mark: PreNAsMarks) => mark.year?.toString() ?? ''
    },
    {
      key: 'assessment_type',
      header: t('preNAsMarks.assessmentType'),
      render: (mark: PreNAsMarks) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          mark.assessment_type === 'KCPE' ? 'bg-blue-100 text-blue-800' :
          mark.assessment_type === 'CBC' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {mark.assessment_type}
        </span>
      )
    },
    {
      key: 'total_marks',
      header: t('preNAsMarks.totalMarks'),
      render: (mark: PreNAsMarks) => (
        <span className="font-semibold">{mark.total_marks}</span>
      )
    },
    {
      key: 'overall_grade',
      header: t('preNAsMarks.overallGrade'),
      render: (mark: PreNAsMarks) => (
        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${
          ['A', 'A-'].includes(mark.overall_grade) ? 'bg-green-100 text-green-800' :
          ['B+', 'B', 'B-'].includes(mark.overall_grade) ? 'bg-blue-100 text-blue-800' :
          ['C+', 'C', 'C-'].includes(mark.overall_grade) ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {mark.overall_grade}
        </span>
      )
    },
    {
      key: 'verified',
      header: t('preNAsMarks.verified'),
      render: (mark: PreNAsMarks) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
          mark.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {mark.verified ? <CheckBadgeIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
          {mark.verified ? t('common.verified') : t('common.unverified')}
        </span>
      )
    }
  ];

  const handleInputChange = (name: string, value: any) => {
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
  };

  const openModal = (marks?: PreNAsMarks) => {
    setEditingMarks(marks || null);
    setActiveTab(0);
    
    if (marks) {
      const { id, created_at, updated_at, total_marks, mean_grade, overall_grade, ...marksData } = marks;
      setFormData(marksData);
    } else {
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMarks(null);
    setFormData(initialFormData);
    setActiveTab(0);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.index_number || !formData.year) {
      showToast(t('preNAsMarks.messages.validationError'), 'error');
      return;
    }

    try {
      const calculated = calculateMarks(formData);
      const marksData: PreNAsMarks = {
        ...formData,
        ...calculated,
        id: editingMarks?.id || `marks_${Date.now()}`,
        created_at: editingMarks?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingMarks) {
        // Update existing marks
        setPreNAsMarks(prev => 
          prev.map(mark => mark.id === editingMarks.id ? marksData : mark)
        );
        showToast(t('preNAsMarks.messages.marksUpdated'), 'success');
      } else {
        // Add new marks
        setPreNAsMarks(prev => [...prev, marksData]);
        showToast(t('preNAsMarks.messages.marksAdded'), 'success');
      }

      closeModal();
    } catch (error) {
      showToast(t('preNAsMarks.messages.saveError'), 'error');
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (marksId: string) => {
    if ((await confirm({ variant: 'danger', message: t('preNAsMarks.messages.confirmDelete') }))) {
      setPreNAsMarks(prev => prev.filter(mark => mark.id !== marksId));
      showToast(t('preNAsMarks.messages.marksDeleted'), 'success');
    }
  };

  const handleVerify = async (marksId: string) => {
    setPreNAsMarks(prev => prev.map(mark => 
      mark.id === marksId 
        ? { 
            ...mark, 
            verified: true, 
            verification_date: new Date().toISOString(),
            verified_by: 'current_user' // Replace with actual user
          }
        : mark
    ));
    showToast(t('preNAsMarks.messages.marksVerified'), 'success');
  };

  const handleBulkImport = () => {
    setIsBulkImportOpen(true);
  };

  const getMarksActions = (marks: PreNAsMarks) => [
    {
      label: t('preNAsMarks.actions.edit'),
      onClick: () => openModal(marks),
      icon: EditIcon
    },
    {
      label: marks.verified ? t('preNAsMarks.actions.unverify') : t('preNAsMarks.actions.verify'),
      onClick: () => handleVerify(marks.id),
      icon: CheckBadgeIcon,
      variant: marks.verified ? 'secondary' : 'primary' as const
    },
    {
      label: t('preNAsMarks.actions.delete'),
      onClick: () => handleDelete(marks.id),
      icon: DeleteIcon,
      variant: 'danger' as const
    }
  ];

  // Create form tabs
  const createFormTabs = (): FormTab[] => [
    {
      id: 'basic',
      label: t('preNAsMarks.tabs.basicInfo'),
      icon: <AcademicCapIcon className="w-5 h-5" />,
      required: true,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('preNAsMarks.indexNumber')}
              value={formData.index_number}
              onChange={(value) => handleInputChange('index_number', value)}
              required
              placeholder="e.g. 12345678901"
            />
            <Select
              label={t('preNAsMarks.assessmentType')}
              value={formData.assessment_type}
              onChange={(value) => handleInputChange('assessment_type', value)}
              options={[
                { value: 'KCPE', label: 'KCPE' },
                { value: 'CBC', label: 'CBC' },
                { value: 'Other', label: 'Other' }
              ]}
              required
            />
            <Input
              label={t('preNAsMarks.year')}
              type="number"
              value={formData.year.toString()}
              onChange={(value) => handleInputChange('year', parseInt(value) || new Date().getFullYear())}
              required
              min="2000"
              max={new Date().getFullYear()}
            />
            <Select
              label={t('preNAsMarks.verified')}
              value={formData.verified ? 'true' : 'false'}
              onChange={(value) => handleInputChange('verified', value === 'true')}
              options={[
                { value: 'false', label: t('common.unverified') },
                { value: 'true', label: t('common.verified') }
              ]}
            />
          </div>
        </div>
      )
    },
    {
      id: 'core_subjects',
      label: t('preNAsMarks.tabs.coreSubjects'),
      icon: <AcademicCapIcon className="w-5 h-5" />,
      required: true,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label={t('preNAsMarks.subjects.english')}
              type="number"
              value={formData.english.toString()}
              onChange={(value) => handleInputChange('english', parseInt(value) || 0)}
              min="0"
              max="100"
              required
            />
            <Input
              label={t('preNAsMarks.subjects.kiswahili')}
              type="number"
              value={formData.kiswahili?.toString() ?? ''}
              onChange={(value) => handleInputChange('kiswahili', parseInt(value) || 0)}
              min="0"
              max="100"
              required
            />
            <Input
              label={t('preNAsMarks.subjects.mathematics')}
              type="number"
              value={formData.mathematics.toString()}
              onChange={(value) => handleInputChange('mathematics', parseInt(value) || 0)}
              min="0"
              max="100"
              required
            />
            <Input
              label={t('preNAsMarks.subjects.science')}
              type="number"
              value={formData.science?.toString() ?? ''}
              onChange={(value) => handleInputChange('science', parseInt(value) || 0)}
              min="0"
              max="100"
              required
            />
            <Input
              label={t('preNAsMarks.subjects.socialStudies')}
              type="number"
              value={formData.social_studies?.toString() ?? ''}
              onChange={(value) => handleInputChange('social_studies', parseInt(value) || 0)}
              min="0"
              max="100"
              required
            />
          </div>
        </div>
      )
    },
    {
      id: 'additional_subjects',
      label: t('preNAsMarks.tabs.additionalSubjects'),
      icon: <AcademicCapIcon className="w-5 h-5" />,
      required: false,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            {t('preNAsMarks.additionalSubjectsNote')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label={t('preNAsMarks.subjects.integratedScience')}
              type="number"
              value={formData.integrated_science?.toString() || ''}
              onChange={(value) => handleInputChange('integrated_science', value ? parseInt(value) : undefined)}
              min="0"
              max="100"
              placeholder="Optional"
            />
            <Input
              label={t('preNAsMarks.subjects.preTechnicalStudies')}
              type="number"
              value={formData.pre_technical_studies?.toString() || ''}
              onChange={(value) => handleInputChange('pre_technical_studies', value ? parseInt(value) : undefined)}
              min="0"
              max="100"
              placeholder="Optional"
            />
            <Input
              label={t('preNAsMarks.subjects.creativeArts')}
              type="number"
              value={formData.creative_arts?.toString() || ''}
              onChange={(value) => handleInputChange('creative_arts', value ? parseInt(value) : undefined)}
              min="0"
              max="100"
              placeholder="Optional"
            />
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('preNAsMarks.title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('preNAsMarks.description')}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleBulkImport}
            icon={ArrowUpTrayIcon}
            variant="secondary"
          >
            {t('preNAsMarks.actions.bulkImport')}
          </Button>
          <Button
            onClick={() => openModal()}
            icon={PlusIcon}
            variant="primary"
          >
            {t('preNAsMarks.actions.addMarks')}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
          <Input
            label={t('preNAsMarks.search')}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('preNAsMarks.searchPlaceholder')}
            leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
          />
          <Select
            label={t('preNAsMarks.filterAssessmentType')}
            value={filterAssessmentType}
            onValueChange={(value) => setFilterAssessmentType(Array.isArray(value) ? value[0] ?? '' : value)}
            options={[
              { value: 'all', label: t('preNAsMarks.allAssessmentTypes') },
              { value: 'KCPE', label: 'KCPE' },
              { value: 'CBC', label: 'CBC' },
              { value: 'Other', label: 'Other' }
            ]}
          />
          <Select
            label={t('preNAsMarks.filterYear')}
            value={filterYear}
            onValueChange={(value) => setFilterYear(Array.isArray(value) ? value[0] ?? '' : value)}
            options={[
              { value: 'all', label: t('preNAsMarks.allYears') },
              ...Array.from({ length: 10 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return { value: year.toString(), label: year.toString() };
              })
            ]}
          />
          <Select
            label={t('preNAsMarks.filterVerified')}
            value={filterVerified}
            onValueChange={(value) => setFilterVerified(Array.isArray(value) ? value[0] ?? '' : value)}
            options={[
              { value: 'all', label: t('preNAsMarks.allVerificationStatus') },
              { value: 'verified', label: t('common.verified') },
              { value: 'unverified', label: t('common.unverified') }
            ]}
          />
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearchTerm('');
                setFilterAssessmentType('all');
                setFilterYear('all');
                setFilterVerified('all');
              }}
              variant="secondary"
              size="sm"
            >
              {t('common.clearFilters')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main content area */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <Card>
          <DataGrid
            data={filteredMarks}
            columns={marksColumns}
            actions={getMarksActions}
            emptyMessage={t('preNAsMarks.messages.noMarksFound')}
          />
        </Card>
      )}

      {/* Add/Edit Marks Dialog */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingMarks ? t('preNAsMarks.actions.editMarks') : t('preNAsMarks.actions.addMarks')}
        size="lg"
        onSubmit={handleSubmit}
      >
        <TabbedForm
          tabs={createFormTabs()}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCancel={closeModal}
          submitLabel={editingMarks ? t('common.updateMarks') : t('common.addMarks')}
          cancelLabel={t('common.cancel')}
        />
      </DialogForm>

      {/* Bulk Import Dialog */}
      <DialogForm
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        title={t('preNAsMarks.bulkImport.title')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center py-8">
            <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('preNAsMarks.bulkImport.title')}
            </h3>
            <p className="text-gray-500 mb-4">
              {t('preNAsMarks.bulkImport.description')}
            </p>
            <Button variant="primary" size="lg">
              {t('preNAsMarks.bulkImport.selectFile')}
            </Button>
          </div>
        </div>
        <FormActions>
          <Button variant="secondary" onClick={() => setIsBulkImportOpen(false)}>
            {t('common.close')}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default PreNAsMarksManagement;
