// src/modules/academics/components/EducationSystemForm.tsx

import React, { useState, useEffect } from 'react';
import { EducationSystemConfiguration, EducationSystemType, GradingSystemType, AcademicPeriodType, AssessmentType } from '../data/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Card from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface EducationSystemFormProps {
  initialData?: Partial<EducationSystemConfiguration>;
  onSave: (data: Partial<EducationSystemConfiguration>) => void;
  onCancel: () => void;
}

const EducationSystemForm: React.FC<EducationSystemFormProps> = ({
  initialData,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<EducationSystemConfiguration>>({
    name: '',
    country_code: '',
    system_type: EducationSystemType.SECONDARY,
    grading_system_type: GradingSystemType.LETTER_GRADES,
    min_grade_level: 1,
    max_grade_level: 12,
    academic_period_type: AcademicPeriodType.TERM,
    periods_per_year: 3,
    passing_grade: 50,
    max_grade_value: 100,
    grade_precision: 0,
    assessment_types: [AssessmentType.FORMATIVE, AssessmentType.SUMMATIVE],
    continuous_assessment_weight: 40,
    final_exam_weight: 60,
    uses_credit_hours: false,
    uses_competency_tracking: false,
    competency_levels: [],
    allows_grade_repetition: true,
    max_subjects_per_student: 15,
    min_subjects_per_student: 5,
    is_active: true,
    is_default: false,
    ...initialData
  });

  const handleInputChange = (field: keyof EducationSystemConfiguration, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssessmentTypeChange = (type: AssessmentType, checked: boolean) => {
    const currentTypes = formData.assessment_types || [];
    if (checked) {
      handleInputChange('assessment_types', [...currentTypes, type]);
    } else {
      handleInputChange('assessment_types', currentTypes.filter(t => t !== type));
    }
  };

  const validateWeights = () => {
    const continuous = formData.continuous_assessment_weight || 0;
    const final = formData.final_exam_weight || 0;
    return continuous + final === 100;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="structure">Academic Structure</TabsTrigger>
          <TabsTrigger value="grading">Grading System</TabsTrigger>
          <TabsTrigger value="assessment">Assessment Rules</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="System Name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="e.g., Kenya CBC Secondary System"
              />
              
              <Input
                label="Country Code"
                value={formData.country_code || ''}
                onChange={(e) => handleInputChange('country_code', e.target.value)}
                maxLength={3}
                placeholder="KE"
              />

              <Select
                label="Education System Type"
                value={formData.system_type}
                onChange={(value) => handleInputChange('system_type', value)}
                options={Object.values(EducationSystemType).map(type => ({
                  value: type,
                  label: type
                }))}
              />
              
              <div className="flex items-center space-x-4">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active || false}
                  onChange={(checked) => handleInputChange('is_active', checked)}
                />
                <label htmlFor="is_active">System Active</label>
                
                <Checkbox
                  id="is_default"
                  checked={formData.is_default || false}
                  onChange={(checked) => handleInputChange('is_default', checked)}
                />
                <label htmlFor="is_default">Default System</label>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => onSave(formData)}
          disabled={!validateWeights() || !formData.name}
        >
          Save Education System
        </Button>
      </div>
    </div>
  );
};

export default EducationSystemForm;

