import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Card from '@/components/ui/Card';

import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

import { useTranslation } from 'react-i18next';
import type { TeacherSubjectAssignment } from '@/core/types';

export const TeacherAssignmentsPageContent: React.FC = () => {
  const { staff, academicYears, teacherSubjectAssignments, loading } = useAppData();
  const { t } = useTranslation('reports');

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | undefined>((academicYears || [])[0]?.id);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>();
  
  const [reportData, setReportData] = useState<TeacherSubjectAssignment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const teachers = useMemo(() => (staff || []).filter(s => s.is_active && (s.designation_title?.includes('Teacher') || s.designation_title?.includes('Principal') || s.department_name === 'Academics')), [staff]);

  const handleGenerateReport = useCallback(() => {
    setIsGenerating(true);
    let filteredAssignments = [...(teacherSubjectAssignments || [])];

    if (selectedAcademicYearId) {
      // This relies on teacherSubjectAssignments already having academic_year_name denormalized,
      // or academic_year_id if we had it on TeacherSubjectAssignment type directly or via allocation.
      // For now, we assume academic_year_name is present.
      const ayName = (academicYears || []).find(ay => ay.id === selectedAcademicYearId)?.name;
      if (ayName) {
        filteredAssignments = filteredAssignments.filter(a => a.academic_year_name === ayName);
      }
    }
    if (selectedTeacherId) {
      filteredAssignments = filteredAssignments.filter(a => a.teacher_id === selectedTeacherId);
    }
    setReportData(filteredAssignments);
    setIsGenerating(false);
  }, [teacherSubjectAssignments, selectedAcademicYearId, selectedTeacherId, academicYears]);

  // Generate report on initial mount
  useEffect(() => {
    handleGenerateReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { header: 'Academic Year', key: 'academic_year_name' as keyof TeacherSubjectAssignment },
    { header: 'Teacher', key: 'teacher_name' as keyof TeacherSubjectAssignment },
    { header: 'Class Stream', key: 'class_stream_name' as keyof TeacherSubjectAssignment },
    { header: 'Subject', key: 'subject_name' as keyof TeacherSubjectAssignment },
  ];

  const isLoadingPage = loading.staff || loading.academicYears || loading.teacherSubjectAssignments;

  return (
    <div className="space-y-6">
      <Card title={t('teacherAssignmentsPage.title')}>
         <div className="p-4 border-b mb-4 bg-surface-muted rounded-md">
            <p className="text-sm text-surface-muted-fg mb-4">
                {t('teacherAssignmentsPage.description')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Select label={t('teacherAssignmentsPage.selectAcademicYear')} value={selectedAcademicYearId || ''} onChange={e => setSelectedAcademicYearId(Number(e.target.value) || undefined)}>
                    <option value="">{t('teacherAssignmentsPage.allYears')}</option>
                    {(academicYears || []).map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                </Select>
                <Select label={t('teacherAssignmentsPage.selectTeacher')} value={selectedTeacherId || ''} onChange={e => setSelectedTeacherId(e.target.value || undefined)}>
                    <option value="">{t('teacherAssignmentsPage.allTeachers')}</option>
                    {(teachers || []).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </Select>
                <Button onClick={handleGenerateReport} disabled={isGenerating || isLoadingPage} className="h-10">
                    {isGenerating ? <Spinner size="sm" /> : t('teacherAssignmentsPage.generateReport')}
                </Button>
            </div>
        </div>
        
        {isLoadingPage && !isGenerating ? (
             <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">{t('teacherAssignmentsPage.loadingData')}</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">{t('teacherAssignmentsPage.generatingReport')}</span></div>
        ) : (
            <>
                <div className="flex justify-end space-x-2 mb-4">
                    <Button variant="secondary" size="sm" onClick={() => alert(t('messages.printToBeDeveloped'))}>{t('teacherAssignmentsPage.print')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => alert(t('messages.exportToBeDeveloped'))}>{t('teacherAssignmentsPage.exportCSV')}</Button>
                </div>
                <DataGrid columns={columns} data={(reportData || [])} loading={isGenerating} emptyState={t('teacherAssignmentsPage.noAssignmentsFound')}/>
            </>
        )}
      </Card>
    </div>
  );
};
const TeacherAssignmentsPage: React.FC = () => (
  <div className="space-y-6">
    <TeacherAssignmentsPageContent />
  </div>
);

export default TeacherAssignmentsPage;
