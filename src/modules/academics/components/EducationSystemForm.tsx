// src/modules/academics/components/EducationSystemForm.tsx

import React, { useState } from 'react';
import { EducationSystemConfiguration, EducationSystemType, GradingSystemType, AcademicPeriodType, AssessmentType } from '../data/types';
import { EDUCATION_SYSTEM_TEMPLATES } from '../data/templates/education-system-templates';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('basic');

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

  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const template = EDUCATION_SYSTEM_TEMPLATES[templateKey];
    if (!template) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      ...template
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

              <Select
                label="Template"
                value={selectedTemplate}
                onChange={(value) => applyTemplate(String(value))}
                options={Object.entries(EDUCATION_SYSTEM_TEMPLATES).map(([key, template]) => ({
                  value: key,
                  label: template.name || key
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

        <TabsContent value="structure">
          <Card title="Academic Structure">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Minimum Grade Level" type="number" value={formData.min_grade_level || 1} onChange={(e) => handleInputChange('min_grade_level', Number(e.target.value) || 1)} />
              <Input label="Maximum Grade Level" type="number" value={formData.max_grade_level || 12} onChange={(e) => handleInputChange('max_grade_level', Number(e.target.value) || 12)} />
              <Select
                label="Academic Period Type"
                value={formData.academic_period_type}
                onChange={(value) => handleInputChange('academic_period_type', value)}
                options={Object.values(AcademicPeriodType).map(type => ({ value: type, label: type }))}
              />
              <Input label="Periods Per Year" type="number" value={formData.periods_per_year || 3} onChange={(e) => handleInputChange('periods_per_year', Number(e.target.value) || 1)} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="grading">
          <Card title="Grading System">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Grading System"
                value={formData.grading_system_type}
                onChange={(value) => handleInputChange('grading_system_type', value)}
                options={Object.values(GradingSystemType).map(type => ({ value: type, label: type }))}
              />
              <Input label="Passing Grade" type="number" value={formData.passing_grade || 0} onChange={(e) => handleInputChange('passing_grade', Number(e.target.value) || 0)} />
              <Input label="Maximum Grade Value" type="number" value={formData.max_grade_value || 100} onChange={(e) => handleInputChange('max_grade_value', Number(e.target.value) || 100)} />
              <Input label="Grade Precision" type="number" value={formData.grade_precision || 0} onChange={(e) => handleInputChange('grade_precision', Number(e.target.value) || 0)} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="assessment">
          <Card title="Assessment Rules">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Continuous Assessment Weight" type="number" value={formData.continuous_assessment_weight || 0} onChange={(e) => handleInputChange('continuous_assessment_weight', Number(e.target.value) || 0)} />
              <Input label="Final Exam Weight" type="number" value={formData.final_exam_weight || 0} onChange={(e) => handleInputChange('final_exam_weight', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              {Object.values(AssessmentType).map((type) => (
                <div key={type} className="flex items-center space-x-3">
                  <Checkbox
                    id={`assessment-${type}`}
                    checked={(formData.assessment_types || []).includes(type)}
                    onChange={(checked) => handleAssessmentTypeChange(type, checked)}
                  />
                  <label htmlFor={`assessment-${type}`}>{type}</label>
                </div>
              ))}
            </div>
            {!validateWeights() && (
              <p className="mt-3 text-sm text-red-600">Continuous assessment and final exam weights must add up to 100.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card title="Advanced Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Minimum Subjects Per Student" type="number" value={formData.min_subjects_per_student || 0} onChange={(e) => handleInputChange('min_subjects_per_student', Number(e.target.value) || 0)} />
              <Input label="Maximum Subjects Per Student" type="number" value={formData.max_subjects_per_student || 0} onChange={(e) => handleInputChange('max_subjects_per_student', Number(e.target.value) || 0)} />
              <div className="flex items-center space-x-3">
                <Checkbox id="uses_competency_tracking" checked={formData.uses_competency_tracking || false} onChange={(checked) => handleInputChange('uses_competency_tracking', checked)} />
                <label htmlFor="uses_competency_tracking">Use competency tracking</label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="uses_credit_hours" checked={formData.uses_credit_hours || false} onChange={(checked) => handleInputChange('uses_credit_hours', checked)} />
                <label htmlFor="uses_credit_hours">Use credit hours</label>
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

