import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/forms/FormField';
import Select, { SelectOption } from '@/components/ui/Select';

interface Exam {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  examDate: string;
  duration: number;
  roomNumber: string;
  invigilator: string;
}

interface ExamSchedulingUIProps {
  onScheduleExam: (exam: Partial<Exam>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ExamSchedulingUI: React.FC<ExamSchedulingUIProps> = ({
  onScheduleExam,
  onCancel,
  loading = false,
}) => {
  const [exam, setExam] = useState<Partial<Exam>>({
    name: '',
    subject: '',
    gradeLevel: 'Grade 10',
    examDate: new Date().toISOString().split('T')[0],
    duration: 90,
    roomNumber: '',
    invigilator: '',
  });

  const handleSubmit = () => {
    onScheduleExam(exam);
  };

  const handleCancel = () => {
    onCancel();
  };

  const gradeLevelOptions: SelectOption[] = [
    { label: 'Grade 9', value: 'Grade 9' },
    { label: 'Grade 10', value: 'Grade 10' },
    { label: 'Grade 11', value: 'Grade 11' },
    { label: 'Grade 12', value: 'Grade 12' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Schedule New Exam</h2>
        <p className="text-sm text-gray-500 mt-1">Configure exam details and assign resources</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Exam Name"
          type="text"
          value={exam.name || ''}
          onChange={(e) => setExam({ ...exam, name: e.target.value })}
          placeholder="Enter exam name"
          required
        />

        <FormField
          label="Subject"
          type="text"
          value={exam.subject || ''}
          onChange={(e) => setExam({ ...exam, subject: e.target.value })}
          placeholder="Enter subject"
          required
        />

        <FormField
          label="Grade Level"
          type="select"
          value={exam.gradeLevel || 'Grade 10'}
          onChange={(e) => setExam({ ...exam, gradeLevel: e.target.value })}
          options={gradeLevelOptions}
        />

        <FormField
          label="Exam Date"
          type="date"
          value={exam.examDate || ''}
          onChange={(e) => setExam({ ...exam, examDate: e.target.value })}
          required
        />

        <FormField
          label="Duration (minutes)"
          type="number"
          value={exam.duration || 90}
          onChange={(e) => setExam({ ...exam, duration: parseInt(e.target.value) || 90 })}
          min="15"
          max="300"
        />

        <FormField
          label="Room Number"
          type="text"
          value={exam.roomNumber || ''}
          onChange={(e) => setExam({ ...exam, roomNumber: e.target.value })}
          placeholder="Enter room number"
          required
        />

        <FormField
          label="Invigilator"
          type="text"
          value={exam.invigilator || ''}
          onChange={(e) => setExam({ ...exam, invigilator: e.target.value })}
          placeholder="Enter invigilator name"
          required
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Scheduling...' : 'Schedule Exam'}
        </Button>
      </div>
    </div>
  );
};

export default ExamSchedulingUI;