import React, { useState, useCallback, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Badge from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import {
  UploadIcon,
  DownloadIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  TrashIcon,
  ArrowRightIcon
} from '@/components/ui/icons';
import { useStudentImportData } from '../data/useStudentImportData';
import { useTranslation } from 'react-i18next';
import type { StudentImportSession, StudentImportRecord, ImportValidationStatus, ImportStatus } from '../data/types';

type ImportStep = 'upload' | 'preview' | 'importing' | 'results';

interface ParsedStudentRow {
  row_number: number;
  admission_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  grade_level: string;
  class_name: string;
  stream_name: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
}

const StudentDataImportPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const {
    activeSession,
    setActiveSession,
    createImportSession,
    updateSessionStatus,
    addImportRecord,
    updateImportRecord,
    deleteImportSession,
    getRecordsBySession,
    addStudentFromImport
  } = useStudentImportData();

  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [validationResults, setValidationResults] = useState<StudentImportRecord[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse CSV file
  const parseCSV = useCallback((text: string): ParsedStudentRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File must contain header row and at least one data row');
    }

    // Skip header row
    const dataLines = lines.slice(1);
    
    return dataLines.map((line, index) => {
      const columns = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
      
      return {
        row_number: index + 2, // 1-based, skip header
        admission_number: columns[0] || '',
        first_name: columns[1] || '',
        middle_name: columns[2] || '',
        last_name: columns[3] || '',
        date_of_birth: columns[4] || '',
        gender: (columns[5] as 'Male' | 'Female' | 'Other') || 'Other',
        grade_level: columns[6] || '',
        class_name: columns[7] || '',
        stream_name: columns[8] || '',
        guardian_name: columns[9] || '',
        guardian_phone: columns[10] || '',
        guardian_email: columns[11] || ''
      };
    });
  }, []);

  // Validate a single row
  const validateRow = useCallback((row: ParsedStudentRow, rowIndex: number): Partial<StudentImportRecord> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!row.admission_number) errors.push('Admission number is required');
    if (!row.first_name) errors.push('First name is required');
    if (!row.last_name) errors.push('Last name is required');
    if (!row.date_of_birth) errors.push('Date of birth is required');
    if (!row.gender || !['Male', 'Female', 'Other'].includes(row.gender)) errors.push('Valid gender is required');
    if (!row.grade_level) errors.push('Grade level is required');
    if (!row.guardian_name) errors.push('Guardian name is required');
    if (!row.guardian_phone) errors.push('Guardian phone is required');

    // Format validation
    if (row.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)) {
      errors.push('Date of birth must be in YYYY-MM-DD format');
    }
    if (row.guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.guardian_email)) {
      warnings.push('Invalid email format');
    }
    if (row.guardian_phone && !/^[\d\s\-\+\(\)]+$/.test(row.guardian_phone)) {
      warnings.push('Phone number contains invalid characters');
    }

    // Date validation
    if (row.date_of_birth) {
      const dob = new Date(row.date_of_birth);
      const now = new Date();
      if (dob > now) {
        errors.push('Date of birth cannot be in the future');
      } else {
        const age = now.getFullYear() - dob.getFullYear();
        if (age < 3 || age > 25) {
          warnings.push(`Unusual age detected: approximately ${age} years old`);
        }
      }
    }

    let validationStatus: ImportValidationStatus = 'Valid';
    if (errors.length > 0) validationStatus = 'Invalid';
    else if (warnings.length > 0) validationStatus = 'Warning';

    return {
      id: `temp-${rowIndex}`,
      import_id: '',
      row_number: row.row_number,
      admission_number: row.admission_number,
      first_name: row.first_name,
      middle_name: row.middle_name || undefined,
      last_name: row.last_name,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      grade_level: row.grade_level,
      class_name: row.class_name || undefined,
      stream_name: row.stream_name || undefined,
      guardian_name: row.guardian_name,
      guardian_phone: row.guardian_phone,
      guardian_email: row.guardian_email || undefined,
      validation_status: validationStatus,
      validation_errors: errors.length > 0 ? errors : undefined,
      validation_warnings: warnings.length > 0 ? warnings : undefined,
      import_status: 'Pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setUploadedFile(file);

    try {
      const text = await file.text();
      let rows: ParsedStudentRow[];

      if (file.name.endsWith('.csv')) {
        rows = parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For now, show error - Excel parsing would need a library like xlsx
        setError('Excel files (.xlsx, .xls) are not yet supported. Please convert to CSV format.');
        return;
      } else {
        setError('Unsupported file format. Please use CSV files.');
        return;
      }

      setParsedRows(rows);

      // Validate all rows
      const validatedRows = rows.map((row, index) => validateRow(row, index));
      setValidationResults(validatedRows as StudentImportRecord[]);

      setCurrentStep('preview');
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message}`);
      setUploadedFile(null);
    }
  }, [parseCSV, validateRow]);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Start import process
  const handleStartImport = useCallback(async () => {
    if (!uploadedFile || validationResults.length === 0) return;

    setCurrentStep('importing');

    try {
      // Create import session
      const validCount = validationResults.filter(r => r.validation_status !== 'Invalid').length;
      const invalidCount = validationResults.filter(r => r.validation_status === 'Invalid').length;

      const session = await createImportSession(uploadedFile.name, validationResults.length);

      // Add all records
      for (const record of validationResults) {
        await addImportRecord({
          ...record,
          import_id: session.id
        });
      }

      // Start importing valid records
      await updateSessionStatus(session.id, {
        status: 'Importing',
        valid_records: validCount,
        invalid_records: invalidCount
      });

      let successCount = 0;
      let failedCount = 0;
      const totalValid = validationResults.filter(r => r.validation_status !== 'Invalid').length;

      // Import valid records
      for (let i = 0; i < validationResults.length; i++) {
        const record = validationResults[i];
        
        // Skip invalid records
        if (record.validation_status === 'Invalid') {
          await updateImportRecord({
            ...record,
            import_id: session.id,
            import_status: 'Skipped'
          });
          continue;
        }

        setImportProgress({
          current: i + 1,
          total: validationResults.length,
          success: successCount,
          failed: failedCount
        });

        try {
          // Create student in database
          const studentData = {
            admission_number: record.admission_number,
            first_name: record.first_name,
            middle_name: record.middle_name,
            last_name: record.last_name,
            date_of_birth: record.date_of_birth,
            gender: record.gender,
            grade_level: record.grade_level,
            class_name: record.class_name,
            stream_name: record.stream_name,
            guardian_name: record.guardian_name,
            guardian_phone: record.guardian_phone,
            guardian_email: record.guardian_email,
            status: 'Active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const createdStudent = await addStudentFromImport(studentData);

          // Update record as imported
          await updateImportRecord({
            ...record,
            import_id: session.id,
            import_status: 'Imported',
            student_id: createdStudent?.id
          });

          successCount++;
        } catch (err: any) {
          console.error(`Failed to import row ${record.row_number}:`, err);
          
          // Update record as failed
          await updateImportRecord({
            ...record,
            import_id: session.id,
            import_status: 'Failed',
            error_message: err.message || 'Unknown error'
          });

          failedCount++;
        }
      }

      // Update session status
      await updateSessionStatus(session.id, {
        status: failedCount === 0 ? 'Completed' : 'Partial',
        imported_records: successCount,
        failed_records: failedCount,
        completed_at: new Date().toISOString()
      });

      setImportProgress({
        current: validationResults.length,
        total: validationResults.length,
        success: successCount,
        failed: failedCount
      });

      setCurrentStep('results');
    } catch (err: any) {
      setError(`Import failed: ${err.message}`);
      setCurrentStep('preview');
    }
  }, [uploadedFile, validationResults, createImportSession, addImportRecord, updateSessionStatus, updateImportRecord, addStudentFromImport]);

  // Reset to upload step
  const handleReset = useCallback(() => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setParsedRows([]);
    setValidationResults([]);
    setImportProgress({ current: 0, total: 0, success: 0, failed: 0 });
    setError(null);
  }, []);

  // Delete old session
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this import session and all its records?')) {
      await deleteImportSession(sessionId);
    }
  }, [deleteImportSession]);

  // Download template CSV
  const handleDownloadTemplate = useCallback(() => {
    const headers = [
      'admission_number',
      'first_name',
      'middle_name',
      'last_name',
      'date_of_birth',
      'gender',
      'grade_level',
      'class_name',
      'stream_name',
      'guardian_name',
      'guardian_phone',
      'guardian_email'
    ];

    const exampleRow = [
      'ADM2024001',
      'John',
      'Michael',
      'Doe',
      '2010-05-15',
      'Male',
      'Grade 8',
      'Class 8A',
      'Stream A',
      'Jane Doe',
      '+250788123456',
      'jane.doe@example.com'
    ];

    const csv = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Get validation stats
  const validationStats = useMemo(() => {
    const valid = validationResults.filter(r => r.validation_status === 'Valid').length;
    const warnings = validationResults.filter(r => r.validation_status === 'Warning').length;
    const invalid = validationResults.filter(r => r.validation_status === 'Invalid').length;
    return { valid, warnings, invalid, total: validationResults.length };
  }, [validationResults]);

  // Render validation badge
  const renderValidationBadge = (status: ImportValidationStatus) => {
    switch (status) {
      case 'Valid':
        return <Badge variant="success">Valid</Badge>;
      case 'Warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'Invalid':
        return <Badge variant="danger">Invalid</Badge>;
    }
  };

  // Render import status badge
  const renderImportStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="info">Pending</Badge>;
      case 'Imported':
        return <Badge variant="success">Imported</Badge>;
      case 'Skipped':
        return <Badge variant="neutral">Skipped</Badge>;
      case 'Failed':
        return <Badge variant="danger">Failed</Badge>;
    }
  };

  // Preview columns
  const previewColumns: DataGridColumn<StudentImportRecord>[] = [
    { key: 'row_number', header: 'Row', width: 60, sortable: true },
    { key: 'admission_number', header: 'Admission No', width: 120, sortable: true, filterable: true },
    { key: 'first_name', header: 'First Name', width: 120, sortable: true, filterable: true },
    { key: 'last_name', header: 'Last Name', width: 120, sortable: true, filterable: true },
    { key: 'date_of_birth', header: 'Date of Birth', width: 110, sortable: true },
    { key: 'gender', header: 'Gender', width: 80, sortable: true, filterable: true },
    { key: 'grade_level', header: 'Grade', width: 80, sortable: true },
    { key: 'guardian_name', header: 'Guardian', width: 150, sortable: true, filterable: true },
    { key: 'guardian_phone', header: 'Guardian Phone', width: 140, sortable: false },
    {
      key: 'validation_status',
      header: 'Status',
      width: 100,
      sortable: true,
      filterable: true,
      render: (value, item) => renderValidationBadge(item.validation_status)
    },
    {
      key: 'validation_errors',
      header: 'Errors',
      width: 250,
      render: (value, item) => (
        item.validation_errors && item.validation_errors.length > 0 ? (
          <div className="text-xs text-red-600">
            {item.validation_errors.slice(0, 2).join(', ')}
            {item.validation_errors.length > 2 && '...'}
          </div>
        ) : null
      )
    }
  ];

  // Results columns
  const resultsColumns: DataGridColumn<StudentImportRecord>[] = [
    ...previewColumns,
    {
      key: 'import_status',
      header: 'Import Status',
      width: 110,
      sortable: true,
      filterable: true,
      render: (value, item) => renderImportStatusBadge(item.import_status)
    },
    {
      key: 'error_message',
      header: 'Error',
      width: 200,
      render: (value, item) => (
        item.error_message ? (
          <div className="text-xs text-red-600">{item.error_message}</div>
        ) : null
      )
    }
  ];

  // Session history columns
  const sessionColumns: DataGridColumn<StudentImportSession>[] = [
    { key: 'filename', header: 'File', width: 200, sortable: true, filterable: true },
    { key: 'total_records', header: 'Total', width: 80, sortable: true },
    { key: 'imported_records', header: 'Imported', width: 100, sortable: true },
    { key: 'failed_records', header: 'Failed', width: 90, sortable: true },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      sortable: true,
      filterable: true,
      render: (value, item) => {
        const statusColors: Record<string, string> = {
          Pending: 'bg-gray-100 text-gray-800',
          Validating: 'bg-yellow-100 text-yellow-800',
          Importing: 'bg-blue-100 text-blue-800',
          Completed: 'bg-green-100 text-green-800',
          Failed: 'bg-red-100 text-red-800',
          Partial: 'bg-orange-100 text-orange-800'
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
            {item.status}
          </span>
        );
      }
    },
    {
      key: 'started_at',
      header: 'Date',
      width: 120,
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'id',
      header: 'Actions',
      width: 100,
      sortable: false,
      render: (value, item) => (
        <div className="space-x-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => {
              setActiveSession(item);
              setCurrentStep('results');
            }}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            View
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDeleteSession(item.id)}
            leftIcon={<TrashIcon className="w-4 h-4" />}
          />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Import Progress Card */}
      {currentStep !== 'upload' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{t('studentImport.progress')}</h3>
            <Button variant="secondary" onClick={handleReset} leftIcon={<ArrowRightIcon className="w-4 h-4" />}>
              {t('studentImport.newImport')}
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-6">
            {(['upload', 'preview', 'importing', 'results'] as ImportStep[]).map((step, index) => {
              const stepNames = ['Upload', 'Preview', 'Import', 'Results'];
              const isActive = currentStep === step;
              const isCompleted = 
                (step === 'upload' && currentStep !== 'upload') ||
                (step === 'preview' && (currentStep === 'importing' || currentStep === 'results')) ||
                (step === 'importing' && currentStep === 'results');
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : index + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {t(`studentImport.steps.${stepNames[index].toLowerCase()}`)}
                  </span>
                  {index < 3 && <div className={`ml-4 w-8 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Upload Step */}
      {currentStep === 'upload' && (
        <>
          <Card title={t('studentImport.title')} description={t('studentImport.description')}>
            <div className="space-y-4">
              {/* File Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <UploadIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  {isDragOver ? 'Drop your file here' : 'Drag & drop your CSV file here'}
                </p>
                <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
                <p className="text-xs text-gray-400">Supported formats: CSV (Excel coming soon)</p>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Download Template */}
              <div className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  onClick={handleDownloadTemplate}
                  leftIcon={<DownloadIcon className="w-5 h-5" />}
                >
                  Download CSV Template
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Preview Step */}
      {currentStep === 'preview' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Preview Import Data</h3>
              <p className="text-sm text-gray-500">{uploadedFile?.name}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" onClick={handleReset}>
                Cancel
              </Button>
              <Button
                onClick={handleStartImport}
                disabled={validationStats.valid === 0}
                leftIcon={<UploadIcon className="w-5 h-5" />}
              >
                Import {validationStats.valid} Valid Records
              </Button>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">{validationStats.total}</div>
              <div className="text-sm text-blue-600">Total Records</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{validationStats.valid}</div>
              <div className="text-sm text-green-600">Valid</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-700">{validationStats.warnings}</div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-700">{validationStats.invalid}</div>
              <div className="text-sm text-red-600">Invalid</div>
            </div>
          </div>

          {/* Data Preview */}
          <DataGrid
            data={validationResults}
            columns={previewColumns}
            sortable={true}
            filterable={true}
            emptyState={
              <div className="text-center py-8">
                <ExclamationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No records to preview.</p>
              </div>
            }
          />
        </Card>
      )}

      {/* Importing Step */}
      {currentStep === 'importing' && (
        <Card title="Importing Students">
          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{importProgress.success}</div>
                <div className="text-sm text-green-600">Successfully Imported</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{importProgress.failed}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">
                  {importProgress.total - importProgress.current}
                </div>
                <div className="text-sm text-blue-600">Remaining</div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              Please do not close this window while importing...
            </div>
          </div>
        </Card>
      )}

      {/* Results Step */}
      {currentStep === 'results' && activeSession && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Import Results</h3>
              <p className="text-sm text-gray-500">{activeSession.filename}</p>
            </div>
            <Button onClick={handleReset} leftIcon={<UploadIcon className="w-5 h-5" />}>
              New Import
            </Button>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">{activeSession.total_records}</div>
              <div className="text-sm text-blue-600">Total Records</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{activeSession.imported_records}</div>
              <div className="text-sm text-green-600">Imported</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-700">{activeSession.failed_records}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            <div className={`${
              activeSession.status === 'Completed' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-orange-50 border-orange-200'
            } border rounded-lg p-4`}>
              <div className="text-2xl font-bold">{activeSession.status}</div>
              <div className="text-sm">Final Status</div>
            </div>
          </div>

          {/* Detailed Results */}
          <DataGrid
            data={getRecordsBySession(activeSession.id)}
            columns={resultsColumns}
            sortable={true}
            filterable={true}
            emptyState={
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No records found for this session.</p>
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
};

export default StudentDataImportPage;
