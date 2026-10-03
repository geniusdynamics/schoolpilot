// ABOUTME: Student Masterlist Page - displays denormalized student masterlist
// ABOUTME: Replaces vw_adm_student_masterlist with full CRUD and filtering

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { useStudentMasterlist } from '../hooks/useStudentMasterlist';
import type { StudentMasterlistRow } from '../hooks/useStudentMasterlist';
import { UsersIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@/components/ui/icons';

const StudentMasterlistPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const { data, loading, error, refresh } = useStudentMasterlist();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [streamFilter, setStreamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  
  // Get unique values for filters
  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>();
    data.forEach(row => {
      if (row.className) classes.add(row.className);
    });
    return Array.from(classes).sort();
  }, [data]);
  
  const uniqueStreams = useMemo(() => {
    const streams = new Set<string>();
    data.forEach(row => {
      if (row.streamName) streams.add(row.streamName);
    });
    return Array.from(streams).sort();
  }, [data]);
  
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    data.forEach(row => {
      if (row.status) statuses.add(row.status);
    });
    return Array.from(statuses).sort();
  }, [data]);
  
  const uniqueGenders = useMemo(() => {
    const genders = new Set<string>();
    data.forEach(row => {
      if (row.gender) genders.add(row.gender);
    });
    return Array.from(genders).sort();
  }, [data]);
  
  // Filtered data
  const filteredData = useMemo(() => {
    let result = data;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => 
        (row.admissionNo?.toLowerCase() ?? '').includes(term) ||
        (row.studentName?.toLowerCase() ?? '').includes(term) ||
        (row.upiNo?.toLowerCase().includes(term) ?? false)
      );
    }
    
    if (classFilter !== 'all') {
      result = result.filter(row => row.className === classFilter);
    }
    
    if (streamFilter !== 'all') {
      result = result.filter(row => row.streamName === streamFilter);
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(row => row.status === statusFilter);
    }
    
    if (genderFilter !== 'all') {
      result = result.filter(row => row.gender === genderFilter);
    }
    
    return result;
  }, [data, searchTerm, classFilter, streamFilter, statusFilter, genderFilter]);
  
  // Export to CSV
  const handleExport = useCallback(() => {
    if (filteredData.length === 0) {
      showToast({
        variant: 'warning',
        title: t('export'),
        message: t('noDataToExport')
      });
      return;
    }
    
    const headers = [
      'Admission No',
      'UPI No',
      'Student Name',
      'Gender',
      'Status',
      'Class',
      'Stream',
      'Category',
      'Dormitory',
      'Guardian Name',
      'Guardian Phone'
    ];
    
    const rows = filteredData.map(row => [
      row.admissionNo,
      row.upiNo || '',
      row.studentName,
      row.gender,
      row.status || '',
      row.className || '',
      row.streamName || '',
      row.studentCategory || '',
      row.dormitoryName || '',
      row.primaryGuardianName || '',
      row.primaryGuardianPhone || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_masterlist_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast({
      variant: 'success',
      title: t('export'),
      message: t('exportSuccess')
    });
  }, [filteredData, showToast, t]);
  
  // Handle row click to edit student
  const handleRowClick = useCallback((row: StudentMasterlistRow) => {
    navigate(`/administration/students/${row.studentId}`);
  }, [navigate]);
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      showToast({
        variant: 'success',
        title: t('refresh'),
        message: t('refreshSuccess')
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: t('refresh'),
        message: t('refreshError')
      });
    }
  }, [refresh, showToast, t]);
  
  // Column definitions
  const columns: DataGridColumn<StudentMasterlistRow>[] = useMemo(() => [
    { key: 'admissionNo', header: t('admissionNo'), width: 120, sortable: true },
    { key: 'upiNo', header: t('upiNo'), width: 120, sortable: true },
    { key: 'studentName', header: t('name'), width: 180, sortable: true },
    { key: 'gender', header: t('gender'), width: 80, sortable: true },
    { 
      key: 'status', 
      header: t('status'), 
      width: 100, 
      sortable: true,
      render: (value, row) => {
        const statusColors: Record<string, string> = {
          'Active': 'bg-green-100 text-green-800',
          'Alumni': 'bg-primary-100 text-primary-800',
          'Suspended': 'bg-yellow-100 text-yellow-800',
          'Transferred': 'bg-surface-accent text-surface-foreground',
          'Expelled': 'bg-red-100 text-red-800'
        };
        const colorClass = statusColors[row.status] || 'bg-surface-accent text-surface-foreground';
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
            {row.status}
          </span>
        );
      }
    },
    { key: 'className', header: t('class'), width: 100, sortable: true },
    { key: 'streamName', header: t('stream'), width: 80, sortable: true },
    { key: 'studentCategory', header: t('category'), width: 120, sortable: true },
    { key: 'dormitoryName', header: t('dormitory'), width: 120, sortable: true },
    { key: 'primaryGuardianName', header: t('guardian'), width: 150, sortable: true },
    { key: 'primaryGuardianPhone', header: t('phone'), width: 120, sortable: true },
  ], [t]);
  
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600">{t('errorLoading')}: {error.message}</p>
            <Button onClick={handleRefresh} className="mt-4">
              {t('retry')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-4">
      <Card>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold text-surface-foreground flex items-center gap-2">
            <UsersIcon className="w-6 h-6" />
            {t('studentMasterlist')}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-muted-fg" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            
            <Select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-36"
            >
              <option value="all">{t('allClasses')}</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </Select>
            
            <Select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="w-36"
            >
              <option value="all">{t('allStreams')}</option>
              {uniqueStreams.map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </Select>
            
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            >
              <option value="all">{t('allStatuses')}</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
            
            <Select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">{t('allGenders')}</option>
              {uniqueGenders.map(gender => (
                <option key={gender} value={gender}>{gender}</option>
              ))}
            </Select>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              {t('refresh')}
            </Button>
            
            <Button
              variant="primary"
              onClick={handleExport}
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              {t('export')}
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : (
          <DataGrid
            data={filteredData}
            columns={columns}
            onRowClick={handleRowClick}
            sortable={true}
            filterable={true}
            emptyState={{
              icon: <UsersIcon className="w-12 h-12 text-surface-muted-fg" />,
              title: t('noStudentsFound'),
              description: t('noStudentsDescription')
            }}
          />
        )}
        
        <div className="mt-4 text-sm text-surface-muted-fg text-right">
          {t('showing')} {filteredData.length} {t('of')} {data.length} {t('studentsCountLabel')}
        </div>
      </Card>
    </div>
  );
};

export default StudentMasterlistPage;