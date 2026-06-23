import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';
import { DocumentDuplicateIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, UserIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockMarksEntrySessions } from '../data/mockData';
import type { MarksEntrySession } from '../data/types';

export const MarksEntryByTokenPageContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const { examSessions, subjects, classes, students, loading } = useAppData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [activeSession, setActiveSession] = useState<MarksEntrySession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Use centralized mock data (in production, this would come from useAppData)
  const mockSessions: MarksEntrySession[] = useMemo(() => {
    let filtered = initialMockMarksEntrySessions;

    if (searchTerm) {
      filtered = filtered.filter(session => 
        (session.token_code?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (session.subject_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (session.class_name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [searchTerm]);

  const handleTokenSubmit = () => {
    if (!tokenInput.trim()) {
      alert('Please enter a token code');
      return;
    }
    // In production, this would validate the token and load the session
    const session = mockSessions.find(s => s.token_code === tokenInput);
    if (session) {
      setActiveSession(session);
      setIsModalOpen(true);
    } else {
      alert('Invalid or expired token');
    }
  };

  const handleMarkChange = (markId: string, field: string, value: string | number) => {
    if (!activeSession) return;
    
    const updatedMarks = activeSession.marks.map(mark => {
      if (mark.id === markId) {
        const updated = { ...mark, [field]: value };
        if (field === 'marks_obtained') {
          const percentage = (value as number) / mark.marks_total * 100;
          updated.grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';
        }
        return updated;
      }
      return mark;
    });
    
    setActiveSession({ ...activeSession, marks: updatedMarks });
  };

  const handleSaveMarks = () => {
    if (!activeSession) return;
    // In production, this would save the marks
    console.log('Saving marks:', activeSession);
    setIsModalOpen(false);
    setActiveSession(null);
    setTokenInput('');
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const sessionColumns: DataGridColumn<MarksEntrySession>[] = [
    {
      key: 'token_code',
      header: 'Token Code',
      sortable: true,
      filterable: true
    },
    {
      key: 'exam_session_name',
      header: 'Exam Session',
      sortable: true,
      filterable: true
    },
    {
      key: 'subject_name',
      header: 'Subject',
      sortable: true,
      filterable: true
    },
    {
      key: 'class_name',
      header: 'Class',
      sortable: true,
      filterable: true
    },
    {
      key: 'teacher_name',
      header: 'Teacher',
      sortable: true,
      filterable: true
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value)
    }
  ];

  if (loading && mockSessions.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading marks entry sessions...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card 
        title={
          <div className="flex items-center gap-2">
            <DocumentDuplicateIcon className="w-6 h-6 text-indigo-600" />
            <span>Marks Entry by Token</span>
          </div>
        }
      >
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3">
            <DocumentDuplicateIcon className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-indigo-800">Token-based Marks Entry</h3>
              <p className="text-sm text-indigo-700 mt-1">
                Enter your secure token to access the marks entry form. Tokens ensure that only authorized teachers 
                can enter marks for their assigned subjects and classes, maintaining data integrity and security.
              </p>
            </div>
          </div>
        </div>

        {/* Token Entry */}
        <div className="mb-6 flex gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Token Code</label>
            <input
              type="text"
              placeholder="TKN-2024-XXXX"
              value={tokenInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenInput(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <Button onClick={handleTokenSubmit} variant="primary">
            Validate Token
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Token, subject, class..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        <DataGrid
          data={mockSessions}
          columns={sessionColumns}
          searchable={false}
          exportable={true}
        />
      </Card>

      {/* Marks Entry Modal */}
      <DialogForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveSession(null);
          setTokenInput('');
        }}
        title={`Enter Marks - ${activeSession?.subject_name} (${activeSession?.class_name})`}
        size="large"
      >
        {activeSession && (
          <>
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Token:</span>
                  <span className="ml-2 font-semibold">{activeSession.token_code}</span>
                </div>
                <div>
                  <span className="text-gray-600">Exam:</span>
                  <span className="ml-2 font-semibold">{activeSession.exam_session_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Teacher:</span>
                  <span className="ml-2 font-semibold">{activeSession.teacher_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2">{getStatusBadge(activeSession.status)}</span>
                </div>
              </div>
            </div>

            <FormSection>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-sm font-semibold">Student</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Admission No</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Marks Obtained</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Total Marks</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold">Grade</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSession.marks.map(mark => (
                    <tr key={mark.id} className="border-b">
                      <td className="px-4 py-2">{mark.student_name}</td>
                      <td className="px-4 py-2">{mark.admission_no}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={mark.marks_total}
                          value={mark.marks_obtained}
                          onChange={(e) => handleMarkChange(mark.id, 'marks_obtained', parseInt(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">{mark.marks_total}</td>
                      <td className="px-4 py-2 text-center font-semibold">{mark.grade}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={mark.remarks}
                          onChange={(e) => handleMarkChange(mark.id, 'remarks', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </FormSection>

            <FormActions
              onCancel={() => {
                setIsModalOpen(false);
                setActiveSession(null);
                setTokenInput('');
              }}
              onSubmit={handleSaveMarks}
              submitLabel="Save Marks"
            />
          </>
        )}
      </DialogForm>
    </div>
  );
};

const MarksEntryByTokenPage: React.FC = () => (
  <div className="space-y-6">
    <MarksEntryByTokenPageContent />
  </div>
);

export default MarksEntryByTokenPage;
