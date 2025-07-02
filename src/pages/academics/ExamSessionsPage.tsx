// ABOUTME: This page component allows users to manage exam sessions and their paper settings.
// ABOUTME: It uses modals for creating/editing sessions and configuring subject papers for each exam.

import React, { useState, useMemo, useEffect } from 'react';
import { SchoolPeriod } from '../../types';
import { ExamSession, SubjectPaper, ExamPaperSetting, ExamSessionStatus } from '../../core/types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, ChartPieIcon, ListBulletIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; 
import Spinner from '../../components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type ExamSessionFormData = Omit<Partial<ExamSession>, 'id' | 'created_at' | 'updated_at' | 'school_period_name' | 'paper_settings' | 'status'> & {
    status: ExamSessionStatus; 
};

type PaperSettingFormData = Omit<Partial<ExamPaperSetting>, 'id' | 'exam_session_id'| 'created_at' | 'updated_at' | 'subject_paper_name' | 'subject_name'>;


const ExamSessionsPage: React.FC = () => {
  const { 
    examSessions, 
    schoolPeriods, 
    subjectPapers, 
    loading, 
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
        [name]: name === 'subject_paper_id' || name === 'marks_out_of' || name === 'weight_percentage' ? parseFloat(value) : value 
    }));
  };


  const handleSessionSubmit = async () => {
    if (!sessionFormData.name || !sessionFormData.school_period_id) {
      alert("Exam session name and school period are required.");
      return;
    }
    const payload = {
      name: sessionFormData.name!,
      school_period_id: Number(sessionFormData.school_period_id!),
      status: sessionFormData.status!,
    };

    if (editingSession) {
      // TODO: Implement updateExamSession when available in context
    } else {
      // TODO: Implement addExamSession when available in context
    }
    closeSessionModal();
  };
  
  const handlePaperSettingSubmit = async () => {
    if (!currentSessionForPapers || !paperSettingFormData.subject_paper_id || paperSettingFormData.marks_out_of === undefined || paperSettingFormData.weight_percentage === undefined) {
      alert("Subject Paper, Marks Out Of, and Weight Percentage are required.");
      return;
    }
    const payload: Omit<ExamPaperSetting, 'id' | 'created_at' | 'updated_at' | 'subject_paper_name' | 'subject_name'> = {
      exam_session_id: currentSessionForPapers.id,
      subject_paper_id: Number(paperSettingFormData.subject_paper_id!),
      marks_out_of: Number(paperSettingFormData.marks_out_of),
      weight_percentage: Number(paperSettingFormData.weight_percentage),
    };

    if (editingPaperSetting) {
      // TODO: Implement updateExamPaperSetting when available in context
    } else {
      // TODO: Implement addExamPaperSetting when available in context
    }
    
    const updatedSession = examSessions.find(es => es.id === currentSessionForPapers.id);
    if(updatedSession) setCurrentSessionForPapers(updatedSession);
    
    setEditingPaperSetting(null); 
    setPaperSettingFormData(initialPaperSettingFormData); 
  };


  const handleDeleteSession = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam session? This will also delete all its paper settings and might affect related results.')) {
      // TODO: Implement deleteExamSession when available in context
    }
  };

  const handleDeletePaperSetting = async (paperSettingId: string) => {
      if (!currentSessionForPapers) return;
      if (window.confirm('Are you sure you want to delete this paper setting?')) {
          // TODO: Implement deleteExamPaperSetting when available in context
           const updatedSession = examSessions.find(es => es.id === currentSessionForPapers.id);
           if(updatedSession) setCurrentSessionForPapers(updatedSession);
      }
  };

  const sessionColumns = [
    { header: 'ID', accessor: 'id' as keyof ExamSession },
    { header: 'Exam Session Name', accessor: 'name' as keyof ExamSession },
    { header: 'School Period', accessor: 'school_period_name' as keyof ExamSession },
    { header: 'Status', accessor: 'status' as keyof ExamSession, 
        render: (item: ExamSession) => {
            let colorClass = 'bg-gray-200 text-gray-800';
            if (item.status === ExamSessionStatus.PLANNING) colorClass = 'bg-blue-100 text-blue-800';
            else if (item.status === ExamSessionStatus.MARKS_ENTRY_OPEN) colorClass = 'bg-yellow-100 text-yellow-800';
            else if (item.status === ExamSessionStatus.PUBLISHED) colorClass = 'bg-green-100 text-green-800';
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
        }
    },
    { header: 'Papers Configured', accessor: 'id' as keyof ExamSession, render: (item: ExamSession) => item.paper_settings?.length || 0 },
    {
      header: 'Actions',
      accessor: 'id' as keyof ExamSession,
      render: (item: ExamSession) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openSessionModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => openPaperSettingModal(item)} leftIcon={<ListBulletIcon className="w-4 h-4" />}>Papers</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteSession(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const paperSettingColumns = [
    { header: 'Subject', accessor: 'subject_name' as keyof ExamPaperSetting},
    { header: 'Paper', accessor: 'subject_paper_name' as keyof ExamPaperSetting},
    { header: 'Marks Out Of', accessor: 'marks_out_of' as keyof ExamPaperSetting },
    { header: 'Weight (%)', accessor: 'weight_percentage' as keyof ExamPaperSetting },
    {
      header: 'Actions',
      accessor: 'id' as keyof ExamPaperSetting,
      render: (item: ExamPaperSetting) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openPaperSettingModal(currentSessionForPapers!, item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
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
        <Table columns={sessionColumns} data={examSessions} isLoading={loading.examSessions && isSessionModalOpen} />
      </Card>

      {/* Session Modal */}
      <Modal isOpen={isSessionModalOpen} onClose={closeSessionModal} title={editingSession ? 'Edit Exam Session' : 'Add New Exam Session'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeSessionModal}>Cancel</Button>
            <Button onClick={handleSessionSubmit} disabled={loading.examSessions}>
              {loading.examSessions ? <Spinner size="sm"/> : (editingSession ? 'Save Changes' : 'Add Session')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Exam Session Name" 
          value={sessionFormData.name || ''} 
          onChange={handleSessionInputChange} 
          required 
        />
        <Select 
          name="school_period_id" 
          label="School Period" 
          value={sessionFormData.school_period_id || ''} 
          onChange={handleSessionInputChange}
          required
        >
          <option value="">Select School Period</option>
          {schoolPeriods.map((period: SchoolPeriod) => (
            <option key={period.id} value={period.id}>{period.name}</option>
          ))}
        </Select>
        <Select 
          name="status" 
          label="Status" 
          value={sessionFormData.status || ''} 
          onChange={handleSessionInputChange}
          required
        >
          {Object.values(ExamSessionStatus).map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
      </Modal>

      {/* Paper Settings Modal */}
      <Modal 
        isOpen={isPaperSettingModalOpen} 
        onClose={closePaperSettingModal} 
        title={`Manage Paper Settings for: ${currentSessionForPapers?.name || ''}`} 
        size="xl"
        footer={<Button variant="secondary" onClick={closePaperSettingModal}>Done</Button>}
      >
        {currentSessionForPapers && (
          <div className="space-y-4">
            <Card title="Add/Edit Paper Setting">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select name="subject_paper_id" label="Subject Paper" value={paperSettingFormData.subject_paper_id || ''} onChange={handlePaperSettingInputChange} required>
                    <option value="">Select Subject Paper</option>
                    {subjectPapers.map(sp => <option key={sp.id} value={sp.id}>{sp.subject_name} - {sp.name}</option>)}
                </Select>
                <Input name="marks_out_of" label="Marks Out Of" type="number" value={paperSettingFormData.marks_out_of || ''} onChange={handlePaperSettingInputChange} required />
                <Input name="weight_percentage" label="Weight (%)" type="number" value={paperSettingFormData.weight_percentage || ''} onChange={handlePaperSettingInputChange} required />
              </div>
              <div className="text-right mt-4">
                <Button onClick={handlePaperSettingSubmit} size="sm" disabled={loading.examSessions}>
                  {loading.examSessions ? <Spinner size="sm"/> : (editingPaperSetting ? 'Update Paper' : 'Add Paper')}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Configured Papers for this Session</h4>
            <Table 
              columns={paperSettingColumns} 
              data={currentSessionForPapers.paper_settings || []} 
              isLoading={loading.examSessions && isPaperSettingModalOpen}
              emptyStateMessage="No papers configured for this exam session yet."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExamSessionsPage;
