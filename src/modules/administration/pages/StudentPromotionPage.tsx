import { logger } from '@/utils/logging';

// ABOUTME: Student Promotion Page - UI for promoting students to new classes
// ABOUTME: Supports both single student and bulk promotion modes

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import DialogForm from '@/components/ui/forms/DialogForm';
import { useToast } from '@/hooks/useToast';
import { useAppData } from '@/hooks/useAppData';
import { useStudentPromotion } from '../hooks/useStudentPromotion';
import type { StudentClassHistoryEntry } from '../data/types';
import { AcademicCapIcon, UserGroupIcon, ArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentTextIcon } from '@/components/ui/icons';

type PromotionMode = 'single' | 'bulk';

const StudentPromotionPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { showToast } = useToast();
  
  const { students, classStreams, academicYears, loading: appLoading } = useAppData();
  const { 
    promoteStudent, 
    promoteStudents, 
    getStudentClassHistory,
    service 
  } = useStudentPromotion();
  
  // Current academic year (default to most recent)
  const currentAcademicYearId = useMemo(() => {
    if (academicYears && academicYears.length > 0) {
      return String(academicYears[0].id);
    }
    return '';
  }, [academicYears]);
  
  // Mode state
  const [mode, setMode] = useState<PromotionMode>('single');
  
  // Single promotion state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [targetClassStreamId, setTargetClassStreamId] = useState<string>('');
  const [promotionDate, setPromotionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [promotionNotes, setPromotionNotes] = useState<string>('');
  
  // Bulk promotion state
  const [sourceClassStreamId, setSourceClassStreamId] = useState<string>('');
  const [targetClassStreamIdBulk, setTargetClassStreamIdBulk] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // History state
  const [studentHistory, setStudentHistory] = useState<StudentClassHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  
  // Load student history when a student is selected
  useEffect(() => {
    if (selectedStudentId) {
      setHistoryLoading(true);
      getStudentClassHistory(selectedStudentId)
        .then(history => {
          setStudentHistory(history);
        })
        .catch(err => {
          logger.error('Error loading student history:', err);
          setStudentHistory([]);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    } else {
      setStudentHistory([]);
    }
  }, [selectedStudentId, getStudentClassHistory]);
  
  // Get students in source class for bulk mode
  const studentsInSourceClass = useMemo(() => {
    if (!sourceClassStreamId || !students) return [];
    return students.filter(s => 
      s.current_class_stream_id === parseInt(sourceClassStreamId)
    );
  }, [sourceClassStreamId, students]);
  
  // Handle single student promotion
  const handleSinglePromotion = useCallback(async () => {
    if (!selectedStudentId || !targetClassStreamId || !promotionDate) {
      showToast({
        variant: 'warning',
        title: t('validationTitle'),
        message: t('fillAllRequiredFields')
      });
      return;
    }
    
    setShowConfirmDialog(true);
  }, [selectedStudentId, targetClassStreamId, promotionDate, showToast, t]);
  
  // Execute single promotion
  const executeSinglePromotion = useCallback(async () => {
    if (!selectedStudentId || !targetClassStreamId) return;
    
    setIsPromoting(true);
    try {
      // Find student for identifying data
      const student = students?.find(s => s.id === selectedStudentId);
      const identifyingData = student 
        ? { admission_no: student.admission_no, first_name: student.first_name, last_name: student.last_name }
        : { id: selectedStudentId };
      
      const result = await promoteStudent({
        studentId: selectedStudentId,
        newClassStreamId: targetClassStreamId,
        academicYearId: currentAcademicYearId,
        promotionDate,
        notes: promotionNotes || undefined
      });
      
      if (result.success) {
        showToast({
          variant: 'success',
          title: t('promotionSuccess'),
          message: t('studentPromotedSuccessfully')
        });
        // Reset form
        setSelectedStudentId('');
        setTargetClassStreamId('');
        setPromotionDate(new Date().toISOString().split('T')[0]);
        setPromotionNotes('');
        setStudentHistory([]);
      } else {
        showToast({
          variant: 'error',
          title: t('promotionFailed'),
          message: result.error || t('promotionError')
        });
      }
    } catch (err) {
      showToast({
        variant: 'error',
        title: t('promotionFailed'),
        message: t('promotionError')
      });
    } finally {
      setIsPromoting(false);
      setShowConfirmDialog(false);
    }
  }, [selectedStudentId, targetClassStreamId, promotionDate, promotionNotes, promoteStudent, currentAcademicYearId, students, showToast, t]);
  
  // Handle bulk promotion
  const handleBulkPromotion = useCallback(async () => {
    if (!selectedStudentIds.length || !targetClassStreamIdBulk) {
      showToast({
        variant: 'warning',
        title: t('validationTitle'),
        message: t('selectStudentsToPromote')
      });
      return;
    }
    
    setShowConfirmDialog(true);
  }, [selectedStudentIds, targetClassStreamIdBulk, showToast, t]);
  
  // Execute bulk promotion
  const executeBulkPromotion = useCallback(async () => {
    if (!selectedStudentIds.length || !targetClassStreamIdBulk) return;
    
    setIsPromoting(true);
    try {
      const paramsList = selectedStudentIds.map(studentId => ({
        studentId,
        newClassStreamId: targetClassStreamIdBulk,
        academicYearId: currentAcademicYearId,
        promotionDate,
        notes: promotionNotes || undefined
      }));
      
      const results = await promoteStudents(paramsList);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        showToast({
          variant: failCount > 0 ? 'warning' : 'success',
          title: t('bulkPromotionComplete'),
          message: `${successCount} ${t('studentsPromoted')}${failCount > 0 ? `, ${failCount} ${t('failed')}` : ''}`
        });
      } else {
        showToast({
          variant: 'error',
          title: t('bulkPromotionFailed'),
          message: t('noStudentsPromoted')
        });
      }
      
      // Reset form
      setSourceClassStreamId('');
      setTargetClassStreamIdBulk('');
      setSelectedStudentIds([]);
      setPromotionNotes('');
    } catch (err) {
      showToast({
        variant: 'error',
        title: t('bulkPromotionFailed'),
        message: t('promotionError')
      });
    } finally {
      setIsPromoting(false);
      setShowConfirmDialog(false);
    }
  }, [selectedStudentIds, targetClassStreamIdBulk, promotionDate, promotionNotes, promoteStudents, currentAcademicYearId, showToast, t]);
  
  // Toggle student selection in bulk mode
  const toggleStudentSelection = useCallback((studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  }, []);
  
  // Select all students in bulk mode
  const selectAllStudents = useCallback(() => {
    if (studentsInSourceClass) {
      setSelectedStudentIds(studentsInSourceClass.map(s => s.id));
    }
  }, [studentsInSourceClass]);
  
  // Deselect all students
  const deselectAllStudents = useCallback(() => {
    setSelectedStudentIds([]);
  }, []);
  
  // Get current class for selected student
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId || !students) return null;
    return students.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, students]);
  
  // Prepare confirmation message
  const confirmMessage = useMemo(() => {
    if (mode === 'single') {
      const student = students?.find(s => s.id === selectedStudentId);
      const targetStream = classStreams?.find(cs => cs.id === parseInt(targetClassStreamId));
      return `${t('confirmPromote')} ${student?.first_name} ${student?.last_name} ${t('toClass')} ${targetStream?.class_name || ''} - ${targetStream?.name || ''}?`;
    } else {
      return `${t('confirmBulkPromote')} ${selectedStudentIds.length} ${t('studentsToNewClass')}?`;
    }
  }, [mode, selectedStudentId, targetClassStreamId, selectedStudentIds, students, classStreams, t]);
  
  if (appLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-surface-foreground flex items-center gap-2">
            <AcademicCapIcon className="w-6 h-6" />
            {t('studentPromotion')}
          </h1>
          
          {/* Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-surface-border">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-card text-surface-foreground hover:bg-surface-muted'
              }`}
            >
              {t('singleStudent')}
            </button>
            <button
              onClick={() => setMode('bulk')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'bulk'
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-card text-surface-foreground hover:bg-surface-muted'
              }`}
            >
              {t('bulkPromotion')}
            </button>
          </div>
        </div>
        
        {/* Single Student Mode */}
        {mode === 'single' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">
                  {t('selectStudent')} <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full"
                >
                  <option value="">{t('selectStudent')}</option>
                  {(students || []).map(student => (
                    <option key={student.id} value={student.id}>
                      {student.admission_no} - {student.first_name} {student.last_name}
                      {student.current_class_stream_name ? ` (${student.current_class_stream_name})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">
                  {t('currentClass')}
                </label>
                <Input
                  value={selectedStudent?.current_class_stream_name || t('notAssigned')}
                  disabled
                  className="bg-surface-muted"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">
                  {t('targetClass')} <span className="text-red-500">*</span>
                </label>
                <Select
                  value={targetClassStreamId}
                  onChange={(e) => setTargetClassStreamId(e.target.value)}
                  className="w-full"
                >
                  <option value="">{t('selectTargetClass')}</option>
                  {(classStreams || []).map(cs => (
                    <option key={cs.id} value={cs.id}>
                      {cs.class_name} - {cs.name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">
                  {t('promotionDate')} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={promotionDate}
                  onChange={(e) => setPromotionDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-surface-foreground mb-2">
                {t('notes')}
              </label>
              <Input
                value={promotionNotes}
                onChange={(e) => setPromotionNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="w-full"
              />
            </div>
            
            {/* Student Class History */}
            {selectedStudentId && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-surface-foreground mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  {t('classHistory')}
                </h3>
                
                {historyLoading ? (
                  <Spinner />
                ) : studentHistory.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-surface-border">
                      <thead className="bg-surface-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                            {t('date')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                            {t('class')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                            {t('stream')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                            {t('academicYear')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface-card divide-y divide-surface-border">
                        {studentHistory.map((entry, index) => (
                          <tr key={index} className={index === 0 ? 'bg-primary-50' : ''}>
                            <td className="px-4 py-2 text-sm text-surface-foreground">
                              {entry.promotionDate}
                            </td>
                            <td className="px-4 py-2 text-sm text-surface-foreground">
                              {entry.className || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-surface-foreground">
                              {entry.streamName || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-surface-foreground">
                              {entry.academicYearName || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-surface-muted-fg italic">{t('noHistory')}</p>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSinglePromotion}
                disabled={!selectedStudentId || !targetClassStreamId}
                leftIcon={<ArrowUpIcon className="w-4 h-4" />}
              >
                {t('promoteStudent')}
              </Button>
            </div>
          </div>
        )}
        
        {/* Bulk Promotion Mode */}
        {mode === 'bulk' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">
                  {t('sourceClass')} <span className="text-red-500">*</span>
                </label>
                <Select
                  value={sourceClassStreamId}
                  onChange={(e) => {
                    setSourceClassStreamId(e.target.value);
                    setSelectedStudentIds([]);
                  }}
                  className="w-full"
                >
                  <option value="">{t('selectSourceClass')}</option>
                  {(classStreams || []).map(cs => (
                    <option key={cs.id} value={cs.id}>
                      {cs.class_name} - {cs.name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">
                  {t('targetClass')} <span className="text-red-500">*</span>
                </label>
                <Select
                  value={targetClassStreamIdBulk}
                  onChange={(e) => setTargetClassStreamIdBulk(e.target.value)}
                  className="w-full"
                >
                  <option value="">{t('selectTargetClass')}</option>
                  {(classStreams || []).filter(cs => cs.id !== parseInt(sourceClassStreamId)).map(cs => (
                    <option key={cs.id} value={cs.id}>
                      {cs.class_name} - {cs.name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-foreground mb-2">
                  {t('promotionDate')} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={promotionDate}
                  onChange={(e) => setPromotionDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-surface-foreground mb-2">
                {t('notes')}
              </label>
              <Input
                value={promotionNotes}
                onChange={(e) => setPromotionNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                className="w-full"
              />
            </div>
            
            {/* Student List */}
            {sourceClassStreamId && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-surface-foreground flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5" />
                    {t('studentsInClass')} ({studentsInSourceClass.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllStudents}>
                      {t('selectAll')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllStudents}>
                      {t('deselectAll')}
                    </Button>
                  </div>
                </div>
                
                {studentsInSourceClass.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-surface-border">
                      <thead className="bg-surface-muted sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.length === studentsInSourceClass.length && studentsInSourceClass.length > 0}
                              onChange={(e) => e.target.checked ? selectAllStudents() : deselectAllStudents()}
                              className="rounded border-surface-border"
                            />
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                            {t('admissionNo')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                            {t('name')}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-surface-muted-fg uppercase">
                            {t('status')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface-card divide-y divide-surface-border">
                        {studentsInSourceClass.map(student => (
                          <tr 
                            key={student.id} 
                            className={selectedStudentIds.includes(student.id) ? 'bg-primary-50' : ''}
                          >
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(student.id)}
                                onChange={() => toggleStudentSelection(student.id)}
                                className="rounded border-surface-border"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-surface-foreground">
                              {student.admission_no}
                            </td>
                            <td className="px-4 py-2 text-sm text-surface-foreground">
                              {student.first_name} {student.last_name}
                            </td>
                            <td className="px-4 py-2 text-sm text-surface-foreground">
                              {student.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-surface-muted-fg italic">{t('noStudentsInClass')}</p>
                )}
                
                <div className="mt-2 text-sm text-surface-muted-fg">
                  {t('selected')}: {selectedStudentIds.length} {t('studentsCountLabel')}
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleBulkPromotion}
                disabled={selectedStudentIds.length === 0 || !targetClassStreamIdBulk}
                leftIcon={<ArrowUpIcon className="w-4 h-4" />}
              >
                {t('promoteSelected')} ({selectedStudentIds.length})
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Confirmation Dialog */}
      <DialogForm
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title={t('confirmPromotion')}
        size="md"
        content={
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{confirmMessage}</p>
            </div>
            <p className="text-sm text-surface-muted-fg">
              {t('promotionWarning')}
            </p>
          </div>
        }
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isPromoting}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={mode === 'single' ? executeSinglePromotion : executeBulkPromotion}
              isLoading={isPromoting}
              leftIcon={<CheckCircleIcon className="w-4 h-4" />}
            >
              {t('confirm')}
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default StudentPromotionPage;