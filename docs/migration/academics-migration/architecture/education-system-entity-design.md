# AcademicSystem Entity + Admin UI Architecture Design

**Date**: January 26, 2025  
**Phase**: 5 - Architecture Design for Missing Capabilities  
**Dependencies**: Phase 3 mapping results  
**Status**: Design Complete ✅

## 1. Executive Summary

This document defines the architecture for the **AcademicSystem** entity and its administrative interface, designed to support diverse educational frameworks including 8-4-4, CBC (Competency-Based Curriculum), university credit-hour systems, and international curricula.

## 2. Entity Architecture

### 2.1 Core AcademicSystem Entity

```typescript
// src/modules/academics/data/types.ts

export enum AcademicSystemType {
  PRIMARY = 'Primary',
  SECONDARY = 'Secondary', 
  TERTIARY = 'Tertiary',
  UNIVERSITY = 'University',
  COLLEGE = 'College',
  VOCATIONAL = 'Vocational',
  INTERNATIONAL = 'International' // For flexible curricula
}

export enum GradingSystemType {
  LETTER_GRADES = 'Letter Grades',        // A, B, C, D, F
  PERCENTAGE = 'Percentage',               // 0-100%
  POINTS = 'Points',                       // GPA 0.0-4.0
  COMPETENCY_BASED = 'Competency Based',   // CBC: Exceeding, Meeting, Approaching, Below
  PASS_FAIL = 'Pass/Fail',
  CUSTOM_CURVE = 'Custom Curve'          // Flexible, to be defined per course
}

export enum AssessmentType {
  FORMATIVE = 'Formative',
  SUMMATIVE = 'Summative', 
  CONTINUOUS = 'Continuous',
  PROJECT_BASED = 'Project Based',
  COMPETENCY = 'Competency',
  PRACTICAL = 'Practical',
  ALTERNATIVE_ASSESSMENT = 'Alternative' // For innovative assessment techniques
}

export enum AcademicPeriodType {
  TERM = 'Term',
  SEMESTER = 'Semester', 
  TRIMESTER = 'Trimester',
  QUARTER = 'Quarter',
  YEAR = 'Year'
}

export interface AcademicSystemConfiguration {
  id: string;
  name: string;
  country_code: string;
  system_type: AcademicSystemType;
  grading_system_type: GradingSystemType;
  
  // Academic Structure
  min_grade_level: number;           // e.g., 1 for Grade 1
  max_grade_level: number;           // e.g., 12 for Grade 12
  academic_period_type: AcademicPeriodType;
  periods_per_year: number;          // 3 for terms, 2 for semesters
  course_modularity: boolean;        // Supports modular courses

  // Grading Configuration
  passing_grade: number;             // Minimum passing grade
  max_grade_value: number;           // 100 for percentage, 4.0 for GPA
  grade_precision: number;           // Decimal places (0, 1, or 2)
  gpa_scaling_factor: number;        // To scale GPA (e.g., 4.5 scale)

  // Assessment Rules
  assessment_types: AssessmentType[];
  continuous_assessment_weight: number; // Percentage of final grade
  final_exam_weight: number;         // Percentage of final grade
  proficiency_based_promotion: boolean; // Pass based on proficiency

  // Credit System (for tertiary)
  uses_credit_hours: boolean;
  min_credits_per_course: number;
  max_credits_per_course: number;
  min_credits_for_graduation: number;
  transfer_credit_accepted: boolean; // Accepts transfer credits
  
  // Competency Tracking (CBC)
  uses_competency_tracking: boolean;
  competency_levels: string[];       // ['Exceeding', 'Meeting', 'Approaching', 'Below']
  
  // System Rules
  allows_grade_repetition: boolean;
  max_subjects_per_student: number;
  min_subjects_per_student: number;
  
  // Metadata
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface AcademicSystemGradingLevel {
  id: string;
  education_system_id: string;
  grade_symbol: string;            // 'A', 'B+', 'Exceeding'
  min_score: number;
  max_score: number;
  points?: number;                 // GPA points
  description: string;
  competency_level?: string;       // For CBC systems
  created_at: string;
}
```

### 2.2 Database Schema

```typescript
// src/modules/academics/data/schema.ts

export const AcademicSystemConfigurationSchema: RxJsonSchema<AcademicSystemConfiguration> = createEntitySchema<AcademicSystemConfiguration>(
  'education_system_configuration',
  {
    id: { type: 'string', maxLength: 100, final: true },
    name: { type: 'string', maxLength: 200 },
    country_code: { type: 'string', maxLength: 3 },
    system_type: { type: 'string', enum: Object.values(AcademicSystemType) },
    grading_system_type: { type: 'string', enum: Object.values(GradingSystemType) },
    
    // Academic Structure
    min_grade_level: { type: 'number' },
    max_grade_level: { type: 'number' },
    academic_period_type: { type: 'string', enum: Object.values(AcademicPeriodType) },
    periods_per_year: { type: 'number', minimum: 1, maximum: 4 },
    course_modularity: { type: 'boolean', default: false },
    
    // Grading Configuration
    passing_grade: { type: 'number' },
    max_grade_value: { type: 'number' },
    grade_precision: { type: 'number', minimum: 0, maximum: 2 },
    gpa_scaling_factor: { type: 'number', default: 4.0 },
    
    // Assessment Rules
    assessment_types: { 
      type: 'array', 
      items: { type: 'string', enum: Object.values(AssessmentType) }
    },
    continuous_assessment_weight: { type: 'number', minimum: 0, maximum: 100 },
    final_exam_weight: { type: 'number', minimum: 0, maximum: 100 },
    proficiency_based_promotion: { type: 'boolean', default: false },
    
    // Credit System
    uses_credit_hours: { type: 'boolean', default: false },
    min_credits_per_course: { type: ['number', 'null'] },
    max_credits_per_course: { type: ['number', 'null'] },
    min_credits_for_graduation: { type: ['number', 'null'] },
    transfer_credit_accepted: { type: 'boolean', default: false },
    
    // Competency Tracking
    uses_competency_tracking: { type: 'boolean', default: false },
    competency_levels: { 
      type: 'array', 
      items: { type: 'string' },
      default: []
    },
    
    // System Rules
    allows_grade_repetition: { type: 'boolean', default: true },
    max_subjects_per_student: { type: 'number', default: 20 },
    min_subjects_per_student: { type: 'number', default: 5 },
    
    // Metadata
    is_active: { type: 'boolean', default: true },
    is_default: { type: 'boolean', default: false },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    created_by: { type: 'string', ref: 'users' }
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'name', 'country_code', 'system_type', 'is_active', 'created_at', 'updated_at'],
  ['name', 'country_code', 'system_type', 'is_active']
);

export const AcademicSystemGradingLevelSchema: RxJsonSchema<AcademicSystemGradingLevel> = createEntitySchema<AcademicSystemGradingLevel>(
  'education_system_grading_level',
  {
    id: { type: 'string', maxLength: 100, final: true },
    education_system_id: { type: 'string', ref: 'education_system_configurations' },
    grade_symbol: { type: 'string', maxLength: 10 },
    min_score: { type: 'number' },
    max_score: { type: 'number' },
    points: { type: ['number', 'null'] },
    description: { type: 'string', maxLength: 500 },
    competency_level: { type: ['string', 'null'], maxLength: 50 },
    created_at: { type: 'string', format: 'date-time' }
  },
  { key: 'id', type: 'string', final: true, maxLength: 100 },
  ['id', 'education_system_id', 'grade_symbol', 'min_score', 'max_score', 'created_at'],
  ['education_system_id', 'grade_symbol']
);
```

## 3. Admin UI Architecture

### 3.1 Component Structure

```
src/modules/academics/pages/
├── AcademicSystemsPage.tsx           # Main listing and management
├── AcademicSystemConfigPage.tsx      # System configuration form
└── AcademicSystemPreviewPage.tsx     # System preview and testing

src/modules/academics/components/
├── AcademicSystemForm.tsx            # Configuration form component
├── GradingLevelManager.tsx            # Grading levels sub-component
├── AssessmentRulesConfig.tsx          # Assessment configuration
├── SystemPreview.tsx                  # Preview component
└── CountrySystemTemplates.tsx         # Pre-configured templates
```

### 3.2 Main Management Page

```typescript
// src/modules/academics/pages/AcademicSystemsPage.tsx

import React, { useState } from 'react';
import { AcademicSystemConfiguration } from '../data/types';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PlusIcon, EditIcon, CopyIcon, EyeIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';

const AcademicSystemsPage: React.FC = () => {
  const { 
    AcademicSystemConfigurations, 
    loading, 
    addAcademicSystemConfiguration,
    updateAcademicSystemConfiguration,
    deleteAcademicSystemConfiguration 
  } = useAppData();

  const [showConfigPage, setShowConfigPage] = useState(false);
  const [editingSystem, setEditingSystem] = useState<AcademicSystemConfiguration | null>(null);

  const columns: DataGridColumn<AcademicSystemConfiguration>[] = [
    { key: 'name', header: 'System Name' },
    { key: 'country_code', header: 'Country' },
    { key: 'system_type', header: 'Type' },
    { 
      key: 'grading_system_type', 
      header: 'Grading System',
      render: (value) => value.replace('_', ' ')
    },
    {
      key: 'is_default',
      header: 'Default',
      render: (value) => value ? '✅' : ''
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (value) => value ? 'Active' : 'Inactive'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, item) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handlePreview(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            Preview
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => handleEdit(item)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => handleClone(item)}
            leftIcon={<CopyIcon className="w-4 h-4" />}
          >
            Clone
          </Button>
        </div>
      )
    }
  ];

  const handleEdit = (system: AcademicSystemConfiguration) => {
    setEditingSystem(system);
    setShowConfigPage(true);
  };

  const handleClone = async (system: AcademicSystemConfiguration) => {
    const clonedSystem = {
      ...system,
      id: undefined, // Will be generated
      name: `${system.name} (Copy)`,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await addAcademicSystemConfiguration(clonedSystem);
  };

  const handlePreview = (system: AcademicSystemConfiguration) => {
    // Navigate to preview page
  };

  if (showConfigPage) {
    return (
      <AcademicSystemConfigPage
        editingSystem={editingSystem}
        onSave={async (system) => {
          if (editingSystem) {
            await updateAcademicSystemConfiguration({ ...editingSystem, ...system });
          } else {
            await addAcademicSystemConfiguration(system);
          }
          setShowConfigPage(false);
          setEditingSystem(null);
        }}
        onCancel={() => {
          setShowConfigPage(false);
          setEditingSystem(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card 
        title="Education System Configurations" 
        actions={
          <Button 
            onClick={() => setShowConfigPage(true)}
            leftIcon={<PlusIcon className="w-5 h-5" />}
          >
            Add Education System
          </Button>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          Configure education systems to support different curricula, grading schemes, and assessment methods.
        </p>
        <DataGrid columns={columns} data={AcademicSystemConfigurations} />
      </Card>
    </div>
  );
};

export default AcademicSystemsPage;
```

### 3.3 Configuration Form Component

```typescript
// src/modules/academics/components/AcademicSystemForm.tsx

import React, { useState, useEffect } from 'react';
import { AcademicSystemConfiguration, AcademicSystemType, GradingSystemType, AcademicPeriodType, AssessmentType } from '../data/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Card from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

interface AcademicSystemFormProps {
  initialData?: Partial<AcademicSystemConfiguration>;
  onSave: (data: Partial<AcademicSystemConfiguration>) => void;
  onCancel: () => void;
}

const AcademicSystemForm: React.FC<AcademicSystemFormProps> = ({
  initialData,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<AcademicSystemConfiguration>>({
    name: '',
    country_code: '',
    system_type: AcademicSystemType.SECONDARY,
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

  const handleInputChange = (field: keyof AcademicSystemConfiguration, value: any) => {
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
                options={Object.values(AcademicSystemType).map(type => ({
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

        <TabsContent value="structure">
          <Card title="Academic Structure">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Minimum Grade Level"
                value={formData.min_grade_level || 1}
                onChange={(e) => handleInputChange('min_grade_level', parseInt(e.target.value))}
                min={1}
              />
              
              <Input
                type="number"
                label="Maximum Grade Level"
                value={formData.max_grade_level || 12}
                onChange={(e) => handleInputChange('max_grade_level', parseInt(e.target.value))}
                min={1}
              />

              <Select
                label="Academic Period Type"
                value={formData.academic_period_type}
                onChange={(value) => handleInputChange('academic_period_type', value)}
                options={Object.values(AcademicPeriodType).map(type => ({
                  value: type,
                  label: type
                }))}
              />
              
              <Input
                type="number"
                label="Periods Per Year"
                value={formData.periods_per_year || 3}
                onChange={(e) => handleInputChange('periods_per_year', parseInt(e.target.value))}
                min={1}
                max={4}
              />

              <Input
                type="number"
                label="Min Subjects Per Student"
                value={formData.min_subjects_per_student || 5}
                onChange={(e) => handleInputChange('min_subjects_per_student', parseInt(e.target.value))}
                min={1}
              />
              
              <Input
                type="number"
                label="Max Subjects Per Student"
                value={formData.max_subjects_per_student || 15}
                onChange={(e) => handleInputChange('max_subjects_per_student', parseInt(e.target.value))}
                min={1}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="grading">
          <Card title="Grading System Configuration">
            <div className="space-y-4">
              <Select
                label="Grading System Type"
                value={formData.grading_system_type}
                onChange={(value) => handleInputChange('grading_system_type', value)}
                options={Object.values(GradingSystemType).map(type => ({
                  value: type,
                  label: type.replace('_', ' ')
                }))}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="number"
                  label="Passing Grade"
                  value={formData.passing_grade || 50}
                  onChange={(e) => handleInputChange('passing_grade', parseFloat(e.target.value))}
                  step="0.1"
                />
                
                <Input
                  type="number"
                  label="Maximum Grade Value"
                  value={formData.max_grade_value || 100}
                  onChange={(e) => handleInputChange('max_grade_value', parseFloat(e.target.value))}
                  step="0.1"
                />
                
                <Input
                  type="number"
                  label="Grade Precision (Decimal Places)"
                  value={formData.grade_precision || 0}
                  onChange={(e) => handleInputChange('grade_precision', parseInt(e.target.value))}
                  min={0}
                  max={2}
                />
              </div>

              {formData.grading_system_type === GradingSystemType.COMPETENCY_BASED && (
                <div>
                  <label className="block text-sm font-medium mb-2">Competency Levels</label>
                  <Input
                    placeholder="Enter levels separated by commas (e.g., Exceeding, Meeting, Approaching, Below)"
                    value={formData.competency_levels?.join(', ') || ''}
                    onChange={(e) => handleInputChange('competency_levels', 
                      e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    )}
                  />
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="assessment">
          <Card title="Assessment Rules">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Assessment Types</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.values(AssessmentType).map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`assessment-${type}`}
                        checked={formData.assessment_types?.includes(type) || false}
                        onChange={(checked) => handleAssessmentTypeChange(type, checked)}
                      />
                      <label htmlFor={`assessment-${type}`} className="text-sm">
                        {type.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Continuous Assessment Weight (%)"
                  value={formData.continuous_assessment_weight || 40}
                  onChange={(e) => handleInputChange('continuous_assessment_weight', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
                
                <Input
                  type="number"
                  label="Final Exam Weight (%)"
                  value={formData.final_exam_weight || 60}
                  onChange={(e) => handleInputChange('final_exam_weight', parseInt(e.target.value))}
                  min={0}
                  max={100}
                />
              </div>

              {!validateWeights() && (
                <div className="text-red-600 text-sm">
                  ⚠️ Assessment weights must add up to 100%
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card title="Advanced Settings">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Checkbox
                  id="uses_credit_hours"
                  checked={formData.uses_credit_hours || false}
                  onChange={(checked) => handleInputChange('uses_credit_hours', checked)}
                />
                <label htmlFor="uses_credit_hours">Uses Credit Hour System</label>
              </div>

              {formData.uses_credit_hours && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="number"
                    label="Min Credits Per Course"
                    value={formData.min_credits_per_course || 1}
                    onChange={(e) => handleInputChange('min_credits_per_course', parseInt(e.target.value))}
                    min={1}
                  />
                  
                  <Input
                    type="number"
                    label="Max Credits Per Course"
                    value={formData.max_credits_per_course || 6}
                    onChange={(e) => handleInputChange('max_credits_per_course', parseInt(e.target.value))}
                    min={1}
                  />
                  
                  <Input
                    type="number"
                    label="Min Credits for Graduation"
                    value={formData.min_credits_for_graduation || 120}
                    onChange={(e) => handleInputChange('min_credits_for_graduation', parseInt(e.target.value))}
                    min={1}
                  />
                </div>
              )}

              <div className="flex items-center space-x-4">
                <Checkbox
                  id="uses_competency_tracking"
                  checked={formData.uses_competency_tracking || false}
                  onChange={(checked) => handleInputChange('uses_competency_tracking', checked)}
                />
                <label htmlFor="uses_competency_tracking">Uses Competency Tracking (CBC)</label>
              </div>

              <div className="flex items-center space-x-4">
                <Checkbox
                  id="allows_grade_repetition"
                  checked={formData.allows_grade_repetition || false}
                  onChange={(checked) => handleInputChange('allows_grade_repetition', checked)}
                />
                <label htmlFor="allows_grade_repetition">Allows Grade Repetition</label>
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

export default AcademicSystemForm;
```

## 4. Integration Points

### 4.1 Module Boundaries

```typescript
// src/modules/academics/data/hooks/useAcademicSystemData.ts

export const useAcademicSystemData = () => {
  // Data management hooks for education systems
  // CRUD operations
  // Validation logic
  // Integration with existing grading schemes
};

// Integration with existing schemas
// Modify existing entities to reference education system:

// src/modules/academics/data/schema.ts (updates)
export const gradingSchemeSchema = createEntitySchema(
  'grading_scheme',
  {
    // ... existing fields
    education_system_id: { type: ['string', 'null'], ref: 'education_system_configurations' },
    // ... rest of schema
  }
);

export const examSessionSchema = createEntitySchema(
  'exam_session', 
  {
    // ... existing fields
    education_system_id: { type: ['string', 'null'], ref: 'education_system_configurations' },
    // ... rest of schema
  }
);
```

### 4.2 Micro-Frontend Compatibility

```typescript
// Custom Element Definition
// src/modules/academics/components/custom-elements/AcademicSystemManager.ce.ts

import { defineCustomElement } from 'vue';
import AcademicSystemManagerWrapper from './AcademicSystemManagerWrapper.vue';

export const AcademicSystemManager = defineCustomElement(AcademicSystemManagerWrapper);
customElements.define('edugen-education-system-manager', AcademicSystemManager);

// TypeScript Interface Contracts
// src/types/micro-frontend-contracts.ts

export interface AcademicSystemMicroFrontendAPI {
  // Event emitters
  onSystemCreated: (system: AcademicSystemConfiguration) => void;
  onSystemUpdated: (system: AcademicSystemConfiguration) => void;
  onSystemDeleted: (systemId: string) => void;
  
  // Data providers
  getActiveSystems: () => Promise<AcademicSystemConfiguration[]>;
  getSystemById: (id: string) => Promise<AcademicSystemConfiguration | null>;
  validateSystemConfiguration: (config: Partial<AcademicSystemConfiguration>) => ValidationResult;
}
```

## 5. Pre-configured Templates

### 5.1 Country-Specific Templates

```typescript
// src/modules/academics/data/templates/education-system-templates.ts

export const EDUCATION_SYSTEM_TEMPLATES: Record<string, Partial<AcademicSystemConfiguration>> = {
  'KENYA_CBC_PRIMARY': {
    name: 'Kenya CBC Primary System',
    country_code: 'KE',
    system_type: AcademicSystemType.PRIMARY,
    grading_system_type: GradingSystemType.COMPETENCY_BASED,
    min_grade_level: 1,
    max_grade_level: 6,
    academic_period_type: AcademicPeriodType.TERM,
    periods_per_year: 3,
    uses_competency_tracking: true,
    competency_levels: ['Exceeding Expectations', 'Meeting Expectations', 'Approaching Expectations', 'Below Expectations'],
    assessment_types: [AssessmentType.FORMATIVE, AssessmentType.SUMMATIVE, AssessmentType.COMPETENCY],
    continuous_assessment_weight: 60,
    final_exam_weight: 40
  },
  
  'KENYA_CBC_SECONDARY': {
    name: 'Kenya CBC Secondary System',
    country_code: 'KE',
    system_type: AcademicSystemType.SECONDARY,
    grading_system_type: GradingSystemType.LETTER_GRADES,
    min_grade_level: 7,
    max_grade_level: 12,
    academic_period_type: AcademicPeriodType.TERM,
    periods_per_year: 3,
    passing_grade: 50,
    max_grade_value: 100,
    assessment_types: [AssessmentType.FORMATIVE, AssessmentType.SUMMATIVE],
    continuous_assessment_weight: 40,
    final_exam_weight: 60
  },
  
  'US_UNIVERSITY_SEMESTER': {
    name: 'US University Semester System',
    country_code: 'US',
    system_type: AcademicSystemType.UNIVERSITY,
    grading_system_type: GradingSystemType.POINTS,
    academic_period_type: AcademicPeriodType.SEMESTER,
    periods_per_year: 2,
    max_grade_value: 4.0,
    grade_precision: 2,
    uses_credit_hours: true,
    min_credits_per_course: 1,
    max_credits_per_course: 6,
    min_credits_for_graduation: 120,
    assessment_types: [AssessmentType.FORMATIVE, AssessmentType.SUMMATIVE, AssessmentType.PROJECT_BASED],
    continuous_assessment_weight: 30,
    final_exam_weight: 70
  }
};
```

## 6. Validation & Business Rules

### 6.1 Validation Service

```typescript
// src/modules/academics/services/AcademicSystemValidationService.ts

export class AcademicSystemValidationService {
  static validateConfiguration(config: Partial<AcademicSystemConfiguration>): ValidationResult {
    const errors: string[] = [];
    
    // Basic validation
    if (!config.name?.trim()) {
      errors.push('System name is required');
    }
    
    if (!config.country_code?.trim()) {
      errors.push('Country code is required');
    }
    
    // Assessment weight validation
    const continuousWeight = config.continuous_assessment_weight || 0;
    const finalWeight = config.final_exam_weight || 0;
    if (continuousWeight + finalWeight !== 100) {
      errors.push('Assessment weights must total 100%');
    }
    
    // Grade level validation
    if ((config.min_grade_level || 0) >= (config.max_grade_level || 0)) {
      errors.push('Maximum grade level must be greater than minimum grade level');
    }
    
    // Credit hours validation
    if (config.uses_credit_hours) {
      if (!config.min_credits_per_course || !config.min_credits_for_graduation) {
        errors.push('Credit hour system requires minimum credits configuration');
      }
    }
    
    // Competency tracking validation
    if (config.uses_competency_tracking) {
      if (!config.competency_levels || config.competency_levels.length === 0) {
        errors.push('Competency tracking requires competency levels definition');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static async validateUniqueDefault(
    config: AcademicSystemConfiguration, 
    existingSystems: AcademicSystemConfiguration[]
  ): Promise<ValidationResult> {
    if (config.is_default) {
      const hasOtherDefault = existingSystems.some(
        system => system.id !== config.id && system.is_default
      );
      
      if (hasOtherDefault) {
        return {
          isValid: false,
          errors: ['Only one education system can be set as default. Please unset the current default system first.']
        };
      }
    }
    
    return { isValid: true, errors: [] };
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

This architecture provides a comprehensive foundation for managing diverse education systems while maintaining compatibility with the existing micro-frontend architecture and supporting future extensibility.

<citations>
<document>
<document_type>RULE</document_type>
<document_id>8viBk1SCnMHtLO8Bx9ECg1</document_id>
</document>
<document>
<document_type>WARP_DRIVE_NOTEBOOK</document_type>
<document_id>IPIWz5VARmcBVOWCOjN9NE</document_id>
</document>
</citations>
