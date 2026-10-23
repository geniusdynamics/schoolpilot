import { logger } from '@/utils/logging';

// ABOUTME: This page component allows users to manage exam sessions and their paper settings.
// ABOUTME: CRUD goes through the academics module context; period and paper ids stay strings, names resolve at read time.

import React, { useCallback, useState, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useAcademicDataContext } from '../data/AcademicDataContext';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

type Id = string | number;

interface ExamPaperSetting {
  id: string;
  exam_session_id: string;
  subject_paper_id: string;
  marks_out_of: number;
  weight_percentage: number;
  subject_name: string;
  subject_paper_name: string;
}

interface ExamSession {
  id: string;
  name: string;
  school_period_id: string;
  school_period_name: string;
  status: ExamSessionStatus;
  paper_settings: ExamPaperSetting[];
}

interface StoredSession {
  id: Id;
  name: string;
  school_period_id?: Id | null;
  school_period_name?: string | null;
  status: ExamSessionStatus;
  paper_settings?: Array<{ id: Id; subject_paper_id?: Id | null; marks_out_of: number; weight_percentage: number; subject_name?: string | null; subject_paper_name?: string | null }>;
}
interface PeriodRecord { id: Id; name?: string | null; period_definition_id?: Id | null; period_definition_name?: string | null; start_date?: string | null; is_active?: boolean }
interface PaperRecord { id: Id; name?: string | null; subject_id?: Id | null; subject_name?: string | null }
interface Named { id: Id; name?: string | null }

interface ExamSessionFormData {
  name?: string;
  school_period_id?: string;
  status: ExamSessionStatus;
}

interface PaperSettingFormData {
  subject_paper_id?: string;
  marks_out_of?: number;
  weight_percentage?: number;
}

const idOf = (value: Id | null | undefined): string => (value == null ? '' : String(value));

export const ExamSessionsPageContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const academic = useAcademicDataContext();
  const {
    addExamSession,
    updateExamSession,
    deleteExamSession,
    addExamPaperSetting,
    updateExamPaperSetting,
    deleteExamPaperSetting
  } = academic;
  const [isSaving, setIsSaving] = useState(false);

  const schoolPeriods = useMemo(() => (academic.schoolPeriods ?? []) as unknown as PeriodRecord[], [academic.schoolPeriods]);
  const periodDefinitions = useMemo(() => (academic.academicPeriodDefinitions ?? []) as unknown as Named[], [academic.academicPeriodDefinitions]);
  const subjects = useMemo(() => (academic.subjects ?? []) as Named[], [academic.subjects]);
  const subjectPapers = useMemo(() => ((academic.subjectPapers ?? []) as PaperRecord[]).map(paper => ({
    id: idOf(paper.id),
    name: paper.name ?? '',
    subject_name: subjects.find(s => idOf(s.id) === idOf(paper.subject_id))?.name ?? paper.subject_name ?? '',
  })), [academic.subjectPapers, subjects]);

  const periodLabel = useCallback((period: PeriodRecord) =>
    period.name || period.period_definition_name
    || periodDefinitions.find(d => idOf(d.id) === idOf(period.period_definition_id))?.name
    || period.start_date || idOf(period.id), [periodDefinitions]);

  const examSessions = useMemo<ExamSession[]>(() =>
    ((academic.examSessions ?? []) as unknown as StoredSession[]).map(session => {
      const period = schoolPeriods.find(sp => idOf(sp.id) === idOf(session.school_period_id));
      return {
        id: idOf(session.id),
        name: session.name,
        school_period_id: idOf(session.school_period_id),
        school_period_name: (period ? periodLabel(period) : session.school_period_name) ?? '',
        status: session.status,
        paper_settings: (session.paper_settings ?? []).map(setting => {
          const paper = subjectPapers.find(p => p.id === idOf(setting.subject_paper_id));
          return {
            id: idOf(setting.id),
            exam_session_id: idOf(session.id),
            subject_paper_id: idOf(setting.subject_paper_id),
            marks_out_of: setting.marks_out_of,
            weight_percentage: setting.weight_percentage,
            subject_name: paper?.subject_name || setting.subject_name || '',
            subject_paper_name: paper?.name || setting.subject_paper_name || '',
          };
        }),
      };
    }), [academic.examSessions, schoolPeriods, periodLabel, subjectPapers]);

  const defaultPeriodId = idOf((schoolPeriods.find(sp => sp.is_active) ?? schoolPeriods[0])?.id) || undefined;

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isPaperSettingModalOpen, setIsPaperSettingModalOpen] = useState(false);
  
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);
  const [currentSessionForPapers, setCurrentSessionForPapers] = useState<ExamSession | null>(null);
  const [editingPaperSetting, setEditingPaperSetting] = useState<ExamPaperSetting | null>(null);
  
  const initialSessionFormData: ExamSessionFormData = { 
    name: '', 
    school_period_id: defaultPeriodId,
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
      {...initialSessionFormData, school_period_id: defaultPeriodId }
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
        [name]: name === 'school_period_id' ? (value || undefined) : value
    }));
  };

  const handlePaperSettingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaperSettingFormData(prev => ({ 
        ...prev, 
        [name]: name === 'marks_out_of' || name === 'weight_percentage'
          ? (value === '' ? undefined : parseFloat(value))
          : (value || undefined)
    }));
  };

  const handleSessionSubmit = async () => {
    if (!sessionFormData.name || !sessionFormData.school_period_id) {
      toast.showWarning(t('validation.examSessionNameAndSchoolPeriodAreRequired'));
      return;
    }
    const payload = {
      name: sessionFormData.name,
      school_period_id: sessionFormData.school_period_id,
      status: sessionFormData.status,
    };

    setIsSaving(true);
    try {
      if (editingSession) {
        await updateExamSession(editingSession.id, payload as never);
      } else {
        await addExamSession(payload as never);
      }
      closeSessionModal();
    } catch (error) {
      logger.error('Failed to save exam session:', error);
      toast.showError('Unable to save the exam session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePaperSettingSubmit = async () => {
    if (!activeSessionForPapers || !paperSettingFormData.subject_paper_id || paperSettingFormData.marks_out_of === undefined || paperSettingFormData.weight_percentage === undefined) {
      toast.showWarning(t('validation.subjectPaperMarksOutOfAndWeightPercentageAreRequired'));
      return;
    }

    const marksOutOf = Number(paperSettingFormData.marks_out_of);
    const weightPercentage = Number(paperSettingFormData.weight_percentage);
    const hasDuplicatePaper = (activeSessionForPapers.paper_settings || []).some((setting) =>
      setting.subject_paper_id === paperSettingFormData.subject_paper_id &&
      setting.id !== editingPaperSetting?.id
    );

    if (marksOutOf <= 0 || weightPercentage <= 0) {
      toast.showWarning('Marks out of and weight percentage must be greater than zero.');
      return;
    }

    if (hasDuplicatePaper) {
      toast.showError('This subject paper is already configured for the selected exam session.');
      return;
    }

    const payload = {
      exam_session_id: activeSessionForPapers.id,
      subject_paper_id: paperSettingFormData.subject_paper_id,
      marks_out_of: marksOutOf,
      weight_percentage: weightPercentage,
    };

    try {
      if (editingPaperSetting) {
        await updateExamPaperSetting(editingPaperSetting.id, payload as never);
      } else {
        await addExamPaperSetting(payload as never);
      }
      setEditingPaperSetting(null); 
      setPaperSettingFormData(initialPaperSettingFormData); 
    } catch (error) {
      logger.error('Failed to save exam paper setting:', error);
      toast.showError('Unable to save the paper setting. Please try again.');
    }
  };

  const confirm = useConfirm();
  const handleDeleteSession = async (id: string) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this exam session? This will also delete all its paper settings and might affect related results.' }))) {
      try {
        await deleteExamSession(id);
      } catch (error) {
        logger.error('Failed to delete exam session:', error);
        toast.showError('Unable to delete the exam session. Please try again.');
      }
    }
  };

  const toast = useToast();
  const handleDeletePaperSetting = async (paperSettingId: string) => {
      if (!activeSessionForPapers) return;
      if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this paper setting?' }))) {
          try {
            await deleteExamPaperSetting(paperSettingId);
          } catch (error) {
            logger.error('Failed to delete exam paper setting:', error);
            toast.showError('Unable to delete the paper setting. Please try again.');
          }
      }
  };

  const sessionColumns: DataGridColumn<ExamSession>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Exam Session Name' },
    { key: 'school_period_name', header: 'School Period' },
    { key: 'status', header: 'Status', 
        render: (_value: any, item: ExamSession) => {
            let colorClass = 'bg-gray-200 text-surface-foreground';
            if (item.status === ExamSessionStatus.PLANNING) colorClass = 'bg-primary-100 text-primary-800';
            else if (item.status === ExamSessionStatus.MARKS_ENTRY_OPEN) colorClass = 'bg-yellow-100 text-yellow-800';
            else if (item.status === ExamSessionStatus.PUBLISHED) colorClass = 'bg-green-100 text-green-800';
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
        }
    },
    { key: 'papers_configured_count', header: 'Papers Configured', render: (_value: any, item: ExamSession) => item.paper_settings?.length || 0 },
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

return (
    <div className="space-y-3">
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
              value={sessionFormData.school_period_id ?? ''}
              onChange={handleSessionInputChange}
              required
            >
              <option value="">Select School Period</option>
              {schoolPeriods.map(period => (
                <option key={period.id} value={idOf(period.id)}>{periodLabel(period)}</option>
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
          <Button onClick={handleSessionSubmit} loading={isSaving}>
            {editingSession ? 'Save Changes' : 'Add Session'}
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
                  <Select name="subject_paper_id" value={paperSettingFormData.subject_paper_id ?? ''} onChange={handlePaperSettingInputChange} required>
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
                <Button onClick={handlePaperSettingSubmit} size="sm">
                  {editingPaperSetting ? 'Update Paper' : 'Add Paper'}
                </Button>
              </FormActions>
            </Card>
            
            <h4 className="text-md font-semibold text-surface-foreground mt-6">Configured Papers for this Session</h4>
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
  <div className="space-y-3">
    <ExamSessionsPageContent />
  </div>
);

export default ExamSessionsPage;
