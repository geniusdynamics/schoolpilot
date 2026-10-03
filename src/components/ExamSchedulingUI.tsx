import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/forms/FormField';
import Input from '@/components/ui/Input';
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
        <h2 className="text-2xl font-bold text-surface-foreground">Schedule New Exam</h2>
        <p className="text-sm text-surface-muted-fg mt-1">Configure exam details and assign resources</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Exam Name">
          <Input
            type="text"
            value={exam.name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExam({ ...exam, name: e.target.value })}
            placeholder="Enter exam name"
            required
          />
        </FormField>

        <FormField label="Subject">
          <Input
            type="text"
            value={exam.subject || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExam({ ...exam, subject: e.target.value })}
            placeholder="Enter subject"
            required
          />
        </FormField>

        <FormField label="Grade Level">
          <Select
            value={exam.gradeLevel || 'Grade 10'}
            onValueChange={(value) => setExam({ ...exam, gradeLevel: Array.isArray(value) ? value[0] : value })}
            options={gradeLevelOptions}
          />
        </FormField>

        <FormField label="Exam Date">
          <Input
            type="date"
            value={exam.examDate || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExam({ ...exam, examDate: e.target.value })}
            required
          />
        </FormField>

        <FormField label="Duration (minutes)">
          <Input
            type="number"
            value={exam.duration || 90}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExam({ ...exam, duration: parseInt(e.target.value) || 90 })}
            min="15"
            max="300"
          />
        </FormField>

        <FormField label="Room Number">
          <Input
            type="text"
            value={exam.roomNumber || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExam({ ...exam, roomNumber: e.target.value })}
            placeholder="Enter room number"
            required
          />
        </FormField>

        <FormField label="Invigilator">
          <Input
            type="text"
            value={exam.invigilator || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExam({ ...exam, invigilator: e.target.value })}
            placeholder="Enter invigilator name"
            required
          />
        </FormField>
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