// src/modules/academics/services/marksService.ts

import { StudentPaperMark } from '@/modules/academics/data/types';

export interface MarksBulkImportData {
  examSessionId: string;
  classStreamId: number;
  marks: {
    studentId: string;
    paperSettingId: string;
    score: number;
  }[];
}

export const uploadMarks = async (file?: File): Promise<void> => {
  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (file) {
    // Parse CSV/Excel file and validate marks data
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Parse CSV content
      const lines = text.split('\n');
      const marks = lines.slice(1).map(line => {
        const [studentId, paperSettingId, score] = line.split(',');
        return { studentId, paperSettingId, score: parseFloat(score) };
      });
      
      // Validate and save marks
      console.log('Parsed marks:', marks);
    };
    reader.readAsText(file);
  } else {
    // Trigger file input for user to select file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadMarks(file);
      }
    };
    input.click();
  }
};

export const downloadMarksTemplate = async (): Promise<void> => {
  // Simulate download delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const csvContent = `Student ID,Paper Setting ID,Score\nstudent_1,paper_1,85\nstudent_2,paper_1,92\nstudent_3,paper_1,78`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'marks_template.csv';
  link.click();
  window.URL.revokeObjectURL(url);
};

export const exportMarks = async (examSessionId: string, classStreamId: number): Promise<void> => {
  // Simulate API call to fetch marks data
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock data - in real implementation, fetch from database
  const marksData = [
    { studentName: 'John Doe', admissionNo: 'ADM001', mathematics: 85, english: 90, science: 88 },
    { studentName: 'Jane Smith', admissionNo: 'ADM002', mathematics: 92, english: 87, science: 94 },
    { studentName: 'Bob Johnson', admissionNo: 'ADM003', mathematics: 78, english: 82, science: 75 }
  ];
  
  // Convert to CSV
  const headers = Object.keys(marksData[0]).join(',');
  const rows = marksData.map(row => Object.values(row).join(','));
  const csvContent = [headers, ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `marks_export_${examSessionId}_${classStreamId}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};
