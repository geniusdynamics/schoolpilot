import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Card from '@/components/ui/Card';

import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

import { useTranslation } from 'react-i18next';
import { PersonGender, StudentStatus } from '@/core/types';
import type { Student } from '@/core/types';

export const StudentMasterlistPageContent: React.FC = () => {
  const { students, classes, classStreams, loading } = useAppData();
  const { t } = useTranslation('reports');

  const [selectedClassId, setSelectedClassId] = useState<number | undefined>();
  const [selectedStreamId, setSelectedStreamId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus | ''>('');
  const [selectedGender, setSelectedGender] = useState<PersonGender | ''>('');
  
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableStreams = useMemo(() => {
    if (!selectedClassId) return (classStreams || []);
    return (classStreams || []).filter(cs => cs.class_id === selectedClassId);
  }, [selectedClassId, classStreams]);

  const handleGenerateReport = useCallback(() => {
    setIsGenerating(true);
    let tempStudents = [...(students || [])];

    if (selectedClassId) {
      const streamsInClass = (classStreams || []).filter(cs => cs.class_id === selectedClassId).map(cs => cs.id);
      if (selectedStreamId) {
        tempStudents = tempStudents.filter(s => s.current_class_stream_id === selectedStreamId);
      } else {
        tempStudents = tempStudents.filter(s => s.current_class_stream_id && (streamsInClass || []).includes(s.current_class_stream_id));
      }
    } else if (selectedStreamId) { 
        tempStudents = tempStudents.filter(s => s.current_class_stream_id === selectedStreamId);
    }

    if (selectedStatus) {
      tempStudents = tempStudents.filter(s => s.status === selectedStatus);
    }
    if (selectedGender) {
      tempStudents = tempStudents.filter(s => s.gender === selectedGender);
    }
    setFilteredStudents(tempStudents);
    setIsGenerating(false);
  }, [students, selectedClassId, selectedStreamId, selectedStatus, selectedGender, classStreams]);
  
  // Generate report on initial mount
  useEffect(() => {
    handleGenerateReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps 

  const columns = [
    { header: 'Adm No', key: 'admission_no' as keyof Student },
    { header: 'Student Name', key: 'student_name', render: (_v: any, item: Student) => `${item.first_name} ${item.last_name}` },
    { header: 'Gender', key: 'gender' as keyof Student },
    { header: 'Status', key: 'status' as keyof Student },
    { header: 'Class', key: 'current_class_name' as keyof Student },
    { header: 'Stream', key: 'current_class_stream_name' as keyof Student },
    { header: 'Category', key: 'student_category_name' as keyof Student },
    { header: 'Dormitory', key: 'dormitory_name' as keyof Student },
    { header: 'Guardian Name', key: 'guardian_name', render: (_v: any, item: Student) => item.primary_guardian?.name || '-' },
    { header: 'Guardian Phone', key: 'guardian_phone', render: (_v: any, item: Student) => item.primary_guardian?.phone || '-' },
  ];

  const isLoadingPage = loading.students || loading.classes || loading.classStreams;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = columns.map(col => col.header).join(',');
    const rows = (filteredStudents || []).map(student => {
      return columns.map(col => {
        let value;
        if (col.render) {
          value = col.render(student[col.key as keyof Student], student);
        } else {
          value = student[col.key as keyof Student] as string | number | undefined;
        }
        // Handle potential commas in values by double-quoting
        const stringValue = String(value !== undefined && value !== null ? value : '-');
        return `"${stringValue.replace(/"/g, '""')}"`; // Escape double quotes
      }).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `student_masterlist_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <Card title={t('studentMasterlistPage.title')}>
        <div className="p-4 border-b mb-4 bg-gray-50 rounded-md filter-section">
          <p className="text-sm text-gray-600 mb-4">
            {t('studentMasterlistPage.filterDescription')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <Select label={t('studentMasterlistPage.filterByClass')} value={selectedClassId || ''} onChange={e => {setSelectedClassId(Number(e.target.value) || undefined); setSelectedStreamId(undefined);}}>
                <option value="">{t('studentMasterlistPage.allClasses')}</option>
                {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label={t('studentMasterlistPage.filterByStream')} value={selectedStreamId || ''} onChange={e => setSelectedStreamId(Number(e.target.value) || undefined)} disabled={!selectedClassId && availableStreams.length === (classStreams || []).length}>
                <option value="">{t('studentMasterlistPage.allStreams')}</option>
                {(availableStreams || []).map(cs => <option key={cs.id} value={cs.id}>{cs.name}</option>)}
            </Select>
            <Select label={t('studentMasterlistPage.filterByStatus')} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value as StudentStatus | '')}>
                <option value="">{t('studentMasterlistPage.allStatuses')}</option>
                {Object.values(StudentStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label={t('studentMasterlistPage.filterByGender')} value={selectedGender} onChange={e => setSelectedGender(e.target.value as PersonGender | '')}>
                <option value="">{t('studentMasterlistPage.allGenders')}</option>
                {Object.values(PersonGender).map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Button onClick={handleGenerateReport} disabled={isGenerating || isLoadingPage} className="h-10">
              {isGenerating ? <Spinner size="sm" /> : t('studentMasterlistPage.generateReport')}
            </Button>
          </div>
        </div>

        {isLoadingPage && !isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">{t('studentMasterlistPage.loadingInitialData')}</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">{t('studentMasterlistPage.generatingReport')}</span></div>
        ) : (
          <>
            <div className="flex justify-end space-x-2 mb-4 print-hide">
                <Button variant="secondary" size="sm" onClick={handlePrint}>{t('studentMasterlistPage.print')}</Button>
                <Button variant="secondary" size="sm" onClick={handleExportCSV}>{t('studentMasterlistPage.exportCSV')}</Button>
            </div>
            <DataGrid columns={columns} data={(filteredStudents || [])} loading={isGenerating} emptyState={t('studentMasterlistPage.noStudentsFound')}/>
          </>
        )}
      </Card>
    </div>
  );
};
const StudentMasterlistPage: React.FC = () => (
  <div className="space-y-6">
    <StudentMasterlistPageContent />
  </div>
);

export default StudentMasterlistPage;
