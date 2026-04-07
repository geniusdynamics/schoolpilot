import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/forms/FormField';
import Select, { SelectOption } from '@/components/ui/Select';

interface EducationSystemConfig {
  name: string;
  country_code: string;
  system_type: string;
  grading_system_type: string;
  min_grade_level?: number;
  max_grade_level?: number;
  academic_period_type: string;
  periods_per_year: number;
  passing_grade?: number;
  max_grade_value?: number;
  grade_precision?: number;
}

interface EducationSystemFormProps {
  initialValues?: Partial<EducationSystemConfig>;
  onSubmit: (config: Partial<EducationSystemConfig>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const EducationSystemForm: React.FC<EducationSystemFormProps> = ({
  initialValues = {},
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [config, setConfig] = useState<Partial<EducationSystemConfig>>(initialValues);

  const handleSubmit = () => {
    onSubmit(config);
  };

  const handleCancel = () => {
    onCancel();
  };

  const systemTypeOptions: SelectOption[] = [
    { label: 'Primary', value: 'primary' },
    { label: 'Secondary', value: 'secondary' },
    { label: 'University', value: 'university' },
    { label: 'College', value: 'college' },
    { label: 'Technical', value: 'technical' },
    { label: 'Vocational', value: 'vocational' },
  ];

  const gradingSystemOptions: SelectOption[] = [
    { label: 'Letter Grades', value: 'letter_grades' },
    { label: 'Percentage', value: 'percentage' },
    { label: 'Competency Based', value: 'competency_based' },
    { label: 'Points/GPA', value: 'points_gpa' },
    { label: 'Pass/Fail', value: 'pass_fail' },
  ];

  const academicPeriodOptions: SelectOption[] = [
    { label: 'Term', value: 'term' },
    { label: 'Semester', value: 'semester' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Trimester', value: 'trimester' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Education System Configuration</h2>
        <p className="text-sm text-gray-500 mt-1">Configure the education system settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="System Name"
          type="text"
          value={config.name || ''}
          onChange={(e) => setConfig({ ...config, name: e.target.value })}
          placeholder="Enter system name"
          required
        />

        <FormField
          label="Country Code"
          type="text"
          value={config.country_code || ''}
          onChange={(e) => setConfig({ ...config, country_code: e.target.value })}
          placeholder="e.g., KE for Kenya"
          required
        />

        <FormField
          label="System Type"
          type="select"
          value={config.system_type || 'secondary'}
          onChange={(e) => setConfig({ ...config, system_type: e.target.value })}
          options={systemTypeOptions}
          required
        />

        <FormField
          label="Grading System Type"
          type="select"
          value={config.grading_system_type || 'letter_grades'}
          onChange={(e) => setConfig({ ...config, grading_system_type: e.target.value })}
          options={gradingSystemOptions}
          required
        />

        <FormField
          label="Min Grade Level"
          type="number"
          value={config.min_grade_level || ''}
          onChange={(e) => setConfig({ ...config, min_grade_level: parseInt(e.target.value) || undefined })}
          placeholder="Minimum grade level"
        />

        <FormField
          label="Max Grade Level"
          type="number"
          value={config.max_grade_level || ''}
          onChange={(e) => setConfig({ ...config, max_grade_level: parseInt(e.target.value) || undefined })}
          placeholder="Maximum grade level"
        />

        <FormField
          label="Academic Period Type"
          type="select"
          value={config.academic_period_type || 'term'}
          onChange={(e) => setConfig({ ...config, academic_period_type: e.target.value })}
          options={academicPeriodOptions}
          required
        />

        <FormField
          label="Periods Per Year"
          type="number"
          value={config.periods_per_year || 3}
          onChange={(e) => setConfig({ ...config, periods_per_year: parseInt(e.target.value) || 3 })}
          min="1"
          max="12"
          required
        />

        <FormField
          label="Passing Grade"
          type="number"
          value={config.passing_grade || ''}
          onChange={(e) => setConfig({ ...config, passing_grade: parseInt(e.target.value) || undefined })}
          placeholder="Minimum passing grade"
        />

        <FormField
          label="Max Grade Value"
          type="number"
          value={config.max_grade_value || ''}
          onChange={(e) => setConfig({ ...config, max_grade_value: parseInt(e.target.value) || undefined })}
          placeholder="Maximum grade value"
        />

        <FormField
          label="Grade Precision"
          type="number"
          value={config.grade_precision || ''}
          onChange={(e) => setConfig({ ...config, grade_precision: parseInt(e.target.value) || undefined })}
          placeholder="Number of decimal places"
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
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default EducationSystemForm;