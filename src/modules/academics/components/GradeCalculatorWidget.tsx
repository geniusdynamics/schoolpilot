// src/modules/academics/components/GradeCalculatorWidget.tsx

import React, { useState, useEffect } from 'react';
import { GradingEngineService } from '../services/GradingEngineService';
import { EducationSystemConfiguration, GradingSystemType, StudentExamResult } from '../data/types';
import { EDUCATION_SYSTEM_TEMPLATES } from '../data/templates/education-system-templates';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface GradeCalculatorWidgetProps {
  onGradeCalculated?: (result: StudentExamResult) => void;
  educationSystem?: EducationSystemConfiguration;
}

const GradeCalculatorWidget: React.FC<GradeCalculatorWidgetProps> = ({ 
  onGradeCalculated,
  educationSystem 
}) => {
  const [marks, setMarks] = useState<number>(0);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [selectedSystem, setSelectedSystem] = useState<string>('KENYA_CBC_SECONDARY');
  const [calculatedGrade, setCalculatedGrade] = useState<string>('');
  const [gradeDescription, setGradeDescription] = useState<string>('');

  const currentSystem = educationSystem || EDUCATION_SYSTEM_TEMPLATES[selectedSystem] as EducationSystemConfiguration;

  useEffect(() => {
    if (marks >= 0 && totalMarks > 0 && currentSystem) {
      calculateGrade();
    }
  }, [marks, totalMarks, currentSystem]);

  const calculateGrade = () => {
    try {
      const gradingEngine = new GradingEngineService(currentSystem);
      const percentage = (marks / totalMarks) * 100;
      
      const mockResult: StudentExamResult = {
        id: 'temp',
        student_id: 'temp',
        exam_session_id: 'temp',
        total_marks: percentage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const calculatedResult = gradingEngine.calculateGrades(mockResult);
      setCalculatedGrade(calculatedResult.mean_grade || 'N/A');
      
      // Set grade description based on system type
      if (currentSystem.grading_system_type === GradingSystemType.COMPETENCY_BASED) {
        setGradeDescription(getCompetencyDescription(percentage));
      } else {
        setGradeDescription(getLetterGradeDescription(calculatedResult.mean_grade || ''));
      }

      if (onGradeCalculated) {
        onGradeCalculated(calculatedResult);
      }
    } catch (error) {
      console.error('Error calculating grade:', error);
      setCalculatedGrade('Error');
      setGradeDescription('Unable to calculate grade');
    }
  };

  const getCompetencyDescription = (score: number): string => {
    if (score >= 80) return 'Exceeding Expectations - Outstanding performance';
    if (score >= 60) return 'Meeting Expectations - Satisfactory performance';
    if (score >= 40) return 'Approaching Expectations - Fair performance';
    return 'Below Expectations - Needs improvement';
  };

  const getLetterGradeDescription = (grade: string): string => {
    const descriptions: { [key: string]: string } = {
      'A': 'Excellent', 'A-': 'Very Good', 'B+': 'Good', 'B': 'Good', 'B-': 'Above Average',
      'C+': 'Above Average', 'C': 'Average', 'C-': 'Average', 'D+': 'Below Average',
      'D': 'Below Average', 'D-': 'Poor', 'E': 'Very Poor', 'F': 'Fail'
    };
    return descriptions[grade] || 'Unknown';
  };

  return (
    <Card title="Grade Calculator" className="w-full max-w-md">
      <div className="space-y-4">
        {!educationSystem && (
          <Select
            label="Education System"
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
          >
            <option value="KENYA_CBC_SECONDARY">Kenya CBC Secondary</option>
            <option value="KENYA_CBC_PRIMARY">Kenya CBC Primary</option>
            <option value="US_UNIVERSITY_SEMESTER">US University</option>
          </Select>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Marks Obtained"
            value={marks}
            onChange={(e) => setMarks(parseFloat(e.target.value) || 0)}
            min={0}
            max={totalMarks}
          />
          <Input
            type="number"
            label="Total Marks"
            value={totalMarks}
            onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 100)}
            min={1}
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Percentage</div>
          <div className="text-lg font-semibold">
            {totalMarks > 0 ? ((marks / totalMarks) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 mb-1">Grade</div>
          <div className="text-xl font-bold text-blue-800">{calculatedGrade}</div>
          <div className="text-sm text-blue-600 mt-1">{gradeDescription}</div>
        </div>

        <div className="text-xs text-gray-500">
          Using: {currentSystem.name} ({currentSystem.grading_system_type})
        </div>
      </div>
    </Card>
  );
};

export default GradeCalculatorWidget;

