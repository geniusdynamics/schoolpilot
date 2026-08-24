import { logger } from '@/utils/logging';

// ABOUTME: This page component allows users to manage exam sessions and their paper settings.
// ABOUTME: It uses modals for creating/editing sessions and configuring subject papers for each exam.

import React, { useState, useMemo } from 'react';
import { SchoolPeriod } from '@/types';
import { ExamSession, ExamPaperSetting } from '@/core/types';
import { ExamSessionStatus } from '../data/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; 
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/components/ui/ConfirmDialog';

type ExamSessionFormData = Omit<Partial<ExamSession>, 'id' | 'created_at' | 'updated_at' | 'school_period_name' | 'paper_settings' | 'status'> & {
    status: ExamSessionStatus; 
};

type PaperSettingFormData = Omit<Partial<ExamPaperSetting>, 'id' | 'exam_session_id'| 'created_at' | 'updated_at' | 'subject_paper_name' | 'subject_name'>;

export const ExamSessionsPageContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const { 
    examSessions, 
    schoolPeriods, 
    subjectPapers, 
    loading, 
    addExamSession,
    updateExamSession,
    deleteExamSession,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting
  } = useAppData();

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isPaperSettingModalOpen, setIsPaperSettingModalOpen] = useState(false);
  
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);
  const [currentSessionForPapers, setCurrentSessionForPapers] = useState<ExamSession | null>(null);
  const [editingPaperSetting, setEditingPaperSetting] = useState<ExamPaperSetting | null>(null);
  
  const initialSessionFormData: ExamSessionFormData = { 
    name: '', 
    school_period_id: schoolPeriods.find(sp => sp.is_active)?.id || (schoolPeriods.length > 0 ? schoolPeriods[0].id : undefined), 
    status: ExamSessionStatus.PLANNING 
  };
  const [sessionFormData, setSessionFormData] = useState<ExamSessionFormData>(initialSessionFormData);

  const initialPaperSettingFormData: PaperSettingFormData = { subject_paper_id: undefined, marks_out_of: 100, weight_percentage: 100 };
  const [paperSettingFormData, setPaperSettingFormData] = useState<PaperSettingFormData>(initialPaperSettingFormData);

  const activeSessionForPapers = useMemo(() => {
    if (!currentSessionForPapers) {
      return null;
    }

    return examSessions.find((session) => session.id === currentSessionForPapers.id) || currentSessionForPapers;
  }, [currentSessionForPapers, examSessions]);

  // Session Modal
  const openSessionModal = (session?: ExamSession) => {
    setEditingSession(session || null);
    setSessionFormData(session ? 
      { name: session.name, school_period_id: session.school_period_id, status: session.status } : 
      {...initialSessionFormData, school_period_id: schoolPeriods.find(sp => sp.is_active)?.id || initialSessionFormData.school_period_id }
    );
    setIsSessionModalOpen(true);
  };
  const closeSessionModal = () => {
    setIsSessionModalOpen(false);
    setEditingSession(null);
    setSessionFormData(initialSessionFormData);
  };

  // Paper Setting Modal
  const openPaperSettingModal = (session: ExamSession, setting?: ExamPaperSetting) => {
    setCurrentSessionForPapers(session);
    setEditingPaperSetting(setting || null);
    setPaperSettingFormData(setting ? 
      { subject_paper_id: setting.subject_paper_id, marks_out_of: setting.marks_out_of, weight_percentage: setting.weight_percentage } : 
      initialPaperSettingFormData
    );
    setIsPaperSettingModalOpen(true);
  };
  const closePaperSettingModal = () => {
    setIsPaperSettingModalOpen(false);
    setEditingPaperSetting(null);
    setCurrentSessionForPapers(null);
    setPaperSettingFormData(initialPaperSettingFormData);
  };

  const handleSessionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSessionFormData(prev => ({ 
        ...prev, 
        [name]: name === 'school_period_id' ? parseInt(value) : value 
    }));
  };

  const handlePaperSettingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaperSettingFormData(prev => ({ 
        ...prev, 
        [name]: name === 'subject_paper_id' || name === 'marks_out_of' || name === 'weight_percentage'
          ? (value === '' ? undefined : parseFloat(value))
          : value 
    }));
  };

  const handleSessionSubmit = async () => {
    if (!sessionFormData.name || !sessionFormData.school_period_id) {
      alert(t('validation.examSessionNameAndSchoolPeriodAreRequired'));
      return;
    }
    const payload = {
      name: sessionFormData.name!,
      school_period_id: Number(sessionFormData.school_period_id!),
      status: sessionFormData.status!,
    };

    try {
      if (editingSession) {
        await updateExamSession(editingSession.id, payload);
      } else {
        await addExamSession(payload);
      }
      closeSessionModal();
    } catch (error) {
      logger.error('Failed to save exam session:', error);
      alert('Unable to save the exam session. Please try again.');
    }
  };
  
  const handlePaperSettingSubmit = async () => {
    if (!activeSessionForPapers || !paperSettingFormData.subject_paper_id || paperSettingFormData.marks_out_of === undefined || paperSettingFormData.weight_percentage === undefined) {
      alert(t('validation.subjectPaperMarksOutOfAndWeightPercentageAreRequired'));
      return;
    }

    const marksOutOf = Number(paperSettingFormData.marks_out_of);
    const weightPercentage = Number(paperSettingFormData.weight_percentage);
    const hasDuplicatePaper = (activeSessionForPapers.paper_settings || []).some((setting) =>
      setting.subject_paper_id === Number(paperSettingFormData.subject_paper_id) &&
      setting.id !== editingPaperSetting?.id
    );

    if (marksOutOf <= 0 || weightPercentage <= 0) {
      alert('Marks out of and weight percentage must be greater than zero.');
      return;
    }

    if (hasDuplicatePaper) {
      alert('This subject paper is already configured for the selected exam session.');
      return;
    }

    const payload: Omit<ExamPaperSetting, 'id' | 'created_at' | 'updated_at' | 'subject_paper_name' | 'subject_name'> = {
      exam_session_id: activeSessionForPapers.id,
      subject_paper_id: Number(paperSettingFormData.subject_paper_id!),
      marks_out_of: marksOutOf,
      weight_percentage: weightPercentage,
    };

    try {
      if (editingPaperSetting) {
        await updateExamPaperSetting(editingPaperSetting.id, payload);
      } else {
        await addExamPaperSetting(payload);
      }
      setEditingPaperSetting(null); 
      setPaperSettingFormData(initialPaperSettingFormData); 
    } catch (error) {
      logger.error('Failed to save exam paper setting:', error);
      alert('Unable to save the paper setting. Please try again.');
    }
  };

  const confirm = useConfirm();
  const handleDeleteSession = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this exam session? This will also delete all its paper settings and might affect related results.' }))) {
      try {
        await deleteExamSession(id);
      } catch (error) {
        logger.error('Failed to delete exam session:', error);
        alert('Unable to delete the exam session. Please try again.');
      }
    }
  };

  const handleDeletePaperSetting = async (paperSettingId: string) => {
      if (!activeSessionForPapers) return;
      if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this paper setting?' }))) {
          try {
            await deleteExamPaperSetting(paperSettingId);
          } catch (error) {
            logger.error('Failed to delete exam paper setting:', error);
            alert('Unable to delete the paper setting. Please try again.');
          }
      }
  };

  const sessionColumns: DataGridColumn<ExamSession>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Exam Session Name' },
    { key: 'school_period_name', header: 'School Period' },
    { key: 'status', header: 'Status', 
        render: (_value: any, item: ExamSession) => {
            let colorClass = 'bg-gray-200 text-gray-800';
            if (item.status === ExamSessionStatus.PLANNING) colorClass = 'bg-blue-100 text-blue-800';
            else if (item.status === ExamSessionStatus.MARKS_ENTRY_OPEN) colorClass = 'bg-yellow-100 text-yellow-800';
            else if (item.status === ExamSessionStatus.PUBLISHED) colorClass = 'bg-green-100 text-green-800';
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
        }
    },
    { key: 'id', header: 'Papers Configured', render: (_value: any, item: ExamSession) => item.paper_settings?.length || 0 },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: any, item: ExamSession) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openSessionModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => openPaperSettingModal(item)} leftIcon={<ListBulletIcon className="w-4 h-4" />}>Papers</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteSession(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const paperSettingColumns: DataGridColumn<ExamPaperSetting>[] = [
    { key: 'subject_name', header: 'Subject'},
    { key: 'subject_paper_name', header: 'Paper'},
    { key: 'marks_out_of', header: 'Marks Out Of' },
    { key: 'weight_percentage', header: 'Weight (%)' },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: any, item: ExamPaperSetting) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => activeSessionForPapers && openPaperSettingModal(activeSessionForPapers, item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeletePaperSetting(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Del</Button>
        </div>
      ),
    },
  ];

  if ((loading.examSessions || loading.schoolPeriods || loading.subjectPapers) && !isSessionModalOpen && !isPaperSettingModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Exam Sessions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Exam Sessions Management" actions={
        <Button onClick={() => openSessionModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Exam Session
        </Button>
      }>
        <DataGrid columns={sessionColumns} data={examSessions} />
      </Card>

      {/* Session Modal */}
      <DialogForm isOpen={isSessionModalOpen} onClose={closeSessionModal} title={editingSession ? 'Edit Exam Session' : 'Add New Exam Session'} size="lg">
        <FormSection title="Session Information">
          <FormField label="Exam Session Name" required>
            <Input 
              name="name" 
              value={sessionFormData.name || ''} 
              onChange={handleSessionInputChange} 
              required 
            />
          </FormField>
          <FormField label="School Period" required>
            <Select 
              name="school_period_id" 
              value={sessionFormData.school_period_id ? String(sessionFormData.school_period_id) : ''} 
              onChange={handleSessionInputChange}
              required
            >
              <option value="">Select School Period</option>
              {schoolPeriods.map((period: SchoolPeriod) => (
                <option key={period.id} value={period.id}>{period.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" required>
            <Select 
              name="status" 
              value={sessionFormData.status || ''} 
              onChange={handleSessionInputChange}
              required
            >
              {Object.values(ExamSessionStatus).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </FormField>
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeSessionModal}>Cancel</Button>
          <Button onClick={handleSessionSubmit} disabled={loading.examSessions}>
            {loading.examSessions ? <Spinner size="sm"/> : (editingSession ? 'Save Changes' : 'Add Session')}
          </Button>
        </FormActions>
      </DialogForm>

      {/* Paper Settings Modal */}
      <DialogForm 
        isOpen={isPaperSettingModalOpen} 
        onClose={closePaperSettingModal} 
        title={`Manage Paper Settings for: ${activeSessionForPapers?.name || ''}`} 
        size="xl"
      >
        {activeSessionForPapers && (
          <div className="space-y-4">
            <Card title="Add/Edit Paper Setting">
              <FormSection title="Paper Configuration">
                <FormField label="Subject Paper" required>
                  <Select name="subject_paper_id" value={paperSettingFormData.subject_paper_id ? String(paperSettingFormData.subject_paper_id) : ''} onChange={handlePaperSettingInputChange} required>
                      <option value="">Select Subject Paper</option>
                      {subjectPapers.map(sp => <option key={sp.id} value={sp.id}>{sp.subject_name} - {sp.name}</option>)}
                  </Select>
                </FormField>
                <FormField label="Marks Out Of" required>
                  <Input name="marks_out_of" type="number" value={paperSettingFormData.marks_out_of || ''} onChange={handlePaperSettingInputChange} required />
                </FormField>
                <FormField label="Weight (%)" required>
                  <Input name="weight_percentage" type="number" value={paperSettingFormData.weight_percentage || ''} onChange={handlePaperSettingInputChange} required />
                </FormField>
              </FormSection>
              <FormActions>
                <Button onClick={handlePaperSettingSubmit} size="sm" disabled={loading.examSessions}>
                  {loading.examSessions ? <Spinner size="sm"/> : (editingPaperSetting ? 'Update Paper' : 'Add Paper')}
                </Button>
              </FormActions>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Configured Papers for this Session</h4>
            <DataGrid 
              columns={paperSettingColumns} 
              data={activeSessionForPapers.paper_settings || []} 
            />
          </div>
        )}
        <FormActions>
          <Button variant="secondary" onClick={closePaperSettingModal}>Done</Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

const ExamSessionsPage: React.FC = () => (
  <div className="space-y-6">
    <ExamSessionsPageContent />
  </div>
);

export default ExamSessionsPage;
