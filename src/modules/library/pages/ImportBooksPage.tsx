// ABOUTME: Page for bulk importing books from CSV/Excel files with batch processing
// ABOUTME: Uses existing Card/DataGrid/Modal components for consistency with other library pages

import React, { useState, useRef } from 'react';
import { LibBookType, LibBookStatusEnum, LibBookAvailabilityStatusEnum } from '../data/types';
import { useBookData } from '../data/useBookData';
import { useBookCategoryData } from '../data/useBookCategoryData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormField from '../../../components/ui/forms/FormField';
import FormSection from '../../../components/ui/forms/FormSection';
import FormActions from '../../../components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import { UploadIcon, DocumentTextIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

interface ImportRow {
  id: string;
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  accession_no: string;
  publication_year: string;
  edition: string;
  purchase_cost: string;
  status: string;
  location_shelf: string;
  category_name: string;
  is_digital: string;
  digital_access_url: string;
  digital_format: string;
  validation_errors: string[];
  import_status: 'pending' | 'success' | 'error';
}

export const ImportBooksPageContent: React.FC = () => {
  const { t } = useTranslation();
  const { create: addBook, isLoading: booksLoading } = useBookData();
  const { data: bookCategories } = useBookCategoryData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = [
      'title', 'author', 'publisher', 'isbn', 'accession_no', 
      'publication_year', 'edition', 'purchase_cost', 'status', 
      'location_shelf', 'category_name', 'is_digital', 
      'digital_access_url', 'digital_format'
    ];
    
    const sampleData = [
      'Sample Book Title', 'Sample Author', 'Sample Publisher', '978-0123456789', 
      'ACC001', '2023', '1st Edition', '25.99', 'Available', 
      'Shelf A1', 'Fiction', 'false', '', ''
    ];

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'book_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const validateRow = (row: any, index: number): string[] => {
    const errors: string[] = [];
    
    if (!row.title?.trim()) {
      errors.push(`Row ${index + 2}: Title is required`);
    }
    
    if (!row.accession_no?.trim()) {
      errors.push(`Row ${index + 2}: Accession number is required`);
    }
    
    if (row.status && !Object.values(LibBookStatusEnum).includes(row.status)) {
      errors.push(`Row ${index + 2}: Invalid status. Must be one of: ${Object.values(LibBookStatusEnum).join(', ')}`);
    }
    
    if (row.publication_year && isNaN(parseInt(row.publication_year))) {
      errors.push(`Row ${index + 2}: Publication year must be a valid number`);
    }
    
    if (row.purchase_cost && isNaN(parseFloat(row.purchase_cost))) {
      errors.push(`Row ${index + 2}: Purchase cost must be a valid number`);
    }
    
    if (row.category_name && !bookCategories.find(cat => cat.name === row.category_name)) {
      errors.push(`Row ${index + 2}: Category '${row.category_name}' not found`);
    }
    
    return errors;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
          alert('File must contain at least a header row and one data row');
          return;
        }

        const [headers, ...dataRows] = rows;
        const importRows: ImportRow[] = dataRows.map((row, index) => {
          const rowData = headers.reduce((acc, header, i) => {
            acc[header.trim().toLowerCase()] = row[i] || '';
            return acc;
          }, {} as any);

          const validation_errors = validateRow(rowData, index);
          
          return {
            id: `import-${index}`,
            title: rowData.title || '',
            author: rowData.author || '',
            publisher: rowData.publisher || '',
            isbn: rowData.isbn || '',
            accession_no: rowData.accession_no || '',
            publication_year: rowData.publication_year || '',
            edition: rowData.edition || '',
            purchase_cost: rowData.purchase_cost || '',
            status: rowData.status || LibBookStatusEnum.AVAILABLE,
            location_shelf: rowData.location_shelf || '',
            category_name: rowData.category_name || '',
            is_digital: rowData.is_digital || 'false',
            digital_access_url: rowData.digital_access_url || '',
            digital_format: rowData.digital_format || '',
            validation_errors,
            import_status: validation_errors.length > 0 ? 'error' : 'pending'
          };
        });

        setImportData(importRows);
        setIsModalOpen(true);
      } catch (error) {
        alert('Error parsing file. Please ensure it is a valid CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const processImport = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setSuccessCount(0);
    setErrorCount(0);

    const validRows = importData.filter(row => row.validation_errors.length === 0);
    
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const category = bookCategories.find(cat => cat.name === row.category_name);
        
        const bookData: Partial<LibBookType> = {
          title: row.title,
          author: row.author || undefined,
          publisher: row.publisher || undefined,
          isbn: row.isbn || undefined,
          accession_no: row.accession_no,
          publication_year: row.publication_year ? parseInt(row.publication_year) : undefined,
          edition: row.edition || undefined,
          purchase_cost: row.purchase_cost ? parseFloat(row.purchase_cost) : undefined,
          status: row.status as LibBookStatusEnum,
          location_shelf: row.location_shelf || undefined,
          category_id: category?.id,
          is_digital: row.is_digital.toLowerCase() === 'true',
          digital_access_url: row.digital_access_url || undefined,
          digital_format: row.digital_format || undefined,
          availability_status: LibBookAvailabilityStatusEnum.AVAILABLE,
          damaged_status: false,
          lost_status: false
        };

        await addBook(bookData);
        
        setImportData(prev => prev.map(item => 
          item.id === row.id 
            ? { ...item, import_status: 'success' as const }
            : item
        ));
        
        setSuccessCount(prev => prev + 1);
      } catch (error) {
        setImportData(prev => prev.map(item => 
          item.id === row.id 
            ? { 
                ...item, 
                import_status: 'error' as const,
                validation_errors: [...item.validation_errors, 'Import failed: ' + (error as Error).message]
              }
            : item
        ));
        setErrorCount(prev => prev + 1);
      }
      
      setProcessedCount(prev => prev + 1);
    }

    setIsProcessing(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setImportData([]);
    setProcessedCount(0);
    setSuccessCount(0);
    setErrorCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const columns: DataGridColumn<ImportRow>[] = [
    {
      key: 'import_status',
      header: 'Status',
      width: 80,
      render: (row) => (
        <div className="flex justify-center">
          {row.import_status === 'success' && <CheckIcon className="w-5 h-5 text-green-500" />}
          {row.import_status === 'error' && <XMarkIcon className="w-5 h-5 text-red-500" />}
          {row.import_status === 'pending' && <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>}
        </div>
      )
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      filterable: true
    },
    {
      key: 'author',
      header: 'Author',
      sortable: true,
      filterable: true
    },
    {
      key: 'accession_no',
      header: 'Accession No',
      sortable: true,
      filterable: true,
      width: 120
    },
    {
      key: 'status',
      header: 'Status',
      width: 100
    },
    {
      key: 'validation_errors',
      header: 'Errors',
      render: (row) => (
        <div className="text-sm">
          {row.validation_errors.length > 0 ? (
            <span className="text-red-600">{row.validation_errors.length} error(s)</span>
          ) : (
            <span className="text-green-600">Valid</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Card 
        title="Import Books from CSV/Excel" 
        actions={
          <div className="flex items-center space-x-2">
            <Button 
              variant="secondary" 
              onClick={downloadTemplate}
              leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              Download Template
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<UploadIcon className="w-4 h-4" />}
            >
              Select File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        }
      >
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No import file selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload a CSV or Excel file to bulk import books into the library catalog.
          </p>
          <div className="mt-6 space-y-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<UploadIcon className="w-4 h-4" />}
            >
              Select File to Import
            </Button>
            <p className="text-xs text-gray-500">
              Supported formats: CSV, XLSX, XLS
            </p>
          </div>
        </div>
      </Card>

      <DialogForm 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title="Import Books Preview" 
        size="6xl"
      >
        <FormSection columns={1}>
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Spinner size="sm" />
                <span className="text-sm">
                  Processing: {processedCount} / {importData.filter(row => row.validation_errors.length === 0).length}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Success: {successCount}, Errors: {errorCount}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">Total Rows</div>
              <div className="text-lg">{importData.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="font-medium text-green-800">Valid Rows</div>
              <div className="text-lg text-green-800">
                {importData.filter(row => row.validation_errors.length === 0).length}
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="font-medium text-red-800">Invalid Rows</div>
              <div className="text-lg text-red-800">
                {importData.filter(row => row.validation_errors.length > 0).length}
              </div>
            </div>
          </div>

          <DataGrid<ImportRow>
            columns={columns}
            data={importData}
            loading={false}
            sortable={true}
            filterable={true}
            className="max-h-96 overflow-auto"
          />

          {importData.some(row => row.validation_errors.length > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Validation Errors:</h4>
              <div className="text-sm text-red-700 space-y-1">
                {importData
                  .filter(row => row.validation_errors.length > 0)
                  .flatMap(row => row.validation_errors)
                  .map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))
                }
              </div>
            </div>
          )}
        </FormSection>
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button 
            onClick={processImport} 
            disabled={isProcessing || importData.every(row => row.validation_errors.length > 0)}
            leftIcon={isProcessing ? <Spinner size="sm" /> : <CheckIcon className="w-4 h-4" />}
          >
            {isProcessing ? 'Processing...' : `Import ${importData.filter(row => row.validation_errors.length === 0).length} Books`}
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};
const ImportBooksPage: React.FC = () => (
  <div className="space-y-6">
    <ImportBooksPageContent />
  </div>
);

export default ImportBooksPage;
